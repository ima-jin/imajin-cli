/**
 * SelfExtensionManager - On-demand plugin generation system
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
 * - PluginManager for hot-reloading generated plugins
 * - CredentialManager for checking available services
 * - CodeGenerationAgent for AI-powered code generation
 * - Pattern detection from existing plugins
 *
 * Purpose:
 * Enables the CLI to generate new plugins on-demand when commands are requested
 * but don't exist. Reads existing plugin patterns and uses AI to generate
 * compatible code following the established architecture.
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import type { PluginManager } from './PluginManager.js';
import type { CredentialManager } from './credentials/CredentialManager.js';
import type { Logger } from '../logging/Logger.js';

export interface PluginPattern {
    serviceName: string;
    commandStructure: string;
    serviceStructure: string;
    authPattern: string;
    examples: string[];
}

export interface GeneratePluginRequest {
    serviceName: string;
    requestedCommand?: string;
    apiSpec?: any;
    credentials?: any;
}

export interface GeneratePluginResult {
    success: boolean;
    pluginName: string;
    filesCreated: string[];
    commandsAvailable: string[];
    error?: Error;
}

/**
 * Manages self-extension capabilities for the CLI
 * Generates new plugins on-demand using AI and existing patterns
 */
export class SelfExtensionManager {
    private readonly pluginsDirectory: string;
    private readonly patternsCache: Map<string, PluginPattern> = new Map();

    constructor(
        private readonly pluginManager: PluginManager,
        private readonly credentialManager: CredentialManager,
        private readonly logger: Logger,
        pluginsDir?: string
    ) {
        this.pluginsDirectory = pluginsDir || join(process.cwd(), 'plugins');
    }

    /**
     * Generate a new plugin for a service
     */
    async generatePlugin(request: GeneratePluginRequest): Promise<GeneratePluginResult> {
        const { serviceName, requestedCommand, apiSpec, credentials } = request;

        try {
            this.logger.info('Starting plugin generation', { serviceName, requestedCommand });

            // 1. Validate we can generate for this service
            await this.validateGenerationRequest(serviceName);

            // 2. Check if plugin already exists
            if (this.pluginManager.isPluginLoaded(serviceName)) {
                throw new Error(`Plugin '${serviceName}' already exists`);
            }

            // 3. Learn from existing plugins
            const patterns = await this.learnExistingPatterns();
            this.logger.debug('Learned patterns from existing plugins', {
                patternCount: patterns.length
            });

            // 4. Get credentials if not provided
            const creds = credentials || await this.getCredentials(serviceName);

            // 5. Generate plugin code using AI
            // Note: This requires CodeGenerationAgent which calls Claude API
            // For now, we'll prepare the structure
            const generatedFiles = await this.generatePluginFiles({
                serviceName,
                patterns,
                credentials: creds,
                apiSpec,
                ...(requestedCommand && { requestedCommand })
            });

            // 6. Write files to disk
            const filesCreated = await this.writePluginFiles(serviceName, generatedFiles);

            // 6.5. Compile TypeScript to JavaScript
            await this.compilePlugin(serviceName);

            // 7. Load the new plugin
            const pluginPath = join(this.pluginsDirectory, serviceName);
            await this.pluginManager.loadPlugin(pluginPath);

            this.logger.info('Plugin generated successfully', {
                serviceName,
                filesCreated: filesCreated.length
            });

            // 8. Get available commands from the loaded plugin
            const plugin = this.pluginManager.getPlugin(serviceName);
            const commandsAvailable = plugin?.commands.map(cmd => cmd.name) || [];

            return {
                success: true,
                pluginName: serviceName,
                filesCreated,
                commandsAvailable
            };

        } catch (error) {
            this.logger.error('Plugin generation failed', error as Error, { serviceName });
            return {
                success: false,
                pluginName: serviceName,
                filesCreated: [],
                commandsAvailable: [],
                error: error as Error
            };
        }
    }

    /**
     * Handle missing command by generating plugin if possible
     */
    async handleMissingCommand(commandName: string): Promise<boolean> {
        try {
            // Parse service name from command: "hubspot:contact:list" → "hubspot"
            const serviceName = this.parseServiceFromCommand(commandName);

            if (!serviceName) {
                return false;
            }

            this.logger.info('Attempting to generate missing command', {
                commandName,
                serviceName
            });

            // Check if we have credentials for this service
            const hasCredentials = await this.hasCredentialsFor(serviceName);
            if (!hasCredentials) {
                this.logger.warn('No credentials available for service', { serviceName });
                return false;
            }

            // Generate the plugin
            const result = await this.generatePlugin({
                serviceName,
                requestedCommand: commandName
            });

            return result.success;

        } catch (error) {
            this.logger.error('Failed to handle missing command', error as Error, { commandName });
            return false;
        }
    }

