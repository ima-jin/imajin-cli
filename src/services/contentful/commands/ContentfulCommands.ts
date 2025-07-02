/**
 * ContentfulCommands - CLI commands for Contentful content management
 * 
 * @package     @imajin/cli
 * @subpackage  services/contentful/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-25
 *
 * Integration Points:
 * - ContentfulService for content operations
 * - Commander.js for CLI interface
 * - JSON output for LLM integration
 * - Generic business context mapping
 */

import { Command } from 'commander';
import chalk from 'chalk';
import type { Recipe } from '../../../context/RecipeManager.js';
import { RecipeManager } from '../../../context/RecipeManager.js';
import { Container } from '../../../container/Container.js';

// Global application instance (set during boot)
declare global {
    var imajinApp: any;
}

// Types for Contentful content type creation
interface ContentfulField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    validations?: any[];
    items?: {
        type: string;
        linkType?: string;
        validations?: any[];
    };
}

interface ContentfulContentType {
    id: string;
    name: string;
    description: string;
    fields: ContentfulField[];
}

interface RecipeField {
    name: string;
    type: string;
    required?: boolean;
    values?: string[];
    items?: string;
    linkType?: string;
    schema?: {
        type: string;
        properties?: Record<string, any>;
    };
}

interface RecipeEntity {
    fields?: RecipeField[];
}

