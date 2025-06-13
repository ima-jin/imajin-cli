/**
 * ETL Core Interfaces - Foundation interfaces for ETL pipeline components
 * 
 * @package     @imajin/cli
 * @subpackage  etl/core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Event system for progress tracking
 * - Validation with Zod schemas  
 * - Error handling for pipeline failures
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * Base context for all ETL operations
 */
export interface ETLContext {
    readonly id: string;
    readonly pipelineId: string;
    readonly metadata: Record<string, any>;
    readonly startTime: Date;
    events: EventEmitter;
}

/**
 * Progress information for ETL operations
 */
export interface ETLProgress {
    readonly stage: 'extract' | 'transform' | 'load';
    readonly step: string;
    readonly processed: number;
    readonly total?: number;
    readonly percentage?: number;
    readonly message?: string;
    readonly data?: any;
}

/**
 * Result of an ETL operation
 */
export interface ETLResult<T = any> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: Error;
    readonly processed: number;
    readonly metadata: Record<string, any>;
    readonly duration: number;
}

/**
 * Configuration for ETL operations
 */
export interface ETLConfig {
    readonly batchSize?: number;
    readonly maxRetries?: number;
    readonly timeout?: number;
    readonly parallel?: boolean;
    readonly maxConcurrency?: number;
    readonly validateInput?: boolean;
    readonly validateOutput?: boolean;
}

/**
 * Extractor interface - Responsible for data extraction from sources
 */
export interface Extractor<TOutput = any> {
    readonly name: string;
    readonly description?: string;
    readonly outputSchema?: z.ZodSchema<TOutput>;

    /**
     * Extract data from the configured source
     */
    extract(context: ETLContext, config?: ETLConfig): Promise<ETLResult<TOutput[]>>;

    /**
     * Validate extractor configuration
     */
    validate?(config?: ETLConfig): Promise<boolean>;

    /**
     * Get metadata about the extraction source
     */
    getMetadata?(): Promise<Record<string, any>>;
}

/**
 * Transformer interface - Responsible for data transformation
 */
export interface Transformer<TInput = any, TOutput = any> {
    readonly name: string;
    readonly description?: string;
    readonly inputSchema?: z.ZodSchema<TInput>;
    readonly outputSchema?: z.ZodSchema<TOutput>;

    /**
     * Transform input data to output format
     */
    transform(data: TInput[], context: ETLContext, config?: ETLConfig): Promise<ETLResult<TOutput[]>>;

    /**
     * Transform a single item (for streaming/batch processing)
     */
    transformItem?(item: TInput, context: ETLContext): Promise<TOutput>;

    /**
     * Validate transformation rules
     */
    validate?(config?: ETLConfig): Promise<boolean>;
}

/**
 * Loader interface - Responsible for loading data to destinations
 */
export interface Loader<TInput = any> {
    readonly name: string;
    readonly description?: string;
    readonly inputSchema?: z.ZodSchema<TInput>;

    /**
     * Load data to the configured destination
     */
    load(data: TInput[], context: ETLContext, config?: ETLConfig): Promise<ETLResult<any>>;

    /**
     * Load a single item (for streaming operations)
     */
    loadItem?(item: TInput, context: ETLContext): Promise<any>;

    /**
     * Validate loader configuration and connectivity
     */
    validate?(config?: ETLConfig): Promise<boolean>;

    /**
     * Handle conflicts during loading (upsert, skip, error)
     */
    handleConflict?(existing: any, incoming: TInput, context: ETLContext): Promise<TInput>;
}

/**
 * Pipeline step definition
 */
export interface PipelineStep {
    readonly name: string;
    readonly type: 'extract' | 'transform' | 'load';
    readonly component: Extractor | Transformer | Loader;
    readonly config?: ETLConfig;
    readonly condition?: (context: ETLContext, data: any[]) => Promise<boolean>;
}

/**
 * Pipeline definition
 */
export interface PipelineDefinition {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly steps: PipelineStep[];
    readonly config?: ETLConfig;
    readonly schedule?: string; // Cron expression
    readonly retry?: {
        maxAttempts: number;
        backoffMs: number;
        exponential: boolean;
    };
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
    readonly pipelineId: string;
    readonly success: boolean;
    readonly startTime: Date;
    readonly endTime: Date;
    readonly duration: number;
    readonly stepsExecuted: number;
    readonly totalProcessed: number;
    readonly results: ETLResult[];
    readonly error?: Error;
    readonly metadata: Record<string, any>;
}

/**
 * Events emitted during ETL operations
 */
