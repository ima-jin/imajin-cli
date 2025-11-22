/**
 * SchemaValidator Tests
 *
 * Comprehensive test suite for runtime schema validation engine covering
 * type validation, constraints, inheritance, transformations, and error handling.
 *
 * @package     @imajin/cli
 * @subpackage  schemas/__tests__
 */

import { SchemaValidator } from '../SchemaValidator.js';
import type {
    SchemaDefinition,
    EntityDefinition,
    FieldDefinition
} from '../types/SchemaTypes.js';

describe('SchemaValidator', () => {
    let validator: SchemaValidator;

    // Test schema definitions
    const createUserSchema = (): SchemaDefinition => ({
        version: '1.0.0',
        namespace: 'test',
        description: 'Test schema for users',
        entities: {
            'User': {
                description: 'User entity',
                fields: {
                    id: {
                        type: 'string',
                        required: true,
                        description: 'User ID'
                    },
                    email: {
                        type: 'email',
                        required: true,
                        description: 'User email'
                    },
                    name: {
                        type: 'string',
                        required: false,
                        description: 'User name'
                    },
                    age: {
                        type: 'number',
                        required: false,
                        description: 'User age',
                        min: 0,
                        max: 150
                    },
                    active: {
                        type: 'boolean',
                        required: false,
                        description: 'User active status'
                    }
                }
            }
        }
    });

    const createProductSchema = (): SchemaDefinition => ({
        version: '1.0.0',
        namespace: 'test',
        description: 'Test schema for products',
        entities: {
            'Product': {
                description: 'Product entity',
                fields: {
                    sku: {
                        type: 'string',
                        required: true,
                        description: 'Product SKU',
                        pattern: '^[A-Z]{3}-\\d{4}$'
                    },
                    price: {
                        type: 'number',
                        required: true,
                        description: 'Product price',
                        min: 0
                    },
                    status: {
                        type: 'enum',
                        required: true,
                        description: 'Product status',
                        values: ['active', 'inactive', 'discontinued']
                    },
                    metadata: {
                        type: 'object',
                        required: false,
                        description: 'Product metadata'
                    },
                    tags: {
                        type: 'array',
                        required: false,
                        description: 'Product tags'
                    },
                    createdAt: {
                        type: 'date',
                        required: false,
                        description: 'Creation date'
                    }
                }
            }
        }
    });

    const createInheritanceSchema = (): SchemaDefinition => ({
        version: '1.0.0',
        namespace: 'test',
        description: 'Schema with inheritance',
        entities: {
            'BaseEntity': {
                description: 'Base entity',
                fields: {
                    id: {
                        type: 'string',
                        required: true,
                        description: 'Entity ID'
                    },
                    createdAt: {
                        type: 'date',
                        required: true,
                        description: 'Creation date'
                    }
                }
            },
            'ExtendedEntity': {
                description: 'Extended entity',
                extends: 'BaseEntity',
                fields: {
                    name: {
                        type: 'string',
                        required: true,
                        description: 'Entity name'
                    },
                    value: {
                        type: 'number',
                        required: false,
                        description: 'Entity value'
                    }
                }
            }
        }
    });

    beforeEach(() => {
        validator = new SchemaValidator();
    });

    // =====================================================================
    // Schema Registration
    // =====================================================================
    describe('Schema Registration', () => {
        it('should register a single schema', () => {
            const schema = createUserSchema();
            validator.registerSchema('user-schema', schema);

            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com'
            });

            expect(result.success).toBe(true);
        });

        it('should register multiple schemas', () => {
            validator.registerSchema('user-schema', createUserSchema());
            validator.registerSchema('product-schema', createProductSchema());

            const userResult = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com'
            });

            const productResult = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active'
            });

            expect(userResult.success).toBe(true);
            expect(productResult.success).toBe(true);
        });

        it('should allow overwriting registered schema', () => {
            const schema1 = createUserSchema();
            const schema2 = createProductSchema();

            validator.registerSchema('test-schema', schema1);
            validator.registerSchema('test-schema', schema2);

            // Should now validate against product schema
            const result = validator.validate('test-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active'
            });

            expect(result.success).toBe(true);
        });
    });

    // =====================================================================
    // Schema Not Found Errors
    // =====================================================================
    describe('Schema Not Found Errors', () => {
        it('should return error when validating with missing schema', () => {
            const result = validator.validate('nonexistent', 'User', {});

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('SCHEMA_NOT_FOUND');
            expect(result.errors[0]!.message).toContain('nonexistent');
        });

        it('should return error when calling validateRequired with missing schema', () => {
            const result = validator.validateRequired('nonexistent', 'User', {});

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('SCHEMA_NOT_FOUND');
        });

        it('should return error when transforming with missing schema', () => {
            const result = validator.transform('nonexistent', 'User', {});

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('SCHEMA_NOT_FOUND');
        });
    });

    // =====================================================================
    // Entity Not Found Errors
    // =====================================================================
    describe('Entity Not Found Errors', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
        });

        it('should return error when validating with missing entity', () => {
            const result = validator.validate('user-schema', 'NonexistentEntity', {});

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('ENTITY_NOT_FOUND');
            expect(result.errors[0]!.message).toContain('NonexistentEntity');
        });

        it('should return error when calling validateRequired with missing entity', () => {
            const result = validator.validateRequired('user-schema', 'NonexistentEntity', {});

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('ENTITY_NOT_FOUND');
        });

        it('should return error when transforming with missing entity', () => {
            const result = validator.transform('user-schema', 'NonexistentEntity', {});

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('ENTITY_NOT_FOUND');
        });
    });

    // =====================================================================
    // Type Validation
    // =====================================================================
    describe('Type Validation', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
            validator.registerSchema('product-schema', createProductSchema());
        });

        it('should validate string type', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                name: 'John Doe'
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid string type', () => {
            const result = validator.validate('user-schema', 'User', {
                id: 123, // Should be string
                email: 'test@example.com'
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_TYPE' && e.path === 'id')).toBe(true);
        });

        it('should validate number type', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                age: 25
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid number type including NaN', () => {
            const result1 = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                age: 'twenty-five' // Should be number
            });

            expect(result1.success).toBe(false);
            expect(result1.errors.some(e => e.code === 'INVALID_TYPE' && e.path === 'age')).toBe(true);

            // Test NaN
            const result2 = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                age: NaN
            });

            expect(result2.success).toBe(false);
        });

        it('should validate boolean type', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                active: true
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid boolean type', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                active: 'yes' // Should be boolean
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_TYPE' && e.path === 'active')).toBe(true);
        });

        it('should validate date/datetime types', () => {
            const result1 = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                createdAt: new Date()
            });

            expect(result1.success).toBe(true);

            // Also accept valid date strings
            const result2 = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                createdAt: '2025-01-01T00:00:00Z'
            });

            expect(result2.success).toBe(true);
        });

        it('should reject invalid date strings', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                createdAt: 'not-a-date'
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_DATE' && e.path === 'createdAt')).toBe(true);
        });

        it('should validate email type', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'valid@example.com'
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid email format', () => {
            const result1 = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'invalid-email'
            });

            expect(result1.success).toBe(false);
            expect(result1.errors.some(e => e.code === 'INVALID_EMAIL' && e.path === 'email')).toBe(true);

            const result2 = validator.validate('user-schema', 'User', {
                id: '123',
                email: 123 // Not a string
            });

            expect(result2.success).toBe(false);
        });

        it('should validate object type', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                metadata: { key: 'value', nested: { data: 'test' } }
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid object type', () => {
            const result1 = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                metadata: 'not an object'
            });

            expect(result1.success).toBe(false);
            expect(result1.errors.some(e => e.code === 'INVALID_TYPE' && e.path === 'metadata')).toBe(true);

            // Reject arrays
            const result2 = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                metadata: []
            });

            expect(result2.success).toBe(false);
        });

        it('should validate array type', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                tags: ['tag1', 'tag2', 'tag3']
            });

            expect(result.success).toBe(true);
        });

        it('should reject invalid array type', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                tags: 'not an array'
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.code === 'INVALID_TYPE' && e.path === 'tags')).toBe(true);
        });

        it('should reject non-object data', () => {
            const result = validator.validate('user-schema', 'User', 'not an object');

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]!.code).toBe('INVALID_TYPE');
            expect(result.errors[0]!.message).toContain('must be an object');
        });
    });

    // =====================================================================
    // Required Field Validation
    // =====================================================================
    describe('Required Field Validation', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
        });

        it('should detect missing required field', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123'
                // email is required but missing
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e =>
                e.code === 'REQUIRED_FIELD_MISSING' && e.path === 'email'
            )).toBe(true);
        });

        it('should pass when all required fields present', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com'
            });

            expect(result.success).toBe(true);
        });

        it('should detect required field with undefined or null value', () => {
            const result1 = validator.validate('user-schema', 'User', {
                id: '123',
                email: undefined
            });

            expect(result1.success).toBe(false);

            const result2 = validator.validate('user-schema', 'User', {
                id: '123',
                email: null
            });

            expect(result2.success).toBe(false);
        });
    });

    // =====================================================================
    // Constraint Validation
    // =====================================================================
    describe('Constraint Validation', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
            validator.registerSchema('product-schema', createProductSchema());
        });

        it('should enforce min constraint for numbers', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                age: -5 // Below min of 0
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e =>
                e.code === 'VALUE_TOO_SMALL' && e.path === 'age'
            )).toBe(true);
        });

        it('should enforce max constraint for numbers', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                age: 200 // Above max of 150
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e =>
                e.code === 'VALUE_TOO_LARGE' && e.path === 'age'
            )).toBe(true);
        });

        it('should enforce pattern constraint for strings', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'invalid-sku', // Doesn't match ^[A-Z]{3}-\\d{4}$
                price: 99.99,
                status: 'active'
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e =>
                e.code === 'PATTERN_MISMATCH' && e.path === 'sku'
            )).toBe(true);
        });

        it('should enforce enum values constraint', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'pending' // Not in allowed values: active, inactive, discontinued
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e =>
                e.code === 'INVALID_ENUM_VALUE' && e.path === 'status'
            )).toBe(true);
        });

        it('should pass when all constraints satisfied', () => {
            const result = validator.validate('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active'
            });

            expect(result.success).toBe(true);
        });
    });

    // =====================================================================
    // Inheritance
    // =====================================================================
    describe('Inheritance', () => {
        beforeEach(() => {
            validator.registerSchema('inheritance-schema', createInheritanceSchema());
        });

        it('should validate entity with extends', () => {
            const result = validator.validate('inheritance-schema', 'ExtendedEntity', {
                id: '123',
                createdAt: new Date(),
                name: 'Test'
            });

            expect(result.success).toBe(true);
        });

        it('should validate required fields in parent entity', () => {
            const result = validator.validate('inheritance-schema', 'ExtendedEntity', {
                // Missing 'id' from BaseEntity
                createdAt: new Date(),
                name: 'Test'
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e =>
                e.code === 'REQUIRED_FIELD_MISSING' && e.path === 'id'
            )).toBe(true);
        });

        it('should validate types in both parent and child', () => {
            const result = validator.validate('inheritance-schema', 'ExtendedEntity', {
                id: 123, // Should be string (parent field)
                createdAt: new Date(),
                name: 456 // Should be string (child field)
            });

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.path === 'id' && e.code === 'INVALID_TYPE')).toBe(true);
            expect(result.errors.some(e => e.path === 'name' && e.code === 'INVALID_TYPE')).toBe(true);
        });
    });

    // =====================================================================
    // Transformation
    // =====================================================================
    describe('Transformation', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
            validator.registerSchema('product-schema', createProductSchema());
        });

        it('should transform string to Date', () => {
            const result = validator.transform('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                createdAt: '2025-01-01T00:00:00Z'
            });

            expect(result.success).toBe(true);
            expect(result.data?.createdAt).toBeInstanceOf(Date);
            expect(result.transformations.length).toBeGreaterThan(0);
        });

        it('should not transform invalid types (validates first)', () => {
            // transform() validates first, so invalid types fail validation
            const result = validator.transform('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: '99.99', // String, but price expects number
                status: 'active'
            });

            // Should fail validation before transformation
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should transform valid data with proper types', () => {
            // Transform works when data passes validation
            const result = validator.transform('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                name: 'John',
                age: 25,
                active: true
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.id).toBe('123');
            expect(result.data?.email).toBe('test@example.com');
        });

        it('should return original data when no transformations needed', () => {
            const result = validator.transform('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                name: 'John'
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.id).toBe('123');
            expect(result.data?.name).toBe('John');
        });

        it('should fail transformation with validation errors', () => {
            const result = validator.transform('user-schema', 'User', {
                id: 123, // Wrong type
                email: 'invalid-email' // Invalid format
            });

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should have transformations array in result', () => {
            const result = validator.transform('product-schema', 'Product', {
                sku: 'ABC-1234',
                price: 99.99,
                status: 'active',
                createdAt: '2025-01-01T00:00:00Z'
            });

            expect(result.success).toBe(true);
            expect(result.transformations).toBeDefined();
            expect(Array.isArray(result.transformations)).toBe(true);
            // With valid date string, there should be a transformation
            expect(result.transformations.length).toBeGreaterThan(0);
        });
    });

    // =====================================================================
    // validateRequired Method
    // =====================================================================
    describe('validateRequired Method', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
        });

        it('should only check required fields', () => {
            const result = validator.validateRequired('user-schema', 'User', {
                id: '123',
                email: 'test@example.com'
            });

            expect(result.success).toBe(true);
        });

        it('should not validate field types', () => {
            // This has wrong types but all required fields present
            const result = validator.validateRequired('user-schema', 'User', {
                id: 123, // Wrong type
                email: 'test@example.com'
            });

            // validateRequired only checks presence, not types
            expect(result.success).toBe(true);
        });
    });

    // =====================================================================
    // validateFields Method
    // =====================================================================
    describe('validateFields Method', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
        });

        it('should only check field types and constraints', () => {
            const result = validator.validateFields('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                age: 25
            });

            expect(result.success).toBe(true);
        });

        it('should allow missing required fields', () => {
            // Missing required 'email' but types are correct
            const result = validator.validateFields('user-schema', 'User', {
                id: '123',
                name: 'John'
            });

            // validateFields doesn't check required, only types
            expect(result.success).toBe(true);
        });
    });

    // =====================================================================
    // Edge Cases
    // =====================================================================
    describe('Edge Cases', () => {
        beforeEach(() => {
            validator.registerSchema('user-schema', createUserSchema());
        });

        it('should handle empty object validation', () => {
            const result = validator.validate('user-schema', 'User', {});

            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            // Should fail because required fields are missing
        });

        it('should handle null field values correctly', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                name: null // Optional field with null
            });

            // Null on optional field should be okay
            expect(result.success).toBe(true);
        });

        it('should handle undefined field values correctly', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                name: undefined // Optional field with undefined
            });

            // Undefined on optional field should be okay
            expect(result.success).toBe(true);
        });

        it('should allow extra fields not in schema', () => {
            const result = validator.validate('user-schema', 'User', {
                id: '123',
                email: 'test@example.com',
                extraField: 'not in schema'
            });

            // Extra fields are allowed
            expect(result.success).toBe(true);
        });
    });
});
