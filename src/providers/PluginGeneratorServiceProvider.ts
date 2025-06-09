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
import type { Container } from '../container/Container.js';
import { PluginManager } from '../core/PluginManager.js';
import { DefaultOpenAPIParser } from '../generators/OpenAPIParser.js';
import { DefaultPluginGenerator } from '../generators/PluginGenerator.js';
import { TemplateEngine } from '../generators/templates/TemplateEngine.js';
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
        this.container.singleton('pluginManager', () => {
            const logger = this.container.resolve<Logger>('logger');
            const commandManager = this.container.resolve('commandManager') as any;
            return new PluginManager(commandManager, this.container, logger);
        });
    }

    /**
     * Bootstrap services after all providers have been registered
     */
    public async boot(): Promise<void> {
        // Register commands
        this.registerCommands();
    }

    /**
     * Register commands with the CLI program
     */
    private registerCommands(): void {
        const logger = this.container.resolve<Logger>('logger');

        // Generate plugin command with dependency injection
        const _generateCommand = this.program
            .command('generate:plugin')
            .description('Generate a plugin from an OpenAPI specification')
            .argument('<spec>', 'Path to OpenAPI specification file')
            .option('--dry-run', 'Show what would be generated without creating files')
            .option('--output <dir>', 'Output directory for generated plugin')
            .action(async (spec: string, options: any) => {
                const generator = this.container.resolve('pluginGenerator') as DefaultPluginGenerator;
                const credentialManager = this.container.resolve('credentialManager') as any;
                const command = new GeneratePluginCommand(generator, credentialManager, logger);
                const result = await command.execute([spec], options);

                if (!result.success) {
                    process.exit(1);
                }
            });

        // List plugins command
        const _listCommand = this.program
            .command('plugin:list')
            .description('List all loaded plugins')
            .option('--json', 'Output in JSON format')
            .action(async (options: any) => {
                const pluginManager = this.container.resolve<PluginManager>('pluginManager');
                const plugins = pluginManager.getLoadedPlugins();

                if (options.json) {
                    console.log(JSON.stringify(plugins, null, 2));
                } else {
                    console.log('Loaded plugins:');
                    if (plugins.length === 0) {
                        console.log('  No plugins loaded');
                    } else {
                        plugins.forEach(plugin => {
                            console.log(`  - ${plugin.name} v${plugin.version}: ${plugin.description}`);
                            console.log(`    Commands: ${plugin.commands.length}`);
                        });
                    }
                }
            });

        // Load plugins command
        const _loadCommand = this.program
            .command('plugin:load')
            .description('Load all plugins from the plugins directory')
            .action(async () => {
                const pluginManager = this.container.resolve<PluginManager>('pluginManager');
                await pluginManager.loadAllPlugins();
                console.log('Plugins loaded successfully');
            });

        logger.info('Registered plugin generator commands');
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