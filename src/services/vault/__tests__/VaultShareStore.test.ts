/**
 * VaultShareStore tests (#1404).
 *
 * Acceptance criteria verified:
 *   - vault backup produces N encrypted share files from the vault key.
 *   - Any M-of-N shares reconstruct the original seed.
 *   - Fewer than M shares cannot reconstruct the key (fingerprint mismatch).
 *   - Each share is independently passphrase-protected (wrong passphrase throws).
 *   - Share files are self-describing (metadata present and correct).
 *   - ownerXPriv / edPriv seed is never written to disk in plaintext.
 */

// Mock keytar before any imports — VaultKeyStore imports it at module level.
jest.mock('keytar', () => ({
    __esModule: true,
    default: {
        getPassword: jest.fn(async () => null),
        setPassword: jest.fn(async () => undefined),
        deletePassword: jest.fn(async () => false),
    },
}));

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VaultShareStore } from '../VaultShareStore.js';
import { deriveKeypair } from '../VaultKeyStore.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTempDir(): string {
    const dir = path.join(os.tmpdir(), `vault-share-test-${Date.now()}-${randomBytes(4).toString('hex')}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function makePassphraseProvider(passphrases: Record<number, string>) {
    return async (shareIndex: number, _fingerprint: string): Promise<string> => {
        const p = passphrases[shareIndex];
        if (!p) throw new Error(`No passphrase configured for share ${shareIndex}`);
        return p;
    };
}

function makeCreationPassphraseProvider(passphrases: Record<number, string>) {
    return async (shareIndex: number, _total: number): Promise<string> => {
        const p = passphrases[shareIndex];
        if (!p) throw new Error(`No passphrase configured for share ${shareIndex}`);
        return p;
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VaultShareStore', () => {
    let store: VaultShareStore;
    let tmpDir: string;

    beforeEach(() => {
        store = new VaultShareStore();
        tmpDir = makeTempDir();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // ── createShares ─────────────────────────────────────────────────────────

    describe('createShares', () => {
        it('produces N share files in the output directory', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));
            const passphrases = { 1: 'alpha-pass-1', 2: 'beta-pass-2', 3: 'gamma-pass-3' };

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 3,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider(passphrases),
            });

            expect(filePaths).toHaveLength(3);
            for (const p of filePaths) {
                expect(fs.existsSync(p)).toBe(true);
            }
        });

        it('share files contain correct metadata', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));
            const passphrases = { 1: 'alpha-pass-1', 2: 'beta-pass-2' };

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 2,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider(passphrases),
            });

            const meta1 = store.readShareFile(filePaths[0]!);
            const meta2 = store.readShareFile(filePaths[1]!);

            expect(meta1.version).toBe(1);
            expect(meta1.threshold).toBe(2);
            expect(meta1.total).toBe(2);
            expect(meta1.shareIndex).toBe(1);
            expect(meta1.fingerprint).toBe(kp.xPub.slice(0, 8));
            expect(meta2.shareIndex).toBe(2);
            expect(meta2.fingerprint).toBe(kp.xPub.slice(0, 8));
            // Both shares have the same createdAt timestamp
            expect(meta1.createdAt).toBe(meta2.createdAt);
        });

        it('share files do not contain the seed in plaintext', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 2,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider({ 1: 'pass1xxxxxxxx', 2: 'pass2xxxxxxxx' }),
            });

            const seedHex = seed.toString('hex');
            for (const p of filePaths) {
                const content = fs.readFileSync(p, 'utf8');
                expect(content).not.toContain(seedHex);
                // xPriv is derived from seed but also shouldn't appear
                expect(content).not.toContain(kp.xPriv);
            }
        });

        it('throws RangeError when threshold > shares', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));

            await expect(
                store.createShares({
                    seed,
                    ownerXPub: kp.xPub,
                    shares: 2,
                    threshold: 3,
                    outDir: tmpDir,
                    getPassphrase: makeCreationPassphraseProvider({ 1: 'x' }),
                })
            ).rejects.toThrow(RangeError);
        });

        it('throws RangeError when threshold < 2', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));

            await expect(
                store.createShares({
                    seed,
                    ownerXPub: kp.xPub,
                    shares: 3,
                    threshold: 1,
                    outDir: tmpDir,
                    getPassphrase: makeCreationPassphraseProvider({ 1: 'x' }),
                })
            ).rejects.toThrow(RangeError);
        });
    });

    // ── reconstructSeed ──────────────────────────────────────────────────────

    describe('reconstructSeed', () => {
        it('full roundtrip: reconstructed seed matches original (2-of-3)', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));
            const passphrases = { 1: 'alpha-pass!1', 2: 'beta-pass!2', 3: 'gamma-pass!3' };

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 3,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider(passphrases),
            });

            // Use shares 1 and 3 (not 2) — any M of N must work
            const restored = await store.reconstructSeed({
                sharePaths: [filePaths[0]!, filePaths[2]!],
                getPassphrase: makePassphraseProvider({ 1: passphrases[1], 3: passphrases[3] }),
            });

            expect(restored.toString('hex')).toBe(seed.toString('hex'));
        });

        it('full roundtrip: reconstructed seed matches original (2-of-2)', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));
            const passphrases = { 1: 'custodian-a-pass', 2: 'custodian-b-pass' };

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 2,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider(passphrases),
            });

            const restored = await store.reconstructSeed({
                sharePaths: filePaths,
                getPassphrase: makePassphraseProvider(passphrases),
            });

            expect(restored.toString('hex')).toBe(seed.toString('hex'));
        });

        it('fewer than threshold shares produces fingerprint mismatch error', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));
            const passphrases = { 1: 'alpha-pass!1', 2: 'beta-pass!2', 3: 'gamma-pass!3' };

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 3,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider(passphrases),
            });

            // Provide only 1 share (below the threshold of 2)
            await expect(
                store.reconstructSeed({
                    sharePaths: [filePaths[0]!],
                    getPassphrase: makePassphraseProvider({ 1: passphrases[1] }),
                })
            ).rejects.toThrow(/insufficient shares|fingerprint mismatch|unexpected length/i);
        });

        it('wrong passphrase throws decryption error', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));
            const passphrases = { 1: 'correct-pass-1', 2: 'correct-pass-2' };

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 2,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider(passphrases),
            });

            await expect(
                store.reconstructSeed({
                    sharePaths: filePaths,
                    getPassphrase: makePassphraseProvider({ 1: 'wrong-passphrase!', 2: passphrases[2] }),
                })
            ).rejects.toThrow(/wrong passphrase|decrypt/i);
        });

        it('fingerprint matches the ownerXPub used during backup', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 2,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider({ 1: 'passphrase-a1', 2: 'passphrase-b2' }),
            });

            const meta = store.readShareFile(filePaths[0]!);
            expect(kp.xPub.startsWith(meta.fingerprint)).toBe(true);
            expect(meta.fingerprint).toHaveLength(8);
        });

        it('mixing shares from different backups throws fingerprint mismatch', async () => {
            const seed1 = randomBytes(32);
            const kp1 = deriveKeypair(seed1.toString('hex'));
            const seed2 = randomBytes(32);
            const kp2 = deriveKeypair(seed2.toString('hex'));

            const tmpDir2 = makeTempDir();
            try {
                const files1 = await store.createShares({
                    seed: seed1, ownerXPub: kp1.xPub, shares: 2, threshold: 2, outDir: tmpDir,
                    getPassphrase: makeCreationPassphraseProvider({ 1: 'pass-a1', 2: 'pass-a2' }),
                });
                const files2 = await store.createShares({
                    seed: seed2, ownerXPub: kp2.xPub, shares: 2, threshold: 2, outDir: tmpDir2,
                    getPassphrase: makeCreationPassphraseProvider({ 1: 'pass-b1', 2: 'pass-b2' }),
                });

                await expect(
                    store.reconstructSeed({
                        sharePaths: [files1[0]!, files2[0]!],
                        getPassphrase: makePassphraseProvider({ 1: 'pass-a1', 2: 'pass-b1' }),
                    })
                ).rejects.toThrow(/different fingerprint/);
            } finally {
                fs.rmSync(tmpDir2, { recursive: true, force: true });
            }
        });
    });

    // ── readShareFile ─────────────────────────────────────────────────────────

    describe('readShareFile', () => {
        it('returns parsed metadata without decrypting', async () => {
            const seed = randomBytes(32);
            const kp = deriveKeypair(seed.toString('hex'));

            const filePaths = await store.createShares({
                seed,
                ownerXPub: kp.xPub,
                shares: 2,
                threshold: 2,
                outDir: tmpDir,
                getPassphrase: makeCreationPassphraseProvider({ 1: 'pass1xxxxxxxx', 2: 'pass2xxxxxxxx' }),
            });

            const meta = store.readShareFile(filePaths[0]!);
            expect(meta.version).toBe(1);
            expect(meta.threshold).toBe(2);
            expect(meta.total).toBe(2);
            expect(meta.shareIndex).toBe(1);
            expect(typeof meta.fingerprint).toBe('string');
            expect(meta.fingerprint).toHaveLength(8);
            expect(typeof meta.salt).toBe('string');
            expect(typeof meta.nonce).toBe('string');
            expect(typeof meta.encryptedShare).toBe('string');
        });
    });
});
