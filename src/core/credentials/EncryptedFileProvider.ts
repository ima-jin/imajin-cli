/**
 * EncryptedFileProvider - Encrypted file-based credential storage
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
 * - Encrypted file credential storage
 * - Master password protection
 * - Portable configuration files
 * - AES-256-GCM encryption
 */

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { ERROR_MESSAGES } from '../../constants/CommonStrings.js';
import { BaseCredentialProvider } from './BaseCredentialProvider.js';
import type { CredentialData, EncryptionConfig } from './interfaces.js';

interface EncryptedCredentialStore {
    version: string;
    encryption: EncryptionConfig;
    credentials: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}

export class EncryptedFileProvider extends BaseCredentialProvider {
    public readonly name = 'Encrypted File';
    private readonly credentialFile: string;
    private readonly encryptionConfig: EncryptionConfig;
    private masterPassword?: string;

    constructor(credentialFile?: string) {
        super();

        this.credentialFile = credentialFile || join(homedir(), '.imajin', 'credentials.enc');
        this.encryptionConfig = {
            algorithm: 'aes-256-gcm',
            keyDerivation: 'pbkdf2',
            iterations: 100000,
            keyLength: 32,
            ivLength: 16
        };
    }

    public get isAvailable(): boolean {
        // Encrypted file provider is always available
        return true;
    }

    /**
     * Set the master password for encryption/decryption
     */
    public setMasterPassword(password: string): void {
        if (!password || password.length < 8) {
            throw new Error('Master password must be at least 8 characters long');
        }
        this.masterPassword = password;
    }

    /**
     * Store credentials in encrypted file
     */
    public async store(service: string, credentials: CredentialData): Promise<void> {
        try {
            if (!this.masterPassword) {
                throw new Error(ERROR_MESSAGES.MASTER_PASSWORD_NOT_SET);
            }

            const store = await this.loadStore();
            const credentialKey = this.getCredentialKey(service);
            const encryptedData = this.encrypt(JSON.stringify(credentials));

            store.credentials[credentialKey] = encryptedData;
            store.updatedAt = new Date().toISOString();

            await this.saveStore(store);

            this.logger.info(`Stored credentials for service: ${service} in encrypted file`, {
                service,
                provider: this.name,
                credentialType: this.getCredentialType(credentials),
                file: this.credentialFile
            });
        } catch (error) {
            this.handleError('store', service, error);
        }
    }

    /**
     * Retrieve credentials from encrypted file
     */
    public async retrieve(service: string): Promise<CredentialData | null> {
        try {
            if (!this.masterPassword) {
                return null;
            }

            const store = await this.loadStore();
            const credentialKey = this.getCredentialKey(service);
            const encryptedData = store.credentials[credentialKey];

            if (!encryptedData) {
                return null;
            }

            const decryptedData = this.decrypt(encryptedData);
            const credentials = JSON.parse(decryptedData) as CredentialData;

            this.logger.debug(`Retrieved credentials for service: ${service} from encrypted file`, {
                service,
                provider: this.name,
                file: this.credentialFile,
                hasData: !!credentials
            });

            return credentials;
        } catch (error) {
            this.logger.debug(`Failed to retrieve credentials for service ${service} from encrypted file: ${error}`);
            return null;
        }
    }

    /**
     * Delete credentials from encrypted file
     */
    public async delete(service: string): Promise<void> {
        try {
            if (!this.masterPassword) {
                throw new Error(ERROR_MESSAGES.MASTER_PASSWORD_NOT_SET);
            }

            const store = await this.loadStore();
            const credentialKey = this.getCredentialKey(service);
            const hasCredential = store.credentials[credentialKey] !== undefined;

            if (hasCredential) {
                delete store.credentials[credentialKey];
                store.updatedAt = new Date().toISOString();

                await this.saveStore(store);

                this.logger.info(`Deleted credentials for service: ${service} from encrypted file`, {
                    service,
                    provider: this.name,
                    file: this.credentialFile
                });
            } else {
                this.logger.debug(`No credentials found to delete for service: ${service}`);
            }
        } catch (error) {
            this.handleError('delete', service, error);
        }
    }

