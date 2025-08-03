/**
 * ContentfulServiceProvider - Service provider for Contentful integration
 * 
 * @package     @imajin/cli
 * @subpackage  services/contentful
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Service provider registration system
 * - Command registration for CLI
 * - Configuration management
 * - Health monitoring integration
 */

import { Command } from 'commander';
import type { Container } from '../../container/Container.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { ContentfulService, ContentfulConfig } from './ContentfulService.js';
import { createContentfulCommands } from './commands/ContentfulCommands.js';

export class ContentfulServiceProvider extends ServiceProvider {
    private contentfulService?: ContentfulService;
    protected logger: any;

    constructor(container: Container, program: Command) {
        super(container, program);
        this.logger = container.resolve('logger');
    }

    public getName(): string {
        return 'contentful';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    public getServices(): string[] {
        return ['contentful', 'content-management', 'cms'];
    }

    public async register(): Promise<void> {
        this.logger.info('Registering Contentful service provider...');

        // Get configuration from environment
        const config: ContentfulConfig = {
            name: 'contentful',
            enabled: true,
            spaceId: process.env.CONTENTFUL_SPACE_ID || '',
            deliveryToken: process.env.CONTENTFUL_DELIVERY_TOKEN || '',
            ...(process.env.CONTENTFUL_PREVIEW_TOKEN && { previewToken: process.env.CONTENTFUL_PREVIEW_TOKEN }),
            ...(process.env.CONTENTFUL_MANAGEMENT_TOKEN && { managementToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN }),
            environment: process.env.CONTENTFUL_ENVIRONMENT_ID || 'master'
        };

        // Validate required configuration - skip if not configured
        if (!config.spaceId || !config.deliveryToken) {
            this.logger.warn('Contentful configuration incomplete - skipping service registration', {
                hasSpaceId: !!config.spaceId,
                hasDeliveryToken: !!config.deliveryToken
            });
            return; // Skip registration if not properly configured
        }

        // Create and register service
        this.contentfulService = new ContentfulService(
            this.container,
            config,
            this.container.resolve('eventEmitter')
        );

        this.container.singleton('contentfulService', () => this.contentfulService!);

        this.logger.info('Contentful service provider registered successfully');
    }

    public async boot(): Promise<void> {
        this.logger.info('Booting Contentful service provider...');

        if (!this.contentfulService) {
            this.logger.warn('Contentful service not registered - skipping boot');
            return; // Skip booting if service wasn't registered
        }

        await this.contentfulService.initialize();

        this.logger.info('Contentful service provider booted successfully');
    }

    public async shutdown(): Promise<void> {
        this.logger.info('Shutting down Contentful service provider...');

        if (this.contentfulService) {
            await this.contentfulService.shutdown();
        }

        this.logger.info('Contentful service provider shut down successfully');
    }

    public registerCommands(program: Command): void {
        if (!this.contentfulService) {
            this.logger.debug('Contentful service not available - skipping command registration');
            return; // Skip command registration if service isn't available
        }

        this.logger.debug('Registering Contentful commands...');
        
        const contentfulCommand = createContentfulCommands();
        program.addCommand(contentfulCommand);

        this.logger.debug('Contentful commands registered successfully');
    }

    public provides(service: string): boolean {
        return this.getServices().includes(service);
    }

    public getIntrospection() {
        return {
            name: this.getName(),
            description: 'Content management service for Imajin Lighting using Contentful CMS',
            version: this.getVersion(),
            commands: [
                {
                    name: 'contentful content list',
                    description: 'List all content entries',
                    parameters: [
                        { name: 'type', type: 'string', required: false, description: 'Content type filter' },
                        { name: 'limit', type: 'number', required: false, description: 'Number of entries to return' }
                    ]
                },
                {
                    name: 'contentful events upcoming',
                    description: 'Get upcoming DJ events',
                    parameters: [
                        { name: 'limit', type: 'number', required: false, description: 'Number of events to return' }
                    ]
                },
                {
                    name: 'contentful tracks list',
                    description: 'List track releases',
                    parameters: [
                        { name: 'genre', type: 'string', required: false, description: 'Filter by genre' },
                        { name: 'limit', type: 'number', required: false, description: 'Number of tracks to return' }
                    ]
                },
                {
                    name: 'contentful blog posts',
                    description: 'Get blog posts',
                    parameters: [
                        { name: 'limit', type: 'number', required: false, description: 'Number of posts to return' },
                        { name: 'unpublished', type: 'boolean', required: false, description: 'Include unpublished content' }
                    ]
                },
                {
                    name: 'contentful search',
                    description: 'Search content across all types',
                    parameters: [
                        { name: 'query', type: 'string', required: true, description: 'Search query' },
                        { name: 'types', type: 'string', required: false, description: 'Comma-separated content types' }
                    ]
                }
            ],
            capabilities: this.getServices(),
            realTimeSupported: true,
            authentication: {
                required: true,
                type: 'token',
                instructions: 'Set CONTENTFUL_SPACE_ID and CONTENTFUL_DELIVERY_TOKEN environment variables'
            }
        };
    }
} 