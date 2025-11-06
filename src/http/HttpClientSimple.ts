/**
 * HttpClientSimple - Simplified HTTP client for reliable requests
 * 
 * @package     @imajin/cli
 * @subpackage  http
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Basic HTTP operations
 * - Simple retry mechanism
 * - Error handling
 * - Logging support
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import type { Logger } from '../logging/Logger.js';

export interface SimpleHttpClientConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
    maxRetries?: number;
    retryDelay?: number;
}

export class HttpClientSimple extends EventEmitter {
    private client: AxiosInstance;
    private maxRetries: number;
    private retryDelay: number;
    private logger: Logger | null;

    constructor(config: SimpleHttpClientConfig = {}, logger?: Logger) {
        super();
        this.logger = logger || null;
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000;

        const axiosConfig: any = {
            timeout: config.timeout || 30000,
            headers: {
                'User-Agent': 'imajin-cli/0.1.0',
                'Content-Type': 'application/json',
                ...config.headers
            }
        };

        if (config.baseURL) {
            axiosConfig.baseURL = config.baseURL;
        }

        this.client = axios.create(axiosConfig);

        this.setupInterceptors();
    }

    public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request<T>({ ...config, method: 'GET', url });
    }

    public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request<T>({ ...config, method: 'POST', url, data });
    }

    public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request<T>({ ...config, method: 'PUT', url, data });
    }

    public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request<T>({ ...config, method: 'PATCH', url, data });
    }

    public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.request<T>({ ...config, method: 'DELETE', url });
    }

    private async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await this.client.request<T>(config);

                if (this.logger) {
                    this.logger.info('HTTP request successful', {
                        method: config.method,
                        url: config.url,
                        status: response.status,
                        attempt: attempt + 1
                    });
                }

                this.emit('request:success', { config, response, attempt });
                return response;

            } catch (error) {
                lastError = error as Error;

                if (attempt < this.maxRetries && this.isRetryableError(error)) {
                    if (this.logger) {
                        this.logger.warn('HTTP request failed, retrying', {
                            method: config.method,
                            url: config.url,
                            attempt: attempt + 1,
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }

                    this.emit('request:retry', { config, error, attempt: attempt + 1 });
                    await this.sleep(this.retryDelay * (attempt + 1));
                    continue;
                }

                if (this.logger) {
                    this.logger.error('HTTP request failed', lastError, {
                        method: config.method,
                        url: config.url,
                        attempt: attempt + 1
                    });
                }

                this.emit('request:failed', { config, error });
                throw lastError;
            }
        }

        throw lastError;
    }

    private isRetryableError(error: any): boolean {
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            return status >= 500 || status === 408 || status === 429;
        }

        if (error.code) {
            return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNABORTED'].includes(error.code);
        }

        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private setupInterceptors(): void {
        this.client.interceptors.request.use(
            (config) => {
                if (this.logger) {
                    this.logger.debug('HTTP request started', {
                        method: config.method?.toUpperCase(),
                        url: config.url
                    });
                }
                return config;
            },
            (error) => {
                if (this.logger) {
                    this.logger.error('HTTP request setup failed', error);
                }
                return Promise.reject(error instanceof Error ? error : new Error(String(error)));
            }
        );

        this.client.interceptors.response.use(
            (response) => {
                if (this.logger) {
                    this.logger.debug('HTTP response received', {
                        status: response.status,
                        url: response.config.url
                    });
                }
                return response;
            },
            (error) => {
                if (this.logger) {
                    this.logger.debug('HTTP response error', {
                        status: error.response?.status,
                        url: error.config?.url,
                        message: error.message
                    });
                }
                return Promise.reject(error instanceof Error ? error : new Error(String(error)));
            }
        );
    }
} 