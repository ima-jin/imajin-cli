/* eslint-disable no-console */ // CLI Output: Migration status and progress logging
/**
 * MigrationSystem - Schema migration discovery and execution system
 *
 * @package     @imajin/cli
 * @subpackage  schemas
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Schema version migration management
 * - Data transformation during schema evolution
 * - Migration file discovery and execution
 * - Rollback and recovery capabilities
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Migration, Transform, ValidationResult } from './types/SchemaTypes.js';

// =============================================================================
// MIGRATION SYSTEM CLASS
// =============================================================================

export class MigrationSystem {
    private readonly migrationsDirectory: string;
    private readonly loadedMigrations = new Map<string, Migration>();

    constructor(migrationsDirectory: string = 'migrations') {
        this.migrationsDirectory = migrationsDirectory;
    }

    // =============================================================================
    // MIGRATION DISCOVERY
    // =============================================================================

    /**
     * Discover all available migrations from the migrations directory
     */
    async discoverMigrations(fromVersion: string, toVersion: string): Promise<Migration[]> {
        const allMigrations = await this.loadAllMigrations();
        const applicableMigrations = this.findApplicableMigrations(allMigrations, fromVersion, toVersion);
        
        // Sort migrations in dependency order
        return this.sortMigrationsByDependency(applicableMigrations);
    }

    /**
     * Load all migration files from the migrations directory
     */
    private async loadAllMigrations(): Promise<Migration[]> {
        const migrations: Migration[] = [];
        
        try {
            const files = await fs.readdir(this.migrationsDirectory);
            const migrationFiles = files.filter(file => 
                file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json')
            );

            for (const file of migrationFiles) {
                try {
                    const migration = await this.loadMigration(path.join(this.migrationsDirectory, file));
                    migrations.push(migration);
                } catch (error) {
                    console.warn(`Failed to load migration file ${file}:`, error);
                }
            }
        } catch (error) {
            // Migrations directory might not exist - that's okay, use built-in migrations
            console.log('No migrations directory found, using built-in migrations');
        }

        return migrations;
    }

    /**
     * Load a single migration file
     */
    private async loadMigration(filePath: string): Promise<Migration> {
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        if (filePath.endsWith('.json')) {
            const migrationData = JSON.parse(fileContent);
            return this.validateMigration(migrationData);
        } else {
            // For .js/.ts files, we would use dynamic import
            // For now, provide a fallback structure
            const fileName = path.basename(filePath, path.extname(filePath));
            const versionMatch = /(\d+\.\d+\.\d+)_to_(\d+\.\d+\.\d+)/.exec(fileName);

            if (versionMatch?.[1] && versionMatch[2]) {
                return {
                    id: fileName,
                    description: `Migration from ${versionMatch[1]} to ${versionMatch[2]}`,
                    fromVersion: versionMatch[1],
                    toVersion: versionMatch[2],
                    transforms: [] // Would be loaded from file
                };
            } else {
                throw new Error(`Invalid migration file name: ${fileName}`);
            }
        }
    }

    /**
     * Validate migration structure
     */
    private validateMigration(migration: any): Migration {
        if (!migration.id || !migration.fromVersion || !migration.toVersion) {
            throw new Error('Migration must have id, fromVersion, and toVersion');
        }

        if (!Array.isArray(migration.transforms)) {
            migration.transforms = [];
        }

        return migration as Migration;
    }

    /**
     * Find migrations applicable to the version range
     */
    private findApplicableMigrations(allMigrations: Migration[], fromVersion: string, toVersion: string): Migration[] {
        const applicable: Migration[] = [];
        
        for (const migration of allMigrations) {
            if (this.isMigrationApplicable(migration, fromVersion, toVersion)) {
                applicable.push(migration);
            }
        }

        return applicable;
    }

    /**
     * Check if migration is applicable to the version range
     */
    private isMigrationApplicable(migration: Migration, fromVersion: string, toVersion: string): boolean {
        // Simple version comparison - in production would use semver library
        return migration.fromVersion >= fromVersion && migration.toVersion <= toVersion;
    }

    /**
     * Sort migrations by dependency order
     */
    private sortMigrationsByDependency(migrations: Migration[]): Migration[] {
        // Sort by fromVersion to ensure proper order
        return migrations.sort((a, b) => a.fromVersion.localeCompare(b.fromVersion));
    }

    // =============================================================================
    // MIGRATION EXECUTION
    // =============================================================================

    /**
     * Execute migration on data
     */
    async executeMigration(migration: Migration, data: unknown[]): Promise<unknown[]> {
        const results: unknown[] = [];
        
        for (const item of data) {
            try {
                const transformedItem = await this.applyTransformations(migration.transforms, item);
                results.push(transformedItem);
            } catch (error) {
                console.error(`Failed to migrate item:`, error);
                results.push(item); // Keep original on failure
            }
        }

        return results;
    }

    /**
     * Apply all transformations to a single data item
     */
    private async applyTransformations(transforms: Transform[], data: unknown): Promise<unknown> {
        let result = JSON.parse(JSON.stringify(data)); // Deep clone

        for (const transform of transforms) {
            result = await this.applyTransformation(transform, result);
        }

        return result;
    }

    /**
     * Apply a single transformation to data
     */
    private async applyTransformation(transform: Transform, data: any): Promise<any> {
        switch (transform.type) {
            case 'rename_field':
                return this.renameField(data, transform);
            
            case 'change_type':
                return this.changeFieldType(data, transform);
            
            case 'add_default':
                return this.addDefaultValue(data, transform);
            
            case 'remove_field':
                this.removeField(data, transform);
                return data;
            
            default:
                console.warn(`Unknown transformation type: ${transform.type}`);
                return data;
        }
    }

    /**
     * Rename a field in the data
     */
    private renameField(data: any, transform: Transform): any {
        if (!data || typeof data !== 'object') {
return data;
}

        const pathParts = transform.path.split('.');
        const fieldName = pathParts.at(-1);
        
        if (transform.oldValue && transform.newValue && fieldName && fieldName in data) {
            data[transform.newValue] = data[transform.oldValue];
            delete data[transform.oldValue];
        }

        return data;
    }

    /**
     * Change field type in the data
     */
    private changeFieldType(data: any, transform: Transform): any {
        if (!data || typeof data !== 'object') {
return data;
}

        const pathParts = transform.path.split('.');
        const fieldName = pathParts.at(-1);
        
        if (fieldName && fieldName in data && transform.newValue) {
            // Perform type conversion based on new type
            switch (transform.newValue) {
                case 'string':
                    data[fieldName] = String(data[fieldName]);
                    break;
                case 'number':
                    data[fieldName] = Number(data[fieldName]);
                    break;
                case 'boolean':
                    data[fieldName] = Boolean(data[fieldName]);
                    break;
                case 'date':
                    data[fieldName] = new Date(data[fieldName]);
                    break;
            }
        }

        return data;
    }

    /**
     * Add default value to missing field
     */
    private addDefaultValue(data: any, transform: Transform): any {
        if (!data || typeof data !== 'object') {
return data;
}

        const pathParts = transform.path.split('.');
        const fieldName = pathParts.at(-1);
        
        if (fieldName && !(fieldName in data)) {
            data[fieldName] = transform.defaultValue;
        }

        return data;
    }

    /**
     * Remove field from data
     * Note: This method mutates the input data object
     */
    private removeField(data: any, transform: Transform): void {
        if (!data || typeof data !== 'object') {
return;
}

        const pathParts = transform.path.split('.');
        const fieldName = pathParts.at(-1);

        if (fieldName && fieldName in data) {
            delete data[fieldName];
        }
    }

    // =============================================================================
    // VALIDATION AND UTILITIES
    // =============================================================================

    /**
     * Validate migration chain completeness
     */
    validateMigrationChain(migrations: Migration[], fromVersion: string, toVersion: string): ValidationResult {
        const errors: string[] = [];
        let currentVersion = fromVersion;

        for (const migration of migrations) {
            if (migration.fromVersion !== currentVersion) {
                errors.push(`Migration gap: no migration from ${currentVersion} to ${migration.fromVersion}`);
            }
            currentVersion = migration.toVersion;
        }

        if (currentVersion !== toVersion) {
            errors.push(`Migration incomplete: reached ${currentVersion} but target is ${toVersion}`);
        }

        return {
            success: errors.length === 0,
            errors: errors.map(message => ({ path: 'migration_chain', message, code: 'MIGRATION_GAP' })),
            data: migrations
        };
    }

    /**
     * Create a rollback migration
     */
    createRollback(migration: Migration): Migration {
        const rollbackTransforms: Transform[] = [];

        for (const transform of migration.transforms) {
            switch (transform.type) {
                case 'rename_field':
                    rollbackTransforms.push({
                        type: 'rename_field',
                        path: transform.path,
                        oldValue: transform.newValue,
                        newValue: transform.oldValue
                    });
                    break;
                
                case 'add_default':
                    rollbackTransforms.push({
                        type: 'remove_field',
                        path: transform.path
                    });
                    break;
                
                case 'remove_field':
                    rollbackTransforms.push({
                        type: 'add_default',
                        path: transform.path,
                        defaultValue: null
                    });
                    break;
                
                case 'change_type':
                    rollbackTransforms.push({
                        type: 'change_type',
                        path: transform.path,
                        oldValue: transform.newValue,
                        newValue: transform.oldValue
                    });
                    break;
            }
        }

        return {
            id: `rollback_${migration.id}`,
            description: `Rollback of ${migration.description}`,
            fromVersion: migration.toVersion,
            toVersion: migration.fromVersion,
            transforms: rollbackTransforms.toReversed() // Reverse order for rollback
        };
    }
} 