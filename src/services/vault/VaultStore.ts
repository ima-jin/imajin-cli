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

export interface VaultEntry {
    field: string;
    cid: string;
    encrypted: string; // base64 ciphertext
    nonce: string;     // base64 nonce
    sender: string;    // DID string of the sender
    senderPubkey?: string; // Ed25519 public key of the sender (hex)
    timestamp: string; // ISO 8601
    previousCid?: string;
    deleted?: boolean;
}

export interface VaultFile {
    version: number;
    entries: VaultEntry[];
}

export class VaultStore {
    private readonly vaultPath: string;

    constructor(vaultPath?: string) {
        this.vaultPath = vaultPath ?? path.join(os.homedir(), '.imajin', 'vault.json');
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
    public set(entry: Omit<VaultEntry, 'previousCid'> & { previousCid?: string }): VaultEntry {
        const vault = this.readVault();
        const previousCid = this.getLatestEntry(vault.entries, entry.field)?.cid ?? entry.previousCid;

        const newEntry: VaultEntry = {
            ...entry,
            ...(previousCid !== undefined ? { previousCid } : {}),
        };

        vault.entries.push(newEntry);
        this.writeVault(vault);
        return newEntry;
    }

    /**
     * Get the latest entry for a field.
     */
    public get(field: string): VaultEntry | undefined {
        const vault = this.readVault();
        const latest = this.getLatestEntry(vault.entries, field);
        if (!latest || latest.deleted === true) {
            return undefined;
        }
        return latest;
    }

    /**
     * List all entries in the vault.
     */
    public list(): VaultEntry[] {
        const vault = this.readVault();
        const latestByField = new Map<string, VaultEntry>();
        for (let i = vault.entries.length - 1; i >= 0; i -= 1) {
            const entry = vault.entries[i]!;
            if (!latestByField.has(entry.field)) {
                latestByField.set(entry.field, entry);
            }
        }
        return Array.from(latestByField.values()).filter(entry => entry.deleted !== true);
    }

    /**
     * Follow the previousCid chain for a field to reconstruct history.
     * Returns entries from newest to oldest.
     */
    public getHistory(field: string): VaultEntry[] {
        const vault = this.readVault();
        const history: VaultEntry[] = [];
        let current = this.getLatestEntry(vault.entries, field);

        while (current) {
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
    public remove(field: string): boolean {
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
}