    /**
     * Learn patterns from existing plugins
     */
    async learnExistingPatterns(): Promise<PluginPattern[]> {
        const patterns: PluginPattern[] = [];

        try {
            // Get all loaded plugins
            const loadedPlugins = this.pluginManager.getLoadedPlugins();

            for (const pluginInfo of loadedPlugins) {
                // Check cache first
                if (this.patternsCache.has(pluginInfo.name)) {
                    patterns.push(this.patternsCache.get(pluginInfo.name)!);
                    continue;
                }

                // Read plugin files to extract patterns
                const pattern = await this.extractPatternFromPlugin(pluginInfo.path);
                if (pattern) {
                    this.patternsCache.set(pluginInfo.name, pattern);
                    patterns.push(pattern);
                }
            }

        } catch (error) {
            this.logger.error('Failed to learn patterns', error as Error);
        }

        return patterns;
    }

    /**
     * Extract pattern from a plugin's source code
     */
    private async extractPatternFromPlugin(pluginPath: string): Promise<PluginPattern | null> {
        try {
            const serviceName = pluginPath.split(/[/\\]/).pop() || 'unknown';

            // Read key files to understand structure
            const serviceFile = await this.tryReadFile(join(pluginPath, `${serviceName}Service.ts`));
            const commandFiles = await this.findCommandFiles(pluginPath);

            if (!serviceFile && commandFiles.length === 0) {
                return null;
            }

            // Extract structure patterns
            const commandStructure = commandFiles.length > 0 && commandFiles[0]
                ? await this.analyzeCommandStructure(commandFiles[0])
                : '';

            return {
                serviceName,
                commandStructure,
                serviceStructure: serviceFile || '',
                authPattern: this.extractAuthPattern(serviceFile || ''),
                examples: commandFiles.slice(0, 2) // First 2 command examples
            };

        } catch (error) {
            this.logger.debug('Could not extract pattern', { pluginPath });
            return null;
        }
    }

    /**
     * Generate plugin files using patterns and AI
     */
    private async generatePluginFiles(params: {
        serviceName: string;
        patterns: PluginPattern[];
        credentials: any;
        apiSpec?: any;
        requestedCommand?: string;
    }): Promise<Map<string, string>> {
        const files = new Map<string, string>();

        // TODO: This is where CodeGenerationAgent will be called
        // For now, generate basic structure based on patterns

        const { serviceName } = params;
        const capitalizedName = this.capitalize(serviceName);

        // Generate TypeScript source files (will be compiled to .js for runtime)
        files.set('index.ts', this.generateIndexFile(serviceName));
        files.set(`${capitalizedName}Service.ts`, this.generateServiceFile(params));
        files.set(`commands/ListCommand.ts`, this.generateCommandFile(params));

        // Also generate tsconfig.json for compilation
        files.set('tsconfig.json', this.generateTsConfig());

        return files;
    }

    /**
     * Write generated files to disk
     */
    private async writePluginFiles(
        serviceName: string,
        files: Map<string, string>
    ): Promise<string[]> {
        const pluginPath = join(this.pluginsDirectory, serviceName);
        const createdFiles: string[] = [];

        // Create plugin directory
        await fs.mkdir(pluginPath, { recursive: true });

        // Write each file
        for (const [relativePath, content] of files) {
            const fullPath = join(pluginPath, relativePath);

            // Create subdirectories if needed
            const dir = join(fullPath, '..');
            await fs.mkdir(dir, { recursive: true });

            // Write file
            await fs.writeFile(fullPath, content, 'utf-8');
            createdFiles.push(relativePath);

            this.logger.debug('Created file', { path: relativePath });
        }

        return createdFiles;
    }

    /**
     * Validate generation request
     */
    private async validateGenerationRequest(serviceName: string): Promise<void> {
        if (!serviceName || serviceName.trim() === '') {
            throw new Error('Service name is required');
        }

        // Check if plugins directory exists
        try {
            await fs.access(this.pluginsDirectory);
        } catch {
            // Create if doesn't exist
            await fs.mkdir(this.pluginsDirectory, { recursive: true });
        }
    }

    /**
     * Get credentials for a service
     */
    private async getCredentials(serviceName: string): Promise<any> {
        try {
            return await this.credentialManager.retrieve(serviceName);
        } catch {
            return null;
        }
    }

    /**
     * Check if credentials exist for service
     */
    private async hasCredentialsFor(serviceName: string): Promise<boolean> {
        try {
            const creds = await this.credentialManager.retrieve(serviceName);
            return creds !== null && creds !== undefined;
        } catch {
            return false;
        }
    }

    /**
     * Parse service name from command
     */
    private parseServiceFromCommand(commandName: string): string {
        const parts = commandName.split(':');
        return parts[0] || '';
    }

