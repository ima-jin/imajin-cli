/**
 * SchemaCommands - CLI commands for schema management
 * 
 * @package     @imajin/cli
 * @subpackage  commands/schema
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-06-25
 *
 * Integration Points:
 * - Schema registry management via CLI
 * - Type generation and validation commands
 * - Schema compatibility checking
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { SchemaRegistry } from '../../schemas/SchemaRegistry.js';
// CompatibilityLayer removed - using business context system instead
// import { initializeCompatibilityLayer, getSchemaRegistry } from '../../schemas/CompatibilityLayer.js';
import chalk from 'chalk';

// =============================================================================
// SCHEMA COMMANDS
// =============================================================================

/**
 * Register schema management commands
 */
export function registerSchemaCommands(program: Command): void {
    const schemaCmd = program
        .command('schema')
        .description('Schema management commands for external Universal schemas');

    // List all available schemas
    schemaCmd
        .command('list')
        .description('List all available schemas')
        .option('-d, --directory <dir>', 'Schema directory', 'schemas')
        .action(async (options) => {
            try {
                await listSchemas(options.directory);
            } catch (error) {
                console.error(chalk.red('Error listing schemas:'), error instanceof Error ? error.message : 'Unknown error');
                process.exit(1);
            }
        });

    // Show schema definition
    schemaCmd
        .command('show <entityName>')
        .description('Show schema definition for an entity')
        .option('-d, --directory <dir>', 'Schema directory', 'schemas')
        .option('-f, --format <format>', 'Output format (json|yaml|typescript)', 'json')
        .action(async (entityName, options) => {
            try {
                await showSchema(entityName, options.directory, options.format);
            } catch (error) {
                console.error(chalk.red('Error showing schema:'), error instanceof Error ? error.message : 'Unknown error');
                process.exit(1);
            }
        });

    // Validate data against schema
    schemaCmd
        .command('validate <entityName> <data>')
        .description('Validate data against schema')
        .option('-d, --directory <dir>', 'Schema directory', 'schemas')
        .option('-s, --schema <schema>', 'Schema name', 'core')
        .option('-f, --file', 'Treat data as file path instead of JSON string')
        .action(async (entityName, data, options) => {
            try {
                await validateData(entityName, data, options.directory, options.schema, options.file);
            } catch (error) {
                console.error(chalk.red('Error validating data:'), error instanceof Error ? error.message : 'Unknown error');
                process.exit(1);
            }
        });

    // Generate TypeScript types
    schemaCmd
        .command('generate-types')
        .description('Generate TypeScript types from schemas')
        .option('-d, --directory <dir>', 'Schema directory', 'schemas')
        .option('-o, --output <file>', 'Output file path', 'src/types/Generated.ts')
        .action(async (options) => {
            try {
                await generateTypes(options.directory, options.output);
            } catch (error) {
                console.error(chalk.red('Error generating types:'), error instanceof Error ? error.message : 'Unknown error');
                process.exit(1);
            }
        });

    // Check schema compatibility
    schemaCmd
        .command('check-compatibility')
        .description('Check schema compatibility between versions')
        .option('-d, --directory <dir>', 'Schema directory', 'schemas')
        .option('-o, --old <schema>', 'Old schema name', 'core')
        .option('-n, --new <schema>', 'New schema name', 'core')
        .action(async (options) => {
            try {
                await checkCompatibility(options.directory, options.old, options.new);
            } catch (error) {
                console.error(chalk.red('Error checking compatibility:'), error instanceof Error ? error.message : 'Unknown error');
                process.exit(1);
            }
        });

    // Migrate data between schema versions
    schemaCmd
        .command('migrate')
        .description('Migrate data between schema versions')
        .option('-d, --directory <dir>', 'Schema directory', 'schemas')
        .option('--from <version>', 'Source schema version', 'core')
        .option('--to <version>', 'Target schema version', 'core')
        .option('-f, --file <file>', 'Data file to migrate')
        .option('-o, --output <file>', 'Output file for migrated data')
        .action(async (options) => {
            try {
                await migrateData(options.directory, options.from, options.to, options.file, options.output);
            } catch (error) {
                console.error(chalk.red('Error migrating data:'), error instanceof Error ? error.message : 'Unknown error');
                process.exit(1);
            }
        });
}

// =============================================================================
// COMMAND IMPLEMENTATIONS
// =============================================================================

/**
 * List all available schemas
 */
