/**
 * GraphTranslationEngine Tests
 *
 * Comprehensive test suite for graph-to-graph translation engine covering
 * model translation, normalization, translator registration, efficiency
 * scoring, and compatibility checking.
 *
 * @package     @imajin/cli
 * @subpackage  etl/graphs/__tests__
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import {
    ETLContext,
    GraphModel,
    GraphTranslationResult,
    GraphTranslator,
} from '../../core/interfaces.js';
import { GraphTranslationEngine } from '../GraphTranslationEngine.js';
import { ModelFactory } from '../models.js';

// Mock ModelFactory
jest.mock('../models.js', () => {
    const mockModels = new Map<string, any>();

    // Mock model definitions
    const contentModelDef = {
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                content: z.object({ id: z.string(), title: z.string() }),
            },
            relationships: {},
            constraints: {},
        },
        compatibility: {
            directCompatible: ['content'],
            translatableFrom: ['commerce', 'social'],
            translatableTo: ['commerce', 'social'],
        },
    };

    const commerceModelDef = {
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                product: z.object({ id: z.string(), name: z.string(), price: z.number() }),
            },
            relationships: {},
            constraints: {},
        },
        compatibility: {
            directCompatible: ['commerce'],
            translatableFrom: ['content', 'social'],
            translatableTo: ['content', 'social'],
        },
    };

    const socialModelDef = {
        version: '1.0.0',
        schema: {
            version: '1.0.0',
            entities: {
                user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
            },
            relationships: {},
            constraints: {},
        },
        compatibility: {
            directCompatible: ['social'],
            translatableFrom: ['content', 'commerce'],
            translatableTo: ['content', 'commerce'],
        },
    };

    mockModels.set('content', contentModelDef);
    mockModels.set('commerce', commerceModelDef);
    mockModels.set('social', socialModelDef);

    return {
        ModelFactory: {
            getModelDefinition: jest.fn((modelType: string) => mockModels.get(modelType)),
            isModelRegistered: jest.fn((modelType: string) => mockModels.has(modelType)),
            getModelNames: jest.fn(() => Array.from(mockModels.keys())),
        },
    };
});

describe('GraphTranslationEngine', () => {
    let engine: GraphTranslationEngine;
    let context: ETLContext;

    function createTestContext(): ETLContext {
        return {
            id: 'test-context',
            pipelineId: 'test-pipeline',
            events: new EventEmitter(),
            metadata: {},
            startTime: new Date(),
        };
    }

    function createTestGraph(modelType: string): GraphModel {
        const modelDef = ModelFactory.getModelDefinition(modelType);
        return {
            modelType,
            version: modelDef?.version || '1.0.0',
            schema: modelDef?.schema || {
                version: '1.0.0',
                entities: {},
                relationships: {},
                constraints: {},
            },
            compatibilityMap: modelDef?.compatibility || {
                directCompatible: [],
                translatableFrom: [],
                translatableTo: [],
            },
            metadata: {
                created: new Date(),
            },
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        context = createTestContext();
        engine = new GraphTranslationEngine();
    });

    // =====================================================================
    // Constructor & Initialization
    // =====================================================================
    describe('Constructor & Initialization', () => {
        it('should initialize engine successfully', () => {
            expect(engine).toBeDefined();
            expect(engine).toBeInstanceOf(GraphTranslationEngine);
        });

        it('should initialize standard translators', () => {
            const translators = engine.getAvailableTranslators();

            expect(translators.length).toBeGreaterThan(0);
        });

        it('should create translators for all model pairs', () => {
            const translators = engine.getAvailableTranslators();
            const modelCount = 3; // content, commerce, social

            // Should have translators for all pairs except self-to-self
            expect(translators.length).toBe(modelCount * (modelCount - 1));
        });

        it('should be an EventEmitter', () => {
            expect(engine).toBeInstanceOf(EventEmitter);
        });
    });

    // =====================================================================
    // Direct Communication Check
    // =====================================================================
    describe('canCommunicateDirectly()', () => {
        it('should return true for same model type', () => {
            const result = engine.canCommunicateDirectly('content', 'content');

            expect(result).toBe(true);
        });

        it('should return false for different model types', () => {
            const result = engine.canCommunicateDirectly('content', 'commerce');

            expect(result).toBe(false);
        });

        it('should return false for unregistered model', () => {
            const result = engine.canCommunicateDirectly('unknown', 'unknown');

            expect(result).toBe(false);
        });

        it('should check if model is registered', () => {
            engine.canCommunicateDirectly('content', 'content');

            expect(ModelFactory.isModelRegistered).toHaveBeenCalledWith('content');
        });
    });

    // =====================================================================
    // Graph Translation
    // =====================================================================
    describe('translateGraph()', () => {
        it('should handle direct communication (same model)', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'content', context);

            expect(result.success).toBe(true);
            expect(result.translatedGraph).toBe(sourceGraph);
            expect(result.confidence).toBe(1);
            expect(result.metadata?.translationType).toBe('direct');
        });

        it('should translate between different models', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.success).toBe(true);
            expect(result.translatedGraph).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should emit progress events during translation', async () => {
            const sourceGraph = createTestGraph('content');

            const progressEvents: any[] = [];
            context.events.on('progress', (progress) => {
                progressEvents.push(progress);
            });

            await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(progressEvents.length).toBeGreaterThanOrEqual(2); // Start and complete
            expect(progressEvents[0]).toMatchObject({
                stage: 'transform',
                step: 'graph-translation',
                processed: 0,
                total: 1,
            });
        });

        it('should return error for unknown translator', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'unknown', context);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.confidence).toBe(0);
        });

        it('should include translation metadata', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.metadata).toBeDefined();
            expect(result.metadata).toHaveProperty('translationType');
            expect(result.metadata).toHaveProperty('sourceModel', 'content');
            expect(result.metadata).toHaveProperty('targetModel', 'commerce');
        });

        it('should handle translation errors gracefully', async () => {
            // Create a graph with missing model definition
            const invalidGraph: GraphModel = {
                modelType: 'invalid',
                version: '1.0.0',
                schema: {
                    version: '1.0.0',
                    entities: {},
                    relationships: {},
                    constraints: {},
                },
                compatibilityMap: {
                    directCompatible: [],
                    translatableFrom: [],
                    translatableTo: [],
                },
                metadata: {},
            };

            const result = await engine.translateGraph(invalidGraph, 'content', context);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should calculate confidence score', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('should track lossy and added fields', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.lossyFields).toBeDefined();
            expect(Array.isArray(result.lossyFields)).toBe(true);
            expect(result.addedFields).toBeDefined();
            expect(Array.isArray(result.addedFields)).toBe(true);
        });
    });

    // =====================================================================
    // Normalization to Context
    // =====================================================================
    describe('normalizeToContext()', () => {
        it('should normalize external graph with explicit model type', async () => {
            const externalGraph = {
                modelType: 'content',
                version: '1.0.0',
                id: 'test-content',
                title: 'Test Content',
            };

            const result = await engine.normalizeToContext(
                externalGraph,
                'content',
                context
            );

            expect(result.success).toBe(true);
            expect(result.confidence).toBeGreaterThanOrEqual(0.9);
            expect(result.metadata?.translationType).toBe('normalization-minimal');
        });

        it('should detect model type from external graph structure', async () => {
            const externalGraph = {
                content: { id: '1', title: 'Test' },
            };

            const result = await engine.normalizeToContext(
                externalGraph,
                'content',
                context
            );

            expect(result.success).toBe(true);
        });

        it('should translate to different user context', async () => {
            const externalGraph = {
                modelType: 'content',
                version: '1.0.0',
                id: 'test-content',
            };

            const result = await engine.normalizeToContext(
                externalGraph,
                'commerce',
                context
            );

            expect(result.success).toBe(true);
            expect(result.metadata?.detectedModel).toBe('content');
        });

        it('should handle unknown model types', async () => {
            const externalGraph = {
                modelType: 'unknown',
                unknownField: 'value',
            };

            const result = await engine.normalizeToContext(
                externalGraph,
                'content',
                context
            );

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should include normalization metadata', async () => {
            const externalGraph = {
                modelType: 'content',
                version: '1.0.0',
            };

            const result = await engine.normalizeToContext(
                externalGraph,
                'content',
                context
            );

            expect(result.metadata).toHaveProperty('translationType');
            expect(result.metadata).toHaveProperty('duration');
        });

        it('should handle normalization errors', async () => {
            const externalGraph = null;

            const result = await engine.normalizeToContext(
                externalGraph,
                'content',
                context
            );

            expect(result.success).toBe(false);
            expect(result.metadata?.translationType).toBe('normalization-failed');
        });
    });

    // =====================================================================
    // Efficiency Scoring
    // =====================================================================
    describe('getEfficiency()', () => {
        it('should return 1 for same model type', () => {
            const efficiency = engine.getEfficiency('content', 'content');

            expect(efficiency).toBe(1);
        });

        it('should return score for valid translator', () => {
            const efficiency = engine.getEfficiency('content', 'commerce');

            expect(efficiency).toBeGreaterThan(0);
            expect(efficiency).toBeLessThanOrEqual(1);
        });

        it('should return 0 for unknown translator', () => {
            const efficiency = engine.getEfficiency('unknown', 'content');

            expect(efficiency).toBe(0);
        });

        it('should score compatible models higher', () => {
            const contentToCommerce = engine.getEfficiency('content', 'commerce');
            const unknownEfficiency = engine.getEfficiency('unknown', 'unknown2');

            expect(contentToCommerce).toBeGreaterThan(unknownEfficiency);
        });
    });

    // =====================================================================
    // Translator Registration
    // =====================================================================
    describe('registerTranslator()', () => {
        it('should register custom translator', () => {
            const customTranslator: GraphTranslator = {
                name: 'custom-translator',
                sourceModel: 'custom-source',
                targetModel: 'custom-target',
                version: '1.0.0',
                async translate(_sourceGraph, _context) {
                    return {
                        success: true,
                        translationMap: {},
                        lossyFields: [],
                        addedFields: [],
                        confidence: 0.95,
                        metadata: {},
                    };
                },
                canTranslate(source, target) {
                    return source === 'custom-source' && target === 'custom-target';
                },
                getEfficiencyScore() {
                    return 0.9;
                },
            };

            engine.registerTranslator(customTranslator);

            const translators = engine.getAvailableTranslators();
            expect(translators).toContain('custom-source->custom-target');
        });

        it('should use custom translator for translation', async () => {
            const customTranslator: GraphTranslator = {
                name: 'test-translator',
                sourceModel: 'test-source',
                targetModel: 'test-target',
                version: '1.0.0',
                async translate(_sourceGraph, _context) {
                    return {
                        success: true,
                        translationMap: { customField: 'mapped' },
                        lossyFields: [],
                        addedFields: ['newField'],
                        confidence: 0.98,
                        metadata: { custom: true },
                    };
                },
                canTranslate(source, target) {
                    return source === 'test-source' && target === 'test-target';
                },
                getEfficiencyScore() {
                    return 0.95;
                },
            };

            engine.registerTranslator(customTranslator);

            const sourceGraph: GraphModel = {
                modelType: 'test-source',
                version: '1.0.0',
                schema: {
                    version: '1.0.0',
                    entities: {},
                    relationships: {},
                    constraints: {},
                },
                compatibilityMap: {
                    directCompatible: [],
                    translatableFrom: [],
                    translatableTo: [],
                },
                metadata: {},
            };

            const result = await engine.translateGraph(sourceGraph, 'test-target', context);

            expect(result.success).toBe(true);
            expect(result.confidence).toBe(0.98);
            expect(result.metadata?.custom).toBe(true);
        });

        it('should allow overriding existing translators', () => {
            const originalCount = engine.getAvailableTranslators().length;

            const customTranslator: GraphTranslator = {
                name: 'override-translator',
                sourceModel: 'content',
                targetModel: 'commerce',
                version: '2.0.0',
                async translate() {
                    return {
                        success: true,
                        translationMap: {},
                        lossyFields: [],
                        addedFields: [],
                        confidence: 1,
                        metadata: { overridden: true },
                    };
                },
                canTranslate(source, target) {
                    return source === 'content' && target === 'commerce';
                },
                getEfficiencyScore() {
                    return 1;
                },
            };

            engine.registerTranslator(customTranslator);

            // Should not increase count (overriding existing)
            expect(engine.getAvailableTranslators().length).toBe(originalCount);
        });
    });

    // =====================================================================
    // Available Translators
    // =====================================================================
    describe('getAvailableTranslators()', () => {
        it('should return array of translator keys', () => {
            const translators = engine.getAvailableTranslators();

            expect(Array.isArray(translators)).toBe(true);
            expect(translators.length).toBeGreaterThan(0);
        });

        it('should include all standard translators', () => {
            const translators = engine.getAvailableTranslators();

            expect(translators).toContain('content->commerce');
            expect(translators).toContain('content->social');
            expect(translators).toContain('commerce->content');
            expect(translators).toContain('commerce->social');
            expect(translators).toContain('social->content');
            expect(translators).toContain('social->commerce');
        });

        it('should not include self-to-self translators', () => {
            const translators = engine.getAvailableTranslators();

            expect(translators).not.toContain('content->content');
            expect(translators).not.toContain('commerce->commerce');
            expect(translators).not.toContain('social->social');
        });

        it('should include custom translators', () => {
            const customTranslator: GraphTranslator = {
                name: 'custom',
                sourceModel: 'custom-a',
                targetModel: 'custom-b',
                version: '1.0.0',
                async translate() {
                    return {
                        success: true,
                        translationMap: {},
                        lossyFields: [],
                        addedFields: [],
                        confidence: 1,
                        metadata: {},
                    };
                },
                canTranslate() {
                    return true;
                },
                getEfficiencyScore() {
                    return 1;
                },
            };

            engine.registerTranslator(customTranslator);

            const translators = engine.getAvailableTranslators();
            expect(translators).toContain('custom-a->custom-b');
        });
    });

    // =====================================================================
    // Standard Translator Behavior
    // =====================================================================
    describe('Standard Translator Behavior', () => {
        it('should create functional standard translators', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.success).toBe(true);
            expect(result.translatedGraph?.modelType).toBe('commerce');
        });

        it('should preserve source metadata in translation', async () => {
            const sourceGraph = createTestGraph('content');
            sourceGraph.metadata.customField = 'test-value';

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.success).toBe(true);
            expect(result.translatedGraph?.metadata.customField).toBe('test-value');
        });

        it('should add translation metadata', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.translatedGraph?.metadata.translatedFrom).toBe('content');
            expect(result.translatedGraph?.metadata.translationTimestamp).toBeDefined();
        });

        it('should use target model schema', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.translatedGraph?.schema.entities).toHaveProperty('product');
        });

        it('should calculate appropriate confidence scores', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            // Confidence should be less than 1 for cross-model translation
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(0.95);
        });
    });

    // =====================================================================
    // Model Similarity & Compatibility
    // =====================================================================
    describe('Model Similarity & Compatibility', () => {
        it('should score compatible models higher', () => {
            // Content and commerce are translatable
            const efficiency1 = engine.getEfficiency('content', 'commerce');

            // Unknown models should score lower
            const efficiency2 = engine.getEfficiency('unknown', 'unknown2');

            expect(efficiency1).toBeGreaterThan(efficiency2);
        });

        it('should check model compatibility', async () => {
            const sourceGraph = createTestGraph('content');

            // Commerce is in translatableTo list for content
            const result = await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(result.success).toBe(true);
        });

        it('should use compatibility matrix for scoring', async () => {
            const sourceGraph = createTestGraph('content');

            const result1 = await engine.translateGraph(sourceGraph, 'commerce', context);
            const result2 = await engine.translateGraph(sourceGraph, 'social', context);

            // Both should succeed as they're in compatibility matrix
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
        });
    });

    // =====================================================================
    // Event Emission
    // =====================================================================
    describe('Event Emission', () => {
        it('should emit progress at translation start', async () => {
            const sourceGraph = createTestGraph('content');

            let startEventEmitted = false;
            context.events.on('progress', (progress) => {
                if (progress.percentage === 0) {
                    startEventEmitted = true;
                }
            });

            await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(startEventEmitted).toBe(true);
        });

        it('should emit progress at translation completion', async () => {
            const sourceGraph = createTestGraph('content');

            let completeEventEmitted = false;
            context.events.on('progress', (progress) => {
                if (progress.percentage === 100) {
                    completeEventEmitted = true;
                }
            });

            await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(completeEventEmitted).toBe(true);
        });

        it('should include confidence in completion message', async () => {
            const sourceGraph = createTestGraph('content');

            let completionMessage = '';
            context.events.on('progress', (progress) => {
                if (progress.percentage === 100) {
                    completionMessage = progress.message || '';
                }
            });

            await engine.translateGraph(sourceGraph, 'commerce', context);

            expect(completionMessage).toContain('confidence');
        });

        it('should not emit progress for direct communication', async () => {
            const sourceGraph = createTestGraph('content');

            const progressEvents: any[] = [];
            context.events.on('progress', (progress) => {
                progressEvents.push(progress);
            });

            await engine.translateGraph(sourceGraph, 'content', context);

            // Should have no progress events for direct communication
            expect(progressEvents.length).toBe(0);
        });
    });

    // =====================================================================
    // Error Handling
    // =====================================================================
    describe('Error Handling', () => {
        it('should handle missing model definition gracefully', async () => {
            const invalidGraph: GraphModel = {
                modelType: 'nonexistent',
                version: '1.0.0',
                schema: {
                    version: '1.0.0',
                    entities: {},
                    relationships: {},
                    constraints: {},
                },
                compatibilityMap: {
                    directCompatible: [],
                    translatableFrom: [],
                    translatableTo: [],
                },
                metadata: {},
            };

            const result = await engine.translateGraph(invalidGraph, 'content', context);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should return structured error result', async () => {
            const sourceGraph = createTestGraph('content');

            const result = await engine.translateGraph(sourceGraph, 'unknown-model', context);

            expect(result).toMatchObject({
                success: false,
                translationMap: {},
                lossyFields: [],
                addedFields: [],
                confidence: 0,
                metadata: {
                    translationType: 'failed',
                },
                error: expect.any(Error),
            });
        });

        it('should handle null/undefined graphs', async () => {
            const result = await engine.translateGraph(null as any, 'content', context);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
