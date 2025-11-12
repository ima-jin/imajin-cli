/**
 * HttpExtractor - Generic HTTP API data extractor
 * 
 * @package     @imajin/cli
 * @subpackage  etl/extractors
 * @author      Claude
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - BaseExtractor for common HTTP functionality
 * - Configurable endpoints and data extraction
 * - Example implementation for API services
 */

import { z } from 'zod';
import { ETLContext } from '../core/interfaces.js';
import { BaseExtractor, BaseExtractorConfig } from './BaseExtractor.js';

/**
 * Configuration for HTTP extractor
 */
export interface HttpExtractorConfig extends BaseExtractorConfig {
    readonly endpoint: string;
    readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    readonly queryParams?: Record<string, any>;
    readonly requestBody?: any;
    readonly dataPath?: string; // JSONPath to extract data from response
}

/**
 * Generic HTTP API data extractor
 */
export class HttpExtractor<TOutput = any> extends BaseExtractor<TOutput> {
    public readonly name = 'http_extractor';
    public readonly description = 'Generic HTTP API data extractor';
    public readonly outputSchema?: z.ZodSchema<TOutput>;

    constructor(
        config: HttpExtractorConfig,
        outputSchema?: z.ZodSchema<TOutput>
    ) {
        super(config);
        if (outputSchema) {
            this.outputSchema = outputSchema;
        }
    }

    /**
     * Perform actual data extraction from HTTP endpoint
     */
    protected async performExtraction(
        context: ETLContext,
        config: HttpExtractorConfig
    ): Promise<TOutput[]> {
        const { endpoint, method = 'GET', queryParams, requestBody, dataPath } = config;

        // Build request options
        const requestOptions: any = {
            method,
            params: queryParams,
        };

        if (requestBody && (method === 'POST' || method === 'PUT')) {
            requestOptions.data = requestBody;
        }

        const url = endpoint;

        // Handle pagination if configured
        if (config.pagination) {
            return this.extractWithPagination(url, requestOptions, context, config);
        } else {
            const response = await this.makeRequest(url, requestOptions, context);
            return this.parseResponseData(response, dataPath);
        }
    }

    /**
     * Parse data from API response using optional JSONPath
     */
    private parseResponseData(response: any, dataPath?: string): TOutput[] {
        if (!dataPath) {
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

            // Single item
            return [response];
        }

        // Use JSONPath to extract data (simplified implementation)
        const data = this.getValueByPath(response, dataPath);
        return Array.isArray(data) ? data : [data];
    }

    /**
     * Get value from object using dot notation path
     */
    private getValueByPath(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current?.[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
}

/**
 * Factory function to create HTTP extractors
 */
export function createHttpExtractor<T = any>(
    config: HttpExtractorConfig,
    outputSchema?: z.ZodSchema<T>
): HttpExtractor<T> {
    return new HttpExtractor(config, outputSchema);
}

/**
 * Create a simple GET request extractor
 */
export function createGetExtractor<T = any>(
    baseUrl: string,
    endpoint: string,
    options: Partial<HttpExtractorConfig> = {},
    outputSchema?: z.ZodSchema<T>
): HttpExtractor<T> {
    const config: HttpExtractorConfig = {
        baseUrl,
        endpoint,
        method: 'GET',
        ...options,
    };

    return new HttpExtractor(config, outputSchema);
}

/**
 * Create a paginated API extractor
 */
export function createPaginatedExtractor<T = any>(
    baseUrl: string,
    endpoint: string,
    paginationConfig: NonNullable<BaseExtractorConfig['pagination']>,
    options: Partial<HttpExtractorConfig> = {},
    outputSchema?: z.ZodSchema<T>
): HttpExtractor<T> {
    const config: HttpExtractorConfig = {
        baseUrl,
        endpoint,
        method: 'GET',
        pagination: paginationConfig,
        ...options,
    };

    return new HttpExtractor(config, outputSchema);
} 