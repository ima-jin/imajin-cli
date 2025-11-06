/**
 * AuthCommands - CLI commands for credential management
 * 
 * @package     @imajin/cli
 * @subpackage  commands/auth
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - CredentialManager for secure storage
 * - CLI command registration
 * - Interactive credential input
 * - User-friendly output formatting
 */

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { CLI_OPTIONS, CLI_DESCRIPTIONS } from '../../constants/CommonStrings.js';
import { CredentialManager } from '../../core/credentials/CredentialManager.js';
import type { CredentialData } from '../../core/credentials/interfaces.js';
import { Logger } from '../../logging/Logger.js';
import { CommonOptions } from '../../utils/commonOptions.js';

export class AuthCommands {
    private credentialManager: CredentialManager;
    private logger: Logger;

    constructor(credentialManager: CredentialManager, logger: Logger) {
        this.credentialManager = credentialManager;
        this.logger = logger;
    }

    /**
     * Register all auth commands
     */
    public registerCommands(program: Command): void {
        const authCommand = program
            .command('auth')
            .description('Manage authentication credentials for services');

        // Setup command
        authCommand
            .command('setup')
            .argument('<service>', 'Service name (e.g., stripe, github)')
            .option('--api-key <key>', 'API key for the service')
            .option('--access-token <token>', 'Access token for OAuth')
            .option('--refresh-token <token>', 'Refresh token for OAuth')
            .option('--expires-at <date>', 'Token expiration date')
            .option('--interactive', 'Interactive credential input')
            .option('--provider <type>', 'Force specific provider (keychain, credential-manager, libsecret, environment, encrypted-file)')
            .description('Setup credentials for a service')
            .action(this.handleSetup.bind(this));

        // List command
        authCommand
            .command('list')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .option('--provider-info', 'Include provider information')
            .description('List configured services')
            .action(this.handleList.bind(this));

        // Test command
        authCommand
            .command('test')
            .argument('<service>', 'Service name to test')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .description('Test if credentials are valid for a service')
            .action(this.handleTest.bind(this));

        // Remove command
        authCommand
            .command('remove')
            .argument('<service>', 'Service name to remove')
            .addOption(CommonOptions.force())
            .description('Remove credentials for a service')
            .action(this.handleRemove.bind(this));

        // Clear command
        authCommand
            .command('clear')
            .addOption(CommonOptions.force())
            .description('Remove all stored credentials')
            .action(this.handleClear.bind(this));

        // Provider command
        authCommand
            .command('provider')
            .option('--list', 'List available providers')
            .option('--switch <type>', 'Switch to a specific provider')
            .option('--info', 'Show current provider information')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .description('Manage credential providers')
            .action(this.handleProvider.bind(this));
    }

