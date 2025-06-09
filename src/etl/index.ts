/**
 * ETL System - Main exports for imajin-cli ETL pipeline system
 * 
 * @package     @imajin/cli
 * @subpackage  etl
 * @author      Claude
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Complete ETL system for data processing workflows
 * - Event-driven architecture for progress tracking
 * - TypeScript type safety throughout the pipeline
 */

// Core interfaces and types
export * from './core/interfaces.js';

// Base classes for extensibility
export { BaseExtractor, BaseExtractorConfig } from './extractors/BaseExtractor.js';
export { BaseLoader, BaseLoaderConfig, ConflictResolution, LoadOperation } from './loaders/BaseLoader.js';
export { BaseTransformer, BaseTransformerConfig, TransformRule } from './transformers/BaseTransformer.js';

// Main pipeline orchestration
export { Pipeline, PipelineExecutionOptions, PipelineExecutionState } from './Pipeline.js';

// Graph translation system
export { BridgeRegistry } from './bridges/BridgeRegistry.js';
export { GraphTranslationEngine } from './graphs/GraphTranslationEngine.js';
export { GraphLoader } from './loaders/GraphLoader.js';
export { GraphTransformer } from './transformers/GraphTransformer.js';

// Graph models and schemas
export * from './graphs/models.js';

// Re-export for convenience
export type {
    BridgeConfiguration, ETLConfig, ETLContext, ETLEvents, ETLProgress, ETLResult, Extractor, GraphExtractionConfig, GraphExtractor, GraphLoadingConfig, GraphModel, GraphTransformationConfig, GraphTranslationResult, GraphTranslator, GraphLoader as IGraphLoader, GraphTransformer as IGraphTransformer, Loader,
    PipelineDefinition, PipelineResult, PipelineStep, Transformer
} from './core/interfaces.js';

