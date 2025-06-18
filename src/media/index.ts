/**
 * Media Processing System Exports
 * 
 * @package     @imajin/cli
 * @subpackage  media
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-10
 */

// Core processor
export { MediaProcessor } from './MediaProcessor.js';

// Providers
export { CloudinaryProvider } from './providers/CloudinaryProvider.js';
export { LocalMediaProvider } from './providers/LocalMediaProvider.js';

// Transformations
export { ImageTransformer } from './transformations/ImageTransformer.js';

// Metadata
export { MetadataExtractor } from './metadata/MetadataExtractor.js';

// Types (re-export from types directory)
export type {
    BatchOperation, CDNConfig, CropMode, DeviceInfo, GeoLocation, GravityMode, ListOptions, MediaAsset, MediaLimits, MediaMetadata,
    MediaProcessingConfig, MediaProcessingEvent, MediaProcessingOptions, MediaProvider, OptimizationConfig, OutputFormat, Position, ProviderConfig, Transformation, TransformationParams,
    TransformationRecord, TransformationType, UploadOptions, VideoCodec
} from '../types/Media.js';

