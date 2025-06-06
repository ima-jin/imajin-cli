/**
 * Application - Core application bootstrap and orchestration
 * 
 * @package     @imajin/cli
 * @module      core
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-04
 *
 * @see         docs/architecture.md
 * 
 * Integration Points:
 * - Container for dependency injection
 * - ServiceProvider registration and bootstrapping
 * - Console command registration and execution
 */

import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';

export class Application {
  private program: Command;
  private version: string = '0.1.0';

  constructor() {
    this.program = new Command();
    this.setupProgram();
  }

  private setupProgram(): void {
    this.program
      .name('imajin')
      .description('LLM-powered universal service interface')
      .version(this.version);

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
        console.log(chalk.gray(`Version: ${this.version}`));
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

    // List services command (placeholder)
    this.program
      .command('list-services')
      .description('List available service connectors')
      .action(() => {
        console.log(chalk.blue('Available services:'));
        console.log(chalk.gray('  - stripe (coming soon)'));
        console.log(chalk.gray('  - contentful (planned)'));
        console.log(chalk.gray('  - github (planned)'));
        console.log(chalk.gray('\n💡 Services will be loaded via ServiceProvider system'));
      });

    // TODO: Implement proper task management as a service
    // This should be handled by:
    // - TaskManagementService (part of service layer)
    // - AI-powered task execution from markdown files
    // - Integration with ServiceProvider system for plugin-based tasks
    // - Real progress tracking with file updates and git integration
    // See: docs/IMPLEMENTATION_PROMPTS.md for task definitions
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