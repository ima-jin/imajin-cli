/**
 * MemoryRepository - In-memory repository implementation
 * 
 * @package     @imajin/cli
 * @subpackage  repositories/implementations
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-25
 *
 * Integration Points:
 * - BaseRepository for common functionality
 * - UniversalElement for type safety
 * - Testing and development data storage
 */

import type { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '../../logging/Logger.js';
// Universal types removed - now using dynamic business context types
import { BaseRepository } from '../BaseRepository.js';
import type { QueryFilter, QueryOptions, RepositoryOptions } from '../Repository.js';

/**
 * In-memory repository implementation for testing and development
 */
export class MemoryRepository<T extends Record<string, any>, TKey = string> extends BaseRepository<T, TKey> {
    private readonly storage: Map<TKey, T>;
    private readonly repositoryName: string;

    constructor(
        name: string,
        logger: Logger,
        eventEmitter: EventEmitter,
        options: RepositoryOptions = {}
    ) {
        super(logger, eventEmitter, {
            dataSource: 'memory',
            caching: { enabled: true, ttl: 60000, maxSize: 500 }, // Enable caching for memory repo
            ...options
        });

        this.repositoryName = name;
        this.storage = new Map();
    }

    getName(): string {
        return this.repositoryName;
    }

    async initialize(): Promise<void> {
        this.logger.info(`Initializing memory repository: ${this.getName()}`);
        // No initialization needed for memory storage
    }

    async cleanup(): Promise<void> {
        this.logger.info(`Cleaning up memory repository: ${this.getName()}`);
        this.storage.clear();
    }

    protected async _findById(id: TKey, _options?: { include?: string[] }): Promise<T | null> {
        const entity = this.storage.get(id);
        return entity ?? null;
    }

    protected async _findAll(options?: QueryOptions): Promise<T[]> {
        let results = Array.from(this.storage.values());

        // Apply filters
        if (options?.filters) {
            results = this.applyFilters(results, options.filters);
        }

        // Apply sorting
        if (options?.sort) {
            results = this.applySorting(results, options.sort);
        }

        // Apply field selection
        if (options?.fields) {
            results = this.applyFieldSelection(results, options.fields);
        }

        // Apply pagination
        if (options?.pagination) {
            results = this.applyPagination(results, options.pagination);
        }

        return results;
    }

    protected async _create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
        const id = uuidv4() as TKey;
        const now = new Date();

        const newEntity = {
            ...entity,
            id: id as any,
            createdAt: now,
            updatedAt: now
        } as unknown as T;

        this.storage.set(id, newEntity);
        return newEntity;
    }

    protected async _update(id: TKey, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
        const existing = this.storage.get(id);
        if (!existing) {
            throw new Error(`Entity not found: ${id}`);
        }

        const updated: T = {
            ...existing,
            ...updates,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: new Date()
        };

        this.storage.set(id, updated);
        return updated;
    }

    protected async _delete(id: TKey): Promise<boolean> {
        return this.storage.delete(id);
    }

    protected async _count(filters?: QueryFilter[]): Promise<number> {
        let entities = Array.from(this.storage.values());

        if (filters) {
            entities = this.applyFilters(entities, filters);
        }

        return entities.length;
    }

    // =============================================================================
    // PRIVATE UTILITY METHODS
    // =============================================================================

    private applyFilters(entities: T[], filters: QueryFilter[]): T[] {
        return entities.filter(entity => {
            return filters.every(filter => this.matchesFilter(entity, filter));
        });
    }

    private matchesFilter(entity: T, filter: QueryFilter): boolean {
        const value = this.getNestedValue(entity, filter.field);

        switch (filter.operator) {
            case 'eq':
                return value === filter.value;
            case 'ne':
                return value !== filter.value;
            case 'gt':
                return value > filter.value;
            case 'gte':
                return value >= filter.value;
            case 'lt':
                return value < filter.value;
            case 'lte':
                return value <= filter.value;
            case 'in':
                return Array.isArray(filter.value) && filter.value.includes(value);
            case 'nin':
                return Array.isArray(filter.value) && !filter.value.includes(value);
            case 'like':
                return typeof value === 'string' &&
                    typeof filter.value === 'string' &&
                    value.toLowerCase().includes(filter.value.toLowerCase());
            case 'exists':
                return filter.value ? value !== undefined && value !== null : value === undefined || value === null;
            default:
                return false;
        }
    }

    private applySorting(entities: T[], sortOptions: { field: string; direction: 'asc' | 'desc' }[]): T[] {
        return entities.sort((a, b) => {
            for (const sort of sortOptions) {
                const aValue = this.getNestedValue(a, sort.field);
                const bValue = this.getNestedValue(b, sort.field);

                let comparison = 0;

                if (aValue < bValue) comparison = -1;
                else if (aValue > bValue) comparison = 1;

                if (comparison !== 0) {
                    return sort.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }

    private applyFieldSelection(entities: T[], fields: string[]): T[] {
        return entities.map(entity => {
            const selected: any = {};

            for (const field of fields) {
                const value = this.getNestedValue(entity, field);
                this.setNestedValue(selected, field, value);
            }

            return selected as T;
        });
    }

    private applyPagination(entities: T[], pagination: { offset?: number; limit?: number }): T[] {
        const { offset = 0, limit } = pagination;

        if (limit) {
            return entities.slice(offset, offset + limit);
        }

        return entities.slice(offset);
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;

        const target = keys.reduce((current, key) => {
            if (!(key in current)) {
                current[key] = {};
            }
            return current[key];
        }, obj);

        target[lastKey] = value;
    }

    // =============================================================================
    // ADDITIONAL MEMORY-SPECIFIC METHODS
    // =============================================================================

    /**
     * Get the current size of the memory storage
     */
    getStorageSize(): number {
        return this.storage.size;
    }

    /**
     * Clear all data from memory storage
     */
    clearStorage(): void {
        this.storage.clear();
        this.emit('storage:cleared', { repository: this.getName() });
    }

    /**
     * Get all entity IDs in storage
     */
    getAllIds(): TKey[] {
        return Array.from(this.storage.keys());
    }

    /**
     * Check if storage has any data
     */
    isEmpty(): boolean {
        return this.storage.size === 0;
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats(): {
        entityCount: number;
        averageEntitySize: number;
        totalMemoryUsage: number;
    } {
        const entityCount = this.storage.size;

        if (entityCount === 0) {
            return {
                entityCount: 0,
                averageEntitySize: 0,
                totalMemoryUsage: 0
            };
        }

        // Rough memory calculation
        const entities = Array.from(this.storage.values());
        const totalSize = entities.reduce((sum, entity) => {
            return sum + JSON.stringify(entity).length;
        }, 0);

        return {
            entityCount,
            averageEntitySize: Math.round(totalSize / entityCount),
            totalMemoryUsage: totalSize
        };
    }

    /**
     * Bulk load data into memory storage
     */
    async bulkLoad(entities: T[]): Promise<void> {
        for (const entity of entities) {
            this.storage.set(entity.id as TKey, entity);
        }

        this.emit('storage:bulk-loaded', {
            repository: this.getName(),
            count: entities.length
        });

        this.logger.info(`Bulk loaded ${entities.length} entities into memory repository: ${this.getName()}`);
    }

    /**
     * Export all data from memory storage
     */
    exportData(): T[] {
        return Array.from(this.storage.values());
    }
} 