/**
 * Command Template - Enhanced template for generating command classes
 * 
 * @package     @imajin/cli
 * @subpackage  generators/templates
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

export const COMMAND_TEMPLATE = `/**
 * {{current.name}}Command - {{current.description}}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 */

import { BaseCommand } from '../../../src/core/commands/BaseCommand.js';
import type { CommandResult } from '../../../src/core/commands/interfaces.js';
import type { Logger } from '../../../src/logging/Logger.js';
import type { CredentialManager } from '../../../src/core/credentials/CredentialManager.js';
import { {{pluginName}}Service } from '../{{pluginName}}Service.js';
{{#if imports}}
{{#each imports}}
import type { {{this}} } from '../models/{{this}}.js';
{{/each}}
{{/if}}

export class {{pascalCase current.name}}Command extends BaseCommand {
    public readonly name = '{{pluginName}}:{{current.name}}';
    public readonly description = '{{current.description}}';
    
    // Define command arguments and options
    public readonly arguments = [
        {{#each current.parameters}}
        {{#if this.required}}
        {
            name: '{{this.name}}',
            description: '{{this.description}}',
            required: {{this.required}},
            type: '{{this.type}}'{{#if this.enum}},
            choices: [{{#each this.enum}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}
        }{{#unless @last}},{{/unless}}
        {{/if}}
        {{/each}}
    ];

    public readonly options = [
        {{#each current.parameters}}
        {{#unless this.required}}
        {
            name: '{{this.name}}',
            description: '{{this.description}}',
            type: '{{this.type}}',
            required: false{{#if this.enum}},
            choices: [{{#each this.enum}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}
        }{{#unless @last}},{{/unless}}
        {{/unless}}
        {{/each}}
    ];

    constructor(
        private credentialManager: CredentialManager,
        private service: {{pluginName}}Service,
        logger?: Logger
    ) {
        super(logger);
    }

    public async execute(args: any[], options: any): Promise<CommandResult> {
        try {
            // Validate inputs
            this.validate(args, options);

            // Get and validate credentials
            const credentials = await this.getCredentials('{{pluginName}}');
            
            // Extract and validate parameters
            const params = this.extractParameters(args, options);

            // Execute service call
            const result = await this.service.{{current.name}}(params, credentials);

            this.logSuccess('{{current.name}} completed successfully', { result });

            return {
                success: true,
                data: result,
                message: '{{current.name}} completed successfully'
            };

        } catch (error) {
            const errorMessage = \`{{current.name}} failed: \${error instanceof Error ? error.message : 'Unknown error'}\`;
            this.logError(errorMessage, error as Error);
            
            return {
                success: false,
                error: error as Error,
                message: errorMessage
            };
        }
    }

    /**
     * Get credentials for the plugin
     */
    private async getCredentials(pluginName: string): Promise<any> {
        const credentials = await this.credentialManager.retrieve(pluginName);
        if (!credentials) {
            throw new Error(\`No credentials found for \${pluginName}. Please run: imajin auth:setup \${pluginName}\`);
        }
        return credentials;
    }

    /**
     * Enhanced parameter extraction with better validation
     */
    private extractParameters(args: any[], options: any): any {
        const params: any = {};
        let argIndex = 0;

        {{#each current.parameters}}
        // {{this.description}}
        {{#if this.required}}
        // Required parameter: {{this.name}}
        if (options.{{this.name}} !== undefined) {
            params.{{this.name}} = this.validateAndConvertParameter('{{this.name}}', options.{{this.name}}, '{{this.type}}', true);
        } else if (args[{{@index}}] !== undefined) {
            params.{{this.name}} = this.validateAndConvertParameter('{{this.name}}', args[{{@index}}], '{{this.type}}', true);
        } else {
            throw new Error('Required parameter {{this.name}} is missing');
        }
        {{else}}
        // Optional parameter: {{this.name}}
        if (options.{{this.name}} !== undefined) {
            params.{{this.name}} = this.validateAndConvertParameter('{{this.name}}', options.{{this.name}}, '{{this.type}}', false);
        } else if (args[{{@index}}] !== undefined) {
            params.{{this.name}} = this.validateAndConvertParameter('{{this.name}}', args[{{@index}}], '{{this.type}}', false);
        }
        {{/if}}

        {{#if this.enum}}
        // Validate enum values for {{this.name}}
        if (params.{{this.name}} && !['{{#each this.enum}}{{this}}{{#unless @last}}', '{{/unless}}{{/each}}'].includes(params.{{this.name}})) {
            throw new Error(\`Invalid value for {{this.name}}. Must be one of: {{#each this.enum}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}\`);
        }
        {{/if}}

        {{/each}}

        {{#if current.requestBody}}
        // Handle request body
        if (options.data) {
            try {
                params.data = typeof options.data === 'string' ? JSON.parse(options.data) : options.data;
            } catch (error) {
                throw new Error('Invalid JSON data provided for request body');
            }
        }
        {{/if}}

        return params;
    }

    /**
     * Validate and convert parameter based on type
     */
    private validateAndConvertParameter(name: string, value: any, type: string, required: boolean): any {
        if (value === undefined || value === null) {
            if (required) {
                throw new Error(\`Required parameter \${name} is missing or null\`);
            }
            return undefined;
        }

        switch (type) {
            case 'string':
                return String(value);
            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    throw new Error(\`Parameter \${name} must be a valid number\`);
                }
                return num;
            case 'boolean':
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (lower === 'true' || lower === '1') return true;
                    if (lower === 'false' || lower === '0') return false;
                }
                throw new Error(\`Parameter \${name} must be a valid boolean\`);
            case 'array':
                if (Array.isArray(value)) return value;
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) return parsed;
                    } catch {}
                }
                throw new Error(\`Parameter \${name} must be a valid array\`);
            case 'object':
                if (typeof value === 'object' && value !== null) return value;
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value);
                    } catch {}
                }
                throw new Error(\`Parameter \${name} must be a valid object\`);
            default:
                return value;
        }
    }

    /**
     * Enhanced validation with detailed parameter checking
     */
    protected validate(args: any[], options: any): void {
        super.validate(args, options);

        // Additional validation can be added here
        this.logDebug('Command validation passed', { args, options });
    }

    /**
     * Log success with structured data
     */
    private logSuccess(message: string, data?: any): void {
        if (this.logger) {
            this.logger.info(message, data);
        }
    }

    /**
     * Log error with structured data
     */
    private logError(message: string, error: Error): void {
        if (this.logger) {
            this.logger.error(message, error);
        }
    }

    /**
     * Log debug information
     */
    private logDebug(message: string, data?: any): void {
        if (this.logger) {
            this.logger.debug(message, data);
        }
    }
}`;

export const SERVICE_TEMPLATE = `/**
 * {{pluginName}}Service - Enhanced service with proper error handling
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { CredentialData } from '../../../src/core/credentials/interfaces.js';
{{#if imports}}
{{#each imports}}
import type { {{this}} } from './models/{{this}}.js';
{{/each}}
{{/if}}

export class {{pluginName}}Service {
    private client: AxiosInstance;
    private readonly baseUrl: string;

    constructor(baseUrl: string = '{{baseUrl}}') {
        this.baseUrl = baseUrl.replace(/\\/$/, ''); // Remove trailing slash
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

    {{#each commands}}
    /**
     * {{this.description}}
     * Method: {{this.method}}
     * Path: {{this.path}}
     */
    public async {{this.name}}(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('{{this.method}}', '{{this.path}}', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, '{{this.name}}');
        }
    }

    {{/each}}

    /**
     * Apply authentication to the HTTP client
     */
    private applyAuthentication(credentials: CredentialData): void {
        // Clear any existing auth headers
        delete this.client.defaults.headers.common['Authorization'];
        delete this.client.defaults.headers.common['X-API-Key'];

        {{#if authConfig}}
        {{#if authConfig.type}}
        {{#if (eq authConfig.type 'bearer')}}
        if (credentials.token) {
            this.client.defaults.headers.common['Authorization'] = \`Bearer \${credentials.token}\`;
        }
        {{/if}}
        {{#if (eq authConfig.type 'api-key')}}
        {{#if authConfig.apiKeyHeader}}
        if (credentials.apiKey) {
            this.client.defaults.headers.common['{{authConfig.apiKeyHeader}}'] = credentials.apiKey;
        }
        {{/if}}
        {{#if authConfig.apiKeyQuery}}
        // API key in query params will be handled in buildRequestConfig
        {{/if}}
        {{/if}}
        {{#if (eq authConfig.type 'basic')}}
        if (credentials.username && credentials.password) {
            const encoded = Buffer.from(\`\${credentials.username}:\${credentials.password}\`).toString('base64');
            this.client.defaults.headers.common['Authorization'] = \`Basic \${encoded}\`;
        }
        {{/if}}
        {{/if}}
        {{else}}
        // Default bearer token auth
        if (credentials.token) {
            this.client.defaults.headers.common['Authorization'] = \`Bearer \${credentials.token}\`;
        } else if (credentials.apiKey) {
            this.client.defaults.headers.common['X-API-Key'] = credentials.apiKey;
        }
        {{/if}}
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
        const pathParamRegex = /\{([^}]+)\}/g;
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

        {{#if authConfig}}
        {{#if authConfig.apiKeyQuery}}
        // Add API key as query parameter
        if (this.credentials?.apiKey) {
            queryParams['{{authConfig.apiKeyQuery}}'] = this.credentials.apiKey;
        }
        {{/if}}
        {{/if}}

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
        const matches = path.match(/\{([^}]+)\}/g);
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
            
            let message = \`API Error (\${status})\`;
            
            if (data && typeof data === 'object') {
                // Try common error message fields
                const errorMsg = (data as any).error || (data as any).message || (data as any).detail;
                if (errorMsg) {
                    message += \`: \${errorMsg}\`;
                }
            } else if (typeof data === 'string') {
                message += \`: \${data}\`;
            }

            const apiError = new Error(\`\${operation} failed - \${message}\`);
            (apiError as any).status = status;
            (apiError as any).response = data;
            return apiError;
        } else if (error.request) {
            // Request made but no response received
            return new Error(\`\${operation} failed - No response from server (network error)\`);
        } else {
            // Request setup error
            return new Error(\`\${operation} failed - \${error.message}\`);
        }
    }
}`;

export const MODEL_TEMPLATE = `/**
 * {{current.name}} - {{current.description}}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}/models
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 */

export interface {{current.name}} {
    {{#each current.properties}}
    {{#if this.description}}
    /**
     * {{this.description}}
     */
    {{/if}}
    {{this.name}}{{#unless this.required}}?{{/unless}}: {{this.type}};
    {{/each}}
}`;

export const PLUGIN_CONFIG_TEMPLATE = `/**
 * {{pluginName}} Plugin Configuration
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 */

export const {{pluginName}}Config = {
    name: '{{pluginName}}',
    version: '{{version}}',
    description: '{{pluginDescription}}',
    baseUrl: '{{baseUrl}}',
    authType: '{{authType}}' as const,
    {{#if authConfig}}
    authConfig: {
        type: '{{authConfig.type}}',
        {{#if authConfig.apiKeyHeader}}
        apiKeyHeader: '{{authConfig.apiKeyHeader}}',
        {{/if}}
        {{#if authConfig.apiKeyQuery}}
        apiKeyQuery: '{{authConfig.apiKeyQuery}}',
        {{/if}}
        {{#if authConfig.bearerFormat}}
        bearerFormat: '{{authConfig.bearerFormat}}',
        {{/if}}
    },
    {{/if}}
    commands: [
        {{#each commands}}
        '{{this.name}}'{{#unless @last}},{{/unless}}
        {{/each}}
    ]
};`; 