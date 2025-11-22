/**
 * BaseTransformer Tests
 *
 * Comprehensive test suite for data transformation with field mapping,
 * validation, batch processing, and transformation rules.
 *
 * @package     @imajin/cli
 * @subpackage  etl/transformers/__tests__
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { BaseTransformer, BaseTransformerConfig, TransformRule } from '../BaseTransformer.js';
import type { ETLContext } from '../../core/interfaces.js';

/**
 * Test input/output schemas
 */
const InputSchema = z.object({
    user_id: z.number(),
    user_name: z.string(),
    user_email: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string()
});

type InputData = z.infer<typeof InputSchema>;
type OutputData = z.infer<typeof OutputSchema>;

/**
 * Concrete test transformer implementation
 */
class TestTransformer extends BaseTransformer<InputData, OutputData> {
    public readonly name = 'test-transformer';
    public readonly description = 'Test transformer for unit tests';
    public readonly inputSchema = InputSchema;
    public readonly outputSchema = OutputSchema;

    protected async performTransformation(
        item: InputData,
        _context: ETLContext,
        _config: BaseTransformerConfig
    ): Promise<OutputData> {
        return {
            id: item.user_id,
            name: item.user_name,
            email: item.user_email
        };
    }
}

/**
 * Create test ETL context
 */
function createTestContext(): ETLContext {
    return {
        id: 'test-context',
        pipelineId: 'test-pipeline',
        events: new EventEmitter(),
        metadata: {},
        startTime: new Date()
    };
}

