/**
 * RecipeCommands - CLI commands for business recipe templates
 * 
 * @package     @imajin/cli
 * @subpackage  commands/generated
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-25
 *
 * Integration Points:
 * - Recipe template discovery and listing
 * - Business context initialization from recipes
 * - Integration with BusinessContextManager
 * - Future: Community recipe sharing and contribution
 */

import { Command } from 'commander';
import { RecipeManager } from '../../context/RecipeManager.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';
import chalk from 'chalk';
import type { Logger } from '../../logging/Logger.js';
import { CommonOptions } from '../../utils/commonOptions.js';

export function createRecipeCommands(): Command {
    const cmd = new Command('recipes');
    cmd.description('Manage business recipe templates');

    // Get logger instance
    let logger: Logger | null = null;
    try {
        const container = (globalThis as any).imajinApp?.container;
        if (container) {
            logger = container.resolve('logger') as Logger;
        }
    } catch (error) {
        // Logger not available
    }

    // List available recipes
    cmd.command('list')
        .description('List available business recipe templates')
        .addOption(CommonOptions.json())
        .action(async (options) => {
            try {
                logger?.debug('Listing recipe templates', { json: !!options.json });
                const recipeManager = new RecipeManager();
                const recipes = await recipeManager.listRecipes();
                
                if (options.json) {
                    console.log(JSON.stringify(recipes, null, 2));
                } else {
                    console.log(chalk.blue('📚 Available Business Recipe Templates:\n'));
                    
                    for (const recipe of recipes) {
                        console.log(chalk.cyan(`  • ${chalk.bold(recipe.businessType)}`));
                        console.log(chalk.gray(`    ${recipe.name} - ${recipe.description}`));
                        console.log(chalk.gray(`    Entities: ${Object.keys(recipe.entities).join(', ')}\n`));
                    }
                    
                    console.log(chalk.yellow('💡 Usage:'));
                    console.log(chalk.gray('   imajin init recipe --type <businessType>'));
                    console.log(chalk.gray('   imajin init recipe --type coffee-shop'));
                }

                logger?.info('Recipe templates listed', { count: recipes.length });

            } catch (error) {
                logger?.error('Failed to list recipes', error as Error);
                console.error(chalk.red('❌ Failed to list recipes:'), error);
                process.exit(1);
            }
        });

    return cmd;
} 