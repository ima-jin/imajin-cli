/**
 * CommandLimiterCommands - CLI commands for managing git command filtering
 * 
 * @package     @imajin/cli
 * @subpackage  commands/system
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-01
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getCommandLimiter } from '../../utils/CommandLimiter.js';
import type { Logger } from '../../logging/Logger.js';

export function createCommandLimiterCommands(logger: Logger): Command {
    const cmd = new Command('command-limiter')
        .description('Manage git command filtering and security')
        .alias('limiter');

    // Show allowed git commands
    cmd.command('list')
        .description('List allowed git command patterns')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const limiter = getCommandLimiter(logger);
                const patterns = await limiter.getAllowedPatterns();

                if (options.json) {
                    console.log(JSON.stringify({ patterns }, null, 2));
                } else {
                    console.log(chalk.blue('🔒 Allowed Git Command Patterns'));
                    console.log(chalk.yellow(`Found ${patterns.length} allowed patterns:\n`));
                    
                    if (patterns.length === 0) {
                        console.log(chalk.red('  No git commands are currently allowed'));
                        console.log(chalk.yellow('  Add patterns to .ai.gitallowed file to enable commands'));
                    } else {
                        patterns.forEach((pattern, index) => {
                            console.log(`  ${index + 1}. ${chalk.green(pattern)}`);
                        });
                    }
                    
                    console.log(chalk.gray('\nPatterns are loaded from .ai.gitallowed file'));
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to list allowed patterns:'), error);
                process.exit(1);
            }
        });

    // Test if a command would be allowed
    cmd.command('test')
        .description('Test if a git command would be allowed')
        .argument('<command>', 'Git command to test (e.g., "git status --porcelain")')
        .option('--json', 'Output result in JSON format')
        .action(async (command, options) => {
            try {
                const limiter = getCommandLimiter(logger);
                const validation = await limiter.validateCommand(command);

                if (options.json) {
                    console.log(JSON.stringify(validation, null, 2));
                } else {
                    console.log(chalk.blue('🧪 Command Validation Test'));
                    console.log(chalk.cyan(`Command: ${command}\n`));
                    
                    if (validation.allowed) {
                        console.log(chalk.green('✅ ALLOWED'));
                        if (validation.matchedPattern) {
                            console.log(chalk.yellow(`Matched pattern: ${validation.matchedPattern}`));
                        }
                    } else {
                        console.log(chalk.red('❌ BLOCKED'));
                        if (validation.reason) {
                            console.log(chalk.yellow(`Reason: ${validation.reason}`));
                        }
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to test command:'), error);
                process.exit(1);
            }
        });

    // Check if .ai.gitallowed file exists
    cmd.command('status')
        .description('Show command limiter status and configuration')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const limiter = getCommandLimiter(logger);
                const hasFile = await limiter.hasAllowedFile();
                const patterns = hasFile ? await limiter.getAllowedPatterns() : [];

                const status = {
                    hasAllowedFile: hasFile,
                    allowedPatternsCount: patterns.length,
                    configPath: '.ai.gitallowed',
                    patterns: patterns
                };

                if (options.json) {
                    console.log(JSON.stringify(status, null, 2));
                } else {
                    console.log(chalk.blue('🔒 Command Limiter Status'));
                    console.log(chalk.cyan(`Configuration file: ${status.configPath}`));
                    console.log(chalk.cyan(`File exists: ${hasFile ? chalk.green('✅ Yes') : chalk.red('❌ No')}`));
                    console.log(chalk.cyan(`Allowed patterns: ${chalk.yellow(status.allowedPatternsCount)}`));
                    
                    if (hasFile) {
                        console.log(chalk.green('\n✅ Git command filtering is active'));
                        if (status.allowedPatternsCount === 0) {
                            console.log(chalk.yellow('⚠️  No patterns defined - all git commands will be blocked'));
                        }
                    } else {
                        console.log(chalk.red('\n❌ Configuration file missing - all git commands will be blocked'));
                        console.log(chalk.yellow('💡 Run "imajin limiter init" to create a default configuration'));
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to check status:'), error);
                process.exit(1);
            }
        });

    // Initialize .ai.gitallowed file
    cmd.command('init')
        .description('Create default .ai.gitallowed file if it doesn\'t exist')
        .option('--force', 'Overwrite existing file')
        .action(async (options) => {
            try {
                const limiter = getCommandLimiter(logger);
                const hasFile = await limiter.hasAllowedFile();

                if (hasFile && !options.force) {
                    console.log(chalk.yellow('⚠️  .ai.gitallowed file already exists'));
                    console.log(chalk.blue('Use --force to overwrite, or edit the file manually'));
                    return;
                }

                if (options.force) {
                    console.log(chalk.yellow('🔄 Overwriting existing .ai.gitallowed file...'));
                }

                await limiter.createDefaultAllowedFile();
                
                console.log(chalk.green('✅ Created .ai.gitallowed file with default safe git commands'));
                console.log(chalk.blue('💡 Edit the file to customize which commands are allowed'));
                
                // Show the created patterns
                const patterns = await limiter.getAllowedPatterns();
                console.log(chalk.cyan(`\nDefault patterns (${patterns.length}):`));
                patterns.forEach((pattern, index) => {
                    console.log(`  ${index + 1}. ${chalk.green(pattern)}`);
                });
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to initialize configuration:'), error);
                process.exit(1);
            }
        });

    return cmd;
} 