async function listSchemas(directory: string): Promise<void> {
    console.log(chalk.blue('📋 Loading schemas...'));
    
    const registry = new SchemaRegistry({ schemaDirectory: directory });
    await registry.loadSchemas();
    
    const schemas = registry.getAllSchemas();
    
    if (schemas.size === 0) {
        console.log(chalk.yellow('No schemas found in directory:'), directory);
        return;
    }

    console.log(chalk.green('\n✅ Available Schemas:'));
    console.log(chalk.gray('='.repeat(50)));
    
    for (const [schemaName, schema] of schemas.entries()) {
        console.log(chalk.white(`\n📄 ${schemaName}`));
        console.log(chalk.gray(`   Version: ${schema.version}`));
        console.log(chalk.gray(`   Namespace: ${schema.namespace}`));
        console.log(chalk.gray(`   Description: ${schema.description}`));
        console.log(chalk.gray(`   Entities: ${Object.keys(schema.entities).join(', ')}`));
    }
    
    console.log(chalk.gray('\n' + '='.repeat(50)));
    console.log(chalk.green(`Total: ${schemas.size} schema(s) found`));
}

/**
 * Show schema definition for an entity
 */
async function showSchema(entityName: string, directory: string, format: string): Promise<void> {
    const registry = new SchemaRegistry({ schemaDirectory: directory });
    await registry.loadSchemas();
    
    const schemas = registry.getAllSchemas();
    let foundEntity = false;
    
    for (const [schemaName, schema] of schemas.entries()) {
        if (schema.entities[entityName]) {
            foundEntity = true;
            console.log(chalk.blue(`📄 Schema: ${schemaName} > Entity: ${entityName}`));
            console.log(chalk.gray('='.repeat(50)));
            
            switch (format.toLowerCase()) {
                case 'typescript':
                    const interfaceCode = registry.generateInterface(schemaName);
                    const entityInterface = extractEntityInterface(interfaceCode, entityName);
                    console.log(chalk.white(entityInterface));
                    break;
                    
                case 'yaml':
                    const yamlOutput = formatAsYaml(schema.entities[entityName]);
                    console.log(chalk.white(yamlOutput));
                    break;
                    
                case 'json':
                default:
                    console.log(chalk.white(JSON.stringify(schema.entities[entityName], null, 2)));
                    break;
            }
            break;
        }
    }
    
    if (!foundEntity) {
        console.log(chalk.red(`❌ Entity '${entityName}' not found in any loaded schemas`));
        process.exit(1);
    }
}

/**
 * Validate data against schema
 */
