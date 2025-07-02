/**
 * ContentfulService - Universal content management service
 * 
 * @package     @imajin/cli
 * @subpackage  services/contentful
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-25
 *
 * Integration Points:
 * - Contentful Delivery API for reading content
 * - Contentful Management API for creating content types
 * - Universal content management for any business domain
 * - Recipe-driven content type generation
 * - Cross-service content synchronization
 */

import { createClient } from 'contentful';
import contentfulManagement from 'contentful-management';
import type { Container } from '../../container/Container.js';
import type { EventEmitter } from 'events';
import { BaseService } from '../BaseService.js';
import type { ServiceConfig } from '../interfaces/ServiceInterface.js';

export interface ContentfulConfig extends ServiceConfig {
    name: string;
    enabled: boolean;
    spaceId: string;
    deliveryToken: string;
    previewToken?: string;
    managementToken?: string;
    environment?: string;
    host?: string;
}

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface UniversalContent {
    id: string;
    title: string;
    description?: string;
    publishedAt?: Date;
    contentType: string;
    tags?: string[];
    media?: {
        images?: string[];
        audio?: string[];
        video?: string[];
    };
    metadata?: Record<string, any>;
}

export class ContentfulService extends BaseService {
    private client: any;
    private previewClient?: any;
    private managementClient?: any;
    private contentfulConfig: ContentfulConfig;

    constructor(
        container: Container,
        config: ContentfulConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.contentfulConfig = config;
    }

