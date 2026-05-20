import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const computeCidMock = jest.fn(async ({ encrypted, nonce }: { encrypted: string; nonce: string }) => `cid:${encrypted}:${nonce}`);
const deriveKeyIdMock = jest.fn((senderPubkey: string) => `kid:${senderPubkey}`);
const verifyDidKeyBindingMock = jest.fn<boolean, [string, string]>(() => true);
const verifyVaultPayloadSignatureMock = jest.fn<boolean, [any, string, string]>(() => true);
jest.mock('../../../crypto/vault-crypto.js', () => ({
    computeCid: (input: { encrypted: string; nonce: string }) => computeCidMock(input),
    deriveKeyId: (senderPubkey: string) => deriveKeyIdMock(senderPubkey),
    verifyDidKeyBinding: (did: string, senderPubkey: string) => verifyDidKeyBindingMock(did, senderPubkey),
    verifyVaultPayloadSignature: (
        payload: any,
        signature: string,
        senderPubkey: string
    ) => verifyVaultPayloadSignatureMock(payload, signature, senderPubkey),
}));
import { VaultStore } from '../VaultStore.js';

describe('VaultStore', () => {
    let tempDir: string;
    let vaultPath: string;
    let store: VaultStore;

    const makeEntry = (field: string, encrypted: string, nonce: string, timestamp: string) => ({
        field,
        cid: `cid:${encrypted}:${nonce}`,
        encrypted,
        nonce,
        sender: 'did:key:zsender',
        senderPubkey: 'pubkey-1',
        keyId: 'kid:pubkey-1',
        signature: 'sig-1',
        timestamp
    });

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imajin-vault-store-'));
        vaultPath = path.join(tempDir, 'vault.json');
        store = new VaultStore(vaultPath);
        computeCidMock.mockClear();
        deriveKeyIdMock.mockClear();
        verifyDidKeyBindingMock.mockClear();
        verifyVaultPayloadSignatureMock.mockClear();
        verifyDidKeyBindingMock.mockReturnValue(true);
        verifyVaultPayloadSignatureMock.mockReturnValue(true);
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns latest entry for get/list while preserving older history', async () => {
        await store.set(makeEntry('API_KEY', 'enc-1', 'nonce-1', '2026-01-01T00:00:00.000Z'));
        await store.set(makeEntry('API_KEY', 'enc-2', 'nonce-2', '2026-01-01T01:00:00.000Z'));

        const latest = await store.get('API_KEY');
        expect(latest).toBeDefined();
        expect(typeof latest?.previousCid).toBe('string');

        const listed = await store.list();
        expect(listed).toHaveLength(1);
        expect(listed[0]?.cid).toBe(latest?.cid);

        const history = await store.getHistory('API_KEY');
        expect(history).toHaveLength(2);
        expect(history[0]?.cid).toBe(latest?.cid);
        expect(history[1]?.cid).toBe(latest?.previousCid);
    });

    it('remove appends tombstone, hides field from get/list, and keeps history chain', async () => {
        await store.set(makeEntry('TOKEN', 'enc-A', 'nonce-A', '2026-01-01T00:00:00.000Z'));
        await store.set(makeEntry('TOKEN', 'enc-B', 'nonce-B', '2026-01-01T01:00:00.000Z'));

        const removed = await store.remove('TOKEN');
        expect(removed).toBe(true);
        await expect(store.get('TOKEN')).resolves.toBeUndefined();
        expect((await store.list()).find(e => e.field === 'TOKEN')).toBeUndefined();

        const history = await store.getHistory('TOKEN');
        expect(history).toHaveLength(3);
        expect(history[0]?.deleted).toBe(true);
        expect(typeof history[0]?.previousCid).toBe('string');
        expect(history[0]?.previousCid).toBe(history[1]?.cid);
    });

    it('rejects entry reads when CID does not match encrypted payload', async () => {
        await store.set({
            ...makeEntry('CID_BREAK', 'enc-valid', 'nonce-valid', '2026-01-01T00:00:00.000Z'),
            cid: 'cid:unexpected:value',
        });

        await expect(store.get('CID_BREAK')).rejects.toThrow('CID mismatch');
    });

    it('rejects entry reads when signature verification fails', async () => {
        await store.set(makeEntry('SIG_BREAK', 'enc-valid', 'nonce-valid', '2026-01-01T00:00:00.000Z'));
        verifyVaultPayloadSignatureMock.mockReturnValueOnce(false);

        await expect(store.get('SIG_BREAK')).rejects.toThrow('signature verification failed');
    });

    it('rejects entry reads when DID-to-key binding fails', async () => {
        await store.set(makeEntry('DID_BREAK', 'enc-valid', 'nonce-valid', '2026-01-01T00:00:00.000Z'));
        verifyDidKeyBindingMock.mockReturnValueOnce(false);

        await expect(store.get('DID_BREAK')).rejects.toThrow('unverified DID-to-key binding');
    });

    it('rejects entry reads when keyId does not match derived keyId', async () => {
        await store.set({
            ...makeEntry('KEYID_BREAK', 'enc-valid', 'nonce-valid', '2026-01-01T00:00:00.000Z'),
            keyId: 'kid:wrong',
        });

        await expect(store.get('KEYID_BREAK')).rejects.toThrow('keyId mismatch');
    });

    it('times out when a non-stale lockfile blocks writes', async () => {
        const originalTimeout = (VaultStore as any).LOCK_ACQUIRE_TIMEOUT_MS;
        const originalRetry = (VaultStore as any).LOCK_RETRY_INTERVAL_MS;
        (VaultStore as any).LOCK_ACQUIRE_TIMEOUT_MS = 25;
        (VaultStore as any).LOCK_RETRY_INTERVAL_MS = 5;
        fs.writeFileSync(`${vaultPath}.lock`, 'locked', 'utf8');

        await expect(
            store.set(makeEntry('LOCKED_KEY', 'enc-lock', 'nonce-lock', '2026-01-01T00:00:00.000Z'))
        ).rejects.toThrow('Timed out acquiring vault lock');

        (VaultStore as any).LOCK_ACQUIRE_TIMEOUT_MS = originalTimeout;
        (VaultStore as any).LOCK_RETRY_INTERVAL_MS = originalRetry;
    });
});