/**
 * LocalFileServiceProvider - Local file service provider 
 * 
 * @package     @imajin/cli
 * @subpackage  services/localfile
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-29
 *
 * Integration Points:
 * - Service provider pattern for modular architecture
 * - LocalFileService registration with CLI program
 * - Health monitoring and diagnostics
 * - Real-time event coordination
 */

import type { Command } from 'commander';
import type { EventEmitter } from 'events';
import type { Container } from '../../container/Container.js';
import type { Logger } from '../../logging/Logger.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { LocalFileService, type LocalFileConfig } from './LocalFileService.js';

export class LocalFileServiceProvider extends ServiceProvider {
    private localFileService?: LocalFileService;
    private logger: Logger;

    constructor(container: Container, program: Command) {
        super(container, program);
        this.logger = this.container.resolve<Logger>('logger');
    }

    /**
     * Get provider name
     */
    getName(): string {
        return 'localfile';
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
            'local-media-upload',
            'local-media-storage',
            'local-media-management',
            'basic-transformations',
        ];
    }

    /**
     * Check if provider provides a specific service
     */
    provides(service: string): boolean {
        return this.getServices().includes(service) || service === 'localfile';
    }

    /**
     * Register services and initialize components
     */
    async register(config?: Partial<LocalFileConfig>): Promise<void> {
        // Configure LocalFileService with defaults
        const serviceConfig: LocalFileConfig = {
            name: 'localfile',
            enabled: true,
            storagePath: config?.storagePath ?? './storage/media',
            publicPath: config?.publicPath ?? './public/media',
            baseUrl: config?.baseUrl ?? 'http://localhost:3000/media',
            maxFileSize: config?.maxFileSize ?? 10 * 1024 * 1024, // 10MB default
        };

        // Initialize LocalFileService
        this.localFileService = new LocalFileService(
            this.container,
            serviceConfig,
            this.container.resolve<EventEmitter>('eventEmitter')
        );

        // Register service in container
        this.container.instance('localFileService', this.localFileService);

        this.logger.info('LocalFileServiceProvider registered', {
            storagePath: serviceConfig.storagePath,
            publicPath: serviceConfig.publicPath,
            baseUrl: serviceConfig.baseUrl,
            maxFileSize: serviceConfig.maxFileSize
        });
    }

    /**
     * Boot the service provider and set up event listeners
     */
    async boot(): Promise<void> {
        // Set up event listeners for real-time coordination
        if (this.localFileService) {
            const eventEmitter = this.container.resolve<EventEmitter>('eventEmitter');
            
            eventEmitter.on('service:operation', (event: any) => {
                if (event.service === 'localfile') {
                    this.logger.debug('LocalFile operation progress', { 
                        operation: event.operation,
                        duration: event.duration,
                        success: event.success 
                    });
                }
            });

            // Initialize the service
            await this.localFileService.initialize();
        }

        this.logger.info('LocalFileServiceProvider booted successfully');
    }

    /**
     * Register commands with CLI program
     */
    registerCommands(program: Command): void {
        if (this.localFileService) {
            // Create main localfile command group
            const localFileCmd = program
                .command('localfile')
                .description('Local file service operations');

            localFileCmd
                .command('upload')
                .description('Upload media to local storage')
                .argument('<file>', 'File to upload')
                .option('-f, --folder <folder>', 'Upload to specific folder')
                .option('-t, --tags <tags>', 'Comma-separated tags')
                .option('--overwrite', 'Overwrite existing files')
                .action(async (file: string, options: any) => {
                    // Implementation would be handled by media commands
                    console.log(`Uploading ${file} to local storage...`);
                });

            localFileCmd
                .command('list')
                .description('List local media files')
                .option('-f, --folder <folder>', 'List files in specific folder')
                .option('-l, --limit <limit>', 'Limit number of results', parseInt)
                .action(async (options: any) => {
                    const assets = await this.localFileService!.listAssets({
                        folder: options.folder,
                        limit: options.limit || 10
                    });
                    console.log('Local Media Assets:', JSON.stringify(assets, null, 2));
                });

            localFileCmd
                .command('health')
                .description('Check local file service health')
                .action(async () => {
                    const health = await this.localFileService!.getHealth();
                    console.log('LocalFile Service Health:', JSON.stringify(health, null, 2));
                });

            this.logger.info('LocalFile commands registered successfully');
        }
    }

    /**
     * Get service introspection for LLM discovery
     */
    getIntrospection(): any {
        const baseIntrospection = {
            service: 'localfile',
            version: this.getVersion(),
            capabilities: this.getServices(),
            configured: !!this.localFileService,
        };

        return {
            ...baseIntrospection,
            status: 'ready',
            commands: [
                {
                    name: 'localfile:upload',
                    description: 'Upload media to local storage',
                    usage: 'imajin localfile upload <file> [options]',
                    options: ['--folder', '--tags', '--overwrite'],
                },
                {
                    name: 'localfile:list',
                    description: 'List local media files',
                    usage: 'imajin localfile list [options]',
                    options: ['--folder', '--limit'],
                },
                {
                    name: 'localfile:health',
                    description: 'Check local file service health',
                    usage: 'imajin localfile health',
                },
            ],
        };
    }

    /**
     * Get the configured LocalFile service instance
     */
    getLocalFileService(): LocalFileService | undefined {
        return this.localFileService;
    }

    /**
     * Shutdown the service provider
     */
    async shutdown(): Promise<void> {
        if (this.localFileService) {
            await this.localFileService.shutdown();
        }
        this.logger.info('LocalFileServiceProvider shutdown complete');
    }
} 