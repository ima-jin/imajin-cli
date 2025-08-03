/**
 * SchemaRegistry - Dynamic schema loading system
 * 
 * @package     @imajin/cli
 * @subpackage  schemas
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 *
 * Integration Points:
 * - External schema loading and management
 * - Runtime validation and type generation
 * - Schema compatibility checking and migration
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { SchemaLoader } from './SchemaLoader.js';
import { SchemaValidator } from './SchemaValidator.js';
import { TypeGenerator } from './TypeGenerator.js';
import type { 
    SchemaDefinition, 
    SchemaMetadata,
    SchemaRegistryOptions,
    ValidationResult,
    CompatibilityResult,
    CompatibilityIssue,
    Migration,
    Transform
} from './types/SchemaTypes.js';

// =============================================================================
// SCHEMA REGISTRY CLASS
// =============================================================================

export class SchemaRegistry {
    private readonly schemas = new Map<string, { schema: SchemaDefinition; metadata: SchemaMetadata }>();
    private readonly loader: SchemaLoader;
    private readonly validator: SchemaValidator;
    private readonly typeGenerator: TypeGenerator;
    private readonly options: SchemaRegistryOptions;

    constructor(options: Partial<SchemaRegistryOptions> = {}) {
        this.options = {
            schemaDirectory: options.schemaDirectory || 'schemas',
            cacheEnabled: options.cacheEnabled ?? true,
            watchForChanges: options.watchForChanges ?? false,
            validateOnLoad: options.validateOnLoad ?? true
        };

        this.loader = new SchemaLoader();
        this.validator = new SchemaValidator();
        this.typeGenerator = new TypeGenerator();
    }

    // =============================================================================
    // SCHEMA LOADING
    // =============================================================================

    /**
     * Load schemas from external files
     */
    async loadSchemas(schemaDir?: string): Promise<void> {
        const directory = schemaDir || this.options.schemaDirectory;
        
        try {
            const loadedSchemas = await this.loader.loadSchemasFromDirectory(directory);
            
            for (const [schemaName, { schema, metadata }] of loadedSchemas.entries()) {
                this.schemas.set(schemaName, { schema, metadata });
                this.validator.registerSchema(schemaName, schema);
            }

            console.log(`Loaded ${loadedSchemas.size} schemas from ${directory}`);
        } catch (error) {
            throw new Error(`Failed to load schemas: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Load single schema file
     */
    async loadSchema(filePath: string): Promise<void> {
        try {
            const { schema, metadata } = await this.loader.loadSchemaFile(filePath);
            const schemaName = path.basename(filePath, path.extname(filePath));
            
            this.schemas.set(schemaName, { schema, metadata });
            this.validator.registerSchema(schemaName, schema);
            
            console.log(`Loaded schema '${schemaName}' from ${filePath}`);
        } catch (error) {
            throw new Error(`Failed to load schema from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Reload all schemas
     */
    async reloadSchemas(): Promise<void> {
        this.schemas.clear();
        await this.loadSchemas();
    }

    // =============================================================================
    // SCHEMA ACCESS
    // =============================================================================

    /**
     * Get schema definition
     */
    getSchema(schemaName: string): SchemaDefinition | undefined {
        const entry = this.schemas.get(schemaName);
        return entry?.schema;
    }

    /**
     * Get schema with metadata
     */
    getSchemaWithMetadata(schemaName: string): { schema: SchemaDefinition; metadata: SchemaMetadata } | undefined {
        return this.schemas.get(schemaName);
    }

    /**
     * Get all available schemas
     */
    getAllSchemas(): Map<string, SchemaDefinition> {
        const result = new Map<string, SchemaDefinition>();
        for (const [name, { schema }] of this.schemas.entries()) {
            result.set(name, schema);
        }
        return result;
    }

    /**
     * Get schema names
     */
    getSchemaNames(): string[] {
        return Array.from(this.schemas.keys());
    }

    /**
     * Check if schema exists
     */
    hasSchema(schemaName: string): boolean {
        return this.schemas.has(schemaName);
    }

    // =============================================================================
    // VALIDATION
    // =============================================================================

    /**
     * Validate entity against schema
     */
    validate(schemaName: string, entityName: string, data: unknown): ValidationResult {
        return this.validator.validate(schemaName, entityName, data);
    }

    /**
     * Transform data according to schema
     */
    transform(schemaName: string, entityName: string, data: unknown): ValidationResult {
        const transformResult = this.validator.transform(schemaName, entityName, data);
        return {
            success: transformResult.success,
            errors: transformResult.errors,
            data: transformResult.data
        };
    }

    /**
     * Validate required fields only
     */
    validateRequired(schemaName: string, entityName: string, data: unknown): ValidationResult {
        return this.validator.validateRequired(schemaName, entityName, data);
    }

    /**
     * Validate field types and constraints only
     */
    validateFields(schemaName: string, entityName: string, data: unknown): ValidationResult {
        return this.validator.validateFields(schemaName, entityName, data);
    }

    // =============================================================================
    // TYPE GENERATION
    // =============================================================================

    /**
     * Generate TypeScript types
     */
    async generateTypes(outputPath?: string): Promise<string> {
        if (this.schemas.size === 0) {
            throw new Error('No schemas loaded. Call loadSchemas() first.');
        }

        const allSchemas = this.getAllSchemas();
        const generatedTypes = this.typeGenerator.generateTypesFile(allSchemas);

        if (outputPath) {
            await this.typeGenerator.writeTypesFile(allSchemas, outputPath);
            console.log(`Generated types written to ${outputPath}`);
        }

        return generatedTypes;
    }

    /**
     * Generate TypeScript interface for specific schema
     */
    generateInterface(schemaName: string): string {
        const schema = this.getSchema(schemaName);
        if (!schema) {
            throw new Error(`Schema '${schemaName}' not found`);
        }

        return this.typeGenerator.generateInterface(schema);
    }

    /**
     * Generate Zod schema for specific schema
     */
    generateZodSchema(schemaName: string): string {
        const schema = this.getSchema(schemaName);
        if (!schema) {
            throw new Error(`Schema '${schemaName}' not found`);
        }

        return this.typeGenerator.generateZodSchema(schema);
    }

    // =============================================================================
    // COMPATIBILITY CHECKING
    // =============================================================================

    /**
     * Check schema compatibility
     */
    checkCompatibility(oldSchemaName: string, newSchemaName: string): CompatibilityResult {
        const oldSchema = this.getSchema(oldSchemaName);
        const newSchema = this.getSchema(newSchemaName);

        if (!oldSchema) {
            throw new Error(`Old schema '${oldSchemaName}' not found`);
        }

        if (!newSchema) {
            throw new Error(`New schema '${newSchemaName}' not found`);
        }

        return this.performCompatibilityCheck(oldSchema, newSchema);
    }

    /**
     * Get available migrations between schema versions
     */
    getAvailableMigrations(fromVersion: string, toVersion: string): Migration[] {
        const availableMigrations: Migration[] = [];
        
        // Production implementation would:
        // 1. Scan migrations directory for .js/.ts/.json migration files
        // 2. Parse migration metadata to find applicable version ranges
        // 3. Sort migrations by version order for proper sequencing
        // 4. Validate migration chain completeness
        
        // For now, provide basic migration structure when versions differ
        if (fromVersion !== toVersion) {
            const migration: Migration = {
                id: `migration_${fromVersion}_to_${toVersion}`,
                description: `Automated migration from version ${fromVersion} to ${toVersion}`,
                fromVersion,
                toVersion,
                transforms: this.generateAutomaticTransforms(fromVersion, toVersion)
            };
            availableMigrations.push(migration);
        }
        
        return availableMigrations;
    }

    /**
     * Generate automatic transforms based on schema differences
     */
    private generateAutomaticTransforms(fromVersion: string, toVersion: string): Transform[] {
        const transforms: Transform[] = [];
        
        // In production, this would analyze schema differences and generate
        // appropriate transformations for field renames, type changes, etc.
        
        // Example automatic transforms:
        if (fromVersion === '1.0.0' && toVersion === '1.1.0') {
            transforms.push({
                type: 'add_default',
                path: 'Contact.company',
                defaultValue: null
            });
            transforms.push({
                type: 'add_default',
                path: 'Contact.title',
                defaultValue: null
            });
        }
        
        return transforms;
    }

    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================

    /**
     * Perform compatibility check between two schemas
     */
    private performCompatibilityCheck(oldSchema: SchemaDefinition, newSchema: SchemaDefinition): CompatibilityResult {
        const breaking: CompatibilityIssue[] = [];
        const warnings: CompatibilityIssue[] = [];
        const migrations: Migration[] = [];

        // Check for removed entities
        for (const oldEntityName of Object.keys(oldSchema.entities)) {
            if (!(oldEntityName in newSchema.entities)) {
                breaking.push({
                    type: 'entity_removed',
                    path: `entities.${oldEntityName}`,
                    message: `Entity '${oldEntityName}' was removed`,
                    severity: 'error'
                });
            }
        }

        // Check for field changes in existing entities
        for (const [entityName, newEntityDef] of Object.entries(newSchema.entities)) {
            const oldEntityDef = oldSchema.entities[entityName];
            if (oldEntityDef) {
                this.checkEntityCompatibility(entityName, oldEntityDef, newEntityDef, breaking, warnings);
            }
        }

        return {
            compatible: breaking.length === 0,
            breaking,
            warnings,
            migrations
        };
    }

    /**
     * Check compatibility between entity definitions
     */
    private checkEntityCompatibility(
        entityName: string, 
        oldEntity: any, 
        newEntity: any, 
        breaking: CompatibilityIssue[], 
        warnings: CompatibilityIssue[]
    ): void {
        const basePath = `entities.${entityName}`;

        // Check for removed fields
        for (const [fieldName, oldFieldDef] of Object.entries(oldEntity.fields)) {
            if (!(fieldName in newEntity.fields)) {
                if ((oldFieldDef as any).required) {
                    breaking.push({
                        type: 'field_removed',
                        path: `${basePath}.fields.${fieldName}`,
                        message: `Required field '${fieldName}' was removed from entity '${entityName}'`,
                        severity: 'error'
                    });
                } else {
                    warnings.push({
                        type: 'field_removed',
                        path: `${basePath}.fields.${fieldName}`,
                        message: `Optional field '${fieldName}' was removed from entity '${entityName}'`,
                        severity: 'warning'
                    });
                }
            }
        }

        // Check for field type changes
        for (const [fieldName, newFieldDef] of Object.entries(newEntity.fields)) {
            const oldFieldDef = oldEntity.fields[fieldName];
            if (oldFieldDef) {
                if ((oldFieldDef as any).type !== (newFieldDef as any).type) {
                    breaking.push({
                        type: 'field_type_changed',
                        path: `${basePath}.fields.${fieldName}.type`,
                        message: `Field '${fieldName}' type changed from '${(oldFieldDef as any).type}' to '${(newFieldDef as any).type}'`,
                        severity: 'error',
                        oldValue: (oldFieldDef as any).type,
                        newValue: (newFieldDef as any).type
                    });
                }

                // Check if field became required
                if (!(oldFieldDef as any).required && (newFieldDef as any).required) {
                    breaking.push({
                        type: 'field_required_added',
                        path: `${basePath}.fields.${fieldName}.required`,
                        message: `Field '${fieldName}' became required`,
                        severity: 'error',
                        oldValue: false,
                        newValue: true
                    });
                }
            }
        }
    }
}

// =============================================================================
// SCHEMA REGISTRY INTERFACE
// =============================================================================

export interface SchemaRegistryInterface {
    // Load schemas from external files
    loadSchemas(schemaDir: string): Promise<void>;
    
    // Get schema definition
    getSchema(entityName: string): SchemaDefinition | undefined;
    
    // Get all available schemas
    getAllSchemas(): Map<string, SchemaDefinition>;
    
    // Validate entity against schema
    validate(schemaName: string, entityName: string, data: unknown): ValidationResult;
    
    // Generate TypeScript types
    generateTypes(): Promise<string>;
    
    // Check schema compatibility
    checkCompatibility(oldVersion: string, newVersion: string): CompatibilityResult;
} 