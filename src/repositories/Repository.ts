/**
 * Repository - Base repository interface for data access abstraction
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
 * - Service Layer for business logic separation
 * - ETL Pipeline for data transformation
 * - Exception System for error handling
 */

import type { UniversalElement } from '../types/Core.js';

/**
 * Query filter options for repository operations
 */
export interface QueryFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'exists';
    value: any;
}

/**
 * Sorting options for repository queries
 */
export interface SortOption {
    field: string;
    direction: 'asc' | 'desc';
}

/**
 * Pagination options for repository queries
 */
export interface PaginationOptions {
    offset?: number;
    limit?: number;
    page?: number;
    pageSize?: number;
}

/**
 * Query options combining filtering, sorting, and pagination
 */
export interface QueryOptions {
    filters?: QueryFilter[];
    sort?: SortOption[];
    pagination?: PaginationOptions;
    include?: string[]; // Related entities to include
    fields?: string[]; // Specific fields to select
}

/**
 * Result wrapper for paginated queries
 */
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult<T> {
    successful: T[];
    failed: Array<{
        entity: Partial<T>;
        error: Error;
    }>;
    totalProcessed: number;
    successCount: number;
    failureCount: number;
}

/**
 * Transaction context for repository operations
 */
export interface TransactionContext {
    id: string;
    isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
    timeout?: number;
}

/**
 * Base repository interface providing type-safe data access patterns
 */
export interface Repository<T extends UniversalElement, TKey = string> {
    /**
     * Find entity by primary key
     */
    findById(id: TKey, options?: { include?: string[] }): Promise<T | null>;

    /**
     * Find multiple entities by primary keys
     */
    findByIds(ids: TKey[], options?: { include?: string[] }): Promise<T[]>;

    /**
     * Find all entities matching query options
     */
    findAll(options?: QueryOptions): Promise<T[]>;

    /**
     * Find entities with pagination support
     */
    findPaginated(options?: QueryOptions): Promise<PaginatedResult<T>>;

    /**
     * Find first entity matching criteria
     */
    findFirst(options?: QueryOptions): Promise<T | null>;

    /**
     * Create a new entity
     */
    create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;

    /**
     * Create multiple entities in bulk
     */
    createMany(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BulkOperationResult<T>>;

    /**
     * Update existing entity by ID
     */
    update(id: TKey, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T>;

    /**
     * Update multiple entities matching criteria
     */
    updateMany(criteria: QueryFilter[], updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<BulkOperationResult<T>>;

    /**
     * Delete entity by ID
     */
    delete(id: TKey): Promise<boolean>;

    /**
     * Delete multiple entities by IDs
     */
    deleteMany(ids: TKey[]): Promise<BulkOperationResult<{ id: TKey }>>;

    /**
     * Delete entities matching criteria
     */
    deleteWhere(criteria: QueryFilter[]): Promise<number>;

    /**
     * Count entities matching criteria
     */
    count(filters?: QueryFilter[]): Promise<number>;

    /**
     * Check if entity exists by ID
     */
    exists(id: TKey): Promise<boolean>;

    /**
     * Upsert (create or update) entity
     */
    upsert(entity: Omit<T, 'createdAt' | 'updatedAt'>, criteria: QueryFilter[]): Promise<T>;

    /**
     * Execute raw query (implementation-specific)
     */
    executeRaw<TResult = any>(query: string, parameters?: any[]): Promise<TResult>;

    /**
     * Begin transaction
     */
    beginTransaction(options?: { isolationLevel?: TransactionContext['isolationLevel']; timeout?: number }): Promise<TransactionContext>;

    /**
     * Commit transaction
     */
    commitTransaction(context: TransactionContext): Promise<void>;

    /**
     * Rollback transaction
     */
    rollbackTransaction(context: TransactionContext): Promise<void>;

    /**
     * Execute operations within transaction
     */
    withTransaction<TResult>(
        operation: (repository: Repository<T, TKey>) => Promise<TResult>,
        options?: { isolationLevel?: TransactionContext['isolationLevel']; timeout?: number }
    ): Promise<TResult>;
}

/**
 * Repository factory interface for creating repository instances
 */
export interface RepositoryFactory {
    create<T extends UniversalElement, TKey = string>(
        entityType: string,
        options?: RepositoryOptions
    ): Repository<T, TKey>;

    register<T extends UniversalElement, TKey = string>(
        entityType: string,
        factory: (options?: RepositoryOptions) => Repository<T, TKey>
    ): void;

    getAvailableTypes(): string[];
}

/**
 * Repository configuration options
 */
export interface RepositoryOptions {
    connectionString?: string;
    dataSource?: 'file' | 'database' | 'api' | 'memory';
    caching?: {
        enabled: boolean;
        ttl?: number;
        maxSize?: number;
    };
    validation?: {
        enabled: boolean;
        strict?: boolean;
    };
    retries?: {
        enabled: boolean;
        maxAttempts?: number;
        backoffMs?: number;
    };
}

/**
 * Repository health check interface
 */
export interface RepositoryHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    connectionStatus: 'connected' | 'disconnected' | 'error';
    lastCheck: Date;
    responseTime?: number;
    details?: Record<string, any>;
}

/**
 * Repository monitoring interface
 */
export interface RepositoryMonitor {
    getHealth(): Promise<RepositoryHealth>;
    getMetrics(): Promise<{
        totalQueries: number;
        averageQueryTime: number;
        errorRate: number;
        cacheHitRate?: number;
        connectionPoolSize?: number;
    }>;
    reset(): Promise<void>;
} 