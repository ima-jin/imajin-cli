/**
 * CredentialManager - Core credential management orchestration
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
 * - Platform-native credential storage orchestration
 * - Provider fallback chain management
 * - Credential validation and expiry handling
 * - Plugin-specific credential isolation
 */

import { Logger } from '../../logging/Logger.js';
import { EncryptedFileProvider } from './EncryptedFileProvider.js';
import { EnvironmentProvider } from './EnvironmentProvider.js';
import type {
    CredentialData,
    CredentialProvider,
    CredentialManager as ICredentialManager,
    ProviderInfo
} from './interfaces.js';
import { KeychainProvider } from './KeychainProvider.js';
import { LinuxSecretProvider } from './LinuxSecretProvider.js';
import { WindowsCredentialProvider } from './WindowsCredentialProvider.js';

export class CredentialManager implements ICredentialManager {
    private providers: CredentialProvider[] = [];
    private activeProvider?: CredentialProvider;
    private logger: Logger;

    // Constants for commonly used strings
    private static readonly NO_PROVIDER_MSG = 'No credential provider available';

    constructor(logger?: Logger, encryptedFilePassword?: string) {
        this.logger = logger || new Logger({ level: 'info', enableColors: true });
        this.initializeProviders(encryptedFilePassword);
        this.selectActiveProvider();
    }

    /**
     * Store credentials using the active provider
     */
    public async store(service: string, credentials: CredentialData): Promise<void> {
        this.validateService(service);
        this.validateCredentials(credentials);

        if (!this.activeProvider) {
            throw new Error(CredentialManager.NO_PROVIDER_MSG);
        }

        await this.activeProvider.store(service, credentials);

        this.logger.info(`Credentials stored for service: ${service}`, {
            service,
            provider: this.activeProvider.name,
            credentialType: this.getCredentialType(credentials)
        });
    }

    /**
     * Retrieve credentials using the active provider
     */
    public async retrieve(service: string): Promise<CredentialData | null> {
        this.validateService(service);

        if (!this.activeProvider) {
            return null;
        }

        return await this.activeProvider.retrieve(service);
    }

    /**
     * Delete credentials using the active provider
     */
    public async delete(service: string): Promise<void> {
        this.validateService(service);

        if (!this.activeProvider) {
            throw new Error(CredentialManager.NO_PROVIDER_MSG);
        }

        await this.activeProvider.delete(service);
    }

    /**
     * List all stored credentials using the active provider
     */
    public async list(): Promise<string[]> {
        if (!this.activeProvider) {
            return [];
        }

        return await this.activeProvider.list();
    }

    /**
     * Test if credentials exist and are valid
     */
    public async test(service: string): Promise<boolean> {
        this.validateService(service);

        if (!this.activeProvider) {
            return false;
        }

        return await this.activeProvider.test(service);
    }

    /**
     * Clear all stored credentials
     */
    public async clear(): Promise<void> {
        if (!this.activeProvider) {
            throw new Error(CredentialManager.NO_PROVIDER_MSG);
        }

        await this.activeProvider.clear();
    }

    /**
     * Get information about the active provider
     */
    public getProviderInfo(): ProviderInfo {
        if (!this.activeProvider) {
            return {
                name: 'None',
                type: 'environment',
                isNative: false,
                isSecure: false,
                description: CredentialManager.NO_PROVIDER_MSG
            };
        }

        return this.getProviderInfoForProvider(this.activeProvider);
    }

    /**
     * Get all available providers with their status
     */
    public getAvailableProviders(): Array<ProviderInfo & { isActive: boolean }> {
        return this.providers.map(provider => ({
            ...this.getProviderInfoForProvider(provider),
            isActive: provider === this.activeProvider
        }));
    }

    /**
     * Switch to a specific provider type
     */
    public async switchProvider(providerType: 'keychain' | 'credential-manager' | 'libsecret' | 'environment' | 'encrypted-file'): Promise<void> {
        const provider = this.providers.find(p => {
            const info = this.getProviderInfoForProvider(p);
            return info.type === providerType;
        });

        if (!provider) {
            throw new Error(`Provider type '${providerType}' not found or not available`);
        }

        if (!provider.isAvailable) {
            throw new Error(`Provider '${provider.name}' is not available on this platform`);
        }

        this.activeProvider = provider;

        this.logger.info(`Switched to credential provider: ${provider.name}`, {
            provider: provider.name,
            type: providerType
        });
    }

