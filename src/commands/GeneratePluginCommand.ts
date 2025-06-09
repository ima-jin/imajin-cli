/**
 * GeneratePluginCommand - Enhanced command with dependency injection
 * 
 * @package     @imajin/cli
 * @subpackage  commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Plugin Generator Engine with dependency injection
 * - OpenAPI specification parsing
 * - File system operations
 * - Command Pattern framework
 * - Credential management integration
 */

import { promises as fs } from 'fs';
import { BaseCommand } from '../core/commands/BaseCommand.js';
import type { CredentialManager } from '../core/credentials/CredentialManager.js';
import type { PluginGenerator } from '../generators/types.js';
import type { Logger } from '../logging/Logger.js';

export class GeneratePluginCommand extends BaseCommand {
    public readonly name = 'generate:plugin';
    public readonly description = 'Generate a plugin from an OpenAPI specification';

    constructor(
        private generator: PluginGenerator,
        private credentialManager: CredentialManager,
        logger?: Logger
    ) {
        super(logger);
    }

    /**
     * Execute the command with enhanced error handling
     */
    public async execute(args: any[], options: any): Promise<any> {
        try {
            this.validate(args, options);

            const specPath = args[0] || options.spec;
            if (!specPath) {
                throw new Error('OpenAPI specification path is required');
            }

            this.info(`Loading OpenAPI specification from: ${specPath}`);

            // Load OpenAPI specification
            const specContent = await fs.readFile(specPath, 'utf8');
            let spec: any;

            try {
                spec = JSON.parse(specContent);
            } catch (parseError) {
                throw new Error(`Failed to parse OpenAPI specification: ${(parseError as Error).message}`);
            }

            // Validate specification
            const validation = this.generator.validateSpec(spec);
            if (!validation.isValid) {
                throw new Error(`Invalid OpenAPI specification: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                this.warn(`Warnings: ${validation.warnings.join(', ')}`);
            }

            this.info('Generating plugin...');

            // Generate plugin
            const plugin = await this.generator.generateFromOpenAPI(spec);

            this.info(`Generated plugin: ${plugin.name} v${plugin.version}`);
            this.info(`Description: ${plugin.description}`);
            this.info(`Commands: ${plugin.commands.length}`);
            this.info(`Models: ${plugin.models.length}`);
            this.info(`Authentication: ${plugin.authType}`);

            // Create plugin files
            if (!options.dryRun) {
                const outputDir = options.output || 'plugins';
                this.info(`Creating plugin files in: ${outputDir}`);

                const createdFiles = await this.generator.createPluginFiles(plugin);

                this.info(`Created ${createdFiles.length} files:`);
                createdFiles.forEach(file => {
                    this.info(`  - ${file}`);
                });

                // Provide setup instructions
                this.info('\n📋 Next steps:');
                this.info(`1. Review the generated plugin in: ${outputDir}/${plugin.name}`);
                if (plugin.authType !== 'none') {
                    this.info(`2. Set up authentication: imajin auth:setup ${plugin.name}`);
                }
                this.info(`3. Load the plugin: imajin plugin:load`);
                this.info(`4. Test commands: imajin ${plugin.name}:<command>`);

            } else {
                this.info('Dry run - files not created');
                this.info('Generated files:');
                plugin.files.forEach(file => {
                    this.info(`  - ${file.path} (${file.type})`);
                });
            }

            return {
                plugin,
                success: true,
                filesCreated: !options.dryRun,
                message: 'Plugin generated successfully'
            };

        } catch (error) {
            const errorMessage = `Plugin generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            this.error(errorMessage, error as Error);

            return {
                success: false,
                error: error as Error,
                message: errorMessage
            };
        }
    }

    /**
     * Enhanced validation with detailed parameter checking
     */
    protected validate(args: any[], options: any): void {
        super.validate(args, options);

        if (!args[0] && !options.spec) {
            throw new Error('OpenAPI specification path is required. Usage: imajin generate:plugin <spec-path>');
        }

        // Validate output directory if provided
        if (options.output && typeof options.output !== 'string') {
            throw new Error('Output directory must be a string');
        }
    }
} 