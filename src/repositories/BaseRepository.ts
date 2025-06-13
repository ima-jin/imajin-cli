/**
 * BaseRepository - Abstract base class for repository implementations
 * 
 * @package     @imajin/cli
 * @subpackage  repositories
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Repository interface implementation
 * - Exception system for error handling
 * - Logging system for audit trails
 * - Event system for data change notifications
 */

import type { EventEmitter } from 'events';
import { SystemError } from '../exceptions/index.js';
import type { Logger } from '../logging/Logger.js';
// Universal types removed - now using dynamic business context types
import type {
    BulkOperationResult,
    PaginatedResult,
    QueryFilter,
    QueryOptions,
    Repository,
    RepositoryHealth,
    RepositoryMonitor,
    RepositoryOptions,
    TransactionContext
} from './Repository.js';

/**
 * Cache entry for repository operations
 */
interface CacheEntry<T> {
    data: T;
    timestamp: Date;
    ttl: number;
}

/**
 * Repository metrics tracking
 */
interface RepositoryMetrics {
    totalQueries: number;
    averageQueryTime: number;
    errorCount: number;
    cacheHits: number;
    cacheMisses: number;
    lastOperation: Date;
}

/**
 * Type aliases for commonly used entity types
 */
type CreateEntity<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateEntity<T> = Partial<Omit<T, 'id' | 'createdAt'>>;

/**
 * Abstract base repository providing common functionality
 */
