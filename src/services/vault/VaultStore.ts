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
            fs.mkdirSync(dir, { recursive: true });
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
        fs.writeFileSync(tmpPath, JSON.stringify(vault, null, 2), 'utf8');
        fs.renameSync(tmpPath, this.vaultPath);
    }

    /**
     * Store a new encrypted blob for a field.
     * If the field already exists, the old entry is kept as history (previousCid).
     */
    public set(entry: Omit<VaultEntry, 'previousCid'> & { previousCid?: string }): VaultEntry {
        const vault = this.readVault();

        const existingIndex = vault.entries.findIndex((e) => e.field === entry.field);
        let previousCid: string | undefined;

        if (existingIndex !== -1) {
            previousCid = vault.entries[existingIndex]!.cid;
            vault.entries.splice(existingIndex, 1);
        }

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
        return vault.entries.find((e) => e.field === field);
    }

    /**
     * List all entries in the vault.
     */
    public list(): VaultEntry[] {
        const vault = this.readVault();
        return [...vault.entries];
    }

    /**
     * Follow the previousCid chain for a field to reconstruct history.
     * Returns entries from newest to oldest.
     */
    public getHistory(field: string): VaultEntry[] {
        const vault = this.readVault();
        const history: VaultEntry[] = [];
        let current = vault.entries.find((e) => e.field === field);

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
        const initialLength = vault.entries.length;
        vault.entries = vault.entries.filter((e) => e.field !== field);
        if (vault.entries.length !== initialLength) {
            this.writeVault(vault);
            return true;
        }
        return false;
    }
}
