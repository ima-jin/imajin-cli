jest.mock('../../../crypto/vault-crypto.js', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    deserializeBlob: jest.fn(),
    serializeBlob: jest.fn(),
    computeCid: jest.fn(),
    deriveKeyId: jest.fn(),
    deriveDidKeyFromPublicKey: jest.fn(),
    verifyDidKeyBinding: jest.fn(),
    signVaultPayload: jest.fn(),
    hexToBytes: jest.fn(),
    bytesToHex: jest.fn()
}));

jest.mock('chalk', () => ({
    __esModule: true,
    default: {
        yellow: (text: string) => text,
        green: (text: string) => text,
        red: (text: string) => text,
        gray: (text: string) => text,
        blue: (text: string) => text,
        cyan: (text: string) => text,
        white: (text: string) => text,
    }
}));

// VaultStore.ts pulls in @imajin/vault-core, which in this environment fails to
// load under Jest's CJS transform (an unrelated, pre-existing pnpm/ESM issue in
// the linked imajin-ai workspace package, not something owned by this file).
// None of the tests below exercise VaultStore, so it is mocked out entirely to
// keep VaultCommands importable.
jest.mock('../../../services/vault/VaultStore.js', () => ({
    VaultStore: jest.fn().mockImplementation(() => ({})),
}));

// VaultKeyStore imports keytar (a native module) at load time.
jest.mock('keytar', () => ({
    __esModule: true,
    default: {
        getPassword: jest.fn(async () => null),
        setPassword: jest.fn(async () => undefined),
        deletePassword: jest.fn(async () => false),
    },
}));

jest.mock('inquirer', () => ({
    __esModule: true,
    default: { prompt: jest.fn() },
}));

jest.mock('../../../services/vault/VaultGrantService.js', () => ({
    VaultGrantService: jest.fn(),
}));

import { randomBytes } from 'node:crypto';
import { VaultCommands } from '../VaultCommands.js';
import { deriveKeypair, type OwnerKeypair } from '../../../services/vault/VaultKeyStore.js';
import { wrapFieldKey, unwrapFieldKey, deriveDid } from '../../../crypto/vault-delegation.js';
import { VaultGrantService, type RenewableGrant, type PendingGrantRequest, type GrantResult } from '../../../services/vault/VaultGrantService.js';

const MockedVaultGrantService = VaultGrantService as jest.MockedClass<typeof VaultGrantService>;

function makeKeypair(): OwnerKeypair {
    return deriveKeypair(randomBytes(32).toString('hex'));
}

function mockProcessExit(): jest.SpiedFunction<typeof process.exit> {
    return jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
    }) as never);
}

const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

/** Simulates the kernel's seal-time handshake: fieldKey wrapped nodeXPrivΓåÆownerXPub. */
function makePendingGrantRequest(params: {
    field: string; keyId: string; owner: OwnerKeypair; node: OwnerKeypair;
    fieldKey?: Buffer; expiresAt?: string | null;
}): { request: PendingGrantRequest; fieldKey: Buffer } {
    const fieldKey = params.fieldKey ?? randomBytes(32);
    const wrapped = wrapFieldKey(fieldKey, params.owner.xPub, params.node.xPriv);
    return {
        fieldKey,
        request: {
            requestId: `req-${randomBytes(4).toString('hex')}`,
            field: params.field,
            keyId: params.keyId,
            nodeXPub: params.node.xPub,
            ownerXPub: params.owner.xPub,
            wrappedFieldKey: wrapped.encryptedKey,
            wrappedFieldKeyNonce: wrapped.nonce,
            createdAt: new Date().toISOString(),
            expiresAt: params.expiresAt ?? null,
        },
    };
}

/**
 * Simulates the owner envelope (#1521): fieldKey wrapped nodeXPrivΓåÆownerXPub,
 * recorded under `senderXPub` (the node's X25519 pubkey) rather than a
 * `nodeXPub`-named field. This is the shape /api/vault/grants/renewable returns.
 */
function makeRenewableGrant(params: {
    field: string; keyId: string; owner: OwnerKeypair; node: OwnerKeypair;
    reason: 'missing' | 'expiring'; fieldKey?: Buffer; expiresAt?: string | null;
}): { grant: RenewableGrant; fieldKey: Buffer } {
    const fieldKey = params.fieldKey ?? randomBytes(32);
    const wrapped = wrapFieldKey(fieldKey, params.owner.xPub, params.node.xPriv);
    return {
        fieldKey,
        grant: {
            field: params.field,
            keyId: params.keyId,
            reason: params.reason,
            expiresAt: params.expiresAt ?? null,
            ownerXPub: params.owner.xPub,
            senderXPub: params.node.xPub,
            wrappedKey: wrapped.encryptedKey,
            wrappedNonce: wrapped.nonce,
        },
    };
}

