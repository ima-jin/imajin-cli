/**
 * BusinessContextManager - Manage business context configuration and lifecycle
 * 
 * @package     @imajin/cli
 * @subpackage  context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-04
 *
 * Integration Points:
 * - Manages user business context configuration files
 * - Validates business domain models and translations
 * - Handles configuration editing and updates
 * - Provides configuration inspection and debugging
 */

import { z } from 'zod';
import { readFile, writeFile, mkdir, access, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';
import type {
    BusinessDomainModel
} from './BusinessContextProcessor.js';
import type { Recipe } from './RecipeManager.js';
import type { ServiceMapping } from '../discovery/BusinessServiceDiscovery.js';
import { BusinessTypeRegistry } from './BusinessTypeRegistry.js';
import type { Logger } from '../logging/Logger.js';

// =============================================================================
// CONFIGURATION SCHEMAS
// =============================================================================

export const BusinessConfigurationSchema = z.object({
    version: z.string().default('1.0.0'),
    lastUpdated: z.string(),
    business: z.object({
        type: z.string(),
        name: z.string().optional(),
        description: z.string(),
        industry: z.string().optional(),
        size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
    }),
    entities: z.record(z.string(), z.object({
        fields: z.array(z.object({
            name: z.string(),
            type: z.enum(['string', 'number', 'boolean', 'date', 'array', 'object', 'enum', 'text', 'json', 'datetime', 'reference']),
            required: z.boolean().default(false),
            optional: z.boolean().default(true),
            default: z.any().optional(),
            items: z.string().optional(),
            values: z.array(z.string()).optional(),
            validation: z.object({
                min: z.number().optional(),
                max: z.number().optional(),
                pattern: z.string().optional(),
                format: z.string().optional(),
            }).optional(),
            description: z.string().optional(),
        })),
        businessRules: z.array(z.string()).optional(),
        workflows: z.array(z.string()).optional(),
        relationships: z.array(z.object({
            type: z.enum(['hasOne', 'hasMany', 'belongsTo', 'manyToMany']),
            entity: z.string(),
            foreignKey: z.string().optional(),
            description: z.string().optional(),
        })).optional(),
        description: z.string().optional(),
    })),
    workflows: z.array(z.object({
        name: z.string(),
        description: z.string(),
        steps: z.array(z.object({
            name: z.string(),
            action: z.string(),
            entity: z.string().optional(),
            conditions: z.array(z.string()).optional(),
        })),
        triggers: z.array(z.string()).optional(),
        enabled: z.boolean().default(true),
    })).optional(),
    businessRules: z.array(z.object({
        rule: z.string(),
        entity: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        enforcement: z.enum(['soft', 'hard']).default('soft'),
        enabled: z.boolean().default(true),
    })).optional(),
    translations: z.object({
        services: z.record(z.string(), z.object({
            enabled: z.boolean().default(true),
            mapping: z.string(),
            fields: z.record(z.string(), z.string()),
            transformations: z.array(z.string()).optional(),
            overrides: z.record(z.string(), z.any()).optional(),
        })).optional(),
    }).optional(),
    porcelainCommands: z.record(z.string(), z.array(z.object({
        name: z.string(),
        description: z.string(),
        enabled: z.boolean().default(true),
        parameters: z.array(z.object({
            name: z.string(),
            type: z.string(),
            required: z.boolean(),
            description: z.string(),
        })).optional(),
    }))).optional(),
    preferences: z.object({
        outputFormat: z.enum(['json', 'yaml', 'table']).default('json'),
        verboseLogging: z.boolean().default(false),
        autoSync: z.boolean().default(true),
        backupConfig: z.boolean().default(true),
    }).optional(),
});

export type BusinessConfiguration = z.infer<typeof BusinessConfigurationSchema>;

export const ConfigValidationResultSchema = z.object({
    valid: z.boolean(),
    errors: z.array(z.object({
        path: z.string(),
        message: z.string(),
        severity: z.enum(['error', 'warning', 'info']),
    })),
    warnings: z.array(z.object({
        path: z.string(),
        message: z.string(),
        suggestion: z.string().optional(),
    })),
    suggestions: z.array(z.object({
        type: z.enum(['optimization', 'enhancement', 'integration']),
        description: z.string(),
        impact: z.enum(['low', 'medium', 'high']),
    })),
});

export type ConfigValidationResult = z.infer<typeof ConfigValidationResultSchema>;

// =============================================================================
// BUSINESS CONTEXT MANAGER
// =============================================================================

export class BusinessContextManager {
    private readonly configDir: string;
    private readonly configFile: string;
    private readonly backupDir: string;
    private readonly contextsDir: string;
    private currentConfig: BusinessConfiguration | null = null;
    private logger: Logger;

    constructor(configDirectory?: string, logger?: Logger) {
        this.configDir = configDirectory || join(homedir(), '.imajin');
        this.configFile = join(this.configDir, 'business-context.yaml');
        this.backupDir = join(this.configDir, 'backups');
        this.contextsDir = join(this.configDir, 'contexts');
        this.logger = logger || new (require('../logging/Logger.js').Logger)({ level: 'info' });
    }

    /**
     * Initialize business context configuration
     */
    async initialize(businessDescription: string, businessName?: string): Promise<BusinessConfiguration> {
        this.logger.info('Initializing business context configuration', {
            operation: 'initialize',
            hasBusinessName: !!businessName
        });

        // Create config directory if it doesn't exist
        await this.ensureConfigDirectory();
        
        // Process business description to generate initial config
        const { BusinessContextProcessor } = await import('./BusinessContextProcessor.js');
        const processor = new BusinessContextProcessor();
        const domainModel = await processor.processBusinessDescription(businessDescription);
        
        // Create initial configuration
        const config: BusinessConfiguration = {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            business: {
                type: domainModel.businessType,
                name: businessName,
                description: domainModel.description,
            },
            entities: this.transformEntitiesToConfig(domainModel.entities),
            workflows: domainModel.workflows?.map(w => 
                typeof w === 'string' ? { name: w, description: w, steps: [], enabled: true } : { ...w, enabled: true }
            ),
            businessRules: domainModel.businessRules?.map(r => ({ 
                rule: r, 
                enabled: true, 
                priority: 'medium' as const, 
                enforcement: 'soft' as const 
            })),
            translations: {
                services: {},
            },
            porcelainCommands: {},
            preferences: {
                outputFormat: 'json',
                verboseLogging: false,
                autoSync: true,
                backupConfig: true,
            },
        };
        
        // Validate the configuration
        const validation = await this.validateConfiguration(config);
        if (!validation.valid) {
            throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        // Save the configuration
        await this.saveConfiguration(config);
        this.currentConfig = config;

        this.logger.info('Business context initialized successfully', {
            businessType: domainModel.businessType,
            entitiesCount: Object.keys(config.entities).length
        });
        return config;
    }

    /**
     * Load existing business context configuration
     */
    async loadConfiguration(): Promise<BusinessConfiguration> {
        this.logger.debug('Loading business context configuration', {
            configFile: this.configFile
        });

        try {
            const configExists = await this.configurationExists();
            if (!configExists) {
                throw new Error('Business context configuration not found. Run "imajin init" to create one.');
            }
            
            const configContent = await readFile(this.configFile, 'utf-8');
            const configData = yaml.load(configContent) as any;
            
            // Validate loaded configuration
            const validation = BusinessConfigurationSchema.safeParse(configData);
            if (!validation.success) {
                throw new Error(`Invalid configuration format: ${validation.error.message}`);
            }
            
            this.currentConfig = validation.data;
            this.logger.info('Business context loaded successfully', {
                businessType: this.currentConfig.business.type,
                version: this.currentConfig.version
            });
            return this.currentConfig;

        } catch (error) {
            this.logger.error('Failed to load business context configuration', error as Error, {
                configFile: this.configFile
            });
            throw error;
        }
    }

    /**
     * Save business context configuration
     */
    async saveConfiguration(config: BusinessConfiguration): Promise<void> {
        this.logger.debug('Saving business context configuration', {
            businessType: config.business.type,
            entitiesCount: Object.keys(config.entities).length
        });

        // Backup existing configuration if enabled
        if (config.preferences?.backupConfig && await this.configurationExists()) {
            await this.createBackup();
        }
        
        // Update last modified timestamp
        config.lastUpdated = new Date().toISOString();
        
        // Convert to YAML and save
        const yamlContent = yaml.dump(config, {
            indent: 2,
            lineWidth: 120,
            quotingType: '"',
            forceQuotes: false,
        });
        
        await writeFile(this.configFile, yamlContent, 'utf-8');
        this.currentConfig = config;

        this.logger.info('Business context configuration saved', {
            configFile: this.configFile,
            lastUpdated: config.lastUpdated
        });
    }

    /**
     * Update business context configuration
     */
    async updateConfiguration(updates: Partial<BusinessConfiguration>): Promise<BusinessConfiguration> {
        this.logger.debug('Updating business context configuration', {
            updateKeys: Object.keys(updates)
        });

        if (!this.currentConfig) {
            await this.loadConfiguration();
        }
        
        // Merge updates with current configuration
        const updatedConfig = this.deepMerge(this.currentConfig!, updates);
        
        // Validate updated configuration
        const validation = await this.validateConfiguration(updatedConfig);
        if (!validation.valid) {
            throw new Error(`Configuration update validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        // Save updated configuration
        await this.saveConfiguration(updatedConfig);

        this.logger.info('Business context configuration updated', {
            businessType: updatedConfig.business.type
        });
        return updatedConfig;
    }

    /**
     * Validate business context configuration
     */
    async validateConfiguration(config: BusinessConfiguration): Promise<ConfigValidationResult> {
        this.logger.debug('Validating business context configuration', {
            businessType: config.business.type
        });

        const result: ConfigValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        };
        
        try {
            // Schema validation
            const schemaValidation = BusinessConfigurationSchema.safeParse(config);
            if (!schemaValidation.success) {
                result.valid = false;
                for (const error of schemaValidation.error.issues) {
                    result.errors.push({
                        path: error.path.join('.'),
                        message: error.message,
                        severity: 'error',
                    });
                }
            }
            
            // Business logic validation
            await this.validateBusinessLogic(config, result);
            
            // Generate suggestions
            await this.generateSuggestions(config, result);
            
        } catch (error) {
            result.valid = false;
            result.errors.push({
                path: 'root',
                message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                severity: 'error',
            });
        }

        this.logger.info('Configuration validation completed', {
            valid: result.valid,
            errorsCount: result.errors.length,
            warningsCount: result.warnings.length,
            suggestionsCount: result.suggestions.length
        });
        return result;
    }

    /**
     * Get current business context configuration
     */
    async getCurrentConfiguration(): Promise<BusinessConfiguration> {
        if (!this.currentConfig) {
            await this.loadConfiguration();
        }
        return this.currentConfig!;
    }

    /**
     * Convert business context to domain model
     */
    async toDomainModel(): Promise<BusinessDomainModel> {
        const config = await this.getCurrentConfiguration();
        
        return {
            businessType: config.business.type,
            description: config.business.description,
            entities: this.transformConfigToEntities(config.entities),
            workflows: config.workflows || [],
            businessRules: config.businessRules?.map(r => r.rule) || [],
            integrations: [],
            commands: [],
        };
    }

    /**
     * Add service translation mapping
     */
    async addServiceMapping(serviceName: string, mapping: ServiceMapping): Promise<void> {
        this.logger.debug('Adding service mapping', {
            serviceName,
            businessDomain: mapping.businessDomain
        });

        const config = await this.getCurrentConfiguration();
        
        if (!config.translations) {
            config.translations = { services: {} };
        }
        
        if (!config.translations.services) {
            config.translations.services = {};
        }
        
        // Convert ServiceMapping to configuration format
        const serviceConfig = {
            enabled: true,
            mapping: mapping.businessDomain,
            fields: this.flattenFieldMappings(mapping.mappings),
            transformations: this.extractTransformations(mapping.mappings),
        };
        
        config.translations.services[serviceName] = serviceConfig;

        await this.saveConfiguration(config);
        this.logger.info('Service mapping added', {
            serviceName,
            fieldsCount: Object.keys(serviceConfig.fields).length
        });
    }

    /**
     * Remove service translation mapping
     */
    async removeServiceMapping(serviceName: string): Promise<void> {
        this.logger.debug('Removing service mapping', {
            serviceName
        });

        const config = await this.getCurrentConfiguration();

        if (config.translations?.services?.[serviceName]) {
            delete config.translations.services[serviceName];
            await this.saveConfiguration(config);
            this.logger.info('Service mapping removed', {
                serviceName
            });
        } else {
            this.logger.warn('Service mapping not found', {
                serviceName
            });
        }
    }

    /**
     * Export configuration as different formats
     */
    async exportConfiguration(format: 'json' | 'yaml' | 'typescript'): Promise<string> {
        const config = await this.getCurrentConfiguration();
        
        switch (format) {
            case 'json':
                return JSON.stringify(config, null, 2);
                
            case 'yaml':
                return yaml.dump(config, { indent: 2 });
                
            case 'typescript':
                return this.generateTypeScriptDefinitions(config);
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Check if configuration exists
     */
    async configurationExists(): Promise<boolean> {
        try {
            await access(this.configFile);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get configuration file path
     */
    getConfigurationPath(): string {
        return this.configFile;
    }

    /**
     * List available backups
     */
    async listBackups(): Promise<string[]> {
        try {
            const { readdir } = await import('fs/promises');
            const files = await readdir(this.backupDir);
            return files
                .filter(file => file.endsWith('.backup.yaml'))
                .sort((a, b) => b.localeCompare(a)); // Sort by name (newest first)
        } catch {
            return [];
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupName: string): Promise<void> {
        this.logger.info('Restoring configuration from backup', {
            backupName
        });

        const backupPath = join(this.backupDir, backupName);
        const backupContent = await readFile(backupPath, 'utf-8');
        const backupConfig = yaml.load(backupContent) as BusinessConfiguration;
        
        // Validate backup configuration
        const validation = await this.validateConfiguration(backupConfig);
        if (!validation.valid) {
            throw new Error('Backup configuration is invalid');
        }

        await this.saveConfiguration(backupConfig);
        this.logger.info('Configuration restored from backup', {
            backupName,
            businessType: backupConfig.business.type
        });
    }

    // =============================================================================
    // PRIVATE HELPER METHODS
    // =============================================================================

    private async ensureConfigDirectory(): Promise<void> {
        try {
            await mkdir(this.configDir, { recursive: true });
            await mkdir(this.backupDir, { recursive: true });
        } catch (error) {
            this.logger.error('Failed to create configuration directory', error as Error, {
                configDir: this.configDir
            });
            throw error;
        }
    }

    private async createBackup(): Promise<void> {
        if (!this.currentConfig) {
return;
}
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `business-context-${timestamp}.backup.yaml`;
        const backupPath = join(this.backupDir, backupName);
        
        const yamlContent = yaml.dump(this.currentConfig, { indent: 2 });
        await writeFile(backupPath, yamlContent, 'utf-8');

        this.logger.debug('Configuration backed up', {
            backupName,
            backupPath
        });
    }

    private transformEntitiesToConfig(entities: Record<string, any>): Record<string, any> {
        const configEntities: Record<string, any> = {};
        
        for (const [entityName, entityDef] of Object.entries(entities)) {
            configEntities[entityName] = {
                fields: entityDef.fields || [],
                businessRules: entityDef.businessRules || [],
                workflows: entityDef.workflows || [],
                relationships: entityDef.relationships || [],
                description: entityDef.description,
            };
        }
        
        return configEntities;
    }

    private transformConfigToEntities(configEntities: Record<string, any>): Record<string, any> {
        const entities: Record<string, any> = {};
        
        for (const [entityName, entityConfig] of Object.entries(configEntities)) {
            entities[entityName] = {
                fields: entityConfig.fields || [],
                businessRules: entityConfig.businessRules || [],
                workflows: entityConfig.workflows || [],
                relationships: entityConfig.relationships || [],
            };
        }
        
        return entities;
    }

    private async validateBusinessLogic(config: BusinessConfiguration, result: ConfigValidationResult): Promise<void> {
        // Validate entity relationships
        for (const [entityName, entityConfig] of Object.entries(config.entities)) {
            if (entityConfig.relationships) {
                for (const relationship of entityConfig.relationships) {
                    if (!config.entities[relationship.entity]) {
                        result.errors.push({
                            path: `entities.${entityName}.relationships`,
                            message: `Referenced entity "${relationship.entity}" does not exist`,
                            severity: 'error',
                        });
                    }
                }
            }
        }
        
        // Validate workflow steps
        if (config.workflows) {
            for (const workflow of config.workflows) {
                for (const step of workflow.steps) {
                    if (step.entity && !config.entities[step.entity]) {
                        result.warnings.push({
                            path: `workflows.${workflow.name}.steps`,
                            message: `Step "${step.name}" references unknown entity "${step.entity}"`,
                            suggestion: `Add entity "${step.entity}" or update the step reference`,
                        });
                    }
                }
            }
        }
        
        // Validate service mappings
        if (config.translations?.services) {
            for (const [serviceName, serviceConfig] of Object.entries(config.translations.services)) {
                for (const [_fieldPath, businessField] of Object.entries(serviceConfig.fields)) {
                    const [entityName] = businessField.split('.');
                    if (entityName && !config.entities[entityName]) {
                        result.warnings.push({
                            path: `translations.services.${serviceName}.fields`,
                            message: `Field mapping references unknown entity "${entityName}"`,
                            suggestion: `Add entity "${entityName}" or update the field mapping`,
                        });
                    }
                }
            }
        }
    }

    private async generateSuggestions(config: BusinessConfiguration, result: ConfigValidationResult): Promise<void> {
        // Suggest missing common entities
        const commonEntities = ['customer', 'order', 'payment', 'product'];
        const existingEntities = Object.keys(config.entities);
        
        for (const commonEntity of commonEntities) {
            if (!existingEntities.includes(commonEntity)) {
                const isRelevant = await this.isEntityRelevantForBusiness(commonEntity, config.business.type);
                if (isRelevant) {
                    result.suggestions.push({
                        type: 'enhancement',
                        description: `Consider adding a "${commonEntity}" entity for ${config.business.type} businesses`,
                        impact: 'medium',
                    });
                }
            }
        }
        
        // Suggest workflow optimizations
        if (!config.workflows || config.workflows.length === 0) {
            result.suggestions.push({
                type: 'optimization',
                description: 'Add business workflows to automate common processes',
                impact: 'high',
            });
        }
        
        // Suggest service integrations
        if (!config.translations?.services || Object.keys(config.translations.services).length === 0) {
            result.suggestions.push({
                type: 'integration',
                description: 'Connect external services to extend functionality',
                impact: 'high',
            });
        }
    }

    private async isEntityRelevantForBusiness(entityName: string, businessType: string): Promise<boolean> {
        // Try to get business entities from registry to check if entity is part of the current business model
        const registeredEntities = BusinessTypeRegistry.getEntityTypes();
        
        // Check if entity is in the currently registered business entities
        if (registeredEntities.includes(entityName)) {
            return true;
        }
        
        // Check if entity is in the current configuration
        if (this.currentConfig && this.currentConfig.entities[entityName]) {
            return true;
        }
        
        // Universal entity relevance based on semantic similarity
        return this.isEntityUniversallyRelevant(entityName, businessType);
    }

    /**
     * Check if an entity is universally relevant using semantic analysis
     */
    private isEntityUniversallyRelevant(entityName: string, businessType: string): boolean {
        // Universal core entities that are relevant to most business types
        const universalEntities = ['customer', 'user', 'client', 'member', 'contact'];
        
        if (universalEntities.includes(entityName.toLowerCase())) {
            return true;
        }
        
        // Check semantic similarity with business type keywords
        const businessKeywords = businessType.toLowerCase().split(/[-_\s]/);
        
        // Entity-business type semantic mappings
        const semanticMappings: Record<string, string[]> = {
            'order': ['commerce', 'shop', 'store', 'retail', 'restaurant', 'food'],
            'payment': ['financial', 'commerce', 'subscription', 'service', 'business'],
            'product': ['commerce', 'retail', 'shop', 'store', 'inventory'],
            'appointment': ['service', 'healthcare', 'professional', 'consulting'],
            'patient': ['healthcare', 'medical', 'clinic', 'hospital'],
            'student': ['education', 'school', 'university', 'learning'],
            'project': ['consulting', 'service', 'professional', 'creative'],
            'event': ['community', 'social', 'platform', 'gathering'],
            'resource': ['community', 'platform', 'sharing', 'collaboration'],
            'showcase': ['creative', 'portfolio', 'display', 'exhibition']
        };
        
        // Check if entity has semantic relevance to business type
        const entityMappings = semanticMappings[entityName.toLowerCase()];
        if (entityMappings) {
            return businessKeywords.some(keyword => 
                entityMappings.some(mapping => 
                    keyword.includes(mapping) || mapping.includes(keyword)
                )
            );
        }
        
        // Default to false for unknown entities
        return false;
    }

    private flattenFieldMappings(mappings: Record<string, any>): Record<string, string> {
        const flattened: Record<string, string> = {};
        
        for (const [entityName, entityMapping] of Object.entries(mappings)) {
            if (entityMapping.fieldMappings) {
                for (const [serviceField, businessField] of Object.entries(entityMapping.fieldMappings)) {
                    flattened[`${entityName}.${serviceField}`] = `${entityMapping.entity}.${businessField}`;
                }
            }
        }
        
        return flattened;
    }

    private extractTransformations(mappings: Record<string, any>): string[] {
        const transformations: string[] = [];
        
        for (const entityMapping of Object.values(mappings)) {
            if (entityMapping.transformations) {
                transformations.push(...entityMapping.transformations);
            }
        }
        
        return [...new Set(transformations)]; // Remove duplicates
    }

    private generateTypeScriptDefinitions(config: BusinessConfiguration): string {
        let typescript = '// Auto-generated TypeScript definitions from business context\n\n';
        
        // Generate entity interfaces
        for (const [entityName, entityConfig] of Object.entries(config.entities)) {
            const interfaceName = `${this.capitalize(entityName)}Entity`;
            typescript += `export interface ${interfaceName} {\n`;
            
            for (const field of entityConfig.fields) {
                const optional = !field.required ? '?' : '';
                const type = this.mapToTypeScriptType(field.type);
                typescript += `  ${field.name}${optional}: ${type};\n`;
            }
            
            typescript += '}\n\n';
        }
        
        return typescript;
    }

    /**
     * Initialize context from recipe
     */
    async initializeFromRecipe(recipe: Recipe, contextName: string): Promise<void> {
        this.logger.info('Initializing context from recipe', {
            contextName,
            recipeName: recipe.name,
            businessType: recipe.businessType
        });

        // Create context directory structure
        await this.ensureContextDirectory(contextName);
        
        // Generate initial entities from recipe
        if (recipe.entities) {
            await this.createEntitiesFromRecipe(contextName, recipe.entities);
        }
        
        // Save context metadata
        await this.saveContextMetadata(contextName, recipe);

        this.logger.info('Context initialized successfully', {
            contextName,
            entitiesCount: recipe.entities ? Object.keys(recipe.entities).length : 0
        });
    }

    /**
     * Load context entities
     */
    async loadContextEntities<T = any>(contextName: string, entityType: string): Promise<T[]> {
        const entitiesDir = join(this.contextsDir, contextName, 'entities', entityType);
        
        try {
            const files = await readdir(entitiesDir);
            const entities: T[] = [];
            
            for (const file of files) {
                if (file.endsWith('.yaml') || file.endsWith('.yml')) {
                    const filePath = join(entitiesDir, file);
                    const content = await readFile(filePath, 'utf-8');
                    const entity = yaml.load(content) as T;
                    entities.push(entity);
                }
            }
            
            return entities;
        } catch (error) {
            // Context or entity type doesn't exist yet
            return [];
        }
    }

    /**
     * Save context entity
     */
    async saveContextEntity<T = any>(contextName: string, entityType: string, entity: T & { id: string }): Promise<void> {
        const entitiesDir = join(this.contextsDir, contextName, 'entities', entityType);
        await mkdir(entitiesDir, { recursive: true });
        
        const entityPath = join(entitiesDir, `${entity.id}.yaml`);
        const yamlContent = yaml.dump(entity, {
            indent: 2,
            lineWidth: 120,
            quotingType: '"',
            forceQuotes: false
        });
        
        await writeFile(entityPath, yamlContent, 'utf-8');
    }

    /**
     * List available contexts
     */
    async listContexts(): Promise<string[]> {
        try {
            const entries = await readdir(this.contextsDir, { withFileTypes: true });
            return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
        } catch {
            return [];
        }
    }

    /**
     * Get context metadata
     */
    async getContextMetadata(contextName: string): Promise<Recipe | null> {
        try {
            const metadataPath = join(this.contextsDir, contextName, 'context.yaml');
            const content = await readFile(metadataPath, 'utf-8');
            return yaml.load(content) as Recipe;
        } catch {
            return null;
        }
    }

    /**
     * Switch to context (for future context switching feature)
     */
    async switchToContext(contextName: string): Promise<void> {
        const contextExists = await this.contextExists(contextName);
        if (!contextExists) {
            throw new Error(`Context "${contextName}" does not exist`);
        }

        // Future: Implement context isolation and storage switching
        this.logger.info('Switched to context', {
            contextName
        });
    }

    /**
     * Check if context exists
     */
    async contextExists(contextName: string): Promise<boolean> {
        try {
            const contextPath = join(this.contextsDir, contextName);
            await access(contextPath);
            return true;
        } catch {
            return false;
        }
    }

    private async ensureContextDirectory(contextName: string): Promise<void> {
        const contextPath = join(this.contextsDir, contextName);
        const entitiesPath = join(contextPath, 'entities');
        
        await mkdir(entitiesPath, { recursive: true });
    }

    private async createEntitiesFromRecipe(contextName: string, entities: Record<string, any>): Promise<void> {
        for (const [entityName, entityDef] of Object.entries(entities)) {
            const entityDir = join(this.contextsDir, contextName, 'entities', entityName.toLowerCase());
            await mkdir(entityDir, { recursive: true });
            
            // Create entity schema file
            const schemaPath = join(entityDir, '_schema.yaml');
            const schemaContent = yaml.dump(entityDef, { indent: 2 });
            await writeFile(schemaPath, schemaContent, 'utf-8');
        }
    }

    private async saveContextMetadata(contextName: string, recipe: Recipe): Promise<void> {
        const metadataPath = join(this.contextsDir, contextName, 'context.yaml');
        const metadata = {
            name: recipe.name,
            description: recipe.description,
            businessType: recipe.businessType,
            display: recipe.display,
            context: recipe.context,
            entities: Object.keys(recipe.entities),
            workflows: recipe.workflows?.map(w => w.name) || [],
            businessRules: recipe.businessRules || [],
            createdAt: new Date().toISOString(),
            version: '1.0.0'
        };
        
        const yamlContent = yaml.dump(metadata, { indent: 2 });
        await writeFile(metadataPath, yamlContent, 'utf-8');
    }

    private mapToTypeScriptType(fieldType: string): string {
        const typeMap: Record<string, string> = {
            string: 'string',
            number: 'number',
            boolean: 'boolean',
            date: 'Date',
            array: 'any[]',
            object: 'Record<string, any>',
            enum: 'string',
        };
        
        return typeMap[fieldType] || 'any';
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private deepMerge(target: any, source: any): any {
        if (source === null || typeof source !== 'object') {
            return source;
        }
        
        if (target === null || typeof target !== 'object') {
            return source;
        }
        
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }
}