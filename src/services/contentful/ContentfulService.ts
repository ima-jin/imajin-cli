/**
 * ContentfulService - Universal content management service
 * 
 * @package     @imajin/cli
 * @subpackage  services/contentful
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-04
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

        this.logger.info('ContentfulService initialized');
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
                name: 'contentful-api',
                healthy: true,
                message: 'Connected to Contentful API'
            });
        } catch (error) {
            checks.push({
                name: 'contentful-api',
                healthy: false,
                message: `Contentful API error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
            try {
                const query: any = {
                    limit,
                    ...filters
                };

                if (contentType) {
                    query.content_type = contentType;
                }

                const response = await this.client.getEntries(query);
                return response.items.map((item: any) => this.transformToUniversalContent(item));
            } catch (error: any) {
                // Handle rate limiting
                if (error?.sys?.id === 'RateLimitExceeded' || error?.status === 429) {
                    throw new Error(`Rate limit exceeded: ${error.message}`);
                }
                // Handle network errors
                if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
                    throw new Error(`Network timeout: ${error.message}`);
                }
                throw error;
            }
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
            } catch (error: any) {
                // Check for not found errors
                if (error?.sys?.id === 'NotFound') {
                    throw new Error(`The resource could not be found.`);
                }
                this.logger.warn(`Entry not found: ${id}`);
                throw error;
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
                order: '-sys.createdAt'
            };

            if (endDate) {
                query['sys.createdAt[gte]'] = startDate.toISOString();
                query['sys.createdAt[lte]'] = endDate.toISOString();
            } else {
                query['sys.createdAt[gte]'] = startDate.toISOString();
            }

            const response = await this.client.getEntries(query);
            return response.items.map((item: any) => this.transformToUniversalContent(item));
        });
    }

    // ==========================================================================
    // CONTENT ENTRY MANAGEMENT METHODS
    // ==========================================================================

    /**
     * Create content entry using Contentful Management API
     */
    async createEntry(contentType: string, fields: any, progressCallback?: any): Promise<any> {
        return this.execute('createEntry', async () => {
            try {
                progressCallback?.({
                    type: 'progress',
                    message: 'Creating Contentful entry',
                    progress: 25,
                    timestamp: new Date(),
                });

                const environment = await this.getManagementEnvironment();
                const entry = await environment.createEntry(contentType, { fields });

                progressCallback?.({
                    type: 'progress',
                    message: `Entry created: ${entry.sys.id}`,
                    progress: 100,
                    timestamp: new Date(),
                });

                return this.mapToBusinessContext('entry', entry);
            } catch (error: any) {
                // Handle validation errors
                if (error?.sys?.id === 'ValidationFailed') {
                    throw new Error(error.message);
                }
                throw error;
            }
        });
    }

    /**
     * Update existing content entry
     */
    async updateEntry(entryId: string, fields: any, _progressCallback?: any): Promise<any> {
        return this.execute('updateEntry', async () => {
            const environment = await this.getManagementEnvironment();
            const entry = await environment.getEntry(entryId);
            
            // Update fields
            Object.assign(entry.fields, fields);
            const updatedEntry = await entry.update();
            
            return this.mapToBusinessContext('entry', updatedEntry);
        });
    }

    /**
     * Delete content entry
     */
    async deleteEntry(entryId: string): Promise<void> {
        return this.execute('deleteEntry', async () => {
            const environment = await this.getManagementEnvironment();
            const entry = await environment.getEntry(entryId);
            await entry.delete();
        });
    }

    // ==========================================================================
    // ASSET MANAGEMENT METHODS
    // ==========================================================================

    /**
     * Upload asset to Contentful
     */
    async uploadAsset(buffer: Buffer, options: {
        title: string;
        fileName: string;
        contentType: string;
        description?: string;
    }, progressCallback?: any): Promise<any> {
        return this.execute('uploadAsset', async () => {
            try {
                progressCallback?.({
                    type: 'progress',
                    message: 'Uploading asset to Contentful',
                    progress: 25,
                    timestamp: new Date(),
                });

                const environment = await this.getManagementEnvironment();

                // Create asset
                const asset = await environment.createAsset({
                    fields: {
                        title: { 'en-US': options.title },
                        description: { 'en-US': options.description || '' },
                        file: {
                            'en-US': {
                                fileName: options.fileName,
                                contentType: options.contentType,
                                upload: buffer
                            }
                        }
                    }
                });

                // Process asset
                await asset.processForAllLocales();

                progressCallback?.({
                    type: 'progress',
                    message: `Asset uploaded: ${asset.sys.id}`,
                    progress: 100,
                    timestamp: new Date(),
                });

                return this.mapToBusinessContext('asset', asset);
            } catch (error: any) {
                // Handle validation errors
                if (error?.sys?.id === 'ValidationFailed') {
                    throw new Error(error.message);
                }
                throw error;
            }
        });
    }

    /**
     * Get asset by ID
     */
    async getAsset(assetId: string): Promise<any> {
        return this.execute('getAsset', async () => {
            try {
                // Use delivery client for reading assets
                const asset = await this.client.getAsset(assetId);
                return asset;
            } catch (error: any) {
                // Check for not found errors
                if (error?.sys?.id === 'NotFound') {
                    throw new Error(`The resource could not be found.`);
                }
                throw error;
            }
        });
    }

    /**
     * Delete asset
     */
    async deleteAsset(assetId: string): Promise<void> {
        return this.execute('deleteAsset', async () => {
            const environment = await this.getManagementEnvironment();
            const asset = await environment.getAsset(assetId);
            await asset.delete();
        });
    }

    /**
     * List assets with pagination
     */
    async listAssets(options: any = {}): Promise<any> {
        return this.execute('listAssets', async () => {
            const environment = await this.getManagementEnvironment();
            const response = await environment.getAssets(options);
            return {
                items: response.items.map((asset: any) => this.mapToBusinessContext('asset', asset)),
                total: response.total,
                skip: response.skip,
                limit: response.limit
            };
        });
    }

    // ==========================================================================
    // CONTENT TYPE MANAGEMENT METHODS
    // ==========================================================================

    /**
     * Get content type definition
     */
    async getContentType(contentTypeId: string): Promise<any> {
        return this.execute('getContentType', async () => {
            const environment = await this.getManagementEnvironment();
            return await environment.getContentType(contentTypeId);
        });
    }

    /**
     * List all content types
     */
    async listContentTypes(): Promise<any> {
        return this.execute('listContentTypes', async () => {
            const environment = await this.getManagementEnvironment();
            const response = await environment.getContentTypes();
            return {
                items: response.items,
                total: response.total,
                skip: response.skip,
                limit: response.limit
            };
        });
    }

    /**
     * Update content type definition
     */
    async updateContentType(contentTypeId: string, updates: any): Promise<any> {
        return this.execute('updateContentType', async () => {
            const environment = await this.getManagementEnvironment();
            const contentType = await environment.getContentType(contentTypeId);
            
            Object.assign(contentType, updates);
            return await contentType.update();
        });
    }

    /**
     * Get service capabilities
     */
    getCapabilities(): string[] {
        return [
            'content-management',
            'content-delivery',
            'asset-management',
            'content-types',
            'business-context-mapping'
        ];
    }

    /**
     * Get management environment (helper method)
     */
    private async getManagementEnvironment(): Promise<any> {
        if (!this.managementClient) {
            throw new Error('Management client not initialized');
        }
        const space = await this.managementClient.getSpace(this.contentfulConfig.spaceId);
        return await space.getEnvironment(this.contentfulConfig.environment || 'master');
    }

    // ==========================================================================
    // EXISTING METHODS CONTINUE BELOW
    // ==========================================================================

    /**
     * Create content type from business recipe
     */
    async createContentType(contentTypeDefinition: any): Promise<any> {
        return this.execute('createContentType', async () => {
            if (!this.managementClient) {
                throw new Error('Management token required for content type creation');
            }

            const space = await this.managementClient.getSpace(this.contentfulConfig.spaceId);
            const environment = await space.getEnvironment(this.contentfulConfig.environment || 'master');

            // Create content type
            const contentType = await environment.createContentType({
                name: contentTypeDefinition.name,
                description: contentTypeDefinition.description,
                displayField: this.findDisplayField(contentTypeDefinition.fields),
                fields: contentTypeDefinition.fields
            });

            this.logger.info('Content type created', {
                contentTypeId: contentType.sys.id,
                name: contentTypeDefinition.name,
                fieldsCount: contentTypeDefinition.fields.length
            });

            return {
                id: contentType.sys.id,
                name: contentType.name,
                description: contentType.description,
                fields: contentType.fields
            };
        });
    }

    /**
     * Delete content type
     */
    async deleteContentType(contentTypeId: string): Promise<void> {
        return this.execute('deleteContentType', async () => {
            if (!this.managementClient) {
                throw new Error('Management token required for content type deletion');
            }

            const space = await this.managementClient.getSpace(this.contentfulConfig.spaceId);
            const environment = await space.getEnvironment(this.contentfulConfig.environment || 'master');

            const contentType = await environment.getContentType(contentTypeId);
            await contentType.delete();

            this.logger.info('Content type deleted', { contentTypeId });
        });
    }

    // ==========================================================================
    // BUSINESS CONTEXT MAPPING
    // ==========================================================================

    /**
     * Map Contentful data to business context
     */
    private mapToBusinessContext(entityType: string, contentfulData: any): any {
        if (entityType === 'entry') {
            // Return the raw entry data for test compatibility
            return {
                success: true,
                entry: contentfulData,
                metadata: {
                    provider: 'contentful',
                    timestamp: new Date(),
                    entityType
                }
            };
        }
        
        if (entityType === 'asset') {
            // Return the raw asset data for test compatibility
            return {
                success: true,
                asset: contentfulData,
                metadata: {
                    provider: 'contentful',
                    timestamp: new Date(),
                    entityType
                }
            };
        }
        
        // For other types, return wrapped structure
        return {
            success: true,
            [entityType]: contentfulData,
            metadata: {
                provider: 'contentful',
                timestamp: new Date(),
                entityType
            }
        };
    }

    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================

    private async testConnection(): Promise<void> {
        try {
            const space = await this.client.getSpace();
            this.logger.debug(`Connected to Contentful space: ${space.name}`);
        } catch (error: any) {
            // Check for authentication errors
            if (error?.sys?.id === 'AccessTokenInvalid') {
                throw new Error('Invalid Contentful credentials');
            }
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