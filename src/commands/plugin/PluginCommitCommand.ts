/**
 * PluginCommitCommand - Commit generated plugins to git
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
 * - Git for version control
 * - PluginManager for plugin validation
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { BaseCommand } from '../../core/commands/BaseCommand.js';
import type { CommandResult } from '../../core/commands/interfaces.js';
import type { PluginManager } from '../../core/PluginManager.js';
import type { Logger } from '../../logging/Logger.js';

const execAsync = promisify(exec);

export class PluginCommitCommand extends BaseCommand {
    public readonly name = 'plugin:commit';
    public readonly description = 'Commit a generated plugin to git';

    constructor(
        private pluginManager: PluginManager,
        logger?: Logger
    ) {
        super(logger);
    }

    async execute(args: string[], options: any): Promise<CommandResult> {
        try {
            const pluginName = options.name || options.plugin;
            const message = options.message || options.m || `Add ${pluginName} plugin`;

            if (!pluginName) {
                return {
                    success: false,
                    message: 'Plugin name is required. Use --name <plugin>'
                };
            }

            // Validate plugin exists
            if (!this.pluginManager.isPluginLoaded(pluginName)) {
                return {
                    success: false,
                    message: `Plugin '${pluginName}' not found or not loaded`
                };
            }

            this.info(`Committing plugin: ${pluginName}`);

            // Check if we're in a git repository
            try {
                await execAsync('git rev-parse --git-dir');
            } catch {
                return {
                    success: false,
                    message: 'Not a git repository. Initialize git first with: git init'
                };
            }

            // Get plugin path
            const plugin = this.pluginManager.getPlugin(pluginName);
            if (!plugin) {
                return {
                    success: false,
                    message: `Plugin '${pluginName}' not found`
                };
            }

            // Check git status for the plugin directory
            const pluginPath = `plugins/${pluginName}`;
            const { stdout: statusOutput } = await execAsync(`git status --porcelain ${pluginPath}`);

            if (!statusOutput.trim()) {
                return {
                    success: true,
                    message: `No changes to commit for plugin '${pluginName}'`
                };
            }

            // Add plugin files to git
            this.info(`Adding files to git...`);
            await execAsync(`git add ${pluginPath}`);

            // Create commit
            this.info(`Creating commit...`);
            const commitMessage = this.formatCommitMessage(pluginName, message);
            await execAsync(`git commit -m "${commitMessage}"`);

            // Get commit hash
            const { stdout: commitHash } = await execAsync('git rev-parse --short HEAD');

            this.info(`Plugin '${pluginName}' committed successfully`);
            this.info(`Commit: ${commitHash.trim()}`);

            return {
                success: true,
                data: {
                    plugin: pluginName,
                    commit: commitHash.trim(),
                    message: commitMessage
                },
                message: `Plugin '${pluginName}' committed: ${commitHash.trim()}`
            };

        } catch (error) {
            this.error('Failed to commit plugin', error as Error);
            return {
                success: false,
                error: error as Error,
                message: `Failed to commit plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Format commit message with emoji and structure
     */
    private formatCommitMessage(pluginName: string, userMessage: string): string {
        const emoji = '🤖';
        const formattedMessage = `${emoji} ${userMessage}

Generated with imajin-cli Self-Extension System

Co-Authored-By: Claude <noreply@anthropic.com>`;

        return formattedMessage;
    }
}
