/**
 * Simple Templates - Basic string replacement templates
 * 
 * @package     @imajin/cli
 * @subpackage  generators/templates
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

export const SIMPLE_COMMAND_TEMPLATE = `/**
 * {{commandName}} - {{commandDescription}}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 *
 * Integration Points:
 * - Command Pattern framework
 * - {{pluginName}} service integration
 * - Credential management
 * - Error handling and validation
 */

import { BaseCommand } from '../../../core/commands/BaseCommand.js';
import type { Logger } from '../../../logging/Logger.js';
import type { CredentialManager } from '../../../core/credentials/CredentialManager.js';
import { {{pluginNamePascal}}Service } from '../{{pluginName}}Service.js';

export class {{commandNamePascal}}Command extends BaseCommand {
    public readonly name = '{{pluginName}}:{{commandName}}';
    public readonly description = '{{commandDescription}}';

    constructor(
        private credentialManager: CredentialManager,
        private {{pluginName}}Service: {{pluginNamePascal}}Service,
        logger?: Logger
    ) {
        super(logger);
    }

    /**
     * Execute the command
     */
    public async execute(args: any[], options: any): Promise<any> {
        try {
            this.validate(args, options);

            // Get credentials
            const credentials = await this.credentialManager.retrieve('{{pluginName}}');
            if (!credentials) {
                throw new Error('No credentials found for {{pluginName}}. Please run: imajin auth:setup {{pluginName}}');
            }

            // Extract parameters
            const params = this.extractParameters(args, options);

            // Execute API call
            const result = await this.{{pluginName}}Service.{{commandName}}(params, credentials);

            // Log success
            this.info('{{commandName}} completed successfully', { result });

            return result;
        } catch (error) {
            this.error('{{commandName}} failed', error as Error);
            throw error;
        }
    }

    /**
     * Validate command arguments and options
     */
    protected validate(args: any[], options: any): void {
        super.validate(args, options);
        // TODO: Add parameter validation based on OpenAPI spec
    }

    /**
     * Extract parameters from args and options
     */
    private extractParameters(args: any[], options: any): any {
        const params: any = {};
        
        // TODO: Extract parameters based on OpenAPI spec
        // For now, pass through all options
        Object.assign(params, options);
        
        return params;
    }
}`;

export const SIMPLE_SERVICE_TEMPLATE = `/**
 * {{pluginNamePascal}}Service - Service class for {{pluginName}} API integration
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 *
 * Integration Points:
 * - HTTP client for API communication
 * - Authentication handling
 * - Error handling and retries
 * - Response transformation
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { CredentialData } from '../../core/credentials/interfaces.js';

export class {{pluginNamePascal}}Service {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor(baseUrl: string = '{{baseUrl}}') {
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imajin-cli/0.1.0'
            }
        });
    }

    {{commandMethods}}

    /**
     * Set authentication headers
     */
    private setAuthentication(credentials: CredentialData): void {
        if (credentials.apiKey) {
            this.client.defaults.headers.common['X-API-Key'] = credentials.apiKey;
        }
        if (credentials.accessToken) {
            this.client.defaults.headers.common['Authorization'] = \`Bearer \${credentials.accessToken}\`;
        }
    }

    /**
     * Build URL with path parameters
     */
    private buildUrl(path: string, params: any): string {
        const url = path;
        
        // Replace path parameters
        Object.keys(params).forEach(key => {
            url = url.replace(\`{\${key}}\`, encodeURIComponent(params[key]));
        });

        return url;
    }

    /**
     * Handle API errors
     */
    private handleError(error: any, operation: string): Error {
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || error.response.statusText;
            return new Error(\`{{pluginName}} API error (\${status}): \${message}\`);
        } else if (error.request) {
            return new Error(\`{{pluginName}} API network error: \${error.message}\`);
        } else {
            return new Error(\`{{pluginName}} API error: \${error.message}\`);
        }
    }
}`;

export const SIMPLE_MODEL_TEMPLATE = `/**
 * {{modelName}} - {{modelDescription}}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}/models
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 */

export interface {{modelName}} {
    {{modelProperties}}
}`;

export const SIMPLE_CONFIG_TEMPLATE = `/**
 * {{pluginNamePascal}} Plugin Configuration
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
    commands: [
        {{commandList}}
    ]
};`; 