describe('VaultCommands stdin handling', () => {
    const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    };

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('fails fast for --stdin when running in TTY with no pipe', async () => {
        const commands = new VaultCommands(logger as any);
        const originalIsTTY = process.stdin.isTTY;
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

        await expect((commands as any).resolveSecretValue({ stdin: true })).rejects.toThrow(
            'No stdin input detected'
        );

        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    });

    it('times out when stdin does not end', async () => {
        const commands = new VaultCommands(logger as any);
        const originalIsTTY = process.stdin.isTTY;
        const originalTimeout = (VaultCommands as any).STDIN_TIMEOUT_MS;
        Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
        (VaultCommands as any).STDIN_TIMEOUT_MS = 10;
        jest.useFakeTimers();

        const promise = (commands as any).readValueFromStdin();
        jest.advanceTimersByTime(10);

        await expect(promise).rejects.toThrow('Timed out waiting for stdin input');

        (VaultCommands as any).STDIN_TIMEOUT_MS = originalTimeout;
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
    });
});

// ΓöÇΓöÇ processGrantRequest (new-grant handshake) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe('VaultCommands processGrantRequest', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('recovers the field key, re-wraps it for the node, and submits with the original requestId', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const ownerDid = deriveDid(owner.edPub);
        const nodeDid = deriveDid(node.edPub);
        const { request, fieldKey } = makePendingGrantRequest({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node });
        const submitGrant = jest.fn().mockResolvedValue({ ok: true, grantId: 'vdg_abc', field: 'GH_TOKEN' } as GrantResult);

        await (commands as any).processGrantRequest(request, owner, nodeDid, ownerDid, { submitGrant }, true);

        expect(submitGrant).toHaveBeenCalledTimes(1);
        const submitted = submitGrant.mock.calls[0][0];
        expect(submitted.requestId).toBe(request.requestId);
        expect(submitted.field).toBe('GH_TOKEN');
        expect(submitted.keyId).toBe('kid:1');

        // The submitted grant must actually let the node recover the original field key.
        const recovered = unwrapFieldKey(
            { encryptedKey: submitted.wrappedKey, nonce: submitted.wrappedNonce },
            owner.xPub,
            node.xPriv,
        );
        expect(recovered.toString('hex')).toBe(fieldKey.toString('hex'));
    });

    it('skips a request whose ownerXPub does not match our key, without submitting', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const otherOwner = makeKeypair();
        const node = makeKeypair();
        const { request } = makePendingGrantRequest({ field: 'GH_TOKEN', keyId: 'kid:1', owner: otherOwner, node });
        const submitGrant = jest.fn();

        await (commands as any).processGrantRequest(request, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, true);

        expect(submitGrant).not.toHaveBeenCalled();
    });

    it('prompts when autoApprove is false and submits when approved', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { request } = makePendingGrantRequest({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node });
        const submitGrant = jest.fn().mockResolvedValue({ ok: true, grantId: 'vdg_1', field: 'GH_TOKEN' } as GrantResult);
        const inquirer = (await import('inquirer')).default as any;
        inquirer.prompt.mockResolvedValueOnce({ approve: true });

        await (commands as any).processGrantRequest(request, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, false);

        expect(inquirer.prompt).toHaveBeenCalledTimes(1);
        expect(submitGrant).toHaveBeenCalledTimes(1);
    });

    it('prompts when autoApprove is false and skips when declined', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { request } = makePendingGrantRequest({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node });
        const submitGrant = jest.fn();
        const inquirer = (await import('inquirer')).default as any;
        inquirer.prompt.mockResolvedValueOnce({ approve: false });

        await (commands as any).processGrantRequest(request, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, false);

        expect(submitGrant).not.toHaveBeenCalled();
    });

    it('reports failure and does not throw when the kernel rejects the grant', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { request } = makePendingGrantRequest({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node });
        const submitGrant = jest.fn().mockRejectedValue(new Error('HTTP 403: bad signature'));

        await expect(
            (commands as any).processGrantRequest(request, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, true)
        ).resolves.toBeUndefined();
    });
});

