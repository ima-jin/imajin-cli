/**
 * PluginGenerateCommand - Generate new plugins on-demand
 *
 * @package     @imajin/cli
 * @subpackage  commands/plugin
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-11-22
 *
 * Integration Points:
 * - SelfExtensionManager for plugin generation
 * - CredentialManager for service validation
 * - PluginManager for loading generated plugins
 */

import { BaseCommand } from '../../core/commands/BaseCommand.js';
import type { CommandResult } from '../../core/commands/interfaces.js';
import type { SelfExtensionManager } from '../../core/SelfExtensionManager.js';
import type { Logger } from '../../logging/Logger.js';

export class PluginGenerateCommand extends BaseCommand {
    public readonly name = 'plugin:generate';
    public readonly description = 'Generate a new plugin for a service';

    constructor(
        private selfExtensionManager: SelfExtensionManager,
        logger?: Logger
    ) {
        super(logger);
    }

    async execute(args: string[], options: any): Promise<CommandResult> {
        try {
            const serviceName = options.service || options.name;

            if (!serviceName) {
                return {
                    success: false,
                    message: 'Service name is required. Use --service <name>'
                };
            }

            this.info(`Generating plugin for service: ${serviceName}`);

            // Generate the plugin
            const result = await this.selfExtensionManager.generatePlugin({
                serviceName,
                requestedCommand: options.command,
                apiSpec: options.spec ? JSON.parse(options.spec) : undefined
            });

            if (result.success) {
                this.info(`Plugin '${serviceName}' generated successfully`);

                // Display created files
                if (result.filesCreated.length > 0) {
                    this.info('Created files:');
                    result.filesCreated.forEach(file => {
                        this.info(`  - ${file}`);
                    });
                }

                // Display available commands
                if (result.commandsAvailable.length > 0) {
                    this.info('Available commands:');
                    result.commandsAvailable.forEach(cmd => {
                        this.info(`  - ${cmd}`);
                    });
                }

                return {
                    success: true,
                    data: result,
                    message: `Plugin '${serviceName}' generated and loaded successfully`
                };
            } else {
                const errorObj = result.error || new Error('Unknown error');
                return {
                    success: false,
                    error: errorObj,
                    message: `Failed to generate plugin: ${result.error?.message || 'Unknown error'}`
                };
            }

        } catch (error) {
            this.error('Plugin generation failed', error as Error);
            return {
                success: false,
                error: error as Error,
                message: `Plugin generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
