/**
 * CodeGenerationAgent - AI-powered code generation using Claude API
 *
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-11-22
 *
 * Integration Points:
 * - Claude API for code generation
 * - Pattern analysis from existing plugins
 * - Code validation and testing
 *
 * Purpose:
 * Provides AI-powered code generation capabilities for creating new plugins.
 * Uses Claude API to generate plugin code that follows existing patterns and
 * integrates with the imajin-cli architecture.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '../logging/Logger.js';
import type { PluginPattern } from './SelfExtensionManager.js';

export interface CodeGenerationRequest {
    serviceName: string;
    requestedCommand?: string;
    patterns: PluginPattern[];
    credentials?: any;
    apiSpec?: any;
    existingArchitecture?: string;
}

export interface GeneratedCode {
    files: Map<string, string>;
    commands: string[];
    dependencies: string[];
}

/**
 * Agent for generating plugin code using Claude API
 */
export class CodeGenerationAgent {
    private readonly anthropic: Anthropic | null;
    private readonly model: string = 'claude-sonnet-4.5-20250929';
    private readonly apiKey: string | undefined;

    constructor(
        private readonly logger: Logger,
        apiKey?: string
    ) {
        // Use provided API key or fall back to environment variable
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

        // Initialize Anthropic client only if API key is available
        // Don't throw in constructor - throw when generatePlugin() is called
        if (this.apiKey) {
            this.anthropic = new Anthropic({ apiKey: this.apiKey });
        } else {
            this.anthropic = null;
            this.logger.warn('ANTHROPIC_API_KEY not found. Code generation will fail if attempted.');
        }
    }

    /**
     * Generate plugin code using Claude API
     */
    async generatePlugin(request: CodeGenerationRequest): Promise<GeneratedCode> {
        // Check if Anthropic client is available
        if (!this.anthropic || !this.apiKey) {
            throw new Error(
                'ANTHROPIC_API_KEY not configured. Set the ANTHROPIC_API_KEY environment variable to enable AI code generation.'
            );
        }

        this.logger.info('Generating plugin code with AI', {
            serviceName: request.serviceName,
            hasPatterns: request.patterns.length > 0
        });

        try {
            // Build the prompt for Claude
            const prompt = this.buildGenerationPrompt(request);

            // Call Claude API
            const response = await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 8000,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            // Parse the response
            const generatedCode = this.parseClaudeResponse(response, request.serviceName);

            this.logger.info('Plugin code generated successfully', {
                serviceName: request.serviceName,
                fileCount: generatedCode.files.size,
                commandCount: generatedCode.commands.length
            });

            return generatedCode;

        } catch (error) {
            this.logger.error('Failed to generate plugin code', error as Error, {
                serviceName: request.serviceName
            });
            throw error;
        }
    }

    /**
     * Build prompt for Claude to generate plugin code
     */
    private buildGenerationPrompt(request: CodeGenerationRequest): string {
        const { serviceName, requestedCommand, patterns, credentials, apiSpec } = request;
        const capitalizedName = this.capitalize(serviceName);

        let prompt = `You are a code generation agent for imajin-cli, a CLI generation system. Generate a new plugin for the "${serviceName}" service.

## Requirements

1. **Follow existing patterns**: Study the patterns from existing plugins below
2. **TypeScript**: All code must be TypeScript with proper types
3. **Architecture**: Follow the imajin-cli plugin architecture
4. **Commands**: Extend BaseCommand class
5. **Services**: Create service class for API integration
6. **Authentication**: Integrate with CredentialManager
7. **Error handling**: Use structured exceptions

## Existing Plugin Patterns

${this.formatPatterns(patterns)}

## Service Information

- **Service Name**: ${serviceName}
- **Requested Command**: ${requestedCommand || 'Generate common CRUD operations'}
${credentials ? `- **Available Credentials**: ${JSON.stringify(credentials, null, 2)}` : ''}
${apiSpec ? `- **API Specification**: ${JSON.stringify(apiSpec, null, 2)}` : ''}

## Output Format

Generate the following files in this exact format:

\`\`\`
FILE: index.js
[content here]

FILE: ${capitalizedName}Service.ts
[content here]

FILE: commands/ListCommand.ts
[content here]
\`\`\`

## Plugin Structure

Generate at minimum:
1. **index.js** - Plugin entry point with exports
2. **${capitalizedName}Service.ts** - API integration service
3. **commands/ListCommand.ts** - List/query command
4. Additional commands based on the API (Create, Update, Delete if applicable)

## Important Notes

- Use ES modules (import/export)
- Include proper JSDoc comments
- Follow the command pattern from examples
- Integrate with CredentialManager for auth
- Return structured CommandResult objects
- Handle errors gracefully

Generate the plugin now:`;

        return prompt;
    }

