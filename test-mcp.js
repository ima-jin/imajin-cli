#!/usr/bin/env node
/**
 * Minimal MCP server test
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

console.error('[TEST-MCP] Starting minimal test server...');

const server = new Server(
    {
        name: 'test-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Simple test tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('[TEST-MCP] ListTools request received');
    return {
        tools: [
            {
                name: 'test_echo',
                description: 'Echo test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'Message to echo'
                        }
                    },
                    required: ['message']
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error('[TEST-MCP] CallTool request:', request.params.name);

    if (request.params.name === 'test_echo') {
        return {
            content: [
                {
                    type: 'text',
                    text: `Echo: ${request.params.arguments?.message || 'no message'}`
                }
            ]
        };
    }

    return {
        content: [
            {
                type: 'text',
                text: 'Unknown tool'
            }
        ],
        isError: true
    };
});

async function main() {
    console.error('[TEST-MCP] Connecting to stdio transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[TEST-MCP] Connected! Server ready.');
}

main().catch((error) => {
    console.error('[TEST-MCP] Fatal error:', error);
    process.exit(1);
});
