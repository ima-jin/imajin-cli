/**
 * GraphExtractor - Specialized extractor for graph data from external sources
 * 
 * @package     @imajin/cli
 * @subpackage  etl/extractors
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Extract graph data from external API endpoints
 * - Auto-detect graph model types from structure
 * - Compatibility analysis for translation planning
 * - Secure authentication for graph access
 */

import axios, { AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { ALL_MODEL_TYPES, DEBUG_LABELS } from '../../constants/ETLConstants.js';
import {
    CompatibilityMatrix,
    ETLContext,
    ETLResult,
    GraphExtractionConfig,
    GraphModel,
    GraphExtractor as IGraphExtractor
} from '../core/interfaces.js';
import { ModelFactory } from '../graphs/models.js';
import { BaseExtractor } from './BaseExtractor.js';
import type { Logger } from '../../logging/Logger.js';

/**
 * Graph extractor implementation
 */
export class GraphExtractor extends BaseExtractor<GraphModel> implements IGraphExtractor {
    public readonly name = 'GraphExtractor';
    public readonly description = 'Extracts graph data from external API endpoints';
    public readonly outputSchema = z.object({
        modelType: z.enum(ALL_MODEL_TYPES),
        version: z.string(),
        schema: z.object({
            version: z.string(),
            entities: z.record(z.string(), z.any()),
            relationships: z.record(z.string(), z.any()),
            constraints: z.record(z.string(), z.any())
        }),
        compatibilityMap: z.object({
            directCompatible: z.array(z.string()),
            translatableFrom: z.array(z.string()),
            translatableTo: z.array(z.string())
        }),
        metadata: z.record(z.string(), z.any())
    }) as z.ZodType<GraphModel>;

    private modelDetectionRules = new Map<string, (data: any) => boolean>();
    private logger: Logger;

    constructor() {
        super();
        this.logger = new (require('../../logging/Logger.js').Logger)({ level: 'debug' });
        this.initializeModelDetectionRules();
    }

    /**
     * Implementation of abstract performExtraction method
     */
    protected async performExtraction(context: ETLContext, config?: any): Promise<GraphModel[]> {
        if (!config || !config.endpoint) {
            throw new Error('GraphExtractionConfig is required with endpoint');
        }

        const result = await this.extractGraph(config as GraphExtractionConfig, context);
        return result.data ? [result.data] : [];
    }

    /**
     * Extract graph data from external source
     */
    async extractGraph(config: GraphExtractionConfig, context: ETLContext): Promise<ETLResult<GraphModel>> {
        const startTime = Date.now();

        try {
            context.events.emit('progress', {
                stage: 'extract',
                step: 'graph-extraction',
                processed: 0,
                message: `Extracting graph from ${config.endpoint}`
            });

            // Configure authentication
            const requestConfig = this.buildRequestConfig(config);

            // Extract raw data
            const response = await this.httpClient.get(config.endpoint, requestConfig);
            const rawData = response.data;

            // Detect model type if not specified
            let modelType = config.modelType;
            if (config.autoDetectModel || !modelType) {
                modelType = await this.detectModel(config);
            }

            // Transform raw data to graph model
            const graphData = await this.transformToGraphModel(rawData, modelType);

            context.events.emit('progress', {
                stage: 'extract',
                step: 'graph-extraction',
                processed: 1,
                total: 1,
                percentage: 100,
                message: `Successfully extracted ${modelType} graph`
            });

            return {
                success: true,
                data: graphData,
                processed: 1,
                metadata: {
                    modelType,
                    endpoint: config.endpoint,
                    detectedModel: config.autoDetectModel
                },
                duration: Date.now() - startTime
            };

        } catch (error) {
            context.events.emit('step:error', 'graph-extraction', error as Error, context);

            return {
                success: false,
                error: error as Error,
                processed: 0,
                metadata: {
                    endpoint: config.endpoint,
                    failed: true
                },
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Detect the graph model type of the source
     */
    async detectModel(config: GraphExtractionConfig): Promise<string> {
        try {
            const requestConfig = this.buildRequestConfig(config);

            // Try to fetch a small sample of data for model detection
            const sampleEndpoint = this.buildSampleEndpoint(config.endpoint);
            const response = await this.httpClient.get(sampleEndpoint, requestConfig);
            const sampleData = response.data;

            // Run detection rules
            for (const [modelType, detectionRule] of this.modelDetectionRules) {
                if (detectionRule(sampleData)) {
                    return modelType;
                }
            }

            // Default fallback
            return 'social-commerce';

        } catch (error) {
            // If detection fails, return default
            return 'social-commerce';
        }
    }

    /**
     * Get compatibility information for the source
     */
    async getCompatibility(config: GraphExtractionConfig): Promise<CompatibilityMatrix> {
        try {
            const modelType = await this.detectModel(config);
            const standardModel = ModelFactory.getModelDefinition(modelType);

            if (standardModel) {
                return standardModel.compatibility;
            }

            // Return default compatibility for unknown models
            return {
                directCompatible: [],
                translatableFrom: ['social-commerce', 'creative-portfolio', 'professional-network', 'community-hub'],
                translatableTo: ['social-commerce', 'creative-portfolio', 'professional-network', 'community-hub']
            };

        } catch (error) {
            // Return conservative compatibility on error
            return {
                directCompatible: [],
                translatableFrom: [],
                translatableTo: []
            };
        }
    }

    /**
     * Standard extract method implementation
     */
    async extract(context: ETLContext, config?: GraphExtractionConfig): Promise<ETLResult<GraphModel[]>> {
        if (!config) {
            throw new Error('GraphExtractionConfig is required for graph extraction');
        }

        const result = await this.extractGraph(config, context);

        if (!result.success || !result.data) {
            return {
                success: false,
                error: result.error || new Error('No data extracted'),
                processed: 0,
                metadata: result.metadata,
                duration: result.duration
            };
        }

        return {
            success: true,
            data: [result.data],
            processed: result.processed,
            metadata: result.metadata,
            duration: result.duration
        };
    }

    /**
     * Initialize HTTP client with default configuration
     */
    private initializeHttpClient(): void {
        this.httpClient = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imajin-cli-graph-extractor/1.0.0'
            }
        });

        // Add request interceptor for logging
        this.httpClient.interceptors.request.use(
            (config) => {
                this.logger.debug('HTTP request initiated', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    extractor: 'GraphExtractor'
                });
                return config;
            },
            (error) => {
                this.logger.error('HTTP request failed', error as Error, {
                    extractor: 'GraphExtractor'
                });
                return Promise.reject(error);
            }
        );

        // Add response interceptor for error handling
        this.httpClient.interceptors.response.use(
            (response) => {
                this.logger.debug('HTTP response received', {
                    status: response.status,
                    statusText: response.statusText,
                    extractor: 'GraphExtractor'
                });
                return response;
            },
            (error) => {
                this.logger.error('HTTP response error', error as Error, {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    extractor: 'GraphExtractor'
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Initialize model detection rules
     */
    private initializeModelDetectionRules(): void {
        // Social Commerce detection
        this.modelDetectionRules.set('social-commerce', (data: any) => {
            return !!(
                data.catalog?.products ||
                data.commerce?.transactions ||
                data.social?.reputation ||
                (data.products && data.transactions)
            );
        });

        // Creative Portfolio detection
        this.modelDetectionRules.set('creative-portfolio', (data: any) => {
            return !!(
                data.portfolio?.artworks ||
                data.portfolio?.collections ||
                data.portfolio?.exhibitions ||
                data.professional?.commissions ||
                (data.artworks && data.exhibitions)
            );
        });

        // Professional Network detection
        this.modelDetectionRules.set('professional-network', (data: any) => {
            return !!(
                data.experience?.positions ||
                data.experience?.skills ||
                data.experience?.certifications ||
                data.network?.recommendations ||
                (data.positions && data.skills)
            );
        });

        // Community Hub detection
        this.modelDetectionRules.set('community-hub', (data: any) => {
            return !!(
                data.community?.groups ||
                data.community?.discussions ||
                data.resources?.items ||
                (data.groups && data.discussions)
            );
        });
    }

    /**
     * Build request configuration with authentication
     */
    private buildRequestConfig(config: GraphExtractionConfig): AxiosRequestConfig {
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
     * Build sample endpoint for model detection
     */
    private buildSampleEndpoint(originalEndpoint: string): string {
        // Try to build a lightweight endpoint for model detection
        const url = new URL(originalEndpoint);

        // Add query parameters to limit response size
        url.searchParams.set('limit', '1');
        url.searchParams.set('sample', 'true');

        return url.toString();
    }

    /**
     * Transform raw data to graph model structure
     */
    private async transformToGraphModel(rawData: any, modelType: string): Promise<GraphModel> {
        const modelDef = ModelFactory.getModelDefinition(modelType);

        if (!modelDef) {
            throw new Error(`Unknown model type: ${modelType}`);
        }

        // Create base graph structure
        const graphModel: GraphModel = {
            modelType,
            version: modelDef.version,
            schema: modelDef.schema,
            compatibilityMap: modelDef.compatibility,
            metadata: {
                extracted: true,
                extractedAt: new Date().toISOString(),
                source: 'external-api'
            }
        };

        // Merge with raw data, ensuring type safety
        const mergedData = {
            ...graphModel,
            ...rawData
        };

        // Validate against model schema if available
        return this.validateGraphModel(mergedData, modelType);
    }

    /**
     * Validate graph model against schema
     */
    private async validateGraphModel(data: any, modelType: string): Promise<GraphModel> {
        // For now, return the data as-is
        // In a full implementation, we would validate against the Zod schemas
        return data as GraphModel;
    }

    /**
     * Get metadata about the extraction source
     */
    async getMetadata(): Promise<Record<string, any>> {
        return {
            extractorType: 'graph',
            supportedModels: Array.from(this.modelDetectionRules.keys()),
            authenticationTypes: ['bearer', 'api-key', 'oauth'],
            capabilities: [
                'model-detection',
                'compatibility-analysis',
                'batch-extraction',
                'authenticated-access'
            ]
        };
    }

    /**
     * Validate extractor configuration
     */
    async validate(config?: GraphExtractionConfig): Promise<boolean> {
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

        // Validate authentication if provided
        if (config.authentication) {
            const { type, credentials } = config.authentication;

            switch (type) {
                case 'bearer':
                    return !!credentials.token;
                case 'api-key':
                    return !!credentials.apiKey;
                case 'oauth':
                    return !!credentials.accessToken;
                default:
                    return false;
            }
        }

        return true;
    }
} 