/**
 * BaseExtractor - Abstract base class for data extraction components
 * 
 * @package     @imajin/cli
 * @subpackage  etl/extractors
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - HTTP client for API requests
 * - Rate limiting for API compliance
 * - Authentication management
 */

import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { ETLConfig, ETLContext, ETLProgress, ETLResult, Extractor } from '../core/interfaces.js';

/**
 * Base configuration for HTTP extractors
 */
export interface BaseExtractorConfig extends ETLConfig {
    readonly baseUrl?: string;
    readonly headers?: Record<string, string>;
    readonly auth?: {
        type: 'bearer' | 'basic' | 'api-key';
        token?: string;
        username?: string;
        password?: string;
        apiKey?: string;
        headerName?: string;
    };
    readonly pagination?: {
        type: 'page' | 'offset' | 'cursor';
        pageSize?: number;
        maxPages?: number;
        pageParam?: string;
        sizeParam?: string;
        offsetParam?: string;
        cursorParam?: string;
    };
    readonly rateLimit?: {
        requestsPerSecond: number;
        burstSize?: number;
    };
}

/**
 * Abstract base extractor providing common HTTP functionality
 */
export abstract class BaseExtractor<TOutput = any> implements Extractor<TOutput> {
    public abstract readonly name: string;
    public abstract readonly description?: string;
    public abstract readonly outputSchema?: z.ZodSchema<TOutput>;

    protected httpClient: AxiosInstance;
    protected lastRequestTime: number = 0;
    protected requestQueue: Array<() => Promise<any>> = [];
    protected isProcessingQueue: boolean = false;

    constructor(protected config: BaseExtractorConfig = {}) {
        this.httpClient = this.createHttpClient();
        this.setupRateLimit();
    }

    /**
     * Extract data from the configured source
     */
    public async extract(context: ETLContext, config?: ETLConfig): Promise<ETLResult<TOutput[]>> {
        const _startTime = Date.now();
        const mergedConfig = { ...this.config, ...config };

        try {
            context.events.emit('step:start', this.name, context);

            const data = await this.performExtraction(context, mergedConfig);
            const duration = Date.now() - _startTime;

            // Validate output if schema provided
            if (this.outputSchema && mergedConfig.validateOutput) {
                await this.validateOutput(data);
            }

            const result: ETLResult<TOutput[]> = {
                success: true,
                data,
                processed: data.length,
                metadata: {
                    extractor: this.name,
                    config: mergedConfig,
                },
                duration,
            };

            context.events.emit('step:complete', this.name, result, context);
            context.events.emit('data:extracted', data.length, context);

            return result;
        } catch (error) {
            const duration = Date.now() - _startTime;
            const result: ETLResult<TOutput[]> = {
                success: false,
                error: error as Error,
                processed: 0,
                metadata: {
                    extractor: this.name,
                    config: mergedConfig,
                },
                duration,
            };

            context.events.emit('step:error', this.name, error as Error, context);
            return result;
        }
    }

    /**
     * Validate extractor configuration
     */
    public async validate(config?: ETLConfig): Promise<boolean> {
        const mergedConfig = { ...this.config, ...config };

        // Validate authentication
        if (mergedConfig.auth) {
            return this.validateAuth(mergedConfig.auth);
        }

        return true;
    }

    /**
     * Get metadata about the extraction source
     */
    public async getMetadata(): Promise<Record<string, any>> {
        return {
            name: this.name,
            description: this.description,
            config: this.config,
            outputSchema: this.outputSchema?.describe?.('Output schema') || this.outputSchema,
        };
    }

    /**
     * Abstract method for actual data extraction
     */
    protected abstract performExtraction(
        context: ETLContext,
        config: BaseExtractorConfig
    ): Promise<TOutput[]>;

