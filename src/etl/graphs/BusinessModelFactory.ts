/**
 * BusinessModelFactory - Register business domain models from context
 * 
 * @package     @imajin/cli
 * @subpackage  etl/graphs
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-13
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
import { z } from 'zod';

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

    /**
     * Register business domain model from context
     */
    static registerBusinessDomain(context: BusinessDomainModel): void {
        console.log(`🏗️ Registering business domain: ${context.businessType}`);
        
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
        
        console.log(`✅ Business domain "${context.businessType}" registered with ${Object.keys(context.entities).length} entities`);
    }

    /**
     * Generate service translation mappings
     */
    static generateServiceMappings(
        context: BusinessDomainModel,
        serviceSchema: ServiceSchemaType
    ): TranslationMapping {
        console.log(`🔗 Generating service mappings: ${serviceSchema.name} → ${context.businessType}`);
        
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
        
        console.log(`✅ Generated ${Object.keys(mappings).length} service mappings with ${(translationMapping.confidence * 100).toFixed(1)}% confidence`);
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
     * Generate suggested business workflows
     */
    static suggestWorkflows(
        businessContext: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        console.log(`💡 Suggesting workflows for ${businessContext.businessType} with ${availableServices.length} services`);
        
        const suggestions: WorkflowSuggestion[] = [];
        
        // Restaurant workflows
        if (businessContext.businessType === 'restaurant') {
            suggestions.push(...this.generateRestaurantWorkflows(businessContext, availableServices));
        }
        
        // E-commerce workflows
        if (businessContext.businessType === 'ecommerce') {
            suggestions.push(...this.generateEcommerceWorkflows(businessContext, availableServices));
        }
        
        // SaaS workflows
        if (businessContext.businessType === 'saas') {
            suggestions.push(...this.generateSaasWorkflows(businessContext, availableServices));
        }
        
        // Generic business workflows
        suggestions.push(...this.generateGenericBusinessWorkflows(businessContext, availableServices));
        
        console.log(`✅ Generated ${suggestions.length} workflow suggestions`);
        return suggestions;
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
                businessRules: context.businessRules?.map(r => r.rule) || [],
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
                if (fieldDef.validation?.min) zodType = (zodType as z.ZodString).min(fieldDef.validation.min);
                if (fieldDef.validation?.max) zodType = (zodType as z.ZodString).max(fieldDef.validation.max);
                if (fieldDef.validation?.pattern) zodType = (zodType as z.ZodString).regex(new RegExp(fieldDef.validation.pattern));
                break;
                
            case 'number':
                zodType = z.number();
                if (fieldDef.validation?.min) zodType = (zodType as z.ZodNumber).min(fieldDef.validation.min);
                if (fieldDef.validation?.max) zodType = (zodType as z.ZodNumber).max(fieldDef.validation.max);
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

    private static generateCompatibilityMap(context: BusinessDomainModel): ModelCompatibility {
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
                targetEntity: this.mapToUniversalEntity(entityName),
                fieldMappings: this.generateFieldMappings(entityDef),
                transformations: this.generateTransformations(entityDef),
            });
        }
        
        return rules;
    }

    private static mapToUniversalEntity(entityName: string): string {
        const mappings: Record<string, string> = {
            customer: 'UniversalCustomer',
            user: 'UniversalCustomer',
            client: 'UniversalCustomer',
            payment: 'UniversalPayment',
            transaction: 'UniversalPayment',
            order: 'UniversalOrder',
            purchase: 'UniversalOrder',
            product: 'UniversalProduct',
            item: 'UniversalProduct',
            subscription: 'UniversalSubscription',
            contact: 'UniversalContact',
        };
        
        return mappings[entityName] || 'UniversalElement';
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
    ): any | null {
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

    // =============================================================================
    // WORKFLOW SUGGESTIONS
    // =============================================================================

    private static generateRestaurantWorkflows(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const workflows: WorkflowSuggestion[] = [];
        
        const hasStripe = availableServices.some(s => s.name === 'stripe');
        const hasToast = availableServices.some(s => s.name === 'toast');
        const hasMailchimp = availableServices.some(s => s.name === 'mailchimp');
        
        if (hasStripe && hasToast) {
            workflows.push({
                name: 'complete_order_workflow',
                description: 'Complete order from POS to payment processing',
                steps: [
                    'Get order from Toast POS',
                    'Process payment via Stripe',
                    'Update order status in Toast',
                    'Award loyalty points to customer',
                ],
                services: ['toast', 'stripe'],
                businessEntities: ['order', 'customer', 'payment'],
                estimatedSavings: '2-3 hours per day',
            });
        }
        
        if (hasMailchimp) {
            workflows.push({
                name: 'customer_engagement_workflow',
                description: 'Automated customer engagement and marketing',
                steps: [
                    'Track customer visit patterns',
                    'Segment customers by preferences',
                    'Send targeted marketing campaigns',
                    'Track campaign performance',
                ],
                services: ['mailchimp'],
                businessEntities: ['customer'],
                estimatedSavings: '5-8 hours per week',
            });
        }
        
        return workflows;
    }

    private static generateEcommerceWorkflows(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const workflows: WorkflowSuggestion[] = [];
        
        const hasStripe = availableServices.some(s => s.name === 'stripe');
        const hasShopify = availableServices.some(s => s.name === 'shopify');
        
        if (hasStripe && hasShopify) {
            workflows.push({
                name: 'order_fulfillment_workflow',
                description: 'Complete order processing from cart to delivery',
                steps: [
                    'Process payment via Stripe',
                    'Update inventory in Shopify',
                    'Generate shipping label',
                    'Send order confirmation to customer',
                ],
                services: ['stripe', 'shopify'],
                businessEntities: ['order', 'customer', 'product'],
                estimatedSavings: '1-2 hours per day',
            });
        }
        
        return workflows;
    }

    private static generateSaasWorkflows(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const workflows: WorkflowSuggestion[] = [];
        
        const hasStripe = availableServices.some(s => s.name === 'stripe');
        
        if (hasStripe) {
            workflows.push({
                name: 'subscription_management_workflow',
                description: 'Automated subscription lifecycle management',
                steps: [
                    'Handle subscription creation',
                    'Process recurring payments',
                    'Manage trial periods',
                    'Handle subscription cancellations',
                ],
                services: ['stripe'],
                businessEntities: ['user', 'subscription'],
                estimatedSavings: '3-5 hours per week',
            });
        }
        
        return workflows;
    }

    private static generateGenericBusinessWorkflows(
        context: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): WorkflowSuggestion[] {
        const workflows: WorkflowSuggestion[] = [];
        
        // Customer data synchronization
        if (availableServices.length >= 2) {
            workflows.push({
                name: 'customer_data_sync_workflow',
                description: 'Keep customer data synchronized across all services',
                steps: [
                    'Detect customer data changes',
                    'Validate data consistency',
                    'Update records across services',
                    'Log synchronization results',
                ],
                services: availableServices.map(s => s.name),
                businessEntities: ['customer'],
                estimatedSavings: '2-4 hours per week',
            });
        }
        
        return workflows;
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