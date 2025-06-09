/**
 * CredentialManager Tests
 * 
 * @package     @imajin/cli
 * @subpackage  core/credentials/__tests__
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import { Logger } from '../../../logging/Logger.js';
import { CredentialManager } from '../CredentialManager.js';
import { CredentialData } from '../interfaces.js';

// Mock the logger to avoid console output during tests
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as unknown as Logger;

describe('CredentialManager', () => {
    let credentialManager: CredentialManager;

    beforeEach(() => {
        // Clear environment variables before each test
        Object.keys(process.env)
            .filter(key => key.startsWith('IMAJIN_CLI_CRED_'))
            .forEach(key => {
                delete (process.env as any)[key];
            });

        credentialManager = new CredentialManager(mockLogger);
    });

    afterEach(() => {
        // Clean up after each test
        Object.keys(process.env)
            .filter(key => key.startsWith('IMAJIN_CLI_CRED_'))
            .forEach(key => {
                delete (process.env as any)[key];
            });
    });

    describe('Provider Selection', () => {
        test('should select environment provider as fallback', () => {
            const providerInfo = credentialManager.getProviderInfo();
            expect(providerInfo.type).toBe('environment');
            expect(providerInfo.name).toBe('Environment Variables');
        });

        test('should list available providers', () => {
            const providers = credentialManager.getAvailableProviders();
            expect(providers.length).toBeGreaterThan(0);

            // Environment provider should always be available
            const envProvider = providers.find(p => p.type === 'environment');
            expect(envProvider).toBeDefined();
            expect(envProvider?.isActive).toBe(true);
        });
    });

    describe('Credential Storage', () => {
        const testService = 'test-service';
        const testCredentials: CredentialData = {
            apiKey: 'test-api-key-12345'
        };

        test('should store and retrieve credentials', async () => {
            await credentialManager.store(testService, testCredentials);

            const retrieved = await credentialManager.retrieve(testService);
            expect(retrieved).toEqual(testCredentials);
        });

        test('should return null for non-existent credentials', async () => {
            const retrieved = await credentialManager.retrieve('non-existent-service');
            expect(retrieved).toBeNull();
        });

        test('should validate service names', async () => {
            const invalidNames = ['', '  ', 'invalid name', '123invalid', 'service-with-ñ'];

            for (const invalidName of invalidNames) {
                await expect(credentialManager.store(invalidName, testCredentials))
                    .rejects.toThrow();
            }
        });

        test('should validate credential data', async () => {
            const invalidCredentials = [
                {},
                { invalidField: 'value' },
                { apiKey: '' },
                { accessToken: '' }
            ];

            for (const invalid of invalidCredentials) {
                await expect(credentialManager.store(testService, invalid as CredentialData))
                    .rejects.toThrow();
            }
        });
    });

    describe('Credential Testing', () => {
        const testService = 'test-service';

        test('should return false for non-existent credentials', async () => {
            const isValid = await credentialManager.test(testService);
            expect(isValid).toBe(false);
        });

        test('should return true for valid credentials', async () => {
            const credentials: CredentialData = {
                apiKey: 'valid-api-key'
            };

            await credentialManager.store(testService, credentials);
            const isValid = await credentialManager.test(testService);
            expect(isValid).toBe(true);
        });

        test('should return false for expired credentials', async () => {
            const expiredCredentials: CredentialData = {
                accessToken: 'expired-token',
                expiresAt: new Date(Date.now() - 86400000) // 1 day ago
            };

            await credentialManager.store(testService, expiredCredentials);
            const isValid = await credentialManager.test(testService);
            expect(isValid).toBe(false);
        });
    });

    describe('Credential Management', () => {
        const testServices = ['service1', 'service2', 'service3'];
        const testCredentials: CredentialData = {
            apiKey: 'test-key'
        };

        beforeEach(async () => {
            // Store test credentials
            for (const service of testServices) {
                await credentialManager.store(service, testCredentials);
            }
        });

        test('should list stored credentials', async () => {
            const services = await credentialManager.list();
            expect(services).toEqual(expect.arrayContaining(testServices));
            expect(services.length).toBe(testServices.length);
        });

        test('should delete specific credentials', async () => {
            await credentialManager.delete(testServices[0]!);

            const services = await credentialManager.list();
            expect(services).not.toContain(testServices[0]);
            expect(services.length).toBe(testServices.length - 1);
        });

        test('should clear all credentials', async () => {
            await credentialManager.clear();

            const services = await credentialManager.list();
            expect(services.length).toBe(0);
        });
    });

    describe('Provider Switching', () => {
        test('should switch to environment provider', async () => {
            await credentialManager.switchProvider('environment');

            const providerInfo = credentialManager.getProviderInfo();
            expect(providerInfo.type).toBe('environment');
        });

        test('should throw error for invalid provider', async () => {
            await expect(credentialManager.switchProvider('invalid' as any))
                .rejects.toThrow();
        });

        test('should throw error for unavailable provider', async () => {
            // On Windows, trying to switch to keychain should fail
            if (process.platform === 'win32') {
                await expect(credentialManager.switchProvider('keychain'))
                    .rejects.toThrow();
            }
        });
    });

    describe('OAuth Credentials', () => {
        const testService = 'oauth-service';
        const oauthCredentials: CredentialData = {
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-456',
            expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        };

        test('should store and retrieve OAuth credentials', async () => {
            await credentialManager.store(testService, oauthCredentials);

            const retrieved = await credentialManager.retrieve(testService);
            expect(retrieved?.accessToken).toBe(oauthCredentials.accessToken);
            expect(retrieved?.refreshToken).toBe(oauthCredentials.refreshToken);

            // Date comparison (allow small time difference)
            const retrievedExpiry = new Date(retrieved?.expiresAt || 0);
            const originalExpiry = oauthCredentials.expiresAt!;
            expect(Math.abs(retrievedExpiry.getTime() - originalExpiry.getTime())).toBeLessThan(1000);
        });

        test('should validate OAuth credentials as valid', async () => {
            await credentialManager.store(testService, oauthCredentials);

            const isValid = await credentialManager.test(testService);
            expect(isValid).toBe(true);
        });
    });
}); 