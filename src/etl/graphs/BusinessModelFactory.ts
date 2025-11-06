/**
 * BusinessModelFactory - Register business domain models from context
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-04
 *
 * Integration Points:
 * - Extends existing ModelFactory for business domain registration
 * - Leverages ETL graph translation engine for service mappings
 * - Generates compatibility mappings for service integration
 * - Provides dynamic schema validation and type generation
 */

import { ModelFactory, type ModelDefinition, type TranslationMapping } from './models.js';
import type {
    GraphModel,
    CompatibilityMatrix as ModelCompatibility
} from '../core/interfaces.js';
import type { BusinessDomainModel } from '../../context/BusinessContextProcessor.js';
import { BusinessTypeRegistry } from '../../types/Core.js';
import { z } from 'zod';
import type { Logger } from '../../logging/Logger.js';

// Define ServiceSchema interface for type safety
export interface ServiceSchemaType {
    name: string;
    version: string;
    entities: Record<string, any>;
}

// =============================================================================
// BUSINESS MODEL FACTORY
// =============================================================================

export class BusinessModelFactory extends ModelFactory {
    private static businessDomains: Map<string, BusinessDomainModel> = new Map();
    private static registeredBusinessModels: Map<string, GraphModel> = new Map();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Dynamic require for logger initialization
    private static logger: Logger = new (require('../../logging/Logger.js').Logger)({ level: 'debug' });

    /**
     * Register business domain model from context
     */
    static registerBusinessDomain(context: BusinessDomainModel): void {
        this.logger.info('Registering business domain', {
            businessType: context.businessType,
            operation: 'registerBusinessDomain'
        });
        
        // Store the business context
        this.businessDomains.set(context.businessType, context);
        
        // Generate graph model from business context
        const graphModel: GraphModel = this.generateGraphModel(context);
        
        // Create ModelDefinition for base ModelFactory
        const modelDefinition: ModelDefinition = {
            name: context.businessType,
            version: '1.0.0',
            schema: graphModel.schema,
            compatibility: graphModel.compatibilityMap,
            metadata: graphModel.metadata,
        };
        
        // Register with base ModelFactory
        this.registerModel(modelDefinition);
        
        // Store for business-specific operations
        this.registeredBusinessModels.set(context.businessType, graphModel);

        this.logger.info('Business domain registered', {
            businessType: context.businessType,
            entitiesCount: Object.keys(context.entities).length,
            operation: 'registerBusinessDomain'
        });
    }

    /**
     * Generate service translation mappings
     */
    static generateServiceMappings(
        context: BusinessDomainModel,
        serviceSchema: ServiceSchemaType
    ): TranslationMapping {
        this.logger.info('Generating service mappings', {
            serviceName: serviceSchema.name,
            businessType: context.businessType,
            operation: 'generateServiceMappings'
        });
        
        const mappings: Record<string, any> = {};
        
        // Map service entities to business entities
        for (const [serviceEntity, serviceEntityDef] of Object.entries(serviceSchema.entities)) {
            const businessMapping = this.findBestBusinessEntityMatch(
                serviceEntity, 
                serviceEntityDef, 
                context
            );
            
            if (businessMapping) {
                mappings[serviceEntity] = businessMapping;
            }
        }
        
        const translationMapping: TranslationMapping = {
            sourceModel: serviceSchema.name,
            targetModel: context.businessType,
            mappings,
            confidence: this.calculateMappingConfidence(mappings, context),
            bidirectional: true,
            metadata: {
                generatedFrom: 'business-context',
                timestamp: new Date().toISOString(),
                businessType: context.businessType,
                serviceVersion: serviceSchema.version,
            },
        };

        this.logger.info('Service mappings generated', {
            mappingsCount: Object.keys(mappings).length,
            confidence: `${(translationMapping.confidence * 100).toFixed(1)}%`,
            serviceName: serviceSchema.name,
            businessType: context.businessType,
            operation: 'generateServiceMappings'
        });
        return translationMapping;
    }

    /**
     * Get business domain model by type
     */
    static getBusinessDomain(businessType: string): BusinessDomainModel | undefined {
        return this.businessDomains.get(businessType);
    }

    /**
     * Get all registered business domains
     */
    static getAllBusinessDomains(): Record<string, BusinessDomainModel> {
        return Object.fromEntries(this.businessDomains.entries());
    }

