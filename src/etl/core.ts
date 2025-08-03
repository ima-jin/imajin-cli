/**
 * ETL Core - Main exports for core ETL functionality
 * 
 * @package     @imajin/cli
 * @subpackage  etl/core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-08-02
 */

// Export everything from the core index
export * from './core/index.js';

// Export Pipeline class for backwards compatibility
export { Pipeline } from './core/index.js';

// Additional direct exports for common imports
export { ETLPipeline } from './core/ETLPipeline.js';
export { ETLContext } from './core/ETLContext.js';
export { ETLConfig } from './core/ETLConfig.js';
export { ETLResult } from './core/ETLResult.js';
export { ETLProgress } from './core/ETLProgress.js';
export { ETLEvents } from './core/ETLEvents.js';
export { Extractor } from './core/Extractor.js';
export { Loader } from './core/Loader.js';
export { Transformer } from './core/Transformer.js';