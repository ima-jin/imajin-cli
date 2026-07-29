/**
 * VaultShareStore - Shamir secret-sharing backup/restore for the Tier 1 owner vault seed.
 *
 * @package     @imajin/cli
 * @subpackage  services/vault
 * @license     .fair LICENSING AGREEMENT
 *
 * Splits the 32-byte Ed25519 seed (stored by VaultKeyStore) into M-of-N Shamir
 * shares, encrypts each share independently with a passphrase, and writes them
 * to self-describing JSON files. Recovery reconstructs the seed from any M shares.
 *
 * ## Share file format (JSON, .enc extension)
 * ```json
 * {
 *   "version": 1,
 *   "createdAt": "2026-07-29T04:00:00.000Z",
 *   "threshold": 2,
 *   "total": 3,
 *   "shareIndex": 1,
 *   "fingerprint": "ab12cd34",        // first 8 chars of ownerXPub
 *   "salt": "<base64>",               // 16-byte PBKDF2 salt
 *   "nonce": "<base64>",              // 12-byte AES-GCM IV
 *   "encryptedShare": "<base64>"      // authTag(16) + ciphertext
 * }
 * ```
 *
 * ## Passphrase-to-key derivation
 *   PBKDF2-HMAC-SHA256, 100 000 iterations, 32-byte output, random 16-byte salt.
 *   AES-256-GCM encrypt the Shamir share bytes.
 *   The ownerXPriv / edPriv seed NEVER appears on disk in plaintext.
 *
 * ## Fingerprint verification
 *   After Shamir combine, the reconstructed seed is verified by re-deriving
 *   ownerXPub and comparing the first 8 chars to the share metadata fingerprint.
 *   This catches wrong-passphrase and fewer-than-threshold errors that produce
 *   garbage without throwing (Lagrange interpolation is always defined).
 */

