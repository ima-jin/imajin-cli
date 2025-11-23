/**
 * ToolGenerator - Convert CommandSchema to MCP tool definitions
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
 * - CommandSchema from AIServiceProvider introspection
 * - MCP tool definition generation
 * - Tool naming conventions (colon to underscore)
 */

import type { CommandSchema, MCPTool, MCPPropertySchema } from './types.js';

export class ToolGenerator {
    /**
     * Convert a CommandSchema to an MCP tool definition
     */
    static commandSchemaToMCPTool(schema: CommandSchema): MCPTool {
        const properties: Record<string, MCPPropertySchema> = {};
        const required: string[] = [];

        // Add positional arguments as properties
        if (schema.arguments) {
            for (const arg of schema.arguments) {
                const propertyName = this.sanitizePropertyName(arg.name);
                properties[propertyName] = {
                    type: 'string',
                    description: arg.description || `Positional argument: ${arg.name}`,
                };

                if (arg.required) {
                    required.push(propertyName);
                }
            }
        }

        // Add options as properties
        if (schema.options) {
            for (const opt of schema.options) {
                const propertyName = this.sanitizePropertyName(opt.name);
                properties[propertyName] = {
                    type: this.mapTypeToJSONSchema(opt.type),
                    description: opt.description || `Option: ${opt.name}`,
                };

                if (opt.required) {
                    required.push(propertyName);
                }
            }
        }

        // Convert command name: "stripe:customer:list" -> "stripe_customer_list"
        const toolName = this.commandNameToToolName(schema.name);

        // Build description with usage and examples
        let description = schema.description || schema.name;
        if (schema.usage) {
            description += `\n\nUsage: ${schema.usage}`;
        }
        if (schema.examples && schema.examples.length > 0) {
            description += `\n\nExamples:\n${schema.examples.join('\n')}`;
        }

        return {
            name: toolName,
            description,
            inputSchema: {
                type: 'object',
                properties,
                ...(required.length > 0 && { required }),
            },
        };
    }

    /**
     * Convert multiple CommandSchemas to MCP tools
     */
    static commandSchemasToMCPTools(schemas: CommandSchema[]): MCPTool[] {
        return schemas.map(schema => this.commandSchemaToMCPTool(schema));
    }

    /**
     * Convert command name to tool name
     * "stripe:customer:list" -> "stripe_customer_list"
     */
    static commandNameToToolName(commandName: string): string {
        return commandName.replace(/:/g, '_');
    }

    /**
     * Convert tool name back to command name
     * "stripe_customer_list" -> "stripe:customer:list"
     */
    static toolNameToCommandName(toolName: string): string {
        return toolName.replace(/_/g, ':');
    }

    /**
     * Sanitize property names for JSON schema
     * Remove special characters, convert to camelCase
     */
    private static sanitizePropertyName(name: string): string {
        // Remove leading dashes and convert to camelCase
        return name
            .replace(/^-+/, '')
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Map Commander option types to JSON Schema types
     */
    private static mapTypeToJSONSchema(
        type: string
    ): 'string' | 'number' | 'boolean' | 'array' | 'object' {
        const normalizedType = type.toLowerCase();

        if (normalizedType.includes('bool')) {
            return 'boolean';
        }
        if (normalizedType.includes('number') || normalizedType.includes('int')) {
            return 'number';
        }
        if (normalizedType.includes('array')) {
            return 'array';
        }
        if (normalizedType.includes('object')) {
            return 'object';
        }

        // Default to string for everything else
        return 'string';
    }

    /**
     * Create a tool definition map for quick lookup
     */
    static createToolMap(schemas: CommandSchema[]): Map<string, CommandSchema> {
        const map = new Map<string, CommandSchema>();
        for (const schema of schemas) {
            const toolName = this.commandNameToToolName(schema.name);
            map.set(toolName, schema);
        }
        return map;
    }
}
