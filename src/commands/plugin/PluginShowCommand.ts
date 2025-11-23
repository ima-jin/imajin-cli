/**
 * PluginShowCommand - Display plugin source code
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
 * - PluginManager for plugin information
 * - File system for reading plugin source
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { BaseCommand } from '../../core/commands/BaseCommand.js';
import type { CommandResult } from '../../core/commands/interfaces.js';
import type { PluginManager } from '../../core/PluginManager.js';
import type { Logger } from '../../logging/Logger.js';

export class PluginShowCommand extends BaseCommand {
    public readonly name = 'plugin:show';
    public readonly description = 'Display plugin source code';

    constructor(
        private pluginManager: PluginManager,
        logger?: Logger
    ) {
        super(logger);
    }

    async execute(args: string[], options: any): Promise<CommandResult> {
        try {
            const pluginName = options.name || options.plugin;

            if (!pluginName) {
                return {
                    success: false,
                    message: 'Plugin name is required. Use --name <plugin>'
                };
            }

            // Check if plugin exists
            if (!this.pluginManager.isPluginLoaded(pluginName)) {
                return {
                    success: false,
                    message: `Plugin '${pluginName}' not found or not loaded`
                };
            }

            // Get plugin info
            const plugin = this.pluginManager.getPlugin(pluginName);
            if (!plugin) {
                return {
                    success: false,
                    message: `Plugin '${pluginName}' not found`
                };
            }

            // Read plugin files
            const files = await this.readPluginFiles(plugin.info.path, options.file);

            if (files.size === 0) {
                return {
                    success: false,
                    message: 'No files found in plugin'
                };
            }

            // Display files
            let output = `\n=== Plugin: ${pluginName} ===\n`;
            output += `Path: ${plugin.info.path}\n`;
            output += `Version: ${plugin.info.version}\n`;
            output += `Commands: ${plugin.info.commands.join(', ')}\n\n`;

            for (const [filePath, content] of files) {
                output += `\n--- ${filePath} ---\n`;
                output += content;
                output += `\n${'='.repeat(60)}\n`;
            }

            // Output to console
            console.log(output);

            return {
                success: true,
                data: {
                    plugin: plugin.info,
                    files: Object.fromEntries(files)
                },
                message: `Plugin '${pluginName}' source displayed`
            };

        } catch (error) {
            this.error('Failed to show plugin', error as Error);
            return {
                success: false,
                error: error as Error,
                message: `Failed to show plugin: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Read all plugin files or specific file
     */
    private async readPluginFiles(
        pluginPath: string,
        specificFile?: string
    ): Promise<Map<string, string>> {
        const files = new Map<string, string>();

        if (specificFile) {
            // Read specific file
            const fullPath = join(pluginPath, specificFile);
            try {
                const content = await fs.readFile(fullPath, 'utf-8');
                files.set(specificFile, content);
            } catch (error) {
                this.warn(`Could not read file: ${specificFile}`);
            }
        } else {
            // Read all plugin files
            await this.readDirectoryRecursive(pluginPath, pluginPath, files);
        }

        return files;
    }

    /**
     * Recursively read directory files
     */
    private async readDirectoryRecursive(
        basePath: string,
        currentPath: string,
        files: Map<string, string>
    ): Promise<void> {
        try {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    // Skip node_modules and hidden directories
                    if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                        await this.readDirectoryRecursive(basePath, fullPath, files);
                    }
                } else if (entry.isFile()) {
                    // Only read source files
                    if (this.isSourceFile(entry.name)) {
                        const content = await fs.readFile(fullPath, 'utf-8');
                        const relativePath = fullPath.replace(basePath, '').replace(/^[\\\/]/, '');
                        files.set(relativePath, content);
                    }
                }
            }
        } catch (error) {
            this.warn(`Could not read directory: ${currentPath}`);
        }
    }

    /**
     * Check if file is a source file
     */
    private isSourceFile(filename: string): boolean {
        const sourceExtensions = ['.ts', '.js', '.json'];
        return sourceExtensions.some(ext => filename.endsWith(ext));
    }
}
