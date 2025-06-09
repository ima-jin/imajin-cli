/**
 * Command Interfaces - Type definitions for command system
 * 
 * @package     @imajin/cli
 * @subpackage  core/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

export interface CommandResult {
    success: boolean;
    data?: any;
    message?: string;
    error?: Error;
}

export interface CommandArgument {
    name: string;
    description: string;
    required: boolean;
    type: string;
    choices?: string[];
}

export interface CommandOption {
    name: string;
    description: string;
    type: string;
    required: boolean;
    choices?: string[];
} 