// ΓöÇΓöÇ processRenewableGrant (#1536) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe('VaultCommands processRenewableGrant', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renews an expiring grant under --renew-policy auto without prompting', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const ownerDid = deriveDid(owner.edPub);
        const nodeDid = deriveDid(node.edPub);
        const { grant, fieldKey } = makeRenewableGrant({
            field: 'GH_TOKEN', keyId: 'kid:1', owner, node, reason: 'expiring',
            expiresAt: new Date(Date.now() + 1000).toISOString(),
        });
        const submitGrant = jest.fn().mockResolvedValue({ ok: true, grantId: 'vdg_renewed', field: 'GH_TOKEN', renewal: true } as GrantResult);
        const inquirer = (await import('inquirer')).default as any;

        await (commands as any).processRenewableGrant(grant, owner, nodeDid, ownerDid, { submitGrant }, 'auto', null);

        expect(inquirer.prompt).not.toHaveBeenCalled();
        expect(submitGrant).toHaveBeenCalledTimes(1);
        const submitted = submitGrant.mock.calls[0][0];

        // No requestId: its absence is what marks this a renewal to the kernel.
        expect(submitted.requestId).toBeUndefined();
        expect(submitted.field).toBe('GH_TOKEN');
        expect(submitted.keyId).toBe('kid:1');
        expect(submitted.expiresAt).toBeNull();

        // Proof the renewal is real: the kernel's own unwrap direction (ownerXPub +
        // nodeXPriv) recovers exactly the field key the node originally sealed with.
        const recovered = unwrapFieldKey(
            { encryptedKey: submitted.wrappedKey, nonce: submitted.wrappedNonce },
            owner.xPub,
            node.xPriv,
        );
        expect(recovered.toString('hex')).toBe(fieldKey.toString('hex'));
    });

    it('prompts under --renew-policy prompt and submits when approved', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { grant } = makeRenewableGrant({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node, reason: 'missing' });
        const submitGrant = jest.fn().mockResolvedValue({ ok: true, grantId: 'vdg_1', field: 'GH_TOKEN' } as GrantResult);
        const inquirer = (await import('inquirer')).default as any;
        inquirer.prompt.mockResolvedValueOnce({ approve: true });

        await (commands as any).processRenewableGrant(grant, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, 'prompt', null);

        expect(inquirer.prompt).toHaveBeenCalledTimes(1);
        expect(submitGrant).toHaveBeenCalledTimes(1);
    });

    it('prompts under --renew-policy prompt and skips when declined', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { grant } = makeRenewableGrant({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node, reason: 'missing' });
        const submitGrant = jest.fn();
        const inquirer = (await import('inquirer')).default as any;
        inquirer.prompt.mockResolvedValueOnce({ approve: false });

        await (commands as any).processRenewableGrant(grant, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, 'prompt', null);

        expect(submitGrant).not.toHaveBeenCalled();
    });

    it('skips when the envelope ownerXPub does not match our key', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const otherOwner = makeKeypair();
        const node = makeKeypair();
        const { grant } = makeRenewableGrant({ field: 'GH_TOKEN', keyId: 'kid:1', owner: otherOwner, node, reason: 'missing' });
        const submitGrant = jest.fn();

        await (commands as any).processRenewableGrant(grant, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, 'auto', null);

        expect(submitGrant).not.toHaveBeenCalled();
    });

    it('sets a future expiresAt when --grant-ttl-days is provided', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { grant } = makeRenewableGrant({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node, reason: 'missing' });
        const submitGrant = jest.fn().mockResolvedValue({ ok: true, grantId: 'vdg_1', field: 'GH_TOKEN' } as GrantResult);

        const before = Date.now();
        await (commands as any).processRenewableGrant(grant, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, 'auto', 30);

        const submitted = submitGrant.mock.calls[0][0];
        expect(submitted.expiresAt).not.toBeNull();
        const expiresAtMs = new Date(submitted.expiresAt).getTime();
        expect(expiresAtMs).toBeGreaterThan(before + 29 * 24 * 60 * 60 * 1000);
        expect(expiresAtMs).toBeLessThan(before + 31 * 24 * 60 * 60 * 1000);
    });

    it('reports failure and does not throw when the kernel rejects the renewal', async () => {
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const { grant } = makeRenewableGrant({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node, reason: 'missing' });
        const submitGrant = jest.fn().mockRejectedValue(new Error('HTTP 404: no envelope'));

        await expect(
            (commands as any).processRenewableGrant(grant, owner, 'did:imajin:node', 'did:imajin:owner', { submitGrant }, 'auto', null)
        ).resolves.toBeUndefined();
    });

    // ΓöÇΓöÇ The lockout/restore pair (acceptance criterion) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    it('the grant a renewal produces recovers the exact same field key the node lost on expiry', async () => {
        // This is the crypto-level proof behind "killing the agent past expiry locks
        // the node out; restarting it restores access": there is nothing to assert
        // about an *expired* grant here (it is simply absent/erased ΓÇö that half is
        // enforced entirely on the kernel), but the renewal MUST hand back a grant
        // that decrypts to the identical field key, or restart never actually
        // restores access.
        const commands = new VaultCommands(logger as any);
        const owner = makeKeypair();
        const node = makeKeypair();
        const ownerDid = deriveDid(owner.edPub);
        const nodeDid = deriveDid(node.edPub);

        // 'missing' reason: kernel already swept the expired grant's key material
        // (crypto-erase). The node cannot decrypt anything for this field right now.
        const { grant, fieldKey } = makeRenewableGrant({
            field: 'STRIPE_KEY', keyId: 'kid:2', owner, node, reason: 'missing',
        });

        let submittedGrant: any;
        const submitGrant = jest.fn().mockImplementation(async (body: any) => {
            submittedGrant = body;
            return { ok: true, grantId: 'vdg_restored', field: body.field };
        });

        await (commands as any).processRenewableGrant(grant, owner, nodeDid, ownerDid, { submitGrant }, 'auto', null);

        expect(submittedGrant).toBeDefined();
        const restored = unwrapFieldKey(
            { encryptedKey: submittedGrant.wrappedKey, nonce: submittedGrant.wrappedNonce },
            owner.xPub,
            node.xPriv,
        );
        expect(restored.toString('hex')).toBe(fieldKey.toString('hex'));
    });
});

