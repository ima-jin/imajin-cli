/**
 * Credential Management System Exports
 * 
 * @package     @imajin/cli
 * @subpackage  core/credentials
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

// Core interfaces and types
export type {
    CredentialData,
    CredentialProvider, CredentialValidationResult,
    EncryptionConfig, CredentialManager as ICredentialManager,
    ProviderInfo
} from './interfaces.js';

// Base provider class
export { BaseCredentialProvider } from './BaseCredentialProvider.js';

// Platform-specific providers
export { KeychainProvider } from './KeychainProvider.js';
export { LinuxSecretProvider } from './LinuxSecretProvider.js';
export { WindowsCredentialProvider } from './WindowsCredentialProvider.js';

// Fallback providers
export { EncryptedFileProvider } from './EncryptedFileProvider.js';
export { EnvironmentProvider } from './EnvironmentProvider.js';

// Main credential manager
export { CredentialManager } from './CredentialManager.js';

// Service provider integration
export { CredentialServiceProvider } from './CredentialServiceProvider.js';

// CLI commands
export { AuthCommands } from '../../commands/auth/AuthCommands.js';
