/**
 * BaseCredentialProvider - Abstract base class for credential providers
 * 
 * @package     @imajin/cli
 * @subpackage  core/credentials
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-06-25
 *
 * Integration Points:
 * - Common credential validation logic
 * - Service name normalization
 * - Error handling patterns
 * - Logging and monitoring
 */

import { Logger } from '../../logging/Logger.js';
import type {
    CredentialData,
    CredentialProvider,
    CredentialValidationResult
} from './interfaces.js';

export abstract class BaseCredentialProvider implements CredentialProvider {
    protected logger: Logger;

    constructor(logger?: Logger) {
        this.logger = logger || new Logger({ level: 'info', enableColors: true });
    }

    public abstract readonly name: string;
    public abstract readonly isAvailable: boolean;

    public abstract store(service: string, credentials: CredentialData): Promise<void>;
    public abstract retrieve(service: string): Promise<CredentialData | null>;
    public abstract delete(service: string): Promise<void>;
    public abstract list(): Promise<string[]>;
    public abstract clear(): Promise<void>;

    /**
     * Test if credentials exist and are valid for a service
     */
    public async test(service: string): Promise<boolean> {
        try {
            const credentials = await this.retrieve(service);
            if (!credentials) {
                return false;
            }

            const validation = this.validateCredentials(credentials);
            return validation.isValid && !validation.isExpired;
        } catch (error) {
            this.logger.debug(`Credential test failed for service ${service}: ${error}`);
            return false;
        }
    }

    /**
     * Normalize service name for consistent storage
     */
    protected normalizeServiceName(service: string): string {
        return service.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
    }

    /**
     * Get the full key name for credential storage
     */
    protected getCredentialKey(service: string): string {
        const normalizedService = this.normalizeServiceName(service);
        return `imajin_cli_${normalizedService}`;
    }

    /**
     * Validate credential data structure and expiration
     */
    protected validateCredentials(credentials: CredentialData): CredentialValidationResult {
        const result: CredentialValidationResult = {
            isValid: true,
            errors: []
        };

        // Check if credentials object is valid
        if (!credentials || typeof credentials !== 'object') {
            result.isValid = false;
            result.errors.push('Invalid credential data format');
            return result;
        }

        // Check for required fields
        const hasApiKey = credentials.apiKey && typeof credentials.apiKey === 'string';
        const hasAccessToken = credentials.accessToken && typeof credentials.accessToken === 'string';

        if (!hasApiKey && !hasAccessToken) {
            result.isValid = false;
            result.errors.push('Missing required credential fields (apiKey or accessToken)');
        }

        // Check expiration if present
        if (credentials.expiresAt) {
            const expiresAt = new Date(credentials.expiresAt);
            const _now = new Date();

            if (expiresAt <= _now) {
                result.isExpired = true;
                result.errors.push('Credentials have expired');
            } else {
                result.expiresIn = Math.floor((expiresAt.getTime() - _now.getTime()) / 1000);
            }
        }

        return result;
    }

    /**
     * Sanitize credential data for logging
     */
    protected sanitizeForLogging(credentials: CredentialData): any {
        const sanitized = { ...credentials };

        // Remove sensitive fields
        if (sanitized.apiKey) {
            sanitized.apiKey = `${sanitized.apiKey.slice(0, 8)}***`;
        }
        if (sanitized.accessToken) {
            sanitized.accessToken = `${sanitized.accessToken.slice(0, 8)}***`;
        }
        if (sanitized.refreshToken) {
            sanitized.refreshToken = `${sanitized.refreshToken.slice(0, 8)}***`;
        }

        return sanitized;
    }

    /**
     * Handle common errors with user-friendly messages
     */
    protected handleError(operation: string, service: string, error: any): never {
        const message = this.getErrorMessage(error);
        this.logger.error(`Credential ${operation} failed for service ${service}: ${message}`);
        throw new Error(`Failed to ${operation} credentials for ${service}: ${message}`);
    }

    /**
     * Convert system errors to user-friendly messages
     */
    private getErrorMessage(error: any): string {
        if (typeof error === 'string') {
            return error;
        }

        if (error?.message) {
            return error.message;
        }

        if (error?.code) {
            switch (error.code) {
                case 'EACCES':
                    return 'Permission denied accessing credential storage';
                case 'ENOENT':
                    return 'Credential storage not found or not accessible';
                default:
                    return `System error: ${error.code}`;
            }
        }

        return 'Unknown error occurred';
    }
} 