    public getName(): string {
        return 'contentful';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    protected async onInitialize(): Promise<void> {
        this.logger.info('Initializing universal Contentful service...');

        // Initialize delivery client
        this.client = createClient({
            space: this.contentfulConfig.spaceId,
            accessToken: this.contentfulConfig.deliveryToken,
            environment: this.contentfulConfig.environment || 'master',
            host: this.contentfulConfig.host || 'cdn.contentful.com'
        });

        // Initialize preview client if preview token available
        if (this.contentfulConfig.previewToken) {
            this.previewClient = createClient({
                space: this.contentfulConfig.spaceId,
                accessToken: this.contentfulConfig.previewToken,
                environment: this.contentfulConfig.environment || 'master',
                host: 'preview.contentful.com'
            });
        }

        // Initialize management client if management token available
        if (this.contentfulConfig.managementToken) {
            this.managementClient = contentfulManagement.createClient({
                accessToken: this.contentfulConfig.managementToken,
            });
        }

        // Test connection
        await this.testConnection();
        
        this.logger.info('Universal Contentful service initialized successfully');
    }

    protected async onShutdown(): Promise<void> {
        this.logger.info('Shutting down Contentful service');
        // Contentful client doesn't require explicit cleanup
    }

    protected async onHealthCheck(): Promise<Array<{ name: string; healthy: boolean; message?: string; }>> {
        const checks = [];

        try {
            await this.client.getSpace();
            checks.push({
                name: 'contentful-connection',
                healthy: true,
                message: 'Connected to Contentful delivery API'
            });
        } catch (error) {
            checks.push({
                name: 'contentful-connection',
                healthy: false,
                message: `Failed to connect to Contentful: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }

        return checks;
    }

    // =============================================================================
    // UNIVERSAL CONTENT MANAGEMENT METHODS
    // =============================================================================

    /**
     * Get content entries (works with any content type from any recipe)
     */
    async getContent(contentType?: string, limit = 10, filters?: Record<string, any>): Promise<UniversalContent[]> {
        return this.execute('getContent', async () => {
            const query: any = {
                limit,
                order: '-sys.createdAt',
                ...filters
            };

            if (contentType) {
                query.content_type = contentType;
            }

            const response = await this.client.getEntries(query);
            return response.items.map((item: any) => this.transformToUniversalContent(item));
        });
    }

    /**
     * Get specific entry by ID (works with any content type)
     */
    async getEntry(id: string): Promise<UniversalContent | null> {
        return this.execute('getEntry', async () => {
            try {
                const entry = await this.client.getEntry(id);
                return this.transformToUniversalContent(entry);
            } catch (error) {
                this.logger.warn(`Entry not found: ${id}`);
                return null;
            }
        });
    }

    /**
     * Search content across all types (works with any business domain)
     */
    async searchContent(query: string, contentTypes?: string[]): Promise<UniversalContent[]> {
        return this.execute('searchContent', async () => {
            const searchQuery: any = {
                query,
                limit: 50
            };

            if (contentTypes && contentTypes.length > 0) {
                searchQuery.content_type = contentTypes.join(',');
            }

            const response = await this.client.getEntries(searchQuery);
            return response.items.map((item: any) => this.transformToUniversalContent(item));
        });
    }

    /**
     * Get content by date range (universal - works with any content type)
     */
    async getContentByDateRange(
        contentType: string, 
        startDate: Date, 
        endDate?: Date, 
        limit = 10
    ): Promise<UniversalContent[]> {
        return this.execute('getContentByDateRange', async () => {
            const query: any = {
                content_type: contentType,
                limit,
                order: '-sys.createdAt',
                'sys.createdAt[gte]': startDate.toISOString()
            };

            if (endDate) {
                query['sys.createdAt[lte]'] = endDate.toISOString();
            }

            const response = await this.client.getEntries(query);
            return response.items.map((item: any) => this.transformToUniversalContent(item));
        });
    }

    /**
     * Create content type from recipe (uses Management API)
     */
    async createContentType(contentTypeDefinition: any): Promise<any> {
        return this.execute('createContentType', async () => {
            if (!this.managementClient) {
                throw new Error('Management token required for content type creation. Set CONTENTFUL_MANAGEMENT_TOKEN environment variable.');
            }

            try {
                // Get the space and environment
                const space = await this.managementClient.getSpace(this.contentfulConfig.spaceId);
                const environment = await space.getEnvironment(this.contentfulConfig.environment || 'master');

                // Check if content type already exists
                try {
                    const existingContentType = await environment.getContentType(contentTypeDefinition.id);
                    this.logger.warn(`Content type '${contentTypeDefinition.id}' already exists, skipping creation`);
                    return existingContentType;
                } catch (error) {
                    // Content type doesn't exist, proceed with creation
                }

                // Create the content type
                const contentType = await environment.createContentTypeWithId(contentTypeDefinition.id, {
                    name: contentTypeDefinition.name,
                    description: contentTypeDefinition.description,
                    displayField: this.findDisplayField(contentTypeDefinition.fields),
                    fields: contentTypeDefinition.fields.map((field: any) => {
                        const baseField = {
                            id: field.id,
                            name: field.name,
                            type: field.type,
                            required: field.required || false,
                            localized: false,
                            ...(field.validations && { validations: field.validations })
                        };

                        // Handle array reference fields (e.g., tracks in playlists/charts)
                        if (field.items) {
                            baseField.items = field.items;
                        }

                        return baseField;
                    })
                });

                // Publish the content type
                const publishedContentType = await contentType.publish();
                
                this.logger.info(`Successfully created and published content type: ${contentTypeDefinition.name}`);
                return publishedContentType;

            } catch (error) {
                this.logger.error(`Failed to create content type ${contentTypeDefinition.name}:`, error as Error);
                throw error;
            }
        });
    }

    /**
     * Delete content type (uses Management API)
     */
    async deleteContentType(contentTypeId: string): Promise<void> {
        return this.execute('deleteContentType', async () => {
            if (!this.managementClient) {
                throw new Error('Management token required for content type deletion. Set CONTENTFUL_MANAGEMENT_TOKEN environment variable.');
            }

            try {
                // Get the space and environment
                const space = await this.managementClient.getSpace(this.contentfulConfig.spaceId);
                const environment = await space.getEnvironment(this.contentfulConfig.environment || 'master');

                // Get the content type
                const contentType = await environment.getContentType(contentTypeId);
                
                // Unpublish first if published
                if (contentType.sys.publishedVersion) {
                    await contentType.unpublish();
                    this.logger.info(`Content type '${contentTypeId}' unpublished`);
                }

                // Delete the content type
                await contentType.delete();
                
                this.logger.info(`Content type '${contentTypeId}' deleted successfully`);

            } catch (error) {
                this.logger.error(`Failed to delete content type '${contentTypeId}':`, error as Error);
                throw error;
            }
        });
    }

    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================

    private async testConnection(): Promise<void> {
        try {
            const space = await this.client.getSpace();
            this.logger.debug(`Connected to Contentful space: ${space.name}`);
        } catch (error) {
            throw new Error(`Failed to connect to Contentful: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private findDisplayField(fields: any[]): string {
        // Try to find a good display field - prefer 'name', 'title', or the first text field
        const preferredFields = ['name', 'title'];
        
        for (const preferred of preferredFields) {
            if (fields.find(f => f.id === preferred && f.type === 'Symbol')) {
                return preferred;
            }
        }
        
        // Fallback to first Symbol field
        const firstSymbolField = fields.find(f => f.type === 'Symbol');
        return firstSymbolField?.id || fields[0]?.id || 'name';
    }

    private transformToUniversalContent(item: any): UniversalContent {
        const publishedAt = item.sys.publishedAt ? new Date(item.sys.publishedAt) : new Date();
        
        return {
            id: item.sys.id,
            title: item.fields.title || item.fields.name || 'Untitled',
            description: item.fields.description || item.fields.body,
            publishedAt,
            contentType: item.sys.contentType.sys.id,
            tags: item.metadata?.tags?.map((tag: any) => tag.sys.id) || [],
            media: {
                images: item.fields.images?.map((img: any) => img.fields?.file?.url) || [],
                audio: item.fields.audio?.map((audio: any) => audio.fields?.file?.url) || [],
                video: item.fields.video?.map((video: any) => video.fields?.file?.url) || []
            },
            metadata: item.fields
        };
    }
} 