    /**
     * Handle auth setup command
     */
    private async handleSetup(service: string, options: any): Promise<void> {
        try {
            this.logger?.debug('Starting auth setup', { service, hasProvider: !!options.provider });
            // Switch provider if requested
            if (options.provider) {
                await this.credentialManager.switchProvider(options.provider);
            }

            let credentials: CredentialData;

            if (options.interactive || (!options.apiKey && !options.accessToken)) {
                credentials = await this.promptForCredentials(service);
            } else {
                credentials = this.buildCredentialsFromOptions(options);
            }

            await this.credentialManager.store(service, credentials);

            this.logger?.info('Credentials stored successfully', {
                service,
                credentialType: this.getCredentialType(credentials),
                provider: this.credentialManager.getProviderInfo().name
            });

            console.log(chalk.green(`✅ Credentials stored for ${service}`));

            const providerInfo = this.credentialManager.getProviderInfo();
            console.log(chalk.gray(`   Provider: ${providerInfo.name}`));
            console.log(chalk.gray(`   Type: ${this.getCredentialType(credentials)}`));

            // Test the credentials
            const isValid = await this.credentialManager.test(service);
            if (isValid) {
                console.log(chalk.green(`✅ Credentials test successful`));
            } else {
                console.log(chalk.yellow(`⚠️  Credentials stored but validation failed`));
            }

        } catch (error) {
            this.logger?.error('Auth setup failed', error as Error, { service, options });
            console.error(chalk.red(`❌ Failed to setup credentials: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Handle auth list command
     */
    private async handleList(options: any): Promise<void> {
        try {
            this.logger?.debug('Listing credentials', { json: !!options.json, providerInfo: !!options.providerInfo });
            const services = await this.credentialManager.list();
            const providerInfo = this.credentialManager.getProviderInfo();

            if (options.json) {
                const output = {
                    services,
                    count: services.length,
                    provider: options.providerInfo ? providerInfo : providerInfo.name
                };
                console.log(JSON.stringify(output, null, 2));
                return;
            }

            if (services.length === 0) {
                console.log(chalk.yellow('No credentials configured'));
                return;
            }

            console.log(chalk.blue(`📋 Configured Services (${services.length})`));
            console.log();

            for (const _service of services) {
                const isValid = await this.credentialManager.test(_service);
                const status = isValid ? chalk.green('✅ Valid') : chalk.red('❌ Invalid');
                console.log(`  ${chalk.cyan(_service)} ${status}`);
            }

            if (options.providerInfo) {
                console.log();
                console.log(chalk.gray(`Provider: ${providerInfo.name} (${providerInfo.type})`));
                console.log(chalk.gray(`Security: ${providerInfo.isSecure ? 'Secure' : 'Insecure'}`));
                console.log(chalk.gray(`Native: ${providerInfo.isNative ? 'Yes' : 'No'}`));
            }

            this.logger?.info('Credentials listed successfully', { count: services.length, provider: providerInfo.name });

        } catch (error) {
            this.logger?.error('Failed to list credentials', error as Error);
            console.error(chalk.red(`❌ Failed to list credentials: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Handle auth test command
     */
    private async handleTest(service: string, options: any): Promise<void> {
        try {
            this.logger?.debug('Testing credentials', { service, json: !!options.json });
            const isValid = await this.credentialManager.test(service);
            const credentials = await this.credentialManager.retrieve(service);

            if (options.json) {
                const output = {
                    service,
                    valid: isValid,
                    exists: !!credentials,
                    credentialType: credentials ? this.getCredentialType(credentials) : null
                };
                console.log(JSON.stringify(output, null, 2));
                return;
            }

            if (!credentials) {
                console.log(chalk.red(`❌ No credentials found for ${service}`));
                return;
            }

            if (isValid) {
                console.log(chalk.green(`✅ Credentials for ${service} are valid`));
                console.log(chalk.gray(`   Type: ${this.getCredentialType(credentials)}`));
            } else {
                console.log(chalk.red(`❌ Credentials for ${service} are invalid or expired`));
            }

            this.logger?.info('Credential test completed', { service, valid: isValid });

        } catch (error) {
            this.logger?.error('Failed to test credentials', error as Error, { service });
            console.error(chalk.red(`❌ Failed to test credentials: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Handle auth remove command
     */
    private async handleRemove(service: string, options: any): Promise<void> {
        try {
            this.logger?.debug('Removing credentials', { service, force: !!options.force });
            const credentials = await this.credentialManager.retrieve(service);

            if (!credentials) {
                console.log(chalk.yellow(`⚠️  No credentials found for ${service}`));
                return;
            }

            if (!options.force) {
                const { confirmed } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmed',
                        message: `Are you sure you want to remove credentials for ${service}?`,
                        default: false
                    }
                ]);

                if (!confirmed) {
                    console.log(chalk.gray('Operation cancelled'));
                    return;
                }
            }

            await this.credentialManager.delete(service);

            this.logger?.info('Credentials removed successfully', { service });
            console.log(chalk.green(`✅ Removed credentials for ${service}`));

        } catch (error) {
            this.logger?.error('Failed to remove credentials', error as Error, { service });
            console.error(chalk.red(`❌ Failed to remove credentials: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Handle auth clear command
     */
    private async handleClear(options: any): Promise<void> {
        try {
            this.logger?.debug('Clearing all credentials', { force: !!options.force });
            const services = await this.credentialManager.list();

            if (services.length === 0) {
                console.log(chalk.yellow('No credentials to clear'));
                return;
            }

            if (!options.force) {
                const { confirmed } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirmed',
                        message: `Are you sure you want to remove ALL ${services.length} credential(s)?`,
                        default: false
                    }
                ]);

                if (!confirmed) {
                    console.log(chalk.gray('Operation cancelled'));
                    return;
                }
            }

            await this.credentialManager.clear();

            this.logger?.info('All credentials cleared', { count: services.length });
            console.log(chalk.green(`✅ Cleared all credentials (${services.length} removed)`));

        } catch (error) {
            this.logger?.error('Failed to clear credentials', error as Error);
            console.error(chalk.red(`❌ Failed to clear credentials: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Handle provider management command
     */
    private async handleProvider(options: any): Promise<void> {
        try {
            this.logger?.debug('Managing providers', {
                list: !!options.list,
                switch: options.switch,
                info: !!options.info
            });
            if (options.list) {
                const providers = this.credentialManager.getAvailableProviders();

                if (options.json) {
                    console.log(JSON.stringify(providers, null, 2));
                    return;
                }

                console.log(chalk.blue('📦 Available Credential Providers'));
                console.log();

                for (const provider of providers) {
                    const status = provider.isActive ? chalk.green('● Active') :
                        !provider.isNative ? chalk.gray('○ Available') :
                            chalk.yellow('○ Available');

                    console.log(`  ${status} ${chalk.cyan(provider.name)}`);
                    console.log(`    ${chalk.gray(provider.description)}`);
                    console.log(`    ${chalk.gray(`Type: ${provider.type}, Secure: ${provider.isSecure}, Native: ${provider.isNative}`)}`);
                    console.log();
                }
                return;
            }

            if (options.switch) {
                await this.credentialManager.switchProvider(options.switch);
                this.logger?.info('Provider switched', { provider: options.switch });
                console.log(chalk.green(`✅ Switched to ${options.switch} provider`));
                return;
            }

            if (options.info) {
                const providerInfo = this.credentialManager.getProviderInfo();

                if (options.json) {
                    console.log(JSON.stringify(providerInfo, null, 2));
                    return;
                }

                console.log(chalk.blue('🔧 Current Provider Information'));
                console.log();
                console.log(`  Name: ${chalk.cyan(providerInfo.name)}`);
                console.log(`  Type: ${chalk.gray(providerInfo.type)}`);
                console.log(`  Secure: ${providerInfo.isSecure ? chalk.green('Yes') : chalk.red('No')}`);
                console.log(`  Native: ${providerInfo.isNative ? chalk.green('Yes') : chalk.yellow('No')}`);
                console.log(`  Description: ${chalk.gray(providerInfo.description)}`);
                return;
            }

            // Default: show current provider info
            const providerInfo = this.credentialManager.getProviderInfo();
            console.log(chalk.blue(`Current provider: ${providerInfo.name}`));

        } catch (error) {
            this.logger?.error('Provider operation failed', error as Error, { options });
            console.error(chalk.red(`❌ Provider operation failed: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Prompt user for credentials interactively
     */
    private async promptForCredentials(service: string): Promise<CredentialData> {
        console.log(chalk.blue(`Setting up credentials for ${service}`));
        console.log();

        const { credentialType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'credentialType',
                message: 'What type of credentials do you want to configure?',
                choices: [
                    { name: 'API Key', value: 'api-key' },
                    { name: 'OAuth Access Token', value: 'oauth' },
                    { name: 'Bearer Token', value: 'bearer' }
                ]
            }
        ]);

        const credentials: CredentialData = {};

        if (credentialType === 'api-key') {
            const { apiKey } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: 'Enter your API key:',
                    mask: '*'
                }
            ]);
            credentials.apiKey = apiKey;
        } else if (credentialType === 'oauth') {
            const { accessToken, refreshToken, expiresAt } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'accessToken',
                    message: 'Enter your access token:',
                    mask: '*'
                },
                {
                    type: 'password',
                    name: 'refreshToken',
                    message: 'Enter your refresh token (optional):',
                    mask: '*'
                },
                {
                    type: 'input',
                    name: 'expiresAt',
                    message: 'Token expiration date (YYYY-MM-DD or ISO string, optional):'
                }
            ]);

            credentials.accessToken = accessToken;
            if (refreshToken) {
credentials.refreshToken = refreshToken;
}
            if (expiresAt) {
                try {
                    credentials.expiresAt = new Date(expiresAt);
                } catch {
                    console.log(chalk.yellow('⚠️  Invalid date format, ignoring expiration'));
                }
            }
        } else if (credentialType === 'bearer') {
            const { accessToken } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'accessToken',
                    message: 'Enter your bearer token:',
                    mask: '*'
                }
            ]);
            credentials.accessToken = accessToken;
        }

        return credentials;
    }

    /**
     * Build credentials from command line options
     */
    private buildCredentialsFromOptions(options: any): CredentialData {
        const credentials: CredentialData = {};

        if (options.apiKey) {
            credentials.apiKey = options.apiKey;
        }

        if (options.accessToken) {
            credentials.accessToken = options.accessToken;
        }

        if (options.refreshToken) {
            credentials.refreshToken = options.refreshToken;
        }

        if (options.expiresAt) {
            try {
                credentials.expiresAt = new Date(options.expiresAt);
            } catch {
                throw new Error('Invalid expiration date format');
            }
        }

        return credentials;
    }

    /**
     * Get credential type for display
     */
    private getCredentialType(credentials: CredentialData): string {
        if (credentials.apiKey) {
return 'API Key';
}
        if (credentials.accessToken && credentials.refreshToken) {
return 'OAuth2';
}
        if (credentials.accessToken) {
return 'Bearer Token';
}
        return 'Unknown';
    }
} 