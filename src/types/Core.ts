/**
 * Core - Business context-driven type management
 * 
 * @package     @imajin/cli
 * @subpackage  types/core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-09
 *
 * @see        docs/architecture/business-context.md
 * 
 * Integration Points:
 * - Dynamic business context type generation
 * - Service adapter type definitions
 * - ETL pipeline type transformations
 * - User-defined business domain models
 */

import { z } from 'zod';
import type { BusinessDomainModel } from '../context/BusinessContextProcessor.js';
import type { BusinessConfiguration } from '../context/BusinessContextManager.js';

// =============================================================================
// BUSINESS CONTEXT TYPE SYSTEM
// =============================================================================

/**
 * Registry for dynamically generated business types
 */
export class BusinessTypeRegistry {
    private static registeredTypes: Map<string, z.ZodType<any>> = new Map();
    private static businessDomains: Map<string, BusinessDomainModel> = new Map();

    /**
     * Register business domain types from business context
     */
    static registerBusinessDomain(domain: BusinessDomainModel): void {
        console.log(`🎯 Registering business types for ${domain.businessType}...`);
        
        this.businessDomains.set(domain.businessType, domain);
        
        // Generate Zod schemas for each entity
        for (const [entityName, entityDef] of Object.entries(domain.entities)) {
            const schema = this.generateEntitySchema(entityName, entityDef, domain.businessType);
            const typeName = `${domain.businessType}.${entityName}`;
            this.registeredTypes.set(typeName, schema);
        }
        
        console.log(`✅ Registered ${Object.keys(domain.entities).length} business types for ${domain.businessType}`);
    }

    /**
     * Get schema for business entity type
     */
    static getBusinessEntitySchema(businessType: string, entityName: string): z.ZodType<any> | undefined {
        const typeName = `${businessType}.${entityName}`;
        return this.registeredTypes.get(typeName);
    }

    /**
     * Get all registered business types
     */
    static getRegisteredTypes(): string[] {
        return Array.from(this.registeredTypes.keys());
    }

    /**
     * Check if business type is registered
     */
    static isBusinessTypeRegistered(businessType: string, entityName: string): boolean {
        const typeName = `${businessType}.${entityName}`;
        return this.registeredTypes.has(typeName);
    }

    /**
     * Get business domain model
     */
    static getBusinessDomain(businessType: string): BusinessDomainModel | undefined {
        return this.businessDomains.get(businessType);
    }

    /**
     * Generate schema from entity definition
     */
    private static generateEntitySchema(entityName: string, entityDef: any, businessType: string): z.ZodType<any> {
        const schemaFields: Record<string, z.ZodType<any>> = {};
        
        // Add standard fields
        schemaFields.id = z.string().min(1);
        schemaFields.createdAt = z.date().optional();
        schemaFields.updatedAt = z.date().optional();
        schemaFields.businessType = z.literal(businessType);
        
        // Add entity-specific fields
        for (const field of entityDef.fields || []) {
            schemaFields[field.name] = this.createZodFieldFromBusinessField(field);
        }
        
        return z.object(schemaFields);
    }

    /**
     * Create Zod field from business field definition
     */
    private static createZodFieldFromBusinessField(fieldDef: any): z.ZodType<any> {
        let zodType: z.ZodType<any>;
        
        switch (fieldDef.type) {
            case 'string':
                let stringType = z.string();
                if (fieldDef.validation?.min) stringType = stringType.min(fieldDef.validation.min);
                if (fieldDef.validation?.max) stringType = stringType.max(fieldDef.validation.max);
                if (fieldDef.validation?.pattern) {
                    stringType = stringType.regex(new RegExp(fieldDef.validation.pattern));
                }
                zodType = stringType;
                break;
                
            case 'number':
                let numberType = z.number();
                if (fieldDef.validation?.min !== undefined) numberType = numberType.min(fieldDef.validation.min);
                if (fieldDef.validation?.max !== undefined) numberType = numberType.max(fieldDef.validation.max);
                zodType = numberType;
                break;
                
            case 'boolean':
                zodType = z.boolean();
                break;
                
            case 'date':
                zodType = z.date();
                break;
                
            case 'array':
                const itemType = fieldDef.items === 'string' ? z.string() : 
                               fieldDef.items === 'number' ? z.number() : 
                               z.any();
                zodType = z.array(itemType);
                break;
                
            case 'object':
                zodType = z.record(z.any());
                break;
                
            case 'enum':
                if (fieldDef.values && fieldDef.values.length > 0) {
                    zodType = z.enum(fieldDef.values as [string, ...string[]]);
                } else {
                    zodType = z.string();
                }
                break;
                
            default:
                zodType = z.any();
                break;
        }
        
        // Handle optional/required
        if (!fieldDef.required) {
            zodType = zodType.optional();
        }
        
        // Handle default values
        if (fieldDef.default !== undefined) {
            zodType = zodType.default(fieldDef.default);
        }
        
        return zodType;
    }
}

