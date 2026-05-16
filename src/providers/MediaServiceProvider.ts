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
 * @updated      2025-07-03
 *
 * @see        docs/providers/media.md
 * 
 * Integration Points:
 * - MediaProcessor registration
 * - Provider implementations
 * - CLI command registration
 * - Configuration management
 */

// eslint-disable-next-line deprecation/deprecation
import type { MediaProcessingConfig, MediaProvider } from '../types/Media.js';

import { MediaUploadCommand } from '../commands/media/MediaUploadCommand.js';
import { MediaCommand } from '../commands/media/MediaCommand.js';
import type { Logger } from '../logging/Logger.js';
import { MediaProcessor } from '../media/MediaProcessor.js';
import { LocalMediaProvider } from '../media/providers/LocalMediaProvider.js';
import { ServiceProvider } from './ServiceProvider.js';

export class MediaServiceProvider extends ServiceProvider {
    private logger!: Logger;
    /**
     * Register services with the container
     */
    public register(): void {
        // Get logger from container
        this.logger = this.container.resolve<Logger>('logger');

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
            const provider = new LocalMediaProvider(config);
            provider.initialize().catch((error) => {
                this.logger.warn('LocalMediaProvider initialization failed', {
                    provider: 'MediaServiceProvider',
                    error: error instanceof Error ? error.message : String(error)
                });
            });
            return provider;
        });


        // Register commands
        this.container.singleton('MediaUploadCommand', () => {
            return new MediaUploadCommand(this.container);
        });

        this.container.singleton('MediaCommand', () => {
            return new MediaCommand(this.container);
        });
    }

    /**
     * Bootstrap services after all providers have been registered
     */
    public boot(): void {
        // Services are already registered, no additional boot actions needed
        // Commands will be registered by Application.registerProviderCommands()
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
            'MediaUploadCommand',
            'MediaCommand'
        ];
    }

    /**
     * Register media providers with the processor
     */
    private registerProviders(processor: MediaProcessor): void {
        // Register local provider
        // eslint-disable-next-line deprecation/deprecation
        const localProvider = this.container.resolve<MediaProvider>('LocalMediaProvider');
        processor.registerProvider('local', localProvider);
    }

    /**
     * Register CLI commands
     */
    public registerCommands(): void {
        const uploadCommand = this.container.resolve<MediaUploadCommand>('MediaUploadCommand');
        uploadCommand.register(this.program);

        const mediaCommand = this.container.resolve<MediaCommand>('MediaCommand');
        mediaCommand.register(this.program);
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
                }
            },
            optimization: {
                autoOptimize: process.env.MEDIA_AUTO_OPTIMIZE === 'true',
                defaultQuality: Number.parseInt(process.env.MEDIA_DEFAULT_QUALITY || '85'),
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
                maxFileSize: Number.parseInt(process.env.MEDIA_MAX_FILE_SIZE || '52428800'), // 50MB
                maxWidth: Number.parseInt(process.env.MEDIA_MAX_WIDTH || '8192'),
                maxHeight: Number.parseInt(process.env.MEDIA_MAX_HEIGHT || '8192'),
                maxDuration: Number.parseInt(process.env.MEDIA_MAX_DURATION || '3600'), // 1 hour
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
                cacheTTL: Number.parseInt(process.env.MEDIA_CDN_CACHE_TTL || '86400'), // 24 hours
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
            baseUrl: process.env.MEDIA_LOCAL_BASE_URL || '',
            maxFileSize: Number.parseInt(process.env.MEDIA_MAX_FILE_SIZE || '52428800')
        };
    }
} 
