/**
 * Vault Crypto - Ed25519/X25519 encryption and CID computation for Imajin Vault
 *
 * @package     @imajin/cli
 * @subpackage  crypto
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 *
 * Provides:
 * - Ed25519 -> X25519 key derivation (for Diffie-Hellman encryption)
 * - XSalsa20-Poly1305 encryption via tweetnacl (NaCl box / secretbox)
 * - Deterministic CID computation via dag-cbor + SHA-256
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import nacl from 'tweetnacl';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { sha256 } from 'multiformats/hashes/sha2';
import { base58btc } from 'multiformats/bases/base58';
import { createHash } from 'node:crypto';

export interface EncryptedBlob {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
}

function normalizeHex(value: string): string {
    return value.toLowerCase();
}

function canonicalVaultPayloadObject(payload: VaultSignedPayload): Record<string, string | boolean> {
    const canonical: Record<string, string | boolean> = {
        field: payload.field,
        cid: payload.cid,
        encrypted: payload.encrypted,
        nonce: payload.nonce,
        sender: payload.sender,
        senderPubkey: normalizeHex(payload.senderPubkey),
        keyId: payload.keyId,
        timestamp: payload.timestamp,
    };
    if (payload.previousCid !== undefined) {
        canonical.previousCid = payload.previousCid;
    }
    if (payload.deleted !== undefined) {
        canonical.deleted = payload.deleted;
    }
    return canonical;
}

/**
 * Compute a deterministic key ID for an Ed25519 public key.
 */
export function deriveKeyId(publicKeyHex: string): string {
    const publicKey = hexToBytes(publicKeyHex);
    if (publicKey.length !== 32) {
        throw new Error(`Ed25519 public key must be 32 bytes, got ${publicKey.length}`);
    }
    const digest = createHash('sha256').update(Buffer.from(publicKey)).digest('hex');
    return `ed25519:${digest.slice(0, 32)}`;
}

/**
 * Build a did:key DID for an Ed25519 public key.
 */
export function deriveDidKeyFromPublicKey(publicKeyHex: string): string {
    const publicKey = hexToBytes(publicKeyHex);
    if (publicKey.length !== 32) {
        throw new Error(`Ed25519 public key must be 32 bytes, got ${publicKey.length}`);
    }
    const multicodec = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
    multicodec.set(ED25519_MULTICODEC_PREFIX, 0);
    multicodec.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
    return `did:key:${base58btc.encode(multicodec)}`;
}

/**
 * Verify that a DID matches an Ed25519 public key. Currently supports did:key.
 */
export function verifyDidKeyBinding(did: string, publicKeyHex: string): boolean {
    if (!did.startsWith('did:key:')) {
        return false;
    }
    try {
        return deriveDidKeyFromPublicKey(publicKeyHex) === did;
    } catch {
        return false;
    }
}

/**
 * Sign a canonical vault entry payload with Ed25519.
 */
export function signVaultPayload(payload: VaultSignedPayload, signerPrivateKeyHex: string): string {
    const privateKey = hexToBytes(signerPrivateKeyHex);
    if (privateKey.length !== 32) {
        throw new Error(`Ed25519 private key must be 32 bytes, got ${privateKey.length}`);
    }
    const bytes = dagCbor.encode(canonicalVaultPayloadObject(payload));
    const signature = ed25519.sign(bytes, privateKey);
    return bytesToHex(signature);
}

/**
 * Verify a signed canonical vault entry payload.
 */
export function verifyVaultPayloadSignature(
    payload: VaultSignedPayload,
    signatureHex: string,
    signerPublicKeyHex: string
): boolean {
    try {
        const signature = hexToBytes(signatureHex);
        const publicKey = hexToBytes(signerPublicKeyHex);
        if (signature.length !== 64 || publicKey.length !== 32) {
            return false;
        }
        const bytes = dagCbor.encode(canonicalVaultPayloadObject(payload));
        return ed25519.verify(signature, bytes, publicKey);
    } catch {
        return false;
    }
}

export interface EncryptedBlobSerialized {
    encrypted: string; // base64
    nonce: string;     // base64
}
export interface VaultSignedPayload {
    field: string;
    cid: string;
    encrypted: string;
    nonce: string;
    sender: string;
    senderPubkey: string;
    keyId: string;
    timestamp: string;
    previousCid?: string;
    deleted?: boolean;
}

const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

/**
 * Convert a hex string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error('Hex string must have an even number of characters');
    }
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
        throw new Error('Hex string contains invalid characters');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Convert a Uint8Array to a hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Convert a base64 string to a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Convert a Uint8Array to a base64 string.
 */
export function bytesToBase64(bytes: Uint8Array): string {
    const binary = Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join('');
    return btoa(binary);
}

