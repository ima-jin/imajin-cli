/**
 * vault-delegation.ts tests (#1403).
 *
 * Verifies:
 *   - wrapFieldKey / unwrapFieldKey roundtrip: same field key recovered.
 *   - ECDH symmetry: wrapFieldKey(key, B.xPub, A.xPriv) can be unwrapped
 *     by unwrapFieldKey(wrapped, A.xPub, B.xPriv).
 *   - Wrong key pair throws AES-GCM auth failure.
 *   - canonicalizeGrantPayload keys are alphabetically sorted.
 *   - canonicalizeGrantPayload serialises expiresAt as ISO string or null.
 *   - deriveDid builds correct did:imajin prefix.
 */

import { randomBytes } from 'node:crypto';
import {
    wrapFieldKey,
    unwrapFieldKey,
    canonicalizeGrantPayload,
    deriveDid,
} from '../vault-delegation.js';
import { deriveKeypair } from '../../services/vault/VaultKeyStore.js';

// ── Mock: keytar (VaultKeyStore imports it at module load time) ───────────────

jest.mock('keytar', () => ({
    __esModule: true,
    default: {
        getPassword: jest.fn(async () => null),
        setPassword: jest.fn(async () => undefined),
        deletePassword: jest.fn(async () => false),
    },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeKeypair() {
    const seed = randomBytes(32).toString('hex');
    return deriveKeypair(seed);
}

// ── wrapFieldKey / unwrapFieldKey ─────────────────────────────────────────────

describe('wrapFieldKey / unwrapFieldKey', () => {
    it('roundtrip: wrapped key can be unwrapped to the original field key', () => {
        const owner = makeKeypair();
        const node = makeKeypair();
        const fieldKey = randomBytes(32);

        const wrapped = wrapFieldKey(fieldKey, node.xPub, owner.xPriv);
        const recovered = unwrapFieldKey(wrapped, owner.xPub, node.xPriv);

        expect(recovered.toString('hex')).toBe(fieldKey.toString('hex'));
    });

    it('ECDH symmetry: wrap A→B and unwrap B→A both derive the same shared secret', () => {
        const A = makeKeypair();
        const B = makeKeypair();
        const fieldKey = randomBytes(32);

        // Wrap using A as sender, B as recipient
        const wrappedAB = wrapFieldKey(fieldKey, B.xPub, A.xPriv);
        // Unwrap using B as recipient, A as sender — must produce original key
        const recovered = unwrapFieldKey(wrappedAB, A.xPub, B.xPriv);

        expect(recovered.toString('hex')).toBe(fieldKey.toString('hex'));
    });

    it('different wraps of the same key produce different ciphertexts (random IV)', () => {
        const owner = makeKeypair();
        const node = makeKeypair();
        const fieldKey = randomBytes(32);

        const w1 = wrapFieldKey(fieldKey, node.xPub, owner.xPriv);
        const w2 = wrapFieldKey(fieldKey, node.xPub, owner.xPriv);

        // IVs are random, so ciphertexts differ
        expect(w1.nonce).not.toBe(w2.nonce);
        expect(w1.encryptedKey).not.toBe(w2.encryptedKey);

        // But both decrypt to the same field key
        const r1 = unwrapFieldKey(w1, owner.xPub, node.xPriv);
        const r2 = unwrapFieldKey(w2, owner.xPub, node.xPriv);
        expect(r1.toString('hex')).toBe(fieldKey.toString('hex'));
        expect(r2.toString('hex')).toBe(r1.toString('hex'));
    });

    it('wrong recipient key pair fails (AES-GCM auth tag mismatch)', () => {
        const owner = makeKeypair();
        const node = makeKeypair();
        const wrongNode = makeKeypair();
        const fieldKey = randomBytes(32);

        const wrapped = wrapFieldKey(fieldKey, node.xPub, owner.xPriv);

        expect(() => {
            unwrapFieldKey(wrapped, owner.xPub, wrongNode.xPriv);
        }).toThrow();
    });

    it('simulates the full Tier 1 delivery flow: node wraps for owner, owner rewraps for node', () => {
        // Simulates the kernel's Tier 1 sealAndStoreV2 path + CLI processGrantRequest path.
        const node = makeKeypair();
        const owner = makeKeypair();
        const fieldKey = randomBytes(32);

        // Kernel: wrap nodeXPriv → ownerXPub (delivery to owner agent)
        const deliveryWrapped = wrapFieldKey(fieldKey, owner.xPub, node.xPriv);

        // CLI: unwrap using ownerXPriv + nodeXPub to recover fieldKey
        const recovered = unwrapFieldKey(deliveryWrapped, node.xPub, owner.xPriv);
        expect(recovered.toString('hex')).toBe(fieldKey.toString('hex'));

        // CLI: re-wrap ownerXPriv → nodeXPub (canonical delegation grant)
        const grantWrapped = wrapFieldKey(recovered, node.xPub, owner.xPriv);

        // Kernel loadAndUnseal: unwrap nodeXPriv + ownerXPub
        const finalKey = unwrapFieldKey(grantWrapped, owner.xPub, node.xPriv);
        expect(finalKey.toString('hex')).toBe(fieldKey.toString('hex'));
    });
});

// ── canonicalizeGrantPayload ──────────────────────────────────────────────────

describe('canonicalizeGrantPayload', () => {
    const base = {
        subject: 'did:imajin:ownerabc12345678',
        grantedTo: 'did:imajin:nodeabc123456789',
        field: 'GH_TOKEN',
        ownerXPub: 'a'.repeat(64),
        wrappedKey: 'AAAA',
        wrappedNonce: 'BBBB',
        keyId: 'kid:test123',
        expiresAt: null,
    };

    it('keys are alphabetically sorted', () => {
        const result = JSON.parse(canonicalizeGrantPayload(base));
        const keys = Object.keys(result);
        expect(keys).toEqual([...keys].sort());
    });

    it('expiresAt null serialises as null', () => {
        const result = canonicalizeGrantPayload({ ...base, expiresAt: null });
        expect(result).toContain('"expiresAt":null');
    });

    it('expiresAt Date serialises as ISO string', () => {
        const d = new Date('2030-06-15T12:00:00.000Z');
        const result = canonicalizeGrantPayload({ ...base, expiresAt: d });
        expect(result).toContain('"expiresAt":"2030-06-15T12:00:00.000Z"');
    });

    it('produces identical output when properties are in different insertion order', () => {
        const a = canonicalizeGrantPayload(base);
        const b = canonicalizeGrantPayload({
            wrappedNonce: base.wrappedNonce,
            subject: base.subject,
            keyId: base.keyId,
            ownerXPub: base.ownerXPub,
            expiresAt: base.expiresAt,
            field: base.field,
            grantedTo: base.grantedTo,
            wrappedKey: base.wrappedKey,
        });
        expect(a).toBe(b);
    });

    it('changes produce different canonical strings', () => {
        const original = canonicalizeGrantPayload(base);
        expect(canonicalizeGrantPayload({ ...base, field: 'DB_URL' })).not.toBe(original);
        expect(canonicalizeGrantPayload({ ...base, wrappedKey: 'CCCC' })).not.toBe(original);
    });
});

// ── deriveDid ─────────────────────────────────────────────────────────────────

describe('deriveDid', () => {
    it('produces did:imajin:<first-16-hex-chars> format', () => {
        const pubHex = 'abcdef1234567890' + 'a'.repeat(48);  // 64 hex chars
        const did = deriveDid(pubHex);
        expect(did).toBe('did:imajin:abcdef1234567890');  // first 16 hex chars = 8 bytes
    });

    it('is deterministic', () => {
        const pub = randomBytes(32).toString('hex');
        expect(deriveDid(pub)).toBe(deriveDid(pub));
    });
});
