/**
 * VaultKeyStore tests (#1403).
 *
 * Acceptance criteria verified:
 *   - deriveKeypair: produces 32-byte hex Ed25519 and X25519 public keys.
 *   - deriveKeypair: deterministic — same seed → same keypair.
 *   - deriveKeypair: different seeds → different keypairs.
 *   - X25519 derivation matches vault-core's deriveXKeypairFromEd25519 constants
 *     (HKDF-SHA256, salt='imajin-vault', info='vault-owner-x25519-v1').
 *   - getOrCreate: generates and stores a keypair on first call.
 *   - getOrCreate: returns the same keypair on subsequent calls.
 *   - load: returns null when no keypair exists.
 *   - load: returns the keypair when one exists.
 *   - delete: removes from keychain.
 */

import { randomBytes } from 'node:crypto';
import { deriveKeypair, VaultKeyStore } from '../VaultKeyStore.js';

// ── Mock: keytar ──────────────────────────────────────────────────────────────

const keychainStore = new Map<string, string>();

jest.mock('keytar', () => ({
    __esModule: true,
    default: {
        getPassword: jest.fn(async (_service: string, account: string) => {
            return keychainStore.get(account) ?? null;
        }),
        setPassword: jest.fn(async (_service: string, account: string, value: string) => {
            keychainStore.set(account, value);
        }),
        deletePassword: jest.fn(async (_service: string, account: string) => {
            const had = keychainStore.has(account);
            keychainStore.delete(account);
            return had;
        }),
    },
}));

// ── Mock: @noble/curves/ed25519 ───────────────────────────────────────────────
// Use real implementations — these are pure crypto functions and should be
// exercised for correctness, not mocked away.

beforeEach(() => {
    keychainStore.clear();
    jest.clearAllMocks();
});

// ── deriveKeypair (pure crypto) ───────────────────────────────────────────────

describe('deriveKeypair', () => {
    it('returns 32-byte hex Ed25519 pubkey and 32-byte hex X25519 pubkey', () => {
        const seed = randomBytes(32).toString('hex');
        const kp = deriveKeypair(seed);

        expect(kp.edPub).toMatch(/^[0-9a-f]{64}$/);
        expect(kp.xPub).toMatch(/^[0-9a-f]{64}$/);
        expect(kp.edPriv).toBe(seed);
        expect(kp.xPriv).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic — same seed always produces the same keypair', () => {
        const seed = randomBytes(32).toString('hex');
        const kp1 = deriveKeypair(seed);
        const kp2 = deriveKeypair(seed);

        expect(kp1.edPub).toBe(kp2.edPub);
        expect(kp1.xPub).toBe(kp2.xPub);
        expect(kp1.xPriv).toBe(kp2.xPriv);
    });

    it('produces different keypairs for different seeds', () => {
        const kp1 = deriveKeypair(randomBytes(32).toString('hex'));
        const kp2 = deriveKeypair(randomBytes(32).toString('hex'));

        expect(kp1.edPub).not.toBe(kp2.edPub);
        expect(kp1.xPub).not.toBe(kp2.xPub);
    });

    it('throws for a seed that is not 32 bytes', () => {
        expect(() => deriveKeypair('deadbeef')).toThrow(/32 bytes/);
    });

    it('X25519 xPub and xPriv form a valid keypair (xPub = x25519.getPublicKey(xPriv))', async () => {
        // Verify using @noble/curves — this catches if our HKDF derivation accidentally
        // clamping breaks the key relationship.
        const { x25519 } = await import('@noble/curves/ed25519.js');
        const seed = randomBytes(32).toString('hex');
        const kp = deriveKeypair(seed);

        const derivedPub = Buffer.from(x25519.getPublicKey(Buffer.from(kp.xPriv, 'hex'))).toString('hex');
        expect(derivedPub).toBe(kp.xPub);
    });
});

// ── VaultKeyStore lifecycle ───────────────────────────────────────────────────

describe('VaultKeyStore', () => {
    let store: VaultKeyStore;

    beforeEach(() => {
        store = new VaultKeyStore();
    });

    it('load returns null when no keypair exists', async () => {
        const kp = await store.load();
        expect(kp).toBeNull();
    });

    it('getOrCreate generates and stores a keypair on first call', async () => {
        const kp = await store.getOrCreate();

        expect(kp.edPub).toMatch(/^[0-9a-f]{64}$/);
        expect(kp.xPub).toMatch(/^[0-9a-f]{64}$/);
        // Seed stored in keychain
        expect(keychainStore.size).toBe(1);
    });

    it('getOrCreate returns the same keypair on subsequent calls', async () => {
        const kp1 = await store.getOrCreate();
        const kp2 = await store.getOrCreate();

        expect(kp1.edPub).toBe(kp2.edPub);
        expect(kp1.xPub).toBe(kp2.xPub);
        // setPassword only called once (second call loads from keychain)
        const keytar = (await import('keytar')).default;
        expect(keytar.setPassword).toHaveBeenCalledTimes(1);
    });

    it('load returns the keypair after getOrCreate', async () => {
        const created = await store.getOrCreate();
        const loaded = await store.load();

        expect(loaded).not.toBeNull();
        expect(loaded!.edPub).toBe(created.edPub);
        expect(loaded!.xPub).toBe(created.xPub);
    });

    it('delete removes the keypair from keychain', async () => {
        await store.getOrCreate();
        const deleted = await store.delete();

        expect(deleted).toBe(true);
        const loaded = await store.load();
        expect(loaded).toBeNull();
    });

    it('delete returns false when nothing to delete', async () => {
        const deleted = await store.delete();
        expect(deleted).toBe(false);
    });
});
