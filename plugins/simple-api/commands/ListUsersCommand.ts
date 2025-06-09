/**
 * listUsersCommand - List all users
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/SimpleApi/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import { BaseCommand } from '../../../src/core/commands/BaseCommand.js';
import type { CommandResult } from '../../../src/core/commands/interfaces.js';
import type { Logger } from '../../../src/logging/Logger.js';
import type { CredentialManager } from '../../../src/core/credentials/CredentialManager.js';
import { SimpleApiService } from '../SimpleApiService.js';
import type { User } from '../models/User.js';
import type { CreateUserRequest } from '../models/CreateUserRequest.js';
import type { UpdateUserRequest } from '../models/UpdateUserRequest.js';
import type { Post } from '../models/Post.js';

export class ListUsersCommand extends BaseCommand {
    public readonly name = 'SimpleApi:listUsers';
    public readonly description = 'List all users';
    
    // Define command arguments and options
    public readonly arguments = [
    ];

    public readonly options = [
        {
            name: 'limit',
            description: 'Number of users to return',
            type: 'number',
            required: false
        },
        {
            name: 'offset',
            description: 'Number of users to skip',
            type: 'number',
            required: false
        }
    ];

    constructor(
        private credentialManager: CredentialManager,
        private service: SimpleApiService,
        logger?: Logger
    ) {
        super(logger);
    }

    public async execute(args: any[], options: any): Promise<CommandResult> {
        try {
            // Validate inputs
            this.validate(args, options);

            // Get and validate credentials
            const credentials = await this.getCredentials('SimpleApi');
            
            // Extract and validate parameters
            const params = this.extractParameters(args, options);

            // Execute service call
            const result = await this.service.listUsers(params, credentials);

            this.logSuccess('listUsers completed successfully', { result });

            return {
                success: true,
                data: result,
                message: 'listUsers completed successfully'
            };

        } catch (error) {
            const errorMessage = `listUsers failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
            throw new Error(`No credentials found for ${pluginName}. Please run: imajin auth:setup ${pluginName}`);
        }
        return credentials;
    }

    /**
     * Enhanced parameter extraction with better validation
     */
    private extractParameters(args: any[], options: any): any {
        const params: any = {};
        let argIndex = 0;

        // Number of users to return
        // Optional parameter: limit
        if (options.limit !== undefined) {
            params.limit = this.validateAndConvertParameter('limit', options.limit, 'number', false);
        } else if (args[0] !== undefined) {
            params.limit = this.validateAndConvertParameter('limit', args[0], 'number', false);
        }


        // Number of users to skip
        // Optional parameter: offset
        if (options.offset !== undefined) {
            params.offset = this.validateAndConvertParameter('offset', options.offset, 'number', false);
        } else if (args[1] !== undefined) {
            params.offset = this.validateAndConvertParameter('offset', args[1], 'number', false);
        }




        return params;
    }

    /**
     * Validate and convert parameter based on type
     */
    private validateAndConvertParameter(name: string, value: any, type: string, required: boolean): any {
        if (value === undefined || value === null) {
            if (required) {
                throw new Error(`Required parameter ${name} is missing or null`);
            }
            return undefined;
        }

        switch (type) {
            case 'string':
                return String(value);
            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    throw new Error(`Parameter ${name} must be a valid number`);
                }
                return num;
            case 'boolean':
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (lower === 'true' || lower === '1') return true;
                    if (lower === 'false' || lower === '0') return false;
                }
                throw new Error(`Parameter ${name} must be a valid boolean`);
            case 'array':
                if (Array.isArray(value)) return value;
                if (typeof value === 'string') {
                    try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) return parsed;
                    } catch {}
                }
                throw new Error(`Parameter ${name} must be a valid array`);
            case 'object':
                if (typeof value === 'object' && value !== null) return value;
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value);
                    } catch {}
                }
                throw new Error(`Parameter ${name} must be a valid object`);
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
}