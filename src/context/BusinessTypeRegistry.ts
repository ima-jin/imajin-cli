/**
 * BusinessTypeRegistry - Dynamic type registry that generates Zod schemas from business context
 *
 * @package     @imajin/cli
 * @subpackage  context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-04
 *
 * Integration Points:
 * - Replaces hardcoded Universal types with user-defined business models
 * - Dynamic Zod schema generation from business context
 * - Type-safe validation using business terminology
 */

import { z } from 'zod';
import type { BusinessDomainModel } from './BusinessContextProcessor.js';
import type { Logger } from '../logging/Logger.js';

/**
 * Dynamic type registry that generates Zod schemas from business context
 * Replaces hardcoded Universal types with user-defined business models
 */
export class BusinessTypeRegistry {
    private static businessContext: BusinessDomainModel | null = null;
    private static generatedSchemas: Map<string, z.ZodType<any>> = new Map();
    private static logger: Logger | null = null;

    /**
     * Initialize registry with business context
     */
    static initialize(context: BusinessDomainModel, logger?: Logger): void {
        this.businessContext = context;
        this.logger = logger || null;
        this.generateSchemasFromContext(context);
        this.logger?.info('Business type registry initialized', {
            businessType: context.businessType,
            schemasCount: this.generatedSchemas.size
        });
    }

    /**
     * Get schema for business entity
     */
    static getSchema(entityName: string): z.ZodType<any> {
        const schema = this.generatedSchemas.get(entityName);
        if (!schema) {
            throw new Error(`No schema found for business entity: ${entityName}`);
        }
        return schema;
    }

    /**
     * Get all available business entity types
     */
    static getEntityTypes(): string[] {
        return Array.from(this.generatedSchemas.keys());
    }

    /**
     * Check if entity type exists
     */
    static hasEntityType(entityName: string): boolean {
        return this.generatedSchemas.has(entityName);
    }

    /**
     * Get current business context
     */
    static getBusinessContext(): BusinessDomainModel | null {
        return this.businessContext;
    }

    /**
     * Generate Zod schemas from business context
     */
    private static generateSchemasFromContext(context: BusinessDomainModel): void {
        for (const [entityName, entityDef] of Object.entries(context.entities)) {
            const schema = this.createZodSchemaFromEntity(entityDef);
            this.generatedSchemas.set(entityName, schema);
        }
    }

    /**
     * Create Zod schema from business entity definition
     */
    private static createZodSchemaFromEntity(entityDef: any): z.ZodType<any> {
        const schemaFields: Record<string, z.ZodType<any>> = {};

        // Add standard fields - these should be optional for user data input
        // The system can provide defaults when needed
        schemaFields.id = z.string().min(1).max(100).optional().default(() => `temp-${Date.now()}`);
        schemaFields.createdAt = z.date().optional().default(() => new Date());
        schemaFields.updatedAt = z.date().optional().default(() => new Date());
        schemaFields.sourceService = z.string().optional();

        // Add business-specific fields
        for (const field of entityDef.fields) {
            schemaFields[field.name] = this.createZodFieldType(field);
        }

        return z.object(schemaFields);
    }

    /**
     * Create Zod field type from field definition
     */
    private static createZodFieldType(field: any): z.ZodType<any> {
        let zodType: z.ZodType<any>;

        switch (field.type) {
            case 'string':
            case 'text': // Recipe field type
                zodType = z.string();
                break;
            case 'number':
                zodType = z.number();
                break;
            case 'boolean':
                zodType = z.boolean();
                break;
            case 'date':
            case 'datetime': // Recipe field type
                zodType = z.date();
                break;
            case 'array':
                zodType = z.array(z.string()); // Simplified for now
                break;
            case 'enum':
                if (field.values && Array.isArray(field.values) && field.values.length > 0) {
                    zodType = z.enum(field.values as [string, ...string[]]);
                } else {
                    zodType = z.string();
                }
                break;
            case 'object':
            case 'json': // Recipe field type
                zodType = z.any(); // Flexible JSON object
                break;
            case 'reference': // Recipe field type for entity references
                zodType = z.string(); // Store as ID reference
                break;
            case 'email':
                zodType = z.string().email();
                break;
            case 'phone':
                zodType = z.string().regex(/^\+?[1-9]\d{1,14}$/);
                break;
            case 'currency':
                zodType = z.number().min(0).multipleOf(0.01);
                break;
            default:
                zodType = z.any();
        }

        // Apply validation rules
        if (field.validation) {
            if (field.validation.min !== undefined && zodType instanceof z.ZodString) {
                zodType = zodType.min(field.validation.min);
            } else if (field.validation.min !== undefined && zodType instanceof z.ZodNumber) {
                zodType = zodType.min(field.validation.min);
            }

            if (field.validation.max !== undefined && zodType instanceof z.ZodString) {
                zodType = zodType.max(field.validation.max);
            } else if (field.validation.max !== undefined && zodType instanceof z.ZodNumber) {
                zodType = zodType.max(field.validation.max);
            }

            if (field.validation.pattern && zodType instanceof z.ZodString) {
                zodType = zodType.regex(new RegExp(field.validation.pattern));
            }
        }

        // Handle optional/required
        if (!field.required || field.optional) {
            zodType = zodType.optional();
        }

        // Handle default values
        if (field.default !== undefined) {
            zodType = zodType.default(field.default);
        }

        return zodType;
    }

    /**
     * Validate data against business entity schema
     */
    static validateEntity(entityName: string, data: unknown): { valid: boolean; errors?: string[]; data?: any } {
        try {
            const schema = this.getSchema(entityName);
            const validated = schema.parse(data);
            return { valid: true, data: validated };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    valid: false,
                    errors: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
                };
            }
            return { valid: false, errors: [String(error)] };
        }
    }
}