import { pbkdf2Sync, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { split as shamirSplit, combine as shamirCombine } from 'shamirs-secret-sharing';
import { deriveKeypair } from './VaultKeyStore.js';

// ── Crypto constants ─────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';
const AES_ALGO = 'aes-256-gcm';
const SALT_BYTES = 16;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const FINGERPRINT_CHARS = 8;

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShareFileData {
    version: 1;
    createdAt: string;
    /** Minimum shares needed to recover the key. */
    threshold: number;
    /** Total number of shares created. */
    total: number;
    /** 1-based index of this share. */
    shareIndex: number;
    /** First 8 chars of ownerXPub — confirms identity without revealing the key. */
    fingerprint: string;
    /** Base64-encoded PBKDF2 salt (16 bytes). */
    salt: string;
    /** Base64-encoded AES-GCM nonce (12 bytes). */
    nonce: string;
    /** Base64-encoded: GCM authTag (16 bytes) || AES-256-GCM ciphertext of the share. */
    encryptedShare: string;
}

// ── VaultShareStore ──────────────────────────────────────────────────────────

export class VaultShareStore {
    /**
     * Split a 32-byte Ed25519 seed into N Shamir shares, encrypt each with an
     * independently chosen passphrase, and write them to disk.
     *
     * @param seed        - The raw 32-byte Ed25519 seed from VaultKeyStore.
     * @param ownerXPub   - The X25519 public key (hex) used for the fingerprint.
     * @param shares      - Total number of shares to produce (N).
     * @param threshold   - Minimum shares required for recovery (M ≤ N).
     * @param outDir      - Output directory path (created if it does not exist).
     * @param getPassphrase - Callback invoked once per share for the passphrase.
     * @returns           Array of absolute file paths to the written share files.
     */
    async createShares(params: {
        seed: Buffer;
        ownerXPub: string;
        shares: number;
        threshold: number;
        outDir: string;
        getPassphrase: (shareIndex: number, total: number) => Promise<string>;
    }): Promise<string[]> {
        const { seed, ownerXPub, shares, threshold, outDir, getPassphrase } = params;

        if (seed.length !== 32) {
            throw new Error(`Seed must be 32 bytes; got ${seed.length}`);
        }
        if (threshold < 2 || threshold > shares) {
            throw new RangeError(`Threshold must be 2 ≤ threshold ≤ shares (got threshold=${threshold}, shares=${shares})`);
        }

        // Split the seed into raw Shamir shares.
        const shareBuffers: Buffer[] = shamirSplit(seed, { shares, threshold }) as Buffer[];

        ensureDir(outDir);

        const fingerprint = ownerXPub.slice(0, FINGERPRINT_CHARS);
        const createdAt = new Date().toISOString();
        const absolutePaths: string[] = [];

        for (let i = 0; i < shareBuffers.length; i++) {
            const passphrase = await getPassphrase(i + 1, shares);
            const shareBuffer = shareBuffers[i]!;

            const salt = randomBytes(SALT_BYTES);
            const iv = randomBytes(IV_BYTES);
            const key = pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);

            const cipher = createCipheriv(AES_ALGO, key, iv);
            const ciphertext = Buffer.concat([cipher.update(shareBuffer), cipher.final()]);
            const authTag = cipher.getAuthTag();

            const fileData: ShareFileData = {
                version: 1,
                createdAt,
                threshold,
                total: shares,
                shareIndex: i + 1,
                fingerprint,
                salt: salt.toString('base64'),
                nonce: iv.toString('base64'),
                encryptedShare: Buffer.concat([authTag, ciphertext]).toString('base64'),
            };

            const filePath = path.join(outDir, `share-${i + 1}.enc`);
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), { encoding: 'utf8', mode: 0o600 });
            absolutePaths.push(path.resolve(filePath));
        }

        return absolutePaths;
    }

    /**
     * Decrypt share files and reconstruct the original 32-byte seed.
     *
     * Verifies the fingerprint of the reconstructed seed against the share
     * metadata — this catches wrong-passphrase errors and fewer-than-threshold
     * combinations that would otherwise produce garbage silently.
     *
     * @param sharePaths    - Paths to the encrypted share files.
     * @param getPassphrase - Callback invoked per share for its passphrase.
     * @returns             The reconstructed 32-byte Ed25519 seed.
     * @throws              If decryption fails or fingerprint does not match.
     */
    async reconstructSeed(params: {
        sharePaths: string[];
        getPassphrase: (shareIndex: number, fingerprint: string) => Promise<string>;
    }): Promise<Buffer> {
        const { sharePaths, getPassphrase } = params;

        if (sharePaths.length === 0) {
            throw new Error('At least one share file is required');
        }

        const decryptedShares: Buffer[] = [];
        let expectedFingerprint = '';
        let expectedThreshold = 0;

        for (const sharePath of sharePaths) {
            const fileData = this.readShareFile(sharePath);

            if (!expectedFingerprint) {
                expectedFingerprint = fileData.fingerprint;
                expectedThreshold = fileData.threshold;
            }

            if (fileData.fingerprint !== expectedFingerprint) {
                throw new Error(
                    `Share ${sharePath} has a different fingerprint — all shares must be from the same backup`,
                );
            }

            const passphrase = await getPassphrase(fileData.shareIndex, fileData.fingerprint);

            const salt = Buffer.from(fileData.salt, 'base64');
            const iv = Buffer.from(fileData.nonce, 'base64');
            const key = pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);

            const payload = Buffer.from(fileData.encryptedShare, 'base64');
            const authTag = payload.subarray(0, AUTH_TAG_BYTES);
            const ciphertext = payload.subarray(AUTH_TAG_BYTES);

            const decipher = createDecipheriv(AES_ALGO, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted: Buffer;
            try {
                decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            } catch {
                throw new Error(
                    `Failed to decrypt share ${fileData.shareIndex} (${path.basename(sharePath)}) — wrong passphrase?`,
                );
            }

            decryptedShares.push(decrypted);
        }

        // Guard: fail fast before Lagrange if fewer shares than threshold.
        // The fingerprint check below also catches this, but a pre-flight error
        // gives a cleaner message and avoids the combine overhead.
        if (decryptedShares.length < expectedThreshold) {
            throw new Error(
                `Insufficient shares: need at least ${expectedThreshold}, provided ${decryptedShares.length}. ` +
                `Fewer than ${expectedThreshold} shares cannot reconstruct the key.`,
            );
        }

        // Reconstruct the seed via Lagrange interpolation.
        const reconstructed: Buffer = shamirCombine(decryptedShares) as Buffer;

        // Verify fingerprint — Lagrange interpolation never throws; it returns garbage
        // when given fewer than threshold shares. The fingerprint check catches this.
        if (reconstructed.length !== 32) {
            throw new Error('Reconstructed seed has unexpected length — possible share mismatch');
        }

        const derivedKp = deriveKeypair(reconstructed.toString('hex'));
        if (!derivedKp.xPub.startsWith(expectedFingerprint)) {
            throw new Error(
                `Reconstructed key fingerprint mismatch (got ${derivedKp.xPub.slice(0, FINGERPRINT_CHARS)}, ` +
                `expected ${expectedFingerprint}) — check that you are providing at least ${expectedThreshold} shares ` +
                `from the same backup`,
            );
        }

        return reconstructed;
    }

    /**
     * Read and parse a share file's metadata without decrypting.
     * Useful for displaying context before prompting for passphrases.
     */
    readShareFile(sharePath: string): ShareFileData {
        const raw = fs.readFileSync(sharePath, 'utf8');
        return JSON.parse(raw) as ShareFileData;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
}