async function validateData(entityName: string, dataInput: string, directory: string, schemaName: string, isFile: boolean): Promise<void> {
    const registry = new SchemaRegistry({ schemaDirectory: directory });
    await registry.loadSchemas();
    
    let data: unknown;
    
    try {
        if (isFile) {
            const fileContent = await fs.promises.readFile(dataInput, 'utf8');
            data = JSON.parse(fileContent);
            console.log(chalk.blue(`📄 Validating data from file: ${dataInput}`));
        } else {
            data = JSON.parse(dataInput);
            console.log(chalk.blue(`📄 Validating inline data`));
        }
    } catch (error) {
        console.log(chalk.red('❌ Invalid JSON data:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
    
    console.log(chalk.gray(`Schema: ${schemaName}, Entity: ${entityName}`));
    console.log(chalk.gray('='.repeat(50)));
    
    const result = registry.validate(schemaName, entityName, data);
    
    if (result.success) {
        console.log(chalk.green('✅ Validation passed!'));
        console.log(chalk.gray('Data is valid according to the schema'));
    } else {
        console.log(chalk.red('❌ Validation failed!'));
        console.log(chalk.gray('\nErrors:'));
        
        for (const error of result.errors) {
            console.log(chalk.red(`  • ${error.path}: ${error.message}`));
            if (error.expected) {
                console.log(chalk.gray(`    Expected: ${JSON.stringify(error.expected)}`));
            }
            if (error.received) {
                console.log(chalk.gray(`    Received: ${JSON.stringify(error.received)}`));
            }
        }
        process.exit(1);
    }
}

/**
 * Generate TypeScript types from schemas
 */
async function generateTypes(directory: string, outputPath: string): Promise<void> {
    console.log(chalk.blue('🔄 Generating TypeScript types...'));
    
    const registry = new SchemaRegistry({ schemaDirectory: directory });
    await registry.loadSchemas();
    
    const absoluteOutput = path.resolve(outputPath);
    await registry.generateTypes(absoluteOutput);
    
    console.log(chalk.green(`✅ TypeScript types generated: ${absoluteOutput}`));
}

/**
 * Check schema compatibility
 */
async function checkCompatibility(directory: string, oldSchema: string, newSchema: string): Promise<void> {
    console.log(chalk.blue('🔍 Checking schema compatibility...'));
    
    const registry = new SchemaRegistry({ schemaDirectory: directory });
    await registry.loadSchemas();
    
    const result = registry.checkCompatibility(oldSchema, newSchema);
    
    console.log(chalk.gray('='.repeat(50)));
    
    if (result.compatible) {
        console.log(chalk.green('✅ Schemas are compatible!'));
    } else {
        console.log(chalk.red('❌ Schema compatibility issues found:'));
        
        if (result.breaking.length > 0) {
            console.log(chalk.red('\n🚨 Breaking Changes:'));
            for (const issue of result.breaking) {
                console.log(chalk.red(`  • ${issue.path}: ${issue.message}`));
            }
        }
        
        if (result.warnings.length > 0) {
            console.log(chalk.yellow('\n⚠️  Warnings:'));
            for (const warning of result.warnings) {
                console.log(chalk.yellow(`  • ${warning.path}: ${warning.message}`));
            }
        }
        
        if (result.migrations.length > 0) {
            console.log(chalk.blue('\n🔄 Available Migrations:'));
            for (const migration of result.migrations) {
                console.log(chalk.blue(`  • ${migration.id}: ${migration.description}`));
            }
        }
    }
}

/**
 * Migrate data between schema versions
 */
async function migrateData(directory: string, fromVersion: string, toVersion: string, inputFile?: string, outputFile?: string): Promise<void> {
    console.log(chalk.blue('🔄 Migrating data...'));
    
    if (!inputFile) {
        console.log(chalk.red('❌ Input file is required for migration'));
        process.exit(1);
    }
    
    try {
        const fileContent = await fs.promises.readFile(inputFile, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(chalk.gray(`Migrating from ${fromVersion} to ${toVersion}`));
        
        // For now, just copy the data (migration logic would be implemented here)
        const migratedData = data;
        
        if (outputFile) {
            await fs.promises.writeFile(outputFile, JSON.stringify(migratedData, null, 2));
            console.log(chalk.green(`✅ Migrated data written to: ${outputFile}`));
        } else {
            console.log(chalk.green('✅ Migration completed:'));
            console.log(JSON.stringify(migratedData, null, 2));
        }
    } catch (error) {
        console.log(chalk.red('❌ Migration failed:'), error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract specific entity interface from generated TypeScript code
 */
function extractEntityInterface(interfaceCode: string, entityName: string): string {
    const lines = interfaceCode.split('\n');
    const startPattern = new RegExp(`export interface ${entityName}`);
    const endPattern = /^}/;
    
    let extracting = false;
    const extracted: string[] = [];
    
    for (const line of lines) {
        if (startPattern.test(line)) {
            extracting = true;
        }
        
        if (extracting) {
            extracted.push(line);
            
            if (endPattern.test(line)) {
                break;
            }
        }
    }
    
    return extracted.length > 0 ? extracted.join('\n') : `// Interface for ${entityName} not found`;
}

/**
 * Format entity definition as YAML
 */
function formatAsYaml(entityDef: any): string {
    // Simple YAML formatting (in a real implementation, you'd use a proper YAML library)
    let yaml = `description: "${entityDef.description}"\n`;
    if (entityDef.extends) {
        yaml += `extends: "${entityDef.extends}"\n`;
    }
    yaml += `fields:\n`;
    
    for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
        const field = fieldDef as any;
        yaml += `  ${fieldName}:\n`;
        yaml += `    type: "${field.type}"\n`;
        yaml += `    required: ${field.required}\n`;
        yaml += `    description: "${field.description}"\n`;
        
        if (field.min !== undefined) yaml += `    min: ${field.min}\n`;
        if (field.max !== undefined) yaml += `    max: ${field.max}\n`;
        if (field.pattern) yaml += `    pattern: "${field.pattern}"\n`;
        if (field.values) yaml += `    values: [${field.values.map((v: string) => `"${v}"`).join(', ')}]\n`;
    }
    
    return yaml;
} 