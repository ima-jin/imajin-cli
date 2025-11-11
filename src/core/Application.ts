/**
 * Application - Core application bootstrap and orchestration
 * 
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-06
 * @updated      2025-07-03
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
import { EventEmitter } from 'node:events';
import figlet from 'figlet';
import inquirer from 'inquirer';
import { Container } from '../container/Container.js';
import { ExceptionUtils } from '../exceptions/index.js';
import { Logger } from '../logging/Logger.js';
import { ServiceProvider } from '../providers/ServiceProvider.js';
import { ImajinConfig, ImajinConfigSchema } from '../types/Config.js';
import type { LLMResponse, ServiceIntrospection } from '../types/LLM.js';
import { ErrorHandler } from './ErrorHandler.js';
import { ErrorRecovery } from './ErrorRecovery.js';
import { BusinessContextValidator } from '../middleware/BusinessContextValidator.js';
import { RecipeManager } from '../context/RecipeManager.js';

export class Application {
  public static readonly VERSION = '0.1.0';
  public static readonly NAME = 'Imajin CLI';

  private readonly container: Container;
  private readonly program: Command;
  private readonly logger: Logger;
  private readonly config: ImajinConfig;
  private providers: ServiceProvider[] = [];
  private isBooted: boolean = false;
  private commandsRegistered: boolean = false;
  private readonly errorHandler: ErrorHandler;
  private readonly errorRecovery: ErrorRecovery;
  private readonly businessValidator: BusinessContextValidator;

  constructor(config?: Partial<ImajinConfig>) {
    // Initialize container and core services
    this.container = new Container();
    this.program = new Command();
    this.config = ImajinConfigSchema.parse(config || {});

    // Check if JSON output is requested to suppress logs
    const isJsonMode = process.argv.includes('--json');
    const logLevel = isJsonMode ? 'error' : this.config.logLevel;

    this.logger = new Logger({ 
      level: logLevel as any, 
      enableColors: this.config.colorOutput 
    });

    // Initialize error handling system
    this.errorHandler = new ErrorHandler({
      enableConsoleOutput: !isJsonMode,
      enableLogging: true,
      enableEventEmission: true,
      exitOnCritical: true,
      jsonOutput: isJsonMode,
      verbose: process.argv.includes('--debug')
    });

    this.errorRecovery = new ErrorRecovery();
    this.businessValidator = new BusinessContextValidator();

    // Set up global error handling
    this.setupGlobalErrorHandling();

    // Register core services
    this.registerCoreServices();
    this.setupProgram();
  }

  /**
   * Set up global error handling for unhandled errors
   */
  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      void (async () => {
        const error = ExceptionUtils.normalize(reason, {
          source: 'unhandledRejection',
          promise
        });

        this.logger.error('Unhandled promise rejection', error, { promise });
        await this.errorHandler.handleError(error);
      })().catch(err => {
        this.logger.error('Failed to handle unhandled rejection', err instanceof Error ? err : new Error(String(err)));
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      void (async () => {
        const normalizedError = ExceptionUtils.normalize(error, {
          source: 'uncaughtException'
        });

        this.logger.error('Uncaught exception', normalizedError);
        await this.errorHandler.handleError(normalizedError);
      })().catch(err => {
        this.logger.error('Failed to handle uncaught exception', err instanceof Error ? err : new Error(String(err)));
      });
    });

    // Handle SIGINT (Ctrl+C) gracefully
    process.on('SIGINT', () => {
      console.log('\n👋 Gracefully shutting down...');
      process.exit(0);
    });
  }

  private registerCoreServices(): void {
    // Register core services in container
    this.container.singleton('logger', () => this.logger);
    this.container.singleton('config', () => this.config);
    this.container.singleton('container', () => this.container);
    this.container.singleton('errorHandler', () => this.errorHandler);
    this.container.singleton('errorRecovery', () => this.errorRecovery);
    this.container.singleton('businessValidator', () => this.businessValidator);
    this.container.singleton('eventEmitter', () => new EventEmitter());
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

    // Set global app reference so commands can access the container
    (globalThis as any).imajinApp = this;

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
    
    // Register business context and recipe commands
    this.registerBusinessContextCommands();

    // Register general CLI commands (like markdown)
    await this.registerGeneralCommands();

    this.isBooted = true;
    this.logger.info('Application booted successfully');
  }

  /**
   * Register commands from service providers
   */
  private registerProviderCommands(): void {
    if (this.commandsRegistered) {
      return;
    }
    
    for (const provider of this.providers) {
      if ('registerCommands' in provider && typeof provider.registerCommands === 'function') {
        try {
          provider.registerCommands(this.program);
          this.logger.debug(`Registered commands for provider: ${provider.getName()}`);
        } catch (error) {
          this.logger.warn(`Failed to register commands for provider ${provider.getName()}:`, { error: String(error) });
        }
      }
    }
    
    this.commandsRegistered = true;
  }
  
  /**
   * Register business context and recipe commands
   */
  private registerBusinessContextCommands(): void {
    // Import and register business context commands
    import('../commands/generated/BusinessContextCommands.js').then(({ createBusinessContextCommands }) => {
      this.program.addCommand(createBusinessContextCommands());
      this.logger.debug('Registered business context commands');
    }).catch(err => {
      this.logger.warn('Failed to load business context commands:', err);
    });
    
    // Import and register recipe commands
    import('../commands/generated/RecipeCommands.js').then(({ createRecipeCommands }) => {
      this.program.addCommand(createRecipeCommands());
      this.logger.debug('Registered recipe commands');
    }).catch(err => {
      this.logger.warn('Failed to load recipe commands:', err);
    });
  }

  /**
   * Register general CLI commands (like markdown, etc.)
   */
  private async registerGeneralCommands(): Promise<void> {
    try {
      const { registerCommands } = await import('../commands/index.js');
      registerCommands(this.program);
      this.logger.debug('Registered general CLI commands');
    } catch (error) {
      this.logger.warn('Failed to register general commands:', { error: String(error) });
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
        for (const service of services) {
          console.log(chalk.green(`  ✓ ${service.name} (v${service.version})`));
          if (options.describe && service.capabilities.length > 0) {
            for (const s of service.capabilities) {
              console.log(chalk.gray(`    - ${s}`));
            }
          }
        }
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
        for (const cap of introspection.capabilities) {
          console.log(chalk.gray(`  - ${cap}`));
        }
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
      // If no arguments provided (just 'node dist/index.js'), start interactive mode
      if (process.argv.length <= 2) {
        await this.startInteractiveMode();
      } else {
        // Validate business context before command execution
        const commandString = process.argv.slice(2).join(' ');
        const isValidContext = await this.businessValidator.validateBusinessContext(commandString);

        if (!isValidContext) {
          process.exit(1);
        }

        await this.program.parseAsync(process.argv);

        // Force exit after command completion for non-interactive commands
        // This ensures the process doesn't hang on open handles from services
        process.exit(0);
      }
    } catch (error) {
      this.logger.error('Application run failed', error instanceof Error ? error : new Error(String(error)));
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  }

  /**
   * Start interactive mode with command selection
   */
  private async startInteractiveMode(): Promise<void> {
    // Show banner first
    console.log(chalk.cyan(figlet.textSync('IMAJIN CLI', { horizontalLayout: 'full' })));
    console.log(chalk.gray(`Version: ${Application.VERSION}`));
    console.log(chalk.gray('LLM-powered universal service interface\n'));

    while (true) {
      try {
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: '🔍 List available services', value: 'list-services' },
              { name: '📋 Describe a service', value: 'describe' },
              { name: '📚 Browse available recipes', value: 'browse-recipes' },
              { name: '📄 Browse recipe details', value: 'browse-recipe-details' },
              { name: '🩺 Run system diagnostics', value: 'diagnose' },
              { name: '❓ Show help', value: 'help' },
              { name: '🚪 Exit', value: 'exit' }
            ]
          }
        ]);

        if (action === 'exit') {
          console.log(chalk.green('👋 Goodbye!'));
          process.exit(0);
        }

        if (action === 'help') {
          this.program.help();
          continue;
        }

        if (action === 'describe') {
          await this.handleDescribeServiceInteractive();
        } else if (action === 'list-services') {
          this.handleListServices({});
        } else if (action === 'browse-recipes') {
          await this.handleBrowseRecipes();
        } else if (action === 'browse-recipe-details') {
          await this.handleBrowseRecipeDetails();
        } else if (action === 'diagnose') {
          console.log(chalk.green('✅ Application initialized successfully'));
          console.log(chalk.blue('📦 Container ready'));
          console.log(chalk.yellow(`⚙️  ${this.providers.length} service provider(s) loaded`));
          console.log(chalk.gray('\n💡 All systems operational'));
        }

        // Add a separator for readability
        console.log('\n' + chalk.gray('─'.repeat(50)) + '\n');

      } catch (error) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
          // User pressed Ctrl+C
          console.log(chalk.green('\n👋 Goodbye!'));
          break;
        }
        this.logger.error('Interactive mode error', error instanceof Error ? error : new Error(String(error)));
        console.error(chalk.red('Error:'), error);
      }
    }
  }

  /**
   * Handle interactive service description
   */
  private async handleDescribeServiceInteractive(): Promise<void> {
    try {
      const services = this.providers.map(provider => ({
        name: provider.getName(),
        version: provider.getVersion(),
        capabilities: provider.getServices(),
      }));

      if (services.length === 0) {
        console.log(chalk.yellow('⚠️  No services available'));
        return;
      }

      const choices = services.map(service => ({
        name: `${service.name} (v${service.version}) - ${service.capabilities.length} capabilities`,
        value: service.name
      }));

      const { selectedService } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedService',
          message: '📋 Select a service to describe:',
          choices,
          pageSize: 10
        }
      ]);

      this.handleDescribeService(selectedService, {});

    } catch (error) {
      this.logger.error('Failed to show services', error instanceof Error ? error : new Error(String(error)));
      console.error(chalk.red('❌ Failed to show services:'), error);
    }
  }

  /**
   * Handle interactive recipe browsing
   */
  private async handleBrowseRecipes(): Promise<void> {
    try {
      const recipeManager = new RecipeManager();
      const recipes = await recipeManager.listRecipes();
      
      if (recipes.length === 0) {
        console.log(chalk.yellow('⚠️  No recipes available'));
        return;
      }

      console.log(chalk.blue('📚 Available Business Recipe Templates:\n'));
      
      for (const recipe of recipes) {
        console.log(chalk.cyan(`  • ${chalk.bold(recipe.businessType)}`));
        console.log(chalk.gray(`    ${recipe.name} - ${recipe.description}`));
        console.log(chalk.gray(`    Entities: ${Object.keys(recipe.entities).join(', ')}\n`));
      }
      
      console.log(chalk.yellow('💡 Usage:'));
      console.log(chalk.gray('   imajin context recipe --type <businessType>'));
      console.log(chalk.gray('   imajin context recipe --type community-platform'));

    } catch (error) {
      this.logger.error('Failed to list recipes', error instanceof Error ? error : new Error(String(error)));
      console.error(chalk.red('❌ Failed to list recipes:'), error);
    }
  }

  /**
   * Handle interactive recipe details browsing
   */
  private async handleBrowseRecipeDetails(): Promise<void> {
    try {
      const recipeManager = new RecipeManager();
      const recipes = await recipeManager.listRecipes();
      
      if (recipes.length === 0) {
        console.log(chalk.yellow('⚠️  No recipes available'));
        return;
      }

      const choices = recipes.map(recipe => ({
        name: `${recipe.businessType} - ${recipe.name} (${Object.keys(recipe.entities).length} entities)`,
        value: recipe.businessType
      }));

      const { selectedRecipe } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedRecipe',
          message: '📄 Select a recipe to view details:',
          choices,
          pageSize: 10
        }
      ]);

      const recipe = await recipeManager.getRecipe(selectedRecipe);
      if (!recipe) {
        console.log(chalk.red(`❌ Recipe not found: ${selectedRecipe}`));
        return;
      }

      // Display recipe details in a readable format
      console.log(chalk.blue(`\n📄 Recipe: ${recipe.name}\n`));
      console.log(chalk.cyan(`Business Type: ${recipe.businessType}`));
      console.log(chalk.cyan(`Description: ${recipe.description}\n`));
      
      console.log(chalk.yellow('📋 Entities:'));
      for (const [entityName, entityDef] of Object.entries(recipe.entities)) {
        console.log(chalk.gray(`  • ${entityName}: ${(entityDef).fields?.length || 0} fields`));
      }
      
      if (recipe.workflows && recipe.workflows.length > 0) {
        console.log(chalk.yellow('\n🔄 Workflows:'));
        for (const workflow of recipe.workflows) {
          console.log(chalk.gray(`  • ${workflow.name}: ${workflow.description || 'No description'}`));
        }
      }

      // Ask if user wants to see full JSON
      const { showJson } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'showJson',
          message: 'Would you like to see the full JSON definition?',
          default: false
        }
      ]);

      if (showJson) {
        console.log(chalk.blue('\n📄 Full JSON:'));
        console.log(chalk.gray(JSON.stringify(recipe, null, 2)));
      }

    } catch (error) {
      this.logger.error('Failed to show recipe', error instanceof Error ? error : new Error(String(error)));
      console.error(chalk.red('❌ Failed to show recipe:'), error);
    }
  }
} 