/**
 * Vault Crypto - Test Suite
 *
 * Tests for Ed25519/X25519 encryption, decryption, and CID computation.
 */

import {
    generateKeypair,
    encrypt,
    decrypt,
    serializeBlob,
    deserializeBlob,
    computeCid,
    hexToBytes,
    bytesToHex,
    base64ToBytes,
    bytesToBase64,
    ed25519ToX25519Keys,
    ed25519PublicToX25519,
} from '../vault-crypto.js';

describe('vault-crypto', () => {
    describe('key generation', () => {
        it('should generate valid Ed25519 keypairs', () => {
            const kp = generateKeypair();
            expect(kp.privateKey).toHaveLength(64);
            expect(kp.publicKey).toHaveLength(64);
            expect(() => hexToBytes(kp.privateKey)).not.toThrow();
            expect(() => hexToBytes(kp.publicKey)).not.toThrow();
        });
    });

    describe('Ed25519 -> X25519 conversion', () => {
        it('should derive 32-byte X25519 keys from Ed25519 keys', () => {
            const kp = generateKeypair();
            const { x25519PrivateKey, x25519PublicKey } = ed25519ToX25519Keys(kp.privateKey);
            expect(x25519PrivateKey).toHaveLength(32);
            expect(x25519PublicKey).toHaveLength(32);
        });

        it('should convert Ed25519 public key to X25519 public key', () => {
            const kp = generateKeypair();
            const xPub = ed25519PublicToX25519(kp.publicKey);
            expect(xPub).toHaveLength(32);

            const { x25519PublicKey } = ed25519ToX25519Keys(kp.privateKey);
            expect(bytesToHex(xPub)).toBe(bytesToHex(x25519PublicKey));
        });

        it('should reject invalid hex', () => {
            expect(() => hexToBytes('abc')).toThrow();
            expect(() => hexToBytes('gggg')).toThrow();
        });
    });

    describe('encryption and decryption', () => {
        it('should encrypt and decrypt a message round-trip', () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();
            const message = 'the quick brown fox jumps over the lazy dog';

            const encrypted = encrypt(message, recipient.publicKey, sender.privateKey);
            expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
            expect(encrypted.nonce).toHaveLength(24); // XSalsa20-Poly1305 nonce length

            const decrypted = decrypt(encrypted, sender.publicKey, recipient.privateKey);
            expect(decrypted).toBe(message);
        });

        it('should fail decryption with wrong recipient private key', () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();
            const wrongRecipient = generateKeypair();
            const message = 'secret message';

            const encrypted = encrypt(message, recipient.publicKey, sender.privateKey);

            expect(() => {
                decrypt(encrypted, sender.publicKey, wrongRecipient.privateKey);
            }).toThrow('Decryption failed');
        });

        it('should fail decryption with wrong sender public key', () => {
            const sender = generateKeypair();
            const wrongSender = generateKeypair();
            const recipient = generateKeypair();
            const message = 'secret message';

            const encrypted = encrypt(message, recipient.publicKey, sender.privateKey);

            expect(() => {
                decrypt(encrypted, wrongSender.publicKey, recipient.privateKey);
            }).toThrow('Decryption failed');
        });

        it('should produce different ciphertexts for same plaintext (random nonce)', () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();
            const message = 'same message';

            const encrypted1 = encrypt(message, recipient.publicKey, sender.privateKey);
            const encrypted2 = encrypt(message, recipient.publicKey, sender.privateKey);

            expect(bytesToHex(encrypted1.ciphertext)).not.toBe(bytesToHex(encrypted2.ciphertext));
            expect(bytesToHex(encrypted1.nonce)).not.toBe(bytesToHex(encrypted2.nonce));
        });
    });

    describe('serialization', () => {
        it('should round-trip serialize and deserialize blobs', () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();
            const message = 'serialization test';

            const encrypted = encrypt(message, recipient.publicKey, sender.privateKey);
            const serialized = serializeBlob(encrypted);

            expect(typeof serialized.encrypted).toBe('string');
            expect(typeof serialized.nonce).toBe('string');

            const deserialized = deserializeBlob(serialized);
            expect(bytesToHex(deserialized.ciphertext)).toBe(bytesToHex(encrypted.ciphertext));
            expect(bytesToHex(deserialized.nonce)).toBe(bytesToHex(encrypted.nonce));
        });

        it('should produce valid base64', () => {
            const data = new Uint8Array([0, 1, 2, 255, 254, 253]);
            const b64 = bytesToBase64(data);
            const recovered = base64ToBytes(b64);
            expect(bytesToHex(recovered)).toBe(bytesToHex(data));
        });
    });

    describe('CID computation', () => {
        it('should compute a valid CID for a serialized blob', async () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();
            const message = 'CID test';

            const encrypted = encrypt(message, recipient.publicKey, sender.privateKey);
            const serialized = serializeBlob(encrypted);
            const cid = await computeCid(serialized);

            expect(typeof cid).toBe('string');
            expect(cid.startsWith('bafy')).toBe(true); // CIDv1 dag-cbor sha2-256 typically starts with bafy
        });

        it('should produce the same CID for identical blobs', async () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();
            const message = 'deterministic CID';

            const encrypted = encrypt(message, recipient.publicKey, sender.privateKey);
            const serialized = serializeBlob(encrypted);

            const cid1 = await computeCid(serialized);
            const cid2 = await computeCid(serialized);

            expect(cid1).toBe(cid2);
        });

        it('should produce different CIDs for different blobs', async () => {
            const sender = generateKeypair();
            const recipient = generateKeypair();

            const encrypted1 = encrypt('message one', recipient.publicKey, sender.privateKey);
            const encrypted2 = encrypt('message two', recipient.publicKey, sender.privateKey);

            const cid1 = await computeCid(serializeBlob(encrypted1));
            const cid2 = await computeCid(serializeBlob(encrypted2));

            expect(cid1).not.toBe(cid2);
        });
    });
});