    /**
     * List all stored credential services in encrypted file
     */
    public async list(): Promise<string[]> {
        try {
            if (!this.masterPassword) {
                return [];
            }

            const store = await this.loadStore();
            return Object.keys(store.credentials)
                .filter(key => key.startsWith('imajin_cli_'))
                .map(key => key.replace('imajin_cli_', '').replace(/_/g, '-'));
        } catch (error) {
            this.logger.debug(`Failed to list credentials from encrypted file: ${error}`);
            return [];
        }
    }

    /**
     * Clear all stored credentials from encrypted file
     */
    public async clear(): Promise<void> {
        try {
            if (!this.masterPassword) {
                throw new Error(ERROR_MESSAGES.MASTER_PASSWORD_NOT_SET);
            }

            const store = await this.loadStore();
            const credentialCount = Object.keys(store.credentials).length;

            store.credentials = {};
            store.updatedAt = new Date().toISOString();

            await this.saveStore(store);

            this.logger.info(`Cleared ${credentialCount} credentials from encrypted file`, {
                provider: this.name,
                count: credentialCount,
                file: this.credentialFile
            });
        } catch (error) {
            this.logger.error(`Failed to clear credentials from encrypted file: ${error}`);
            throw new Error(`Failed to clear credentials from encrypted file: ${error}`);
        }
    }

    /**
     * Load encrypted credential store from file
     */
    private async loadStore(): Promise<EncryptedCredentialStore> {
        try {
            const fileExists = await fs.access(this.credentialFile).then(() => true).catch(() => false);

            if (!fileExists) {
                return this.createEmptyStore();
            }

            const encryptedContent = await fs.readFile(this.credentialFile, 'utf8');
            const decryptedContent = this.decrypt(encryptedContent);

            return JSON.parse(decryptedContent) as EncryptedCredentialStore;
        } catch (error) {
            this.logger.debug(`Failed to load credential store, creating new one: ${error}`);
            return this.createEmptyStore();
        }
    }

    /**
     * Save encrypted credential store to file
     */
    private async saveStore(store: EncryptedCredentialStore): Promise<void> {
        const storeContent = JSON.stringify(store, null, 2);
        const encryptedContent = this.encrypt(storeContent);

        // Ensure directory exists
        await fs.mkdir(dirname(this.credentialFile), { recursive: true });

        // Write file with restrictive permissions
        await fs.writeFile(this.credentialFile, encryptedContent, { mode: 0o600 });
    }

    /**
     * Create an empty credential store
     */
    private createEmptyStore(): EncryptedCredentialStore {
        return {
            version: '1.0.0',
            encryption: this.encryptionConfig,
            credentials: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Encrypt data using AES-256-GCM
     */
    private encrypt(data: string): string {
        if (!this.masterPassword) {
            throw new Error('Master password not set');
        }

        const salt = randomBytes(16);
        const iv = randomBytes(this.encryptionConfig.ivLength);

        const key = pbkdf2Sync(
            this.masterPassword,
            salt,
            this.encryptionConfig.iterations,
            this.encryptionConfig.keyLength,
            'sha256'
        );

        const cipher = createCipheriv(this.encryptionConfig.algorithm, key, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = (cipher as any).getAuthTag();

        // Combine salt, iv, authTag, and encrypted data
        const result = {
            salt: salt.toString('hex'),
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            data: encrypted
        };

        return Buffer.from(JSON.stringify(result)).toString('base64');
    }

    /**
     * Decrypt data using AES-256-GCM
     */
    private decrypt(encryptedData: string): string {
        if (!this.masterPassword) {
            throw new Error('Master password not set');
        }

        try {
            const decoded = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));

            const salt = Buffer.from(decoded.salt, 'hex');
            const iv = Buffer.from(decoded.iv, 'hex');
            const authTag = Buffer.from(decoded.authTag, 'hex');

            const key = pbkdf2Sync(
                this.masterPassword,
                salt,
                this.encryptionConfig.iterations,
                this.encryptionConfig.keyLength,
                'sha256'
            );

            const decipher = createDecipheriv(this.encryptionConfig.algorithm, key, iv);
            (decipher as any).setAuthTag(authTag);

            let decrypted = decipher.update(decoded.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt data. Invalid password or corrupted file.');
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

    /**
     * Get the path to the credential file
     */
    public getCredentialFilePath(): string {
        return this.credentialFile;
    }

    /**
     * Check if credential file exists
     */
    public async credentialFileExists(): Promise<boolean> {
        try {
            await fs.access(this.credentialFile);
            return true;
        } catch {
            return false;
        }
    }
} 