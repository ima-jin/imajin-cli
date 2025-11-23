#!/usr/bin/env node
/**
 * MCP Server - Expose imajin-cli commands via Model Context Protocol
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
 * - MCP protocol implementation
 * - Command introspection from AIServiceProvider
 * - Tool execution via CommandExecutor
 * - Stdio transport for Claude Code integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Application } from '../core/Application.js';
import type { Logger } from '../logging/Logger.js';
import { CommandExecutor } from './executor.js';
import { ToolGenerator } from './tool-generator.js';
import type { CommandSchema, MCPTool } from './types.js';

/**
 * Main MCP Server class
 */
interface LogEntry {
    timestamp: string;
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    message: string;
    meta?: any;
}

export class MCPServer {
    private readonly server: Server;
    private readonly application: Application;
    private readonly logger: Logger;
    private tools: MCPTool[] = [];
    private executor?: CommandExecutor;
    private readonly logBuffer: LogEntry[] = [];
    private readonly maxLogEntries = 100;

    constructor() {
        // Initialize server
        this.server = new Server(
            {
                name: 'imajin-cli',
                version: '0.1.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        // Bootstrap the application to get access to commands
        this.application = new Application();
        this.logger = this.createLogger();

        // Set up global error handlers to prevent crashes
        this.setupGlobalErrorHandlers();

        // Set up request handlers
        this.setupHandlers();
    }

    /**
     * Register all service providers (same as main CLI)
     */
    private async registerProviders(): Promise<void> {
        // Import and register all service providers
        const { CredentialServiceProvider } = await import('../core/credentials/CredentialServiceProvider.js');
        const { ServiceLayerProvider } = await import('../providers/ServiceLayerProvider.js');
        const { PluginGeneratorServiceProvider } = await import('../providers/PluginGeneratorServiceProvider.js');
        const { MediaServiceProvider } = await import('../providers/MediaServiceProvider.js');
        const { MonitoringServiceProvider } = await import('../providers/MonitoringServiceProvider.js');
        const { StripeServiceProvider } = await import('../services/stripe/StripeServiceProvider.js');
        const { ContentfulServiceProvider } = await import('../services/contentful/ContentfulServiceProvider.js');

        // CommandManager is now registered in Application.ts core services

        this.application.createProvider(CredentialServiceProvider);
        this.application.createProvider(ServiceLayerProvider);
        this.application.createProvider(PluginGeneratorServiceProvider);
        this.application.createProvider(MediaServiceProvider);
        this.application.createProvider(MonitoringServiceProvider);
        this.application.createProvider(StripeServiceProvider);
        this.application.createProvider(ContentfulServiceProvider);

        this.logger.info('Registered all service providers');
    }

    /**
     * Set up global error handlers to prevent process crashes
     */
    private setupGlobalErrorHandlers(): void {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            this.logger.error('🚨 Uncaught exception (prevented crash)', error, {
                errorName: error.name,
                errorMessage: error.message,
            });
            // Don't exit - keep server running
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            this.logger.error('🚨 Unhandled promise rejection (prevented crash)', undefined, {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
            });
            // Don't exit - keep server running
        });

        // Handle SIGTERM gracefully
        process.on('SIGTERM', () => {
            this.logger.info('📴 Received SIGTERM, shutting down gracefully...');
            process.exit(0);
        });

        // Handle SIGINT gracefully (Ctrl+C)
        process.on('SIGINT', () => {
            this.logger.info('📴 Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });

        this.logger.info('✅ Global error handlers installed');
    }

    /**
     * Start the MCP server
     */
    async start(): Promise<void> {
        try {
            this.logger.info('Starting MCP server...');

            // Register all service providers (same as index.ts)
            await this.registerProviders();

            // Bootstrap application to register all providers and commands
            await this.application.bootstrap();

            // Introspect commands and generate tools
            await this.introspectCommands();

            this.logger.info('MCP server initialized', {
                toolCount: this.tools.length,
            });

            // Start server with stdio transport
            const transport = new StdioServerTransport();
            await this.server.connect(transport);

            this.logger.info('MCP server connected and ready');
        } catch (error) {
            this.logger.error('Failed to start MCP server', error as Error);
            throw error;
        }
    }

    /**
     * Set up MCP protocol request handlers
     */
    private setupHandlers(): void {
        // Handle tools/list request
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            try {
                this.logger.info('📋 Client requested tool list', {
                    toolCount: this.tools.length
                });
                return {
                    tools: this.tools,
                };
            } catch (error) {
                this.logger.error('❌ Error listing tools', error as Error);
                // Return empty tools list on error instead of crashing
                return {
                    tools: [],
                };
            }
        });

        // Handle tools/call request
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                this.logger.info('🔧 Tool execution requested', {
                    tool: request.params.name,
                    arguments: request.params.arguments
                });

                // Handle get_logs tool
                if (request.params.name === 'get_logs') {
                const args = request.params.arguments || {};
                const limit = Math.min(typeof args.limit === 'number' ? args.limit : 20, this.maxLogEntries);
                const level = args.level as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | undefined;
                const since = args.since as string | undefined;

                let logs = [...this.logBuffer];

                // Filter by level if specified
                if (level) {
                    logs = logs.filter(log => log.level === level);
                }

                // Filter by timestamp if specified
                if (since) {
                    logs = logs.filter(log => log.timestamp >= since);
                }

                // Apply limit (get most recent entries)
                logs = logs.slice(-limit);

                // Format for display
                const logText = logs.map(log => {
                    const metaStr = log.meta ? ` ${JSON.stringify(log.meta)}` : '';
                    return `${log.timestamp} [${log.level}] ${log.message}${metaStr}`;
                }).join('\n');

                const responseText = logs.length > 0
                    ? `Recent MCP Server Logs:\n\n${logText}\n\n(${logs.length} entries shown)`
                    : 'No logs available matching the specified criteria.';

                return {
                    content: [{
                        type: 'text' as const,
                        text: responseText
                    }]
                };
            }

            if (!this.executor) {
                this.logger.error('❌ Executor not initialized');
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: 'Executor not initialized',
                        },
                    ],
                    isError: true,
                };
            }

            const startTime = Date.now();
            const result = await this.executor.executeTool({
                name: request.params.name,
                arguments: request.params.arguments || {},
            });
            const duration = Date.now() - startTime;

            if (result.isError) {
                this.logger.error('❌ Tool execution failed', undefined, {
                    toolName: request.params.name,
                    duration: `${duration}ms`,
                    errorContent: result.content
                });
            } else {
                this.logger.info('✅ Tool execution succeeded', {
                    toolName: request.params.name,
                    duration: `${duration}ms`
                });
            }

                // Return the result in the format expected by MCP SDK
                return {
                    content: result.content,
                    isError: result.isError,
                };
            } catch (error) {
                // Catch any unhandled errors to prevent server crash
                this.logger.error('🚨 Critical error in tool execution handler', error as Error, {
                    tool: request.params.name,
                    arguments: request.params.arguments,
                });

                // Return a graceful error response to Claude Desktop
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `Internal server error: ${error instanceof Error ? error.message : String(error)}\n\nThe server is still running. You can try again or use the get_logs tool to see detailed error information.`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    /**
     * Introspect commands from the application
     */
    private async introspectCommands(): Promise<void> {
        this.logger.info('Introspecting CLI commands...');

        // Get command schemas from the application
        // The AIServiceProvider already does this introspection
        const commandSchemas = this.getCommandSchemas();

        this.logger.info('Discovered commands', {
            count: commandSchemas.length,
        });

        // Generate MCP tools from command schemas
        this.tools = ToolGenerator.commandSchemasToMCPTools(commandSchemas);

        // Add custom MCP-specific tools
        this.tools.push({
            name: 'get_logs',
            description: 'Get recent MCP server logs for debugging. Returns the last N log entries with timestamps, levels, and messages.',
            inputSchema: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: 'Number of log entries to return (default: 20, max: 100)'
                    },
                    level: {
                        type: 'string',
                        description: 'Filter by log level: DEBUG, INFO, WARN, ERROR (optional)',
                        enum: ['DEBUG', 'INFO', 'WARN', 'ERROR']
                    },
                    since: {
                        type: 'string',
                        description: 'Only show logs since this ISO timestamp (optional)'
                    }
                }
            }
        });

        // Create executor
        this.executor = new CommandExecutor(
            this.application.getProgram(),
            commandSchemas,
            this.logger
        );

        this.logger.info('Generated MCP tools', {
            toolCount: this.tools.length,
        });
    }

    /**
     * Get command schemas by introspecting the Commander program
     */
    private getCommandSchemas(): CommandSchema[] {
        const program = this.application.getProgram();
        const schemas: CommandSchema[] = [];

        // Recursively walk the command tree
        const walkCommands = (command: any, parentName?: string) => {
            const schema = this.extractCommandSchema(command, parentName);
            if (schema) {
                schemas.push(schema);
            }

            // Recursively process subcommands
            if (command.commands && command.commands.length > 0) {
                for (const subcommand of command.commands) {
                    walkCommands(subcommand, schema?.name);
                }
            }
        };

        // Walk all top-level commands
        for (const command of program.commands) {
            walkCommands(command);
        }

        return schemas;
    }

    /**
     * Extract CommandSchema from a Commander command
     */
    private extractCommandSchema(command: any, parentName?: string): CommandSchema | null {
        try {
            // Get command name (handle nested commands)
            const baseName = command.name();

            // Skip help command
            if (baseName === 'help') {
                return null;
            }

            // Build full command name with parent (e.g., "stripe:customer:list")
            const commandName = parentName ? `${parentName}:${baseName}` : baseName;

            // Extract arguments
            const args = command.registeredArguments || [];
            const commandArguments = args.map((arg: any) => ({
                name: arg.name(),
                description: arg.description || '',
                required: arg.required,
            }));

            // Extract options
            const options = command.options.map((opt: any) => {
                // Get option name (remove leading dashes)
                const longFlag = opt.long?.replace(/^--/, '') || '';
                const shortFlag = opt.short?.replace(/^-/, '') || '';
                const optionName = longFlag || shortFlag;

                // Determine type
                let type = 'string';
                if (opt.optional === false || opt.required) {
                    type = 'string';
                }
                if (typeof opt.defaultValue === 'boolean') {
                    type = 'boolean';
                }
                if (typeof opt.defaultValue === 'number') {
                    type = 'number';
                }

                return {
                    name: optionName,
                    description: opt.description || '',
                    required: opt.required || false,
                    type,
                };
            });

            // Build usage string
            const usage = command.usage();

            return {
                name: commandName,
                description: command.description() || '',
                usage,
                arguments: commandArguments.length > 0 ? commandArguments : undefined,
                options,
                examples: [],
            };
        } catch (error) {
            this.logger.warn('Failed to extract command schema', {
                command: command.name(),
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Create logger instance with file logging and buffer support
     */
    private createLogger(): Logger {
        const logFile = process.env.MCP_LOG_FILE || process.env.LOG_FILE;
        const isDebug = process.env.DEBUG === 'true';

        // Create a simple logger that writes to stderr, file, and buffer
        const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, meta?: any) => {
            const timestamp = new Date().toISOString();
            const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
            const logLine = `${timestamp} [${level}] ${message}${metaStr}\n`;

            // Store in buffer (circular buffer)
            this.logBuffer.push({
                timestamp,
                level,
                message,
                meta
            });
            if (this.logBuffer.length > this.maxLogEntries) {
                this.logBuffer.shift();
            }

            // Always write to stderr (for Claude Desktop logs)
            console.error(logLine.trim());

            // Optionally write to file
            if (logFile) {
                try {
                    const fs = require('fs');
                    fs.appendFileSync(logFile, logLine);
                } catch (err) {
                    // Ignore file write errors
                }
            }
        };

        return {
            debug: (message: string, meta?: any) => {
                if (isDebug) {
                    log('DEBUG', message, meta);
                }
            },
            info: (message: string, meta?: any) => {
                log('INFO', message, meta);
            },
            warn: (message: string, meta?: any) => {
                log('WARN', message, meta);
            },
            error: (message: string, error?: Error, meta?: any) => {
                const errorMeta = error ? { ...meta, error: error.message, stack: error.stack } : meta;
                log('ERROR', message, errorMeta);
            },
        } as Logger;
    }
}

/**
 * Start the server if this file is run directly
 */
async function main() {
    console.error('[MCP] Starting imajin-cli MCP server...');
    console.error('[MCP] import.meta.url:', import.meta.url);
    console.error('[MCP] process.argv[1]:', process.argv[1]);

    const server = new MCPServer();
    await server.start();

    console.error('[MCP] Server started successfully, waiting for MCP protocol messages...');
}

// Run if this is the main module
const scriptPath = process.argv[1];
if (scriptPath && import.meta.url.endsWith(scriptPath.replace(/\\/g, '/'))) {
    main().catch((error) => {
        console.error('[MCP] Fatal error starting MCP server:', error);
        console.error('[MCP] Stack trace:', error.stack);
        process.exit(1);
    });
}