export abstract class BaseRepository<T extends Record<string, any>, TKey = string>
    implements Repository<T, TKey>, RepositoryMonitor {

    protected logger: Logger;
    protected eventEmitter: EventEmitter;
    protected options: RepositoryOptions;
    protected cache: Map<string, CacheEntry<any>>;
    protected metrics: RepositoryMetrics;
    protected activeTransactions: Map<string, TransactionContext>;

    constructor(
        logger: Logger,
        eventEmitter: EventEmitter,
        options: RepositoryOptions = {}
    ) {
        this.logger = logger;
        this.eventEmitter = eventEmitter;
        this.options = {
            dataSource: 'memory',
            caching: { enabled: false, ttl: 300000, maxSize: 1000 },
            validation: { enabled: true, strict: false },
            retries: { enabled: true, maxAttempts: 3, backoffMs: 1000 },
            ...options
        };

        this.cache = new Map();
        this.activeTransactions = new Map();
        this.metrics = {
            totalQueries: 0,
            averageQueryTime: 0,
            errorCount: 0,
            cacheHits: 0,
            cacheMisses: 0,
            lastOperation: new Date()
        };
    }

    // =============================================================================
    // ABSTRACT METHODS (Must be implemented by concrete repositories)
    // =============================================================================

    /**
     * Get repository name for logging and identification
     */
    abstract getName(): string;

    /**
     * Initialize repository connection/resources
     */
    abstract initialize(): Promise<void>;

    /**
     * Cleanup repository resources
     */
    abstract cleanup(): Promise<void>;

    /**
     * Internal implementation of findById without caching/validation
     */
    protected abstract _findById(id: TKey, options?: { include?: string[] }): Promise<T | null>;

    /**
     * Internal implementation of findAll without caching/validation
     */
    protected abstract _findAll(options?: QueryOptions): Promise<T[]>;

    /**
     * Internal implementation of create without validation
     */
    protected abstract _create(entity: CreateEntity<T>): Promise<T>;

    /**
     * Internal implementation of update without validation
     */
    protected abstract _update(id: TKey, updates: UpdateEntity<T>): Promise<T>;

    /**
     * Internal implementation of delete
     */
    protected abstract _delete(id: TKey): Promise<boolean>;

    /**
     * Internal implementation of count
     */
    protected abstract _count(filters?: QueryFilter[]): Promise<number>;

    // =============================================================================
    // PUBLIC REPOSITORY INTERFACE IMPLEMENTATION
    // =============================================================================

    async findById(id: TKey, options?: { include?: string[] }): Promise<T | null> {
        return this.withMetrics('findById', async () => {
            // Check cache first
            const cacheKey = `findById:${id}:${JSON.stringify(options)}`;
            const cached = this.getFromCache<T>(cacheKey);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }

            this.metrics.cacheMisses++;
            const result = await this._findById(id, options);

            if (result && this.options.caching?.enabled) {
                this.setCache(cacheKey, result, this.options.caching.ttl);
            }

            if (result) {
                this.emit('entity:found', { entityId: id, entity: result });
            }

            return result;
        });
    }

    async findByIds(ids: TKey[], options?: { include?: string[] }): Promise<T[]> {
        return this.withMetrics('findByIds', async () => {
            // For simplicity, we'll call findById for each ID
            // Concrete implementations can optimize this
            const results: T[] = [];
            for (const id of ids) {
                const entity = await this.findById(id, options);
                if (entity) {
                    results.push(entity);
                }
            }
            return results;
        });
    }

    async findAll(options?: QueryOptions): Promise<T[]> {
        return this.withMetrics('findAll', async () => {
            const cacheKey = `findAll:${JSON.stringify(options)}`;
            const cached = this.getFromCache<T[]>(cacheKey);
            if (cached) {
                this.metrics.cacheHits++;
                return cached;
            }

            this.metrics.cacheMisses++;
            const results = await this._findAll(options);

            if (this.options.caching?.enabled) {
                this.setCache(cacheKey, results, this.options.caching.ttl);
            }

            this.emit('entities:found', { count: results.length, options });
            return results;
        });
    }

    async findPaginated(options?: QueryOptions): Promise<PaginatedResult<T>> {
        return this.withMetrics('findPaginated', async () => {
            const pagination = options?.pagination ?? { page: 1, pageSize: 10 };
            const page = pagination.page ?? 1;
            const pageSize = pagination.pageSize ?? 10;
            const offset = (page - 1) * pageSize;

            // Modify options to include offset and limit
            const paginatedOptions: QueryOptions = {
                ...options,
                pagination: { ...pagination, offset, limit: pageSize }
            };

            const [data, total] = await Promise.all([
                this.findAll(paginatedOptions),
                this.count(options?.filters)
            ]);

            const totalPages = Math.ceil(total / pageSize);

            return {
                data,
                total,
                page,
                pageSize,
                totalPages,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            };
        });
    }

    async findFirst(options?: QueryOptions): Promise<T | null> {
        return this.withMetrics('findFirst', async () => {
            const firstOptions: QueryOptions = {
                ...options,
                pagination: { limit: 1 }
            };

            const results = await this.findAll(firstOptions);
            return results.length > 0 ? results[0]! : null;
        });
    }

    async create(entity: CreateEntity<T>): Promise<T> {
        return this.withMetrics('create', async () => {
            // Validate entity if enabled
            if (this.options.validation?.enabled) {
                this.validateEntity(entity);
            }

            const result = await this._create(entity);

            // Invalidate relevant caches
            this.invalidateCache(['findAll', 'count']);

            this.emit('entity:created', { entity: result });
            this.logger.info('Entity created', {
                repository: this.getName(),
                entityId: result.id
            });

            return result;
        });
    }

    async createMany(entities: Array<CreateEntity<T>>): Promise<BulkOperationResult<T>> {
        return this.withMetrics('createMany', async () => {
            const result: BulkOperationResult<T> = {
                successful: [],
                failed: [],
                totalProcessed: entities.length,
                successCount: 0,
                failureCount: 0
            };

            for (const entity of entities) {
                try {
                    const created = await this.create(entity);
                    result.successful.push(created);
                    result.successCount++;
                } catch (error) {
                    result.failed.push({
                        entity: entity as Partial<T>,
                        error: error as Error
                    });
                    result.failureCount++;
                }
            }

            return result;
        });
    }

    async update(id: TKey, updates: UpdateEntity<T>): Promise<T> {
        return this.withMetrics('update', async () => {
            // Validate updates if enabled
            if (this.options.validation?.enabled) {
                this.validateEntity(updates);
            }

            const result = await this._update(id, updates);

            // Invalidate relevant caches
            this.invalidateCache([`findById:${id}`, 'findAll']);

            this.emit('entity:updated', { entityId: id, entity: result });
            this.logger.info('Entity updated', {
                repository: this.getName(),
                entityId: id
            });

            return result;
        });
    }

    async updateMany(criteria: QueryFilter[], updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<BulkOperationResult<T>> {
        return this.withMetrics('updateMany', async () => {
            // Find entities matching criteria
            const entities = await this.findAll({ filters: criteria });

            const result: BulkOperationResult<T> = {
                successful: [],
                failed: [],
                totalProcessed: entities.length,
                successCount: 0,
                failureCount: 0
            };

            for (const entity of entities) {
                try {
                    const updated = await this.update(entity.id as TKey, updates);
                    result.successful.push(updated);
                    result.successCount++;
                } catch (error) {
                    result.failed.push({
                        entity,
                        error: error as Error
                    });
                    result.failureCount++;
                }
            }

            return result;
        });
    }

    async delete(id: TKey): Promise<boolean> {
        return this.withMetrics('delete', async () => {
            const result = await this._delete(id);

            if (result) {
                // Invalidate relevant caches
                this.invalidateCache([`findById:${id}`, 'findAll', 'count']);

                this.emit('entity:deleted', { entityId: id });
                this.logger.info('Entity deleted', {
                    repository: this.getName(),
                    entityId: id
                });
            }

            return result;
        });
    }

    async deleteMany(ids: TKey[]): Promise<BulkOperationResult<{ id: TKey }>> {
        return this.withMetrics('deleteMany', async () => {
            const result: BulkOperationResult<{ id: TKey }> = {
                successful: [],
                failed: [],
                totalProcessed: ids.length,
                successCount: 0,
                failureCount: 0
            };

            for (const id of ids) {
                try {
                    const deleted = await this.delete(id);
                    if (deleted) {
                        result.successful.push({ id });
                        result.successCount++;
                    }
                } catch (error) {
                    result.failed.push({
                        entity: { id },
                        error: error as Error
                    });
                    result.failureCount++;
                }
            }

            return result;
        });
    }

    async deleteWhere(criteria: QueryFilter[]): Promise<number> {
        return this.withMetrics('deleteWhere', async () => {
            const entities = await this.findAll({ filters: criteria });
            const ids = entities.map(e => e.id as TKey);
            const result = await this.deleteMany(ids);
            return result.successCount;
        });
    }

    async count(filters?: QueryFilter[]): Promise<number> {
        return this.withMetrics('count', async () => {
            const cacheKey = `count:${JSON.stringify(filters)}`;
            const cached = this.getFromCache<number>(cacheKey);
            if (cached !== undefined) {
                this.metrics.cacheHits++;
                return cached;
            }

            this.metrics.cacheMisses++;
            const result = await this._count(filters);

            if (this.options.caching?.enabled) {
                this.setCache(cacheKey, result, this.options.caching.ttl);
            }

            return result;
        });
    }

    async exists(id: TKey): Promise<boolean> {
        const entity = await this.findById(id);
        return entity !== null;
    }

    async upsert(entity: Omit<T, 'createdAt' | 'updatedAt'>, criteria: QueryFilter[]): Promise<T> {
        return this.withMetrics('upsert', async () => {
            const existing = await this.findFirst({ filters: criteria });

            if (existing) {
                const { id: _id, ...updateData } = entity;
                return this.update(existing.id as TKey, updateData as Partial<Omit<T, 'id' | 'createdAt'>>);
            } else {
                const { id: _id, ...createData } = entity;
                return this.create(createData as Omit<T, 'id' | 'createdAt' | 'updatedAt'>);
            }
        });
    }

    async executeRaw<TResult = any>(query: string, parameters?: any[]): Promise<TResult> {
        throw SystemError.dependencyMissing('Raw query execution', {
            repository: this.getName(),
            query,
            parameters
        });
    }

    async beginTransaction(options?: { isolationLevel?: TransactionContext['isolationLevel']; timeout?: number }): Promise<TransactionContext> {
        const context: TransactionContext = {
            id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            isolationLevel: options?.isolationLevel ?? 'READ_COMMITTED',
            timeout: options?.timeout ?? 30000
        };

        this.activeTransactions.set(context.id, context);
        this.logger.info('Transaction started', { transactionId: context.id });

        return context;
    }

    async commitTransaction(context: TransactionContext): Promise<void> {
        this.activeTransactions.delete(context.id);
        this.logger.info('Transaction committed', { transactionId: context.id });
    }

    async rollbackTransaction(context: TransactionContext): Promise<void> {
        this.activeTransactions.delete(context.id);
        this.logger.info('Transaction rolled back', { transactionId: context.id });
    }

    async withTransaction<TResult>(
        operation: (repository: Repository<T, TKey>) => Promise<TResult>,
        options?: { isolationLevel?: TransactionContext['isolationLevel']; timeout?: number }
    ): Promise<TResult> {
        const context = await this.beginTransaction(options);

        try {
            const result = await operation(this);
            await this.commitTransaction(context);
            return result;
        } catch (error) {
            await this.rollbackTransaction(context);
            throw error;
        }
    }

    // =============================================================================
    // REPOSITORY MONITORING INTERFACE
    // =============================================================================

    async getHealth(): Promise<RepositoryHealth> {
        const responseTimeStart = Date.now();
        let connectionStatus: 'connected' | 'disconnected' | 'error' = 'connected';

        try {
            // Simple health check - attempt to count entities
            await this._count();
        } catch {
            connectionStatus = 'error';
        }

        const responseTime = Date.now() - responseTimeStart;

        return {
            name: this.getName(),
            status: connectionStatus === 'connected' ? 'healthy' : 'unhealthy',
            connectionStatus,
            lastCheck: new Date(),
            responseTime,
            details: {
                cacheSize: this.cache.size,
                activeTransactions: this.activeTransactions.size,
                totalQueries: this.metrics.totalQueries,
                errorCount: this.metrics.errorCount
            }
        };
    }

    async getMetrics(): Promise<{
        totalQueries: number;
        averageQueryTime: number;
        errorRate: number;
        cacheHitRate?: number;
    }> {
        const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
        const cacheHitRate = totalCacheAccess > 0 ? this.metrics.cacheHits / totalCacheAccess : 0;
        const errorRate = this.metrics.totalQueries > 0 ? this.metrics.errorCount / this.metrics.totalQueries : 0;

        return {
            totalQueries: this.metrics.totalQueries,
            averageQueryTime: this.metrics.averageQueryTime,
            errorRate,
            cacheHitRate
        };
    }

    async reset(): Promise<void> {
        this.cache.clear();
        this.metrics = {
            totalQueries: 0,
            averageQueryTime: 0,
            errorCount: 0,
            cacheHits: 0,
            cacheMisses: 0,
            lastOperation: new Date()
        };
    }

    // =============================================================================
    // PROTECTED UTILITY METHODS
    // =============================================================================

    protected async withMetrics<TResult>(
        operation: string,
        fn: () => Promise<TResult>
    ): Promise<TResult> {
        const startTime = Date.now();
        this.metrics.totalQueries++;
        this.metrics.lastOperation = new Date();

        try {
            const result = await fn();

            const duration = Date.now() - startTime;
            this.updateAverageQueryTime(duration);

            this.logger.debug(`Repository operation completed`, {
                repository: this.getName(),
                operation,
                duration
            });

            return result;
        } catch (error) {
            this.metrics.errorCount++;
            this.logger.error(`Repository operation failed`, error as Error, {
                repository: this.getName(),
                operation,
                duration: Date.now() - startTime
            });
            throw error;
        }
    }

    protected validateEntity(entity: any): void {
        if (!entity || typeof entity !== 'object') {
            throw SystemError.configError('Invalid entity data', {
                repository: this.getName(),
                entity
            });
        }
    }

    protected getFromCache<TCached>(key: string): TCached | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        // Check if entry is expired
        if (Date.now() - entry.timestamp.getTime() > entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.data as TCached;
    }

    protected setCache<TCached>(key: string, data: TCached, ttl?: number): void {
        if (!this.options.caching?.enabled) return;

        const actualTtl = ttl ?? this.options.caching.ttl ?? 300000;

        // Check cache size limit
        if (this.cache.size >= (this.options.caching.maxSize ?? 1000)) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            data,
            timestamp: new Date(),
            ttl: actualTtl
        });
    }

    protected invalidateCache(patterns: string[]): void {
        for (const pattern of patterns) {
            // Remove exact matches
            this.cache.delete(pattern);

            // Remove pattern matches
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        }
    }

    protected emit(event: string, data: any): void {
        if (this.eventEmitter) {
            this.eventEmitter.emit(event, {
                repository: this.getName(),
                timestamp: new Date(),
                ...data
            });
        }
    }

    private updateAverageQueryTime(duration: number): void {
        const totalQueries = this.metrics.totalQueries;
        const currentAverage = this.metrics.averageQueryTime;

        // Calculate running average
        this.metrics.averageQueryTime =
            (currentAverage * (totalQueries - 1) + duration) / totalQueries;
    }
} 