    /**
     * Check if business domain is registered
     */
    static isBusinessDomainRegistered(businessType: string): boolean {
        return this.businessDomains.has(businessType);
    }

    /**
     * Update business domain model
     */
    static updateBusinessDomain(businessType: string, updates: Partial<BusinessDomainModel>): void {
        const existing = this.businessDomains.get(businessType);
        if (!existing) {
            throw new Error(`Business domain "${businessType}" not found`);
        }

        const updated = { ...existing, ...updates };
        this.registerBusinessDomain(updated);
    }

    /**
     * Suggest workflows based on business context and available services
     */
    static suggestWorkflows(
        businessContext: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        this.logger.info('Suggesting workflows', {
            businessType: businessContext.businessType,
            servicesCount: availableServices.length,
            operation: 'suggestWorkflows'
        });
        
        const suggestions: WorkflowSuggestion[] = [];
        
        // Load workflows from business context (recipe-based)
        if (businessContext.workflows && businessContext.workflows.length > 0) {
            suggestions.push(...this.generateWorkflowsFromRecipe(businessContext, availableServices));
        }
        
        // Generate universal entity-based workflows
        suggestions.push(...this.generateEntityBasedWorkflows(businessContext, availableServices));
        
        // Generate universal service integration workflows
        suggestions.push(...this.generateServiceIntegrationWorkflows(businessContext, availableServices));

        this.logger.info('Workflows suggested', {
            suggestionsCount: suggestions.length,
            businessType: businessContext.businessType,
            operation: 'suggestWorkflows'
        });
        return suggestions;
    }

    /**
     * Generate workflows from recipe definitions
     */
    private static generateWorkflowsFromRecipe(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const suggestions: WorkflowSuggestion[] = [];
        
        for (const workflow of context.workflows || []) {
            suggestions.push({
                name: workflow.name,
                description: workflow.description,
                steps: workflow.steps,
                services: this.identifyRelevantServices(workflow.steps, availableServices),
                businessEntities: this.extractEntitiesFromWorkflow(workflow, context),
                estimatedSavings: '2-4 hours per execution',
                priority: 'medium',
                complexity: 'moderate'
            });
        }
        
        return suggestions;
    }

    /**
     * Generate workflows based on entities in the business context
     */
    private static generateEntityBasedWorkflows(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const suggestions: WorkflowSuggestion[] = [];
        const entities = Object.keys(context.entities);
        
        // Generate CRUD workflows for each entity
        for (const entityName of entities) {
            suggestions.push({
                name: `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} Management`,
                description: `Complete ${entityName} lifecycle management workflow`,
                steps: [
                    `Create ${entityName}`,
                    `Update ${entityName} details`,
                    `Track ${entityName} status`,
                    `Archive ${entityName}`
                ],
                services: this.identifyServicesForEntity(entityName, availableServices),
                businessEntities: [entityName],
                estimatedSavings: '1-2 hours per operation',
                priority: 'medium',
                complexity: 'simple'
            });
        }
        
        return suggestions;
    }

    /**
     * Generate workflows for service integrations
     */
    private static generateServiceIntegrationWorkflows(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const suggestions: WorkflowSuggestion[] = [];
        
        for (const service of availableServices) {
            suggestions.push({
                name: `${service.name} Integration`,
                description: `Automated data sync with ${service.name}`,
                steps: [
                    `Connect to ${service.name}`,
                    'Map business entities',
                    'Configure sync rules',
                    'Monitor data flow'
                ],
                services: [service.name],
                businessEntities: this.identifyCompatibleEntities(service, context),
                estimatedSavings: '3-5 hours per sync cycle',
                priority: 'high',
                complexity: 'moderate'
            });
        }
        
        return suggestions;
    }

    /**
     * Identify services relevant to workflow steps
     */
    private static identifyRelevantServices(steps: string[], availableServices: ServiceSchemaType[]): string[] {
        const relevantServices: string[] = [];
        
        for (const service of availableServices) {
            const serviceKeywords = service.name.toLowerCase().split(/[-_\s]/);
            
            for (const step of steps) {
                const stepKeywords = step.toLowerCase().split(/\s+/);
                
                // Check for keyword overlap
                const hasOverlap = serviceKeywords.some(keyword => 
                    stepKeywords.some(stepWord => 
                        stepWord.includes(keyword) || keyword.includes(stepWord)
                    )
                );
                
                if (hasOverlap) {
                    relevantServices.push(service.name);
                    break;
                }
            }
        }
        
        return [...new Set(relevantServices)];
    }

