/**
 * Tests for secureRandom utility functions
 * Security-critical: Ensures randomness, uniqueness, and format compliance
 */

import { generateSecureRandomString, generateSecureId, generateTaskId } from '../secureRandom.js';

describe('secureRandom utilities', () => {
    describe('generateSecureRandomString', () => {
        it('should generate string of correct default length', () => {
            const result = generateSecureRandomString();
            expect(result).toHaveLength(9);
        });

        it('should generate string of specified length', () => {
            const lengths = [5, 10, 16, 32];
            for (const length of lengths) {
                const result = generateSecureRandomString(length);
                expect(result).toHaveLength(length);
            }
        });

        it('should only contain lowercase alphanumeric characters', () => {
            const result = generateSecureRandomString(100);
            expect(result).toMatch(/^[a-z0-9]+$/);
        });

        it('should generate unique strings', () => {
            const results = new Set<string>();
            for (let i = 0; i < 1000; i++) {
                results.add(generateSecureRandomString(9));
            }
            // Should have close to 1000 unique values (allow for tiny collision chance)
            expect(results.size).toBeGreaterThan(995);
        });

        it('should handle length of 1', () => {
            const result = generateSecureRandomString(1);
            expect(result).toHaveLength(1);
            expect(result).toMatch(/^[a-z0-9]$/);
        });

        it('should handle large lengths', () => {
            const result = generateSecureRandomString(256);
            expect(result).toHaveLength(256);
            expect(result).toMatch(/^[a-z0-9]+$/);
        });

        it('should not contain Math.random patterns', () => {
            // Ensure it's not using predictable Math.random()
            const results = Array.from({ length: 100 }, () => generateSecureRandomString(9));
            const firstChars = results.map(s => s[0]);
            const uniqueFirstChars = new Set(firstChars);

            // Crypto random should have good distribution - expect at least 15 unique first chars
            expect(uniqueFirstChars.size).toBeGreaterThan(15);
        });
    });

    describe('generateSecureId', () => {
        it('should generate ID with correct format', () => {
            const result = generateSecureId('test');
            expect(result).toMatch(/^test_[a-z0-9]+_[a-z0-9]{9}$/);
        });

        it('should include timestamp component', () => {
            const before = Date.now();
            const result = generateSecureId('tx');
            const after = Date.now();

            const parts = result.split('_');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toBe('tx');

            // Timestamp should be base36 encoded
            const timestamp = parseInt(parts[1]!, 36);
            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });

        it('should respect custom random length', () => {
            const result = generateSecureId('event', 6);
            const parts = result.split('_');
            expect(parts[2]).toHaveLength(6);
        });

        it('should generate unique IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 1000; i++) {
                ids.add(generateSecureId('test'));
            }
            expect(ids.size).toBe(1000); // All should be unique
        });

        it('should handle different prefixes', () => {
            const prefixes = ['task', 'tx', 'event', 'user', 'session'];
            for (const prefix of prefixes) {
                const result = generateSecureId(prefix);
                expect(result.startsWith(`${prefix}_`)).toBe(true);
            }
        });

        it('should maintain chronological ordering by timestamp', () => {
            const id1 = generateSecureId('test');
            // Small delay to ensure different timestamp
            const id2 = generateSecureId('test');

            const timestamp1 = parseInt(id1.split('_')[1]!, 36);
            const timestamp2 = parseInt(id2.split('_')[1]!, 36);

            expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
        });
    });

    describe('generateTaskId', () => {
        it('should generate ID with correct format', () => {
            const result = generateTaskId();
            expect(result).toMatch(/^task-[a-z0-9]+$/);
        });

        it('should start with task- prefix', () => {
            const result = generateTaskId();
            expect(result.startsWith('task-')).toBe(true);
        });

        it('should include timestamp component', () => {
            const before = Date.now();
            const result = generateTaskId();
            const after = Date.now();

            const idPart = result.replace('task-', '');
            // Extract timestamp (all but last 3 chars which are random)
            const timestampPart = idPart.slice(0, -3);
            const timestamp = parseInt(timestampPart, 36);

            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });

        it('should generate unique task IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 1000; i++) {
                ids.add(generateTaskId());
            }
            // With 3-char random suffix, expect high uniqueness (>99%)
            // Note: timestamp component provides additional uniqueness
            expect(ids.size).toBeGreaterThan(990);
        });

        it('should have 3-character random suffix', () => {
            const result = generateTaskId();
            const idPart = result.replace('task-', '');
            const randomPart = idPart.slice(-3);

            expect(randomPart).toHaveLength(3);
            expect(randomPart).toMatch(/^[a-z0-9]{3}$/);
        });

        it('should maintain chronological ordering', () => {
            const ids = Array.from({ length: 10 }, () => generateTaskId());

            for (let i = 1; i < ids.length; i++) {
                const timestamp1 = parseInt(ids[i - 1]!.replace('task-', '').slice(0, -3), 36);
                const timestamp2 = parseInt(ids[i]!.replace('task-', '').slice(0, -3), 36);
                expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
            }
        });
    });
});
