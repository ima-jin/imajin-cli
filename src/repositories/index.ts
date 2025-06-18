/**
 * Repository System Exports
 * 
 * @package     @imajin/cli
 * @subpackage  repositories
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 *
 * Integration Points:
 * - Repository pattern interfaces
 * - Concrete repository implementations
 * - Repository factory and provider
 */

// Core repository interfaces and types
export type {
    BulkOperationResult, RepositoryFactory as IRepositoryFactory, PaginatedResult, PaginationOptions, QueryFilter, QueryOptions, Repository, RepositoryHealth,
    RepositoryMonitor, RepositoryOptions, SortOption, TransactionContext
} from './Repository.js';

// Base repository implementation
export { BaseRepository } from './BaseRepository.js';

// Concrete implementations
export { MemoryRepository } from './implementations/MemoryRepository.js';

// Factory and provider
export { RepositoryFactory, RepositoryProvider } from './RepositoryFactory.js';
