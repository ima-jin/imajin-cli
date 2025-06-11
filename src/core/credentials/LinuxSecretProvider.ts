/**
 * LinuxSecretProvider - Linux Secret Service integration (libsecret)
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
 * - Linux Secret Service integration (libsecret)
 * - GNOME Keyring and KDE Wallet support
 * - D-Bus communication for credential storage
 * - Desktop environment integration
 */

import * as keytar from 'keytar';
import { BaseCredentialProvider } from './BaseCredentialProvider.js';
import type { CredentialData } from './interfaces.js';

export class LinuxSecretProvider extends BaseCredentialProvider {
    public readonly name = 'Linux Secret Service';
    private readonly serviceName = 'imajin-cli';

    // Constants for commonly used strings
    private static readonly IMAJIN_CLI_PREFIX = 'imajin_cli_';

    constructor() {
        super();
    }

    public get isAvailable(): boolean {
        return process.platform === 'linux' && this.isKeytarAvailable() && this.isSecretServiceAvailable();
    }

    /**
     * Store credentials in Linux Secret Service
     */
    public async store(service: string, credentials: CredentialData): Promise<void> {
        try {
            if (!this.isAvailable) {
                throw new Error('Linux Secret Service is not available on this platform');
            }

            const credentialKey = this.getCredentialKey(service);
            const credentialData = JSON.stringify(credentials);

            await keytar.setPassword(this.serviceName, credentialKey, credentialData);

            this.logger.info(`Stored credentials for service: ${service}`, {
                service,
                provider: this.name,
                credentialType: this.getCredentialType(credentials)
            });
        } catch (error) {
            this.handleError('store', service, error);
        }
    }

    /**
     * Retrieve credentials from Linux Secret Service
     */
    public async retrieve(service: string): Promise<CredentialData | null> {
        try {
            if (!this.isAvailable) {
                return null;
            }

            const credentialKey = this.getCredentialKey(service);
            const credentialData = await keytar.getPassword(this.serviceName, credentialKey);

            if (!credentialData) {
                return null;
            }

            const credentials = JSON.parse(credentialData) as CredentialData;

            this.logger.debug(`Retrieved credentials for service: ${service}`, {
                service,
                provider: this.name,
                hasData: !!credentials
            });

            return credentials;
        } catch (error) {
            this.logger.debug(`Failed to retrieve credentials for service ${service}: ${error}`);
            return null;
        }
    }

    /**
     * Delete credentials from Linux Secret Service
     */
    public async delete(service: string): Promise<void> {
        try {
            if (!this.isAvailable) {
                throw new Error('Linux Secret Service is not available on this platform');
            }

            const credentialKey = this.getCredentialKey(service);
            const deleted = await keytar.deletePassword(this.serviceName, credentialKey);

            if (deleted) {
                this.logger.info(`Deleted credentials for service: ${service}`, {
                    service,
                    provider: this.name
                });
            } else {
                this.logger.debug(`No credentials found to delete for service: ${service}`);
            }
        } catch (error) {
            this.handleError('delete', service, error);
        }
    }

    /**
     * List all stored credential services
     */
    public async list(): Promise<string[]> {
        try {
            if (!this.isAvailable) {
                return [];
            }

            const credentials = await keytar.findCredentials(this.serviceName);
            return credentials
                .map(cred => cred.account)
                .filter(account => account.startsWith(LinuxSecretProvider.IMAJIN_CLI_PREFIX))
                .map(account => account.replace(LinuxSecretProvider.IMAJIN_CLI_PREFIX, '').replace(/_/g, '-'));
        } catch (error) {
            this.logger.debug(`Failed to list credentials: ${error}`);
            return [];
        }
    }

    /**
     * Clear all stored credentials
     */
    public async clear(): Promise<void> {
        try {
            if (!this.isAvailable) {
                throw new Error('Linux Secret Service is not available on this platform');
            }

            const credentials = await keytar.findCredentials(this.serviceName);
            const imajinCredentials = credentials.filter(cred =>
                cred.account.startsWith(LinuxSecretProvider.IMAJIN_CLI_PREFIX)
            );

            for (const credential of imajinCredentials) {
                await keytar.deletePassword(this.serviceName, credential.account);
            }

            this.logger.info(`Cleared ${imajinCredentials.length} credentials from Secret Service`, {
                provider: this.name,
                count: imajinCredentials.length
            });
        } catch (error) {
            this.logger.error(`Failed to clear credentials: ${error}`);
            throw new Error(`Failed to clear credentials: ${error}`);
        }
    }

    /**
     * Check if keytar is available and functional on Linux
     */
    private isKeytarAvailable(): boolean {
        try {
            // Test if keytar functions are available
            return typeof keytar.setPassword === 'function' &&
                typeof keytar.getPassword === 'function' &&
                typeof keytar.deletePassword === 'function';
        } catch (error) {
            this.logger.debug(`Keytar not available on Linux: ${error}`);
            return false;
        }
    }

    /**
     * Check if Secret Service is available on the system
     */
    private isSecretServiceAvailable(): boolean {
        try {
            // Check for common secret service indicators
            const hasGnomeKeyring = process.env.GNOME_KEYRING_CONTROL !== undefined;
            const hasKdeWallet = process.env.KDE_SESSION_VERSION !== undefined;
            const hasSecretService = process.env.DESKTOP_SESSION !== undefined;

            return hasGnomeKeyring || hasKdeWallet || hasSecretService;
        } catch (error) {
            this.logger.debug(`Secret Service availability check failed: ${error}`);
            return false;
        }
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
} 