    /**
     * Extract entities mentioned in workflow
     */
    private static extractEntitiesFromWorkflow(workflow: any, context: BusinessDomainModel): string[] {
        const entities: string[] = [];
        const entityNames = Object.keys(context.entities);
        
        const workflowText = `${workflow.name} ${workflow.description} ${workflow.steps.join(' ')}`.toLowerCase();
        
        for (const entityName of entityNames) {
            if (workflowText.includes(entityName.toLowerCase())) {
                entities.push(entityName);
            }
        }
        
        return entities;
    }

    /**
     * Identify services that can work with a specific entity
     */
    private static identifyServicesForEntity(entityName: string, availableServices: ServiceSchemaType[]): string[] {
        const services: string[] = [];
        
        for (const service of availableServices) {
            // Check if service has entities compatible with this business entity
            if (service.entities && Object.keys(service.entities).length > 0) {
                const serviceEntityNames = Object.keys(service.entities);
                
                // Look for semantic similarity
                const isCompatible = serviceEntityNames.some(serviceEntity => 
                    this.areEntitiesCompatible(entityName, serviceEntity)
                );
                
                if (isCompatible) {
                    services.push(service.name);
                }
            }
        }
        
        return services;
    }

    /**
     * Identify entities compatible with a service
     */
    private static identifyCompatibleEntities(service: ServiceSchemaType, context: BusinessDomainModel): string[] {
        const compatibleEntities: string[] = [];
        const businessEntities = Object.keys(context.entities);
        
        if (service.entities) {
            const serviceEntities = Object.keys(service.entities);
            
            for (const businessEntity of businessEntities) {
                for (const serviceEntity of serviceEntities) {
                    if (this.areEntitiesCompatible(businessEntity, serviceEntity)) {
                        compatibleEntities.push(businessEntity);
                        break;
                    }
                }
            }
        }
        
        return compatibleEntities;
    }

    /**
     * Check if two entities are compatible based on semantic similarity
     */
    private static areEntitiesCompatible(entity1: string, entity2: string): boolean {
        // Direct match
        if (entity1.toLowerCase() === entity2.toLowerCase()) {
            return true;
        }
        
        // Common entity mappings
        const entitySynonyms: Record<string, string[]> = {
            'customer': ['client', 'user', 'account', 'contact', 'member'],
            'order': ['transaction', 'purchase', 'sale', 'booking', 'reservation'],
            'product': ['item', 'service', 'offering', 'article', 'good'],
            'payment': ['transaction', 'charge', 'invoice', 'billing', 'subscription'],
            'project': ['task', 'job', 'assignment', 'work', 'initiative'],
            'event': ['activity', 'occurrence', 'happening', 'meeting', 'session']
        };
        
        for (const [baseEntity, synonyms] of Object.entries(entitySynonyms)) {
            const entity1Match = entity1.toLowerCase() === baseEntity || synonyms.includes(entity1.toLowerCase());
            const entity2Match = entity2.toLowerCase() === baseEntity || synonyms.includes(entity2.toLowerCase());
            
            if (entity1Match && entity2Match) {
                return true;
            }
        }
        
        return false;
    }

    // =============================================================================
    // GRAPH MODEL GENERATION
    // =============================================================================

    private static generateGraphModel(context: BusinessDomainModel): GraphModel {
        const schema = this.generateGraphSchema(context);
        const compatibilityMap = this.generateCompatibilityMap(context);
        
        return {
            modelType: context.businessType,
            version: '1.0.0',
            schema,
            compatibilityMap,
            metadata: {
                businessDescription: context.description,
                generatedFrom: 'business-context',
                entities: Object.keys(context.entities),
                workflows: context.workflows?.map(w => w.name) || [],
                businessRules: context.businessRules || [],
                createdAt: new Date().toISOString(),
            },
        };
    }

    private static generateGraphSchema(context: BusinessDomainModel): any {
        const entitySchemas: Record<string, any> = {};
        
        // Generate Zod schemas for each entity
        for (const [entityName, entityDef] of Object.entries(context.entities)) {
            entitySchemas[entityName] = this.generateEntitySchema(entityName, entityDef);
        }
        
        return {
            type: 'business-domain',
            businessType: context.businessType,
            entities: entitySchemas,
            relationships: this.extractAllRelationships(context),
            workflows: context.workflows || [],
            businessRules: context.businessRules || [],
        };
    }

