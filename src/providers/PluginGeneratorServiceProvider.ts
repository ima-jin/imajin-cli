/**
 * PluginGeneratorServiceProvider - Enhanced service provider for plugin generation functionality
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Plugin Generator Engine registration with proper dependencies
 * - Template Engine registration
 * - OpenAPI Parser registration
 * - Generate plugin commands with dependency injection
 * - Plugin management commands
 */

import type { Command } from 'commander';
import { GeneratePluginCommand } from '../commands/GeneratePluginCommand.js';
import { PluginGenerateCommand } from '../commands/plugin/PluginGenerateCommand.js';
import { PluginShowCommand } from '../commands/plugin/PluginShowCommand.js';
import { PluginCommitCommand } from '../commands/plugin/PluginCommitCommand.js';
import type { Container } from '../container/Container.js';
import type { CommandManager } from '../core/commands/CommandManager.js';
import { PluginManager } from '../core/PluginManager.js';
import { SelfExtensionManager } from '../core/SelfExtensionManager.js';
import { CodeGenerationAgent } from '../core/CodeGenerationAgent.js';
import { DefaultOpenAPIParser } from '../generators/OpenAPIParser.js';
import { DefaultPluginGenerator } from '../generators/PluginGenerator.js';
import { TemplateEngine } from '../generators/templates/TemplateEngine.js';
import type { PluginGenerator } from '../generators/types.js';
import type { Logger } from '../logging/Logger.js';
import { ServiceProvider } from './ServiceProvider.js';

export class PluginGeneratorServiceProvider extends ServiceProvider {
    constructor(container: Container, program: Command) {
        super(container, program);
    }

    /**
     * Register services with the container with proper dependencies
     */
    public async register(): Promise<void> {
        // Register template engine
        this.container.singleton('templateEngine', () => new TemplateEngine());

        // Register OpenAPI parser
        this.container.singleton('openApiParser', () => new DefaultOpenAPIParser());

        // Register plugin generator with proper dependencies
        this.container.singleton('pluginGenerator', () => {
            const parser = this.container.resolve<DefaultOpenAPIParser>('openApiParser');
            const templateEngine = this.container.resolve<TemplateEngine>('templateEngine');
            return new DefaultPluginGenerator(parser, templateEngine);
        });

        // Register plugin manager
        this.container.singleton('pluginManager', async () => {
            const logger = this.container.resolve<Logger>('logger');
            const commandManager = await this.container.resolve<CommandManager>('commandManager');
            return new PluginManager(commandManager, this.container, logger);
        });

        // Register code generation agent
        this.container.singleton('codeGenerationAgent', () => {
            const logger = this.container.resolve<Logger>('logger');
            return new CodeGenerationAgent(logger, process.env.ANTHROPIC_API_KEY);
        });

        // Register self-extension manager
        this.container.singleton('selfExtensionManager', async () => {
            const pluginManager = await this.container.resolve<PluginManager>('pluginManager');
            const credentialManager = this.container.resolve<any>('credentialManager');
            const logger = this.container.resolve<Logger>('logger');
            return new SelfExtensionManager(pluginManager, credentialManager, logger);
        });
    }

    /**
     * Bootstrap services after all providers have been registered
     */
    public async boot(): Promise<void> {
        // Auto-load all plugins on boot
        const pluginManager = await this.container.resolve<PluginManager>('pluginManager');
        await pluginManager.loadAllPlugins();
    }

