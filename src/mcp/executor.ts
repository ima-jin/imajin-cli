/**
 * Executor - Execute CLI commands from MCP tool calls
 *
 * @package     @imajin/cli
 * @subpackage  mcp
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-11-22
 *
 * Integration Points:
 * - Commander.js program execution
 * - Tool call to command translation
 * - Output capture and formatting
 */

import type { Command } from 'commander';
import type { Logger } from '../logging/Logger.js';
import { ToolGenerator } from './tool-generator.js';
import type { CommandSchema, MCPToolCall, MCPToolResult } from './types.js';

export class CommandExecutor {
    private readonly program: Command;
    private readonly logger: Logger;
    private readonly toolMap: Map<string, CommandSchema>;

    constructor(program: Command, commandSchemas: CommandSchema[], logger: Logger) {
        this.program = program;
        this.logger = logger;
        this.toolMap = ToolGenerator.createToolMap(commandSchemas);
    }

    /**
     * Execute a tool call and return the result
     */
    async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
        try {
            this.logger.debug('Executing MCP tool call', {
                tool: toolCall.name,
                args: toolCall.arguments,
            });

            // Get the command schema
            const schema = this.toolMap.get(toolCall.name);
            if (!schema) {
                return this.errorResult(`Unknown tool: ${toolCall.name}`);
            }

            // Convert tool name back to command name
            const commandName = ToolGenerator.toolNameToCommandName(toolCall.name);

            // Parse tool arguments into CLI format
            const { positionalArgs, options } = this.parseToolArguments(
                toolCall.arguments,
                schema
            );

            // Execute the command
            const output = await this.executeCommand(commandName, positionalArgs, options);

            return {
                content: [
                    {
                        type: 'text',
                        text: output,
                    },
                ],
            };
        } catch (error) {
            this.logger.error('Tool execution failed', error as Error, {
                tool: toolCall.name,
            });

            const errorMessage = error instanceof Error ? error.message : String(error);
            return this.errorResult(`Command execution failed: ${errorMessage}`);
        }
    }

    /**
     * Parse tool arguments into positional args and options
     */
    private parseToolArguments(
        toolArgs: Record<string, any>,
        schema: CommandSchema
    ): { positionalArgs: string[]; options: Record<string, any> } {
        const positionalArgs: string[] = [];
        const options: Record<string, any> = {};

        // Extract positional arguments in order
        if (schema.arguments) {
            for (const arg of schema.arguments) {
                const propertyName = this.sanitizePropertyName(arg.name);
                if (toolArgs[propertyName] !== undefined) {
                    positionalArgs.push(String(toolArgs[propertyName]));
                }
            }
        }

        // Extract options (anything not a positional argument)
        const positionalNames = new Set(
            schema.arguments?.map((arg: { name: string }) => this.sanitizePropertyName(arg.name)) || []
        );

        for (const [key, value] of Object.entries(toolArgs)) {
            if (!positionalNames.has(key)) {
                options[key] = value;
            }
        }

        return { positionalArgs, options };
    }

    /**
     * Execute a CLI command and capture output
     */
    private async executeCommand(
        commandName: string,
        positionalArgs: string[],
        options: Record<string, any>
    ): Promise<string> {
        this.logger.debug('Executing CLI command', {
            command: commandName,
            positionalArgs,
            options,
        });

        // Build argv array for Commander
        // Commander.js supports both patterns:
        // 1. Nested subcommands: "service list" -> ['service', 'list']
        // 2. Colon notation: "plugin:list" -> ['plugin:list']
        // We split on colons to handle nested subcommands (most common pattern)
        const commandParts = commandName.split(':');
        const argv = [...commandParts, ...positionalArgs];

        // Add options as CLI flags
        for (const [key, value] of Object.entries(options)) {
            if (value === undefined || value === null) {
                continue;
            }

            // Handle boolean values (both actual booleans and string "true"/"false")
            if (typeof value === 'boolean') {
                if (value) {
                    argv.push(`--${key}`);
                }
            } else if (value === 'true' || value === 'false') {
                // Convert string boolean to boolean flag
                if (value === 'true') {
                    argv.push(`--${key}`);
                }
                // Skip if "false" - don't add the flag
            } else if (Array.isArray(value)) {
                for (const v of value) {
                    argv.push(`--${key}`, String(v));
                }
            } else {
                argv.push(`--${key}`, String(value));
            }
        }

        this.logger.debug('Executing command', { argv });

        // Capture stdout/stderr
        const outputs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalStdoutWrite = process.stdout.write;
        const originalStderrWrite = process.stderr.write;

        // Temporarily override console methods to capture output
        console.log = (...args: any[]) => {
            outputs.push(args.map(a => String(a)).join(' '));
        };
        console.error = (...args: any[]) => {
            outputs.push(`ERROR: ${args.map(a => String(a)).join(' ')}`);
        };
        console.warn = (...args: any[]) => {
            outputs.push(`WARN: ${args.map(a => String(a)).join(' ')}`);
        };

        // Capture direct stdout/stderr writes (Commander uses these)
        process.stdout.write = ((chunk: any) => {
            outputs.push(String(chunk).trim());
            return true;
        }) as any;
        process.stderr.write = ((chunk: any) => {
            outputs.push(`ERROR: ${String(chunk).trim()}`);
            return true;
        }) as any;

        // Configure Commander to not exit on errors
        this.program.exitOverride();

        try {
            // Execute through Commander
            await this.program.parseAsync(argv, { from: 'user' });

            // Restore console and streams
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            process.stdout.write = originalStdoutWrite;
            process.stderr.write = originalStderrWrite;

            return outputs.join('\n') || 'Command executed successfully (no output)';
        } catch (error) {
            // Restore console and streams
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            process.stdout.write = originalStdoutWrite;
            process.stderr.write = originalStderrWrite;

            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`${errorMessage}\n\nOutput:\n${outputs.join('\n')}`);
        }
    }

    /**
     * Sanitize property name to match tool-generator convention
     */
    private sanitizePropertyName(name: string): string {
        return name
            .replace(/^-+/, '')
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Create an error result
     */
    private errorResult(message: string): MCPToolResult {
        return {
            content: [
                {
                    type: 'text',
                    text: message,
                },
            ],
            isError: true,
        };
    }
}
