/**
 * GraphTranslationEngine - Core engine for graph-to-graph translation and context normalization
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import { EventEmitter } from 'events';
import {
    ETLContext,
    GraphModel,
    GraphTranslationResult,
    GraphTranslator
} from '../core/interfaces.js';
import { ModelFactory } from './models.js';

/**
 * Main graph translation engine
 */
export class GraphTranslationEngine extends EventEmitter {
    private translators = new Map<string, GraphTranslator>();

    constructor() {
        super();
        this.initializeStandardTranslators();
    }

    /**
     * Check if two models can communicate directly (same model type)
     */
    canCommunicateDirectly(modelA: string, modelB: string): boolean {
        if (modelA === modelB) {
            return ModelFactory.isModelRegistered(modelA);
        }
        return false;
    }

    /**
     * Translate a graph from one model to another
     */
    async translateGraph<T extends GraphModel, U extends GraphModel>(
        sourceGraph: T,
        targetModel: string,
        context: ETLContext
    ): Promise<GraphTranslationResult<U>> {
        const startTime = Date.now();

        try {
            // Direct communication check
            if (this.canCommunicateDirectly(sourceGraph.modelType, targetModel)) {
                return {
                    success: true,
                    translatedGraph: sourceGraph as unknown as U,
                    translationMap: {},
                    lossyFields: [],
                    addedFields: [],
                    confidence: 1.0,
                    metadata: {
                        translationType: 'direct',
                        duration: Date.now() - startTime
                    }
                };
            }

            // Find appropriate translator
            const translatorKey = `${sourceGraph.modelType}->${targetModel}`;
            const translator = this.translators.get(translatorKey);

            if (!translator) {
                throw new Error(`No translator found for ${sourceGraph.modelType} -> ${targetModel}`);
            }

            // Emit progress
            context.events.emit('progress', {
                stage: 'transform',
                step: 'graph-translation',
                processed: 0,
                total: 1,
                percentage: 0,
                message: `Translating ${sourceGraph.modelType} to ${targetModel}`
            });

            // Perform translation
            const result = await translator.translate(sourceGraph, context);

            // Emit completion
            context.events.emit('progress', {
                stage: 'transform',
                step: 'graph-translation',
                processed: 1,
                total: 1,
                percentage: 100,
                message: `Translation completed with ${result.confidence} confidence`
            });

            return result as GraphTranslationResult<U>;

        } catch (error) {
            return {
                success: false,
                translationMap: {},
                lossyFields: [],
                addedFields: [],
                confidence: 0,
                metadata: {
                    translationType: 'failed',
                    duration: Date.now() - startTime
                },
                error: error as Error
            };
        }
    }

    /**
     * Normalize external graph to user's chosen context model
     */
    async normalizeToContext<T extends GraphModel>(
        externalGraph: unknown,
        userContextModel: string,
        context: ETLContext
    ): Promise<GraphTranslationResult<T>> {
        const startTime = Date.now();

        try {
            // First detect the external graph's model type
            const detectedModel = await this.detectGraphModel(externalGraph);

            // If it's already in the user's context, minimal transformation needed
            if (detectedModel === userContextModel) {
                return {
                    success: true,
                    translatedGraph: externalGraph as T,
                    translationMap: {},
                    lossyFields: [],
                    addedFields: [],
                    confidence: 0.95, // Slightly less than 1.0 since we detected vs. explicit
                    metadata: {
                        translationType: 'normalization-minimal',
                        detectedModel,
                        duration: Date.now() - startTime
                    }
                };
            }

            // Get the model definition
            const modelDef = ModelFactory.getModelDefinition(detectedModel);
            if (!modelDef) {
                throw new Error(`Model ${detectedModel} not found`);
            }

            // Create a temporary graph object for translation
            const tempGraph: GraphModel = {
                modelType: detectedModel,
                version: modelDef.version,
                schema: modelDef.schema,
                compatibilityMap: modelDef.compatibility,
                metadata: { source: 'external', normalized: true },
                ...(externalGraph as any)
            };

            // Translate to user's context
            return await this.translateGraph(tempGraph as any, userContextModel, context);

        } catch (error) {
            return {
                success: false,
                translationMap: {},
                lossyFields: [],
                addedFields: [],
                confidence: 0,
                metadata: {
                    translationType: 'normalization-failed',
                    duration: Date.now() - startTime
                },
                error: error as Error
            };
        }
    }

    /**
     * Get efficiency score for translation between models
     */
    getEfficiency(sourceModel: string, targetModel: string): number {
        if (sourceModel === targetModel) return 1.0;

        const translatorKey = `${sourceModel}->${targetModel}`;
        const translator = this.translators.get(translatorKey);

        if (!translator) {
            return 0.0;
        }

        return translator.getEfficiencyScore(sourceModel, targetModel);
    }

    /**
     * Get all available translators
     */
    getAvailableTranslators(): string[] {
        return Array.from(this.translators.keys());
    }

