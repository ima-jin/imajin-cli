/**
 * CloudinaryServiceProvider - Cloudinary service provider 
 * 
 * @package     @imajin/cli
 * @subpackage  services/cloudinary
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Service provider pattern for modular architecture
 * - CloudinaryService registration with CLI program
 * - Health monitoring and diagnostics
 * - Real-time event coordination
 */

import type { Command } from 'commander';
import type { EventEmitter } from 'node:events';
import type { Container } from '../../container/Container.js';
import type { Logger } from '../../logging/Logger.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { CloudinaryService, type CloudinaryConfig } from './CloudinaryService.js';

export class CloudinaryServiceProvider extends ServiceProvider {
    private cloudinaryService?: CloudinaryService;
    private logger: Logger;

    constructor(container: Container, program: Command) {
        super(container, program);
        this.logger = this.container.resolve<Logger>('logger');
    }

    /**
     * Get provider name
     */
    getName(): string {
        return 'cloudinary';
    }

    /**
     * Get provider version
     */
    getVersion(): string {
        return '0.1.0';
    }

    /**
     * Get services provided by this provider
     */
    getServices(): string[] {
        return [
            'media-upload',
            'media-transformation',
            'media-delivery',
            'cdn-optimization',
            'media-management',
        ];
    }

    /**
     * Check if provider provides a specific service
     */
    provides(service: string): boolean {
        return this.getServices().includes(service) || service === 'cloudinary';
    }

    /**
     * Register services and initialize components
     */
    async register(config?: Partial<CloudinaryConfig>): Promise<void> {
        // Check if we have Cloudinary configuration
        const cloudName = config?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = config?.apiKey ?? process.env.CLOUDINARY_API_KEY;
        const apiSecret = config?.apiSecret ?? process.env.CLOUDINARY_API_SECRET;
        const hasCloudinaryConfig = !!(cloudName && apiKey && apiSecret);

        if (hasCloudinaryConfig) {
            // Validate Cloudinary configuration with ServiceConfig
            const serviceConfig: CloudinaryConfig = {
                name: 'cloudinary',
                enabled: true,
                cloudName: cloudName,
                apiKey: apiKey,
                apiSecret: apiSecret,
                secure: config?.secure ?? true,
                ...(config?.uploadPreset && { uploadPreset: config.uploadPreset }),
            };

            // Initialize CloudinaryService with new constructor
            this.cloudinaryService = new CloudinaryService(
                this.container,
                serviceConfig,
                this.container.resolve<EventEmitter>('eventEmitter')
            );

            // Register service in container
            this.container.instance('cloudinaryService', this.cloudinaryService);

            this.logger.info('CloudinaryServiceProvider registered with credentials', {
                cloudName: cloudName,
                secure: serviceConfig.secure
            });
        } else {
            this.logger.info('CloudinaryServiceProvider registered without credentials (introspection only)');
        }
    }

    /**
     * Boot the service provider and set up event listeners
     */
    async boot(): Promise<void> {
        // Set up event listeners for real-time coordination
        if (this.cloudinaryService) {
            const eventEmitter = this.container.resolve<EventEmitter>('eventEmitter');
            
            eventEmitter.on('service:operation', (event: any) => {
                if (event.service === 'cloudinary') {
                    this.logger.debug('Cloudinary operation progress', { 
                        operation: event.operation,
                        duration: event.duration,
                        success: event.success 
                    });
                }
            });

            // Initialize the service
            await this.cloudinaryService.initialize();
        }

        this.logger.info('CloudinaryServiceProvider booted successfully');
    }

    /**
     * Register commands with CLI program
     */
    registerCommands(program: Command): void {
        if (this.cloudinaryService) {
            // Create main cloudinary command group
            const cloudinaryCmd = program
                .command('cloudinary')
                .description('Cloudinary media service operations');

            cloudinaryCmd
                .command('upload')
                .description('Upload media to Cloudinary')
                .argument('<file>', 'File to upload')
                .option('-f, --folder <folder>', 'Upload to specific folder')
                .option('-t, --tags <tags>', 'Comma-separated tags')
                .option('--overwrite', 'Overwrite existing files')
                .action(async (file: string, options: any) => {
                    // Implementation would be handled by media commands
                    this.logger.info('Upload command invoked', { file, options });
                });

            cloudinaryCmd
                .command('health')
                .description('Check Cloudinary service health')
                .action(async () => {
                    const health = await this.cloudinaryService!.getHealth();
                    this.logger.info('Cloudinary service health', health);
                });

            this.logger.info('Cloudinary commands registered successfully');
        } else {
            // Register placeholder commands that show configuration needed
            const cloudinaryCmd = program
                .command('cloudinary')
                .description('Cloudinary service operations (requires configuration)');

            cloudinaryCmd
                .command('configure')
                .description('Show Cloudinary configuration instructions')
                .action(() => {
                    this.logger.error('Cloudinary credentials not configured');
                    this.logger.info('Configuration instructions', {
                        instructions: 'Set environment variables or provide config',
                        examples: [
                            'export CLOUDINARY_CLOUD_NAME=your-cloud-name',
                            'export CLOUDINARY_API_KEY=your-api-key',
                            'export CLOUDINARY_API_SECRET=your-api-secret'
                        ]
                    });
                    process.exit(1);
                });

            this.logger.info('Cloudinary placeholder commands registered (configuration needed)');
        }
    }

    /**
     * Get service introspection for LLM discovery
     */
    getIntrospection(): any {
        const baseIntrospection = {
            service: 'cloudinary',
            version: this.getVersion(),
            capabilities: this.getServices(),
            configured: !!this.cloudinaryService,
        };

        if (!this.cloudinaryService) {
            return {
                ...baseIntrospection,
                status: 'configuration_required',
                message: 'Cloudinary credentials required for operation',
                commands: [
                    {
                        name: 'cloudinary:configure',
                        description: 'Show Cloudinary configuration instructions',
                        usage: 'imajin cloudinary configure',
                    }
                ],
            };
        }

        return {
            ...baseIntrospection,
            status: 'ready',
            commands: [
                {
                    name: 'cloudinary:upload',
                    description: 'Upload media to Cloudinary',
                    usage: 'imajin cloudinary upload <file> [options]',
                    options: ['--folder', '--tags', '--overwrite'],
                },
                {
                    name: 'cloudinary:health',
                    description: 'Check Cloudinary service health',
                    usage: 'imajin cloudinary health',
                },
            ],
        };
    }

    /**
     * Get the configured Cloudinary service instance
     */
    getCloudinaryService(): CloudinaryService | undefined {
        return this.cloudinaryService;
    }

    /**
     * Shutdown the service provider
     */
    async shutdown(): Promise<void> {
        if (this.cloudinaryService) {
            await this.cloudinaryService.shutdown();
        }
        this.logger.info('CloudinaryServiceProvider shutdown complete');
    }
} 