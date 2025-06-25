/**
 * SchemaLoader - YAML/JSON schema parser
 * 
 * @package     @imajin/cli
 * @subpackage  schemas
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-06-18
 *
 * Integration Points:
 * - YAML/JSON file parsing for schema definitions
 * - Schema validation and normalization
 * - File system integration for schema discovery
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { glob } from 'glob';
import type { 
    SchemaDefinition, 
    SchemaMetadata, 
    ValidationResult,
    ValidationError 
} from './types/SchemaTypes.js';

// =============================================================================
// SCHEMA LOADER CLASS
// =============================================================================

export class SchemaLoader {
    private readonly supportedExtensions = ['.yaml', '.yml', '.json'];

    /**
     * Load schema from file path
     */
    async loadSchemaFile(filePath: string): Promise<{ schema: SchemaDefinition; metadata: SchemaMetadata }> {
        try {
            const absolutePath = path.resolve(filePath);
            const fileContent = await fs.readFile(absolutePath, 'utf8');
            const checksum = this.calculateChecksum(fileContent);
            
            const schema = this.parseSchemaContent(fileContent, absolutePath);
            const validationResult = this.validateSchema(schema);
            
            if (!validationResult.success) {
                throw new Error(`Invalid schema in ${filePath}: ${validationResult.errors.map(e => e.message).join(', ')}`);
            }

            const metadata: SchemaMetadata = {
                filePath: absolutePath,
                loadedAt: new Date(),
                version: schema.version,
                checksum
            };

            return { schema, metadata };
        } catch (error) {
            throw new Error(`Failed to load schema from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Load all schemas from directory
     */
    async loadSchemasFromDirectory(directory: string): Promise<Map<string, { schema: SchemaDefinition; metadata: SchemaMetadata }>> {
        const schemas = new Map<string, { schema: SchemaDefinition; metadata: SchemaMetadata }>();
        
        try {
            const pattern = path.join(directory, `**/*.{${this.supportedExtensions.map(ext => ext.slice(1)).join(',')}}`);
            const files = await glob(pattern);

            for (const file of files) {
                try {
                    const { schema, metadata } = await this.loadSchemaFile(file);
                    const schemaName = this.extractSchemaName(file, directory);
                    schemas.set(schemaName, { schema, metadata });
                } catch (error) {
                    console.warn(`Failed to load schema from ${file}:`, error instanceof Error ? error.message : 'Unknown error');
                    // Continue loading other schemas
                }
            }

            return schemas;
        } catch (error) {
            throw new Error(`Failed to load schemas from directory ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse schema content from string
     */
    private parseSchemaContent(content: string, filePath: string): SchemaDefinition {
        const extension = path.extname(filePath).toLowerCase();
        
        try {
            let parsed: any;
            
            if (extension === '.json') {
                parsed = JSON.parse(content);
            } else if (extension === '.yaml' || extension === '.yml') {
                parsed = yaml.load(content);
            } else {
                throw new Error(`Unsupported file extension: ${extension}`);
            }

            return this.normalizeSchema(parsed);
        } catch (error) {
            throw new Error(`Failed to parse ${extension} content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Normalize parsed schema to standard format
     */
    private normalizeSchema(parsed: any): SchemaDefinition {
        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Schema must be an object');
        }

        const schema: SchemaDefinition = {
            version: parsed.version || '1.0.0',
            namespace: parsed.namespace || 'default',
            description: parsed.description || '',
            entities: {}
        };

        if (parsed.entities && typeof parsed.entities === 'object') {
            for (const [entityName, entityDef] of Object.entries(parsed.entities)) {
                if (entityDef && typeof entityDef === 'object') {
                    schema.entities[entityName] = this.normalizeEntity(entityDef as any);
                }
            }
        }

        return schema;
    }

    /**
     * Normalize entity definition
     */
    private normalizeEntity(entityDef: any): any {
        return {
            description: entityDef.description || '',
            type: entityDef.type || 'interface',
            extends: entityDef.extends || undefined,
            fields: this.normalizeFields(entityDef.fields || {})
        };
    }

    /**
     * Normalize field definitions
     */
    private normalizeFields(fields: any): Record<string, any> {
        const normalized: Record<string, any> = {};

        for (const [fieldName, fieldDef] of Object.entries(fields)) {
            if (fieldDef && typeof fieldDef === 'object') {
                normalized[fieldName] = this.normalizeField(fieldDef as any);
            }
        }

        return normalized;
    }

    /**
     * Normalize individual field definition
     */
    private normalizeField(fieldDef: any): any {
        return {
            type: fieldDef.type || 'string',
            required: fieldDef.required ?? false,
            description: fieldDef.description || '',
            min: fieldDef.min,
            max: fieldDef.max,
            pattern: fieldDef.pattern,
            values: fieldDef.values,
            items: fieldDef.items ? this.normalizeField(fieldDef.items) : undefined,
            properties: fieldDef.properties ? this.normalizeFields(fieldDef.properties) : undefined
        };
    }

    /**
     * Validate schema structure
     */
    private validateSchema(schema: SchemaDefinition): ValidationResult {
        const errors: ValidationError[] = [];

        // Validate version
        if (!schema.version || typeof schema.version !== 'string') {
            errors.push({
                path: 'version',
                message: 'Schema version is required and must be a string',
                code: 'INVALID_VERSION'
            });
        }

        // Validate namespace
        if (!schema.namespace || typeof schema.namespace !== 'string') {
            errors.push({
                path: 'namespace',
                message: 'Schema namespace is required and must be a string',
                code: 'INVALID_NAMESPACE'
            });
        }

        // Validate entities
        if (!schema.entities || typeof schema.entities !== 'object') {
            errors.push({
                path: 'entities',
                message: 'Schema must contain entities object',
                code: 'MISSING_ENTITIES'
            });
        } else {
            for (const [entityName, entityDef] of Object.entries(schema.entities)) {
                this.validateEntity(entityName, entityDef, errors);
            }
        }

        return {
            success: errors.length === 0,
            errors,
            data: schema
        };
    }

    /**
     * Validate individual entity
     */
    private validateEntity(entityName: string, entityDef: any, errors: ValidationError[]): void {
        const basePath = `entities.${entityName}`;

        if (!entityDef.fields || typeof entityDef.fields !== 'object') {
            errors.push({
                path: `${basePath}.fields`,
                message: `Entity ${entityName} must have fields object`,
                code: 'MISSING_FIELDS'
            });
            return;
        }

        for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
            this.validateField(`${basePath}.fields.${fieldName}`, fieldDef as any, errors);
        }
    }

    /**
     * Validate individual field
     */
    private validateField(fieldPath: string, fieldDef: any, errors: ValidationError[]): void {
        const validTypes = ['string', 'number', 'boolean', 'date', 'datetime', 'email', 'enum', 'object', 'array'];
        
        if (!fieldDef.type || !validTypes.includes(fieldDef.type)) {
            errors.push({
                path: `${fieldPath}.type`,
                message: `Field type must be one of: ${validTypes.join(', ')}`,
                code: 'INVALID_FIELD_TYPE',
                expected: validTypes,
                received: fieldDef.type
            });
        }

        if (fieldDef.type === 'enum' && (!fieldDef.values || !Array.isArray(fieldDef.values))) {
            errors.push({
                path: `${fieldPath}.values`,
                message: 'Enum fields must have values array',
                code: 'MISSING_ENUM_VALUES'
            });
        }
    }

    /**
     * Extract schema name from file path
     */
    private extractSchemaName(filePath: string, baseDirectory: string): string {
        const relativePath = path.relative(baseDirectory, filePath);
        const name = path.basename(relativePath, path.extname(relativePath));
        return name;
    }

    /**
     * Calculate content checksum for caching
     */
    private calculateChecksum(content: string): string {
        // Simple hash for change detection
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Check if file is supported schema format
     */
    isSupportedFormat(filePath: string): boolean {
        const extension = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(extension);
    }
} 