    /**
     * Register custom translator
     */
    registerTranslator(translator: GraphTranslator): void {
        const key = `${translator.sourceModel}->${translator.targetModel}`;
        this.translators.set(key, translator);
    }

    /**
     * Initialize standard translators for built-in models
     */
    private initializeStandardTranslators(): void {
        const modelTypes = ModelFactory.getModelNames();

        // Create translators for all model pairs
        for (const source of modelTypes) {
            for (const target of modelTypes) {
                if (source !== target) {
                    const translator = this.createStandardTranslator(source, target);
                    this.registerTranslator(translator);
                }
            }
        }
    }

    /**
     * Create standard translator for model pair
     */
    private createStandardTranslator(sourceModel: string, targetModel: string): GraphTranslator {
        const engine = this;
        return {
            name: `${sourceModel}-to-${targetModel}-translator`,
            sourceModel,
            targetModel,
            version: '1.0.0',
            async translate(sourceGraph: GraphModel, context: ETLContext): Promise<GraphTranslationResult> {
                const translatedGraph = await engine.performTranslation(sourceGraph, targetModel);
                const confidence = engine.calculateConfidence(sourceModel, targetModel);
                const efficiency = engine.calculateEfficiency(sourceModel, targetModel);

                return {
                    success: true,
                    translatedGraph,
                    translationMap: {}, // TODO: Implement field mapping
                    lossyFields: [], // TODO: Track lost fields
                    addedFields: [], // TODO: Track added fields
                    confidence,
                    metadata: {
                        translationType: 'standard',
                        efficiency,
                        sourceModel,
                        targetModel
                    }
                };
            },
            canTranslate(source: string, target: string): boolean {
                return source === sourceModel && target === targetModel;
            },
            getEfficiencyScore(source: string, target: string): number {
                return engine.calculateEfficiency(source, target);
            }
        };
    }

    /**
     * Perform the actual translation between models
     */
    private async performTranslation(
        sourceGraph: GraphModel,
        targetModel: string
    ): Promise<GraphModel> {
        const targetDef = ModelFactory.getModelDefinition(targetModel);
        if (!targetDef) {
            throw new Error(`Target model ${targetModel} not found`);
        }

        // Create new graph with target model structure
        const translatedGraph: GraphModel = {
            modelType: targetModel,
            version: targetDef.version,
            schema: targetDef.schema,
            compatibilityMap: targetDef.compatibility,
            metadata: {
                ...sourceGraph.metadata,
                translatedFrom: sourceGraph.modelType,
                translationTimestamp: new Date()
            }
        };

        // TODO: Implement field mapping and transformation logic
        // This would involve mapping fields from source to target based on schema compatibility

        return translatedGraph;
    }

    /**
     * Calculate confidence score for translation
     */
    private calculateConfidence(sourceModel: string, targetModel: string): number {
        const similarity = this.getModelSimilarity(sourceModel, targetModel);
        return Math.min(similarity, 0.95); // Cap at 0.95 to indicate some uncertainty
    }

    /**
     * Calculate efficiency score for translation
     */
    private calculateEfficiency(sourceModel: string, targetModel: string): number {
        const similarity = this.getModelSimilarity(sourceModel, targetModel);
        return similarity * 0.8; // Efficiency is typically lower than confidence
    }

    /**
     * Get similarity score between models
     */
    private getModelSimilarity(sourceModel: string, targetModel: string): number {
        const sourceDef = ModelFactory.getModelDefinition(sourceModel);
        const targetDef = ModelFactory.getModelDefinition(targetModel);

        if (!sourceDef || !targetDef) {
            return 0;
        }

        // Check if models are directly compatible
        if (sourceDef.compatibility.directCompatible.includes(targetModel)) {
            return 0.9;
        }

        // Check if translation is possible
        if (sourceDef.compatibility.translatableTo.includes(targetModel)) {
            return 0.7;
        }

        return 0.3; // Default low similarity for incompatible models
    }

    /**
     * Detect the model type of an external graph
     */
    private async detectGraphModel(externalGraph: unknown): Promise<string> {
        const graph = externalGraph as Record<string, any>;
        
        // Check for explicit model type
        if (graph.modelType && ModelFactory.isModelRegistered(graph.modelType)) {
            return graph.modelType;
        }

        // Check for model-specific fields
        const modelTypes = ModelFactory.getModelNames();
        for (const modelType of modelTypes) {
            const modelDef = ModelFactory.getModelDefinition(modelType);
            if (!modelDef) continue;

            // Check if graph has required fields for this model
            const requiredFields = Object.keys(modelDef.schema.entities);
            if (this.hasFields(graph, requiredFields)) {
                return modelType;
            }
        }

        // Default to content model if no match found
        return 'content';
    }

    /**
     * Check if object has all specified fields
     */
    private hasFields(obj: Record<string, any>, fields: string[]): boolean {
        return fields.every(field => field in obj);
    }
} 