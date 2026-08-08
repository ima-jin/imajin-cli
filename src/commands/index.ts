/**
 * Commands Index - Main command registration
 * 
 * @package     @imajin/cli
 * @subpackage  commands
 * @author      Generated  
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Registers all CLI commands with the main program
 * - Provides centralized command organization
 * - Supports plugin-based command loading
 */

import { Command } from 'commander';
import { registerSchemaCommands } from './schema/SchemaCommands.js';
import { createCommandLimiterCommands } from './system/CommandLimiterCommands.js';
import { TaskMigrationCommand } from './TaskMigrationCommand.js';
import { TaskManagementCommands } from './TaskManagementCommands.js';
import { VaultCommands } from './vault/VaultCommands.js';

// =============================================================================
// COMMAND REGISTRATION
// =============================================================================

/**
 * Register all available commands with the CLI program
 */
export function registerCommands(program: Command): void {
    // Schema management commands (new external schema system)
    registerSchemaCommands(program);
    
    // Command limiter and security commands
    const logger = (globalThis as any).imajinApp?.container?.resolve('logger');
    if (logger) {
        program.addCommand(createCommandLimiterCommands(logger));
    }
    
    // Task management commands (Task-011 implementation)
    const taskMigrationCommand = new TaskMigrationCommand();
    taskMigrationCommand.register(program);
    
    const taskManagementCommands = new TaskManagementCommands();
    taskManagementCommands.register(program);
    
    // Vault commands (encrypted secrets store)
    if (logger) {
        const vaultCommands = new VaultCommands(logger);
        vaultCommands.registerCommands(program);
    }
    
    // Add other command groups here as they're implemented
    // registerServiceCommands(program);
    // registerGenerateCommands(program);
    // registerWorkflowCommands(program);
    // registerConfigCommands(program);
}

/**
 * Get available command groups
 */
export function getAvailableCommandGroups(): string[] {
    return [
        'schema',
        'command-limiter',
        'task',
        'vault',
        // Add other groups as implemented
        // 'services',
        // 'generate',
        // 'workflow',
    ];
}

/**
 * Get command group description
 */
export function getCommandGroupDescription(group: string): string {
    switch (group) {
        case 'schema':
            return 'External schema management and validation commands';
        case 'command-limiter':
            return 'Git command filtering and security management';
        case 'task':
            return 'Task management, migration, and lifecycle commands';
        case 'vault':
            return 'Encrypted config/secrets store for Imajin nodes';
        case 'services':
            return 'Service integration and management commands';
        default:
            return 'Unknown command group';
    }
} 