    private static generateEntitySchema(entityName: string, entityDef: any): z.ZodType<any> {
        const schemaFields: Record<string, z.ZodType<any>> = {};
        
        // Add standard fields
        schemaFields.id = z.string().min(1);
        schemaFields.createdAt = z.date().optional();
        schemaFields.updatedAt = z.date().optional();
        
        // Add entity-specific fields
        for (const field of entityDef.fields) {
            schemaFields[field.name] = this.createZodFieldFromBusinessField(field);
        }
        
        return z.object(schemaFields);
    }

    private static createZodFieldFromBusinessField(fieldDef: any): z.ZodType<any> {
        let zodType: z.ZodType<any>;
        
        switch (fieldDef.type) {
            case 'string':
                zodType = z.string();
                if (fieldDef.validation?.min) {
zodType = (zodType as z.ZodString).min(fieldDef.validation.min);
}
                if (fieldDef.validation?.max) {
zodType = (zodType as z.ZodString).max(fieldDef.validation.max);
}
                if (fieldDef.validation?.pattern) {
zodType = (zodType as z.ZodString).regex(new RegExp(fieldDef.validation.pattern));
}
                break;
                
            case 'number':
                zodType = z.number();
                if (fieldDef.validation?.min) {
zodType = (zodType as z.ZodNumber).min(fieldDef.validation.min);
}
                if (fieldDef.validation?.max) {
zodType = (zodType as z.ZodNumber).max(fieldDef.validation.max);
}
                break;
                
            case 'boolean':
                zodType = z.boolean();
                break;
                
            case 'date':
                zodType = z.date();
                break;
                
            case 'array':
                zodType = z.array(z.string()); // Simplified for now
                break;
                
            case 'enum':
                if (fieldDef.values && Array.isArray(fieldDef.values) && fieldDef.values.length > 0) {
                    zodType = z.enum(fieldDef.values as [string, ...string[]]);
                } else {
                    zodType = z.string();
                }
                break;
                
            default:
                zodType = z.any();
        }
        
        // Apply optional/required
        if (!fieldDef.required || fieldDef.optional) {
            zodType = zodType.optional();
        }
        
        // Apply default value
        if (fieldDef.default !== undefined) {
            zodType = zodType.default(fieldDef.default);
        }
        
        return zodType;
    }

    private static extractAllRelationships(context: BusinessDomainModel): any[] {
        const relationships: any[] = [];
        
        for (const [entityName, entityDef] of Object.entries(context.entities)) {
            if (entityDef.relationships) {
                for (const rel of entityDef.relationships) {
                    relationships.push({
                        from: entityName,
                        to: rel.entity,
                        type: rel.type,
                        foreignKey: rel.foreignKey,
                        description: rel.description,
                    });
                }
            }
        }
        
        return relationships;
    }

    private static generateCompatibilityMap(_context: BusinessDomainModel): ModelCompatibility {
        return {
            directCompatible: ['universal'], // Can work with universal schemas
            translatableFrom: ['stripe', 'shopify', 'mailchimp'], // Can translate from these services
            translatableTo: ['json', 'csv', 'api'], // Can translate to these formats
        };
    }

    /**
     * Generate translation rules for compatibility
     */
    private static generateTranslationRules(context: BusinessDomainModel): any[] {
        const rules: any[] = [];
        
        for (const [entityName, entityDef] of Object.entries(context.entities)) {
            rules.push({
                sourceEntity: entityName,
                targetEntity: this.mapToBusinessEntity(entityName, context.businessType),
                fieldMappings: this.generateFieldMappings(entityDef),
                transformations: this.generateTransformations(entityDef),
            });
        }
        
        return rules;
    }

    /**
     * Generate ETL mappings from business context
     */
    static generateBusinessMappings(businessType: string): Record<string, string> {
        const mappings: Record<string, string> = {};
        
        // First, try to get from registered types
        const registeredTypes = BusinessTypeRegistry.getRegisteredTypes();
        
        for (const typeName of registeredTypes) {
            const [type, entity] = typeName.split('.');
            if (type === businessType && entity) {
                // Map business entity to its business context type
                mappings[entity.toLowerCase()] = typeName;
            }
        }
        
        // If no mappings found from registry, generate default mappings for business type
        if (Object.keys(mappings).length === 0) {
            const defaultEntities = this.getDefaultEntitiesForBusinessType(businessType);
            
            for (const entityName of defaultEntities) {
                mappings[entityName.toLowerCase()] = `${businessType}.${entityName}`;
            }
        }
        
        return mappings;
    }

