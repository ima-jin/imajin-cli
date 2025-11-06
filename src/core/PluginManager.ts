/**
 * PluginManager - Plugin loading and management
 * 
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Plugin discovery and loading
 * - Command registration from plugins
 * - Plugin lifecycle management
 * - Service provider integration
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import type { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import type { CommandManager, ICommand } from './commands/CommandManager.js';

export interface PluginInfo {
    name: string;
    version: string;
    description: string;
    path: string;
    loaded: boolean;
    commands: string[];
}

export interface LoadedPlugin {
    info: PluginInfo;
    module: any;
    commands: any[];
}

export class PluginManager {
    private plugins: Map<string, LoadedPlugin> = new Map();
    private pluginsDirectory: string;

    constructor(
        private commandManager: CommandManager,
        private container: Container,
        private logger?: Logger,
        pluginsDir?: string
    ) {
        this.pluginsDirectory = pluginsDir || join(process.cwd(), 'plugins');
    }

    /**
     * Discover and load all plugins
     */
    async loadAllPlugins(): Promise<void> {
        try {
            const pluginDirs = await this.discoverPlugins();

            for (const pluginDir of pluginDirs) {
                try {
                    await this.loadPlugin(pluginDir);
                } catch (error) {
                    this.logger?.error(`Failed to load plugin from ${pluginDir}`, error as Error);
                }
            }

            this.logger?.info(`Loaded ${this.plugins.size} plugins`);
        } catch (error) {
            this.logger?.error('Failed to load plugins', error as Error);
        }
    }

    /**
     * Load a specific plugin
     */
    async loadPlugin(pluginPath: string): Promise<LoadedPlugin> {
        const configPath = join(pluginPath, 'index.js');

        // Check if plugin exists
        try {
            await fs.access(configPath);
        } catch {
            throw new Error(`Plugin not found at ${configPath}`);
        }

        // Load plugin module
        const pluginModule = await import(resolve(configPath));

        // Extract plugin info
        const _config = pluginModule.default || pluginModule;
        const pluginInfo: PluginInfo = {
            name: _config.name || 'unknown',
            version: _config.version || '1.0.0',
            description: _config.description || 'No description',
            path: pluginPath,
            loaded: true,
            commands: _config.commands || []
        };

        // Register commands
        const commands = await this.registerPluginCommands(pluginModule, pluginInfo);

        const loadedPlugin: LoadedPlugin = {
            info: pluginInfo,
            module: pluginModule,
            commands
        };

        this.plugins.set(pluginInfo.name, loadedPlugin);

        this.logger?.info(`Loaded plugin: ${pluginInfo.name} v${pluginInfo.version}`);

        return loadedPlugin;
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(pluginName: string): Promise<void> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        // TODO: Unregister commands when CommandManager supports it

        this.plugins.delete(pluginName);
        this.logger?.info(`Unloaded plugin: ${pluginName}`);
    }

    /**
     * Get all loaded plugins
     */
    getLoadedPlugins(): PluginInfo[] {
        return Array.from(this.plugins.values()).map(plugin => plugin.info);
    }

    /**
     * Get specific plugin
     */
    getPlugin(name: string): LoadedPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Check if plugin is loaded
     */
    isPluginLoaded(name: string): boolean {
        return this.plugins.has(name);
    }

    /**
     * Discover plugins in the plugins directory
     */
    private async discoverPlugins(): Promise<string[]> {
        const pluginDirs: string[] = [];

        try {
            const entries = await fs.readdir(this.pluginsDirectory, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pluginPath = join(this.pluginsDirectory, entry.name);
                    const indexPath = join(pluginPath, 'index.js');

                    try {
                        await fs.access(indexPath);
                        pluginDirs.push(pluginPath);
                    } catch {
                        // Skip directories without index.js
                    }
                }
            }
        } catch (error) {
            this.logger?.warn(`Plugins directory not found: ${this.pluginsDirectory}`);
        }

        return pluginDirs;
    }

    /**
     * Register commands from a plugin
     */
    private async registerPluginCommands(pluginModule: any, pluginInfo: PluginInfo): Promise<any[]> {
        const commands: any[] = [];

        try {
            // Look for command exports
            for (const [exportName, exportValue] of Object.entries(pluginModule)) {
                if (exportName.endsWith('Command') && typeof exportValue === 'function') {
                    try {
                        // Create command instance
                        const commandInstance = this.container.resolve(exportValue as any) as ICommand;

                        // Verify it's a valid command
                        if (commandInstance && typeof commandInstance.execute === 'function' && commandInstance.name) {
                            // Register with command manager
                            this.commandManager.register(commandInstance);
                            commands.push(commandInstance);

                            this.logger?.info(`Registered command: ${commandInstance.name}`);
                        } else {
                            this.logger?.warn(`Invalid command export: ${exportName}`);
                        }
                    } catch (error) {
                        this.logger?.error(`Failed to register command ${exportName}`, error as Error);
                    }
                }
            }
        } catch (error) {
            this.logger?.error(`Failed to register commands for plugin ${pluginInfo.name}`, error as Error);
        }

        return commands;
    }

    /**
     * Reload a plugin
     */
    async reloadPlugin(pluginName: string): Promise<void> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin ${pluginName} not found`);
        }

        const pluginPath = plugin.info.path;

        // Unload first
        await this.unloadPlugin(pluginName);

        // Clear module cache
        const configPath = resolve(join(pluginPath, 'index.js'));
        delete require.cache[configPath];

        // Reload
        await this.loadPlugin(pluginPath);
    }

    /**
     * Get plugin statistics
     */
    getStats(): {
        totalPlugins: number;
        loadedPlugins: number;
        totalCommands: number;
    } {
        const totalCommands = Array.from(this.plugins.values())
            .reduce((sum, plugin) => sum + plugin.commands.length, 0);

        return {
            totalPlugins: this.plugins.size,
            loadedPlugins: this.plugins.size,
            totalCommands
        };
    }
} 