/**
 * SchemaValidator - Runtime validation engine
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
 * - Runtime data validation against external schemas
 * - Data transformation and normalization
 * - Error reporting and debugging
 */

import type { 
    SchemaDefinition, 
    EntityDefinition,
    FieldDefinition,
    ValidationResult, 
    ValidationError,
    TransformResult 
} from './types/SchemaTypes.js';

// =============================================================================
// SCHEMA VALIDATOR CLASS
// =============================================================================

export class SchemaValidator {
    private readonly schemas = new Map<string, SchemaDefinition>();

    /**
     * Register schema for validation
     */
    registerSchema(name: string, schema: SchemaDefinition): void {
        this.schemas.set(name, schema);
    }

    /**
     * Validate data against schema
     */
    validate(schemaName: string, entityName: string, data: unknown): ValidationResult {
        const schema = this.schemas.get(schemaName);
        if (!schema) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Schema '${schemaName}' not found`,
                    code: 'SCHEMA_NOT_FOUND'
                }]
            };
        }

        const entityDef = schema.entities[entityName];
        if (!entityDef) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Entity '${entityName}' not found in schema '${schemaName}'`,
                    code: 'ENTITY_NOT_FOUND'
                }]
            };
        }

        return this.validateEntity(entityDef, data, schema);
    }

    /**
     * Transform data according to schema rules
     */
    transform(schemaName: string, entityName: string, data: unknown): TransformResult {
        const validationResult = this.validate(schemaName, entityName, data);
        
        if (!validationResult.success) {
            return {
                success: false,
                errors: validationResult.errors,
                transformations: []
            };
        }

        const schema = this.schemas.get(schemaName)!;
        const entityDef = schema.entities[entityName];
        if (!entityDef) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Entity '${entityName}' not found`,
                    code: 'ENTITY_NOT_FOUND'
                }],
                transformations: []
            };
        }
        const transformations: string[] = [];
        
        try {
            const transformedData = this.transformEntity(entityDef, data as Record<string, any>, schema, transformations);
            
            return {
                success: true,
                data: transformedData,
                errors: [],
                transformations
            };
        } catch (error) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: error instanceof Error ? error.message : 'Transformation failed',
                    code: 'TRANSFORM_ERROR'
                }],
                transformations
            };
        }
    }

    /**
     * Check required fields
     */
    validateRequired(schemaName: string, entityName: string, data: unknown): ValidationResult {
        const schema = this.schemas.get(schemaName);
        if (!schema) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Schema '${schemaName}' not found`,
                    code: 'SCHEMA_NOT_FOUND'
                }]
            };
        }

        const entityDef = schema.entities[entityName];
        if (!entityDef) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Entity '${entityName}' not found`,
                    code: 'ENTITY_NOT_FOUND'
                }]
            };
        }

        return this.validateRequiredFields(entityDef, data, schema);
    }

    /**
     * Validate field types and constraints
     */
    validateFields(schemaName: string, entityName: string, data: unknown): ValidationResult {
        const schema = this.schemas.get(schemaName);
        if (!schema) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Schema '${schemaName}' not found`,
                    code: 'SCHEMA_NOT_FOUND'
                }]
            };
        }

        const entityDef = schema.entities[entityName];
        if (!entityDef) {
            return {
                success: false,
                errors: [{
                    path: '',
                    message: `Entity '${entityName}' not found`,
                    code: 'ENTITY_NOT_FOUND'
                }]
            };
        }

        return this.validateFieldTypes(entityDef, data);
    }

    // =============================================================================
    // PRIVATE VALIDATION METHODS
    // =============================================================================

    /**
     * Validate entity against definition
     */
    private validateEntity(entityDef: EntityDefinition, data: unknown, schema: SchemaDefinition): ValidationResult {
        const errors: ValidationError[] = [];

        if (!data || typeof data !== 'object') {
            errors.push({
                path: '',
                message: 'Data must be an object',
                code: 'INVALID_TYPE',
                expected: 'object',
                received: typeof data
            });
            return { success: false, errors };
        }

        const dataObj = data as Record<string, any>;

        // Handle inheritance
        if (entityDef.extends) {
            const parentEntity = schema.entities[entityDef.extends];
            if (parentEntity) {
                const parentResult = this.validateEntity(parentEntity, data, schema);
                errors.push(...parentResult.errors);
            }
        }

        // Validate required fields
        const requiredResult = this.validateRequiredFields(entityDef, data, schema);
        errors.push(...requiredResult.errors);

        // Validate field types
        const typeResult = this.validateFieldTypes(entityDef, data);
        errors.push(...typeResult.errors);

        return {
            success: errors.length === 0,
            errors,
            data: dataObj
        };
    }

    /**
     * Validate required fields
     */
    private validateRequiredFields(entityDef: EntityDefinition, data: unknown, schema: SchemaDefinition): ValidationResult {
        const errors: ValidationError[] = [];
        
        if (!data || typeof data !== 'object') {
            return { success: true, errors }; // Already handled elsewhere
        }

        const dataObj = data as Record<string, any>;

        // Check parent required fields if extends
        if (entityDef.extends) {
            const parentEntity = schema.entities[entityDef.extends];
            if (parentEntity) {
                const parentResult = this.validateRequiredFields(parentEntity, data, schema);
                errors.push(...parentResult.errors);
            }
        }

        // Check required fields in this entity
        for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
            if (fieldDef.required && (!(fieldName in dataObj) || dataObj[fieldName] === undefined || dataObj[fieldName] === null)) {
                errors.push({
                    path: fieldName,
                    message: `Required field '${fieldName}' is missing`,
                    code: 'REQUIRED_FIELD_MISSING',
                    expected: 'present',
                    received: 'missing'
                });
            }
        }

        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Validate field types and constraints
     */
    private validateFieldTypes(entityDef: EntityDefinition, data: unknown): ValidationResult {
        const errors: ValidationError[] = [];
        
        if (!data || typeof data !== 'object') {
            return { success: true, errors }; // Already handled elsewhere
        }

        const dataObj = data as Record<string, any>;

        for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
            if (fieldName in dataObj && dataObj[fieldName] !== undefined && dataObj[fieldName] !== null) {
                const fieldErrors = this.validateField(fieldName, fieldDef, dataObj[fieldName]);
                errors.push(...fieldErrors);
            }
        }

        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Validate individual field
     */
    private validateField(fieldName: string, fieldDef: FieldDefinition, value: any): ValidationError[] {
        const errors: ValidationError[] = [];

        // Type validation
        const typeError = this.validateFieldType(fieldName, fieldDef.type, value);
        if (typeError) {
            errors.push(typeError);
            return errors; // Don't continue if type is wrong
        }

        // Constraint validation
        if (fieldDef.min !== undefined && typeof value === 'number' && value < fieldDef.min) {
            errors.push({
                path: fieldName,
                message: `Value ${value} is below minimum ${fieldDef.min}`,
                code: 'VALUE_TOO_SMALL',
                expected: `>= ${fieldDef.min}`,
                received: value
            });
        }

        if (fieldDef.max !== undefined && typeof value === 'number' && value > fieldDef.max) {
            errors.push({
                path: fieldName,
                message: `Value ${value} is above maximum ${fieldDef.max}`,
                code: 'VALUE_TOO_LARGE',
                expected: `<= ${fieldDef.max}`,
                received: value
            });
        }

        if (fieldDef.pattern && typeof value === 'string') {
            const regex = new RegExp(fieldDef.pattern);
            if (!regex.test(value)) {
                errors.push({
                    path: fieldName,
                    message: `Value '${value}' does not match pattern '${fieldDef.pattern}'`,
                    code: 'PATTERN_MISMATCH',
                    expected: fieldDef.pattern,
                    received: value
                });
            }
        }

        if (fieldDef.values && !fieldDef.values.includes(value)) {
            errors.push({
                path: fieldName,
                message: `Value '${value}' is not in allowed values: ${fieldDef.values.join(', ')}`,
                code: 'INVALID_ENUM_VALUE',
                expected: fieldDef.values,
                received: value
            });
        }

        return errors;
    }

    /**
     * Validate field type
     */
    private validateFieldType(fieldName: string, expectedType: string, value: any): ValidationError | null {
        switch (expectedType) {
            case 'string':
                if (typeof value !== 'string') {
                    return {
                        path: fieldName,
                        message: `Expected string, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'string',
                        received: typeof value
                    };
                }
                break;

            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    return {
                        path: fieldName,
                        message: `Expected number, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'number',
                        received: typeof value
                    };
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    return {
                        path: fieldName,
                        message: `Expected boolean, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'boolean',
                        received: typeof value
                    };
                }
                break;

            case 'date':
            case 'datetime':
                if (!(value instanceof Date) && typeof value !== 'string') {
                    return {
                        path: fieldName,
                        message: `Expected Date or date string, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'Date',
                        received: typeof value
                    };
                }
                if (typeof value === 'string') {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        return {
                            path: fieldName,
                            message: `Invalid date string: ${value}`,
                            code: 'INVALID_DATE',
                            expected: 'valid date string',
                            received: value
                        };
                    }
                }
                break;

            case 'email':
                if (typeof value !== 'string') {
                    return {
                        path: fieldName,
                        message: `Expected email string, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'string',
                        received: typeof value
                    };
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return {
                        path: fieldName,
                        message: `Invalid email format: ${value}`,
                        code: 'INVALID_EMAIL',
                        expected: 'valid email',
                        received: value
                    };
                }
                break;

            case 'object':
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    return {
                        path: fieldName,
                        message: `Expected object, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'object',
                        received: Array.isArray(value) ? 'array' : typeof value
                    };
                }
                break;

            case 'array':
                if (!Array.isArray(value)) {
                    return {
                        path: fieldName,
                        message: `Expected array, got ${typeof value}`,
                        code: 'INVALID_TYPE',
                        expected: 'array',
                        received: typeof value
                    };
                }
                break;
        }

        return null;
    }

    /**
     * Transform entity data
     */
    private transformEntity(entityDef: EntityDefinition, data: Record<string, any>, schema: SchemaDefinition, transformations: string[]): Record<string, any> {
        const result: Record<string, any> = { ...data };

        // Transform based on field definitions
        for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
            if (fieldName in result) {
                const transformedValue = this.transformField(fieldName, fieldDef, result[fieldName], transformations);
                if (transformedValue !== result[fieldName]) {
                    result[fieldName] = transformedValue;
                    transformations.push(`Transformed field '${fieldName}'`);
                }
            }
        }

        return result;
    }

    /**
     * Transform field value
     */
    private transformField(fieldName: string, fieldDef: FieldDefinition, value: any, transformations: string[]): any {
        if (value === undefined || value === null) {
            return value;
        }

        // Convert string dates to Date objects
        if ((fieldDef.type === 'date' || fieldDef.type === 'datetime') && typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                transformations.push(`Converted string '${value}' to Date for field '${fieldName}'`);
                return date;
            }
        }

        // Convert string numbers to numbers
        if (fieldDef.type === 'number' && typeof value === 'string' && !isNaN(Number(value))) {
            const num = Number(value);
            transformations.push(`Converted string '${value}' to number for field '${fieldName}'`);
            return num;
        }

        // Convert string booleans to booleans
        if (fieldDef.type === 'boolean' && typeof value === 'string') {
            if (value.toLowerCase() === 'true') {
                transformations.push(`Converted string 'true' to boolean for field '${fieldName}'`);
                return true;
            }
            if (value.toLowerCase() === 'false') {
                transformations.push(`Converted string 'false' to boolean for field '${fieldName}'`);
                return false;
            }
        }

        return value;
    }
} 