describe('BaseTransformer', () => {
    let transformer: TestTransformer;
    let context: ETLContext;

    beforeEach(() => {
        context = createTestContext();
    });

    // =====================================================================
    // Constructor & Initialization
    // =====================================================================
    describe('Constructor & Initialization', () => {
        it('should initialize with default configuration', () => {
            transformer = new TestTransformer();

            expect(transformer.name).toBe('test-transformer');
            expect(transformer.description).toBe('Test transformer for unit tests');
        });

        it('should initialize with custom configuration', () => {
            transformer = new TestTransformer({
                batchSize: 50,
                validateInput: true,
                validateOutput: true
            });

            expect(transformer).toBeDefined();
        });
    });

    // =====================================================================
    // Data Transformation
    // =====================================================================
    describe('Data Transformation', () => {
        beforeEach(() => {
            transformer = new TestTransformer();
        });

        it('should transform single item', async () => {
            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toEqual({
                id: 1,
                name: 'Alice',
                email: 'alice@example.com'
            });
        });

        it('should transform array of items', async () => {
            const input: InputData[] = [
                { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' },
                { user_id: 2, user_name: 'Bob', user_email: 'bob@example.com' }
            ];

            const result = await transformer.transform(input, context);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.processed).toBe(2);
        });

        it('should include metadata in result', async () => {
            const input: InputData[] = [
                { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' }
            ];

            const result = await transformer.transform(input, context);

            expect(result.metadata).toMatchObject({
                transformer: 'test-transformer',
                inputCount: 1,
                outputCount: 1
            });
        });

        it('should track duration', async () => {
            const result = await transformer.transform([], context);

            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should emit step:start event', async () => {
            const startSpy = jest.fn();
            context.events.on('step:start', startSpy);

            await transformer.transform([], context);

            expect(startSpy).toHaveBeenCalledWith('test-transformer', context);
        });

        it('should emit step:complete event', async () => {
            const completeSpy = jest.fn();
            context.events.on('step:complete', completeSpy);

            await transformer.transform([], context);

            expect(completeSpy).toHaveBeenCalledWith(
                'test-transformer',
                expect.objectContaining({ success: true }),
                context
            );
        });

        it('should emit data:transformed event with count', async () => {
            const transformedSpy = jest.fn();
            context.events.on('data:transformed', transformedSpy);

            const input: InputData[] = [
                { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' }
            ];

            await transformer.transform(input, context);

            expect(transformedSpy).toHaveBeenCalledWith(1, context);
        });

        it('should handle transformation errors', async () => {
            // Create a transformer that throws error
            class ErrorTransformer extends TestTransformer {
                protected async performTransformation(): Promise<OutputData> {
                    throw new Error('Transformation error');
                }
            }

            const errorTransformer = new ErrorTransformer();
            const result = await errorTransformer.transform(
                [{ user_id: 1, user_name: 'Test', user_email: 'test@example.com' }],
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
        });

        it('should emit step:error event on failure', async () => {
            const errorSpy = jest.fn();
            context.events.on('step:error', errorSpy);

            class ErrorTransformer extends TestTransformer {
                protected async performTransformation(): Promise<OutputData> {
                    throw new Error('Test error');
                }
            }

            const errorTransformer = new ErrorTransformer();
            await errorTransformer.transform(
                [{ user_id: 1, user_name: 'Test', user_email: 'test@example.com' }],
                context
            );

            expect(errorSpy).toHaveBeenCalled();
        });
    });

    // =====================================================================
    // Batch Processing
    // =====================================================================
    describe('Batch Processing', () => {
        it('should process data in batches', async () => {
            transformer = new TestTransformer({
                batchSize: 2
            });

            const input: InputData[] = Array(5).fill(null).map((_, i) => ({
                user_id: i + 1,
                user_name: `User${i + 1}`,
                user_email: `user${i + 1}@example.com`
            }));

            const result = await transformer.transform(input, context);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(5);
        });

        it('should emit progress events during batch processing', async () => {
            const progressSpy = jest.fn();
            context.events.on('progress', progressSpy);

            transformer = new TestTransformer({ batchSize: 2 });

            const input: InputData[] = Array(5).fill(null).map((_, i) => ({
                user_id: i + 1,
                user_name: `User${i + 1}`,
                user_email: `user${i + 1}@example.com`
            }));

            await transformer.transform(input, context);

            expect(progressSpy).toHaveBeenCalled();
            expect(progressSpy.mock.calls[0][0]).toMatchObject({
                stage: 'transform',
                step: 'test-transformer'
            });
        });

        it('should skip invalid items when configured', async () => {
            transformer = new TestTransformer({
                skipInvalidItems: true,
                validateInput: true
            });

            const input = [
                { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' },
                { user_id: 'invalid', user_name: 'Bob', user_email: 'bob@example.com' } as any,
                { user_id: 3, user_name: 'Charlie', user_email: 'charlie@example.com' }
            ];

            const result = await transformer.transform(input, context);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2); // Skipped invalid item
        });

        it('should throw on invalid items when not skipping', async () => {
            transformer = new TestTransformer({
                skipInvalidItems: false,
                validateInput: true
            });

            const input = [
                { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' },
                { user_id: 'invalid', user_name: 'Bob', user_email: 'bob@example.com' } as any
            ];

            const result = await transformer.transform(input, context);

            expect(result.success).toBe(false);
        });
    });

    // =====================================================================
    // Field Mappings
    // =====================================================================
    describe('Field Mappings', () => {
        it('should apply field mappings', async () => {
            transformer = new TestTransformer({
                fieldMappings: {
                    id: 'userId',
                    name: 'fullName'
                }
            });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toMatchObject({
                userId: 1,
                fullName: 'Alice'
            });
        });

        it('should handle missing fields in mappings', async () => {
            transformer = new TestTransformer({
                fieldMappings: {
                    nonExistent: 'newField'
                }
            });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toBeDefined();
            expect(result).not.toHaveProperty('newField');
        });
    });

    // =====================================================================
    // Default Values
    // =====================================================================
    describe('Default Values', () => {
        it('should apply default values for missing fields', async () => {
            transformer = new TestTransformer({
                defaultValues: {
                    status: 'active',
                    role: 'user'
                }
            });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toMatchObject({
                status: 'active',
                role: 'user'
            });
        });

        it('should not override existing values', async () => {
            transformer = new TestTransformer({
                defaultValues: {
                    name: 'DefaultName'
                }
            });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result.name).toBe('Alice'); // Not overridden
        });

        it('should apply default for null values', async () => {
            const input: any = {
                user_id: 1,
                user_name: null,
                user_email: 'alice@example.com'
            };

            transformer = new TestTransformer({
                defaultValues: {
                    name: 'DefaultName'
                }
            });

            const result = await transformer.transformItem(input, context);

            expect(result.name).toBe('DefaultName');
        });
    });

    // =====================================================================
    // Transformation Rules
    // =====================================================================
    describe('Transformation Rules', () => {
        it('should apply rename rule', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'rename',
                    target: 'fullName'
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toHaveProperty('fullName', 'Alice');
            expect(result).not.toHaveProperty('name');
        });

        it('should apply convert rule', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'id',
                    operation: 'convert',
                    converter: (value: number) => `ID-${value}`
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result.id).toBe('ID-1');
        });

        it('should apply calculate rule', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'id',
                    operation: 'calculate',
                    target: 'displayName',
                    converter: (item: any) => `${item.name} (${item.id})`
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toHaveProperty('displayName', 'Alice (1)');
        });

        it('should apply default rule', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'status',
                    operation: 'default',
                    value: 'pending'
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result).toHaveProperty('status', 'pending');
        });

        it('should respect rule conditions', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'email',
                    operation: 'convert',
                    converter: (value: string) => value.toUpperCase(),
                    condition: (item: any) => item.id > 5
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input1: InputData = {
                user_id: 10,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result1 = await transformer.transformItem(input1, context);
            expect(result1.email).toBe('ALICE@EXAMPLE.COM'); // Condition met

            const input2: InputData = {
                user_id: 2,
                user_name: 'Bob',
                user_email: 'bob@example.com'
            };

            const result2 = await transformer.transformItem(input2, context);
            expect(result2.email).toBe('bob@example.com'); // Condition not met
        });
    });

    // =====================================================================
    // Value Formatting
    // =====================================================================
    describe('Value Formatting', () => {
        beforeEach(() => {
            transformer = new TestTransformer();
        });

        it('should format string to lowercase', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'format',
                    value: 'lowercase'
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'ALICE',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result.name).toBe('alice');
        });

        it('should format string to uppercase', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'format',
                    value: 'uppercase'
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result.name).toBe('ALICE');
        });

        it('should trim whitespace', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'format',
                    value: 'trim'
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: '  Alice  ',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(input, context);

            expect(result.name).toBe('Alice');
        });

        it('should format email', async () => {
            const rules: TransformRule[] = [
                {
                    field: 'email',
                    operation: 'format',
                    value: 'email'
                }
            ];

            transformer = new TestTransformer({ transformRules: rules });

            const input: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: '  ALICE@EXAMPLE.COM  '
            };

            const result = await transformer.transformItem(input, context);

            expect(result.email).toBe('alice@example.com');
        });
    });

    // =====================================================================
    // Validation
    // =====================================================================
    describe('Validation', () => {
        it('should validate input schema', async () => {
            transformer = new TestTransformer({
                validateInput: true
            });

            const validInput: InputData = {
                user_id: 1,
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            const result = await transformer.transformItem(validInput, context);

            expect(result).toBeDefined();
        });

        it('should reject invalid input', async () => {
            transformer = new TestTransformer({
                validateInput: true
            });

            const invalidInput: any = {
                user_id: 'invalid',
                user_name: 'Alice',
                user_email: 'alice@example.com'
            };

            await expect(transformer.transformItem(invalidInput, context)).rejects.toThrow();
        });

        it('should validate output schema', async () => {
            transformer = new TestTransformer({
                validateOutput: true
            });

            const input: InputData[] = [
                { user_id: 1, user_name: 'Alice', user_email: 'alice@example.com' }
            ];

            const result = await transformer.transform(input, context);

            expect(result.success).toBe(true);
        });

        it('should validate transformation rules', async () => {
            const validRules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'rename',
                    target: 'fullName'
                }
            ];

            transformer = new TestTransformer({ transformRules: validRules });

            const isValid = await transformer.validate();

            expect(isValid).toBe(true);
        });

        it('should invalidate incomplete rename rule', async () => {
            const invalidRules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'rename'
                    // Missing target
                } as any
            ];

            transformer = new TestTransformer({ transformRules: invalidRules });

            const isValid = await transformer.validate();

            expect(isValid).toBe(false);
        });

        it('should invalidate missing converter in convert rule', async () => {
            const invalidRules: TransformRule[] = [
                {
                    field: 'name',
                    operation: 'convert'
                    // Missing converter
                } as any
            ];

            transformer = new TestTransformer({ transformRules: invalidRules });

            const isValid = await transformer.validate();

            expect(isValid).toBe(false);
        });

        it('should invalidate calculate rule without target', async () => {
            const invalidRules: TransformRule[] = [
                {
                    field: 'id',
                    operation: 'calculate',
                    converter: (item: any) => item.id * 2
                    // Missing target
                } as any
            ];

            transformer = new TestTransformer({ transformRules: invalidRules });

            const isValid = await transformer.validate();

            expect(isValid).toBe(false);
        });
    });
});