// ΓöÇΓöÇ --renew-policy / --renew-within / --grant-ttl-days validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe('VaultCommands renewal option validation', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('parseRenewPolicy defaults to prompt and accepts auto/never', () => {
        const commands = new VaultCommands(logger as any);
        expect((commands as any).parseRenewPolicy(undefined)).toBe('prompt');
        expect((commands as any).parseRenewPolicy('auto')).toBe('auto');
        expect((commands as any).parseRenewPolicy('never')).toBe('never');
    });

    it('parseRenewPolicy exits(1) on an invalid policy', () => {
        const commands = new VaultCommands(logger as any);
        const exitSpy = mockProcessExit();

        expect(() => (commands as any).parseRenewPolicy('sometimes')).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('parsePositiveNumber exits(1) on a non-positive value', () => {
        const commands = new VaultCommands(logger as any);
        const exitSpy = mockProcessExit();

        expect(() => (commands as any).parsePositiveNumber('0', '--renew-within')).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('parsePositiveNumber exits(1) on a non-numeric value', () => {
        const commands = new VaultCommands(logger as any);
        const exitSpy = mockProcessExit();

        expect(() => (commands as any).parsePositiveNumber('not-a-number', '--grant-ttl-days')).toThrow('process.exit(1)');
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('parsePositiveNumber accepts a positive value', () => {
        const commands = new VaultCommands(logger as any);
        expect((commands as any).parsePositiveNumber('7', '--renew-within')).toBe(7);
    });
});

// ΓöÇΓöÇ handleServe (#1536 regression: the daemon must actually poll) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe('VaultCommands handleServe', () => {
    let owner: OwnerKeypair;
    let fetchPendingGrants: jest.Mock;
    let fetchRenewableGrants: jest.Mock;
    let submitGrant: jest.Mock;
    let intervalIds: NodeJS.Timeout[];
    let setIntervalSpy: jest.SpiedFunction<typeof global.setInterval>;

    beforeEach(() => {
        owner = makeKeypair();
        fetchPendingGrants = jest.fn().mockResolvedValue([]);
        fetchRenewableGrants = jest.fn().mockResolvedValue([]);
        submitGrant = jest.fn().mockResolvedValue({ ok: true, grantId: 'vdg_1', field: 'X' });
        MockedVaultGrantService.mockImplementation(() => ({
            fetchPendingGrants,
            fetchRenewableGrants,
            submitGrant,
        }) as any);

        // Prevent the recurring poll timer from outliving the test.
        intervalIds = [];
        setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation((() => {
            const id = ({ unref: () => id } as unknown) as NodeJS.Timeout;
            intervalIds.push(id);
            return id;
        }) as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
    });

    function makeCommands(): VaultCommands {
        const vaultKeyStore = { load: jest.fn().mockResolvedValue(owner) } as any;
        return new VaultCommands(logger as any, undefined, vaultKeyStore);
    }

    it('polls both fetchPendingGrants and fetchRenewableGrants on start', async () => {
        const commands = makeCommands();

        await (commands as any).handleServe({
            url: 'https://kernel.example', token: 'admin-token', nodeDid: 'did:imajin:node1',
            interval: '5', renewWithin: '7',
        });

        expect(fetchPendingGrants).toHaveBeenCalledTimes(1);
        expect(fetchRenewableGrants).toHaveBeenCalledTimes(1);
        expect(fetchRenewableGrants).toHaveBeenCalledWith(7);
        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('does not call fetchRenewableGrants when --renew-policy never', async () => {
        const commands = makeCommands();

        await (commands as any).handleServe({
            url: 'https://kernel.example', token: 'admin-token', nodeDid: 'did:imajin:node1',
            renewPolicy: 'never',
        });

        expect(fetchPendingGrants).toHaveBeenCalledTimes(1);
        expect(fetchRenewableGrants).not.toHaveBeenCalled();
    });

    it('renews a grant returned by fetchRenewableGrants under --renew-policy auto', async () => {
        const commands = makeCommands();
        const node = makeKeypair();
        const { grant } = makeRenewableGrant({ field: 'GH_TOKEN', keyId: 'kid:1', owner, node, reason: 'missing' });
        fetchRenewableGrants.mockResolvedValue([grant]);

        await (commands as any).handleServe({
            url: 'https://kernel.example', token: 'admin-token', nodeDid: 'did:imajin:node1',
            renewPolicy: 'auto',
        });

        expect(submitGrant).toHaveBeenCalledTimes(1);
        expect(submitGrant.mock.calls[0][0].requestId).toBeUndefined();
    });

    it('exits(1) when --token is missing', async () => {
        const commands = makeCommands();
        const exitSpy = mockProcessExit();

        await expect(
            (commands as any).handleServe({ url: 'https://kernel.example' })
        ).rejects.toThrow('process.exit(1)');

        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits(1) when --url is missing', async () => {
        const commands = makeCommands();
        const exitSpy = mockProcessExit();

        await expect(
            (commands as any).handleServe({ token: 'admin-token' })
        ).rejects.toThrow('process.exit(1)');

        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});

// ΓöÇΓöÇ handleBackup (regression: must actually produce Shamir shares) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe('VaultCommands handleBackup', () => {
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('creates shares via vaultShareStore and reports the resulting file paths', async () => {
        const owner = makeKeypair();
        const vaultKeyStore = { load: jest.fn().mockResolvedValue(owner) } as any;
        const createShares = jest.fn().mockResolvedValue(['/tmp/share-1.enc', '/tmp/share-2.enc', '/tmp/share-3.enc']);
        const vaultShareStore = { createShares } as any;
        const commands = new VaultCommands(logger as any, undefined, vaultKeyStore, vaultShareStore);
        const inquirer = (await import('inquirer')).default as any;
        inquirer.prompt
            .mockResolvedValueOnce({ passphrase: 'a-very-strong-passphrase-1' })
            .mockResolvedValueOnce({ confirm: 'a-very-strong-passphrase-1' })
            .mockResolvedValueOnce({ passphrase: 'a-very-strong-passphrase-2' })
            .mockResolvedValueOnce({ confirm: 'a-very-strong-passphrase-2' })
            .mockResolvedValueOnce({ passphrase: 'a-very-strong-passphrase-3' })
            .mockResolvedValueOnce({ confirm: 'a-very-strong-passphrase-3' });
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        await (commands as any).handleBackup({ shares: '3', threshold: '2', out: '/tmp/vault-recovery' });

        expect(createShares).toHaveBeenCalledTimes(1);
        const callArgs = createShares.mock.calls[0][0];
        expect(callArgs.shares).toBe(3);
        expect(callArgs.threshold).toBe(2);
        expect(callArgs.outDir).toBe('/tmp/vault-recovery');
        expect(callArgs.ownerXPub).toBe(owner.xPub);

        const loggedPaths = logSpy.mock.calls.map((c) => String(c[0]));
        expect(loggedPaths.some((line) => line.includes('/tmp/share-1.enc'))).toBe(true);
    });

    it('exits(1) when the vault owner key is missing', async () => {
        const vaultKeyStore = { load: jest.fn().mockResolvedValue(null) } as any;
        const commands = new VaultCommands(logger as any, undefined, vaultKeyStore);
        const exitSpy = mockProcessExit();

        await expect(
            (commands as any).handleBackup({ shares: '3', threshold: '2', out: '/tmp/vault-recovery' })
        ).rejects.toThrow('process.exit(1)');

        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
