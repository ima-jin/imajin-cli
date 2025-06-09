/**
 * SimpleApiService - Enhanced service with proper error handling
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/SimpleApi
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { CredentialData } from '../../../src/core/credentials/interfaces.js';
import type { User } from './models/User.js';
import type { CreateUserRequest } from './models/CreateUserRequest.js';
import type { UpdateUserRequest } from './models/UpdateUserRequest.js';
import type { Post } from './models/Post.js';

export class SimpleApiService {
    private client: AxiosInstance;
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'https://api.simple.com/v1') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.client = this.createHttpClient();
    }

    private createHttpClient(): AxiosInstance {
        return axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imajin-cli/0.1.0',
                'Accept': 'application/json'
            }
        });
    }

    /**
     * List all users
     * Method: GET
     * Path: /users
     */
    public async listUsers(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('GET', '/users', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, 'listUsers');
        }
    }

    /**
     * Create a new user
     * Method: POST
     * Path: /users
     */
    public async createUser(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('POST', '/users', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, 'createUser');
        }
    }

    /**
     * Get a user by ID
     * Method: GET
     * Path: /users/{id}
     */
    public async getUserById(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('GET', '/users/{id}', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, 'getUserById');
        }
    }

    /**
     * Update a user
     * Method: PUT
     * Path: /users/{id}
     */
    public async updateUser(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('PUT', '/users/{id}', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, 'updateUser');
        }
    }

    /**
     * Delete a user
     * Method: DELETE
     * Path: /users/{id}
     */
    public async deleteUser(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('DELETE', '/users/{id}', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, 'deleteUser');
        }
    }

    /**
     * List all posts
     * Method: GET
     * Path: /posts
     */
    public async listPosts(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('GET', '/posts', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, 'listPosts');
        }
    }


    /**
     * Apply authentication to the HTTP client
     */
    private applyAuthentication(credentials: CredentialData): void {
        // Clear any existing auth headers
        delete this.client.defaults.headers.common['Authorization'];
        delete this.client.defaults.headers.common['X-API-Key'];

        if (credentials.token) {
            this.client.defaults.headers.common['Authorization'] = `Bearer ${credentials.token}`;
        }
    }

    /**
     * Build request configuration with enhanced URL and parameter handling
     */
    private buildRequestConfig(method: string, path: string, params: any): any {
        // Build URL with path parameters
        let url = this.buildUrlWithPathParams(path, params);

        const config: any = {
            method: method.toLowerCase(),
            url: url
        };

        // Handle request body for POST/PUT/PATCH
        if (['post', 'put', 'patch'].includes(method.toLowerCase()) && params.data) {
            config.data = params.data;
        }

        // Add query parameters
        const queryParams = this.extractQueryParams(params, path);
        if (Object.keys(queryParams).length > 0) {
            config.params = queryParams;
        }

        return config;
    }

    /**
     * Build URL with path parameters
     */
    private buildUrlWithPathParams(path: string, params: any): string {
        let url = path;

        // Replace path parameters like {id} with actual values
        const pathParamRegex = /{([^}]+)}/g;
        url = url.replace(pathParamRegex, (match, paramName) => {
            if (params[paramName] !== undefined) {
                return encodeURIComponent(String(params[paramName]));
            }
            return match; // Keep original if no value found
        });

        return url;
    }

    /**
     * Extract query parameters (excluding path params and body data)
     */
    private extractQueryParams(params: any, path: string): Record<string, any> {
        const queryParams: Record<string, any> = {};
        const pathParams = this.extractPathParamNames(path);


        // Add other parameters as query params (excluding path params and data)
        for (const [key, value] of Object.entries(params)) {
            if (key !== 'data' && !pathParams.includes(key) && value !== undefined) {
                queryParams[key] = value;
            }
        }

        return queryParams;
    }

    /**
     * Extract parameter names from path template
     */
    private extractPathParamNames(path: string): string[] {
        const matches = path.match(/{([^}]+)}/g);
        return matches ? matches.map(match => match.slice(1, -1)) : [];
    }

    /**
     * Process API response
     */
    private processResponse(response: AxiosResponse): any {
        // Handle different response types
        if (response.headers['content-type']?.includes('application/json')) {
            return response.data;
        }

        // Handle text responses
        if (typeof response.data === 'string') {
            try {
                return JSON.parse(response.data);
            } catch {
                return { data: response.data };
            }
        }

        return response.data;
    }

    /**
     * Enhanced error handling
     */
    private handleApiError(error: AxiosError, operation: string): Error {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data = error.response.data;
            
            let message = `API Error (${status})`;
            
            if (data && typeof data === 'object') {
                // Try common error message fields
                const errorMsg = (data as any).error || (data as any).message || (data as any).detail;
                if (errorMsg) {
                    message += `: ${errorMsg}`;
                }
            } else if (typeof data === 'string') {
                message += `: ${data}`;
            }

            const apiError = new Error(`${operation} failed - ${message}`);
            (apiError as any).status = status;
            (apiError as any).response = data;
            return apiError;
        } else if (error.request) {
            // Request made but no response received
            return new Error(`${operation} failed - No response from server (network error)`);
        } else {
            // Request setup error
            return new Error(`${operation} failed - ${error.message}`);
        }
    }
}