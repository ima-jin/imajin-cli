/**
 * BaseLoader - Abstract base class for data loading components
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
 * - HTTP client for API operations
 * - Transaction management for data consistency
 * - Conflict resolution strategies
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { ETLConfig, ETLContext, ETLProgress, ETLResult, Loader } from '../core/interfaces.js';

/**
 * Base configuration for loaders
 */
export interface BaseLoaderConfig extends ETLConfig {
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
    readonly conflictResolution?: 'skip' | 'overwrite' | 'merge' | 'error';
    readonly transactionMode?: 'batch' | 'individual' | 'auto';
    readonly retryOnConflict?: boolean;
    readonly upsertSupported?: boolean;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution<T = any> {
    readonly action: 'skip' | 'overwrite' | 'merge' | 'error';
    readonly item: T;
    readonly metadata?: Record<string, any>;
}

/**
 * Load operation result
 */
export interface LoadOperation {
    readonly success: boolean;
    readonly id?: string;
    readonly item: any;
    readonly error?: Error;
    readonly metadata?: Record<string, any>;
}

/**
 * Abstract base loader providing common loading functionality
 */
export abstract class BaseLoader<TInput = any> implements Loader<TInput> {
    public abstract readonly name: string;
    public abstract readonly description?: string;
    public abstract readonly inputSchema?: z.ZodSchema<TInput>;

    protected httpClient: AxiosInstance;
    protected activeTransactions: Set<string> = new Set();

    constructor(protected config: BaseLoaderConfig = {}) {
        this.httpClient = this.createHttpClient();
    }

    /**
     * Load data to the configured destination
     */
    public async load(
        data: TInput[],
        context: ETLContext,
        config?: ETLConfig
    ): Promise<ETLResult<any>> {
        const _startTime = Date.now();
        const mergedConfig = { ...this.config, ...config } as BaseLoaderConfig;

        try {
            context.events.emit('step:start', this.name, context);

            // Validate input if schema provided
            if (this.inputSchema && mergedConfig.validateInput) {
                await this.validateInput(data);
            }

            const loadResults: LoadOperation[] = [];
            const batchSize = mergedConfig.batchSize || 50;

            // Determine transaction mode
            const useTransactions = mergedConfig.transactionMode === 'batch' ||
                (mergedConfig.transactionMode === 'auto' && data.length > 10);

            let transactionId: string | undefined;
            if (useTransactions) {
                transactionId = await this.beginTransaction(context);
            }

            try {
                // Process data in batches
                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize);
                    const batchResults = await this.loadBatch(batch, context, mergedConfig);
                    loadResults.push(...batchResults);

                    // Emit progress
                    this.emitProgress(context, {
                        stage: 'load',
                        step: this.name,
                        processed: i + batch.length,
                        total: data.length,
                        percentage: Math.round(((i + batch.length) / data.length) * 100),
                        message: `Loaded ${i + batch.length}/${data.length} items`,
                    });
                }

                // Commit transaction if used
                if (transactionId) {
                    await this.commitTransaction(transactionId, context);
                }

            } catch (error) {
                // Rollback transaction on error
                if (transactionId) {
                    await this.rollbackTransaction(transactionId, context);
                }
                throw error;
            }

            const duration = Date.now() - _startTime;
            const successfulLoads = loadResults.filter(r => r.success);

            const result: ETLResult<LoadOperation[]> = {
                success: true,
                data: loadResults,
                processed: successfulLoads.length,
                metadata: {
                    loader: this.name,
                    config: mergedConfig,
                    totalItems: data.length,
                    successfulItems: successfulLoads.length,
                    failedItems: loadResults.length - successfulLoads.length,
                    transactionId,
                },
                duration,
            };

            context.events.emit('step:complete', this.name, result, context);
            context.events.emit('data:loaded', successfulLoads.length, context);

