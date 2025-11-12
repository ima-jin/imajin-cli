/**
 * CommandManager - Command registration and execution management
 * 
 * @package     @imajin/cli
 * @subpackage  core/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Service Provider command registration
 * - Command discovery and help system
 * - Argument parsing and validation
 * - Error handling and user feedback
 */

import { Command } from 'commander';
import type { Container } from '../../container/Container.js';
import { Logger } from '../../logging/Logger.js';

export interface ICommand {
    readonly name: string;
    readonly description: string;
    execute(args: any[], options: any): Promise<any>;
}

export class CommandManager {
    private readonly commands: Map<string, ICommand> = new Map();
    private readonly program: Command;
    private readonly container: Container;
    private readonly logger: Logger;

    constructor(program: Command, container: Container) {
        this.program = program;
        this.container = container;
        this.logger = new Logger({ level: 'debug' });
    }

    /**
     * Register a command
     */
    public register(command: ICommand): void {
        this.commands.set(command.name, command);

        // Register with Commander.js
        this.program
            .command(command.name)
            .description(command.description)
            .action(async (...args) => {
                try {
                    await command.execute(args.slice(0, -1), args.at(-1));
                } catch (error) {
                    this.logger.error('Command failed', error instanceof Error ? error : new Error(String(error)), { commandName: command.name });
                    process.exit(1);
                }
            });
    }

    /**
     * Get all registered commands
     */
    public getCommands(): ICommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Check if command exists
     */
    public hasCommand(name: string): boolean {
        return this.commands.has(name);
    }
} 