    /**
     * Get default entity names for a business type
     */
    private static getDefaultEntitiesForBusinessType(businessType: string): string[] {
        // Instead of returning defaults, throw configuration error
        throw new Error(
            `No business entities registered for type '${businessType}'. ` +
            `Please register business entities using BusinessTypeRegistry.registerType() ` +
            `or configure your business context before using generateBusinessMappings().`
        );
    }

    /**
     * Register business domain with ETL system
     */
    static registerBusinessDomainWithETL(domain: BusinessDomainModel): void {
        const mappings = this.generateBusinessMappings(domain.businessType);
        
        // Register each entity mapping
        for (const [entityKey, businessType] of Object.entries(mappings)) {
            this.registerMapping(entityKey, businessType, domain);
        }

        this.logger.info('ETL mappings registered', {
            entitiesCount: Object.keys(mappings).length,
            businessType: domain.businessType,
            operation: 'registerBusinessDomainWithETL'
        });
    }

    /**
     * Register ETL mapping for business entity
     */
    private static registerMapping(entityKey: string, businessType: string, domain: BusinessDomainModel): void {
        // Implementation would register the mapping with the ETL system
        // This is a placeholder for the actual ETL registration logic
        this.logger.debug('ETL mapping registered', {
            entityKey,
            businessType,
            domainBusinessType: domain.businessType,
            operation: 'registerMapping'
        });
    }

    private static mapToBusinessEntity(entityName: string, businessType: string): string {
        const mappings = this.generateBusinessMappings(businessType);
        return mappings[entityName.toLowerCase()] || `${businessType}.${entityName}`;
    }

    private static generateFieldMappings(entityDef: any): Record<string, string> {
        const mappings: Record<string, string> = {};
        
        for (const field of entityDef.fields) {
            // Standard field mappings
            const standardMappings: Record<string, string> = {
                name: 'name',
                email: 'email',
                phone: 'phone',
                amount: 'amount',
                currency: 'currency',
                status: 'status',
                description: 'description',
                createdAt: 'createdAt',
                updatedAt: 'updatedAt',
            };
            
            mappings[field.name] = standardMappings[field.name] || field.name;
        }
        
        return mappings;
    }

    private static generateTransformations(entityDef: any): any[] {
        const transformations: any[] = [];
        
        // Add common transformations
        transformations.push({
            type: 'dateNormalization',
            description: 'Normalize date fields to ISO format',
            fields: entityDef.fields
                .filter((f: any) => f.type === 'date')
                .map((f: any) => f.name),
        });
        
        transformations.push({
            type: 'currencyNormalization',
            description: 'Normalize currency amounts to cents',
            fields: entityDef.fields
                .filter((f: any) => f.name.toLowerCase().includes('amount') || f.name.toLowerCase().includes('price'))
                .map((f: any) => f.name),
        });
        
        return transformations;
    }

    // =============================================================================
    // SERVICE MAPPING HELPERS
    // =============================================================================

    /**
     * Find best business entity match for service entity
     */
    private static findBestBusinessEntityMatch(
        serviceEntity: string,
        serviceEntityDef: any,
        context: BusinessDomainModel
    ): any {
        const businessEntities = Object.entries(context.entities);
        
        if (businessEntities.length === 0) {
            return null;
        }
        
        let bestMatch: { score: number; mapping: any } | null = null;
        
        for (const [businessEntity, businessEntityDef] of businessEntities) {
            const score = this.calculateEntityMatchScore(
                serviceEntity, 
                serviceEntityDef, 
                businessEntity, 
                businessEntityDef
            );
            
            if (score > 0.3) { // Minimum confidence threshold
                const mapping = this.generateEntityMapping(
                    serviceEntity, 
                    serviceEntityDef, 
                    businessEntity, 
                    businessEntityDef
                );
                
                if (!bestMatch || score > bestMatch.score) {
                    bestMatch = { score, mapping };
                }
            }
        }
        
        return bestMatch ? bestMatch.mapping : null;
    }

