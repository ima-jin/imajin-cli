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

import fs from 'node:fs';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { CLI_OPTIONS, CLI_DESCRIPTIONS } from '../../constants/CommonStrings.js';
import { CredentialManager } from '../../core/credentials/CredentialManager.js';
import type { CredentialData } from '../../core/credentials/interfaces.js';
import { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from '../../services/imajin-ai/ImajinAiSessionService.js';
import type { LoginFinalizeOptions } from '../../services/imajin-ai/ImajinAiSessionService.js';
import { hexToBytes, signMessage } from '../../crypto/vault-crypto.js';
import { CommonOptions } from '../../utils/commonOptions.js';

/**
 * Shape of an exported Imajin identity JSON file (e.g. `~/.imajin/identity.json`).
 * The Ed25519 private key/seed may be stored under either `privateKey` or `seed`;
 * `did`/`publicKey` are optional and only used for informational output.
 */
interface ImajinIdentityKeyFile {
    privateKey?: string;
    seed?: string;
    did?: string;
    publicKey?: string;
}

export class AuthCommands {
    private readonly credentialManager: CredentialManager;
    private readonly logger: Logger;
    private readonly imajinAiSessionService: ImajinAiSessionService;

    constructor(credentialManager: CredentialManager, logger: Logger, imajinAiSessionService?: ImajinAiSessionService) {
        this.credentialManager = credentialManager;
        this.logger = logger;
        this.imajinAiSessionService = imajinAiSessionService ?? new ImajinAiSessionService(credentialManager, logger);
    }

    private async handleImajinAiStatus(options: any): Promise<void> {
        try {
            const local = await this.imajinAiSessionService.getSessionStatusSummary();
            let remote: any = null;
            if (options.remote) {
                remote = await this.imajinAiSessionService.fetchSession({
                    includeGrants: !!options.includeGrants,
                    includeGas: !!options.includeGas
                });
            }

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: {
                        local,
                        remote
                    }
                }, null, 2));
                return;
            }

            console.log(chalk.blue('imajin-ai session status'));
            console.log(chalk.gray(`  Base URL configured: ${local.baseUrlConfigured ? 'yes' : 'no'}`));
            console.log(chalk.gray(`  Session configured: ${local.configured ? 'yes' : 'no'}`));
            console.log(chalk.gray(`  Session cookie: ${local.hasSessionCookie ? 'present' : 'missing'}`));
            console.log(chalk.gray(`  Access token: ${local.hasAccessToken ? 'present' : 'missing'}`));
            console.log(chalk.gray(`  Refresh token: ${local.hasRefreshToken ? 'present' : 'missing'}`));
            if (local.expiresAt) {
                console.log(chalk.gray(`  Expires at: ${local.expiresAt}`));
                if (local.isExpired !== null) {
                    const expiredLabel = local.isExpired ? chalk.red('yes') : chalk.green('no');
                    console.log(chalk.gray(`  Expired: ${expiredLabel}`));
                }
            }
            if (local.scopes.length > 0) {
                console.log(chalk.gray(`  Scopes: ${local.scopes.join(', ')}`));
            }

            if (remote) {
                console.log();
                console.log(chalk.green('✅ Remote session fetched from /api/session'));
            }
        } catch (error) {
            this.logger?.error('Failed to get imajin-ai session status', error as Error, { options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    error: String(error)
                }, null, 2));
                return;
            }
            console.error(chalk.red(`❌ Failed to get imajin-ai status: ${error}`));
            process.exit(1);
        }
    }

    private async handleImajinAiChallenge(handle: string, options: any): Promise<void> {
        try {
            const challenge = await this.imajinAiSessionService.createLoginChallenge(handle);
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: challenge
                }, null, 2));
                return;
            }

            console.log(chalk.green('✅ Login challenge created'));
            console.log(chalk.gray(`  Handle: ${handle}`));
            console.log(chalk.gray('  Next: run `imajin auth imajin-ai login --challenge-id <id> --signature <hex>`'));
            console.log(chalk.gray('  Or:   run `imajin auth imajin-ai login --handle <handle> --key-file <path>` to sign automatically'));
        } catch (error) {
            this.logger?.error('Failed to create imajin-ai login challenge', error as Error, { handle });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    error: String(error)
                }, null, 2));
                return;
            }
            console.error(chalk.red(`❌ Failed to request challenge: ${error}`));
            process.exit(1);
        }
    }

    private async handleImajinAiLogout(options: any): Promise<void> {
        try {
            const current = await this.imajinAiSessionService.getStoredSession();
            if (!current) {
                if (options.json) {
                    console.log(JSON.stringify({
                        success: true,
                        data: {
                            cleared: false,
                            message: 'No stored imajin-ai session found'
                        }
                    }, null, 2));
                    return;
                }
                console.log(chalk.yellow('No stored imajin-ai session found'));
                return;
            }

            await this.imajinAiSessionService.clearStoredSession();
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: {
                        cleared: true
                    }
                }, null, 2));
                return;
            }
            console.log(chalk.green('✅ Cleared imajin-ai session credentials'));
        } catch (error) {
            this.logger?.error('Failed to clear imajin-ai session', error as Error);
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    error: String(error)
                }, null, 2));
                return;
            }
            console.error(chalk.red(`❌ Failed to logout: ${error}`));
            process.exit(1);
        }
    }

    private async handleImajinAiLogin(options: any): Promise<void> {
        try {
            let challengeId = options.challengeId as string | undefined;
            let handle = options.handle as string | undefined;
            let signature = options.signature as string | undefined;
            const keyFile = options.keyFile as string | undefined;

            let challengeResponse: any = null;
            if (!challengeId) {
                if (!handle && options.prompt !== false) {
                    const prompt = await inquirer.prompt([
                        {
                            type: 'input',
                            name: 'handle',
                            message: 'Identity handle:'
                        }
                    ]);
                    handle = prompt.handle;
                }

                if (!handle) {
                    throw new Error('Either --challenge-id or --handle is required');
                }
                challengeResponse = await this.imajinAiSessionService.createLoginChallenge(handle);
                challengeId = challengeResponse?.challengeId;
                if (!challengeId) {
                    throw new Error('Challenge response did not include challengeId');
                }
                if (challengeResponse?.challenge && !options.json) {
                    console.log(chalk.gray(`Challenge: ${challengeResponse.challenge}`));
                }
            }

            if (!signature && keyFile) {
                const challengeString = challengeResponse?.challenge as string | undefined;
                if (!challengeString) {
                    throw new Error(
                        '--key-file signs the raw challenge text, which is only available when the CLI requests a fresh ' +
                        'challenge. Pass --handle (instead of --challenge-id) so `login` can request and sign a new ' +
                        'challenge in one step.'
                    );
                }
                const privateKeyHex = this.loadPrivateKeyFromKeyFile(keyFile);
                signature = signMessage(challengeString, privateKeyHex);
                if (!options.json) {
                    console.log(chalk.gray('  Signed challenge automatically using --key-file'));
                }
            }

            if (!signature && options.prompt !== false) {
                const prompt = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'signature',
                        message: 'Challenge signature (hex):'
                    }
                ]);
                signature = prompt.signature;
            }

            if (!signature) {
                throw new Error('Signature is required. Pass --signature or run interactive mode.');
            }

            const dfosChain = this.parseDfosChainOption(options.dfosChain);
            const finalizeOptions: LoginFinalizeOptions = {
                challengeId,
                signature
            };
            if (dfosChain) {
                finalizeOptions.dfosChain = dfosChain;
            }
            const result = await this.imajinAiSessionService.finalizeLogin(finalizeOptions);

            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    data: {
                        challenge: challengeResponse,
                        session: result
                    }
                }, null, 2));
                return;
            }

            console.log(chalk.green('✅ imajin-ai login verified and session stored'));
            if (result.identity?.did) {
                console.log(chalk.gray(`  DID: ${result.identity.did}`));
            }
            if (result.identity?.handle) {
                console.log(chalk.gray(`  Handle: ${result.identity.handle}`));
            }
        } catch (error) {
            this.logger?.error('imajin-ai login failed', error as Error, { options });
            if (options.json) {
                console.log(JSON.stringify({
                    success: false,
                    error: String(error)
                }, null, 2));
                return;
            }
            console.error(chalk.red(`❌ Login failed: ${error}`));
            process.exit(1);
        }
    }

    /**
     * Read a private key/seed hex value from an exported Imajin identity JSON
     * file (`--key-file`). Supports `privateKey` or `seed` as the field name.
     * Never logs or includes the key material in thrown errors.
     */
    private loadPrivateKeyFromKeyFile(keyFilePath: string): string {
        let raw: string;
        try {
            raw = fs.readFileSync(keyFilePath, 'utf8');
        } catch (error) {
            throw new Error(`Unable to read --key-file at ${keyFilePath}: ${error instanceof Error ? error.message : String(error)}`);
        }

        let parsed: ImajinIdentityKeyFile;
        try {
            parsed = JSON.parse(raw) as ImajinIdentityKeyFile;
        } catch {
            throw new Error(`--key-file at ${keyFilePath} is not valid JSON`);
        }

        const privateKeyHex = parsed.privateKey ?? parsed.seed;
        if (!privateKeyHex || typeof privateKeyHex !== 'string') {
            throw new Error(
                `--key-file must contain a hex-encoded Ed25519 private key/seed under "privateKey" or "seed" (file: ${keyFilePath})`
            );
        }

        try {
            const bytes = hexToBytes(privateKeyHex);
            if (bytes.length !== 32) {
                throw new Error(`Ed25519 private key must be 32 bytes, got ${bytes.length}`);
            }
        } catch (error) {
            throw new Error(`--key-file contains an invalid Ed25519 private key: ${error instanceof Error ? error.message : String(error)}`);
        }

        return privateKeyHex;
    }

    private parseDfosChainOption(value: unknown): string[] | undefined {
        if (!value) {
            return undefined;
        }

        if (Array.isArray(value)) {
            return value.map(v => String(v));
        }

        const raw = String(value).trim();
        if (!raw) {
            return undefined;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                throw new Error('dfos-chain must be a JSON array');
            }
            return parsed.map(v => String(v));
        } catch (error) {
            throw new Error(`Invalid --dfos-chain value: ${error}`);
        }
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
            .argument('<service>', 'Service name (e.g., github, notion)')
            .option('--api-key <key>', 'API key for the service')
            .option('--access-token <token>', 'Access token for OAuth')
            .option('--refresh-token <token>', 'Refresh token for OAuth')
            .option('--expires-at <date>', 'Token expiration date')
            .option('--interactive', 'Interactive credential input')
            .option('--provider <type>', 'Force specific provider (keychain, credential-manager, libsecret, environment, encrypted-file)')
            .description('Setup credentials for a service')
            .action(this.handleSetup.bind(this));

        const imajinAiCommand = authCommand
            .command('imajin-ai')
            .description('Manage imajin-ai login/session lifecycle');

        imajinAiCommand
            .command('status')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .option('--remote', 'Fetch remote session from imajin-ai backend')
            .option('--include-grants', 'Include grants in remote session response')
            .option('--include-gas', 'Include gas details in remote session response')
            .description('Show local and optional remote imajin-ai session status')
            .action(this.handleImajinAiStatus.bind(this));

        imajinAiCommand
            .command('challenge')
            .argument('<handle>', 'Identity handle used to request login challenge')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .description('Request imajin-ai login challenge for a handle')
            .action(this.handleImajinAiChallenge.bind(this));

        imajinAiCommand
            .command('logout')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .description('Clear stored imajin-ai session credentials')
            .action(this.handleImajinAiLogout.bind(this));

        imajinAiCommand
            .command('login')
            .option('--handle <handle>', 'Identity handle used to request challenge when challenge-id is not provided')
            .option('--challenge-id <id>', 'Existing challenge ID to verify')
            .option('--signature <hex>', 'Challenge signature (hex)')
            .option('--key-file <path>', 'Path to exported Imajin identity JSON (privateKey/seed hex) used to sign the challenge automatically; never printed or logged')
            .option('--dfos-chain <json>', 'Optional DFOS chain as JSON array string')
            .option('--no-prompt', 'Disable interactive prompts')
            .option(CLI_OPTIONS.JSON, CLI_DESCRIPTIONS.JSON_OUTPUT)
            .description('Run imajin-ai login challenge + verify flow and store session')
            .action(this.handleImajinAiLogin.bind(this));

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
                    let status: string;
                    if (provider.isActive) {
                        status = chalk.green('● Active');
                    } else if (provider.isNative) {
                        status = chalk.yellow('○ Available');
                    } else {
                        status = chalk.gray('○ Available');
                    }

                    console.log(`  ${status} ${chalk.cyan(provider.name)}`);
                    console.log(`    ${chalk.gray(provider.description)}`);
                    const providerDetails = `Type: ${provider.type}, Secure: ${provider.isSecure}, Native: ${provider.isNative}`;
                    console.log(`    ${chalk.gray(providerDetails)}`);
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