    /**
     * Helper methods for file generation (basic templates)
     */
    private generateIndexFile(serviceName: string): string {
        const capitalizedName = this.capitalize(serviceName);
        return `/**
 * ${capitalizedName} Plugin
 * Generated by imajin-cli Self-Extension System
 */

export const name = '${serviceName}';
export const version = '1.0.0';
export const description = '${capitalizedName} integration plugin';

export * from './${capitalizedName}Service.js';
export * from './commands/ListCommand.js';
`;
    }

    private generateServiceFile(params: { serviceName: string }): string {
        const capitalizedName = this.capitalize(params.serviceName);
        return `/**
 * ${capitalizedName}Service - API integration
 * Generated by imajin-cli Self-Extension System
 */

import axios, { AxiosInstance } from 'axios';

export interface CredentialData {
    apiKey?: string;
    [key: string]: any;
}

export class ${capitalizedName}Service {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor(baseUrl: string = 'https://api.${params.serviceName}.com') {
        this.baseUrl = baseUrl;
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imajin-cli/0.1.0'
            }
        });
    }

    /**
     * Apply authentication to requests
     */
    private applyAuth(credentials: CredentialData): void {
        if (credentials.apiKey) {
            this.client.defaults.headers.common['Authorization'] = \`Bearer \${credentials.apiKey}\`;
        }
    }

    /**
     * Example list method
     */
    async list(credentials: CredentialData): Promise<any> {
        this.applyAuth(credentials);
        const response = await this.client.get('/items');
        return response.data;
    }
}
`;
    }

    private generateCommandFile(params: { serviceName: string }): string {
        const capitalizedName = this.capitalize(params.serviceName);
        return `/**
 * List${capitalizedName}Command - List items from ${capitalizedName}
 * Generated by imajin-cli Self-Extension System
 */

import { BaseCommand } from '../../../dist/core/commands/BaseCommand.js';
import type { CommandResult } from '../../../dist/core/commands/interfaces.js';
import { ${capitalizedName}Service, CredentialData } from '../${capitalizedName}Service.js';

export class List${capitalizedName}Command extends BaseCommand {
    public readonly name = '${params.serviceName}:list';
    public readonly description = 'List items from ${capitalizedName}';

    constructor(private service: ${capitalizedName}Service) {
        super();
    }

    async execute(args: any[], options: any): Promise<CommandResult> {
        try {
            // TODO: Implement credential retrieval
            const credentials: CredentialData = {
                apiKey: process.env.${params.serviceName.toUpperCase()}_API_KEY || ''
            };

            const result = await this.service.list(credentials);

            return {
                success: true,
                data: result,
                message: 'Items retrieved successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                message: \`Failed to list items: \${error instanceof Error ? error.message : 'Unknown error'}\`
            };
        }
    }
}
`;
    }

    // Utility methods
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    private async tryReadFile(path: string): Promise<string | null> {
        try {
            return await fs.readFile(path, 'utf-8');
        } catch {
            return null;
        }
    }

    private async findCommandFiles(pluginPath: string): Promise<string[]> {
        try {
            const commandsDir = join(pluginPath, 'commands');
            const entries = await fs.readdir(commandsDir);
            return entries
                .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
                .map(f => join(commandsDir, f));
        } catch {
            return [];
        }
    }

    private async analyzeCommandStructure(filePath: string): Promise<string> {
        const content = await this.tryReadFile(filePath);
        return content || '';
    }

    private extractAuthPattern(serviceContent: string): string {
        // Simple pattern extraction - look for auth-related code
        const lines = serviceContent.split('\n');
        const authLines = lines.filter(line =>
            line.includes('auth') ||
            line.includes('Authorization') ||
            line.includes('apiKey') ||
            line.includes('Bearer')
        );
        return authLines.join('\n');
    }

    /**
     * Generate tsconfig.json for plugin compilation
     */
    private generateTsConfig(): string {
        return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": ".",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "**/*.test.ts", "**/*.js"]
}
`;
    }

    /**
     * Compile TypeScript plugin to JavaScript
     */
    private async compilePlugin(serviceName: string): Promise<void> {
        const pluginPath = join(this.pluginsDirectory, serviceName);

        this.logger.info('Compiling plugin TypeScript to JavaScript', { serviceName });

        try {
            // Use tsc to compile the plugin
            const { execSync } = await import('child_process');
            const command = `cd "${pluginPath}" && npx tsc`;

            execSync(command, {
                stdio: 'pipe', // Capture output
                encoding: 'utf-8'
            });

            this.logger.info('Plugin compiled successfully', { serviceName });
        } catch (error) {
            this.logger.error('Failed to compile plugin', error as Error, { serviceName });
            throw new Error(`Plugin compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
