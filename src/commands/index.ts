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
 *
 * Integration Points:
 * - Registers all CLI commands with the main program
 * - Provides centralized command organization
 * - Supports plugin-based command loading
 */

import { Command } from 'commander';
import { registerSchemaCommands } from './schema/SchemaCommands.js';

// =============================================================================
// COMMAND REGISTRATION
// =============================================================================

/**
 * Register all available commands with the CLI program
 */
export function registerCommands(program: Command): void {
    // Schema management commands (new external schema system)
    registerSchemaCommands(program);
    
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
        case 'services':
            return 'Service integration and management commands';
        default:
            return 'Unknown command group';
    }
} 