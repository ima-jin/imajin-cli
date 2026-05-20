import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VaultStore } from '../VaultStore.js';

describe('VaultStore', () => {
    let tempDir: string;
    let vaultPath: string;
    let store: VaultStore;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imajin-vault-store-'));
        vaultPath = path.join(tempDir, 'vault.json');
        store = new VaultStore(vaultPath);
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('returns latest entry for get/list while preserving older history', () => {
        store.set({
            field: 'API_KEY',
            cid: 'cid-1',
            encrypted: 'enc-1',
            nonce: 'nonce-1',
            sender: 'did:imajin:alice',
            timestamp: '2026-01-01T00:00:00.000Z'
        });
        store.set({
            field: 'API_KEY',
            cid: 'cid-2',
            encrypted: 'enc-2',
            nonce: 'nonce-2',
            sender: 'did:imajin:alice',
            timestamp: '2026-01-01T01:00:00.000Z'
        });

        const latest = store.get('API_KEY');
        expect(latest?.cid).toBe('cid-2');
        expect(latest?.previousCid).toBe('cid-1');

        const listed = store.list();
        expect(listed).toHaveLength(1);
        expect(listed[0]?.cid).toBe('cid-2');

        const history = store.getHistory('API_KEY');
        expect(history.map(h => h.cid)).toEqual(['cid-2', 'cid-1']);
    });

    it('remove appends tombstone, hides field from get/list, and keeps history chain', () => {
        store.set({
            field: 'TOKEN',
            cid: 'cid-A',
            encrypted: 'enc-A',
            nonce: 'nonce-A',
            sender: 'did:imajin:alice',
            timestamp: '2026-01-01T00:00:00.000Z'
        });
        store.set({
            field: 'TOKEN',
            cid: 'cid-B',
            encrypted: 'enc-B',
            nonce: 'nonce-B',
            sender: 'did:imajin:alice',
            timestamp: '2026-01-01T01:00:00.000Z'
        });

        const removed = store.remove('TOKEN');
        expect(removed).toBe(true);
        expect(store.get('TOKEN')).toBeUndefined();
        expect(store.list().find(e => e.field === 'TOKEN')).toBeUndefined();

        const history = store.getHistory('TOKEN');
        expect(history).toHaveLength(3);
        expect(history[0]?.deleted).toBe(true);
        expect(history[0]?.previousCid).toBe('cid-B');
        expect(history[1]?.cid).toBe('cid-B');
        expect(history[2]?.cid).toBe('cid-A');
    });
});
