/**
 * CloudinaryProvider - Cloudinary cloud-based media provider
 * 
 * @package     @imajin/cli
 * @subpackage  media/providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 *
 * @see        docs/media/providers.md
 * 
 * Integration Points:
 * - Cloudinary upload API
 * - Advanced image/video transformations
 * - CDN delivery and optimization
 * - Automatic metadata extraction
 */

import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';

import type {
    ListOptions,
    MediaAsset,
    MediaMetadata,
    MediaProvider,
    Transformation,
    UploadOptions
} from '../../types/Media';

import { ExceptionUtils } from '../../exceptions/index';

export interface CloudinaryConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    secure: boolean;
    uploadPreset?: string;
}

export class CloudinaryProvider implements MediaProvider {
    public readonly name = 'cloudinary';
    private config: CloudinaryConfig;

    constructor(config: CloudinaryConfig) {
        this.config = config;

        // Configure Cloudinary
        cloudinary.config({
            cloud_name: config.cloudName,
            api_key: config.apiKey,
            api_secret: config.apiSecret,
            secure: config.secure
        });
    }

    /**
     * Upload a file to Cloudinary
     */
    public async upload(file: Buffer, options: UploadOptions): Promise<MediaAsset> {
        try {
            // Convert buffer to base64 data URI
            const dataUri = `data:application/octet-stream;base64,${file.toString('base64')}`;

            // Prepare upload options
            const uploadOptions: any = {
                public_id: options.fileName ? this.generatePublicId(options.fileName) : undefined,
                folder: options.folder,
                overwrite: options.overwrite,
                tags: options.tags,
                context: options.context,
                upload_preset: this.config.uploadPreset
            };

            // Add eager transformations
            if (options.eager && options.eager.length > 0) {
                uploadOptions.eager = options.eager.map(t => this.transformationToCloudinary(t));
            }

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

            // Convert result to MediaAsset
            const asset: MediaAsset = {
                id: result.public_id,
                originalName: options.fileName || 'unknown',
                fileName: result.public_id,
                mimeType: result.resource_type === 'image' ? `image/${result.format}` : `video/${result.format}`,
                size: result.bytes,
                url: result.secure_url,
                thumbnailUrl: result.eager?.[0]?.secure_url,
                provider: this.name,
                uploadedAt: new Date(result.created_at),
                metadata: this.extractMetadata(result),
                transformations: []
            };

            return asset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'upload',
                provider: this.name,
                fileName: options.fileName
            });
        }
    }

    /**
     * Transform an existing asset
     */
    public async transform(asset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset> {
        try {
            // Build transformation string
            const transformationString = transformations
                .map(t => this.transformationToCloudinary(t))
                .join('/');

            // Generate new URL with transformations
            const baseUrl = asset.url.split('/upload/')[0];
            const publicId = asset.id;
            const transformedUrl = `${baseUrl}/upload/${transformationString}/${publicId}`;

            // Create transformed asset
            const transformedAsset: MediaAsset = {
                ...asset,
                id: `${asset.id}_transformed_${uuidv4()}`,
                url: transformedUrl,
                transformations: [
                    ...(asset.transformations || []),
                    ...transformations.map(t => ({
                        id: uuidv4(),
                        transformation: t,
                        appliedAt: new Date(),
                        resultUrl: transformedUrl,
                        fileSize: asset.size, // Would need to fetch actual size
                        success: true
                    }))
                ]
            };

            return transformedAsset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'transform',
                provider: this.name,
                assetId: asset.id,
                transformations
            });
        }
    }

    /**
     * Delete an asset
     */
    public async delete(assetId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(assetId);
        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'delete',
                provider: this.name,
                assetId
            });
        }
    }

    /**
     * Get asset metadata
     */
    public async getMetadata(assetId: string): Promise<MediaMetadata> {
        try {
            const result = await cloudinary.api.resource(assetId);
            return this.extractMetadata(result);
        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'getMetadata',
                provider: this.name,
                assetId
            });
        }
    }

    /**
     * Get asset details
     */
    public async getAsset(assetId: string): Promise<MediaAsset> {
        try {
            const result = await cloudinary.api.resource(assetId);

            const asset: MediaAsset = {
                id: result.public_id,
                originalName: result.public_id,
                fileName: result.public_id,
                mimeType: result.resource_type === 'image' ? `image/${result.format}` : `video/${result.format}`,
                size: result.bytes,
                url: result.secure_url,
                provider: this.name,
                uploadedAt: new Date(result.created_at),
                metadata: this.extractMetadata(result),
                transformations: []
            };

            return asset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'getAsset',
                provider: this.name,
                assetId
            });
        }
    }

    /**
     * List assets
     */
    public async listAssets(options: ListOptions): Promise<MediaAsset[]> {
        try {
            const searchOptions: any = {
                resource_type: options.resourceType || 'image',
                max_results: options.limit || 100,
                next_cursor: options.offset
            };

            if (options.folder) {
                searchOptions.prefix = options.folder;
            }

            if (options.tags && options.tags.length > 0) {
                searchOptions.tags = options.tags;
            }

            const result = await cloudinary.search
                .expression(this.buildSearchExpression(options))
                .sort_by(options.sortBy || 'created_at', options.sortOrder || 'desc')
                .execute();

            const assets: MediaAsset[] = result.resources.map((resource: any) => ({
                id: resource.public_id,
                originalName: resource.public_id,
                fileName: resource.public_id,
                mimeType: resource.resource_type === 'image' ? `image/${resource.format}` : `video/${resource.format}`,
                size: resource.bytes,
                url: resource.secure_url,
                provider: this.name,
                uploadedAt: new Date(resource.created_at),
                metadata: this.extractMetadata(resource),
                transformations: []
            }));

            return assets;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'listAssets',
                provider: this.name,
                options
            });
        }
    }

    /**
     * Convert transformation to Cloudinary format
     */
    private transformationToCloudinary(transformation: Transformation): string {
        const { type, params } = transformation;

        switch (type) {
            case 'resize':
                return `w_${params.width || 'auto'},h_${params.height || 'auto'},c_${params.crop || 'fill'}`;

            case 'crop':
                return `w_${params.width || 'auto'},h_${params.height || 'auto'},c_crop,g_${params.gravity || 'center'}`;

            case 'format':
                return `f_${params.format}`;

            case 'quality':
                return `q_${params.quality || 'auto'}`;

            case 'rotate':
                return `a_${params.angle || 0}`;

            case 'blur':
                return `e_blur:${params.radius || 300}`;

            case 'sharpen':
                return `e_sharpen:${params.amount || 100}`;

            case 'brightness':
                return `e_brightness:${params.level || 0}`;

            case 'contrast':
                return `e_contrast:${params.level || 0}`;

            case 'saturation':
                return `e_saturation:${params.level || 0}`;

            case 'watermark':
                return `l_text:${params.font || 'arial_60'}:${params.text || ''},co_${params.color || 'white'},o_${params.opacity || 50}`;

            case 'optimize':
                return `f_auto,q_${params.quality || 'auto'}`;

            case 'thumbnail':
                return `w_${params.width || 150},h_${params.height || 150},c_thumb`;

            default:
                return '';
        }
    }

    /**
     * Extract metadata from Cloudinary response
     */
    private extractMetadata(result: any): MediaMetadata {
        const metadata: MediaMetadata = {
            format: result.format,
            capturedAt: new Date(result.created_at),
            tags: result.tags || []
        };

        if (result.width) metadata.width = result.width;
        if (result.height) metadata.height = result.height;
        if (result.duration) metadata.duration = result.duration;
        if (result.bit_rate) metadata.bitrate = result.bit_rate;
        if (result.frame_rate) metadata.frameRate = result.frame_rate;
        if (result.aspect_ratio) metadata.aspectRatio = result.aspect_ratio;
        if (result.audio) metadata.hasAudio = result.audio.codec !== null;
        if (result.video) metadata.codec = result.video.codec;

        // Extract EXIF data if available
        if (result.image_metadata) {
            metadata.exif = result.image_metadata;

            // Extract device info from EXIF
            if (result.image_metadata.Make || result.image_metadata.Model) {
                metadata.deviceInfo = {
                    make: result.image_metadata.Make,
                    model: result.image_metadata.Model,
                    software: result.image_metadata.Software,
                    iso: result.image_metadata.ISO,
                    focalLength: result.image_metadata.FocalLength,
                    aperture: result.image_metadata.FNumber,
                    shutterSpeed: result.image_metadata.ExposureTime
                };
            }

            // Extract GPS data if available
            if (result.image_metadata.GPSLatitude && result.image_metadata.GPSLongitude) {
                metadata.location = {
                    latitude: result.image_metadata.GPSLatitude,
                    longitude: result.image_metadata.GPSLongitude,
                    altitude: result.image_metadata.GPSAltitude
                };
            }
        }

        return metadata;
    }

    /**
     * Build search expression for Cloudinary
     */
    private buildSearchExpression(options: ListOptions): string {
        const expressions: string[] = [];

        if (options.resourceType) {
            expressions.push(`resource_type:${options.resourceType}`);
        }

        if (options.folder) {
            expressions.push(`folder:${options.folder}/*`);
        }

        if (options.tags && options.tags.length > 0) {
            expressions.push(`tags:(${options.tags.join(' OR ')})`);
        }

        return expressions.length > 0 ? expressions.join(' AND ') : 'resource_type:image';
    }

    /**
     * Generate public ID from filename
     */
    private generatePublicId(fileName: string): string {
        // Remove extension and special characters
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const cleanName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${cleanName}_${Date.now()}`;
    }
} 