/**
 * Initialize business type system from configuration
 */
export async function initializeBusinessTypeSystem(config?: BusinessConfiguration): Promise<void> {
    console.log('🚀 Initializing business type system...');
    
    if (!config) {
        // Try to load from BusinessContextManager
        try {
            const { BusinessContextManager } = await import('../context/BusinessContextManager.js');
            const manager = new BusinessContextManager();
            const businessConfig = await manager.getCurrentConfiguration();
            const domainModel = await manager.toDomainModel();
            BusinessTypeRegistry.registerBusinessDomain(domainModel);
        } catch (error) {
            console.warn('⚠️ No business context found. Business types will be registered when context is created.');
            return;
        }
    } else {
        // Convert config to domain model and register
        const domainModel: BusinessDomainModel = {
            businessType: config.business.type,
            description: config.business.description,
            entities: config.entities,
            workflows: config.workflows,
            businessRules: config.businessRules,
        };
        BusinessTypeRegistry.registerBusinessDomain(domainModel);
    }
    
    console.log('✅ Business type system initialized');
}

// =============================================================================
// SERVICE NAMESPACE SYSTEM (Enhanced)
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
    notion: 'notion',
    github: 'github',
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
// SERVICE ADAPTER INTERFACE (Enhanced)
// =============================================================================

/**
 * Every service must implement adapters to/from business context entities
 */
export interface ServiceAdapter<TServiceEntity, TBusinessEntity> {
    /**
     * Convert service-specific entity to business context format
     */
    toBusinessContext(serviceEntity: TServiceEntity): TBusinessEntity;
    
    /**
     * Convert business context format to service-specific entity
     */
    fromBusinessContext(businessEntity: TBusinessEntity): TServiceEntity;

    /**
     * Validate service entity against its schema
     */
    validate(entity: unknown): entity is TServiceEntity;

    /**
     * Get service namespace
     */
    getNamespace(): ServiceNamespace;

    /**
     * Get supported entity capabilities
     */
    getCapabilities?(): ServiceCapability;
}

// =============================================================================
// TYPE COLLISION DETECTION (Enhanced)
// =============================================================================

/**
 * Type registry to detect naming conflicts
 */
export class TypeRegistry {
    private static readonly registry: Map<string, ServiceNamespace[]> = new Map();

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

    /**
     * Get type collision resolution strategy
     */
    static getResolutionStrategy(typeName: string): 'namespace' | 'version' | 'merge' {
        const services = this.getServices(typeName);
        if (services.length <= 1) return 'namespace';
        
        // Default strategy for multiple services
        return 'namespace';
    }
}

// =============================================================================
// CROSS-SERVICE WORKFLOW TYPES (Enhanced)
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
        schemaVersion?: string;
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
        bulk: boolean;
    };
    entities: string[];
    version: string;
    rateLimit?: {
        requests: number;
        window: number;
        unit: 'second' | 'minute' | 'hour' | 'day';
    };
}

/**
 * Schema validation configuration
 */
export interface SchemaValidationConfig {
    strict: boolean;
    allowAdditionalProperties: boolean;
    validateReferences: boolean;
    enforceBusinessRules: boolean;
}

