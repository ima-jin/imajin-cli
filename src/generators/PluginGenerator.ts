/**
 * PluginGenerator - Core plugin generation from OpenAPI specifications
 * 
 * @package     @imajin/cli
 * @subpackage  generators
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - OpenAPI specification parsing
 * - Code generation from templates
 * - File system operations
 * - Plugin structure creation
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { DefaultOpenAPIParser } from './OpenAPIParser.js';
import { TemplateEngine } from './templates/TemplateEngine.js';
import {
    COMMAND_TEMPLATE,
    MODEL_TEMPLATE,
    PLUGIN_CONFIG_TEMPLATE,
    SERVICE_TEMPLATE
} from './templates/command.template.js';
import type {
    GeneratedPlugin,
    PluginGenerator as IPluginGenerator,
    ModelDefinition,
    OpenAPISpec,
    PluginFile,
    TemplateContext,
    ValidationResult
} from './types.js';

export class DefaultPluginGenerator implements IPluginGenerator {
    private parser: DefaultOpenAPIParser;
    private templateEngine: TemplateEngine;

    constructor(parser?: DefaultOpenAPIParser, templateEngine?: TemplateEngine) {
        this.parser = parser || new DefaultOpenAPIParser();
        this.templateEngine = templateEngine || new TemplateEngine();
    }

    /**
     * Generate plugin from OpenAPI specification
     */
    async generateFromOpenAPI(spec: OpenAPISpec): Promise<GeneratedPlugin> {
        // Parse the OpenAPI spec
        const parsed = await this.parser.parse(spec);

        // Create plugin structure
        const plugin: GeneratedPlugin = {
            name: this.sanitizeName(parsed.info.title),
            version: parsed.info.version,
            description: parsed.info.description || `Generated plugin for ${parsed.info.title}`,
            baseUrl: parsed.baseUrl,
            commands: parsed.commands,
            authType: this.mapAuthType(parsed.authConfig?.type),
            files: [],
            models: parsed.models
        };

        if (parsed.authConfig) {
            plugin.authConfig = parsed.authConfig;
        }

        // Generate files
        plugin.files = await this.generateFiles(plugin);

        return plugin;
    }

    /**
     * Validate OpenAPI specification
     */
    validateSpec(spec: OpenAPISpec): ValidationResult {
        return this.parser.validateSpec(spec);
    }

    /**
     * Create plugin files on disk
     */
    async createPluginFiles(plugin: GeneratedPlugin): Promise<string[]> {
        const createdFiles: string[] = [];
        const pluginDir = join(process.cwd(), 'plugins', plugin.name);

        // Create directory structure
        await this.ensureDirectoryExists(pluginDir);
        await this.ensureDirectoryExists(join(pluginDir, 'commands'));
        await this.ensureDirectoryExists(join(pluginDir, 'models'));

        // Write files
        for (const file of plugin.files) {
            const filePath = join(pluginDir, file.path);
            await this.ensureDirectoryExists(dirname(filePath));
            await fs.writeFile(filePath, file.content, 'utf8');
            createdFiles.push(filePath);
        }

        return createdFiles;
    }

    /**
     * Enhanced generateFiles method with better template context
     */
    private async generateFiles(plugin: GeneratedPlugin): Promise<PluginFile[]> {
        const files: PluginFile[] = [];

        // Enhanced template context with utilities
        const baseContext: TemplateContext = {
            pluginName: this.pascalCase(plugin.name),
            pluginDescription: plugin.description,
            baseUrl: plugin.baseUrl,
            commands: plugin.commands,
            models: plugin.models,
            imports: this.extractImports(plugin.models),
            currentDate: new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10),
            // Add utility functions to context
            utils: {
                pascalCase: this.pascalCase.bind(this),
                camelCase: this.camelCase.bind(this),
                kebabCase: this.kebabCase.bind(this)
            }
        };

        if (plugin.authConfig) {
            baseContext.authConfig = plugin.authConfig;
        }

        // Generate service file
        files.push({
            path: `${this.pascalCase(plugin.name)}Service.ts`,
            content: this.templateEngine.render(SERVICE_TEMPLATE, baseContext),
            type: 'service'
        });

        // Generate command files with enhanced context
        for (const command of plugin.commands) {
            const commandContext = {
                ...baseContext,
                current: command
            };

            files.push({
                path: `commands/${this.pascalCase(command.name)}Command.ts`,
                content: this.templateEngine.render(COMMAND_TEMPLATE, commandContext),
                type: 'command'
            });
        }

        // Generate model files with enhanced context
        for (const model of plugin.models) {
            const modelContext = {
                ...baseContext,
                current: model
            };

            files.push({
                path: `models/${model.name}.ts`,
                content: this.templateEngine.render(MODEL_TEMPLATE, modelContext),
                type: 'model'
            });
        }

        // Generate plugin config with enhanced context
        const configContext = {
            ...baseContext,
            version: plugin.version,
            authType: plugin.authType
        };

        files.push({
            path: `${this.pascalCase(plugin.name)}Config.ts`,
            content: this.templateEngine.render(PLUGIN_CONFIG_TEMPLATE, configContext),
            type: 'config'
        });

        // Generate enhanced index file
        files.push({
            path: 'index.ts',
            content: this.generateEnhancedIndexFile(plugin),
            type: 'config'
        });

        return files;
    }

    /**
     * Generate index file for plugin
     */
    private generateIndexFile(plugin: GeneratedPlugin): string {
        const pluginNamePascal = this.pascalCase(plugin.name);

        return `/**
 * ${pluginNamePascal} Plugin - Generated plugin for ${plugin.description}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/${plugin.name}
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     ${plugin.version}
 * @since       ${new Date().toISOString().split('T')[0]}
 */

// Service
export { ${pluginNamePascal}Service } from './${plugin.name}Service.js';

// Commands
${plugin.commands.map(cmd =>
            `export { ${this.pascalCase(cmd.name)}Command } from './commands/${this.pascalCase(cmd.name)}Command.js';`
        ).join('\n')}

// Models
${plugin.models.map(model =>
            `export type { ${model.name} } from './models/${model.name}.js';`
        ).join('\n')}

// Configuration
export { ${plugin.name}Config } from './${plugin.name}Config.js';
`;
    }

    /**
     * Extract imports needed for the plugin
     */
    private extractImports(models: ModelDefinition[]): string[] {
        return models.map(model => model.name);
    }

    /**
     * Map auth type from OpenAPI to plugin auth type
     */
    private mapAuthType(authType?: string): 'api-key' | 'oauth2' | 'bearer' | 'basic' | 'none' {
        switch (authType) {
            case 'api-key':
                return 'api-key';
            case 'oauth2':
                return 'oauth2';
            case 'bearer':
                return 'bearer';
            case 'basic':
                return 'basic';
            default:
                return 'none';
        }
    }

    /**
     * Sanitize name for use as identifier
     */
    private sanitizeName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Convert string to PascalCase
     */
    private pascalCase(str: string): string {
        return str
            .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^[a-z]/, c => c.toUpperCase());
    }

    /**
     * Convert string to camelCase
     */
    private camelCase(str: string): string {
        return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
    }

    /**
     * Convert string to kebab-case
     */
    private kebabCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
    }

    /**
     * Generate enhanced index file for plugin
     */
    private generateEnhancedIndexFile(plugin: GeneratedPlugin): string {
        const pluginNamePascal = this.pascalCase(plugin.name);
        const currentDate = new Date().toISOString().split('T')[0];

        return `/**
 * ${pluginNamePascal} Plugin - Generated plugin for ${plugin.description}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/${plugin.name}
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     ${plugin.version}
 * @since       ${currentDate}
 */

// Service
export { ${pluginNamePascal}Service } from './${pluginNamePascal}Service.js';

// Commands
${plugin.commands.map(cmd =>
            `export { ${this.pascalCase(cmd.name)}Command } from './commands/${this.pascalCase(cmd.name)}Command.js';`
        ).join('\n')}

// Models
${plugin.models.map(model =>
            `export type { ${model.name} } from './models/${model.name}.js';`
        ).join('\n')}

// Configuration
export { ${pluginNamePascal}Config } from './${pluginNamePascal}Config.js';
`;
    }

    /**
     * Ensure directory exists
     */
    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
} 