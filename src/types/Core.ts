/**
 * Core - Universal entity schemas and type management
 * 
 * @package     @imajin/cli
 * @subpackage  types/core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * @see        docs/architecture/types.md
 * 
 * Integration Points:
 * - Universal entity schemas for cross-service mapping
 * - Type collision prevention via namespacing
 * - Service adapter type definitions
 * - ETL pipeline type transformations
 */

import { z } from 'zod';

// =============================================================================
// UNIVERSAL ENTITY SCHEMAS (Cross-Service Standards)
// =============================================================================

/**
 * Universal Customer schema - All services map to this
 */
export const UniversalCustomerSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    phone: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).optional(),
    // Service-specific data stored here
    serviceData: z.record(z.any()).optional(),
    // Source service identifier
    sourceService: z.string(),
});

export type UniversalCustomer = z.infer<typeof UniversalCustomerSchema>;

/**
 * Universal Payment schema
 */
export const UniversalPaymentSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
    customerId: z.string().optional(),
    description: z.string().optional(),
    createdAt: z.date(),
    metadata: z.record(z.any()).optional(),
    serviceData: z.record(z.any()).optional(),
    sourceService: z.string(),
});

export type UniversalPayment = z.infer<typeof UniversalPaymentSchema>;

// =============================================================================
// SERVICE NAMESPACE SYSTEM
// =============================================================================

/**
 * Service namespace registry - prevents name collisions
 */
export const ServiceNamespaces = {
    stripe: 'stripe',
    salesforce: 'salesforce',
    hubspot: 'hubspot',
    mailchimp: 'mailchimp',
    shopify: 'shopify',
    // Add new services here
} as const;

export type ServiceNamespace = keyof typeof ServiceNamespaces;

/**
 * Namespaced type utility
 */
export type NamespacedType<T extends ServiceNamespace, EntityType> = {
    readonly __namespace: T;
    readonly __type: string;
} & EntityType;

// =============================================================================
// SERVICE ADAPTER INTERFACE
// =============================================================================

/**
 * Every service must implement adapters to/from universal schemas
 */
export interface ServiceAdapter<TServiceEntity, TUniversalEntity> {
    /**
     * Convert service-specific entity to universal format
     */
    toUniversal(serviceEntity: TServiceEntity): TUniversalEntity;

    /**
     * Convert universal format to service-specific entity
     */
    fromUniversal(universalEntity: TUniversalEntity): TServiceEntity;

    /**
 * Validate service entity against its schema
 */
    validate(entity: unknown): entity is TServiceEntity;

    /**
     * Get service namespace
     */
    getNamespace(): ServiceNamespace;
}

// =============================================================================
// TYPE COLLISION DETECTION
// =============================================================================

/**
 * Type registry to detect naming conflicts
 */
export class TypeRegistry {
    private static registry: Map<string, ServiceNamespace[]> = new Map();

    /**
     * Register a type name with its service namespace
     */
    static register(typeName: string, namespace: ServiceNamespace): void {
        const existing = this.registry.get(typeName) || [];
        if (existing.includes(namespace)) {
            return; // Already registered
        }

        existing.push(namespace);
        this.registry.set(typeName, existing);

        // Warn about potential collisions
        if (existing.length > 1) {
            console.warn(`Type collision detected: "${typeName}" used by services: ${existing.join(', ')}`);
        }
    }

    /**
     * Get all services using a type name
     */
    static getServices(typeName: string): ServiceNamespace[] {
        return this.registry.get(typeName) || [];
    }

    /**
     * Check if type name has collisions
     */
    static hasCollision(typeName: string): boolean {
        const services = this.getServices(typeName);
        return services.length > 1;
    }
}

// =============================================================================
// CROSS-SERVICE WORKFLOW TYPES
// =============================================================================

/**
 * Cross-service operation result
 */
export interface CrossServiceResult<T = any> {
    success: boolean;
    data?: T;
    errors: Array<{
        service: ServiceNamespace;
        code: string;
        message: string;
        details?: any;
    }>;
    metadata: {
        timestamp: Date;
        correlationId: string;
        services: ServiceNamespace[];
        duration: number;
    };
}

/**
 * Service capability definition
 */
export interface ServiceCapability {
    name: string;
    description: string;
    supports: {
        create: boolean;
        read: boolean;
        update: boolean;
        delete: boolean;
        list: boolean;
        search: boolean;
        webhook: boolean;
        realtime: boolean;
    };
    entities: string[];
}

// =============================================================================
// EXPORT HELPERS
// =============================================================================

/**
 * Helper to create namespaced type names
 */
export function createTypeName<T extends ServiceNamespace>(
    namespace: T,
    entityName: string
): string {
    return `${namespace}_${entityName}`;
}

/**
 * Helper to extract namespace from type name
 */
export function extractNamespace(typeName: string): ServiceNamespace | null {
    const parts = typeName.split('_');
    if (parts.length < 2) return null;

    const namespace = parts[0] as ServiceNamespace;
    return Object.values(ServiceNamespaces).includes(namespace) ? namespace : null;
} 