// =============================================================================
// UNIVERSAL SCHEMA UTILITIES (New)
// =============================================================================

/**
 * Schema-aware entity factory
 */
export class UniversalEntityFactory {
    /**
     * Create a universal entity with proper validation
     */
    static async createEntity<T>(
        entityType: string, 
        data: Partial<T>, 
        sourceService: ServiceNamespace,
        config: SchemaValidationConfig = { strict: true, allowAdditionalProperties: false, validateReferences: true, enforceBusinessRules: true }
    ): Promise<T> {
        await initializeBusinessTypeSystem();
        
        const baseEntity = {
            id: (data as any).id || this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
            serviceData: {},
            sourceService,
            ...data
        };

        // Validate against business context schema
        const businessType = 'default'; // Could be extracted from context
        const schema = BusinessTypeRegistry.getBusinessEntitySchema(businessType, entityType);
        
        if (schema && config.strict) {
            const validation = schema.safeParse(baseEntity);
            if (!validation.success) {
                throw new Error(`Schema validation failed: ${validation.error.message}`);
            }
        }

        return baseEntity as T;
    }

    /**
     * Generate unique ID
     */
    private static generateId(): string {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Schema version manager
 */
export class SchemaVersionManager {
    private static currentVersion = '1.0.0';

    /**
     * Get current schema version
     */
    static getCurrentVersion(): string {
        return this.currentVersion;
    }

    /**
     * Check if migration is needed
     */
    static async checkMigrationNeeded(dataVersion: string): Promise<boolean> {
        return dataVersion !== this.currentVersion;
    }

    /**
     * Perform migration if needed
     */
    static async migrateIfNeeded(data: any, fromVersion: string): Promise<any> {
        if (fromVersion === this.currentVersion) {
            return data;
        }

        // Business context migration logic would go here
        // For now, log the migration requirement
        console.log(`Migration needed from ${fromVersion} to ${this.currentVersion}`);
        const migrations: any[] = []; // Placeholder for business context migrations

        // Apply migrations sequentially
        let result = data;
        for (const migration of migrations) {
            // Migration application would go here
            console.log(`Applying migration: ${migration.description}`);
        }

        return result;
    }
}

// =============================================================================
// UTILITY FUNCTIONS (Enhanced)
// =============================================================================

/**
 * Create namespaced type name
 */
export function createTypeName<T extends ServiceNamespace>(
    namespace: T,
    entityName: string
): string {
    return `${namespace}:${entityName}`;
}

/**
 * Extract namespace from namespaced type name
 */
export function extractNamespace(typeName: string): ServiceNamespace | null {
    const parts = typeName.split(':');
    if (parts.length !== 2) return null;
    
    const namespace = parts[0] as ServiceNamespace;
    return namespace in ServiceNamespaces ? namespace : null;
}

/**
 * Validate entity against business context schema
 */
export async function validateBusinessEntity(entityType: string, entity: unknown, businessType: string = 'default'): Promise<boolean> {
    try {
        await initializeBusinessTypeSystem();
        const schema = BusinessTypeRegistry.getBusinessEntitySchema(businessType, entityType);
        if (!schema) {
            console.warn(`No schema found for business type: ${businessType}.${entityType}`);
            return true; // Allow unknown entities
        }
        const result = schema.safeParse(entity);
        return result.success;
    } catch (error) {
        console.error('Business entity validation failed:', error);
        return false;
    }
}

/**
 * Transform entity between service formats using business context
 */
export async function transformEntity<TSource, TTarget>(
    sourceEntity: TSource,
    sourceService: ServiceNamespace,
    targetService: ServiceNamespace,
    entityType: string,
    businessType: string = 'default'
): Promise<TTarget> {
    await initializeBusinessTypeSystem();
    
    // For now, use direct transformation
    // In a full implementation, this would use the ETL graph system
    // to transform between service formats via business context
    console.log(`Transforming ${entityType} from ${sourceService} to ${targetService} via ${businessType} business context`);
    
    return sourceEntity as unknown as TTarget;
} 