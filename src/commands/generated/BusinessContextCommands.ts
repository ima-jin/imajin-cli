/**
 * BusinessContextCommands - CLI commands for business context management
 * 
 * @package     @imajin/cli
 * @subpackage  commands/generated
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-01
 *
 * Integration Points:
 * - Business context initialization and management
 * - Service discovery and mapping
 * - Dynamic command generation from business context
 * - Configuration inspection and editing
 */

import { Command } from 'commander';
import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';
import { BusinessServiceDiscovery } from '../../discovery/BusinessServiceDiscovery.js';
import { BusinessModelFactory } from '../../etl/graphs/BusinessModelFactory.js';
import { BusinessTypeRegistry, initializeBusinessTypeSystem } from '../../types/Core.js';
import { RecipeManager } from '../../context/RecipeManager.js';
import chalk from 'chalk';

// =============================================================================
// BUSINESS CONTEXT COMMANDS
// =============================================================================

export function createBusinessContextCommands(): Command {
    const cmd = new Command('context');
    cmd.description('Manage business context and domain models');

    // Initialize business context
    cmd.command('init')
        .description('Initialize business context from description')
        .option('-n, --name <name>', 'Business name')
        .option('-d, --description <description>', 'Business description')
        .option('-i, --interactive', 'Interactive mode')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                console.log(chalk.blue('🚀 Initializing business context...'));
                
                let description = options.description;
                let businessName = options.name;
                
                if (options.interactive || !description) {
                    // Interactive mode
                    const inquirer = await import('inquirer');
                    
                    if (!businessName) {
                        const nameAnswer = await inquirer.default.prompt([{
                            type: 'input',
                            name: 'name',
                            message: 'What is your business name?',
                            validate: (input: string) => input.length > 0 || 'Business name is required'
                        }]);
                        businessName = nameAnswer.name;
                    }
                    
                    if (!description) {
                        const descAnswer = await inquirer.default.prompt([{
                            type: 'editor',
                            name: 'description',
                            message: 'Describe your business (this will open your default editor):',
                            default: `I run a business that...

Services we use:
- 

Key business processes:
- 

Important business rules:
- `,
                            validate: (input: string) => input.length >= 50 || 'Please provide a detailed description (at least 50 characters)'
                        }]);
                        description = descAnswer.description;
                    }
                }
                
                if (!description) {
                    throw new Error('Business description is required. Use --description or --interactive flag.');
                }
                
                // Initialize business context
                const manager = new BusinessContextManager();
                const config = await manager.initialize(description, businessName);
                
                // Discover and map services
                const discovery = new BusinessServiceDiscovery();
                const domainModel = await manager.toDomainModel();
                const serviceMappings = await discovery.discoverAndMapServices(domainModel);
                
                // Add service mappings to configuration
                for (const mapping of serviceMappings) {
                    await manager.addServiceMapping(mapping.serviceName, mapping);
                }
                
                // Generate business commands
                const processor = new BusinessContextProcessor();
                const commands = await processor.generateBusinessCommands(domainModel);
                
                // Output results
                if (options.json) {
                    console.log(JSON.stringify({
                        success: true,
                        businessType: config.business.type,
                        entities: Object.keys(config.entities),
                        services: serviceMappings.map(m => m.serviceName),
                        commands: commands.length,
                        configPath: manager.getConfigurationPath()
                    }, null, 2));
                } else {
                    console.log(chalk.green('\n✅ Business context initialized successfully!'));
                    console.log(chalk.cyan(`\n📋 Business Type: ${config.business.type}`));
                    console.log(chalk.cyan(`📊 Entities: ${Object.keys(config.entities).join(', ')}`));
                    console.log(chalk.cyan(`🔗 Services: ${serviceMappings.map(m => m.serviceName).join(', ')}`));
                    console.log(chalk.cyan(`⚡ Commands: ${commands.length} generated`));
                    console.log(chalk.yellow(`📁 Config: ${manager.getConfigurationPath()}`));
                    
                    console.log(chalk.blue('\n🎯 Next steps:'));
                    console.log('  • Run "imajin config show" to see your configuration');
                    console.log('  • Run "imajin commands list" to see generated commands');
                    console.log('  • Run "imajin services list" to see available integrations');
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to initialize business context:'), error);
                process.exit(1);
            }
        });

    // Initialize from recipe
    cmd.command('recipe')
        .description('Initialize from business recipe template')
        .option('-t, --type <type>', 'Recipe type (e.g., coffee-shop, restaurant, ecommerce, saas)')
        .option('-n, --name <name>', 'Business name')
        .option('--preview', 'Preview recipe without creating')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const recipeManager = new RecipeManager();
                
                if (!options.type) {
                    // Show available recipes if no type specified
                    const recipes = await recipeManager.listRecipes();
                    console.log(chalk.yellow('⚠️  Please specify a recipe type:\n'));
                    
                    for (const recipe of recipes) {
                        console.log(chalk.gray(`   imajin context recipe --type ${recipe.businessType}`));
                    }
                    return;
                }
                
                const recipe = await recipeManager.getRecipe(options.type);
                if (!recipe) {
                    console.log(chalk.red(`❌ Recipe not found: ${options.type}`));
                    console.log(chalk.yellow('\n💡 Available recipes:'));
                    const recipes = await recipeManager.listRecipes();
                    for (const r of recipes) {
                        console.log(chalk.gray(`   ${r.businessType}`));
                    }
                    return;
                }
                
                if (options.preview) {
                    // Preview mode - show what would be generated
                    if (options.json) {
                        console.log(JSON.stringify(recipe, null, 2));
                    } else {
                        console.log(chalk.blue('📋 Recipe Preview:'));
                        console.log(chalk.cyan(`Name: ${recipe.name}`));
                        console.log(chalk.cyan(`Type: ${recipe.businessType}`));
                        console.log(chalk.cyan(`Description: ${recipe.description}`));
                        console.log(chalk.cyan(`Entities: ${Object.keys(recipe.entities).join(', ')}`));
                    }
                    return;
                }
                
                // Check if business context already exists
                const manager = new BusinessContextManager();
                if (await manager.configurationExists()) {
                    console.log(chalk.yellow('⚠️  Business context already exists.'));
                    
                    const inquirer = await import('inquirer');
                    const overwriteAnswer = await inquirer.default.prompt([{
                        type: 'confirm',
                        name: 'overwrite',
                        message: 'Overwrite existing business context?',
                        default: false
                    }]);
                    
                    if (!overwriteAnswer.overwrite) {
                        console.log(chalk.blue('Recipe setup cancelled.'));
                        return;
                    }
                }
                
                // Generate business context from recipe
                const domainModel = recipeManager.generateBusinessContext(recipe);
                
                // Initialize business context
                const businessName = options.name || recipe.name;
                const config = await manager.initialize(domainModel.description, businessName);
                
                // Save the generated domain model
                config.entities = domainModel.entities;
                config.workflows = domainModel.workflows?.map(w => ({ ...w, enabled: true }));
                await manager.saveConfiguration(config);
                
                if (options.json) {
                    console.log(JSON.stringify({
                        success: true,
                        recipe: options.type,
                        businessType: domainModel.businessType,
                        entities: Object.keys(domainModel.entities),
                        configPath: manager.getConfigurationPath()
                    }, null, 2));
                } else {
                    console.log(chalk.green('✅ Business context created from recipe!'));
                    console.log(chalk.cyan(`Recipe: ${recipe.name}`));
                    console.log(chalk.cyan(`Business Type: ${domainModel.businessType}`));
                    console.log(chalk.cyan(`Entities: ${Object.keys(domainModel.entities).join(', ')}`));
                    console.log(chalk.yellow(`Config: ${manager.getConfigurationPath()}`));
                    
                    console.log(chalk.blue('\n🎯 Next steps:'));
                    console.log('  • Run "imajin context show" to see your configuration');
                    console.log('  • Run "imajin stripe payment create --amount 1000" to test integration');
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to setup from recipe:'), error);
                process.exit(1);
            }
        });

    // Show configuration
    cmd.command('show')
        .description('Show current business context configuration')
        .option('--json', 'Output in JSON format')
        .option('--yaml', 'Output in YAML format')
        .action(async (options) => {
            try {
                const manager = new BusinessContextManager();
                const config = await manager.getCurrentConfiguration();
                
                if (options.json) {
                    console.log(JSON.stringify(config, null, 2));
                } else if (options.yaml) {
                    const yaml = await manager.exportConfiguration('yaml');
                    console.log(yaml);
                } else {
                    // Pretty formatted output
                    console.log(chalk.blue('📋 Business Context Configuration'));
                    console.log(chalk.cyan(`\nBusiness Type: ${config.business.type}`));
                    console.log(chalk.cyan(`Description: ${config.business.description}`));
                    console.log(chalk.cyan(`Version: ${config.version}`));
                    console.log(chalk.cyan(`Last Updated: ${config.lastUpdated}`));
                    
                    console.log(chalk.yellow('\n🏗️ Entities:'));
                    for (const [entityName, entityDef] of Object.entries(config.entities)) {
                        console.log(`  • ${entityName} (${entityDef.fields.length} fields)`);
                    }
                    
                    if (config.workflows && config.workflows.length > 0) {
                        console.log(chalk.yellow('\n⚡ Workflows:'));
                        for (const workflow of config.workflows) {
                            console.log(`  • ${workflow.name}: ${workflow.description}`);
                        }
                    }
                    
                    if (config.translations?.services) {
                        console.log(chalk.yellow('\n🔗 Service Integrations:'));
                        for (const [serviceName, serviceConfig] of Object.entries(config.translations.services)) {
                            console.log(`  • ${serviceName} (${serviceConfig.enabled ? 'enabled' : 'disabled'})`);
                        }
                    }
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to load configuration:'), error);
                process.exit(1);
            }
        });

    // Edit configuration
    cmd.command('edit')
        .description('Edit business context configuration')
        .action(async () => {
            try {
                const manager = new BusinessContextManager();
                const configPath = manager.getConfigurationPath();
                
                // Open in default editor using secure command executor
                const { executeInteractive } = await import('../../utils/CommandExecutor.js');
                const editor = process.env.EDITOR || 'nano';
                
                console.log(chalk.blue(`📝 Opening configuration in ${editor}...`));
                console.log(chalk.yellow(`File: ${configPath}`));
                
                const result = await executeInteractive(editor, [configPath]);
                
                if (result.success) {
                    try {
                        // Reload and validate configuration
                        await manager.loadConfiguration();
                        const validation = await manager.validateConfiguration(await manager.getCurrentConfiguration());
                        
                        if (validation.valid) {
                            console.log(chalk.green('✅ Configuration updated successfully!'));
                            
                            if (validation.warnings.length > 0) {
                                console.log(chalk.yellow('\n⚠️ Warnings:'));
                                for (const warning of validation.warnings) {
                                    console.log(`  • ${warning.message}`);
                                }
                            }
                            
                            if (validation.suggestions.length > 0) {
                                console.log(chalk.blue('\n💡 Suggestions:'));
                                for (const suggestion of validation.suggestions) {
                                    console.log(`  • ${suggestion.description}`);
                                }
                            }
                        } else {
                            console.log(chalk.red('❌ Configuration validation failed:'));
                            for (const error of validation.errors) {
                                console.log(`  • ${error.path}: ${error.message}`);
                            }
                        }
                    } catch (error) {
                        console.error(chalk.red('❌ Failed to validate updated configuration:'), error);
                    }
                } else if (result.blocked) {
                    console.log(chalk.red(`❌ Command blocked: ${result.blockReason}`));
                } else {
                    console.log(chalk.yellow('⚠️ Editor closed without saving or failed to execute'));
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to edit configuration:'), error);
                process.exit(1);
            }
        });

    // Validate configuration
    cmd.command('validate')
        .description('Validate business context configuration')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const manager = new BusinessContextManager();
                const config = await manager.getCurrentConfiguration();
                const validation = await manager.validateConfiguration(config);
                
                if (options.json) {
                    console.log(JSON.stringify(validation, null, 2));
                } else {
                    if (validation.valid) {
                        console.log(chalk.green('✅ Configuration is valid!'));
                    } else {
                        console.log(chalk.red('❌ Configuration validation failed'));
                        
                        if (validation.errors.length > 0) {
                            console.log(chalk.red('\nErrors:'));
                            for (const error of validation.errors) {
                                console.log(`  • ${error.path}: ${error.message}`);
                            }
                        }
                    }
                    
                    if (validation.warnings.length > 0) {
                        console.log(chalk.yellow('\nWarnings:'));
                        for (const warning of validation.warnings) {
                            console.log(`  • ${warning.path}: ${warning.message}`);
                            if (warning.suggestion) {
                                console.log(`    💡 ${warning.suggestion}`);
                            }
                        }
                    }
                    
                    if (validation.suggestions.length > 0) {
                        console.log(chalk.blue('\nSuggestions:'));
                        for (const suggestion of validation.suggestions) {
                            console.log(`  • ${suggestion.description} (${suggestion.impact} impact)`);
                        }
                    }
                }
                
                process.exit(validation.valid ? 0 : 1);
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to validate configuration:'), error);
                process.exit(1);
            }
        });

    // Inspect mappings
    cmd.command('inspect')
        .description('Inspect service mappings and translations')
        .argument('<service>', 'Service name to inspect')
        .option('--json', 'Output in JSON format')
        .action(async (serviceName, options) => {
            try {
                const manager = new BusinessContextManager();
                const config = await manager.getCurrentConfiguration();
                
                const serviceConfig = config.translations?.services?.[serviceName];
                if (!serviceConfig) {
                    console.error(chalk.red(`❌ Service "${serviceName}" not found in configuration`));
                    process.exit(1);
                }
                
                if (options.json) {
                    console.log(JSON.stringify(serviceConfig, null, 2));
                } else {
                    console.log(chalk.blue(`🔍 Service Mapping: ${serviceName}`));
                    console.log(chalk.cyan(`\nStatus: ${serviceConfig.enabled ? '✅ Enabled' : '❌ Disabled'}`));
                    console.log(chalk.cyan(`Business Domain: ${serviceConfig.mapping}`));
                    
                    console.log(chalk.yellow('\n🔗 Field Mappings:'));
                    for (const [serviceField, businessField] of Object.entries(serviceConfig.fields)) {
                        console.log(`  ${serviceField} → ${businessField}`);
                    }
                    
                    if (serviceConfig.transformations && serviceConfig.transformations.length > 0) {
                        console.log(chalk.yellow('\n🔄 Transformations:'));
                        for (const transformation of serviceConfig.transformations) {
                            console.log(`  • ${transformation}`);
                        }
                    }
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to inspect service mapping:'), error);
                process.exit(1);
            }
        });

    // List generated commands
    cmd.command('commands')
        .description('List available business commands')
        .option('--category <category>', 'Filter by category (porcelain|plumbing)')
        .option('--entity <entity>', 'Filter by entity')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const manager = new BusinessContextManager();
                const domainModel = await manager.toDomainModel();
                
                const processor = new BusinessContextProcessor();
                let commands = await processor.generateBusinessCommands(domainModel);
                
                // Apply filters
                if (options.category) {
                    commands = commands.filter(cmd => cmd.category === options.category);
                }
                
                if (options.entity) {
                    commands = commands.filter(cmd => cmd.entity === options.entity);
                }
                
                if (options.json) {
                    console.log(JSON.stringify(commands, null, 2));
                } else {
                    console.log(chalk.blue('⚡ Available Business Commands'));
                    
                    const porcelainCommands = commands.filter(cmd => cmd.category === 'porcelain');
                    const plumbingCommands = commands.filter(cmd => cmd.category === 'plumbing');
                    
                    if (porcelainCommands.length > 0) {
                        console.log(chalk.green('\n🎯 Porcelain Commands (Business-focused):'));
                        for (const cmd of porcelainCommands) {
                            console.log(`  ${chalk.cyan(cmd.name)} - ${cmd.description}`);
                            if (cmd.entity) {
                                console.log(`    Entity: ${cmd.entity}`);
                            }
                        }
                    }
                    
                    if (plumbingCommands.length > 0) {
                        console.log(chalk.yellow('\n🔧 Plumbing Commands (Direct API access):'));
                        for (const cmd of plumbingCommands) {
                            console.log(`  ${chalk.cyan(cmd.name)} - ${cmd.description}`);
                        }
                    }
                    
                    console.log(chalk.blue(`\nTotal: ${commands.length} commands generated`));
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to list commands:'), error);
                process.exit(1);
            }
        });

    // Workflow suggestions
    cmd.command('workflows')
        .description('Get workflow suggestions for your business')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const manager = new BusinessContextManager();
                const domainModel = await manager.toDomainModel();
                
                const discovery = new BusinessServiceDiscovery();
                const availableServices: any[] = []; // Would be populated from actual discovery
                const suggestions = await discovery.suggestWorkflows(domainModel, availableServices);
                
                if (options.json) {
                    console.log(JSON.stringify(suggestions, null, 2));
                } else {
                    console.log(chalk.blue('💡 Workflow Suggestions'));
                    
                    if (suggestions.length === 0) {
                        console.log(chalk.yellow('\nNo workflow suggestions available. Try adding service integrations first.'));
                        return;
                    }
                    
                    for (const suggestion of suggestions) {
                        const priorityColor = suggestion.priority === 'high' ? chalk.red : 
                                             suggestion.priority === 'medium' ? chalk.yellow : chalk.green;
                        
                        console.log(`\n${priorityColor('●')} ${chalk.cyan(suggestion.name)}`);
                        console.log(`  ${suggestion.description}`);
                        console.log(`  ${chalk.gray('Services:')} ${suggestion.services.join(', ')}`);
                        console.log(`  ${chalk.gray('Entities:')} ${suggestion.businessEntities.join(', ')}`);
                        console.log(`  ${chalk.gray('Estimated Savings:')} ${suggestion.estimatedSavings}`);
                        
                        if (suggestion.steps.length > 0) {
                            console.log(`  ${chalk.gray('Steps:')}`);
                            for (const step of suggestion.steps) {
                                console.log(`    • ${step}`);
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to get workflow suggestions:'), error);
                process.exit(1);
            }
        });

    return cmd;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Ensure business context is initialized before running commands
 */
export async function ensureBusinessContext(): Promise<void> {
    try {
        const manager = new BusinessContextManager();
        if (!(await manager.configurationExists())) {
            console.error(chalk.red('❌ Business context not initialized.'));
            console.log(chalk.yellow('Run "imajin context init" to get started.'));
            process.exit(1);
        }
        
        // Initialize type system
        await initializeBusinessTypeSystem();
        
    } catch (error) {
        console.error(chalk.red('❌ Failed to load business context:'), error);
        process.exit(1);
    }
}