/**
 * MediaServiceProvider - Register media processing services
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-10
 *
 * @see        docs/providers/media.md
 * 
 * Integration Points:
 * - MediaProcessor registration
 * - Provider implementations
 * - CLI command registration
 * - Configuration management
 */

import type { MediaProcessingConfig } from '../types/Media.js';

import { MediaUploadCommand } from '../commands/media/MediaUploadCommand.js';
import { MediaProcessor } from '../media/MediaProcessor.js';
import { CloudinaryProvider } from '../media/providers/CloudinaryProvider.js';
import { LocalMediaProvider } from '../media/providers/LocalMediaProvider.js';
import { ServiceProvider } from './ServiceProvider.js';

export class MediaServiceProvider extends ServiceProvider {
    /**
     * Register services with the container
     */
    public register(): void {
        // Register MediaProcessor
        this.container.singleton('MediaProcessor', () => {
            const config = this.getMediaConfig();
            const processor = new MediaProcessor(config);

            // Register providers
            this.registerProviders(processor);

            return processor;
        });

        // Register individual providers
        this.container.singleton('LocalMediaProvider', () => {
            const config = this.getLocalProviderConfig();
            return new LocalMediaProvider(config);
        });

        this.container.singleton('CloudinaryProvider', () => {
            const config = this.getCloudinaryProviderConfig();
            return new CloudinaryProvider(config);
        });

        // Register commands
        this.container.singleton('MediaUploadCommand', () => {
            return new MediaUploadCommand(this.container);
        });
    }

    /**
     * Bootstrap services after all providers have been registered
     */
    public boot(): void {
        // Register CLI commands
        this.registerCommands();
    }

    /**
     * Get the service provider name
     */
    public getName(): string {
        return 'MediaServiceProvider';
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return [
            'MediaProcessor',
            'LocalMediaProvider',
            'CloudinaryProvider',
            'MediaUploadCommand'
        ];
    }

    /**
     * Register media providers with the processor
     */
    private registerProviders(processor: MediaProcessor): void {
        // Register local provider
        const localProvider = this.container.resolve('LocalMediaProvider') as any;
        processor.registerProvider('local', localProvider);

        // Register Cloudinary provider if configured
        try {
            const cloudinaryProvider = this.container.resolve('CloudinaryProvider') as any;
            processor.registerProvider('cloudinary', cloudinaryProvider);
        } catch (error) {
            // Cloudinary not configured, skip
            console.warn('⚠️  Cloudinary provider not configured, skipping...');
        }
    }

    /**
     * Register CLI commands
     */
    public registerCommands(): void {
        const uploadCommand = this.container.resolve('MediaUploadCommand') as any;
        uploadCommand.register(this.program);
    }

    /**
     * Get media processing configuration
     */
    private getMediaConfig(): MediaProcessingConfig {
        return {
            defaultProvider: process.env.MEDIA_DEFAULT_PROVIDER || 'local',
            providers: {
                local: {
                    type: 'local',
                    credentials: {},
                    settings: {},
                    enabled: true
                },
                cloudinary: {
                    type: 'cloudinary',
                    credentials: {
                        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
                        apiKey: process.env.CLOUDINARY_API_KEY || '',
                        apiSecret: process.env.CLOUDINARY_API_SECRET || ''
                    },
                    settings: {
                        secure: true,
                        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
                    },
                    enabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
                }
            },
            optimization: {
                autoOptimize: process.env.MEDIA_AUTO_OPTIMIZE === 'true',
                defaultQuality: parseInt(process.env.MEDIA_DEFAULT_QUALITY || '85'),
                defaultFormat: (process.env.MEDIA_DEFAULT_FORMAT as any) || 'webp',
                generateThumbnails: process.env.MEDIA_GENERATE_THUMBNAILS === 'true',
                thumbnailSizes: [
                    { width: 150, height: 150 },
                    { width: 300, height: 300 },
                    { width: 600, height: 600 }
                ],
                enableWebP: process.env.MEDIA_ENABLE_WEBP !== 'false',
                enableAVIF: process.env.MEDIA_ENABLE_AVIF === 'true'
            },
            limits: {
                maxFileSize: parseInt(process.env.MEDIA_MAX_FILE_SIZE || '52428800'), // 50MB
                maxWidth: parseInt(process.env.MEDIA_MAX_WIDTH || '8192'),
                maxHeight: parseInt(process.env.MEDIA_MAX_HEIGHT || '8192'),
                maxDuration: parseInt(process.env.MEDIA_MAX_DURATION || '3600'), // 1 hour
                allowedFormats: (process.env.MEDIA_ALLOWED_FORMATS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi').split(','),
                allowedMimeTypes: [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'video/mp4',
                    'video/quicktime',
                    'video/x-msvideo'
                ]
            },
            cdnConfig: {
                enabled: process.env.MEDIA_CDN_ENABLED === 'true',
                baseUrl: process.env.MEDIA_CDN_BASE_URL || '',
                cacheTTL: parseInt(process.env.MEDIA_CDN_CACHE_TTL || '86400'), // 24 hours
                compressionEnabled: process.env.MEDIA_CDN_COMPRESSION !== 'false'
            }
        };
    }

    /**
     * Get local provider configuration
     */
    private getLocalProviderConfig() {
        return {
            storagePath: process.env.MEDIA_LOCAL_STORAGE_PATH || './storage/media',
            publicPath: process.env.MEDIA_LOCAL_PUBLIC_PATH || './public/media',
            baseUrl: process.env.MEDIA_LOCAL_BASE_URL || 'http://localhost:3000/media',
            maxFileSize: parseInt(process.env.MEDIA_MAX_FILE_SIZE || '52428800')
        };
    }

    /**
     * Get Cloudinary provider configuration
     */
    private getCloudinaryProviderConfig() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
        }

        const config = {
            cloudName,
            apiKey,
            apiSecret,
            secure: true
        };

        // Only add uploadPreset if it's defined
        if (process.env.CLOUDINARY_UPLOAD_PRESET) {
            (config as any).uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
        }

        return config;
    }
} 