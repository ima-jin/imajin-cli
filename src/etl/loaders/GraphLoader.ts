/**
 * GraphLoader - Specialized loader for graph data to external destinations
 * 
 * @package     @imajin/cli
 * @subpackage  etl/loaders
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Load graph data to external API endpoints
 * - Handle graph merge conflicts and resolution strategies
 * - Support for authenticated graph loading
 * - Real-time loading progress and error handling
 */

import { AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import {
    ETLContext,
    ETLResult,
    GraphLoadingConfig,
    GraphModel,
    GraphLoader as IGraphLoader
} from '../core/interfaces.js';
import { BaseLoader } from './BaseLoader.js';

/**
 * Graph loader implementation
 */
export class GraphLoader extends BaseLoader<GraphModel> implements IGraphLoader {
    public readonly name = 'GraphLoader';
    public readonly description = 'Loads graph data to external API endpoints';

    public readonly inputSchema = z.object({
        modelType: z.enum(['social-commerce', 'creative-portfolio', 'professional-network', 'community-hub', 'custom']),
        version: z.string(),
        schema: z.object({
            version: z.string(),
            entities: z.record(z.any()),
            relationships: z.record(z.any()),
            constraints: z.record(z.any())
        }),
        compatibilityMap: z.object({
            directCompatible: z.array(z.string()),
            translatableFrom: z.array(z.string()),
            translatableTo: z.array(z.string())
        }),
        metadata: z.record(z.any())
    }) as z.ZodType<GraphModel, z.ZodTypeDef, GraphModel>;

    private conflictResolutionStrategies = new Map<string, (existing: any, incoming: any) => any>();

    constructor() {
        super();
        this.initializeConflictStrategies();
    }

    /**
     * Implementation of abstract performLoad method
     */
    protected async performLoad(
        item: GraphModel,
        context: ETLContext,
        config: any
    ): Promise<any> {
        const graphConfig = config as GraphLoadingConfig;
        const result = await this.loadGraph(item, graphConfig, context);

        return {
            success: result.success,
            id: item.metadata?.id || 'unknown',
            item: result.data,
            error: result.error,
            metadata: result.metadata
        };
    }

    /**
     * Implementation of abstract testConnection method
     */
    protected async testConnection(config: any): Promise<void> {
        const graphConfig = config as GraphLoadingConfig;
        const requestConfig = this.buildRequestConfig(graphConfig);

        try {
            await this.httpClient.get(graphConfig.endpoint, requestConfig);
        } catch (error) {
            throw new Error(`Connection test failed: ${(error as Error).message}`);
        }
    }

    /**
     * Load graph data to target destination
     */
    async loadGraph(
        graph: GraphModel,
        config: GraphLoadingConfig,
        context: ETLContext
    ): Promise<ETLResult<any>> {
        const startTime = Date.now();

        try {
            context.events.emit('progress', {
                stage: 'load',
                step: 'graph-loading',
                processed: 0,
                message: `Loading ${graph.modelType} graph to ${config.endpoint}`
            });

            // Configure authentication
            const requestConfig = this.buildRequestConfig(config);

            // Handle different merge strategies
            let result: any;

            switch (config.mergeStrategy) {
                case 'replace':
                    result = await this.replaceGraph(graph, config, requestConfig, context);
                    break;

                case 'merge':
                    result = await this.mergeGraph(graph, config, requestConfig, context);
                    break;

                case 'append':
                    result = await this.appendGraph(graph, config, requestConfig, context);
                    break;

                default:
                    throw new Error(`Unknown merge strategy: ${config.mergeStrategy}`);
            }

            context.events.emit('progress', {
                stage: 'load',
                step: 'graph-loading',
                processed: 1,
                total: 1,
                percentage: 100,
                message: `Successfully loaded graph using ${config.mergeStrategy} strategy`
            });

            return {
                success: true,
                data: [result],
                processed: 1,
                metadata: {
                    loader: this.name,
                    endpoint: config.endpoint,
                    mergeStrategy: config.mergeStrategy,
                    graphModel: graph.modelType
                },
                duration: Date.now() - startTime
            };

        } catch (error) {
            context.events.emit('step:error', 'graph-loading', error as Error, context);

            return {
                success: false,
                error: error as Error,
                processed: 0,
                metadata: {
                    loader: this.name,
                    endpoint: config.endpoint,
                    failed: true
                },
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Handle graph merge conflicts
     */
    async handleGraphConflict(
        existing: GraphModel,
        incoming: GraphModel,
        context: ETLContext
    ): Promise<GraphModel> {
        try {
            // Use identity as the key for conflict resolution
            const existingId = existing.metadata?.id || this.extractIdentityId(existing);
            const incomingId = incoming.metadata?.id || this.extractIdentityId(incoming);

            if (existingId !== incomingId) {
                // Different entities, no conflict
                return incoming;
            }

            // Same entity, resolve conflict based on timestamps or other criteria
            const existingTimestamp = this.extractTimestamp(existing);
            const incomingTimestamp = this.extractTimestamp(incoming);

            if (incomingTimestamp > existingTimestamp) {
                // Incoming is newer, prefer it but merge metadata
                return {
                    ...incoming,
                    metadata: {
                        ...existing.metadata,
                        ...incoming.metadata,
                        lastUpdated: new Date().toISOString(),
                        conflictResolved: true,
                        resolvedAt: new Date().toISOString(),
                        resolvedBy: 'timestamp-preference'
                    }
                };
            } else {
                // Existing is newer or same age, keep it but update metadata
                return {
                    ...existing,
                    metadata: {
                        ...existing.metadata,
                        lastChecked: new Date().toISOString(),
                        conflictIgnored: true,
                        ignoredAt: new Date().toISOString()
                    }
                };
            }

        } catch (error) {
            context.events.emit('step:error', 'graph-conflict-resolution', error as Error, context);

            // Default to incoming graph on resolution failure
            return {
                ...incoming,
                metadata: {
                    ...incoming.metadata,
                    conflictResolutionFailed: true,
                    error: (error as Error).message
                }
            };
        }
    }

    /**
     * Implementation of base load method
     */
    async load(
        data: GraphModel[],
        context: ETLContext,
        config?: GraphLoadingConfig
    ): Promise<ETLResult<any>> {
        const startTime = Date.now();

        if (!config) {
            throw new Error('GraphLoadingConfig is required for graph loading');
        }

        try {
            const results: any[] = [];

            for (let i = 0; i < data.length; i++) {
                const graph = data[i];

                if (!graph) {
                    continue; // Skip undefined/null graphs
                }

                context.events.emit('progress', {
                    stage: 'load',
                    step: 'batch-graph-loading',
                    processed: i,
                    total: data.length,
                    percentage: (i / data.length) * 100,
                    message: `Loading graph ${i + 1} of ${data.length}`
                });

                const result = await this.loadGraph(graph, config, context);

                if (result.success && result.data) {
                    results.push(...result.data);
                } else {
                    // Handle loading failure based on conflict resolution
                    if (config.conflictResolution === 'error') {
                        throw new Error(`Failed to load graph ${i}: ${result.error?.message}`);
                    }
                    // Skip failed loads for 'skip' strategy, continue for 'overwrite'
                }
            }

            return {
                success: true,
                data: results,
                processed: results.length,
                metadata: {
                    loader: this.name,
                    endpoint: config.endpoint,
                    originalCount: data.length,
                    loadedCount: results.length
                },
                duration: Date.now() - startTime
            };

        } catch (error) {
            return {
                success: false,
                error: error as Error,
                processed: 0,
                metadata: {
                    loader: this.name,
                    endpoint: config.endpoint
                },
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Load a single graph item
     */
    async loadItem(item: GraphModel, context: ETLContext): Promise<any> {
        // For single item loading, we need configuration
        // This would typically be set up in the pipeline context
        const config: GraphLoadingConfig = {
            endpoint: 'http://localhost:3000/api/graph', // Default fallback
            mergeStrategy: 'merge',
            conflictResolution: 'overwrite'
        };

        const result = await this.loadGraph(item, config, context);

        if (result.success && result.data) {
            return result.data[0];
        } else {
            throw new Error(`Failed to load graph item: ${result.error?.message}`);
        }
    }



    /**
     * Initialize conflict resolution strategies
     */
    private initializeConflictStrategies(): void {
        this.conflictResolutionStrategies.set('timestamp', (existing, incoming) => {
            const existingTime = new Date(existing.metadata?.updated || existing.metadata?.created || 0);
            const incomingTime = new Date(incoming.metadata?.updated || incoming.metadata?.created || 0);
            return incomingTime > existingTime ? incoming : existing;
        });

        this.conflictResolutionStrategies.set('version', (existing, incoming) => {
            const existingVersion = existing.version || '0.0.0';
            const incomingVersion = incoming.version || '0.0.0';
            return this.compareVersions(incomingVersion, existingVersion) > 0 ? incoming : existing;
        });

        this.conflictResolutionStrategies.set('merge', (existing, incoming) => {
            return {
                ...existing,
                ...incoming,
                metadata: {
                    ...existing.metadata,
                    ...incoming.metadata,
                    mergedAt: new Date().toISOString()
                }
            };
        });
    }

    /**
     * Build request configuration with authentication
     */
    private buildRequestConfig(config: GraphLoadingConfig): AxiosRequestConfig {
        const requestConfig: AxiosRequestConfig = {
            headers: {}
        };

        // Add authentication headers
        if (config.authentication) {
            switch (config.authentication.type) {
                case 'bearer':
                    requestConfig.headers!['Authorization'] = `Bearer ${config.authentication.credentials.token}`;
                    break;

                case 'api-key':
                    if (config.authentication.credentials.headerName) {
                        requestConfig.headers![config.authentication.credentials.headerName] =
                            config.authentication.credentials.apiKey;
                    } else {
                        requestConfig.headers!['X-API-Key'] = config.authentication.credentials.apiKey;
                    }
                    break;

                case 'oauth':
                    requestConfig.headers!['Authorization'] = `Bearer ${config.authentication.credentials.accessToken}`;
                    break;
            }
        }

        return requestConfig;
    }

    /**
     * Replace entire graph at destination
     */
    private async replaceGraph(
        graph: GraphModel,
        config: GraphLoadingConfig,
        requestConfig: AxiosRequestConfig,
        _context: ETLContext
    ): Promise<any> {
        const response = await this.httpClient.put(config.endpoint, graph, requestConfig);
        return response.data;
    }

    /**
     * Merge graph with existing data at destination
     */
    private async mergeGraph(
        graph: GraphModel,
        config: GraphLoadingConfig,
        requestConfig: AxiosRequestConfig,
        context: ETLContext
    ): Promise<any> {
        try {
            // First, try to get existing graph
            const existingResponse = await this.httpClient.get(config.endpoint, requestConfig);
            const existingGraph = existingResponse.data as GraphModel;

            // Resolve conflicts
            const mergedGraph = await this.handleGraphConflict(existingGraph, graph, context);

            // Update with merged data
            const response = await this.httpClient.put(config.endpoint, mergedGraph, requestConfig);
            return response.data;

        } catch (error: any) {
            if (error.response?.status === 404) {
                // No existing graph, create new one
                const response = await this.httpClient.post(config.endpoint, graph, requestConfig);
                return response.data;
            }
            throw error;
        }
    }

    /**
     * Append graph data to existing data at destination
     */
    private async appendGraph(
        graph: GraphModel,
        config: GraphLoadingConfig,
        requestConfig: AxiosRequestConfig,
        _context: ETLContext
    ): Promise<any> {
        // For append strategy, we add a timestamp to make it unique
        const appendedGraph = {
            ...graph,
            metadata: {
                ...graph.metadata,
                appendedAt: new Date().toISOString(),
                originalId: graph.metadata?.id
            }
        };

        const response = await this.httpClient.post(config.endpoint, appendedGraph, requestConfig);
        return response.data;
    }

    /**
     * Extract identity ID from graph
     */
    private extractIdentityId(graph: GraphModel): string {
        const identity = (graph as any).identity;
        return identity?.id || identity?.email || 'unknown';
    }

    /**
     * Extract timestamp from graph for conflict resolution
     */
    private extractTimestamp(graph: GraphModel): number {
        const updated = graph.metadata?.updated || graph.metadata?.lastUpdated;
        const created = graph.metadata?.created || graph.metadata?.createdAt;

        if (updated) return new Date(updated).getTime();
        if (created) return new Date(created).getTime();

        return 0;
    }

    /**
     * Compare version strings
     */
    private compareVersions(a: string, b: string): number {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
            const aPart = aParts[i] || 0;
            const bPart = bParts[i] || 0;

            if (aPart > bPart) return 1;
            if (aPart < bPart) return -1;
        }

        return 0;
    }

    /**
     * Validate loading configuration
     */
    async validate(config?: GraphLoadingConfig): Promise<boolean> {
        if (!config) {
            return false;
        }

        // Validate required fields
        if (!config.endpoint) {
            return false;
        }

        // Validate URL format
        try {
            new URL(config.endpoint);
        } catch {
            return false;
        }

        // Validate merge strategy
        const validStrategies = ['replace', 'merge', 'append'];
        if (!validStrategies.includes(config.mergeStrategy)) {
            return false;
        }

        // Validate conflict resolution
        const validResolutions = ['error', 'skip', 'overwrite'];
        if (!validResolutions.includes(config.conflictResolution)) {
            return false;
        }

        return true;
    }

    /**
     * Get metadata about the loader
     */
    async getMetadata(): Promise<Record<string, any>> {
        return {
            name: this.name,
            description: this.description,
            supportedModels: ['social-commerce', 'creative-portfolio', 'professional-network', 'community-hub'],
            mergeStrategies: ['replace', 'merge', 'append'],
            conflictResolutions: ['error', 'skip', 'overwrite'],
            authenticationTypes: ['bearer', 'api-key', 'oauth'],
            capabilities: [
                'graph-loading',
                'conflict-resolution',
                'merge-strategies',
                'authenticated-loading',
                'batch-loading'
            ]
        };
    }
} 