    /**
     * Make HTTP request with rate limiting
     */
    protected async makeRequest<T = any>(
        url: string,
        options: AxiosRequestConfig = {},
        _context: ETLContext
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const response = await this.httpClient.request<T>({
                        url,
                        ...options,
                    });
                    resolve(response.data);
                } catch (error) {
                    reject(error instanceof Error ? error : new Error(String(error)));
                }
            });

            this.processQueue().catch((error) =>
                reject(error instanceof Error ? error : new Error(String(error)))
            );
        });
    }

    /**
     * Extract data with pagination support
     */
    protected async extractWithPagination<T = any>(
        url: string,
        options: AxiosRequestConfig,
        context: ETLContext,
        config: BaseExtractorConfig
    ): Promise<T[]> {
        const allData: T[] = [];
        const _pagination = config.pagination;

        if (!_pagination) {
            const data = await this.makeRequest<T[]>(url, options, context);
            return Array.isArray(data) ? data : [data];
        }

        let currentPage = 1;
        let hasMore = true;
        let cursor: string | undefined;

        while (hasMore && (!_pagination.maxPages || currentPage <= _pagination.maxPages)) {
            const params = this.buildPaginationParams(_pagination, currentPage, cursor);
            const requestOptions = {
                ...options,
                params: { ...options.params, ...params },
            };

            this.emitProgress(context, {
                stage: 'extract' as const,
                step: `Fetching page ${currentPage}`,
                processed: allData.length,
                message: `Processing page ${currentPage}`,
            });

            const response = await this.makeRequest<any>(url, requestOptions, context);
            const pageData = this.extractDataFromResponse(response, { type: 'page' });

            if (Array.isArray(pageData)) {
                allData.push(...pageData);
            } else if (pageData) {
                allData.push(pageData);
            }

            // Check if there's more data
            hasMore = this.hasMorePages(response, pageData, _pagination);
            cursor = this.extractCursor(response, _pagination);
            currentPage++;
        }

        return allData;
    }

    /**
     * Create HTTP client with default configuration
     */
    private createHttpClient(): AxiosInstance {
        const clientConfig: any = {
            timeout: this.config.timeout || 30000,
        };

        if (this.config.baseUrl) {
            clientConfig.baseURL = this.config.baseUrl;
        }

        if (this.config.headers) {
            clientConfig.headers = this.config.headers;
        }

        const client = axios.create(clientConfig);

        // Add authentication interceptor
        if (this.config.auth) {
            client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
                return this.addAuthentication(config, this.config.auth!);
            });
        }

        // Add retry interceptor
        client.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (error.response?.status === 429 || error.code === 'ECONNRESET') {
                    // Rate limited or connection reset - retry after delay
                    await this.delay(1000);
                    return client.request(error.config);
                }
                throw error;
            }
        );

        return client;
    }

    /**
     * Setup rate limiting
     */
    private setupRateLimit(): void {
        if (this.config.rateLimit) {
            setInterval(() => {
                this.processQueue().catch(() => undefined);
            }, 1000 / this.config.rateLimit.requestsPerSecond);
        }
    }

    /**
     * Process request queue with rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            const rateLimit = this.config.rateLimit;
            if (rateLimit) {
                const _now = Date.now();
                const timeSinceLastRequest = _now - this.lastRequestTime;
                const minInterval = 1000 / rateLimit.requestsPerSecond;

                if (timeSinceLastRequest < minInterval) {
                    await this.delay(minInterval - timeSinceLastRequest);
                }
            }

            const request = this.requestQueue.shift();
            if (request) {
                await request();
                this.lastRequestTime = Date.now();
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * Add authentication to request
     */
    private addAuthentication(
        config: InternalAxiosRequestConfig,
        auth: NonNullable<BaseExtractorConfig['auth']>
    ): InternalAxiosRequestConfig {
        switch (auth.type) {
            case 'bearer':
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${auth.token}`;
                break;
            case 'basic':
                if (auth.username && auth.password) {
                    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Basic ${encoded}`;
                }
                break;
            case 'api-key':
                if (auth.apiKey && auth.headerName) {
                    config.headers = config.headers || {};
                    config.headers[auth.headerName] = auth.apiKey;
                }
                break;
        }

        return config;
    }

    /**
     * Build pagination parameters
     */
    private buildPaginationParams(
        pagination: NonNullable<BaseExtractorConfig['pagination']>,
        page: number,
        cursor?: string
    ): Record<string, any> {
        const params: Record<string, any> = {};

        switch (pagination.type) {
            case 'page':
                params[pagination.pageParam || 'page'] = page;
                if (pagination.pageSize) {
                    params[pagination.sizeParam || 'per_page'] = pagination.pageSize;
                }
                break;
            case 'offset': {
                const offset = (page - 1) * (pagination.pageSize || 20);
                params[pagination.offsetParam || 'offset'] = offset;
                if (pagination.pageSize) {
                    params[pagination.sizeParam || 'limit'] = pagination.pageSize;
                }
                break;
            }
            case 'cursor':
                if (cursor) {
                    params[pagination.cursorParam || 'cursor'] = cursor;
                }
                if (pagination.pageSize) {
                    params[pagination.sizeParam || 'limit'] = pagination.pageSize;
                }
                break;
        }

        return params;
    }

    /**
     * Extract data from API response
     */
    private extractDataFromResponse(
        response: any,
        _pagination: NonNullable<BaseExtractorConfig['pagination']>
    ): any[] {
        // Common API response patterns
        if (response.data && Array.isArray(response.data)) {
            return response.data;
        }
        if (response.items && Array.isArray(response.items)) {
            return response.items;
        }
        if (response.results && Array.isArray(response.results)) {
            return response.results;
        }
        if (Array.isArray(response)) {
            return response;
        }

        return [];
    }

    /**
     * Check if there are more pages
     */
    private hasMorePages(
        response: any,
        data: any[],
        pagination: NonNullable<BaseExtractorConfig['pagination']>
    ): boolean {
        // Check if we got fewer items than requested
        if (pagination.pageSize && data.length < pagination.pageSize) {
            return false;
        }

        // Check common pagination indicators
        if (response.has_more !== undefined) {
            return response.has_more;
        }
        if (response.hasMore !== undefined) {
            return response.hasMore;
        }
        if (response.pagination?.has_next !== undefined) {
            return response.pagination.has_next;
        }

        return data.length > 0;
    }

    /**
     * Extract cursor for cursor-based pagination
     */
    private extractCursor(
        response: any,
        pagination: NonNullable<BaseExtractorConfig['pagination']>
    ): string | undefined {
        if (pagination.type !== 'cursor') {
            return undefined;
        }

        // Common cursor patterns
        if (response.next_cursor) {
            return response.next_cursor;
        }
        if (response.pagination?.next_cursor) {
            return response.pagination.next_cursor;
        }
        if (response.cursors?.after) {
            return response.cursors.after;
        }

        return undefined;
    }

    /**
     * Validate authentication configuration
     */
    private async validateAuth(
        auth: NonNullable<BaseExtractorConfig['auth']>
    ): Promise<boolean> {
        switch (auth.type) {
            case 'bearer':
                return Boolean(auth.token);
            case 'basic':
                return Boolean(auth.username && auth.password);
            case 'api-key':
                return Boolean(auth.apiKey && auth.headerName);
            default:
                return false;
        }
    }

    /**
     * Validate output data against schema
     */
    private async validateOutput(data: TOutput[]): Promise<void> {
        if (!this.outputSchema) {
            return;
        }

        for (let i = 0; i < data.length; i++) {
            try {
                this.outputSchema.parse(data[i]);
            } catch (error) {
                throw new Error(`Output validation failed for item ${i}: ${error}`);
            }
        }
    }

    /**
     * Emit progress event
     */
    private emitProgress(context: ETLContext, progress: Partial<ETLProgress>): void {
        const fullProgress: ETLProgress = {
            stage: 'extract',
            step: this.name,
            processed: 0,
            ...progress,
        };

        context.events.emit('progress', fullProgress);
    }

    /**
     * Utility method for delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 
