/**
 * Service Layer Index - Exports for the service layer architecture
 * 
 * @package     @imajin/cli
 * @subpackage  services
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-06-18
 *
 * @see         docs/architecture.md
 * 
 * Exports:
 * - Base service abstraction
 * - Service interfaces and contracts
 * - Service registry and discovery
 * - Factory and Strategy patterns
 * - Integration utilities
 */

// Core service interfaces and contracts
export * from './interfaces/ServiceInterface.js';

// Base service abstraction
export { BaseService } from './BaseService.js';

// Service registry and management
export { ServiceRegistry } from './ServiceRegistry.js';

// Factory pattern implementation
export {
    ServiceFactory, type ServiceDefinition, type ServiceFactoryFunction
} from './ServiceFactory.js';

// Strategy pattern implementation
export {
    ServiceStrategyManager,
    type StrategyExecutionResult,
    type StrategySelectionCriteria
} from './ServiceStrategyManager.js';

// Existing services
// StripeService export moved to stripe subdirectory
export { StripeService } from './stripe/StripeService.js';

// Re-export commonly used types for convenience
export type {
    IService, IServiceFactory, IServiceRegistry, IServiceStrategy,
    IServiceStrategyManager, ServiceCapability, ServiceConfig, ServiceContext, ServiceHealth,
    ServiceMetrics, ServiceOperationResult, ServiceRegistrationOptions
} from './interfaces/ServiceInterface.js';