            return result;
        } catch (error) {
            const duration = Date.now() - _startTime;
            const result: ETLResult<LoadOperation[]> = {
                success: false,
                error: error as Error,
                processed: 0,
                metadata: {
                    loader: this.name,
                    config: mergedConfig,
                },
                duration,
            };

            context.events.emit('step:error', this.name, error as Error, context);
            return result;
        }
    }

    /**
 * Load a single item (for streaming operations)
 */
    public async loadItem(item: TInput, context: ETLContext): Promise<any> {
        const operations = await this.loadBatch([item], context, this.config);
        const operation = operations[0];

        if (!operation) {
            throw new Error('No operation result returned');
        }

        if (operation.success) {
            return operation.item;
        } else {
            throw operation.error || new Error('Load operation failed');
        }
    }

    /**
     * Validate loader configuration and connectivity
     */
    public async validate(config?: ETLConfig): Promise<boolean> {
        const mergedConfig = { ...this.config, ...config } as BaseLoaderConfig;

        try {
            // Test connectivity
            await this.testConnection(mergedConfig);

            // Validate authentication
            if (mergedConfig.auth) {
                return this.validateAuth(mergedConfig.auth);
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Handle conflicts during loading (upsert, skip, error)
     */
    public async handleConflict(
        existing: any,
        incoming: TInput,
        context: ETLContext
    ): Promise<TInput> {
        const strategy = this.config.conflictResolution || 'error';

        switch (strategy) {
            case 'skip':
                return existing;

            case 'overwrite':
                return incoming;

            case 'merge':
                return this.mergeItems(existing, incoming);

            case 'error':
            default:
                throw new Error(`Conflict detected for item: ${JSON.stringify(incoming)}`);
        }
    }

    /**
     * Abstract method for actual data loading
     */
    protected abstract performLoad(
        item: TInput,
        context: ETLContext,
        config: BaseLoaderConfig
    ): Promise<LoadOperation>;

    /**
     * Test connection to the destination
     */
    protected abstract testConnection(config: BaseLoaderConfig): Promise<void>;

    /**
     * Load a batch of items
     */
    protected async loadBatch(
        batch: TInput[],
        context: ETLContext,
        config: BaseLoaderConfig
    ): Promise<LoadOperation[]> {
        const results: LoadOperation[] = [];

        // Check if batch loading is supported
        if (this.supportsBatchLoad()) {
            try {
                const batchResult = await this.performBatchLoad(batch, context, config);
                results.push(...batchResult);
            } catch (error) {
                // Fall back to individual loading if batch fails
                for (const item of batch) {
                    try {
                        const result = await this.performLoad(item, context, config);
                        results.push(result);
                    } catch (itemError) {
                        results.push({
                            success: false,
                            item,
                            error: itemError as Error,
                        });
                    }
                }
            }
        } else {
            // Load items individually
            const maxConcurrency = config.maxConcurrency || 5;

            for (let i = 0; i < batch.length; i += maxConcurrency) {
                const concurrentBatch = batch.slice(i, i + maxConcurrency);
                const promises = concurrentBatch.map(async (item) => {
                    try {
                        return await this.performLoad(item, context, config);
                    } catch (error) {
                        return {
                            success: false,
                            item,
                            error: error as Error,
                        };
                    }
                });

                const batchResults = await Promise.all(promises);
                results.push(...batchResults);
            }
        }

        return results;
    }

    /**
     * Perform batch loading (override if supported)
     */
    protected async performBatchLoad(
        batch: TInput[],
        context: ETLContext,
        config: BaseLoaderConfig
    ): Promise<LoadOperation[]> {
        // Default implementation falls back to individual loading
        const results: LoadOperation[] = [];

        for (const item of batch) {
            const result = await this.performLoad(item, context, config);
            results.push(result);
        }

        return results;
    }

    /**
     * Check if batch loading is supported
     */
    protected supportsBatchLoad(): boolean {
        return false; // Override in subclasses that support batch loading
    }

    /**
     * Begin a transaction
     */
    protected async beginTransaction(context: ETLContext): Promise<string> {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.activeTransactions.add(transactionId);
        return transactionId;
    }

    /**
     * Commit a transaction
     */
    protected async commitTransaction(transactionId: string, context: ETLContext): Promise<void> {
        this.activeTransactions.delete(transactionId);
        // Override in subclasses that support transactions
    }

    /**
     * Rollback a transaction
     */
    protected async rollbackTransaction(transactionId: string, context: ETLContext): Promise<void> {
        this.activeTransactions.delete(transactionId);
        // Override in subclasses that support transactions
    }

    /**
     * Merge two items for conflict resolution
     */
    protected mergeItems(existing: any, incoming: TInput): TInput {
        if (typeof existing === 'object' && typeof incoming === 'object') {
            return { ...existing, ...incoming } as TInput;
        }
        return incoming;
    }

    /**
     * Create HTTP client with default configuration
     */
    protected createHttpClient(): AxiosInstance {
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
                return this.addAuthentication(config, this.config.auth!) as InternalAxiosRequestConfig;
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
     * Add authentication to request
     */
    private addAuthentication(
        config: InternalAxiosRequestConfig,
        auth: NonNullable<BaseLoaderConfig['auth']>
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
     * Validate authentication configuration
     */
    private validateAuth(auth: NonNullable<BaseLoaderConfig['auth']>): boolean {
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
     * Validate input data against schema
     */
    private async validateInput(data: TInput[]): Promise<void> {
        if (!this.inputSchema) {
            return;
        }

        for (let i = 0; i < data.length; i++) {
            try {
                this.inputSchema.parse(data[i]);
            } catch (error) {
                throw new Error(`Input validation failed for item ${i}: ${error}`);
            }
        }
    }

    /**
     * Emit progress event
     */
    private emitProgress(context: ETLContext, progress: Partial<ETLProgress>): void {
        const fullProgress: ETLProgress = {
            stage: 'load',
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