    /**
     * Set master password for encrypted file provider
     */
    public setEncryptedFilePassword(password: string): void {
        const encryptedProvider = this.providers.find(p => p instanceof EncryptedFileProvider) as EncryptedFileProvider;

        if (encryptedProvider) {
            encryptedProvider.setMasterPassword(password);
        } else {
            throw new Error('Encrypted file provider not available');
        }
    }

    /**
     * Initialize all credential providers
     */
    private initializeProviders(encryptedFilePassword?: string): void {
        this.providers = [
            new KeychainProvider(),
            new WindowsCredentialProvider(),
            new LinuxSecretProvider(),
            new EnvironmentProvider(),
            new EncryptedFileProvider()
        ];

        // Set master password for encrypted file provider if provided
        if (encryptedFilePassword) {
            this.setEncryptedFilePassword(encryptedFilePassword);
        }

        this.logger.debug('Initialized credential providers', {
            providers: this.providers.map(p => ({
                name: p.name,
                available: p.isAvailable
            }))
        });
    }

    /**
     * Select the best available provider based on platform
     */
    private selectActiveProvider(): void {
        // Priority order: Platform-native -> Environment -> Encrypted File
        const priorityOrder = [
            (p: CredentialProvider) => p instanceof KeychainProvider && p.isAvailable,
            (p: CredentialProvider) => p instanceof WindowsCredentialProvider && p.isAvailable,
            (p: CredentialProvider) => p instanceof LinuxSecretProvider && p.isAvailable,
            (p: CredentialProvider) => p instanceof EnvironmentProvider && p.isAvailable,
            (p: CredentialProvider) => p instanceof EncryptedFileProvider && p.isAvailable
        ];

        for (const predicate of priorityOrder) {
            const provider = this.providers.find(predicate);
            if (provider) {
                this.activeProvider = provider;
                break;
            }
        }

        if (this.activeProvider) {
            this.logger.info(`Selected credential provider: ${this.activeProvider.name}`, {
                provider: this.activeProvider.name,
                platform: process.platform
            });
        } else {
            this.logger.warn('No credential provider available');
        }
    }

    /**
     * Get provider info for a specific provider
     */
    private getProviderInfoForProvider(provider: CredentialProvider): ProviderInfo {
        if (provider instanceof KeychainProvider) {
            return {
                name: provider.name,
                type: 'keychain',
                isNative: true,
                isSecure: true,
                description: 'macOS Keychain Services with biometric authentication support'
            };
        }

        if (provider instanceof WindowsCredentialProvider) {
            return {
                name: provider.name,
                type: 'credential-manager',
                isNative: true,
                isSecure: true,
                description: 'Windows Credential Manager with Windows Hello integration'
            };
        }

        if (provider instanceof LinuxSecretProvider) {
            return {
                name: provider.name,
                type: 'libsecret',
                isNative: true,
                isSecure: true,
                description: 'Linux Secret Service (GNOME Keyring/KDE Wallet)'
            };
        }

        if (provider instanceof EnvironmentProvider) {
            return {
                name: provider.name,
                type: 'environment',
                isNative: false,
                isSecure: false,
                description: 'Environment variables (for CI/CD and development)'
            };
        }

        if (provider instanceof EncryptedFileProvider) {
            return {
                name: provider.name,
                type: 'encrypted-file',
                isNative: false,
                isSecure: true,
                description: 'AES-256 encrypted file with master password protection'
            };
        }

        return {
            name: provider.name,
            type: 'environment',
            isNative: false,
            isSecure: false,
            description: 'Unknown provider type'
        };
    }

    /**
     * Validate service name
     */
    private validateService(service: string): void {
        if (!service || typeof service !== 'string' || service.trim().length === 0) {
            throw new Error('Service name must be a non-empty string');
        }

        if (service.length > 100) {
            throw new Error('Service name must be 100 characters or less');
        }

        if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(service)) {
            throw new Error('Service name must start with alphanumeric character and contain only letters, numbers, hyphens, and underscores');
        }
    }

    /**
     * Validate credential data
     */
    private validateCredentials(credentials: CredentialData): void {
        if (!credentials || typeof credentials !== 'object') {
            throw new Error('Credentials must be an object');
        }

        const hasApiKey = credentials.apiKey && typeof credentials.apiKey === 'string';
        const hasAccessToken = credentials.accessToken && typeof credentials.accessToken === 'string';

        if (!hasApiKey && !hasAccessToken) {
            throw new Error('Credentials must contain at least apiKey or accessToken');
        }

        // Validate expiration date if present
        if (credentials.expiresAt) {
            const expiresAt = new Date(credentials.expiresAt);
            if (isNaN(expiresAt.getTime())) {
                throw new Error('expiresAt must be a valid date');
            }
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