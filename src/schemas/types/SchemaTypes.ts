/**
 * SchemaTypes - Type definitions for external schema system
 * 
 * @package     @imajin/cli
 * @subpackage  schemas/types
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-13
 *
 * Integration Points:
 * - Schema validation and type generation
 * - Dynamic schema loading system
 * - Runtime type checking and validation
 */

// =============================================================================
// SCHEMA DEFINITION TYPES
// =============================================================================

/**
 * Base field definition in schema
 */
export interface FieldDefinition {
    type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'email' | 'enum' | 'object' | 'array';
    required: boolean;
    description: string;
    min?: number;
    max?: number;
    pattern?: string;
    values?: string[];
    items?: FieldDefinition;
    properties?: Record<string, FieldDefinition>;
}

/**
 * Entity definition in schema
 */
export interface EntityDefinition {
    description: string;
    type?: 'interface' | 'class';
    extends?: string;
    fields: Record<string, FieldDefinition>;
}

/**
 * Complete schema definition
 */
export interface SchemaDefinition {
    version: string;
    namespace: string;
    description: string;
    entities: Record<string, EntityDefinition>;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
    path: string;
    message: string;
    code: string;
    expected?: any;
    received?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
    success: boolean;
    errors: ValidationError[];
    data?: any;
}

/**
 * Transformation result
 */
export interface TransformResult {
    success: boolean;
    data?: any;
    errors: ValidationError[];
    transformations: string[];
}

// =============================================================================
// COMPATIBILITY TYPES
// =============================================================================

/**
 * Schema compatibility check result
 */
export interface CompatibilityResult {
    compatible: boolean;
    breaking: CompatibilityIssue[];
    warnings: CompatibilityIssue[];
    migrations: Migration[];
}

/**
 * Compatibility issue
 */
export interface CompatibilityIssue {
    type: 'field_removed' | 'field_type_changed' | 'field_required_added' | 'entity_removed';
    path: string;
    message: string;
    severity: 'error' | 'warning';
    oldValue?: any;
    newValue?: any;
}

/**
 * Migration definition
 */
export interface Migration {
    id: string;
    description: string;
    fromVersion: string;
    toVersion: string;
    transforms: Transform[];
}

/**
 * Data transformation rule
 */
export interface Transform {
    type: 'rename_field' | 'change_type' | 'add_default' | 'remove_field';
    path: string;
    oldValue?: any;
    newValue?: any;
    defaultValue?: any;
}

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * Schema registry options
 */
export interface SchemaRegistryOptions {
    schemaDirectory: string;
    cacheEnabled: boolean;
    watchForChanges: boolean;
    validateOnLoad: boolean;
}

/**
 * Schema loading metadata
 */
export interface SchemaMetadata {
    filePath: string;
    loadedAt: Date;
    version: string;
    checksum: string;
} 