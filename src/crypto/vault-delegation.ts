/**
 * Vault delegation crypto — client-side ECDH field-key wrapping.
 *
 * @package     @imajin/cli
 * @subpackage  crypto
 * @license     .fair LICENSING AGREEMENT
 *
 * Implements the owner agent's side of the vault delegation-grant protocol:
 *   - unwrapFieldKey: recovers the raw field key from a nodeXPriv→ownerXPub
 *     wrapped delivery (produced by the kernel's Tier 1 sealAndStoreV2 path).
 *   - wrapFieldKey: wraps the field key for the node (ownerXPriv→nodeXPub),
 *     producing the canonical delegation grant payload.
 *   - canonicalizeGrantPayload: produces the deterministic JSON string that
 *     the owner signs and the kernel verifies.
 *   - signBytes: Ed25519 sign using the owner's private key.
 *   - deriveDid: derives a did:imajin DID from an Ed25519 public key.
 *
 * All HKDF constants match packages/vault-core/src/delegation.ts exactly:
 *   HKDF salt  = 'imajin-vault'
 *   HKDF info  = 'vault-delegation-v2'
 */

import { hkdfSync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { x25519, ed25519 } from '@noble/curves/ed25519.js';

// ── HKDF constants (must match vault-core/src/delegation.ts) ─────────────────

const DELEGATION_HKDF_SALT = Buffer.from('imajin-vault', 'utf8');
const DELEGATION_HKDF_INFO = Buffer.from('vault-delegation-v2', 'utf8');

// ── AES-256-GCM constants ─────────────────────────────────────────────────────

const AES_ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WrappedFieldKey {
    /** Base64-encoded: GCM authTag (16 bytes) || AES-256-GCM ciphertext of fieldKey */
    encryptedKey: string;
    /** Base64-encoded: 12-byte AES-GCM nonce */
    nonce: string;
}

export interface GrantPayload {
    subject: string;        // ownerDid
    grantedTo: string;      // nodeDid
    field: string;
    ownerXPub: string;
    wrappedKey: string;
    wrappedNonce: string;
    keyId: string;
    expiresAt: Date | null;
}

// ── ECDH helpers ──────────────────────────────────────────────────────────────

function deriveWrappingKey(senderXPriv: Buffer, recipientXPub: Buffer): Buffer {
    const sharedPoint = x25519.getSharedSecret(senderXPriv, recipientXPub);
    return Buffer.from(
        hkdfSync('sha256', Buffer.from(sharedPoint), DELEGATION_HKDF_SALT, DELEGATION_HKDF_INFO, 32),
    );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Wrap a 32-byte field key for a recipient using X25519 ECDH + AES-256-GCM.
 *
 * `wrapFieldKey(fieldKey, recipientXPub, senderXPriv)`
 * Shared secret = ECDH(senderXPriv, recipientXPub)
 * Wrapping key  = HKDF-SHA256(sharedSecret, 'imajin-vault', 'vault-delegation-v2', 32)
 *
 * Matches vault-core's wrapFieldKey exactly.
 */
export function wrapFieldKey(
    fieldKey: Buffer,
    recipientXPub: string,
    senderXPriv: string,
): WrappedFieldKey {
    const wrappingKey = deriveWrappingKey(
        Buffer.from(senderXPriv, 'hex'),
        Buffer.from(recipientXPub, 'hex'),
    );
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(AES_ALGO, wrappingKey, iv);
    const ciphertext = Buffer.concat([cipher.update(fieldKey), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        encryptedKey: Buffer.concat([authTag, ciphertext]).toString('base64'),
        nonce: Buffer.from(iv).toString('base64'),
    };
}

/**
 * Unwrap a field key produced by wrapFieldKey.
 *
 * `unwrapFieldKey(wrapped, senderXPub, recipientXPriv)`
 * Shared secret = ECDH(recipientXPriv, senderXPub)  — symmetric with wrap
 *
 * Matches vault-core's unwrapFieldKey exactly.
 * Throws if the AES-GCM auth tag fails (wrong key pair or tampered data).
 */
export function unwrapFieldKey(
    wrapped: WrappedFieldKey,
    senderXPub: string,
    recipientXPriv: string,
): Buffer {
    const wrappingKey = deriveWrappingKey(
        Buffer.from(recipientXPriv, 'hex'),
        Buffer.from(senderXPub, 'hex'),
    );
    const iv = Buffer.from(wrapped.nonce, 'base64');
    const payload = Buffer.from(wrapped.encryptedKey, 'base64');
    const authTag = payload.subarray(0, AUTH_TAG_BYTES);
    const ciphertext = payload.subarray(AUTH_TAG_BYTES);
    const decipher = createDecipheriv(AES_ALGO, wrappingKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Canonical form of a delegation grant's signable fields.
 *
 * Keys are sorted alphabetically so the canonical string is deterministic
 * regardless of insertion order. Matches the kernel's canonicalizeGrantPayload.
 */
export function canonicalizeGrantPayload(grant: GrantPayload): string {
    return JSON.stringify({
        expiresAt: grant.expiresAt?.toISOString() ?? null,
        field: grant.field,
        grantedTo: grant.grantedTo,
        keyId: grant.keyId,
        ownerXPub: grant.ownerXPub,
        subject: grant.subject,
        wrappedKey: grant.wrappedKey,
        wrappedNonce: grant.wrappedNonce,
    });
}

/**
 * Sign a message string with an Ed25519 private key seed (32-byte hex).
 * Returns the 64-byte signature as hex.
 */
export function signCanonical(message: string, edPrivHex: string): string {
    const msgBytes = new TextEncoder().encode(message);
    const sig = ed25519.sign(msgBytes, Buffer.from(edPrivHex, 'hex'));
    return Buffer.from(sig).toString('hex');
}

/**
 * Derive a did:imajin DID from a 32-byte hex Ed25519 public key.
 * did:imajin:<first-16-hex-chars-of-pubkey>
 *
 * Matches the kernel's DID derivation in sealing.ts.
 */
export function deriveDid(edPubHex: string): string {
    return `did:imajin:${edPubHex.slice(0, 16)}`;
}
