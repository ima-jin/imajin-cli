/**
 * VaultStore - Local encrypted config/secrets store for Imajin nodes
 *
 * @package     @imajin/cli
 * @subpackage  services/vault
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 *
 * Stores encrypted blobs in ~/.imajin/vault.json as a JSON file.
 * Each entry tracks its CID, encryption metadata, sender, and history.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
    computeCid,
    deriveKeyId,
    verifyDidKeyBinding,
    verifyVaultPayloadSignature,
    type VaultSignedPayload,
} from '../../crypto/vault-crypto.js';

export interface VaultEntry {
    field: string;
    cid: string;
    encrypted: string; // base64 ciphertext
    nonce: string;     // base64 nonce
    sender: string;    // DID string of the sender
    senderPubkey?: string; // Ed25519 public key of the sender (hex)
    keyId?: string;
    signature?: string;
    timestamp: string; // ISO 8601
    previousCid?: string;
    deleted?: boolean;
}

export interface VaultFile {
    version: number;
    entries: VaultEntry[];
}

export class VaultStore {
    private static readonly LOCK_ACQUIRE_TIMEOUT_MS = 10000;
    private static readonly LOCK_STALE_MS = 30000;
    private static readonly LOCK_RETRY_INTERVAL_MS = 50;
    private readonly vaultPath: string;
    private readonly lockPath: string;

    constructor(vaultPath?: string) {
        this.vaultPath = vaultPath ?? path.join(os.homedir(), '.imajin', 'vault.json');
        this.lockPath = `${this.vaultPath}.lock`;
    }

    /**
     * Ensure the ~/.imajin/ directory exists.
     */
    private ensureDir(): void {
        const dir = path.dirname(this.vaultPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
        try {
            fs.chmodSync(dir, 0o700);
        } catch {
            // Best-effort hardening; chmod can fail on some filesystems/platforms.
        }
    }

    /**
     * Read the vault file, creating a new one if it doesn't exist.
     */
    private readVault(): VaultFile {
        this.ensureDir();
        if (!fs.existsSync(this.vaultPath)) {
            return { version: 1, entries: [] };
        }
        const raw = fs.readFileSync(this.vaultPath, 'utf8');
        try {
            const parsed = JSON.parse(raw) as VaultFile;
            if (!parsed.entries || !Array.isArray(parsed.entries)) {
                return { version: 1, entries: [] };
            }
            return parsed;
        } catch {
            return { version: 1, entries: [] };
        }
    }

    /**
     * Write the vault file atomically.
     */
    private writeVault(vault: VaultFile): void {
        this.ensureDir();
        const tmpPath = `${this.vaultPath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(vault, null, 2), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(tmpPath, this.vaultPath);
        try {
            fs.chmodSync(this.vaultPath, 0o600);
        } catch {
            // Best-effort hardening; chmod can fail on some filesystems/platforms.
        }
    }

    /**
     * Store a new encrypted blob for a field.
     * If the field already exists, the old entry is kept as history (previousCid).
     */
    public async set(entry: Omit<VaultEntry, 'previousCid'> & { previousCid?: string }): Promise<VaultEntry> {
        return this.withWriteLock(async () => {
            const vault = this.readVault();
            const previousCid = this.getLatestEntry(vault.entries, entry.field)?.cid ?? entry.previousCid;

            const newEntry: VaultEntry = {
                ...entry,
                ...(previousCid !== undefined ? { previousCid } : {}),
            };

            vault.entries.push(newEntry);
            this.writeVault(vault);
            return newEntry;
        });
    }

    /**
     * Store a new encrypted blob and sign it after previousCid resolution under lock.
     */
    public async setSigned(
        entry: Omit<VaultEntry, 'previousCid' | 'signature'> & { previousCid?: string },
        signer: (payload: VaultSignedPayload) => string
    ): Promise<VaultEntry> {
        return this.withWriteLock(async () => {
            const vault = this.readVault();
            const previousCid = this.getLatestEntry(vault.entries, entry.field)?.cid ?? entry.previousCid;
            const payload: VaultSignedPayload = {
                field: entry.field,
                cid: entry.cid,
                encrypted: entry.encrypted,
                nonce: entry.nonce,
                sender: entry.sender,
                senderPubkey: entry.senderPubkey ?? '',
                keyId: entry.keyId ?? '',
                timestamp: entry.timestamp,
                ...(previousCid !== undefined ? { previousCid } : {}),
                ...(entry.deleted !== undefined ? { deleted: entry.deleted } : {}),
            };
            const signature = signer(payload);
            const newEntry: VaultEntry = {
                ...payload,
                signature,
            };

            vault.entries.push(newEntry);
            this.writeVault(vault);
            return newEntry;
        });
    }

    /**
     * Get the latest entry for a field.
     */
    public async get(field: string): Promise<VaultEntry | undefined> {
        const vault = this.readVault();
        const latest = this.getLatestEntry(vault.entries, field);
        if (!latest || latest.deleted === true) {
            return undefined;
        }
        await this.assertEntryIntegrity(latest);
        return latest;
    }

    /**
     * List all entries in the vault.
     */
    public async list(): Promise<VaultEntry[]> {
        const vault = this.readVault();
        const latestByField = new Map<string, VaultEntry>();
        for (let i = vault.entries.length - 1; i >= 0; i -= 1) {
            const entry = vault.entries[i]!;
            if (!latestByField.has(entry.field)) {
                latestByField.set(entry.field, entry);
            }
        }
        const entries = Array.from(latestByField.values()).filter(entry => entry.deleted !== true);
        for (const entry of entries) {
            await this.assertEntryIntegrity(entry);
        }
        return entries;
    }

    /**
     * Follow the previousCid chain for a field to reconstruct history.
     * Returns entries from newest to oldest.
     */
    public async getHistory(field: string): Promise<VaultEntry[]> {
        const vault = this.readVault();
        const history: VaultEntry[] = [];
        let current = this.getLatestEntry(vault.entries, field);

        while (current) {
            if (current.deleted !== true) {
                await this.assertEntryIntegrity(current);
            }
            history.push(current);
            if (!current.previousCid) {
                break;
            }
            current = vault.entries.find((e) => e.cid === current!.previousCid);
        }

        return history;
    }

    /**
     * Remove a field from the vault.
     */
    public async remove(field: string): Promise<boolean> {
        return this.withWriteLock(async () => {
            const vault = this.readVault();
            const latest = this.getLatestEntry(vault.entries, field);
            if (!latest || latest.deleted === true) {
                return false;
            }

            const timestamp = new Date().toISOString();
            const tombstone: VaultEntry = {
                field,
                cid: `tombstone:${field}:${timestamp}`,
                encrypted: '',
                nonce: '',
                sender: 'did:imajin:system:vault',
                timestamp,
                previousCid: latest.cid,
                deleted: true,
            };

            vault.entries.push(tombstone);
            this.writeVault(vault);
            return true;
        });
    }

    private getLatestEntry(entries: VaultEntry[], field: string): VaultEntry | undefined {
        for (let i = entries.length - 1; i >= 0; i -= 1) {
            const entry = entries[i]!;
            if (entry.field === field) {
                return entry;
            }
        }
        return undefined;
    }

    private async assertEntryIntegrity(entry: VaultEntry): Promise<void> {
        const fieldLabel = entry.field || '<unknown>';

        if (!entry.senderPubkey) {
            throw new Error(`Vault entry '${fieldLabel}' missing senderPubkey`);
        }
        if (!entry.keyId) {
            throw new Error(`Vault entry '${fieldLabel}' missing keyId`);
        }
        if (!entry.signature) {
            throw new Error(`Vault entry '${fieldLabel}' missing signature`);
        }
        if (!verifyDidKeyBinding(entry.sender, entry.senderPubkey)) {
            throw new Error(`Vault entry '${fieldLabel}' has unverified DID-to-key binding`);
        }
        const derivedKeyId = deriveKeyId(entry.senderPubkey);
        if (entry.keyId !== derivedKeyId) {
            throw new Error(`Vault entry '${fieldLabel}' keyId mismatch`);
        }
        const expectedCid = await computeCid({
            encrypted: entry.encrypted,
            nonce: entry.nonce,
        });
        if (expectedCid !== entry.cid) {
            throw new Error(`Vault entry '${fieldLabel}' CID mismatch`);
        }
        const payload: VaultSignedPayload = {
            field: entry.field,
            cid: entry.cid,
            encrypted: entry.encrypted,
            nonce: entry.nonce,
            sender: entry.sender,
            senderPubkey: entry.senderPubkey,
            keyId: entry.keyId,
            timestamp: entry.timestamp,
            ...(entry.previousCid !== undefined ? { previousCid: entry.previousCid } : {}),
            ...(entry.deleted !== undefined ? { deleted: entry.deleted } : {}),
        };
        const signatureValid = verifyVaultPayloadSignature(payload, entry.signature, entry.senderPubkey);
        if (!signatureValid) {
            throw new Error(`Vault entry '${fieldLabel}' signature verification failed`);
        }
    }

    private async withWriteLock<T>(operation: () => Promise<T> | T): Promise<T> {
        const lockFd = await this.acquireLock();
        try {
            return await operation();
        } finally {
            try {
                fs.closeSync(lockFd);
            } catch {
                // Ignore close errors during unlock cleanup.
            }
            try {
                fs.unlinkSync(this.lockPath);
            } catch {
                // Ignore unlock failures (best effort).
            }
        }
    }

    private async acquireLock(): Promise<number> {
        const startedAt = Date.now();
        while (true) {
            try {
                const fd = fs.openSync(this.lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR, 0o600);
                fs.writeFileSync(fd, `${process.pid}:${Date.now()}`);
                return fd;
            } catch (error: any) {
                if (error?.code !== 'EEXIST') {
                    throw error;
                }
                this.clearStaleLockIfNeeded();
                if (Date.now() - startedAt > VaultStore.LOCK_ACQUIRE_TIMEOUT_MS) {
                    throw new Error(`Timed out acquiring vault lock after ${VaultStore.LOCK_ACQUIRE_TIMEOUT_MS}ms`);
                }
                await this.sleep(VaultStore.LOCK_RETRY_INTERVAL_MS);
            }
        }
    }

    private clearStaleLockIfNeeded(): void {
        try {
            const stats = fs.statSync(this.lockPath);
            const ageMs = Date.now() - stats.mtimeMs;
            if (ageMs > VaultStore.LOCK_STALE_MS) {
                fs.unlinkSync(this.lockPath);
            }
        } catch {
            // Ignore stale-lock check failures.
        }
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise<void>(resolve => {
            setTimeout(resolve, ms);
        });
    }
}
