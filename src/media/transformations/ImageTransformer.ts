/**
 * ImageTransformer - Image transformation utilities
 * 
 * @package     @imajin/cli
 * @subpackage  media/transformations
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-18
 *
 * @see        docs/media/transformations.md
 * 
 * Integration Points:
 * - Image processing libraries (Sharp, etc.)
 * - Format conversion and optimization
 * - Watermarking and overlays
 */

import { v4 as uuidv4 } from 'uuid';

import type {
    MediaAsset,
    Transformation,
    TransformationRecord
} from '../../types/Media.js';

import { ExceptionUtils } from '../../exceptions/index.js';

export interface ImageTransformOptions {
    preserveOriginal?: boolean;
    outputQuality?: number;
    compressionLevel?: number;
}

export class ImageTransformer {
    /**
     * Apply transformations to an image
     */
    public static async transform(
        asset: MediaAsset,
        transformations: Transformation[],
        options: ImageTransformOptions = {}
    ): Promise<MediaAsset> {
        try {
            let transformedAsset = { ...asset };
            const transformationRecords: TransformationRecord[] = [];

            for (const transformation of transformations) {
                const startTime = Date.now();

                try {
                    transformedAsset = await this.applyTransformation(
                        transformedAsset,
                        transformation,
                        options
                    );

                    // Record successful transformation
                    transformationRecords.push({
                        id: uuidv4(),
                        transformation,
                        appliedAt: new Date(),
                        resultUrl: transformedAsset.url,
                        fileSize: transformedAsset.size,
                        duration: Date.now() - startTime,
                        success: true
                    });

                } catch (error) {
                    // Record failed transformation
                    transformationRecords.push({
                        id: uuidv4(),
                        transformation,
                        appliedAt: new Date(),
                        resultUrl: transformedAsset.url,
                        fileSize: transformedAsset.size,
                        duration: Date.now() - startTime,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });

                    throw error;
                }
            }

            // Add transformation records to asset
            transformedAsset.transformations = [
                ...(transformedAsset.transformations || []),
                ...transformationRecords
            ];

            return transformedAsset;

        } catch (error) {
            throw ExceptionUtils.normalize(error, {
                operation: 'image_transform',
                assetId: asset.id,
                transformations
            });
        }
    }

    /**
     * Apply a single transformation
     */
    private static async applyTransformation(
        asset: MediaAsset,
        transformation: Transformation,
        options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const { type, params } = transformation;
        let transformedAsset = { ...asset };

        switch (type) {
            case 'resize':
                transformedAsset = await this.resize(transformedAsset, params, options);
                break;

            case 'crop':
                transformedAsset = await this.crop(transformedAsset, params, options);
                break;

            case 'format':
                transformedAsset = await this.convertFormat(transformedAsset, params, options);
                break;

            case 'quality':
                transformedAsset = await this.adjustQuality(transformedAsset, params, options);
                break;

            case 'rotate':
                transformedAsset = await this.rotate(transformedAsset, params, options);
                break;

            case 'blur':
                transformedAsset = await this.blur(transformedAsset, params, options);
                break;

            case 'sharpen':
                transformedAsset = await this.sharpen(transformedAsset, params, options);
                break;

            case 'brightness':
                transformedAsset = await this.adjustBrightness(transformedAsset, params, options);
                break;

            case 'contrast':
                transformedAsset = await this.adjustContrast(transformedAsset, params, options);
                break;

            case 'saturation':
                transformedAsset = await this.adjustSaturation(transformedAsset, params, options);
                break;

            case 'watermark':
                transformedAsset = await this.addWatermark(transformedAsset, params, options);
                break;

            case 'overlay':
                transformedAsset = await this.addOverlay(transformedAsset, params, options);
                break;

            case 'optimize':
                transformedAsset = await this.optimize(transformedAsset, params, options);
                break;

            case 'thumbnail':
                transformedAsset = await this.generateThumbnail(transformedAsset, params, options);
                break;

            default:
                throw new Error(`Unsupported transformation type: ${type}`);
        }

        return transformedAsset;
    }

    /**
     * Resize image
     */
    private static async resize(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        // In production, use Sharp or similar library
        // For now, simulate the transformation

        const transformedAsset = { ...asset };

        if (params.width) {
            transformedAsset.metadata.width = params.width;
        }

        if (params.height) {
            transformedAsset.metadata.height = params.height;
        }

        // Update aspect ratio if both dimensions are provided
        if (params.width && params.height) {
            transformedAsset.metadata.aspectRatio = `${params.width}:${params.height}`;
        }

        // Simulate file size change (resizing typically reduces size)
        if (params.width && params.height && asset.metadata.width && asset.metadata.height) {
            const originalPixels = asset.metadata.width * asset.metadata.height;
            const newPixels = params.width * params.height;
            const sizeRatio = newPixels / originalPixels;
            transformedAsset.size = Math.round(asset.size * sizeRatio);
        }

        return transformedAsset;
    }

    /**
     * Crop image
     */
    private static async crop(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        if (params.width && params.height) {
            transformedAsset.metadata.width = params.width;
            transformedAsset.metadata.height = params.height;
            transformedAsset.metadata.aspectRatio = `${params.width}:${params.height}`;

            // Cropping typically reduces file size
            if (asset.metadata.width && asset.metadata.height) {
                const cropRatio = (params.width * params.height) / (asset.metadata.width * asset.metadata.height);
                transformedAsset.size = Math.round(asset.size * cropRatio);
            }
        }

        return transformedAsset;
    }

