/**
 * MCP Types - Type definitions for Model Context Protocol integration
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
 * - MCP tool definitions
 * - Tool execution results
 * - Command schema mapping
 */

/**
 * MCP Tool definition matching the protocol spec
 */
export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, MCPPropertySchema>;
        required?: string[];
    };
}

/**
 * JSON Schema property definition for MCP tool inputs
 */
export interface MCPPropertySchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    items?: MCPPropertySchema;
    enum?: string[];
}

/**
 * Tool call from Claude via MCP
 */
export interface MCPToolCall {
    name: string;
    arguments: Record<string, any>;
}

/**
 * Tool execution result returned to Claude
 */
export interface MCPToolResult {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}

/**
 * Command execution context
 */
export interface CommandExecutionContext {
    commandName: string;
    args: string[];
    options: Record<string, any>;
}

/**
 * Command schema representing a CLI command's structure
 * Used for introspection and tool generation
 */
export interface CommandSchema {
    name: string;
    description: string;
    usage: string;
    arguments?: Array<{
        name: string;
        description: string;
        required: boolean;
    }>;
    options: Array<{
        name: string;
        description: string;
        required: boolean;
        type: string;
    }>;
    examples?: string[];
}