/**
 * Derive an X25519 keypair from an Ed25519 secret key.
 * Returns the X25519 private key (scalar) and public key.
 */
export function ed25519ToX25519Keys(ed25519SecretKeyHex: string): {
    x25519PrivateKey: Uint8Array;
    x25519PublicKey: Uint8Array;
} {
    const edSecret = hexToBytes(ed25519SecretKeyHex);
    if (edSecret.length !== 32) {
        throw new Error(`Ed25519 secret key must be 32 bytes, got ${edSecret.length}`);
    }

    const x25519PrivateKey = ed25519.utils.toMontgomerySecret(edSecret);
    const edPublic = ed25519.getPublicKey(edSecret);
    const x25519PublicKey = ed25519.utils.toMontgomery(edPublic);

    return { x25519PrivateKey, x25519PublicKey };
}

/**
 * Convert an Ed25519 public key (hex) to its X25519 counterpart.
 */
export function ed25519PublicToX25519(ed25519PublicKeyHex: string): Uint8Array {
    const edPublic = hexToBytes(ed25519PublicKeyHex);
    if (edPublic.length !== 32) {
        throw new Error(`Ed25519 public key must be 32 bytes, got ${edPublic.length}`);
    }
    return ed25519.utils.toMontgomery(edPublic);
}

/**
 * Encrypt plaintext to a recipient's X25519 public key using NaCl box.
 *
 * Uses the shared-key pattern (nacl.box.before) + nacl.secretbox for efficiency.
 * The sender's Ed25519 secret key is converted to X25519 to perform DH.
 */
export function encrypt(
    plaintext: string,
    recipientEd25519PublicKeyHex: string,
    senderEd25519SecretKeyHex: string
): EncryptedBlob {
    const recipientX25519Pub = ed25519PublicToX25519(recipientEd25519PublicKeyHex);
    const { x25519PrivateKey: senderX25519Priv } = ed25519ToX25519Keys(senderEd25519SecretKeyHex);

    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const sharedKey = nacl.box.before(recipientX25519Pub, senderX25519Priv);
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertext = nacl.secretbox(plaintextBytes, nonce, sharedKey);

    return { ciphertext, nonce };
}

/**
 * Decrypt an encrypted blob using the recipient's Ed25519 secret key.
 *
 * The recipient's Ed25519 secret key is converted to X25519, then combined
 * with the sender's X25519 public key (derived from sender's Ed25519 public key)
 * to reconstruct the shared key.
 */
export function decrypt(
    encryptedBlob: EncryptedBlob,
    senderEd25519PublicKeyHex: string,
    recipientEd25519SecretKeyHex: string
): string {
    const senderX25519Pub = ed25519PublicToX25519(senderEd25519PublicKeyHex);
    const { x25519PrivateKey: recipientX25519Priv } = ed25519ToX25519Keys(recipientEd25519SecretKeyHex);

    const sharedKey = nacl.box.before(senderX25519Pub, recipientX25519Priv);
    const decrypted = nacl.secretbox.open(encryptedBlob.ciphertext, encryptedBlob.nonce, sharedKey);

    if (!decrypted) {
        throw new Error('Decryption failed: invalid key or corrupted ciphertext');
    }

    return new TextDecoder().decode(decrypted);
}

/**
 * Serialize an EncryptedBlob to base64 strings.
 */
export function serializeBlob(blob: EncryptedBlob): EncryptedBlobSerialized {
    return {
        encrypted: bytesToBase64(blob.ciphertext),
        nonce: bytesToBase64(blob.nonce),
    };
}

/**
 * Deserialize an EncryptedBlob from base64 strings.
 */
export function deserializeBlob(serialized: EncryptedBlobSerialized): EncryptedBlob {
    return {
        ciphertext: base64ToBytes(serialized.encrypted),
        nonce: base64ToBytes(serialized.nonce),
    };
}

/**
 * Compute a deterministic CIDv1 (dag-cbor, sha2-256) for an encrypted blob.
 *
 * The blob is encoded as dag-cbor and hashed with SHA-256.
 */
export async function computeCid(blob: EncryptedBlobSerialized): Promise<string> {
    const obj = {
        encrypted: blob.encrypted,
        nonce: blob.nonce,
    };

    const bytes = dagCbor.encode(obj);
    const hash = await sha256.digest(bytes);
    const cid = CID.create(1, dagCbor.code, hash);
    return cid.toString();
}

/**
 * Generate a new Ed25519 keypair for testing.
 * Returns hex-encoded private and public keys.
 */
export function generateKeypair(): { privateKey: string; publicKey: string } {
    const secretKey = ed25519.utils.randomSecretKey();
    const publicKey = ed25519.getPublicKey(secretKey);
    return {
        privateKey: bytesToHex(secretKey),
        publicKey: bytesToHex(publicKey),
    };
}
