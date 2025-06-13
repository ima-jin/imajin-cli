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

// Core ETL Components
export { ETLPipeline } from './core/ETLPipeline';
export { ETLContext } from './core/ETLContext';
export { ETLConfig } from './core/ETLConfig';
export { ETLResult } from './core/ETLResult';
export { ETLProgress } from './core/ETLProgress';
export { ETLEvents } from './core/ETLEvents';
export { Extractor } from './core/Extractor';
export { Loader } from './core/Loader';
export { Transformer } from './core/Transformer';

// Graph Components
export { GraphExtractor } from './extractors/GraphExtractor';
export { GraphLoader } from './loaders/GraphLoader';
export { GraphTransformer } from './transformers/GraphTransformer';
export { GraphTranslationEngine as GraphTranslator } from './graphs/GraphTranslationEngine';

// Graph models and types
export * from './graphs/models.js';

// Types
export type {
    // Core Types
    PipelineStep,
    PipelineDefinition,
    PipelineResult,
    // Graph Types
    GraphSchema,
    GraphModel,
    GraphTranslationResult,
    GraphTransformationConfig,
    GraphExtractionConfig,
    GraphLoadingConfig
} from './core/interfaces';

