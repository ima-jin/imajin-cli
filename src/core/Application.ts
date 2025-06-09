/**
 * Application - Core application bootstrap and orchestration
 * 
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see         docs/architecture.md
 * 
 * Integration Points:
 * - Container for dependency injection
 * - ServiceProvider registration and bootstrapping
 * - Console command registration and execution
 * - Real-time event coordination
 */

import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import { Container } from '../container/Container.js';
import { Logger } from '../logging/Logger.js';
import { ServiceProvider } from '../providers/ServiceProvider.js';
import { ImajiNConfig, ImajiNConfigSchema } from '../types/Config.js';
import type { LLMResponse, ServiceIntrospection } from '../types/LLM.js';

export class Application {
  public static readonly VERSION = '0.1.0';
  public static readonly NAME = 'Imajin CLI';

  private container: Container;
  private program: Command;
  private logger: Logger;
  private config: ImajiNConfig;
  private providers: ServiceProvider[] = [];
  private isBooted: boolean = false;

  constructor(config?: Partial<ImajiNConfig>) {
    // Initialize container and core services
    this.container = new Container();
    this.program = new Command();
    this.config = ImajiNConfigSchema.parse(config || {});

    // Check if JSON output is requested to suppress logs
    const isJsonMode = process.argv.includes('--json');
    const logLevel = isJsonMode ? 'error' : this.config.logLevel;

    this.logger = new Logger(logLevel, this.config.colorOutput);

    // Register core services
    this.registerCoreServices();
    this.setupProgram();
  }

  private registerCoreServices(): void {
    // Register core services in container
    this.container.singleton('logger', () => this.logger);
    this.container.singleton('config', () => this.config);
    this.container.singleton('container', () => this.container);
  }

  private setupProgram(): void {
    this.program
      .name('imajin')
      .description('LLM-powered universal service interface')
      .version(Application.VERSION);

    // Add global options
    this.program
      .option('--debug', 'Enable debug mode')
      .option('--json', 'Output in JSON format')
      .option('--no-color', 'Disable colored output');

    // Add basic commands
    this.addBasicCommands();
  }

  private addBasicCommands(): void {
    // Version command with ASCII art
    this.program
      .command('banner')
      .description('Display application banner')
      .action(() => {
        console.log(chalk.cyan(figlet.textSync('IMAJIN CLI', { horizontalLayout: 'full' })));
        console.log(chalk.gray(`Version: ${Application.VERSION}`));
        console.log(chalk.gray('LLM-powered universal service interface\n'));
      });

    // Health check command
    this.program
      .command('diagnose')
      .description('Run system diagnostics')
      .action(() => {
        console.log(chalk.green('✅ Application initialized successfully'));
        console.log(chalk.blue('📦 Container ready'));
        console.log(chalk.yellow('⚠️  No services configured yet'));
        console.log(chalk.gray('\n💡 Run service provider setup to configure services'));
      });

    // List services command with LLM introspection
    this.program
      .command('list-services')
      .description('List available service connectors')
      .option('--json', 'Output in JSON format for LLM parsing')
      .option('--describe', 'Include detailed service descriptions')
      .action((options) => {
        this.handleListServices(options);
      });

    // Service introspection command for LLM discovery
    this.program
      .command('describe')
      .argument('<service>', 'Service name to describe')
      .option('--json', 'Output in JSON format')
      .option('--schema', 'Include command schemas')
      .description('Get detailed information about a service')
      .action((service: string, options) => {
        this.handleDescribeService(service, options);
      });
  }

  /**
   * Register a service provider
   */
  public registerProvider(provider: ServiceProvider): this {
    this.providers.push(provider);
    this.logger.info(`Registered service provider: ${provider.getName()}`);
    return this;
  }

  /**
   * Create and register a service provider
   */
  public createProvider<T extends ServiceProvider>(
    ProviderClass: new (container: Container, program: Command) => T
  ): T {
    const provider = new ProviderClass(this.container, this.program);
    this.registerProvider(provider);
    return provider;
  }

