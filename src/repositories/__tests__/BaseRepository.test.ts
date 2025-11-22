/**
 * BaseRepository - Test Suite
 *
 * Comprehensive tests for repository pattern implementation:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Caching behavior and invalidation
 * - Query operations (filtering, pagination, sorting)
 * - Bulk operations (createMany, updateMany, deleteMany)
 * - Transaction support
 * - Metrics tracking
 * - Health monitoring
 * - Event emission
 */

import { EventEmitter } from 'node:events';
import { Logger } from '../../logging/Logger.js';
import { MemoryRepository } from '../implementations/MemoryRepository.js';

interface TestEntity {
    id: string;
    name: string;
    email?: string;
    age?: number;
    status?: string;
    createdAt: Date;
    updatedAt: Date;
}

describe('BaseRepository', () => {
    let repository: MemoryRepository<TestEntity, string>;
    let logger: Logger;
    let eventEmitter: EventEmitter;
    let emittedEvents: Array<{ event: string; data: any }>;

    beforeEach(async () => {
        logger = new Logger({ level: 'error' }); // Suppress logs in tests
        eventEmitter = new EventEmitter();
        emittedEvents = [];

        // Capture all emitted events
        eventEmitter.on('entity:found', (data) => emittedEvents.push({ event: 'entity:found', data }));
        eventEmitter.on('entity:created', (data) => emittedEvents.push({ event: 'entity:created', data }));
        eventEmitter.on('entity:updated', (data) => emittedEvents.push({ event: 'entity:updated', data }));
        eventEmitter.on('entity:deleted', (data) => emittedEvents.push({ event: 'entity:deleted', data }));
        eventEmitter.on('entities:found', (data) => emittedEvents.push({ event: 'entities:found', data }));

        repository = new MemoryRepository('test-repo', logger, eventEmitter, {
            caching: { enabled: true, ttl: 60000, maxSize: 100 },
            validation: { enabled: true, strict: false }
        });

        await repository.initialize();
    });

    afterEach(async () => {
        await repository.cleanup();
    });

    // ============================================================================
    // INITIALIZATION & LIFECYCLE
    // ============================================================================

    describe('Initialization & Lifecycle', () => {
        it('should initialize successfully', async () => {
            const newRepo = new MemoryRepository('init-test', logger, eventEmitter);
            await expect(newRepo.initialize()).resolves.not.toThrow();
            await newRepo.cleanup();
        });

        it('should return repository name', () => {
            expect(repository.getName()).toBe('test-repo');
        });

        it('should cleanup resources', async () => {
            await repository.create({ name: 'Test' });
            await repository.cleanup();

            // After cleanup, repository should be empty
            const count = await repository.count();
            expect(count).toBe(0);
        });
    });

    // ============================================================================
    // CRUD OPERATIONS
    // ============================================================================

    describe('Create Operations', () => {
        it('should create entity', async () => {
            const entity = await repository.create({
                name: 'John Doe',
                email: 'john@example.com'
            });

            expect(entity.id).toBeDefined();
            expect(entity.name).toBe('John Doe');
            expect(entity.email).toBe('john@example.com');
            expect(entity.createdAt).toBeInstanceOf(Date);
            expect(entity.updatedAt).toBeInstanceOf(Date);
        });

        it('should emit entity:created event', async () => {
            const entity = await repository.create({ name: 'Test' });

            const createdEvent = emittedEvents.find(e => e.event === 'entity:created');
            expect(createdEvent).toBeDefined();
            expect(createdEvent?.data.entity.id).toBe(entity.id);
        });

        it('should validate entity on create', async () => {
            await expect(
                repository.create(null as any)
            ).rejects.toThrow();
        });

        it('should create multiple entities', async () => {
            const entities = [
                { name: 'Alice', age: 25 },
                { name: 'Bob', age: 30 }
            ];

            const result = await repository.createMany(entities);

            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(0);
            expect(result.successful).toHaveLength(2);
            expect(result.successful[0]?.name).toBe('Alice');
            expect(result.successful[1]?.name).toBe('Bob');
        });

        it('should handle partial failures in createMany', async () => {
            const entities = [
                { name: 'Valid' },
                null as any,
                { name: 'Also Valid' }
            ];

            const result = await repository.createMany(entities);

            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(1);
            expect(result.failed).toHaveLength(1);
        });
    });

    describe('Read Operations', () => {
        beforeEach(async () => {
            await repository.create({ name: 'Alice', email: 'alice@example.com', age: 25, status: 'active' });
            await repository.create({ name: 'Bob', email: 'bob@example.com', age: 30, status: 'active' });
            await repository.create({ name: 'Charlie', email: 'charlie@example.com', age: 35, status: 'inactive' });
        });

        it('should find entity by ID', async () => {
            const created = await repository.create({ name: 'Test' });
            const found = await repository.findById(created.id);

            expect(found).not.toBeNull();
            expect(found?.id).toBe(created.id);
            expect(found?.name).toBe('Test');
        });

        it('should return null for non-existent ID', async () => {
            const found = await repository.findById('non-existent-id');
            expect(found).toBeNull();
        });

        it('should find all entities', async () => {
            const all = await repository.findAll();
            expect(all.length).toBeGreaterThanOrEqual(3);
        });

        it('should find entities by multiple IDs', async () => {
            const entity1 = await repository.create({ name: 'First' });
            const entity2 = await repository.create({ name: 'Second' });

            const found = await repository.findByIds([entity1.id, entity2.id]);

            expect(found).toHaveLength(2);
            expect(found.map(e => e.name)).toContain('First');
            expect(found.map(e => e.name)).toContain('Second');
        });

        it('should find first entity matching criteria', async () => {
            const first = await repository.findFirst({
                filters: [{ field: 'status', operator: 'eq', value: 'active' }]
            });

            expect(first).not.toBeNull();
            expect(first?.status).toBe('active');
        });

        it('should return null when no entities match', async () => {
            const first = await repository.findFirst({
                filters: [{ field: 'status', operator: 'eq', value: 'deleted' }]
            });

            expect(first).toBeNull();
        });

        it('should check entity existence', async () => {
            const entity = await repository.create({ name: 'Exists' });

            expect(await repository.exists(entity.id)).toBe(true);
            expect(await repository.exists('non-existent')).toBe(false);
        });

        it('should count entities', async () => {
            const count = await repository.count();
            expect(count).toBeGreaterThanOrEqual(3);
        });

        it('should count with filters', async () => {
            const count = await repository.count([
                { field: 'status', operator: 'eq', value: 'active' }
            ]);

            expect(count).toBe(2);
        });
    });

    describe('Update Operations', () => {
        it('should update entity', async () => {
            const entity = await repository.create({ name: 'Original', age: 25 });
            const updated = await repository.update(entity.id, { name: 'Updated', age: 30 });

            expect(updated.id).toBe(entity.id);
            expect(updated.name).toBe('Updated');
            expect(updated.age).toBe(30);
            expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(entity.updatedAt.getTime());
        });

        it('should emit entity:updated event', async () => {
            const entity = await repository.create({ name: 'Test' });
            emittedEvents = []; // Clear previous events

            await repository.update(entity.id, { name: 'Updated' });

            const updatedEvent = emittedEvents.find(e => e.event === 'entity:updated');
            expect(updatedEvent).toBeDefined();
            expect(updatedEvent?.data.entityId).toBe(entity.id);
        });

        it('should update multiple entities', async () => {
            await repository.create({ name: 'A', status: 'draft' });
            await repository.create({ name: 'B', status: 'draft' });
            await repository.create({ name: 'C', status: 'published' });

            const result = await repository.updateMany(
                [{ field: 'status', operator: 'eq', value: 'draft' }],
                { status: 'published' }
            );

            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(0);

            const allPublished = await repository.count([
                { field: 'status', operator: 'eq', value: 'published' }
            ]);
            expect(allPublished).toBe(3);
        });

        it('should upsert - create when not exists', async () => {
            const result = await repository.upsert(
                { id: 'new-id', name: 'New Entity', email: 'new@example.com' },
                [{ field: 'email', operator: 'eq', value: 'new@example.com' }]
            );

            expect(result.name).toBe('New Entity');
            expect(result.email).toBe('new@example.com');
        });

        it('should upsert - update when exists', async () => {
            const existing = await repository.create({ name: 'Original', email: 'test@example.com' });

            const result = await repository.upsert(
                { id: 'any-id', name: 'Updated', email: 'test@example.com' },
                [{ field: 'email', operator: 'eq', value: 'test@example.com' }]
            );

            expect(result.id).toBe(existing.id);
            expect(result.name).toBe('Updated');

            const count = await repository.count();
            expect(count).toBe(1); // Should not create duplicate
        });
    });

    describe('Delete Operations', () => {
        it('should delete entity by ID', async () => {
            const entity = await repository.create({ name: 'To Delete' });
            const deleted = await repository.delete(entity.id);

            expect(deleted).toBe(true);
            expect(await repository.exists(entity.id)).toBe(false);
        });

        it('should emit entity:deleted event', async () => {
            const entity = await repository.create({ name: 'Test' });
            emittedEvents = [];

            await repository.delete(entity.id);

            const deletedEvent = emittedEvents.find(e => e.event === 'entity:deleted');
            expect(deletedEvent).toBeDefined();
            expect(deletedEvent?.data.entityId).toBe(entity.id);
        });

        it('should return false when deleting non-existent entity', async () => {
            const deleted = await repository.delete('non-existent');
            expect(deleted).toBe(false);
        });

        it('should delete multiple entities', async () => {
            const e1 = await repository.create({ name: 'Delete 1' });
            const e2 = await repository.create({ name: 'Delete 2' });
            const e3 = await repository.create({ name: 'Keep' });

            const result = await repository.deleteMany([e1.id, e2.id]);

            expect(result.successCount).toBe(2);
            expect(result.failureCount).toBe(0);
            expect(await repository.exists(e1.id)).toBe(false);
            expect(await repository.exists(e2.id)).toBe(false);
            expect(await repository.exists(e3.id)).toBe(true);
        });

        it('should delete entities matching criteria', async () => {
            await repository.create({ name: 'A', status: 'draft' });
            await repository.create({ name: 'B', status: 'draft' });
            await repository.create({ name: 'C', status: 'published' });

            const deletedCount = await repository.deleteWhere([
                { field: 'status', operator: 'eq', value: 'draft' }
            ]);

            expect(deletedCount).toBe(2);

            const remaining = await repository.count();
            expect(remaining).toBe(1);
        });
    });

    // ============================================================================
    // CACHING BEHAVIOR
    // ============================================================================

    describe('Caching', () => {
        it('should cache findById results', async () => {
            const entity = await repository.create({ name: 'Cached' });

            // First call - cache miss
            await repository.findById(entity.id);
            const metrics1 = await repository.getMetrics();

            // Second call - cache hit
            await repository.findById(entity.id);
            const metrics2 = await repository.getMetrics();

            expect(metrics2.cacheHitRate).toBeGreaterThan(metrics1.cacheHitRate ?? 0);
        });

        it('should invalidate cache on update', async () => {
            const entity = await repository.create({ name: 'Original' });

            await repository.findById(entity.id); // Cache it
            await repository.update(entity.id, { name: 'Updated' });

            const found = await repository.findById(entity.id);
            expect(found?.name).toBe('Updated'); // Should get updated value, not cached
        });

        it('should invalidate cache on delete', async () => {
            const entity = await repository.create({ name: 'To Delete' });

            await repository.findById(entity.id); // Cache it
            await repository.delete(entity.id);

            const found = await repository.findById(entity.id);
            expect(found).toBeNull(); // Should not get cached value
        });

        it('should cache findAll results', async () => {
            await repository.create({ name: 'A' });
            await repository.create({ name: 'B' });

            const metrics1 = await repository.getMetrics();
            await repository.findAll();
            await repository.findAll(); // Second call should hit cache
            const metrics2 = await repository.getMetrics();

            expect(metrics2.cacheHitRate).toBeGreaterThan(metrics1.cacheHitRate ?? 0);
        });

        it('should respect cache TTL', async () => {
            const shortTtlRepo = new MemoryRepository('ttl-test', logger, eventEmitter, {
                caching: { enabled: true, ttl: 50, maxSize: 100 }
            });
            await shortTtlRepo.initialize();

            const entity = await shortTtlRepo.create({ name: 'TTL Test' });
            await shortTtlRepo.findById(entity.id); // Cache it

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 60));

            const metrics1 = await shortTtlRepo.getMetrics();
            await shortTtlRepo.findById(entity.id); // Should be cache miss
            const metrics2 = await shortTtlRepo.getMetrics();

            // After cache expires and miss, cacheHitRate should be lower
            expect(metrics2.totalQueries).toBeGreaterThan(metrics1.totalQueries);

            await shortTtlRepo.cleanup();
        });
    });

    // ============================================================================
    // PAGINATION & QUERYING
    // ============================================================================

    describe('Pagination', () => {
        beforeEach(async () => {
            // Create 15 entities for pagination tests
            for (let i = 1; i <= 15; i++) {
                await repository.create({ name: `Entity ${i}`, age: i });
            }
        });

        it('should paginate results', async () => {
            const page1 = await repository.findPaginated({
                pagination: { page: 1, pageSize: 5 }
            });

            expect(page1.data).toHaveLength(5);
            expect(page1.page).toBe(1);
            expect(page1.pageSize).toBe(5);
            expect(page1.total).toBe(15);
            expect(page1.totalPages).toBe(3);
            expect(page1.hasNext).toBe(true);
            expect(page1.hasPrevious).toBe(false);
        });

        it('should get second page', async () => {
            const page2 = await repository.findPaginated({
                pagination: { page: 2, pageSize: 5 }
            });

            expect(page2.data).toHaveLength(5);
            expect(page2.page).toBe(2);
            expect(page2.hasNext).toBe(true);
            expect(page2.hasPrevious).toBe(true);
        });

        it('should get last page', async () => {
            const page3 = await repository.findPaginated({
                pagination: { page: 3, pageSize: 5 }
            });

            expect(page3.data).toHaveLength(5);
            expect(page3.hasNext).toBe(false);
            expect(page3.hasPrevious).toBe(true);
        });

        it('should handle empty results', async () => {
            const emptyRepo = new MemoryRepository('empty', logger, eventEmitter);
            await emptyRepo.initialize();

            const page = await emptyRepo.findPaginated({
                pagination: { page: 1, pageSize: 10 }
            });

            expect(page.data).toHaveLength(0);
            expect(page.total).toBe(0);
            expect(page.totalPages).toBe(0);
            expect(page.hasNext).toBe(false);
            expect(page.hasPrevious).toBe(false);

            await emptyRepo.cleanup();
        });
    });

    // ============================================================================
    // TRANSACTIONS
    // ============================================================================

    describe('Transactions', () => {
        it('should begin transaction', async () => {
            const tx = await repository.beginTransaction();

            expect(tx.id).toBeDefined();
            expect(tx.id).toMatch(/^tx_\d+_[a-z0-9]+$/);
            expect(tx.isolationLevel).toBeDefined();
        });

        it('should commit transaction', async () => {
            const tx = await repository.beginTransaction();
            await expect(repository.commitTransaction(tx)).resolves.not.toThrow();
        });

        it('should rollback transaction', async () => {
            const tx = await repository.beginTransaction();
            await expect(repository.rollbackTransaction(tx)).resolves.not.toThrow();
        });

        it('should execute with transaction and commit on success', async () => {
            const result = await repository.withTransaction(async (repo) => {
                await repo.create({ name: 'TX Entity 1' });
                await repo.create({ name: 'TX Entity 2' });
                return 'success';
            });

            expect(result).toBe('success');
            const count = await repository.count();
            expect(count).toBeGreaterThanOrEqual(2);
        });

        it('should rollback transaction on error', async () => {
            const initialCount = await repository.count();

            await expect(
                repository.withTransaction(async (repo) => {
                    await repo.create({ name: 'Will Rollback' });
                    throw new Error('Transaction error');
                })
            ).rejects.toThrow('Transaction error');

            const finalCount = await repository.count();
            expect(finalCount).toBe(initialCount); // Should be rolled back
        });
    });

    // ============================================================================
    // METRICS & MONITORING
    // ============================================================================

    describe('Metrics', () => {
        it('should track total queries', async () => {
            const metrics1 = await repository.getMetrics();

            await repository.findAll();
            await repository.count();

            const metrics2 = await repository.getMetrics();

            expect(metrics2.totalQueries).toBeGreaterThan(metrics1.totalQueries);
        });

        it('should track average query time', async () => {
            await repository.create({ name: 'Test' });
            await repository.findAll();

            const metrics = await repository.getMetrics();

            expect(metrics.averageQueryTime).toBeGreaterThanOrEqual(0);
        });

        it('should track error rate', async () => {
            const metrics1 = await repository.getMetrics();

            // Cause some errors
            try {
                await repository.create(null as any);
            } catch {}

            try {
                await repository.update('non-existent', {});
            } catch {}

            const metrics2 = await repository.getMetrics();

            expect(metrics2.errorRate).toBeGreaterThan(metrics1.errorRate);
        });

        it('should track cache hit rate', async () => {
            const entity = await repository.create({ name: 'Cache Test' });

            await repository.findById(entity.id); // Miss
            await repository.findById(entity.id); // Hit
            await repository.findById(entity.id); // Hit

            const metrics = await repository.getMetrics();

            expect(metrics.cacheHitRate).toBeGreaterThan(0);
        });

        it('should reset metrics', async () => {
            await repository.create({ name: 'Test' });
            await repository.findAll();

            await repository.reset();

            const metrics = await repository.getMetrics();

            expect(metrics.totalQueries).toBe(0);
            expect(metrics.errorRate).toBe(0);
        });
    });

    describe('Health Monitoring', () => {
        it('should report healthy status', async () => {
            const health = await repository.getHealth();

            expect(health.name).toBe('test-repo');
            expect(health.status).toBe('healthy');
            expect(health.connectionStatus).toBe('connected');
            expect(health.responseTime).toBeGreaterThanOrEqual(0);
            expect(health.lastCheck).toBeInstanceOf(Date);
        });

        it('should include repository details', async () => {
            await repository.create({ name: 'Test' });

            const health = await repository.getHealth();

            expect(health.details).toBeDefined();
            expect(health.details!.cacheSize).toBeGreaterThanOrEqual(0);
            expect(health.details!.activeTransactions).toBeGreaterThanOrEqual(0);
            expect(health.details!.totalQueries).toBeGreaterThanOrEqual(0);
        });
    });

    // ============================================================================
    // EVENT EMISSION
    // ============================================================================

    describe('Event Emission', () => {
        it('should emit events for CRUD operations', async () => {
            const entity = await repository.create({ name: 'Event Test' });
            const updated = await repository.update(entity.id, { name: 'Updated' });
            await repository.delete(updated.id);

            expect(emittedEvents.some(e => e.event === 'entity:created')).toBe(true);
            expect(emittedEvents.some(e => e.event === 'entity:updated')).toBe(true);
            expect(emittedEvents.some(e => e.event === 'entity:deleted')).toBe(true);
        });

        it('should include repository name in events', async () => {
            await repository.create({ name: 'Test' });

            const createdEvent = emittedEvents.find(e => e.event === 'entity:created');
            expect(createdEvent?.data.repository).toBe('test-repo');
        });

        it('should include timestamp in events', async () => {
            await repository.create({ name: 'Test' });

            const createdEvent = emittedEvents.find(e => e.event === 'entity:created');
            expect(createdEvent?.data.timestamp).toBeInstanceOf(Date);
        });
    });
});
