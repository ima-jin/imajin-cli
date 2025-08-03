/**
 * ETL Constants - Domain-specific constants for Extract, Transform, Load operations
 * 
 * @package     @imajin/cli
 * @subpackage  constants
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 */

// Default model versions
export const DEFAULT_MODEL_VERSIONS = {
    'social-commerce': '1.0.0',
    'creative-portfolio': '1.0.0',
    'professional-network': '1.0.0',
    'community-hub': '1.0.0'
} as const;

// Pipeline Step Messages
export const PIPELINE_MESSAGES = {
    INVALID_PIPELINE_ID: 'Invalid pipeline ID provided',
    PIPELINE_NOT_FOUND: 'Pipeline not found',
    EXECUTION_FAILED: 'Pipeline execution failed',
    MODEL_NOT_FOUND: 'Model not found',
    INVALID_MODEL_VERSION: 'Invalid model version',
    MODEL_VALIDATION_FAILED: 'Model validation failed'
} as const;

// Metrics and Debug Labels
export const DEBUG_LABELS = {
    GRAPH_TRANSLATION: 'GraphTranslation',
    PIPELINE_EXECUTION: 'PipelineExecution',
    MODEL_REGISTRY: 'ModelRegistry',
    PROMPT_REGISTRY: 'PromptRegistry'
} as const;

// Metadata version
export const METADATA_VERSION = '1.0.0' as const;

// Model Registry Events
export const MODEL_REGISTRY_EVENTS = {
    MODEL_REGISTERED: 'model:registered',
    MODEL_UNREGISTERED: 'model:unregistered',
    MODEL_UPDATED: 'model:updated',
    VALIDATION_FAILED: 'validation:failed'
} as const;

// Prompt Registry Events
export const PROMPT_REGISTRY_EVENTS = {
    PROMPT_REGISTERED: 'prompt:registered',
    PROMPT_UNREGISTERED: 'prompt:unregistered',
    PROMPT_UPDATED: 'prompt:updated',
    MODEL_NOT_FOUND: 'model:not_found'
} as const;

/**
 * All available model types in the system
 */
export const ALL_MODEL_TYPES = [
    'content',
    'interaction',
    'asset',
    'social-commerce',
    'creative-portfolio',
    'professional-network',
    'community-hub'
] as const;