export interface ETLEvents {
    'progress': (progress: ETLProgress) => void;
    'step:start': (step: string, context: ETLContext) => void;
    'step:complete': (step: string, result: ETLResult, context: ETLContext) => void;
    'step:error': (step: string, error: Error, context: ETLContext) => void;
    'pipeline:start': (pipelineId: string, context: ETLContext) => void;
    'pipeline:complete': (pipelineId: string, result: PipelineResult, context: ETLContext) => void;
    'pipeline:error': (pipelineId: string, error: Error, context: ETLContext) => void;
    'data:extracted': (count: number, context: ETLContext) => void;
    'data:transformed': (count: number, context: ETLContext) => void;
    'data:loaded': (count: number, context: ETLContext) => void;
}

/**
 * Graph schema definition for standard models
 */
export interface GraphSchema {
    readonly version: string;
    readonly entities: Record<string, z.ZodSchema>;
    readonly relationships: Record<string, z.ZodSchema>;
    readonly constraints: Record<string, any>;
}

/**
 * Compatibility matrix between graph models
 */
export interface CompatibilityMatrix {
    readonly directCompatible: string[];
    readonly translatableFrom: string[];
    readonly translatableTo: string[];
}

/**
 * Base graph model interface
 */
export interface GraphModel {
    readonly modelType: string;
    readonly version: string;
    readonly schema: GraphSchema;
    readonly compatibilityMap: CompatibilityMatrix;
    readonly metadata: Record<string, any>;
}

/**
 * Graph translation result
 */
export interface GraphTranslationResult<T extends GraphModel = GraphModel> {
    readonly success: boolean;
    readonly translatedGraph?: T;
    readonly translationMap: Record<string, string>;
    readonly lossyFields: string[];
    readonly addedFields: string[];
    readonly confidence: number; // 0-1, how confident the translation is
    readonly metadata: Record<string, any>;
    readonly error?: Error;
}

/**
 * Graph translator interface
 */
export interface GraphTranslator<TSource extends GraphModel = GraphModel, TTarget extends GraphModel = GraphModel> {
    readonly name: string;
    readonly sourceModel: string;
    readonly targetModel: string;
    readonly version: string;

    /**
     * Translate from source graph model to target graph model
     */
    translate(sourceGraph: TSource, context: ETLContext): Promise<GraphTranslationResult<TTarget>>;

    /**
     * Check if this translator can handle the given model pair
     */
    canTranslate(sourceModel: string, targetModel: string): boolean;

    /**
     * Get efficiency score (higher = less transformation needed)
     */
    getEfficiencyScore(sourceModel: string, targetModel: string): number;

    /**
     * Validate translation configuration
     */
    validate?(sourceGraph: TSource): Promise<boolean>;
}

/**
 * Graph transformation configuration
 */
export interface GraphTransformationConfig extends ETLConfig {
    readonly targetModel: string;
    readonly preserveMetadata?: boolean;
    readonly allowLossyTranslation?: boolean;
}

/**
 * Graph extraction configuration
 */
export interface GraphExtractionConfig extends ETLConfig {
    readonly endpoint: string;
    readonly modelType?: string;
    readonly autoDetectModel?: boolean;
    readonly authentication?: {
        type: 'bearer' | 'api-key' | 'oauth';
        credentials: Record<string, string>;
    };
}

/**
 * Graph extractor interface
 */
export interface GraphExtractor<TOutput extends GraphModel = GraphModel> extends Extractor<TOutput> {
    /**
     * Extract graph data from external source
     */
    extractGraph(config: GraphExtractionConfig, context: ETLContext): Promise<ETLResult<TOutput>>;

    /**
     * Detect the graph model type of the source
     */
    detectModel(config: GraphExtractionConfig): Promise<string>;

    /**
     * Get compatibility information for the source
     */
    getCompatibility(config: GraphExtractionConfig): Promise<CompatibilityMatrix>;
}

/**
 * Graph loading configuration
 */
export interface GraphLoadingConfig extends ETLConfig {
    readonly endpoint: string;
    readonly mergeStrategy: 'replace' | 'merge' | 'append';
    readonly conflictResolution: 'error' | 'skip' | 'overwrite';
    readonly authentication?: {
        type: 'bearer' | 'api-key' | 'oauth';
        credentials: Record<string, string>;
    };
}

/**
 * Graph loader interface
 */
export interface GraphLoader<TInput extends GraphModel = GraphModel> extends Loader<TInput> {
    /**
     * Load graph data to target destination
     */
    loadGraph(graph: TInput, config: GraphLoadingConfig, context: ETLContext): Promise<ETLResult<any>>;

    /**
     * Handle graph merge conflicts
     */
    handleGraphConflict(
        existing: TInput,
        incoming: TInput,
        context: ETLContext
    ): Promise<TInput>;
} 