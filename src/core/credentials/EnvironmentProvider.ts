/**
 * EnvironmentProvider - Environment variable-based credential storage
 * 
 * @package     @imajin/cli
 * @subpackage  core/credentials
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Environment variable credential storage
 * - CI/CD environment compatibility
 * - Process environment management
 * - Fallback credential provider
 */

import { BaseCredentialProvider } from './BaseCredentialProvider.js';
import type { CredentialData } from './interfaces.js';

export class EnvironmentProvider extends BaseCredentialProvider {
    public readonly name = 'Environment Variables';
    private readonly envPrefix = 'IMAJIN_CLI_CRED';

    constructor() {
        super();
    }

    public get isAvailable(): boolean {
        // Environment provider is always available as a fallback
        return true;
    }

    /**
     * Store credentials in environment variables
     * Note: This only affects the current process, not persistent environment
     */
    public async store(service: string, credentials: CredentialData): Promise<void> {
        try {
            const envKey = this.getEnvironmentKey(service);
            const credentialData = JSON.stringify(credentials);

            // Store in current process environment
            process.env[envKey] = credentialData;

            this.logger.info(`Stored credentials for service: ${service} in environment`, {
                service,
                provider: this.name,
                credentialType: this.getCredentialType(credentials),
                envKey,
                persistent: false
            });

            // Log instruction for persistent storage
            this.logger.warn(`Environment credentials are not persistent. To make permanent, add to your shell profile:`, {
                instruction: `export ${envKey}='${credentialData}'`
            });
        } catch (error) {
            this.handleError('store', service, error);
        }
    }

    /**
     * Retrieve credentials from environment variables
     */
    public async retrieve(service: string): Promise<CredentialData | null> {
        try {
            const envKey = this.getEnvironmentKey(service);
            const credentialData = process.env[envKey];

            if (!credentialData) {
                return null;
            }

            const credentials = JSON.parse(credentialData) as CredentialData;

            this.logger.debug(`Retrieved credentials for service: ${service} from environment`, {
                service,
                provider: this.name,
                envKey,
                hasData: !!credentials
            });

            return credentials;
        } catch (error) {
            this.logger.debug(`Failed to retrieve credentials for service ${service} from environment: ${error}`);
            return null;
        }
    }

    /**
     * Delete credentials from environment variables
     */
    public async delete(service: string): Promise<void> {
        try {
            const envKey = this.getEnvironmentKey(service);
            const hasCredential = process.env[envKey] !== undefined;

            if (hasCredential) {
                delete process.env[envKey];

                this.logger.info(`Deleted credentials for service: ${service} from environment`, {
                    service,
                    provider: this.name,
                    envKey
                });

                // Log instruction for persistent removal
                this.logger.warn(`Environment credential removed from current process only. To remove permanently, remove from your shell profile:`, {
                    instruction: `unset ${envKey}`
                });
            } else {
                this.logger.debug(`No credentials found to delete for service: ${service}`);
            }
        } catch (error) {
            this.handleError('delete', service, error);
        }
    }

    /**
     * List all stored credential services in environment
     */
    public async list(): Promise<string[]> {
        try {
            const envKeys = Object.keys(process.env);
            const credentialKeys = envKeys.filter(key => key.startsWith(`${this.envPrefix}_`));

            return credentialKeys
                .map(key => key.replace(`${this.envPrefix}_`, '').toLowerCase())
                .map(service => service.replace(/_/g, '-'));
        } catch (error) {
            this.logger.debug(`Failed to list credentials from environment: ${error}`);
            return [];
        }
    }

    /**
     * Clear all stored credentials from environment
     */
    public async clear(): Promise<void> {
        try {
            const envKeys = Object.keys(process.env);
            const credentialKeys = envKeys.filter(key => key.startsWith(`${this.envPrefix}_`));

            for (const key of credentialKeys) {
                delete process.env[key];
            }

            this.logger.info(`Cleared ${credentialKeys.length} credentials from environment`, {
                provider: this.name,
                count: credentialKeys.length,
                keys: credentialKeys
            });

            if (credentialKeys.length > 0) {
                this.logger.warn(`Environment credentials removed from current process only. To remove permanently, remove these from your shell profile:`, {
                    instructions: credentialKeys.map(key => `unset ${key}`)
                });
            }
        } catch (error) {
            this.logger.error(`Failed to clear credentials from environment: ${error}`);
            throw new Error(`Failed to clear credentials from environment: ${error}`);
        }
    }

    /**
     * Get the environment variable key for a service
     */
    private getEnvironmentKey(service: string): string {
        const normalizedService = this.normalizeServiceName(service).toUpperCase();
        return `${this.envPrefix}_${normalizedService}`;
    }

    /**
     * Get credential type for logging
     */
    private getCredentialType(credentials: CredentialData): string {
        if (credentials.apiKey) return 'api-key';
        if (credentials.accessToken && credentials.refreshToken) return 'oauth2';
        if (credentials.accessToken) return 'bearer-token';
        return 'unknown';
    }

    /**
     * Get available environment credential keys for debugging
     */
    public getAvailableKeys(): string[] {
        return Object.keys(process.env)
            .filter(key => key.startsWith(`${this.envPrefix}_`))
            .sort();
    }

    /**
     * Check if running in CI/CD environment
     */
    public isInCIEnvironment(): boolean {
        const ciIndicators = [
            'CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER',
            'GITHUB_ACTIONS', 'GITLAB_CI', 'JENKINS_URL',
            'TRAVIS', 'CIRCLECI', 'BUILDKITE'
        ];

        return ciIndicators.some(indicator => process.env[indicator] !== undefined);
    }
} 