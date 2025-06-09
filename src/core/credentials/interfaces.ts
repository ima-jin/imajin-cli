/**
 * Credential Management Interfaces - Core interfaces for secure credential storage
 * 
 * @package     @imajin/cli
 * @subpackage  core/credentials
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Platform-native credential storage
 * - Environment variable fallback
 * - Encrypted file storage
 * - Plugin-specific credential isolation
 */

export interface CredentialData {
    [key: string]: any;
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    scopes?: string[];
    metadata?: Record<string, any>;
}

export interface CredentialProvider {
    readonly name: string;
    readonly isAvailable: boolean;

    store(service: string, credentials: CredentialData): Promise<void>;
    retrieve(service: string): Promise<CredentialData | null>;
    delete(service: string): Promise<void>;
    list(): Promise<string[]>;
    test(service: string): Promise<boolean>;
    clear(): Promise<void>;
}

export interface CredentialManager {
    store(service: string, credentials: CredentialData): Promise<void>;
    retrieve(service: string): Promise<CredentialData | null>;
    delete(service: string): Promise<void>;
    list(): Promise<string[]>;
    test(service: string): Promise<boolean>;
    clear(): Promise<void>;
    getProviderInfo(): ProviderInfo;
}

export interface ProviderInfo {
    name: string;
    type: 'keychain' | 'credential-manager' | 'libsecret' | 'environment' | 'encrypted-file';
    isNative: boolean;
    isSecure: boolean;
    description: string;
}

export interface CredentialValidationResult {
    isValid: boolean;
    isExpired?: boolean;
    expiresIn?: number;
    errors: string[];
}

export interface EncryptionConfig {
    algorithm: string;
    keyDerivation: string;
    iterations: number;
    keyLength: number;
    ivLength: number;
} 