    /**
     * Format patterns for the prompt
     */
    private formatPatterns(patterns: PluginPattern[]): string {
        if (patterns.length === 0) {
            return 'No existing patterns available. Create a basic plugin structure.';
        }

        let formatted = '';
        for (const pattern of patterns.slice(0, 2)) { // Use top 2 patterns
            formatted += `\n### ${pattern.serviceName} Plugin Pattern\n\n`;

            if (pattern.commandStructure) {
                formatted += `**Command Structure Example:**\n\`\`\`typescript\n${pattern.commandStructure.slice(0, 500)}\n\`\`\`\n\n`;
            }

            if (pattern.serviceStructure) {
                formatted += `**Service Structure Example:**\n\`\`\`typescript\n${pattern.serviceStructure.slice(0, 500)}\n\`\`\`\n\n`;
            }

            if (pattern.authPattern) {
                formatted += `**Authentication Pattern:**\n\`\`\`typescript\n${pattern.authPattern}\n\`\`\`\n\n`;
            }
        }

        return formatted;
    }

    /**
     * Parse Claude's response and extract generated files
     */
    private parseClaudeResponse(
        response: Anthropic.Message,
        serviceName: string
    ): GeneratedCode {
        const files = new Map<string, string>();
        const commands: string[] = [];
        const dependencies: string[] = ['axios']; // Default dependency

        // Extract text content
        const textContent = response.content
            .filter(block => block.type === 'text')
            .map(block => (block as any).text)
            .join('\n');

        // Parse files from the response
        // Look for pattern: FILE: path\n```\ncontent\n```
        const filePattern = /FILE:\s*([^\n]+)\n```(?:typescript|javascript|ts|js)?\n([\s\S]*?)\n```/gi;
        let match;

        while ((match = filePattern.exec(textContent)) !== null) {
            const filePath = match[1]?.trim() || '';
            const content = match[2]?.trim() || '';

            files.set(filePath, content);

            // Extract command names
            if (filePath.includes('Command.ts')) {
                const commandMatch = content.match(/public readonly name = ['"]([^'"]+)['"]/);
                if (commandMatch && commandMatch[1]) {
                    commands.push(commandMatch[1]);
                }
            }

            this.logger.debug('Parsed file from response', { filePath, size: content.length });
        }

        // If no files were parsed, try alternative format
        if (files.size === 0) {
            this.logger.warn('No files parsed from standard format, attempting fallback');
            this.parseAlternativeFormat(textContent, files, commands);
        }

        // Ensure we have minimum required files
        if (files.size === 0) {
            throw new Error('Failed to parse generated code from Claude response');
        }

        return {
            files,
            commands,
            dependencies
        };
    }

    /**
     * Parse alternative response format
     */
    private parseAlternativeFormat(
        content: string,
        files: Map<string, string>,
        commands: string[]
    ): void {
        // Try to find code blocks and infer file names
        const codeBlocks = content.match(/```(?:typescript|ts)\n([\s\S]*?)\n```/gi);

        if (codeBlocks && codeBlocks.length > 0) {
            // First block is likely the service
            const firstBlock = codeBlocks[0];
            if (firstBlock) {
                files.set('Service.ts', firstBlock.replace(/```(?:typescript|ts)?\n?|\n?```/g, ''));
            }

            // Subsequent blocks are likely commands
            for (let i = 1; i < codeBlocks.length; i++) {
                const block = codeBlocks[i];
                if (block) {
                    const code = block.replace(/```(?:typescript|ts)?\n?|\n?```/g, '');
                    files.set(`commands/Command${i}.ts`, code);
                }
            }
        }
    }

    /**
     * Validate generated code
     */
    async validateGeneratedCode(code: GeneratedCode): Promise<boolean> {
        // Basic validation checks
        if (code.files.size === 0) {
            this.logger.warn('No files generated');
            return false;
        }

        // Check for required files
        const hasIndex = Array.from(code.files.keys()).some(f => f.includes('index'));
        const hasService = Array.from(code.files.keys()).some(f => f.includes('Service'));

        if (!hasIndex || !hasService) {
            this.logger.warn('Missing required files', { hasIndex, hasService });
            return false;
        }

        // Check for TypeScript syntax errors (basic check)
        for (const [filePath, content] of code.files) {
            if (content.includes('extends BaseCommand') && !content.includes('execute')) {
                this.logger.warn('Command missing execute method', { filePath });
                return false;
            }
        }

        return true;
    }

    // Utility methods
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
}
