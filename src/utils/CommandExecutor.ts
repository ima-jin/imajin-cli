/**
 * CommandExecutor - Secure command execution with git filtering
 * 
 * @package     @imajin/cli
 * @subpackage  utils
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 * @updated      2025-07-03
 *
 * Security Features:
 * - Git command filtering via CommandLimiter
 * - Safe command execution with error handling
 * - Logging of all command executions
 */

import { spawn, type SpawnOptions } from 'child_process';
import type { Logger } from '../logging/Logger.js';
import { getCommandLimiter } from './CommandLimiter.js';

export interface CommandExecutorOptions {
    logger?: Logger;
    validateGitCommands?: boolean;
    stdio?: 'inherit' | 'pipe' | 'ignore';
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeout?: number;
}

export interface CommandResult {
    success: boolean;
    code: number | null;
    stdout?: string;
    stderr?: string;
    error?: string;
    blocked?: boolean;
    blockReason?: string;
}

export class CommandExecutor {
    private logger: Logger | undefined;
    private validateGitCommands: boolean;

    constructor(options: CommandExecutorOptions = {}) {
        this.logger = options.logger;
        this.validateGitCommands = options.validateGitCommands ?? true;
    }

    /**
     * Execute a command with validation and logging
     */
    async executeCommand(
        command: string,
        args: string[] = [],
        options: CommandExecutorOptions = {}
    ): Promise<CommandResult> {
        const fullCommand = `${command} ${args.join(' ')}`.trim();
        
        // Merge method-level options with instance-level settings
        const effectiveLogger = options.logger || this.logger;
        const shouldValidateGit = options.validateGitCommands ?? this.validateGitCommands;
        
        effectiveLogger?.debug('Attempting to execute command', {
            command: fullCommand,
            validateGit: shouldValidateGit,
            instanceDefault: this.validateGitCommands,
            methodOverride: options.validateGitCommands
        });

        // Validate git commands if enabled (honor method-level flag)
        if (shouldValidateGit) {
            try {
                const limiter = getCommandLimiter(this.logger);
                const validation = await limiter.validateCommand(fullCommand);
                
                if (!validation.allowed) {
                    this.logger?.warn('Command execution blocked', {
                        command: fullCommand,
                        reason: validation.reason
                    });
                    
                    const result: CommandResult = {
                        success: false,
                        code: -1,
                        blocked: true
                    };
                    if (validation.reason) {
                        result.blockReason = validation.reason;
                    }
                    return result;
                }
            } catch (error) {
                this.logger?.error('Command validation failed',
                    error instanceof Error ? error : undefined,
                    {
                        command: fullCommand,
                        errorMessage: error instanceof Error ? error.message : 'Unknown error'
                    });
                
                return {
                    success: false,
                    code: -1,
                    error: 'Command validation failed'
                };
            }
        }

        // Execute the command
        try {
            const result = await this.runCommand(command, args, options);
            
            this.logger?.debug('Command executed', {
                command: fullCommand,
                code: result.code,
                success: result.success
            });
            
            return result;
        } catch (error) {
            this.logger?.error('Command execution failed',
                error instanceof Error ? error : undefined,
                {
                    command: fullCommand,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });
            
            return {
                success: false,
                code: -1,
                error: error instanceof Error ? error.message : 'Execution failed'
            };
        }
    }

    /**
     * Execute command interactively (inherits stdio)
     */
    async executeInteractive(
        command: string,
        args: string[] = [],
        options: CommandExecutorOptions = {}
    ): Promise<CommandResult> {
        const execOptions = {
            ...options,
            stdio: 'inherit' as const
        };
        
        return this.executeCommand(command, args, execOptions);
    }

    /**
     * Internal method to run the actual command
     */
    private async runCommand(
        command: string,
        args: string[] = [],
        options: CommandExecutorOptions = {}
    ): Promise<CommandResult> {
        return new Promise((resolve) => {
            const spawnOptions: SpawnOptions = {
                stdio: options.stdio || 'pipe',
                cwd: options.cwd,
                env: options.env
            };

            const child = spawn(command, args, spawnOptions);
            
            let stdout = '';
            let stderr = '';

            // Capture output if stdio is piped
            if (spawnOptions.stdio === 'pipe') {
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });

                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
            }

            // Handle timeout
            let timeoutId: NodeJS.Timeout | undefined;
            if (options.timeout) {
                timeoutId = setTimeout(() => {
                    child.kill('SIGTERM');
                }, options.timeout);
            }

            child.on('close', (code) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                const result: CommandResult = {
                    success: code === 0,
                    code
                };
                
                if (stdout) {
                    result.stdout = stdout;
                }
                if (stderr) {
                    result.stderr = stderr;
                }
                
                resolve(result);
            });

            child.on('error', (error) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                const result: CommandResult = {
                    success: false,
                    code: -1,
                    error: error.message
                };
                
                if (stdout) {
                    result.stdout = stdout;
                }
                if (stderr) {
                    result.stderr = stderr;
                }
                
                resolve(result);
            });
        });
    }
}

// Global executor instance
let globalExecutor: CommandExecutor | null = null;

/**
 * Get global command executor instance
 */
export function getCommandExecutor(options?: CommandExecutorOptions): CommandExecutor {
    if (!globalExecutor) {
        globalExecutor = new CommandExecutor(options);
    }
    return globalExecutor;
}

/**
 * Execute command using global executor
 */
export async function executeCommand(
    command: string,
    args: string[] = [],
    options?: CommandExecutorOptions
): Promise<CommandResult> {
    const executor = getCommandExecutor(options);
    return executor.executeCommand(command, args, options);
}

/**
 * Execute interactive command using global executor
 */
export async function executeInteractive(
    command: string,
    args: string[] = [],
    options?: CommandExecutorOptions
): Promise<CommandResult> {
    const executor = getCommandExecutor(options);
    return executor.executeInteractive(command, args, options);
} 