    /**
     * Register commands with the CLI program
     */
    public registerCommands(): void {
        const logger = this.container.resolve<Logger>('logger');

        // Create parent 'plugin' command once
        let pluginCommand = this.program.commands.find(cmd => cmd.name() === 'plugin');
        if (!pluginCommand) {
            pluginCommand = this.program.command('plugin').description('Plugin management commands');
        }

        // Check if command already exists to prevent duplicates
        const existingCommand = this.program.commands.find(cmd => cmd.name() === 'generate:plugin');
        if (!existingCommand) {
            // Generate plugin command with dependency injection
            this.program
                .command('generate:plugin')
                .description('Generate a plugin from an OpenAPI specification')
                .argument('<spec>', 'Path to OpenAPI specification file')
                .option('--dry-run', 'Show what would be generated without creating files')
                .option('--output <dir>', 'Output directory for generated plugin')
                .action(async (spec: string, options: any) => {
                    const generator = this.container.resolve<PluginGenerator>('pluginGenerator');
                    const credentialManager = this.container.resolve<any>('credentialManager');
                    const command = new GeneratePluginCommand(generator, credentialManager, logger);
                    const result = await command.execute([spec], options);

                    if (!result.success) {
                        process.exit(1);
                    }
                });
        }

        // List plugins command
        if (!pluginCommand.commands.some(cmd => cmd.name() === 'list')) {
            pluginCommand
                .command('list')
                .description('List all loaded plugins')
                .option('--json', 'Output in JSON format')
                .action(async (options: any) => {
                    const pluginManager = await this.container.resolve<PluginManager>('pluginManager');
                    const plugins = pluginManager.getLoadedPlugins();

                    if (options.json) {
                        // CLI Output: User-facing JSON response (console is the UI)
                        // eslint-disable-next-line no-console
                        console.log(JSON.stringify(plugins, null, 2));
                    } else {
                        // CLI Output: User-facing formatted display (console is the UI)
                        // eslint-disable-next-line no-console
                        console.log('Loaded plugins:');
                        if (plugins.length === 0) {
                            // eslint-disable-next-line no-console
                            console.log('  No plugins loaded');
                        } else {
                            for (const plugin of plugins) {
                                // eslint-disable-next-line no-console
                                console.log(`  - ${plugin.name} v${plugin.version}: ${plugin.description}`);
                                // eslint-disable-next-line no-console
                                console.log(`    Commands: ${plugin.commands.length}`);
                            }
                        }
                    }
                });
        }

        // Load plugins command
        if (!pluginCommand.commands.some(cmd => cmd.name() === 'load')) {
            pluginCommand
                .command('load')
                .description('Load all plugins from the plugins directory')
                .action(async () => {
                    const pluginManager = await this.container.resolve<PluginManager>('pluginManager');
                    await pluginManager.loadAllPlugins();
                    // CLI Output: User-facing success message (console is the UI)
                    // eslint-disable-next-line no-console
                    console.log('Plugins loaded successfully');
                });
        }

        // Self-extension commands
        // Generate plugin on-demand
        if (!pluginCommand.commands.some(cmd => cmd.name() === 'generate')) {
            pluginCommand
                .command('generate')
                .description('Generate a new plugin for a service using AI')
                .option('--service <name>', 'Service name to generate plugin for')
                .option('--name <name>', 'Alias for --service')
                .option('--command <command>', 'Specific command to generate')
                .option('--spec <spec>', 'API specification (JSON)')
                .action(async (options: any) => {
                    const selfExtensionManager = await this.container.resolve<SelfExtensionManager>('selfExtensionManager');
                    const command = new PluginGenerateCommand(selfExtensionManager, logger);
                    const result = await command.execute([], options);

                    if (!result.success) {
                        process.exit(1);
                    }
                });
        }

        // Show plugin source code
        if (!pluginCommand.commands.some(cmd => cmd.name() === 'show')) {
            pluginCommand
                .command('show')
                .description('Display plugin source code')
                .option('--name <name>', 'Plugin name')
                .option('--plugin <name>', 'Alias for --name')
                .option('--file <file>', 'Specific file to show')
                .action(async (options: any) => {
                    const pluginManager = await this.container.resolve<PluginManager>('pluginManager');
                    const command = new PluginShowCommand(pluginManager, logger);
                    const result = await command.execute([], options);

                    if (!result.success) {
                        process.exit(1);
                    }
                });
        }

        // Commit plugin to git
        if (!pluginCommand.commands.some(cmd => cmd.name() === 'commit')) {
            pluginCommand
                .command('commit')
                .description('Commit a generated plugin to git')
                .option('--name <name>', 'Plugin name')
                .option('--plugin <name>', 'Alias for --name')
                .option('--message <message>', 'Commit message')
                .option('-m <message>', 'Alias for --message')
                .action(async (options: any) => {
                    const pluginManager = await this.container.resolve<PluginManager>('pluginManager');
                    const command = new PluginCommitCommand(pluginManager, logger);
                    const result = await command.execute([], options);

                    if (!result.success) {
                        process.exit(1);
                    }
                });
        }

        logger.info('Registered plugin generator and self-extension commands');
    }

    /**
     * Get the service provider name
     */
    public getName(): string {
        return 'PluginGeneratorServiceProvider';
    }

    /**
     * Get service provider version
     */
    public getVersion(): string {
        return '0.1.0';
    }

    /**
     * Check if this provider provides a specific service
     */
    public provides(service: string): boolean {
        return ['plugin-generator', 'plugin-manager'].includes(service);
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return [
            'plugin-generator',
            'plugin-manager',
            'openapi-parser'
        ];
    }
} 