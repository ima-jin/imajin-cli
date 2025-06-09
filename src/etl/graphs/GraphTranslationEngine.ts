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
 *
 * Integration Points:
 * - Graph-to-graph translation for user communication
 * - Standard model compatibility and bridging
 * - Context normalization for external graphs
 * - Efficient communication paths between compatible models
 */

import { EventEmitter } from 'events';
import {
    BridgeConfiguration,
    ETLContext,
    FieldMapping,
    GraphModel,
    GraphTranslationResult,
    GraphTranslator,
    TransformationRule
} from '../core/interfaces.js';
import {
    STANDARD_MODELS,
    StandardModelType
} from './models.js';

/**
 * Main graph translation engine
 */
export class GraphTranslationEngine extends EventEmitter {
    private translators = new Map<string, GraphTranslator>();
    private bridges = new Map<string, BridgeConfiguration>();
    private modelRegistry = STANDARD_MODELS;

    constructor() {
        super();
        this.initializeStandardTranslators();
        this.generateStandardBridges();
    }

    /**
     * Check if two models can communicate directly (same model type)
     */
    canCommunicateDirectly(modelA: string, modelB: string): boolean {
        if (modelA === modelB && modelA in this.modelRegistry) {
            return true;
        }
        return false;
    }

    /**
     * Translate a graph from one model to another
     */
    async translateGraph<T extends GraphModel, U extends GraphModel>(
        sourceGraph: T,
        targetModel: StandardModelType,
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
        userContextModel: StandardModelType,
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

            // Create a temporary graph object for translation
            const tempGraph: GraphModel = {
                modelType: detectedModel as any,
                version: '1.0.0',
                schema: this.modelRegistry[detectedModel]?.schema || this.createFallbackSchema(),
                compatibilityMap: this.modelRegistry[detectedModel]?.compatibility || this.createFallbackCompatibility(),
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
     * Generate bridge configuration for translation between models
     */
    generateBridge(sourceModel: StandardModelType, targetModel: StandardModelType): BridgeConfiguration {
        const bridgeKey = `${sourceModel}->${targetModel}`;

        if (this.bridges.has(bridgeKey)) {
            return this.bridges.get(bridgeKey)!;
        }

        // Generate new bridge configuration
        const bridge = this.createBridge(sourceModel, targetModel);
        this.bridges.set(bridgeKey, bridge);

        return bridge;
    }

    /**
     * Get efficiency score for translation between models
     */
    getEfficiency(sourceModel: StandardModelType, targetModel: StandardModelType): number {
        if (sourceModel === targetModel) return 1.0;

        const bridge = this.generateBridge(sourceModel, targetModel);
        return bridge.efficiency;
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
        const modelTypes: StandardModelType[] = ['social-commerce', 'creative-portfolio', 'professional-network', 'community-hub'];

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
     * Generate standard bridge configurations
     */
    private generateStandardBridges(): void {
        const modelTypes: StandardModelType[] = ['social-commerce', 'creative-portfolio', 'professional-network', 'community-hub'];

        for (const source of modelTypes) {
            for (const target of modelTypes) {
                if (source !== target) {
                    this.generateBridge(source, target);
                }
            }
        }
    }

    /**
     * Create standard translator for model pair
     */
    private createStandardTranslator(sourceModel: StandardModelType, targetModel: StandardModelType): GraphTranslator {
        return {
            name: `${sourceModel}-to-${targetModel}`,
            sourceModel,
            targetModel,
            version: '1.0.0',

            translate: async (sourceGraph: GraphModel, _context: ETLContext): Promise<GraphTranslationResult> => {
                const mappings = this.getFieldMappings(sourceModel, targetModel);
                const translatedGraph = await this.performTranslation(sourceGraph, mappings, targetModel);

                return {
                    success: true,
                    translatedGraph,
                    translationMap: this.createTranslationMap(mappings),
                    lossyFields: this.identifyLossyFields(mappings),
                    addedFields: this.identifyAddedFields(mappings),
                    confidence: this.calculateConfidence(sourceModel, targetModel),
                    metadata: {
                        sourceModel,
                        targetModel,
                        mappingCount: mappings.length
                    }
                };
            },

            canTranslate: (source: string, target: string): boolean => {
                return source === sourceModel && target === targetModel;
            },

            getBridgeConfig: (): BridgeConfiguration => {
                return this.generateBridge(sourceModel, targetModel);
            },

            getEfficiencyScore: (source: string, target: string): number => {
                return this.calculateEfficiency(source as StandardModelType, target as StandardModelType);
            }
        };
    }

    /**
     * Create bridge configuration between models
     */
    private createBridge(sourceModel: StandardModelType, targetModel: StandardModelType): BridgeConfiguration {
        const mappings = this.getFieldMappings(sourceModel, targetModel);
        const transformations = this.getTransformationRules(sourceModel, targetModel);

        return {
            id: `${sourceModel}-${targetModel}-bridge`,
            sourceModel,
            targetModel,
            mappings,
            transformations,
            efficiency: this.calculateEfficiency(sourceModel, targetModel),
            lossyFields: this.identifyLossyFields(mappings),
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Get field mappings between models
     */
    private getFieldMappings(sourceModel: StandardModelType, targetModel: StandardModelType): FieldMapping[] {
        // Standard mappings that work across all models
        const baseMappings: FieldMapping[] = [
            {
                sourceField: 'identity.id',
                targetField: 'identity.id',
                required: true
            },
            {
                sourceField: 'identity.name',
                targetField: 'identity.name',
                required: true
            },
            {
                sourceField: 'identity.email',
                targetField: 'identity.email',
                required: true
            },
            {
                sourceField: 'social.connections',
                targetField: 'social.connections',
                required: false
            }
        ];

        // Model-specific mappings
        const specificMappings = this.getModelSpecificMappings(sourceModel, targetModel);

        return [...baseMappings, ...specificMappings];
    }

    /**
     * Get model-specific field mappings
     */
    private getModelSpecificMappings(sourceModel: StandardModelType, targetModel: StandardModelType): FieldMapping[] {
        const mappings: FieldMapping[] = [];

        // Social Commerce to Creative Portfolio
        if (sourceModel === 'social-commerce' && targetModel === 'creative-portfolio') {
            mappings.push(
                {
                    sourceField: 'catalog.products',
                    targetField: 'portfolio.artworks',
                    transformation: 'products-to-artworks',
                    required: false
                },
                {
                    sourceField: 'catalog.events',
                    targetField: 'portfolio.exhibitions',
                    transformation: 'events-to-exhibitions',
                    required: false
                }
            );
        }

        // Creative Portfolio to Social Commerce
        if (sourceModel === 'creative-portfolio' && targetModel === 'social-commerce') {
            mappings.push(
                {
                    sourceField: 'portfolio.artworks',
                    targetField: 'catalog.products',
                    transformation: 'artworks-to-products',
                    required: false
                },
                {
                    sourceField: 'portfolio.exhibitions',
                    targetField: 'catalog.events',
                    transformation: 'exhibitions-to-events',
                    required: false
                }
            );
        }

        // Professional Network mappings
        if (sourceModel === 'professional-network') {
            mappings.push({
                sourceField: 'experience.skills',
                targetField: targetModel === 'social-commerce' ? 'catalog.services' : 'metadata.skills',
                transformation: 'skills-to-services',
                required: false
            });
        }

        // Community Hub mappings
        if (sourceModel === 'community-hub') {
            mappings.push(
                {
                    sourceField: 'community.events',
                    targetField: 'catalog.events',
                    required: false
                },
                {
                    sourceField: 'resources.items',
                    targetField: 'catalog.products',
                    transformation: 'resources-to-products',
                    required: false
                }
            );
        }

        return mappings;
    }

    /**
     * Get transformation rules for model translation
     */
    private getTransformationRules(_sourceModel: StandardModelType, _targetModel: StandardModelType): TransformationRule[] {
        return [
            {
                name: 'products-to-artworks',
                sourceFields: ['catalog.products'],
                targetField: 'portfolio.artworks',
                rule: (products: any[]) => {
                    return products.map(product => ({
                        id: product.id,
                        title: product.name,
                        description: product.description,
                        medium: product.category,
                        year: new Date().getFullYear(),
                        price: product.price,
                        currency: product.currency,
                        isForSale: product.isActive,
                        images: product.images,
                        tags: product.tags,
                        created: product.created
                    }));
                }
            },
            {
                name: 'artworks-to-products',
                sourceFields: ['portfolio.artworks'],
                targetField: 'catalog.products',
                rule: (artworks: any[]) => {
                    return artworks.map(artwork => ({
                        id: artwork.id,
                        name: artwork.title,
                        description: artwork.description || `${artwork.medium} artwork from ${artwork.year}`,
                        price: artwork.price || 0,
                        currency: artwork.currency,
                        category: artwork.medium,
                        tags: artwork.tags,
                        images: artwork.images,
                        inventory: artwork.isForSale ? 1 : 0,
                        isActive: artwork.isForSale,
                        created: artwork.created
                    }));
                }
            },
            {
                name: 'events-to-exhibitions',
                sourceFields: ['catalog.events'],
                targetField: 'portfolio.exhibitions',
                rule: (events: any[]) => {
                    return events.map(event => ({
                        id: event.id,
                        title: event.title,
                        description: event.description,
                        venue: event.location || 'Virtual',
                        startDate: event.startDate,
                        endDate: event.endDate || event.startDate,
                        artworkIds: [],
                        isGroup: true,
                        created: event.created
                    }));
                }
            },
            {
                name: 'skills-to-services',
                sourceFields: ['experience.skills'],
                targetField: 'catalog.services',
                rule: (skills: any[]) => {
                    return skills.map(skill => ({
                        id: `skill-${skill.id}`,
                        name: skill.name,
                        description: `Professional ${skill.name} services`,
                        category: skill.category,
                        tags: [skill.level, ...skill.certifications],
                        isAvailable: true,
                        created: skill.created
                    }));
                }
            }
        ];
    }

    /**
     * Perform the actual translation
     */
    private async performTranslation(
        sourceGraph: GraphModel,
        mappings: FieldMapping[],
        targetModel: StandardModelType
    ): Promise<GraphModel> {
        const translated: any = {
            modelType: targetModel,
            version: '1.0.0',
            schema: this.modelRegistry[targetModel].schema,
            compatibilityMap: this.modelRegistry[targetModel].compatibility,
            metadata: {
                ...sourceGraph.metadata,
                translatedFrom: sourceGraph.modelType,
                translatedAt: new Date().toISOString()
            }
        };

        // Apply field mappings
        for (const mapping of mappings) {
            const sourceValue = this.getNestedValue(sourceGraph, mapping.sourceField);
            if (sourceValue !== undefined) {
                if (mapping.transformation) {
                    const transformationRule = this.getTransformationRules(sourceGraph.modelType as StandardModelType, targetModel)
                        .find(rule => rule.name === mapping.transformation);

                    if (transformationRule) {
                        const transformedValue = transformationRule.rule(sourceValue);
                        this.setNestedValue(translated, mapping.targetField, transformedValue);
                    }
                } else {
                    this.setNestedValue(translated, mapping.targetField, sourceValue);
                }
            } else if (mapping.required && mapping.defaultValue !== undefined) {
                this.setNestedValue(translated, mapping.targetField, mapping.defaultValue);
            }
        }

        return translated;
    }

    /**
     * Calculate translation confidence based on model compatibility
     */
    private calculateConfidence(sourceModel: StandardModelType, targetModel: StandardModelType): number {
        const efficiency = this.calculateEfficiency(sourceModel, targetModel);

        // Confidence is based on efficiency and model similarity
        const similarityBonus = this.getModelSimilarity(sourceModel, targetModel);

        return Math.min(0.95, efficiency * 0.7 + similarityBonus * 0.3);
    }

    /**
     * Calculate efficiency score between models
     */
    private calculateEfficiency(sourceModel: StandardModelType, targetModel: StandardModelType): number {
        if (sourceModel === targetModel) return 1.0;

        // Base efficiency scores between different model types
        const efficiencyMatrix: Record<string, Record<string, number>> = {
            'social-commerce': {
                'creative-portfolio': 0.75,
                'professional-network': 0.65,
                'community-hub': 0.80
            },
            'creative-portfolio': {
                'social-commerce': 0.75,
                'professional-network': 0.60,
                'community-hub': 0.70
            },
            'professional-network': {
                'social-commerce': 0.65,
                'creative-portfolio': 0.60,
                'community-hub': 0.85
            },
            'community-hub': {
                'social-commerce': 0.80,
                'creative-portfolio': 0.70,
                'professional-network': 0.85
            }
        };

        return efficiencyMatrix[sourceModel]?.[targetModel] || 0.50;
    }

    /**
     * Get model similarity score
     */
    private getModelSimilarity(sourceModel: StandardModelType, targetModel: StandardModelType): number {
        if (sourceModel === targetModel) return 1.0;

        // Models with similar concepts have higher similarity
        const similarityMatrix: Record<string, Record<string, number>> = {
            'social-commerce': {
                'creative-portfolio': 0.6, // Both have products/items for sale
                'professional-network': 0.4, // Both have profiles
                'community-hub': 0.7 // Both are social
            },
            'creative-portfolio': {
                'social-commerce': 0.6,
                'professional-network': 0.5, // Both showcase work
                'community-hub': 0.5
            },
            'professional-network': {
                'social-commerce': 0.4,
                'creative-portfolio': 0.5,
                'community-hub': 0.8 // Both are networking focused
            },
            'community-hub': {
                'social-commerce': 0.7,
                'creative-portfolio': 0.5,
                'professional-network': 0.8
            }
        };

        return similarityMatrix[sourceModel]?.[targetModel] || 0.3;
    }

    /**
     * Detect graph model type from external data
     */
    private async detectGraphModel(externalGraph: unknown): Promise<StandardModelType> {
        const graph = externalGraph as any;

        // Look for characteristic fields of each model
        if (graph.catalog?.products || graph.commerce?.transactions) {
            return 'social-commerce';
        }

        if (graph.portfolio?.artworks || graph.professional?.commissions) {
            return 'creative-portfolio';
        }

        if (graph.experience?.positions || graph.network?.recommendations) {
            return 'professional-network';
        }

        if (graph.community?.groups || graph.resources?.items) {
            return 'community-hub';
        }

        // Default fallback
        return 'social-commerce';
    }

    /**
     * Helper methods for nested object manipulation
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    private createTranslationMap(mappings: FieldMapping[]): Record<string, string> {
        const map: Record<string, string> = {};
        mappings.forEach(mapping => {
            map[mapping.sourceField] = mapping.targetField;
        });
        return map;
    }

    private identifyLossyFields(mappings: FieldMapping[]): string[] {
        return mappings
            .filter(mapping => mapping.transformation && mapping.transformation.includes('lossy'))
            .map(mapping => mapping.sourceField);
    }

    private identifyAddedFields(mappings: FieldMapping[]): string[] {
        return mappings
            .filter(mapping => mapping.defaultValue !== undefined)
            .map(mapping => mapping.targetField);
    }

    private createFallbackSchema(): any {
        return {
            version: '1.0.0',
            entities: {},
            relationships: {},
            constraints: {}
        };
    }

    private createFallbackCompatibility(): any {
        return {
            directCompatible: [],
            translatableFrom: ['custom'],
            translatableTo: ['custom'],
            bridgeRequired: []
        };
    }
} 