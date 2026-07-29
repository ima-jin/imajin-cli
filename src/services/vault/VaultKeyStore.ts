/**
 * VaultKeyStore - Owner vault X25519 keypair management for Tier 1 custody.
 *
 * @package     @imajin/cli
 * @subpackage  services/vault
 * @license     .fair LICENSING AGREEMENT
 *
 * Generates, stores, and loads the owner agent's vault keypair.
 *
 * The owner holds two cryptographically related keys:
 *   ownerEdPriv / ownerEdPub  — Ed25519 keypair for signing delegation grants
 *   ownerXPriv  / ownerXPub  — X25519 keypair for ECDH key-wrapping
 *
 * Both are derived from a single random 32-byte Ed25519 seed stored in the
 * OS keychain via keytar. The X25519 keypair is derived via HKDF-SHA256 with
 * the same salt/info as vault-core's `deriveXKeypairFromEd25519`, so the
 * kernel and the CLI produce consistent keys.
 *
 * Key derivation (matches packages/vault-core/src/delegation.ts):
 *   salt = 'imajin-vault'
 *   info = 'vault-owner-x25519-v1'
 *   xPrivBytes = HKDF-SHA256(seed, salt, info, 32)
 *   xPub = x25519.getPublicKey(xPrivBytes)
 *
 * CUSTODY DISCLOSURE:
 *   ownerEdPriv and ownerXPriv never leave this machine.
 *   ownerEdPub → set as VAULT_OWNER_ED_PUB on the kernel.
 *   ownerXPub  → set as VAULT_OWNER_X_PUB on the kernel.
 */

import { hkdfSync, randomBytes } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import keytar from 'keytar';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';

// ── Keychain constants ────────────────────────────────────────────────────────

const KEYTAR_SERVICE = 'imajin-vault';
const KEYTAR_ACCOUNT_SEED = 'owner-key-seed';

// ── HKDF constants (must match vault-core/src/delegation.ts) ─────────────────

const HKDF_SALT = Buffer.from('imajin-vault', 'utf8');
const OWNER_X25519_INFO = Buffer.from('vault-owner-x25519-v1', 'utf8');

// ── Fallback file path (when keytar is unavailable) ───────────────────────────

const FALLBACK_KEY_PATH = path.join(os.homedir(), '.imajin', 'vault-owner-seed.enc');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OwnerKeypair {
    /** 32-byte hex Ed25519 seed — NEVER leaves this machine */
    edPriv: string;
    /** 32-byte hex Ed25519 public key — register as VAULT_OWNER_ED_PUB on kernel */
    edPub: string;
    /** 32-byte hex X25519 private key — NEVER leaves this machine */
    xPriv: string;
    /** 32-byte hex X25519 public key — register as VAULT_OWNER_X_PUB on kernel */
    xPub: string;
}

// ── VaultKeyStore ─────────────────────────────────────────────────────────────

export class VaultKeyStore {
    /**
     * Load the owner vault keypair from OS keychain, or generate one on first run.
     *
     * On first call: generates a cryptographically random 32-byte seed and
     * persists it in the OS keychain. The same seed is used on all subsequent
     * calls, producing the same keypair.
     *
     * Falls back to a plaintext seed file at ~/.imajin/vault-owner-seed.enc when
     * keytar is unavailable (e.g. headless CI environments). Warn the user in
     * that case — the file is not encrypted and requires filesystem-level protection.
     *
     * @throws if both keychain and file fallback fail
     */
    public async getOrCreate(): Promise<OwnerKeypair> {
        const seedHex = await this.loadOrGenerateSeed();
        return deriveKeypair(seedHex);
    }

    /**
     * Load an existing owner vault keypair from the OS keychain.
     * Returns null if no keypair has been created yet.
     */
    public async load(): Promise<OwnerKeypair | null> {
        const seedHex = await this.loadSeed();
        if (!seedHex) {
            return null;
        }
        return deriveKeypair(seedHex);
    }

    /**
     * Delete the owner vault keypair from the OS keychain and fallback file.
     *
     * WARNING: After deletion, any vault fields sealed under Tier 1 using
     * this owner keypair will become permanently unreadable unless you have
     * a Shamir backup created with `imajin vault backup`.
     */
    public async delete(): Promise<boolean> {
        let deleted = false;
        try {
            deleted = await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_SEED);
        } catch {
            // Keytar not available; ignore.
        }
        if (fs.existsSync(FALLBACK_KEY_PATH)) {
            fs.unlinkSync(FALLBACK_KEY_PATH);
            deleted = true;
        }
        return deleted;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async loadSeed(): Promise<string | null> {
        // Try keychain first.
        try {
            const fromKeychain = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_SEED);
            if (fromKeychain) {
                return fromKeychain;
            }
        } catch {
            // Keytar not available; fall through.
        }

        // Try plaintext fallback file.
        if (fs.existsSync(FALLBACK_KEY_PATH)) {
            const seed = fs.readFileSync(FALLBACK_KEY_PATH, 'utf8').trim();
            if (seed) {
                return seed;
            }
        }

        return null;
    }

    private async loadOrGenerateSeed(): Promise<string> {
        const existing = await this.loadSeed();
        if (existing) {
            return existing;
        }

        // Generate a fresh 32-byte Ed25519 seed.
        const seedHex = randomBytes(32).toString('hex');

        // Persist to keychain.
        let keychainOk = false;
        try {
            await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT_SEED, seedHex);
            keychainOk = true;
        } catch {
            // Keytar not available; fall through to file.
        }

        if (!keychainOk) {
            // Fallback: write to ~/.imajin/vault-owner-seed.enc (plaintext — user should protect it).
            ensureDir(path.dirname(FALLBACK_KEY_PATH));
            fs.writeFileSync(FALLBACK_KEY_PATH, seedHex, { encoding: 'utf8', mode: 0o600 });
            console.warn(
                '⚠️  OS keychain unavailable. Owner key seed written to:\n' +
                `   ${FALLBACK_KEY_PATH}\n` +
                '   Protect this file. Back it up with `imajin vault backup`.'
            );
        }

        return seedHex;
    }
}

// ── Key derivation (exported for testing) ────────────────────────────────────

/**
 * Derive the full owner keypair from a 32-byte hex Ed25519 seed.
 *
 * X25519 derivation matches vault-core's deriveXKeypairFromEd25519:
 *   xPriv = HKDF-SHA256(seed, salt='imajin-vault', info='vault-owner-x25519-v1', 32)
 *   xPub  = x25519.getPublicKey(xPriv)
 */
export function deriveKeypair(seedHex: string): OwnerKeypair {
    const seed = Buffer.from(seedHex, 'hex');
    if (seed.length !== 32) {
        throw new Error(`Owner key seed must be 32 bytes; got ${seed.length}`);
    }

    // Ed25519 public key.
    const edPubBytes = ed25519.getPublicKey(seed);
    const edPub = Buffer.from(edPubBytes).toString('hex');

    // X25519 keypair via HKDF (matching vault-core's deriveXKeypairFromEd25519).
    const xPrivBytes = Buffer.from(
        hkdfSync('sha256', seed, HKDF_SALT, OWNER_X25519_INFO, 32)
    );
    const xPubBytes = Buffer.from(x25519.getPublicKey(xPrivBytes));

    return {
        edPriv: seedHex,
        edPub,
        xPriv: xPrivBytes.toString('hex'),
        xPub: xPubBytes.toString('hex'),
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    try {
        fs.chmodSync(dir, 0o700);
    } catch {
        // Best-effort hardening.
    }
}