    /**
     * Calculate entity match score
     */
    private static calculateEntityMatchScore(
        serviceEntity: string,
        serviceEntityDef: any,
        businessEntity: string,
        businessEntityDef: any
    ): number {
        let score = 0;
        
        // Semantic similarity of entity names
        const nameSimilarity = this.calculateSemanticSimilarity(serviceEntity, businessEntity);
        score += nameSimilarity * 0.4;
        
        // Field overlap
        const serviceFields = serviceEntityDef.fields?.map((f: any) => f.name) || [];
        const businessFields = businessEntityDef.fields?.map((f: any) => f.name) || [];
        
        if (serviceFields.length > 0 && businessFields.length > 0) {
            const commonFields = serviceFields.filter((f: string) => businessFields.includes(f));
            const fieldOverlap = commonFields.length / Math.max(serviceFields.length, businessFields.length);
            score += fieldOverlap * 0.6;
        }
        
        return Math.min(score, 1.0);
    }

    private static calculateSemanticSimilarity(word1: string, word2: string): number {
        // Simple semantic similarity based on common patterns
        const synonyms: Record<string, string[]> = {
            customer: ['user', 'client', 'buyer', 'patron'],
            product: ['item', 'good', 'merchandise'],
            order: ['purchase', 'transaction', 'sale'],
            payment: ['transaction', 'charge', 'billing'],
        };
        
        const w1 = word1.toLowerCase();
        const w2 = word2.toLowerCase();
        
        for (const [key, values] of Object.entries(synonyms)) {
            if ((key === w1 && values.includes(w2)) || (key === w2 && values.includes(w1))) {
                return 0.8;
            }
        }
        
        return 0;
    }

    private static generateEntityMapping(
        serviceEntity: string,
        serviceEntityDef: any,
        businessEntity: string,
        businessEntityDef: any
    ): any {
        const fieldMappings: Record<string, string> = {};
        
        const serviceFields = serviceEntityDef.fields || [];
        const businessFields = businessEntityDef.fields || [];
        
        // Create field mappings
        for (const serviceField of serviceFields) {
            const matchingBusinessField = businessFields.find((bf: any) => 
                bf.name.toLowerCase() === serviceField.name.toLowerCase() ||
                this.areFieldsSemanticallyRelated(serviceField.name, bf.name)
            );
            
            if (matchingBusinessField) {
                fieldMappings[serviceField.name] = matchingBusinessField.name;
            }
        }
        
        return {
            mapping: `business.${businessEntity}`,
            fields: fieldMappings,
            confidence: this.calculateEntityMatchScore(
                serviceEntity,
                serviceEntityDef,
                businessEntity,
                businessEntityDef
            ),
        };
    }

    private static areFieldsSemanticallyRelated(field1: string, field2: string): boolean {
        const f1 = field1.toLowerCase();
        const f2 = field2.toLowerCase();
        
        const fieldSynonyms: Record<string, string[]> = {
            name: ['title', 'label', 'display_name'],
            email: ['email_address', 'mail'],
            phone: ['telephone', 'mobile', 'phone_number'],
            amount: ['price', 'cost', 'value', 'total'],
            description: ['details', 'notes', 'body', 'content'],
        };
        
        for (const [key, values] of Object.entries(fieldSynonyms)) {
            if ((key === f1 && values.includes(f2)) || (key === f2 && values.includes(f1))) {
                return true;
            }
        }
        
        return false;
    }

    private static calculateMappingConfidence(mappings: Record<string, any>, context: BusinessDomainModel): number {
        if (Object.keys(mappings).length === 0) {
            return 0;
        }
        
        const scores = Object.values(mappings).map((mapping: any) => mapping.confidence || 0);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        
        // Boost confidence if we have good entity coverage
        const entityCoverage = Object.keys(mappings).length / Object.keys(context.entities).length;
        const coverageBoost = Math.min(entityCoverage * 0.2, 0.2);
        
        return Math.min(averageScore + coverageBoost, 1.0);
    }
}

// =============================================================================
// HELPER INTERFACES
// =============================================================================

export interface WorkflowSuggestion {
    name: string;
    description: string;
    steps: string[];
    services: string[];
    businessEntities: string[];
    estimatedSavings: string;
    priority?: 'low' | 'medium' | 'high';
    complexity?: 'simple' | 'moderate' | 'complex';
}