/**
 * ETL Bridges Tests
 *
 * Comprehensive test suite for ETL bridge components covering bridge
 * registration, validation, data mapping, transformation, and the
 * bridge registry system.
 *
 * @package     @imajin/cli
 * @subpackage  etl/bridges/__tests__
 */

import { ETLContext } from '../../core/index.js';
import {
    Bridge,
    BridgeComponent,
    BridgeRule,
    BridgeTransformation,
    DefaultBridgeRegistry,
} from '../index.js';

describe('ETL Bridges', () => {
    function createTestContext(data?: any): ETLContext {
        return {
            source: 'test-source',
            target: 'test-target',
            options: {},
            data,
        };
    }

    function createTestBridge(overrides?: Partial<Bridge>): Bridge {
        return {
            id: 'test-bridge',
            version: '1.0.0',
            source: 'stripe',
            target: 'contentful',
            mappings: {
                'customer.email': 'fields.email',
                'customer.name': 'fields.name',
            },
            transformations: {},
            metadata: {
                efficiency: 0.9,
                confidence: 0.95,
                lastUpdated: new Date(),
            },
            ...overrides,
        };
    }

    // =====================================================================
    // DefaultBridgeRegistry
    // =====================================================================
    describe('DefaultBridgeRegistry', () => {
        let registry: DefaultBridgeRegistry;

        beforeEach(() => {
            registry = new DefaultBridgeRegistry();
        });

        // =================================================================
        // Registration
        // =================================================================
        describe('register()', () => {
            it('should register bridge successfully', () => {
                const bridge = createTestBridge();

                registry.register(bridge);

                const retrieved = registry.getBridge('stripe', 'contentful');
                expect(retrieved).toBe(bridge);
            });

            it('should register multiple bridges', () => {
                const bridge1 = createTestBridge({ id: 'bridge-1', source: 'stripe', target: 'contentful' });
                const bridge2 = createTestBridge({ id: 'bridge-2', source: 'contentful', target: 'stripe' });

                registry.register(bridge1);
                registry.register(bridge2);

                expect(registry.getBridges()).toHaveLength(2);
            });

            it('should overwrite existing bridge with same source and target', () => {
                const bridge1 = createTestBridge({ id: 'bridge-1', version: '1.0.0' });
                const bridge2 = createTestBridge({ id: 'bridge-2', version: '2.0.0' });

                registry.register(bridge1);
                registry.register(bridge2);

                const retrieved = registry.getBridge('stripe', 'contentful');
                expect(retrieved?.version).toBe('2.0.0');
            });

            it('should allow different source-target combinations', () => {
                const bridge1 = createTestBridge({ source: 'stripe', target: 'contentful' });
                const bridge2 = createTestBridge({ source: 'stripe', target: 'shopify' });
                const bridge3 = createTestBridge({ source: 'contentful', target: 'stripe' });

                registry.register(bridge1);
                registry.register(bridge2);
                registry.register(bridge3);

                expect(registry.getBridges()).toHaveLength(3);
            });
        });

        // =================================================================
        // Retrieval
        // =================================================================
        describe('getBridge()', () => {
            it('should retrieve registered bridge by source and target', () => {
                const bridge = createTestBridge();
                registry.register(bridge);

                const retrieved = registry.getBridge('stripe', 'contentful');

                expect(retrieved).toBe(bridge);
            });

            it('should return undefined for non-existent bridge', () => {
                const retrieved = registry.getBridge('unknown', 'unknown');

                expect(retrieved).toBeUndefined();
            });

            it('should distinguish between different source-target pairs', () => {
                const bridge1 = createTestBridge({ id: 'bridge-1', source: 'stripe', target: 'contentful' });
                const bridge2 = createTestBridge({ id: 'bridge-2', source: 'contentful', target: 'stripe' });

                registry.register(bridge1);
                registry.register(bridge2);

                expect(registry.getBridge('stripe', 'contentful')?.id).toBe('bridge-1');
                expect(registry.getBridge('contentful', 'stripe')?.id).toBe('bridge-2');
            });
        });

        describe('getBridges()', () => {
            it('should return empty array initially', () => {
                const bridges = registry.getBridges();

                expect(bridges).toEqual([]);
            });

            it('should return all registered bridges', () => {
                const bridge1 = createTestBridge({ id: 'bridge-1', source: 'stripe', target: 'contentful' });
                const bridge2 = createTestBridge({ id: 'bridge-2', source: 'contentful', target: 'stripe' });
                const bridge3 = createTestBridge({ id: 'bridge-3', source: 'stripe', target: 'shopify' });

                registry.register(bridge1);
                registry.register(bridge2);
                registry.register(bridge3);

                const bridges = registry.getBridges();

                expect(bridges).toHaveLength(3);
                expect(bridges).toContain(bridge1);
                expect(bridges).toContain(bridge2);
                expect(bridges).toContain(bridge3);
            });
        });

        // =================================================================
        // Validation
        // =================================================================
        describe('validate()', () => {
            it('should validate complete bridge successfully', () => {
                const bridge = createTestBridge();

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(true);
            });

            it('should fail validation for missing id', () => {
                const bridge = createTestBridge({ id: '' });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for missing version', () => {
                const bridge = createTestBridge({ version: '' });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for missing source', () => {
                const bridge = createTestBridge({ source: '' });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for missing target', () => {
                const bridge = createTestBridge({ target: '' });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for missing mappings', () => {
                const bridge = createTestBridge({ mappings: undefined as any });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for invalid mappings type', () => {
                const bridge = createTestBridge({ mappings: 'invalid' as any });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for missing transformations', () => {
                const bridge = createTestBridge({ transformations: undefined as any });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for invalid transformations type', () => {
                const bridge = createTestBridge({ transformations: 'invalid' as any });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for missing metadata', () => {
                const bridge = createTestBridge({ metadata: undefined as any });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for invalid efficiency', () => {
                const bridge = createTestBridge({
                    metadata: {
                        efficiency: 'invalid' as any,
                        confidence: 0.95,
                        lastUpdated: new Date(),
                    },
                });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for invalid confidence', () => {
                const bridge = createTestBridge({
                    metadata: {
                        efficiency: 0.9,
                        confidence: 'invalid' as any,
                        lastUpdated: new Date(),
                    },
                });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should fail validation for invalid lastUpdated', () => {
                const bridge = createTestBridge({
                    metadata: {
                        efficiency: 0.9,
                        confidence: 0.95,
                        lastUpdated: 'invalid' as any,
                    },
                });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(false);
            });

            it('should accept empty mappings and transformations', () => {
                const bridge = createTestBridge({
                    mappings: {},
                    transformations: {},
                });

                const isValid = registry.validate(bridge);

                expect(isValid).toBe(true);
            });
        });
    });

    // =====================================================================
    // BridgeComponent
    // =====================================================================
    describe('BridgeComponent', () => {
        let registry: DefaultBridgeRegistry;
        let bridge: Bridge;
        let component: BridgeComponent;

        beforeEach(() => {
            registry = new DefaultBridgeRegistry();
            bridge = createTestBridge();
            component = new BridgeComponent(bridge, registry);
        });

        // =================================================================
        // Constructor
        // =================================================================
        describe('Constructor', () => {
            it('should initialize with bridge and registry', () => {
                expect(component).toBeDefined();
                expect(component.id).toBe('test-bridge');
                expect(component.version).toBe('1.0.0');
            });

            it('should set id from bridge', () => {
                const customBridge = createTestBridge({ id: 'custom-id' });
                const customComponent = new BridgeComponent(customBridge, registry);

                expect(customComponent.id).toBe('custom-id');
            });

            it('should set version from bridge', () => {
                const customBridge = createTestBridge({ version: '2.0.0' });
                const customComponent = new BridgeComponent(customBridge, registry);

                expect(customComponent.version).toBe('2.0.0');
            });
        });

        // =================================================================
        // Validation
        // =================================================================
        describe('validate()', () => {
            it('should validate bridge using registry', async () => {
                const context = createTestContext();

                const isValid = await component.validate(context);

                expect(isValid).toBe(true);
            });

            it('should return false for invalid bridge', async () => {
                const invalidBridge = createTestBridge({ id: '' });
                const invalidComponent = new BridgeComponent(invalidBridge, registry);
                const context = createTestContext();

                const isValid = await invalidComponent.validate(context);

                expect(isValid).toBe(false);
            });
        });

        // =================================================================
        // Data Mapping
        // =================================================================
        describe('execute() - Data Mapping', () => {
            it('should apply simple field mappings', async () => {
                const inputData = {
                    customer: {
                        email: 'test@example.com',
                        name: 'John Doe',
                    },
                };

                const context = createTestContext(inputData);
                const result = await component.execute(context);

                expect(result.data).toMatchObject({
                    fields: {
                        email: 'test@example.com',
                        name: 'John Doe',
                    },
                });
            });

            it('should handle nested field mappings', async () => {
                const customBridge = createTestBridge({
                    mappings: {
                        'user.profile.firstName': 'fields.profile.name.first',
                        'user.profile.lastName': 'fields.profile.name.last',
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const inputData = {
                    user: {
                        profile: {
                            firstName: 'Jane',
                            lastName: 'Smith',
                        },
                    },
                };

                const context = createTestContext(inputData);
                const result = await customComponent.execute(context);

                expect(result.data.fields.profile.name).toMatchObject({
                    first: 'Jane',
                    last: 'Smith',
                });
            });

            it('should handle missing source fields gracefully', async () => {
                const inputData = {
                    customer: {
                        email: 'test@example.com',
                        // name is missing
                    },
                };

                const context = createTestContext(inputData);
                const result = await component.execute(context);

                expect(result.data.fields.email).toBe('test@example.com');
                expect(result.data.fields.name).toBeUndefined();
            });

            it('should create nested objects as needed', async () => {
                const customBridge = createTestBridge({
                    mappings: {
                        'simple': 'deeply.nested.target.path',
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const inputData = {
                    simple: 'value',
                };

                const context = createTestContext(inputData);
                const result = await customComponent.execute(context);

                expect(result.data.deeply.nested.target.path).toBe('value');
            });
        });

        // =================================================================
        // Transformations
        // =================================================================
        describe('execute() - Transformations', () => {
            it('should apply transformation rules', async () => {
                const rules: BridgeRule[] = [
                    {
                        name: 'uppercase',
                        from: 'name',
                        transform: (value: string) => value.toUpperCase(),
                    },
                ];

                const transformation: BridgeTransformation = {
                    source: 'customer.name',
                    target: 'fields.displayName',
                    rules,
                };

                const customBridge = createTestBridge({
                    transformations: {
                        nameTransform: transformation,
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const inputData = {
                    customer: {
                        name: 'john doe',
                    },
                };

                const context = createTestContext(inputData);
                const result = await customComponent.execute(context);

                expect(result.data.fields.displayName).toBe('JOHN DOE');
            });

            it('should apply multiple transformation rules in sequence', async () => {
                const rules: BridgeRule[] = [
                    {
                        name: 'trim',
                        from: 'value',
                        transform: (value: string) => value.trim(),
                    },
                    {
                        name: 'lowercase',
                        from: 'value',
                        transform: (value: string) => value.toLowerCase(),
                    },
                ];

                const transformation: BridgeTransformation = {
                    source: 'input',
                    target: 'output',
                    rules,
                };

                const customBridge = createTestBridge({
                    mappings: {},
                    transformations: {
                        process: transformation,
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const inputData = {
                    input: '  HELLO WORLD  ',
                };

                const context = createTestContext(inputData);
                const result = await customComponent.execute(context);

                expect(result.data.output).toBe('hello world');
            });

            it('should skip transformation if source value is undefined', async () => {
                const rules: BridgeRule[] = [
                    {
                        name: 'test',
                        from: 'value',
                        transform: () => 'transformed',
                    },
                ];

                const transformation: BridgeTransformation = {
                    source: 'nonexistent.field',
                    target: 'output',
                    rules,
                };

                const customBridge = createTestBridge({
                    mappings: {},
                    transformations: {
                        test: transformation,
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const inputData = {
                    other: 'value',
                };

                const context = createTestContext(inputData);
                const result = await customComponent.execute(context);

                expect(result.data.output).toBeUndefined();
            });
        });

        // =================================================================
        // Execution Metadata
        // =================================================================
        describe('execute() - Metadata', () => {
            it('should include execution metadata', async () => {
                const context = createTestContext({ customer: { email: 'test@example.com' } });

                const result = await component.execute(context);

                expect(result.metadata).toBeDefined();
                expect(result.metadata).toHaveProperty('timestamp');
                expect(result.metadata).toHaveProperty('duration');
                expect(result.metadata).toHaveProperty('source', 'stripe');
                expect(result.metadata).toHaveProperty('target', 'contentful');
            });

            it('should include processing stats', async () => {
                const context = createTestContext({ customer: { email: 'test@example.com' } });

                const result = await component.execute(context);

                expect(result.metadata.stats).toBeDefined();
                expect(result.metadata.stats).toHaveProperty('processed');
                expect(result.metadata.stats).toHaveProperty('succeeded');
                expect(result.metadata.stats).toHaveProperty('failed');
            });

            it('should measure execution duration', async () => {
                const context = createTestContext({ customer: { email: 'test@example.com' } });

                const result = await component.execute(context);

                expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
                expect(typeof result.metadata.duration).toBe('number');
            });

            it('should set timestamp to Date object', async () => {
                const context = createTestContext({ customer: { email: 'test@example.com' } });

                const result = await component.execute(context);

                expect(result.metadata.timestamp).toBeInstanceOf(Date);
            });
        });

        // =================================================================
        // Error Handling
        // =================================================================
        describe('execute() - Error Handling', () => {
            it('should throw error with transformation failure', async () => {
                const rules: BridgeRule[] = [
                    {
                        name: 'error',
                        from: 'value',
                        transform: () => {
                            throw new Error('Transformation failed');
                        },
                    },
                ];

                const transformation: BridgeTransformation = {
                    source: 'input',
                    target: 'output',
                    rules,
                };

                const customBridge = createTestBridge({
                    transformations: {
                        error: transformation,
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const context = createTestContext({ input: 'value' });

                await expect(customComponent.execute(context)).rejects.toThrow(
                    'Bridge transformation failed'
                );
            });

            it('should include original error message', async () => {
                const rules: BridgeRule[] = [
                    {
                        name: 'error',
                        from: 'value',
                        transform: () => {
                            throw new Error('Custom error message');
                        },
                    },
                ];

                const transformation: BridgeTransformation = {
                    source: 'input',
                    target: 'output',
                    rules,
                };

                const customBridge = createTestBridge({
                    transformations: {
                        error: transformation,
                    },
                });

                const customComponent = new BridgeComponent(customBridge, registry);

                const context = createTestContext({ input: 'value' });

                await expect(customComponent.execute(context)).rejects.toThrow(
                    'Custom error message'
                );
            });
        });
    });
});
