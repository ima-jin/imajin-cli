/**
 * BusinessSchemaRegistry - Clean business context schema management
 *
 * @package     @imajin/cli
 * @subpackage  context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 *
 * Integration Points:
 * - No legacy support - pure business context driven system
 * - Clean replacement for CompatibilityLayer.ts
 * - Business context schema management without Universal types
 */

import { z } from 'zod';
import { BusinessTypeRegistry } from './BusinessTypeRegistry.js';
import type { BusinessDomainModel } from './BusinessContextProcessor.js';
import type { Logger } from '../logging/Logger.js';

const logger = new (require('../logging/Logger.js').Logger)({ level: 'info' });

/**
 * Initialize business schema registry
 */
export async function initializeBusinessSchemas(businessContext: BusinessDomainModel): Promise<void> {
    BusinessTypeRegistry.initialize(businessContext);
    logger.info('Business schemas initialized', {
        businessType: businessContext.businessType,
        entitiesCount: Object.keys(businessContext.entities).length
    });
}

/**
 * Get business entity schema
 */
export function getBusinessEntitySchema(entityName: string): z.ZodType<any> {
    return BusinessTypeRegistry.getSchema(entityName);
}

/**
 * Get all available business entity types
 */
export function getAvailableEntityTypes(): string[] {
    return BusinessTypeRegistry.getEntityTypes();
}

/**
 * Check if business entity type exists
 */
export function hasBusinessEntityType(entityName: string): boolean {
    return BusinessTypeRegistry.hasEntityType(entityName);
}

/**
 * Validate data against business entity schema
 */
export function validateBusinessEntity(entityName: string, data: unknown): { valid: boolean; errors?: string[]; data?: any } {
    return BusinessTypeRegistry.validateEntity(entityName, data);
}

/**
 * Get current business context
 */
export function getCurrentBusinessContext(): BusinessDomainModel | null {
    return BusinessTypeRegistry.getBusinessContext();
}

/**
 * Transform data to business entity format
 */
export function transformToBusinessEntity(entityName: string, rawData: any, sourceService?: string): any {
    const businessContext = BusinessTypeRegistry.getBusinessContext();
    if (!businessContext) {
        throw new Error('Business context not initialized');
    }

    // Add standard business entity fields
    const businessEntity = {
        ...rawData,
        sourceService: sourceService || 'unknown',
        createdAt: rawData.createdAt || new Date(),
        updatedAt: new Date(),
    };

    // Validate against business schema
    const validation = validateBusinessEntity(entityName, businessEntity);
    if (!validation.valid) {
        throw new Error(`Invalid business entity: ${validation.errors?.join(', ')}`);
    }

    return validation.data;
}

/**
 * Create business entity with validation
 */
export function createBusinessEntity(entityName: string, data: Partial<any>): any {
    const businessContext = BusinessTypeRegistry.getBusinessContext();
    if (!businessContext) {
        throw new Error('Business context not initialized');
    }

    // Ensure required fields are present
    const entityData = {
        id: data.id || generateBusinessEntityId(entityName),
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceService: data.sourceService || 'imajin-cli',
        ...data,
    };

    // Validate against business schema
    const validation = validateBusinessEntity(entityName, entityData);
    if (!validation.valid) {
        throw new Error(`Cannot create business entity: ${validation.errors?.join(', ')}`);
    }

    return validation.data;
}

/**
 * Generate business entity ID
 */
function generateBusinessEntityId(entityName: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${entityName}_${timestamp}_${random}`;
}

/**
 * Export business schema definitions for external use
 */
export function exportBusinessSchemaDefinitions(): Record<string, any> {
    const businessContext = BusinessTypeRegistry.getBusinessContext();
    if (!businessContext) {
        return {};
    }

    const definitions: Record<string, any> = {};
    for (const entityType of BusinessTypeRegistry.getEntityTypes()) {
        const schema = BusinessTypeRegistry.getSchema(entityType);
        definitions[entityType] = {
            entityName: entityType,
            businessType: businessContext.businessType,
            schema: schema._def, // Zod schema definition
            fields: businessContext.entities[entityType]?.fields || [],
        };
    }

    return definitions;
}
