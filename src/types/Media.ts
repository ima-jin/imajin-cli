/**
 * Media Processing Types
 * 
 * @package     @imajin/cli
 * @subpackage  types
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-04
 */

export interface MediaAsset {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    thumbnailUrl?: string;
    provider: string;
    uploadedAt: Date;
    metadata: MediaMetadata;
    transformations: TransformationRecord[]; // Always defined, empty array by default
}

export interface MediaMetadata {
    width?: number;
    height?: number;
    duration?: number; // Video duration in seconds
    format: string;
    quality?: number;
    colorSpace?: string;
    hasAudio?: boolean;
    codec?: string;
    bitrate?: number;
    frameRate?: number;
    aspectRatio?: string;
    orientation?: number;
    location?: GeoLocation;
    capturedAt?: Date;
    deviceInfo?: DeviceInfo;
    tags?: string[];
    description?: string;
    exif?: Record<string, any>;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
}

export interface DeviceInfo {
    make?: string;
    model?: string;
    software?: string;
    lens?: string;
    iso?: number;
    focalLength?: number;
    aperture?: number;
    shutterSpeed?: string;
}

export interface UploadOptions {
    public?: boolean;
    folder?: string;
    fileName?: string;
    overwrite?: boolean;
    tags?: string[];
    context?: Record<string, any>;
    eager?: Transformation[];
    notification_url?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

export interface Transformation {
    type: TransformationType;
    params: TransformationParams;
}

export type TransformationType = string; // Allow any string for transformation types including: resize, crop, format, quality, rotate, blur, sharpen, brightness, contrast, saturation, watermark, overlay, video_transcode, thumbnail, optimize

export interface TransformationParams {
    width?: number;
    height?: number;
    crop?: CropMode;
    gravity?: GravityMode;
    format?: OutputFormat;
    quality?: number;
    angle?: number;
    radius?: number;
    amount?: number;
    level?: number;
    text?: string;
    font?: string;
    color?: string;
    position?: Position;
    overlay?: string;
    opacity?: number;
    codec?: VideoCodec;
    bitrate?: string;
    fps?: number;
    startTime?: number;
    endTime?: number;
}

export type CropMode = 'fill' | 'fit' | 'crop' | 'pad' | 'scale';
export type GravityMode = 'center' | 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
export type OutputFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif' | 'gif' | 'bmp' | 'tiff' | 'mp4' | 'webm' | 'mov' | 'avi';
export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9' | 'av1';
export type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface TransformationRecord {
    id: string;
    transformation: Transformation;
    appliedAt: Date;
    resultUrl: string;
    fileSize: number;
    duration?: number; // Processing time in ms
    success: boolean;
    error?: string;
}

/**
 * @deprecated Use BaseService-based services instead (CloudinaryService, LocalFileService)
 * This interface will be removed in a future version
 * 
 * Legacy MediaProvider interface - replaced by proper service architecture.
 * New implementations should extend BaseService and implement proper:
 * - Health checks and metrics
 * - Event-driven coordination  
 * - Container-based dependency injection
 * - Structured error handling
 */
export interface MediaProvider {
    name: string;
    upload(file: Buffer, options: UploadOptions): Promise<MediaAsset>;
    transform(asset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset>;
    delete(assetId: string): Promise<void>;
    getMetadata(assetId: string): Promise<MediaMetadata>;
    getAsset(assetId: string): Promise<MediaAsset>;
    listAssets(options: ListOptions): Promise<MediaAsset[]>;
}

export interface ListOptions {
    folder?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'name' | 'size';
    sortOrder?: 'asc' | 'desc';
    resourceType?: 'image' | 'video' | 'raw';
}

export interface MediaProcessingConfig {
    defaultProvider: string;
    providers: {
        [key: string]: ProviderConfig;
    };
    optimization: OptimizationConfig;
    limits: MediaLimits;
    cdnConfig?: CDNConfig;
}

export interface ProviderConfig {
    type: 'cloudinary' | 'aws' | 'gcp' | 'local';
    credentials: Record<string, string>;
    settings: Record<string, any>;
    enabled: boolean;
}

export interface OptimizationConfig {
    autoOptimize: boolean;
    defaultQuality: number;
    defaultFormat: OutputFormat;
    generateThumbnails: boolean;
    thumbnailSizes: Array<{ width: number; height: number }>;
    enableWebP: boolean;
    enableAVIF: boolean;
}

export interface MediaLimits {
    maxFileSize: number; // in bytes
    maxWidth: number;
    maxHeight: number;
    maxDuration: number; // in seconds for videos
    allowedFormats: string[];
    allowedMimeTypes: string[];
}

export interface CDNConfig {
    enabled: boolean;
    baseUrl: string;
    cacheTTL: number;
    compressionEnabled: boolean;
}

export interface BatchOperation {
    id: string;
    type: 'upload' | 'transform' | 'delete' | 'optimize';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    startedAt: Date;
    completedAt?: Date;
    progress: {
        total: number;
        completed: number;
        failed: number;
        errors: Array<{ fileName: string; error: string; }>;
    };
    results: Array<{
        success: boolean;
        asset?: MediaAsset;
        fileName?: string;
        error?: string;
    }>;
    error?: string;
}

export interface MediaProcessingEvent {
    type: 'upload.started' | 'upload.completed' | 'upload.failed' |
    'transform.started' | 'transform.completed' | 'transform.failed' |
    'batch.started' | 'batch.progress' | 'batch.completed' | 'batch.failed' |
    'asset.deleted';
    assetId?: string;
    batchId?: string;
    data: Record<string, any>;
    timestamp: Date;
}

export interface MediaProcessingOptions {
    provider?: string;
    eager?: boolean;
    callback?: string;
    context?: Record<string, any>;
    tags?: string[];
    folder?: string;
    public?: boolean;
    overwrite?: boolean;
}

/**
 * Cloudinary Upload Response Interface
 */
export interface CloudinaryUploadResponse {
    public_id: string;
    version: number;
    signature: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    tags: string[];
    bytes: number;
    type: string;
    etag: string;
    placeholder: boolean;
    url: string;
    secure_url: string;
    duration?: number; // For video uploads
}

/**
 * Media Asset Collection with Pagination
 */
export interface MediaAssetCollection {
    assets: MediaAsset[];      // Collection of media assets
    nextCursor?: string;       // Pagination cursor
    total: number;             // Total number of assets
} 