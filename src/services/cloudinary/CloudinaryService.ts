/**
 * CloudinaryService - Cloudinary cloud-based media service
 * 
 * @package     @imajin/cli
 * @subpackage  services/cloudinary
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-04
 *
 * Integration Points:
 * - Cloudinary upload API
 * - Advanced image/video transformations
 * - CDN delivery and optimization
 * - Automatic metadata extraction
 * - BaseService compliance with health checks and metrics
 */

import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import type { EventEmitter } from 'events';
import type { Container } from '../../container/Container.js';
import { BaseService } from '../BaseService.js';
import type { ServiceConfig } from '../interfaces/ServiceInterface.js';
import type {
    ListOptions,
    MediaAsset,
    MediaAssetCollection,
    MediaMetadata,
    Transformation,
    UploadOptions,
    CloudinaryUploadResponse
} from '../../types/Media.js';

export interface CloudinaryConfig extends ServiceConfig {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    secure: boolean;
    uploadPreset?: string;
}

export class CloudinaryService extends BaseService {
    private cloudinary: any;
    private cloudinaryConfig: CloudinaryConfig;

    constructor(
        container: Container,
        config: CloudinaryConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.cloudinaryConfig = config;
        this.initializeCloudinary();
    }

    public getName(): string {
        return 'cloudinary';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    private initializeCloudinary(): void {
        cloudinary.config({
            cloud_name: this.cloudinaryConfig.cloudName,
            api_key: this.cloudinaryConfig.apiKey,
            api_secret: this.cloudinaryConfig.apiSecret,
            secure: this.cloudinaryConfig.secure
        });
        
        this.cloudinary = cloudinary;
    }

    protected async onInitialize(): Promise<void> {
        this.emit('service:ready', { service: 'cloudinary' });
        this.logger.info('CloudinaryService initialized', {
            cloudName: this.cloudinaryConfig.cloudName,
            secure: this.cloudinaryConfig.secure
        });
    }

    protected async onShutdown(): Promise<void> {
        this.emit('service:shutdown', { service: 'cloudinary' });
        this.logger.info('CloudinaryService shut down');
    }

    protected async onHealthCheck(): Promise<Array<{ name: string; healthy: boolean; message?: string; }>> {
        try {
            // Test Cloudinary connectivity
            await this.cloudinary.api.resources({ max_results: 1 });
            return [{
                name: 'cloudinary-api',
                healthy: true,
                message: 'Cloudinary API accessible'
            }];
        } catch (error) {
            return [{
                name: 'cloudinary-api',
                healthy: false,
                message: `Cloudinary API error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }];
        }
    }

    // ==========================================================================
    // MEDIA OPERATIONS WITH METRICS TRACKING
    // ==========================================================================

    /**
     * Upload a file to Cloudinary
     */
    async upload(file: Buffer, options: UploadOptions): Promise<MediaAsset> {
        return this.execute('upload', async () => {
            // Convert buffer to base64 data URI
            const dataUri = `data:application/octet-stream;base64,${file.toString('base64')}`;

            // Prepare upload options
            const uploadOptions: any = {
                public_id: options.fileName ? this.generatePublicId(options.fileName) : undefined,
                folder: options.folder,
                overwrite: options.overwrite,
                tags: options.tags,
                context: options.context,
                upload_preset: this.cloudinaryConfig.uploadPreset
            };

            // Add eager transformations
            if (options.eager && options.eager.length > 0) {
                uploadOptions.eager = options.eager.map(t => this.transformationToCloudinary(t));
            }

            // Upload to Cloudinary
            const result = await this.cloudinary.uploader.upload(dataUri, uploadOptions);

            // Convert result to MediaAsset
            const asset: MediaAsset = {
                id: result.public_id,
                originalName: options.fileName || 'unknown',
                fileName: result.public_id,
                mimeType: result.resource_type === 'image' ? `image/${result.format}` : `video/${result.format}`,
                size: result.bytes,
                url: result.secure_url,
                thumbnailUrl: result.eager?.[0]?.secure_url,
                provider: this.getName(),
                uploadedAt: new Date(result.created_at),
                metadata: this.extractMetadata(result),
                transformations: []
            };

            this.logger.info('File uploaded to Cloudinary', {
                assetId: asset.id,
                size: asset.size,
                mimeType: asset.mimeType
            });

            return asset;
        });
    }

    /**
     * Transform media with proper type handling
     */
    async transform(originalAsset: MediaAsset, transformations: Transformation[]): Promise<MediaAsset> {
        return this.execute('transform', async () => {
            const transformResults = [];

            for (const transformation of transformations) {
                try {
                    const cloudinaryTransform = this.transformationToCloudinary(transformation);
                    const resultUrl = this.cloudinary.url(originalAsset.id, { transformation: cloudinaryTransform });
                    
                    transformResults.push({
                        id: uuidv4(),
                        transformation,
                        appliedAt: new Date(),
                        resultUrl,
                        fileSize: originalAsset.size, // Would need to fetch actual size
                        success: true
                    });
                } catch (error) {
                    transformResults.push({
                        id: uuidv4(),
                        transformation,
                        appliedAt: new Date(),
                        resultUrl: '',
                        fileSize: 0,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        success: false
                    });
                }
            }

            const transformedAsset: MediaAsset = {
                ...originalAsset,
                id: `${originalAsset.id}_transformed_${uuidv4()}`,
                url: transformResults.find(r => r.success)?.resultUrl || originalAsset.url,
                transformations: [
                    ...originalAsset.transformations,
                    ...transformResults
                ]
            };

            this.logger.info('Asset transformed', {
                originalId: originalAsset.id,
                transformedId: transformedAsset.id,
                transformations: transformations.length
            });

            return transformedAsset;
        });
    }

    /**
     * Delete asset from Cloudinary
     */
    async delete(assetId: string): Promise<void> {
        return this.execute('delete', async () => {
            await this.cloudinary.uploader.destroy(assetId);
            this.logger.info('Asset deleted from Cloudinary', { assetId });
        });
    }

    /**
     * Get metadata for a specific asset
     */
    async getMetadata(assetId: string): Promise<MediaMetadata> {
        return this.execute('getMetadata', async () => {
            const result = await this.cloudinary.api.resource(assetId);
            return this.extractMetadata(result);
        });
    }

    /**
     * Get asset by ID
     */
    async getAsset(assetId: string): Promise<MediaAsset> {
        return this.execute('getAsset', async () => {
            const result = await this.cloudinary.api.resource(assetId);
            
            const asset: MediaAsset = {
                id: result.public_id,
                originalName: result.public_id,
                fileName: result.public_id,
                mimeType: result.resource_type === 'image' ? `image/${result.format}` : `video/${result.format}`,
                size: result.bytes,
                url: result.secure_url,
                provider: this.getName(),
                uploadedAt: new Date(result.created_at),
                metadata: this.extractMetadata(result),
                transformations: []
            };

            return asset;
        });
    }

    /**
     * List media assets with proper pagination
     */
    async listMedia(options: ListOptions = {}): Promise<MediaAssetCollection> {
        return this.execute('listMedia', async () => {
            const result = await this.cloudinary.api.resources({
                type: 'upload',
                max_results: options.limit || 50,
                next_cursor: options.offset ? String(options.offset) : undefined,
                resource_type: options.resourceType || 'image',
                ...options
            });

            const assets = result.resources.map((resource: any) => 
                this.mapToBusinessContext('media', resource)
            );

            return {
                assets,
                nextCursor: result.next_cursor,
                total: result.total_count || assets.length
            };
        });
    }

    /**
     * List assets (legacy method for compatibility)
     */
    async listAssets(options: ListOptions): Promise<MediaAssetCollection> {
        return this.execute('listAssets', async () => {
            const result = await this.cloudinary.api.resources({
                type: 'upload',
                max_results: options.limit || 50,
                next_cursor: options.offset ? String(options.offset) : undefined,
                resource_type: options.resourceType || 'image',
                folder: options.folder,
                tags: options.tags
            });

            const assets = result.resources.map((resource: any) => {
                const asset: MediaAsset = {
                    id: resource.public_id,
                    originalName: resource.public_id,
                    fileName: resource.public_id,
                    mimeType: resource.resource_type === 'image' ? `image/${resource.format}` : `video/${resource.format}`,
                    size: resource.bytes,
                    url: resource.secure_url,
                    provider: this.getName(),
                    uploadedAt: new Date(resource.created_at),
                    metadata: this.extractMetadata(resource),
                    transformations: []
                };
                return asset;
            });

            return {
                assets,
                nextCursor: result.next_cursor,
                total: result.total_count || assets.length
            };
        });
    }

    /**
     * Get service capabilities
     */
    getCapabilities(): string[] {
        return [
            'media-upload',
            'media-transformation', 
            'media-optimization',
            'media-delivery',
            'business-context-mapping'
        ];
    }

    /**
     * Map to business context
     */
    private mapToBusinessContext(entityType: string, cloudinaryData: any): MediaAsset {
        return {
            id: cloudinaryData.public_id,
            originalName: cloudinaryData.public_id,
            fileName: cloudinaryData.public_id,
            mimeType: cloudinaryData.resource_type === 'image' ? `image/${cloudinaryData.format}` : `video/${cloudinaryData.format}`,
            size: cloudinaryData.bytes,
            url: cloudinaryData.secure_url,
            provider: this.getName(),
            uploadedAt: new Date(cloudinaryData.created_at),
            metadata: this.extractMetadata(cloudinaryData),
            transformations: []
        };
    }

    // ==========================================================================
    // PRIVATE HELPER METHODS
    // ==========================================================================

    private transformationToCloudinary(transformation: Transformation): string {
        const parts: string[] = [];

        if (transformation.type === 'resize' && transformation.params) {
            const { width, height, crop } = transformation.params;
            parts.push(`c_${crop || 'fill'}`);
            if (width) parts.push(`w_${width}`);
            if (height) parts.push(`h_${height}`);
        }

        if (transformation.type === 'quality' && transformation.params.quality) {
            parts.push(`q_${transformation.params.quality}`);
        }

        if (transformation.type === 'format' && transformation.params.format) {
            parts.push(`f_${transformation.params.format}`);
        }

        if (transformation.type === 'blur' && transformation.params.radius) {
            parts.push(`e_blur:${transformation.params.radius}`);
        }

        if (transformation.type === 'sharpen' && transformation.params.amount) {
            parts.push(`e_sharpen:${transformation.params.amount}`);
        }

        return parts.join(',');
    }

    private extractMetadata(result: any): MediaMetadata {
        return {
            width: result.width,
            height: result.height,
            format: result.format,
            colorSpace: result.color_space,
            duration: result.duration,
            bitrate: result.bit_rate,
            tags: result.tags || [],
            exif: result.image_metadata
        };
    }

    private buildSearchExpression(options: ListOptions): string {
        const expressions: string[] = [];

        if (options.folder) {
            expressions.push(`folder:${options.folder}*`);
        }

        if (options.tags?.length) {
            const tagExpression = options.tags.map(tag => `tags:${tag}`).join(' AND ');
            expressions.push(`(${tagExpression})`);
        }

        return expressions.join(' AND ');
    }

    private generatePublicId(fileName: string): string {
        const extension = fileName.split('.').pop();
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const timestamp = Date.now();
        const uniqueId = uuidv4().substring(0, 8);
        
        return `${baseName}_${timestamp}_${uniqueId}`;
    }
} 