export function createContentfulCommands(): Command {
    const cmd = new Command('contentful');
    cmd.description('Universal content management operations using Contentful CMS (works with any business recipe)');

    // Content listing and browsing
    const contentCmd = cmd.command('content')
        .description('Content entry operations');

    contentCmd.command('list')
        .description('List content entries')
        .option('-t, --type <type>', 'Content type filter')
        .option('-l, --limit <limit>', 'Number of entries to return', '10')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const { Container } = await import('../../../container/Container.js');
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                const content = await contentfulService.getContent(
                    options.type,
                    parseInt(options.limit)
                );

                if (options.json) {
                    console.log(JSON.stringify(content, null, 2));
                } else {
                    console.log(chalk.blue('📚 Content Entries:\n'));
                    
                    if (content.length === 0) {
                        console.log(chalk.yellow('No content entries found.'));
                        return;
                    }
                    
                    for (const item of content) {
                        console.log(chalk.cyan(`• ${chalk.bold(item.title)}`));
                        console.log(chalk.gray(`  ID: ${item.id}`));
                        console.log(chalk.gray(`  Type: ${item.contentType}`));
                        if (item.description) {
                            const truncatedDesc = item.description.length > 100 
                                ? item.description.substring(0, 100) + '...' 
                                : item.description;
                            console.log(chalk.gray(`  Description: ${truncatedDesc}`));
                        }
                        if (item.publishedAt) {
                            console.log(chalk.gray(`  Published: ${item.publishedAt.toLocaleDateString()}`));
                        }
                        if (item.tags && item.tags.length > 0) {
                            console.log(chalk.gray(`  Tags: ${item.tags.join(', ')}`));
                        }
                        console.log();
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to list content:'), error);
                process.exit(1);
            }
        });

    contentCmd.command('get <id>')
        .description('Get specific content entry by ID')
        .option('--json', 'Output in JSON format')
        .action(async (id, options) => {
            try {
                const { Container } = await import('../../../container/Container.js');
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                const entry = await contentfulService.getEntry(id);

                if (!entry) {
                    console.log(chalk.yellow(`⚠️  Entry not found: ${id}`));
                    return;
                }

                if (options.json) {
                    console.log(JSON.stringify(entry, null, 2));
                } else {
                    console.log(chalk.blue('📄 Content Entry:\n'));
                    console.log(chalk.cyan(`Title: ${chalk.bold(entry.title)}`));
                    console.log(chalk.cyan(`ID: ${entry.id}`));
                    console.log(chalk.cyan(`Type: ${entry.contentType}`));
                    if (entry.description) {
                        console.log(chalk.cyan(`Description: ${entry.description}`));
                    }
                    if (entry.publishedAt) {
                        console.log(chalk.cyan(`Published: ${entry.publishedAt.toLocaleDateString()}`));
                    }
                    if (entry.tags && entry.tags.length > 0) {
                        console.log(chalk.cyan(`Tags: ${entry.tags.join(', ')}`));
                    }
                    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
                        console.log(chalk.cyan('Metadata:'));
                        Object.entries(entry.metadata).forEach(([key, value]) => {
                            console.log(chalk.gray(`  ${key}: ${value}`));
                        });
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to get entry:'), error);
                process.exit(1);
            }
        });

    contentCmd.command('search <query>')
        .description('Search content across all types')
        .option('-t, --types <types>', 'Comma-separated content types to search')
        .option('--json', 'Output in JSON format')
        .action(async (query, options) => {
            try {
                const { Container } = await import('../../../container/Container.js');
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                const contentTypes = options.types ? options.types.split(',') : undefined;
                const content = await contentfulService.searchContent(query, contentTypes);

                if (options.json) {
                    console.log(JSON.stringify(content, null, 2));
                } else {
                    console.log(chalk.blue(`🔍 Search Results for "${query}":\n`));
                    
                    if (content.length === 0) {
                        console.log(chalk.yellow('No results found.'));
                        return;
                    }

                    for (const item of content) {
                        console.log(chalk.cyan(`• ${chalk.bold(item.title)}`));
                        console.log(chalk.gray(`  ID: ${item.id}`));
                        console.log(chalk.gray(`  Type: ${item.contentType}`));
                        if (item.description) {
                            const truncatedDesc = item.description.length > 100 
                                ? item.description.substring(0, 100) + '...' 
                                : item.description;
                            console.log(chalk.gray(`  Description: ${truncatedDesc}`));
                        }
                        console.log();
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to search content:'), error);
                process.exit(1);
            }
        });

    // Events/time-based content
    cmd.command('events')
        .description('Get upcoming events from content')
        .option('-l, --limit <limit>', 'Number of events to return', '5')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const { Container } = await import('../../../container/Container.js');
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                const events = await contentfulService.getUpcomingEvents(parseInt(options.limit));

                if (options.json) {
                    console.log(JSON.stringify(events, null, 2));
                } else {
                    console.log(chalk.blue('📅 Upcoming Events:\n'));
                    
                    if (events.length === 0) {
                        console.log(chalk.yellow('No upcoming events found.'));
                        return;
                    }

                    for (const event of events) {
                        console.log(chalk.cyan(`• ${chalk.bold(event.title)}`));
                        if (event.metadata?.venue) {
                            console.log(chalk.gray(`  Venue: ${event.metadata.venue}`));
                        }
                        if (event.metadata?.eventDate) {
                            console.log(chalk.gray(`  Date: ${new Date(event.metadata.eventDate).toLocaleDateString()}`));
                        }
                        if (event.description) {
                            const truncatedDesc = event.description.length > 100 
                                ? event.description.substring(0, 100) + '...' 
                                : event.description;
                            console.log(chalk.gray(`  Description: ${truncatedDesc}`));
                        }
                        console.log();
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to get events:'), error);
                process.exit(1);
            }
        });

    // Generic product/item listing (could be tracks, products, etc.)
    cmd.command('items')
        .description('Get content items by type')
        .option('-t, --type <type>', 'Item type filter (e.g., product, track, article)')
        .option('-c, --category <category>', 'Category filter')
        .option('-l, --limit <limit>', 'Number of items to return', '20')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const { Container } = await import('../../../container/Container.js');
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                // Use getTracks method but with generic naming
                const items = await contentfulService.getTracks(options.category, parseInt(options.limit));

                if (options.json) {
                    console.log(JSON.stringify(items, null, 2));
                } else {
                    const itemType = options.type || 'item';
                    console.log(chalk.blue(`📦 ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}s:\n`));
                    
                    if (items.length === 0) {
                        console.log(chalk.yellow(`No ${itemType}s found.`));
                        return;
                    }

                    for (const item of items) {
                        console.log(chalk.cyan(`• ${chalk.bold(item.title)}`));
                        if (item.metadata) {
                            Object.entries(item.metadata).forEach(([key, value]) => {
                                if (value && key !== 'id') {
                                    console.log(chalk.gray(`  ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`));
                                }
                            });
                        }
                        console.log();
                    }
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to get items:'), error);
                process.exit(1);
            }
        });

    // Service status and configuration
    cmd.command('status')
        .description('Check Contentful service status')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const { Container } = await import('../../../container/Container.js');
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                const health = await contentfulService.getHealth();

                if (options.json) {
                    console.log(JSON.stringify(health, null, 2));
                } else {
                    console.log(chalk.blue('🔍 Contentful Service Status:\n'));
                    console.log(chalk.cyan(`Status: ${health.status}`));
                    console.log(chalk.cyan(`Service: ${health.name} v${health.version}`));
                    console.log(chalk.cyan(`Uptime: ${Math.round(health.uptime / 1000)}s`));
                    
                    if (health.checks.length > 0) {
                        console.log(chalk.cyan('\nHealth Checks:'));
                        for (const check of health.checks) {
                            const status = check.healthy ? chalk.green('✅') : chalk.red('❌');
                            console.log(`  ${status} ${check.name}: ${check.message || 'OK'}`);
                        }
                    }

                    console.log(chalk.cyan('\nMetrics:'));
                    console.log(chalk.gray(`  Operations: ${health.metrics.operationsCount}`));
                    console.log(chalk.gray(`  Errors: ${health.metrics.errorsCount}`));
                    console.log(chalk.gray(`  Avg Response Time: ${health.metrics.averageResponseTime}ms`));
                    console.log(chalk.gray(`  Last Activity: ${health.metrics.lastActivity.toLocaleString()}`));
                }
            } catch (error) {
                console.error(chalk.red('❌ Failed to get service status:'), error);
                process.exit(1);
            }
        });

    // Configuration helper
    cmd.command('config')
        .description('Show Contentful configuration requirements')
        .action(async () => {
            console.log(chalk.blue('⚙️  Contentful Configuration:\n'));
            console.log(chalk.cyan('Required Environment Variables:'));
            console.log(chalk.gray('  CONTENTFUL_SPACE_ID       - Your Contentful space ID'));
            console.log(chalk.gray('  CONTENTFUL_DELIVERY_TOKEN - Content Delivery API token'));
            console.log(chalk.cyan('\nOptional Environment Variables:'));
            console.log(chalk.gray('  CONTENTFUL_PREVIEW_TOKEN   - Preview API token (for unpublished content)'));
            console.log(chalk.gray('  CONTENTFUL_ENVIRONMENT_ID  - Environment ID (defaults to "master")'));
            console.log(chalk.cyan('\nCurrent Configuration:'));
            console.log(chalk.gray(`  Space ID: ${process.env.CONTENTFUL_SPACE_ID ? '✅ Set' : '❌ Not set'}`));
            console.log(chalk.gray(`  Delivery Token: ${process.env.CONTENTFUL_DELIVERY_TOKEN ? '✅ Set' : '❌ Not set'}`));
            console.log(chalk.gray(`  Preview Token: ${process.env.CONTENTFUL_PREVIEW_TOKEN ? '✅ Set' : '⚠️  Optional'}`));
            console.log(chalk.gray(`  Environment: ${process.env.CONTENTFUL_ENVIRONMENT_ID || 'master'}`));
        });

    // Bootstrap from existing recipe system
    cmd.command('bootstrap')
        .description('Bootstrap Contentful space from existing business recipe')
        .option('-c, --context <recipeId>', 'Business recipe context (use "imajin recipes list" to see options)')
        .option('--dry-run', 'Show what would be created without actually creating')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                if (!options.context) {
                    console.log(chalk.red('❌ --context is required'));
                    console.log(chalk.yellow('\n💡 Available contexts:'));
                    console.log(chalk.gray('   imajin recipes list  # See all available business recipes'));
                    console.log(chalk.gray('   imajin contentful bootstrap --context saas'));
                    console.log(chalk.gray('   imajin contentful bootstrap --context coffee-shop'));
                    return;
                }

                // Get services from global app
                const recipeManager = new RecipeManager();
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                // Load existing recipe
                const recipe = await recipeManager.getRecipe(options.context);
                if (!recipe) {
                    console.log(chalk.red(`❌ Recipe not found: ${options.context}`));
                    console.log(chalk.yellow('\n💡 Available recipes:'));
                    
                    const recipes = await recipeManager.listRecipes();
                    for (const r of recipes) {
                        console.log(chalk.gray(`   ${r.businessType} - ${r.description}`));
                    }
                    return;
                }

                // Convert recipe entities to Contentful content types
                const contentTypes = await convertRecipeToContentfulTypes(recipe);

                if (options.dryRun || options['dry-run']) {
                    if (options.json) {
                        console.log(JSON.stringify({ recipe, contentTypes }, null, 2));
                    } else {
                        console.log(chalk.blue(`🏗️  Bootstrap Plan for "${recipe.name}":\n`));
                        console.log(chalk.cyan(`Business Type: ${recipe.businessType}`));
                        console.log(chalk.cyan(`Description: ${recipe.description}\n`));
                        
                        console.log(chalk.blue('Content Types to Create:'));
                        contentTypes.forEach(ct => {
                            console.log(chalk.cyan(`  • ${ct.name} (${ct.id})`));
                            ct.fields.forEach(field => {
                                const required = field.required ? ' (required)' : '';
                                console.log(chalk.gray(`    - ${field.id}: ${field.type}${required}`));
                            });
                            console.log();
                        });
                    }
                    return;
                }

                // Actually bootstrap Contentful
                console.log(chalk.blue(`🚀 Bootstrapping Contentful with "${recipe.name}" recipe...\n`));
                
                const results = [];
                for (const contentType of contentTypes) {
                    console.log(chalk.cyan(`Creating content type: ${contentType.name}...`));
                    try {
                        const result = await contentfulService.createContentType(contentType);
                        results.push({ contentType: contentType.name, success: true, id: result.sys.id });
                        console.log(chalk.green(`✅ Created ${contentType.name}`));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        results.push({ contentType: contentType.name, success: false, error: errorMessage });
                        console.log(chalk.red(`❌ Failed to create ${contentType.name}: ${errorMessage}`));
                    }
                }

                if (options.json) {
                    console.log(JSON.stringify({ 
                        recipe: recipe.businessType, 
                        results 
                    }, null, 2));
                } else {
                    const successful = results.filter(r => r.success).length;
                    const total = results.length;
                    
                    console.log(chalk.green(`\n🎉 Bootstrap complete! ${successful}/${total} content types created`));
                    console.log(chalk.gray('Your Contentful space is now ready for business operations.'));
                    console.log(chalk.blue('\n📋 Next steps:'));
                    console.log(chalk.gray('   imajin contentful content list  # See your new content types'));
                    console.log(chalk.gray('   imajin contentful status        # Check service health'));
                }

            } catch (error) {
                console.error(chalk.red('❌ Failed to bootstrap Contentful:'), error);
                process.exit(1);
            }
        });

    // Delete content types
    cmd.command('delete-content-type')
        .description('Delete a content type (WARNING: This will delete the content type and all its entries)')
        .argument('<contentType>', 'Content type ID to delete')
        .option('--confirm', 'Confirm deletion (required for safety)')
        .action(async (contentType, options) => {
            try {
                if (!options.confirm) {
                    console.log(chalk.red('❌ --confirm is required for safety'));
                    console.log(chalk.yellow('⚠️  This will delete the content type and ALL its entries permanently!'));
                    console.log(chalk.gray(`   imajin contentful delete-content-type ${contentType} --confirm`));
                    return;
                }

                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');

                console.log(chalk.yellow(`⚠️  Deleting content type: ${contentType}...`));
                
                await contentfulService.deleteContentType(contentType);
                console.log(chalk.green(`✅ Content type '${contentType}' deleted successfully`));
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to delete content type:'), error);
                process.exit(1);
            }
        });

    // Production-safe migration command
    cmd.command('migrate')
        .description('Production-safe content type migration (preserves existing content)')
        .option('-c, --context <recipeId>', 'Business recipe context')
        .option('--dry-run', 'Show migration plan without executing')
        .option('--backup', 'Create content backup before migration (recommended)')
        .action(async (options) => {
            try {
                console.log(chalk.blue('🔄 Production-Safe Content Type Migration\n'));
                
                if (!options.context) {
                    console.log(chalk.red('❌ --context is required for migration'));
                    console.log(chalk.yellow('\n💡 Migration Strategy:'));
                    console.log(chalk.gray('   1. Analyze current content types vs recipe'));
                    console.log(chalk.gray('   2. Add new fields without removing old ones'));
                    console.log(chalk.gray('   3. Migrate data from old fields to new fields'));
                    console.log(chalk.gray('   4. Remove old fields after migration completes'));
                    console.log(chalk.gray('\n   imajin contentful migrate --context imajin-lighting --dry-run'));
                    return;
                }

                // Get services
                const recipeManager = new RecipeManager();
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');
                
                // Load recipe
                const recipe = await recipeManager.getRecipe(options.context);
                if (!recipe) {
                    console.log(chalk.red(`❌ Recipe not found: ${options.context}`));
                    return;
                }

                console.log(chalk.cyan(`Recipe: ${recipe.name}`));
                console.log(chalk.cyan(`Business Type: ${recipe.businessType}\n`));

                if (options.dryRun || options['dry-run']) {
                    console.log(chalk.yellow('🔍 Migration Analysis (Dry Run):\n'));
                    
                    console.log(chalk.blue('Migration Strategy:'));
                    console.log(chalk.gray('  1. 📊 Analyze existing content types'));
                    console.log(chalk.gray('  2. 🔄 Identify field changes needed'));
                    console.log(chalk.gray('  3. ➕ Add new fields (preserving existing data)'));
                    console.log(chalk.gray('  4. 📦 Migrate data to new field structures'));
                    console.log(chalk.gray('  5. 🧹 Clean up old fields after verification'));
                    
                    console.log(chalk.blue('\n⚠️  Production Safety Features:'));
                    console.log(chalk.gray('  • Zero data loss - existing content preserved'));
                    console.log(chalk.gray('  • Rollback capability at each step'));
                    console.log(chalk.gray('  • Backup creation before changes'));
                    console.log(chalk.gray('  • Step-by-step validation'));
                    
                    console.log(chalk.yellow('\n🚀 To execute migration:'));
                    console.log(chalk.gray(`   imajin contentful migrate --context ${options.context} --backup`));
                } else {
                    console.log(chalk.red('❌ Production migration not yet implemented'));
                    console.log(chalk.yellow('⚠️  This requires careful implementation with:'));
                    console.log(chalk.gray('   • Content backup/restore functionality'));
                    console.log(chalk.gray('   • Multi-phase migration orchestration'));
                    console.log(chalk.gray('   • Data transformation scripts'));
                    console.log(chalk.gray('   • Rollback mechanisms'));
                    console.log(chalk.blue('\n💡 For now, use development bootstrap:'));
                    console.log(chalk.gray('   imajin contentful bootstrap --context imajin-lighting --dry-run'));
                }

            } catch (error) {
                console.error(chalk.red('❌ Migration failed:'), error);
                process.exit(1);
            }
        });

    // Semantic schema management commands
    const schemaCmd = cmd.command('schema')
        .description('Semantic schema management and introspection');

    // Show current schema structure
    schemaCmd.command('show')
        .description('Show current content type schema')
        .argument('<contentType>', 'Content type to inspect')
        .option('--json', 'Output in JSON format')
        .action(async (contentType, options) => {
            try {
                const container = globalThis.imajinApp?.container || new Container();
                const contentfulService = container.resolve('contentfulService');

                console.log(chalk.blue(`📋 Schema for content type: ${contentType}\n`));
                
                // This would need to be implemented in ContentfulService
                // For now, show what it would look like
                console.log(chalk.yellow('⚠️  Schema introspection not yet implemented'));
                console.log(chalk.gray('Would show:'));
                console.log(chalk.gray('  • Field definitions'));
                console.log(chalk.gray('  • Field types and validations'));
                console.log(chalk.gray('  • Required vs optional fields'));
                console.log(chalk.gray('  • Relationship mappings'));
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to show schema:'), error);
                process.exit(1);
            }
        });

    // Compare current schema vs recipe
    schemaCmd.command('diff')
        .description('Compare current Contentful schema with recipe definition')
        .option('-c, --context <recipeId>', 'Business recipe context')
        .option('--content-type <type>', 'Specific content type to compare')
        .action(async (options) => {
            try {
                console.log(chalk.blue('🔍 Schema Difference Analysis\n'));
                
                if (!options.context) {
                    console.log(chalk.red('❌ --context is required'));
                    console.log(chalk.gray('   imajin contentful schema diff --context imajin-lighting'));
                    return;
                }

                console.log(chalk.yellow('⚠️  Schema diff not yet implemented'));
                console.log(chalk.gray('Would show:'));
                console.log(chalk.gray('  📊 Fields present in recipe but missing in Contentful'));
                console.log(chalk.gray('  📊 Fields present in Contentful but not in recipe'));
                console.log(chalk.gray('  📊 Field type mismatches'));
                console.log(chalk.gray('  📊 Validation rule differences'));
                console.log(chalk.blue('\n💡 Migration suggestions:'));
                console.log(chalk.gray('   imajin contentful add-property <contentType>.<field> --type <type>'));
                console.log(chalk.gray('   imajin contentful remove-property <contentType>.<field>'));
                
            } catch (error) {
                console.error(chalk.red('❌ Schema diff failed:'), error);
                process.exit(1);
            }
        });

    // Add property to content type
    cmd.command('add-property')
        .description('Add a new property to an existing content type')
        .argument('<propertyPath>', 'Property path (e.g., chart.tracks.playCount)')
        .option('-t, --type <type>', 'Property type (string, number, boolean, date, etc.)')
        .option('--required', 'Make property required')
        .option('--default <value>', 'Default value')
        .option('--dry-run', 'Show what would be added without executing')
        .action(async (propertyPath, options) => {
            try {
                const [contentType, ...fieldPath] = propertyPath.split('.');
                console.log(chalk.blue(`➕ Adding property: ${propertyPath}\n`));
                
                if (options.dryRun || options['dry-run']) {
                    console.log(chalk.yellow('🔍 Add Property Plan (Dry Run):\n'));
                    console.log(chalk.cyan(`Content Type: ${contentType}`));
                    console.log(chalk.cyan(`Field Path: ${fieldPath.join('.')}`));
                    console.log(chalk.cyan(`Type: ${options.type}`));
                    console.log(chalk.cyan(`Required: ${options.required ? 'Yes' : 'No'}`));
                    if (options.default) {
                        console.log(chalk.cyan(`Default: ${options.default}`));
                    }
                    
                    console.log(chalk.blue('\n🔄 Migration Steps:'));
                    console.log(chalk.gray('  1. Backup current content type'));
                    console.log(chalk.gray('  2. Add new field definition'));
                    console.log(chalk.gray('  3. Publish content type'));
                    console.log(chalk.gray('  4. Verify field creation'));
                    
                    console.log(chalk.yellow('\n🚀 To execute:'));
                    console.log(chalk.gray(`   imajin contentful add-property ${propertyPath} --type ${options.type}`));
                } else {
                    console.log(chalk.red('❌ Property addition not yet implemented'));
                    console.log(chalk.yellow('⚠️  This requires:'));
                    console.log(chalk.gray('   • Content type field modification API'));
                    console.log(chalk.gray('   • Schema validation'));
                    console.log(chalk.gray('   • Rollback capabilities'));
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to add property:'), error);
                process.exit(1);
            }
        });

    // Remove property from content type  
    cmd.command('remove-property')
        .description('Remove a property from an existing content type')
        .argument('<propertyPath>', 'Property path (e.g., chart.chartUrl)')
        .option('--confirm', 'Confirm deletion (required for safety)')
        .option('--backup', 'Create backup before removal')
        .option('--dry-run', 'Show what would be removed without executing')
        .action(async (propertyPath, options) => {
            try {
                const [contentType, ...fieldPath] = propertyPath.split('.');
                console.log(chalk.yellow(`⚠️  Removing property: ${propertyPath}\n`));
                
                if (!options.confirm && !(options.dryRun || options['dry-run'])) {
                    console.log(chalk.red('❌ --confirm is required for safety'));
                    console.log(chalk.yellow('⚠️  This will permanently remove the property and ALL its data!'));
                    console.log(chalk.gray(`   imajin contentful remove-property ${propertyPath} --confirm --backup`));
                    return;
                }
                
                if (options.dryRun || options['dry-run']) {
                    console.log(chalk.yellow('🔍 Remove Property Plan (Dry Run):\n'));
                    console.log(chalk.cyan(`Content Type: ${contentType}`));
                    console.log(chalk.cyan(`Field Path: ${fieldPath.join('.')}`));
                    
                    console.log(chalk.red('\n⚠️  Data Loss Warning:'));
                    console.log(chalk.gray('  • All data in this field will be permanently deleted'));
                    console.log(chalk.gray('  • This operation cannot be undone'));
                    console.log(chalk.gray('  • Backup recommended before proceeding'));
                    
                    console.log(chalk.blue('\n🔄 Migration Steps:'));
                    console.log(chalk.gray('  1. Create full content backup'));
                    console.log(chalk.gray('  2. Unpublish content type'));
                    console.log(chalk.gray('  3. Remove field definition'));
                    console.log(chalk.gray('  4. Publish updated content type'));
                    
                    console.log(chalk.yellow('\n🚀 To execute:'));
                    console.log(chalk.gray(`   imajin contentful remove-property ${propertyPath} --confirm --backup`));
                } else {
                    console.log(chalk.red('❌ Property removal not yet implemented'));
                    console.log(chalk.yellow('⚠️  This requires:'));
                    console.log(chalk.gray('   • Safe field removal API'));
                    console.log(chalk.gray('   • Data backup/restore'));
                    console.log(chalk.gray('   • Dependency validation'));
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to remove property:'), error);
                process.exit(1);
            }
        });

    return cmd;
}

// Helper function to convert recipe entities to Contentful content types
async function convertRecipeToContentfulTypes(recipe: Recipe): Promise<ContentfulContentType[]> {
    const contentTypes: ContentfulContentType[] = [];
    
    for (const [entityName, entityDef] of Object.entries(recipe.entities)) {
        const typedEntityDef = entityDef as RecipeEntity;
        const contentType: ContentfulContentType = {
            id: entityName,
            name: entityName.charAt(0).toUpperCase() + entityName.slice(1),
            description: `${entityName} content type generated from ${recipe.businessType} recipe`,
            fields: []
        };

        // Convert recipe fields to Contentful fields
        if (typedEntityDef.fields) {
            for (const field of typedEntityDef.fields) {
                const contentfulField: ContentfulField = {
                    id: field.name,
                    name: field.name.charAt(0).toUpperCase() + field.name.slice(1),
                    type: mapRecipeTypeToContentfulType(field.type),
                    required: field.required || false
                };

                // Handle special field types
                if (field.type === 'enum' && field.values) {
                    contentfulField.validations = [{
                        in: field.values
                    }];
                } else if (field.type === 'array' && field.items === 'reference' && field.linkType) {
                    // Handle array of references (e.g., tracks in playlists/charts)
                    contentfulField.type = 'Array';
                    contentfulField.items = {
                        type: 'Link',
                        linkType: 'Entry',
                        validations: [{
                            linkContentType: [field.linkType]
                        }]
                    };
                } else if (field.type === 'array' && field.items === 'object' && field.schema) {
                    // Handle array of complex objects (e.g., rich track relationships)
                    contentfulField.type = 'Array';
                    contentfulField.items = {
                        type: 'Object',
                        validations: [{
                            size: { max: 100 } // Reasonable limit for UI performance
                        }]
                    };
                }

                contentType.fields.push(contentfulField);
            }
        }

        contentTypes.push(contentType);
    }
    
    return contentTypes;
}

// Map recipe field types to Contentful field types
function mapRecipeTypeToContentfulType(recipeType: string): string {
    const typeMap: Record<string, string> = {
        'string': 'Symbol',
        'text': 'Text', 
        'number': 'Number',
        'boolean': 'Boolean',
        'date': 'Date',
        'array': 'Array',
        'enum': 'Symbol', // Use Symbol with validation
        'object': 'Object'
    };
    
    return typeMap[recipeType] || 'Symbol';
} 