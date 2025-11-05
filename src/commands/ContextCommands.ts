/**
 * ContextCommands - CLI commands for context management
 * 
 * @package     @imajin/cli
 * @subpackage  commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-08-03
 *
 * Integration Points:
 * - Context switching and management
 * - Recipe-based context initialization
 * - Context listing and inspection
 * - Future: Multi-context operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { BusinessContextManager } from '../context/BusinessContextManager.js';
import { RecipeManager } from '../context/RecipeManager.js';
import type { Logger } from '../logging/Logger.js';

export class ContextCommands {
  private contextManager: BusinessContextManager;
  private recipeManager: RecipeManager;
  private logger: Logger | null = null;

  constructor() {
    this.contextManager = new BusinessContextManager();
    this.recipeManager = new RecipeManager();

    // Get logger from container
    try {
      const container = (globalThis as any).imajinApp?.container;
      if (container) {
        this.logger = container.resolve('logger') as Logger;
      }
    } catch (error) {
      // Logger not available yet
    }
  }

  public register(program: Command): void {
    const contextCommand = program
      .command('context')
      .alias('ctx')
      .description('Context management commands');

    // List contexts
    contextCommand
      .command('list')
      .alias('ls')
      .description('List available contexts')
      .option('--format <format>', 'Output format (table, json)', 'table')
      .action(async (options) => {
        await this.listContexts(options);
      });

    // Initialize context from recipe
    contextCommand
      .command('init-recipe')
      .description('Initialize context from recipe')
      .argument('<contextName>', 'Context name to create')
      .option('-r, --recipe <recipe>', 'Recipe to use (e.g., project-management)')
      .option('--list-recipes', 'List available recipes', false)
      .action(async (contextName, options) => {
        if (options.listRecipes) {
          await this.listRecipes();
          return;
        }
        await this.initializeContext(contextName, options);
      });

    // Show context details
    contextCommand
      .command('show')
      .description('Show context details')
      .argument('<contextName>', 'Context name')
      .option('--format <format>', 'Output format (yaml, json)', 'yaml')
      .action(async (contextName, options) => {
        await this.showContext(contextName, options);
      });

    // Switch context (future feature)
    contextCommand
      .command('switch')
      .description('Switch to context')
      .argument('<contextName>', 'Context name')
      .action(async (contextName) => {
        await this.switchContext(contextName);
      });

    // List entities in context
    contextCommand
      .command('entities')
      .description('List entities in context')
      .argument('<contextName>', 'Context name')
      .option('-t, --type <type>', 'Entity type filter')
      .option('--format <format>', 'Output format (table, json)', 'table')
      .action(async (contextName, options) => {
        await this.listEntities(contextName, options);
      });

    // Recipe management
    contextCommand
      .command('recipes')
      .description('List available recipes')
      .option('--format <format>', 'Output format (table, json)', 'table')
      .action(async (options) => {
        await this.listRecipes(options);
      });
  }

  private async listContexts(options: { format: string }): Promise<void> {
    try {
      this.logger?.debug('context list command starting', { format: options.format });
      const contexts = await this.contextManager.listContexts();

      this.logger?.info('context list command completed', { contextCount: contexts.length });

      if (contexts.length === 0) {
        console.log(chalk.yellow('No contexts found. Use "imajin context init" to create one.'));
        return;
      }

      if (options.format === 'json') {
        const contextDetails = [];
        for (const context of contexts) {
          const metadata = await this.contextManager.getContextMetadata(context);
          contextDetails.push({
            name: context,
            metadata: metadata || null
          });
        }
        console.log(JSON.stringify(contextDetails, null, 2));
      } else {
        console.log(chalk.blue(`\n🌍 Available Contexts (${contexts.length} found):`));
        console.log('');

        for (const context of contexts) {
          const metadata = await this.contextManager.getContextMetadata(context);
          
          console.log(chalk.green(`📁 ${context}`));
          if (metadata) {
            console.log(chalk.gray(`   ${metadata.description || 'No description'}`));
            console.log(chalk.gray(`   Type: ${metadata.businessType || 'Unknown'}`));
            if (metadata.display?.emoji) {
              console.log(chalk.gray(`   ${metadata.display.emoji} ${metadata.display.subCode || ''}`));
            }
          }
          console.log('');
        }
      }

    } catch (error) {
      this.logger?.error('context list command failed', error as Error, { format: options.format });
      console.error(chalk.red('❌ Failed to list contexts:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async initializeContext(contextName: string, options: { recipe?: string }): Promise<void> {
    try {
      this.logger?.debug('context init-recipe command starting', { contextName, recipe: options.recipe });

      // Check if context already exists
      const exists = await this.contextManager.contextExists(contextName);
      if (exists) {
        this.logger?.error('context init-recipe command failed - context already exists', new Error(`Context "${contextName}" already exists`), { contextName });
        console.error(chalk.red(`❌ Context "${contextName}" already exists`));
        process.exit(1);
      }

      const recipeName = options.recipe || 'project-management';
      console.log(chalk.blue(`🎯 Initializing context "${contextName}" with recipe "${recipeName}"...`));

      // Load recipe
      const recipe = await this.recipeManager.getRecipe(recipeName);
      if (!recipe) {
        console.error(chalk.red(`❌ Recipe "${recipeName}" not found`));
        console.log(chalk.gray('Available recipes:'));
        const recipes = await this.recipeManager.listRecipes();
        recipes.forEach(r => console.log(chalk.gray(`  • ${r.businessType}: ${r.description}`)));
        process.exit(1);
      }

      // Initialize context
      await this.contextManager.initializeFromRecipe(recipe, contextName);

      this.logger?.info('context init-recipe command completed', {
        contextName,
        recipe: recipe.businessType,
        entities: recipe.entities ? Object.keys(recipe.entities) : []
      });

      console.log(chalk.green(`✅ Context "${contextName}" initialized successfully`));
      console.log(chalk.gray(`Recipe: ${recipe.name}`));
      console.log(chalk.gray(`Type: ${recipe.businessType}`));

      if (recipe.entities) {
        const entityTypes = Object.keys(recipe.entities);
        console.log(chalk.gray(`Entities: ${entityTypes.join(', ')}`));
      }

    } catch (error) {
      this.logger?.error('context init-recipe command failed', error as Error, { contextName, recipe: options.recipe });
      console.error(chalk.red('❌ Failed to initialize context:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async showContext(contextName: string, options: { format: string }): Promise<void> {
    try {
      this.logger?.debug('context show command starting', { contextName, format: options.format });

      const exists = await this.contextManager.contextExists(contextName);
      if (!exists) {
        this.logger?.error('context show command failed - context not found', new Error(`Context "${contextName}" not found`), { contextName });
        console.error(chalk.red(`❌ Context "${contextName}" not found`));
        process.exit(1);
      }

      const metadata = await this.contextManager.getContextMetadata(contextName);
      if (!metadata) {
        this.logger?.error('context show command failed - metadata not found', new Error(`Context metadata not found for "${contextName}"`), { contextName });
        console.error(chalk.red(`❌ Context metadata not found for "${contextName}"`));
        process.exit(1);
      }

      this.logger?.info('context show command completed', { contextName, format: options.format });

      if (options.format === 'json') {
        console.log(JSON.stringify(metadata, null, 2));
      } else {
        const yaml = await import('js-yaml');
        console.log(yaml.dump(metadata, { indent: 2 }));
      }

    } catch (error) {
      this.logger?.error('context show command failed', error as Error, { contextName, format: options.format });
      console.error(chalk.red('❌ Failed to show context:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async switchContext(contextName: string): Promise<void> {
    try {
      this.logger?.debug('context switch command starting', { contextName });

      const exists = await this.contextManager.contextExists(contextName);
      if (!exists) {
        this.logger?.error('context switch command failed - context not found', new Error(`Context "${contextName}" not found`), { contextName });
        console.error(chalk.red(`❌ Context "${contextName}" not found`));
        process.exit(1);
      }

      await this.contextManager.switchToContext(contextName);

      this.logger?.info('context switch command completed', { contextName });
      console.log(chalk.green(`✅ Switched to context: ${contextName}`));

    } catch (error) {
      this.logger?.error('context switch command failed', error as Error, { contextName });
      console.error(chalk.red('❌ Failed to switch context:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async listEntities(contextName: string, options: { type?: string; format: string }): Promise<void> {
    try {
      this.logger?.debug('context entities command starting', { contextName, type: options.type, format: options.format });

      const exists = await this.contextManager.contextExists(contextName);
      if (!exists) {
        this.logger?.error('context entities command failed - context not found', new Error(`Context "${contextName}" not found`), { contextName });
        console.error(chalk.red(`❌ Context "${contextName}" not found`));
        process.exit(1);
      }

      const metadata = await this.contextManager.getContextMetadata(contextName);
      if (!metadata) {
        this.logger?.error('context entities command failed - metadata not found', new Error(`Context metadata not found for "${contextName}"`), { contextName });
        console.error(chalk.red(`❌ Context metadata not found for "${contextName}"`));
        process.exit(1);
      }

      // Get available entity types
      const entityTypes: string[] = (metadata as any).entities || [];
      let typesToShow: string[] = entityTypes;

      if (options.type) {
        if (!entityTypes.includes(options.type)) {
          console.error(chalk.red(`❌ Entity type "${options.type}" not found in context`));
          console.log(chalk.gray('Available types:'), entityTypes.join(', '));
          process.exit(1);
        }
        typesToShow = [options.type];
      }

      if (options.format === 'json') {
        const entitiesData: any = {};
        for (const entityType of typesToShow) {
          const entities = await this.contextManager.loadContextEntities(contextName, entityType);
          entitiesData[entityType] = entities;
        }
        this.logger?.info('context entities command completed', { contextName, entityTypes: typesToShow });
        console.log(JSON.stringify(entitiesData, null, 2));
      } else {
        console.log(chalk.blue(`\n📋 Entities in "${contextName}":`));

        let totalEntities = 0;
        for (const entityType of typesToShow) {
          const entities = await this.contextManager.loadContextEntities(contextName, entityType);
          totalEntities += entities.length;

          console.log(chalk.green(`\n${entityType} (${entities.length}):`));
          if (entities.length === 0) {
            console.log(chalk.gray('  No entities found'));
          } else {
            entities.forEach((entity: any) => {
              const title = entity.title || entity.name || entity.id || 'Untitled';
              console.log(chalk.white(`  • ${entity.id}: ${title}`));
            });
          }
        }
        this.logger?.info('context entities command completed', { contextName, entityTypes: typesToShow, totalEntities });
      }

    } catch (error) {
      this.logger?.error('context entities command failed', error as Error, { contextName, type: options.type });
      console.error(chalk.red('❌ Failed to list entities:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private async listRecipes(options: { format?: string } = {}): Promise<void> {
    try {
      this.logger?.debug('context recipes command starting', { format: options.format });
      const recipes = await this.recipeManager.listRecipes();

      this.logger?.info('context recipes command completed', { recipeCount: recipes.length });

      if (recipes.length === 0) {
        console.log(chalk.yellow('No recipes found'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(recipes, null, 2));
      } else {
        console.log(chalk.blue(`\n📚 Available Recipes (${recipes.length} found):`));
        console.log('');

        recipes.forEach(recipe => {
          const emoji = recipe.display?.emoji || '📋';
          const subCode = recipe.display?.subCode || recipe.businessType;

          console.log(chalk.green(`${emoji} ${recipe.businessType}`));
          console.log(chalk.gray(`   ${recipe.description}`));
          console.log(chalk.gray(`   Code: ${subCode}`));

          if (recipe.context?.primaryEntities) {
            console.log(chalk.gray(`   Entities: ${recipe.context.primaryEntities.join(', ')}`));
          }
          console.log('');
        });
      }

    } catch (error) {
      this.logger?.error('context recipes command failed', error as Error, { format: options.format });
      console.error(chalk.red('❌ Failed to list recipes:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}