  /**
   * Boot all registered service providers
   */
  public async boot(): Promise<void> {
    if (this.isBooted) {
      return;
    }

    this.logger.info('Booting application...');

    // Registration phase
    for (const provider of this.providers) {
      this.logger.debug(`Registering provider: ${provider.getName()}`);
      await provider.register();
    }

    // Boot phase
    for (const provider of this.providers) {
      this.logger.debug(`Booting provider: ${provider.getName()}`);
      await provider.boot();
    }

    // Register commands from providers
    this.registerProviderCommands();

    this.isBooted = true;
    this.logger.info('Application booted successfully');
  }

  /**
   * Register commands from service providers
   */
  private registerProviderCommands(): void {
    for (const provider of this.providers) {
      if ('registerCommands' in provider && typeof provider.registerCommands === 'function') {
        provider.registerCommands(this.program);
        this.logger.debug(`Registered commands for provider: ${provider.getName()}`);
      }
    }
  }

  /**
 * Handle list services command
 */
  private handleListServices(options: any): void {
    const services = this.providers.map(provider => ({
      name: provider.getName(),
      version: provider.getVersion(),
      capabilities: provider.getServices(),
    }));

    // Check for JSON flag from both command options and global options
    const isJsonMode = options.json || this.program.opts().json;

    if (isJsonMode) {
      const response: LLMResponse = {
        success: true,
        data: {
          services,
          total: services.length,
        },
        timestamp: new Date(),
        service: 'core',
        command: 'list-services',
        executionTime: 0,
      };
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(chalk.blue('Available services:'));
      if (services.length === 0) {
        console.log(chalk.gray('  No services registered yet'));
        console.log(chalk.gray('\n💡 Services will be loaded via ServiceProvider system'));
      } else {
        services.forEach(service => {
          console.log(chalk.green(`  ✓ ${service.name} (v${service.version})`));
          if (options.describe && service.capabilities.length > 0) {
            service.capabilities.forEach(s => {
              console.log(chalk.gray(`    - ${s}`));
            });
          }
        });
      }
    }
  }

  /**
   * Handle describe service command
   */
  private handleDescribeService(serviceName: string, options: any): void {
    const provider = this.providers.find(p =>
      p.getName() === serviceName || p.provides(serviceName)
    );

    if (!provider) {
      const error = `Service '${serviceName}' not found`;
      const isJsonMode = options.json || this.program.opts().json;
      if (isJsonMode) {
        const response: LLMResponse = {
          success: false,
          error,
          timestamp: new Date(),
          service: 'core',
          command: 'describe',
          executionTime: 0,
        };
        console.log(JSON.stringify(response, null, 2));
      } else {
        console.log(chalk.red(error));
      }
      return;
    }

    // Get detailed introspection if available, otherwise use basic info
    let introspection: ServiceIntrospection;

    if ('getIntrospection' in provider && typeof provider.getIntrospection === 'function') {
      introspection = provider.getIntrospection();
    } else {
      introspection = {
        name: provider.getName(),
        description: `Service provider for ${provider.getName()}`,
        version: provider.getVersion(),
        commands: [], // Will be populated by service providers
        capabilities: provider.getServices(),
        realTimeSupported: true,
        authentication: {
          required: false, // Will be determined by service providers
        },
      };
    }

    const isJsonModeForResponse = options.json || this.program.opts().json;
    if (isJsonModeForResponse) {
      const response: LLMResponse = {
        success: true,
        data: introspection,
        timestamp: new Date(),
        service: 'core',
        command: 'describe',
        executionTime: 0,
      };
      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log(chalk.blue(`Service: ${introspection.name}`));
      console.log(chalk.gray(`Version: ${introspection.version}`));
      console.log(chalk.gray(`Description: ${introspection.description}`));
      console.log(chalk.gray(`Real-time Support: ${introspection.realTimeSupported ? 'Yes' : 'No'}`));
      if (introspection.capabilities.length > 0) {
        console.log(chalk.gray('Capabilities:'));
        introspection.capabilities.forEach(cap => {
          console.log(chalk.gray(`  - ${cap}`));
        });
      }
      if (introspection.authentication?.required) {
        console.log(chalk.yellow(`Authentication: Required (${introspection.authentication.type || 'unknown'})`));
        if (introspection.authentication.instructions) {
          console.log(chalk.gray(`  ${introspection.authentication.instructions}`));
        }
      }
    }
  }

  public async run(): Promise<void> {
    try {
      await this.program.parseAsync(process.argv);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  }
} 