    /**
     * Convert image format
     */
    private static async convertFormat(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        if (params.format) {
            transformedAsset.metadata.format = params.format;
            transformedAsset.mimeType = `image/${params.format}`;

            // Update filename extension
            const nameWithoutExt = transformedAsset.fileName.replace(/\.[^/.]+$/, '');
            transformedAsset.fileName = `${nameWithoutExt}.${params.format}`;

            // Simulate compression effects of different formats
            const compressionRatios: Record<string, number> = {
                'webp': 0.7,  // WebP is typically 30% smaller
                'avif': 0.5,  // AVIF is typically 50% smaller
                'jpeg': 0.8,  // JPEG compression
                'png': 1.0,   // PNG is lossless, size may vary
                'gif': 0.9    // GIF has limited colors
            };

            const ratio = compressionRatios[params.format] || 1.0;
            transformedAsset.size = Math.round(asset.size * ratio);
        }

        return transformedAsset;
    }

    /**
     * Adjust image quality
     */
    private static async adjustQuality(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        if (params.quality) {
            transformedAsset.metadata.quality = params.quality;

            // Quality affects file size
            const qualityRatio = params.quality / 100;
            transformedAsset.size = Math.round(asset.size * qualityRatio);
        }

        return transformedAsset;
    }

    /**
     * Rotate image
     */
    private static async rotate(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        if (params.angle) {
            // For 90/270 degree rotations, swap width and height
            if (Math.abs(params.angle) === 90 || Math.abs(params.angle) === 270) {
                const width = transformedAsset.metadata.width;
                const height = transformedAsset.metadata.height;

                if (width && height) {
                    transformedAsset.metadata.width = height;
                    transformedAsset.metadata.height = width;
                    transformedAsset.metadata.aspectRatio = `${height}:${width}`;
                }
            }

            // Update orientation
            if (transformedAsset.metadata.orientation) {
                transformedAsset.metadata.orientation = (transformedAsset.metadata.orientation + params.angle) % 360;
            } else {
                transformedAsset.metadata.orientation = params.angle;
            }
        }

        return transformedAsset;
    }

    /**
     * Apply blur effect
     */
    private static async blur(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        // Blur doesn't significantly change metadata or file size
        return { ...asset };
    }

    /**
     * Apply sharpen effect
     */
    private static async sharpen(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        // Sharpen doesn't significantly change metadata or file size
        return { ...asset };
    }

    /**
     * Adjust brightness
     */
    private static async adjustBrightness(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        // Brightness adjustment doesn't change dimensions or significantly affect size
        return { ...asset };
    }

    /**
     * Adjust contrast
     */
    private static async adjustContrast(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        // Contrast adjustment doesn't change dimensions or significantly affect size
        return { ...asset };
    }

    /**
     * Adjust saturation
     */
    private static async adjustSaturation(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        // Saturation adjustment doesn't change dimensions or significantly affect size
        return { ...asset };
    }

    /**
     * Add watermark
     */
    private static async addWatermark(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        // Watermarking might slightly increase file size
        transformedAsset.size = Math.round(asset.size * 1.05);

        return transformedAsset;
    }

    /**
     * Add overlay
     */
    private static async addOverlay(
        asset: MediaAsset,
        _params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        // Overlays might increase file size depending on complexity
        transformedAsset.size = Math.round(asset.size * 1.1);

        return transformedAsset;
    }

    /**
     * Optimize image
     */
    private static async optimize(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        // Optimization typically reduces file size by 20-40%
        const optimizationRatio = 0.7;
        transformedAsset.size = Math.round(asset.size * optimizationRatio);

        // Set optimized quality if not specified
        if (!transformedAsset.metadata.quality) {
            transformedAsset.metadata.quality = params.quality || 85;
        }

        return transformedAsset;
    }

    /**
     * Generate thumbnail
     */
    private static async generateThumbnail(
        asset: MediaAsset,
        params: any,
        _options: ImageTransformOptions
    ): Promise<MediaAsset> {
        const transformedAsset = { ...asset };

        const thumbnailWidth = params.width || 150;
        const thumbnailHeight = params.height || 150;

        transformedAsset.metadata.width = thumbnailWidth;
        transformedAsset.metadata.height = thumbnailHeight;
        transformedAsset.metadata.aspectRatio = `${thumbnailWidth}:${thumbnailHeight}`;

        // Thumbnails are much smaller
        if (asset.metadata.width && asset.metadata.height) {
            const originalPixels = asset.metadata.width * asset.metadata.height;
            const thumbnailPixels = thumbnailWidth * thumbnailHeight;
            const sizeRatio = thumbnailPixels / originalPixels;
            transformedAsset.size = Math.round(asset.size * sizeRatio);
        } else {
            // Estimate thumbnail size as 5% of original
            transformedAsset.size = Math.round(asset.size * 0.05);
        }

        // Update filename to indicate thumbnail
        const nameWithoutExt = transformedAsset.fileName.replace(/\.[^/.]+$/, '');
        const extension = transformedAsset.fileName.split('.').pop();
        transformedAsset.fileName = `${nameWithoutExt}_thumb_${thumbnailWidth}x${thumbnailHeight}.${extension}`;

        return transformedAsset;
    }
} 