/**
 * BusinessContextProcessor - Dynamic business context and domain model generation
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
 * - OpenAPI/GraphQL specification parsing
 * - Recipe system integration for business models
 * - Universal Elements mapping
 * - ETL bridge generation for cross-service workflows
 */

import { z } from 'zod';
import { RecipeManager, type Recipe } from './RecipeManager.js';

// =============================================================================
// BUSINESS DOMAIN MODEL DEFINITIONS
// =============================================================================

const BusinessDomainModelSchema = z.object({
    businessType: z.string(),
    description: z.string(),
    entities: z.record(z.string(), z.any()),
    workflows: z.array(z.any()).optional().default([]),
    businessRules: z.array(z.string()).optional().default([]),
    integrations: z.array(z.string()).optional().default([]),
    commands: z.array(z.any()).optional().default([]),
});

const TranslationMappingSchema = z.object({
    sourceModel: z.string(),
    targetModel: z.string(),
    mappings: z.record(z.string(), z.any()),
    bidirectional: z.boolean().default(false),
    confidence: z.number().min(0).max(1).default(0.8),
});

const CommandDefinitionSchema = z.object({
    name: z.string(),
    description: z.string(),
    category: z.enum(['porcelain', 'plumbing']),
    arguments: z.array(z.any()).optional().default([]),
    options: z.array(z.any()).optional().default([]),
    examples: z.array(z.string()).optional().default([]),
    businessContext: z.string().optional(),
    entityType: z.string().optional(),
    operation: z.string().optional(),
    serviceIntegration: z.string().optional(),
});

export type BusinessDomainModel = z.infer<typeof BusinessDomainModelSchema>;
export type TranslationMapping = z.infer<typeof TranslationMappingSchema>;
export type CommandDefinition = z.infer<typeof CommandDefinitionSchema>;

// Export schemas for external use
export { BusinessDomainModelSchema, TranslationMappingSchema, CommandDefinitionSchema };

// =============================================================================
// BUSINESS CONTEXT ANALYSIS ENGINE
// =============================================================================

export class BusinessContextProcessor {
    private readonly recipeManager: RecipeManager;
    private readonly businessPatterns: Map<string, BusinessPattern> = new Map();
    private readonly entityPatterns: Map<string, EntityPattern> = new Map();
    private readonly workflowPatterns: Map<string, WorkflowPattern> = new Map();

    constructor() {
        this.recipeManager = new RecipeManager();
        this.initializePatterns();
    }

    /**
     * Convert business description to domain model
     */
    async processBusinessDescription(description: string): Promise<BusinessDomainModel> {
        console.log('🔍 Analyzing business description for domain model generation...');
        
        // Extract business type from description
        const businessType = await this.extractBusinessType(description);
        
        // Try to load recipe first, then fall back to extraction
        const entities = await this.getEntitiesForBusinessType(description, businessType);
        
        const domain: BusinessDomainModel = {
            businessType,
            description,
            entities,
            workflows: this.extractWorkflows(description, entities),
            businessRules: this.extractBusinessRules(description, entities),
            integrations: this.extractIntegrations(description),
            commands: [],
        };

        console.log(`✅ Generated domain model for "${businessType}" with ${Object.keys(entities).length} entities`);
        return domain;
    }

    /**
     * Generate CLI commands from business context
     */
    async generateBusinessCommands(domain: BusinessDomainModel): Promise<CommandDefinition[]> {
        console.log('🎯 Generating business-focused CLI commands...');
        
        const commands: CommandDefinition[] = [];

        // Generate porcelain commands for each entity
        for (const [entityName, entityDef] of Object.entries(domain.entities)) {
            commands.push(...this.generateEntityCommands(entityName, entityDef, domain));
        }

        // Generate workflow commands
        if (domain.workflows) {
            for (const workflow of domain.workflows) {
                commands.push(...this.generateWorkflowCommands(workflow, domain));
            }
        }

        console.log(`✅ Generated ${commands.length} business commands`);
        return commands;
    }

    /**
     * Generate service integration mappings
     */
    async generateServiceMappings(
        domain: BusinessDomainModel,
        availableServices: string[]
    ): Promise<Record<string, TranslationMapping>> {
        console.log('🔗 Generating service integration mappings...');
        
        const mappings: Record<string, TranslationMapping> = {};

        for (const serviceName of availableServices) {
            const mapping = await this.createServiceMapping(domain, serviceName);
            if (mapping) {
                mappings[serviceName] = mapping;
            }
        }

        console.log(`✅ Generated mappings for ${Object.keys(mappings).length} services`);
        return mappings;
    }

    // =============================================================================
    // BUSINESS TYPE EXTRACTION
    // =============================================================================

    private async extractBusinessType(description: string): Promise<string> {
        const text = description.toLowerCase();
        
        // Load available business types from recipe files
        const availableRecipes = await this.recipeManager.listRecipes();
        
        // Try to match description against available recipe types
        for (const recipe of availableRecipes) {
            if (await this.matchesRecipeDescription(text, recipe)) {
                console.log(`🎯 Matched business type: ${recipe.businessType} (${recipe.name})`);
                return recipe.businessType;
            }
        }
        
        // Fall back to generic business type without assumptions
        console.log(`🔍 No specific business type match found, using generic 'business' type`);
        return 'business';
    }

    /**
     * Check if description matches a recipe's business context
     */
    private async matchesRecipeDescription(description: string, recipe: any): Promise<boolean> {
        // Check direct business type mention
        if (description.includes(recipe.businessType) || description.includes(recipe.name.toLowerCase())) {
            return true;
        }
        
        // Check entity keyword matches
        if (recipe.entities) {
            const entityNames = Object.keys(recipe.entities);
            for (const entityName of entityNames) {
                if (description.includes(entityName)) {
                    return true;
                }
            }
        }
        
        // Check workflow keyword matches
        if (recipe.workflows) {
            for (const workflow of recipe.workflows) {
                if (workflow.name && description.includes(workflow.name.toLowerCase())) {
                    return true;
                }
                if (workflow.description && this.hasKeywordOverlap(description, workflow.description.toLowerCase())) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check for significant keyword overlap between descriptions
     */
    private hasKeywordOverlap(text1: string, text2: string): boolean {
        const words1 = text1.split(/\s+/).filter(word => word.length > 3);
        const words2 = text2.split(/\s+/).filter(word => word.length > 3);
        
        let matches = 0;
        for (const word of words1) {
            if (words2.includes(word)) {
                matches++;
            }
        }
        
        // Require at least 2 matching keywords
        return matches >= 2;
    }

    // =============================================================================
    // ENTITY EXTRACTION
    // =============================================================================

    private async getEntitiesForBusinessType(description: string, businessType: string): Promise<Record<string, any>> {
        // First, try to load entities from the recipe system
        const recipe = await this.recipeManager.getRecipe(businessType);
        
        if (recipe && recipe.entities) {
            console.log(`✅ Loaded entities from recipe: ${recipe.name}`);
            return recipe.entities;
        }
        
        // If no recipe found, extract entities from the description
        console.log(`⚠️ No recipe found for "${businessType}", extracting entities from description`);
        return this.extractEntities(description, businessType);
    }

    private extractEntities(description: string, businessType: string): Record<string, any> {
        const entities: Record<string, any> = {};
        
        // Extract custom entities from description
        const extractedEntities = this.extractCustomEntities(description, businessType);
        
        // Merge and enhance entities
        for (const [entityName, entityDef] of Object.entries(extractedEntities)) {
            entities[entityName] = this.enhanceEntityDefinition(entityName, entityDef, description);
        }

        return entities;
    }

    private extractCustomEntities(description: string, businessType: string): Record<string, any> {
        const entities: Record<string, any> = {};
        const text = description.toLowerCase();
        
        // Common business entities - these will be enhanced based on context
        const commonEntities = ['customer', 'order', 'product', 'user', 'payment'];
        
        // Universal entity keywords that can appear in any business context
        const universalEntityKeywords = [
            'table', 'seat', 'reservation', 'booking', 'appointment',
            'cart', 'basket', 'inventory', 'stock', 'catalog',
            'member', 'staff', 'employee', 'team', 'group',
            'event', 'meeting', 'session', 'class', 'service',
            'resource', 'tool', 'asset', 'document', 'file',
            'project', 'task', 'ticket', 'issue', 'request',
            'invoice', 'receipt', 'transaction', 'subscription'
        ];
        
        // Look for common entity mentions in the description
        for (const entityName of commonEntities) {
            if (text.includes(entityName)) {
                entities[entityName] = this.generateFieldsForEntity(entityName);
            }
        }
        
        // Look for universal entity keywords in the description
        for (const keyword of universalEntityKeywords) {
            if (text.includes(keyword) && !entities[keyword]) {
                entities[keyword] = this.generateFieldsForEntity(keyword);
            }
        }
        
        return entities;
    }

    private generateFieldsForEntity(entityName: string): any {
        const baseFields = [
            { name: 'id', type: 'string', required: true, description: `Unique identifier for ${entityName}` },
            { name: 'createdAt', type: 'date', required: true, description: 'Creation timestamp' },
            { name: 'updatedAt', type: 'date', required: true, description: 'Last update timestamp' },
        ];

        // Add entity-specific fields
        switch (entityName) {
            case 'customer':
                return {
                    fields: [
                        ...baseFields,
                        { name: 'name', type: 'string', required: true, description: 'Customer name' },
                        { name: 'email', type: 'string', required: false, description: 'Email address' },
                        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
                    ]
                };
            case 'order':
                return {
                    fields: [
                        ...baseFields,
                        { name: 'total', type: 'number', required: true, description: 'Order total amount' },
                        { name: 'status', type: 'enum', values: ['pending', 'processing', 'completed', 'cancelled'], required: true },
                        { name: 'customerId', type: 'string', required: true, description: 'Associated customer ID' },
                    ]
                };
            case 'product':
                return {
                    fields: [
                        ...baseFields,
                        { name: 'name', type: 'string', required: true, description: 'Product name' },
                        { name: 'price', type: 'number', required: true, description: 'Product price' },
                        { name: 'description', type: 'string', required: false, description: 'Product description' },
                    ]
                };
            default:
                return {
                    fields: [
                        ...baseFields,
                        { name: 'name', type: 'string', required: true, description: `${entityName} name` },
                    ]
                };
        }
    }

    private enhanceEntityDefinition(entityName: string, entityDef: any, description: string): any {
        return {
            ...entityDef,
            relationships: this.inferRelationships(entityName, description),
            businessRules: this.extractEntityBusinessRules(entityName, description),
        };
    }

    private inferRelationships(entityName: string, description: string): any[] {
        const relationships: any[] = [];
        
        // Simple relationship inference based on common patterns
        if (entityName === 'customer' && description.toLowerCase().includes('order')) {
            relationships.push({
                name: 'orders',
                type: 'hasMany',
                entity: 'order',
                foreignKey: 'customerId'
            });
        }
        
        if (entityName === 'order' && description.toLowerCase().includes('customer')) {
            relationships.push({
                name: 'customer',
                type: 'belongsTo',
                entity: 'customer',
                foreignKey: 'customerId'
            });
        }
        
        return relationships;
    }

    private extractEntityBusinessRules(entityName: string, description: string): any[] {
        const rules: any[] = [];
        const text = description.toLowerCase();
        
        // Universal business rule patterns that can apply to any entity
        const rulePatterns = [
            {
                keywords: ['allerg', 'dietary', 'restriction'],
                rule: `${entityName} with allergies require dietary restriction tracking`,
                condition: text.includes('allerg') || text.includes('dietary')
            },
            {
                keywords: ['vip', 'preferred', 'priority'],
                rule: `VIP ${entityName} get preferred treatment and assignments`,
                condition: text.includes('vip') || text.includes('preferred')
            },
            {
                keywords: ['inventory', 'stock', 'threshold'],
                rule: `${entityName} levels must be maintained above reorder thresholds`,
                condition: text.includes('inventory') || text.includes('stock')
            },
            {
                keywords: ['appointment', 'booking', 'reservation'],
                rule: `${entityName} must be confirmed within 24 hours`,
                condition: text.includes('appointment') || text.includes('booking') || text.includes('reservation')
            }
        ];
        
        // Apply universal patterns
        for (const pattern of rulePatterns) {
            if (pattern.condition) {
                rules.push(pattern.rule);
            }
        }
        
        return rules;
    }

    // =============================================================================
    // WORKFLOW AND RULE EXTRACTION
    // =============================================================================

    private extractWorkflows(description: string, entities: Record<string, any>): any[] {
        const workflows: any[] = [];
        const text = description.toLowerCase();
        
        // Universal workflow patterns based on entity presence
        const availableEntities = Object.keys(entities);
        
        // Generate basic CRUD workflows for each entity
        for (const entityName of availableEntities) {
            workflows.push({
                name: `${entityName}_management`,
                description: `Manage ${entityName} lifecycle`,
                steps: [
                    { name: `create_${entityName}`, action: 'create', entity: entityName },
                    { name: `update_${entityName}`, action: 'update', entity: entityName },
                    { name: `query_${entityName}`, action: 'query', entity: entityName },
                    { name: `delete_${entityName}`, action: 'delete', entity: entityName },
                ],
            });
        }
        
        // Add universal workflow patterns based on common business processes
        if (availableEntities.includes('customer') && availableEntities.includes('order')) {
            workflows.push({
                name: 'order_processing',
                description: 'Process customer orders',
                steps: [
                    { name: 'create_order', action: 'create', entity: 'order' },
                    { name: 'validate_order', action: 'update', entity: 'order' },
                    { name: 'process_order', action: 'update', entity: 'order' },
                    { name: 'complete_order', action: 'update', entity: 'order' },
                ],
            });
        }
        
        if (availableEntities.includes('appointment') || availableEntities.includes('booking')) {
            const entityName = availableEntities.includes('appointment') ? 'appointment' : 'booking';
            workflows.push({
                name: 'appointment_management',
                description: 'Manage appointments and bookings',
                steps: [
                    { name: 'check_availability', action: 'query', entity: entityName },
                    { name: 'create_booking', action: 'create', entity: entityName },
                    { name: 'send_confirmation', action: 'notify' },
                    { name: 'complete_service', action: 'update', entity: entityName },
                ],
            });
        }

        return workflows;
    }

    private extractBusinessRules(description: string, entities: Record<string, any>): any[] {
        const rules: any[] = [];
        const text = description.toLowerCase();
        const availableEntities = Object.keys(entities);
        
        // Universal business rule patterns based on keywords and available entities
        const rulePatterns = [
            {
                keywords: ['allerg', 'dietary', 'restriction'],
                ruleTemplate: 'entities with allergies require dietary restriction tracking',
                priority: 'high' as const,
                enforcement: 'hard' as const,
            },
            {
                keywords: ['vip', 'preferred', 'priority'],
                ruleTemplate: 'VIP entities get preferred treatment and assignments',
                priority: 'medium' as const,
                enforcement: 'soft' as const,
            },
            {
                keywords: ['inventory', 'stock', 'threshold'],
                ruleTemplate: 'inventory levels must be maintained above reorder thresholds',
                priority: 'high' as const,
                enforcement: 'hard' as const,
            },
            {
                keywords: ['appointment', 'booking', 'reservation'],
                ruleTemplate: 'bookings must be confirmed within 24 hours',
                priority: 'medium' as const,
                enforcement: 'soft' as const,
            },
            {
                keywords: ['payment', 'transaction', 'billing'],
                ruleTemplate: 'payment processing must be secure and compliant',
                priority: 'high' as const,
                enforcement: 'hard' as const,
            }
        ];

        // Apply universal rule patterns
        for (const pattern of rulePatterns) {
            const hasKeywords = pattern.keywords.some(keyword => text.includes(keyword));
            if (hasKeywords) {
                rules.push({
                    rule: pattern.ruleTemplate,
                    priority: pattern.priority,
                    enforcement: pattern.enforcement,
                });
            }
        }

        return rules;
    }

    private extractIntegrations(description: string): string[] {
        // Implement the logic to extract integrations from the description
        // This is a placeholder and should be replaced with the actual implementation
        return [];
    }

    // =============================================================================
    // COMMAND GENERATION
    // =============================================================================

    private generateEntityCommands(entityName: string, entityDef: any, domain: BusinessDomainModel): CommandDefinition[] {
        const commands: CommandDefinition[] = [];
        
        // Generate CRUD commands
        const crudCommands = [
            {
                name: `${entityName}:create`,
                description: `Create new ${entityName}`,
                category: 'porcelain' as const,
                entityType: entityName,
                operation: 'create',
                arguments: entityDef.fields
                    .filter((field: any) => field.required || field.name === 'name')
                    .map((field: any) => ({
                        name: field.name,
                        type: field.type,
                        required: field.required,
                        description: `${entityName} ${field.name}`,
                        validation: field.validation,
                    })),
                options: [],
                examples: [`${entityName}:create --name "Example Name"`],
            },
            {
                name: `${entityName}:list`,
                description: `List all ${entityName}s`,
                category: 'porcelain' as const,
                entityType: entityName,
                operation: 'list',
                arguments: [],
                options: [
                    { name: 'limit', type: 'number', required: false, description: 'Number of items to return' },
                    { name: 'offset', type: 'number', required: false, description: 'Offset for pagination' },
                    { name: 'filter', type: 'string', required: false, description: 'Filter criteria' },
                ],
                examples: [`${entityName}:list`, `${entityName}:list --limit 10 --offset 20`],
            },
            {
                name: `${entityName}:update`,
                description: `Update existing ${entityName}`,
                category: 'porcelain' as const,
                entityType: entityName,
                operation: 'update',
                arguments: [
                    { name: 'id', type: 'string', required: true, description: `${entityName} ID` },
                ],
                options: entityDef.fields
                    .filter((field: any) => !field.required)
                    .map((field: any) => ({
                        name: field.name,
                        type: field.type,
                        required: false,
                        description: `Updated ${field.name}`,
                        validation: field.validation,
                    })),
                examples: [`${entityName}:update "123" --name "Updated Name"`],
            },
            {
                name: `${entityName}:delete`,
                description: `Delete ${entityName}`,
                category: 'porcelain' as const,
                entityType: entityName,
                operation: 'delete',
                arguments: [
                    { name: 'id', type: 'string', required: true, description: `${entityName} ID` },
                ],
                options: [],
                examples: [`${entityName}:delete "123"`],
            },
        ];

        commands.push(...crudCommands);

        // Generate business-specific commands based on entity type
        const businessCommands = this.generateBusinessSpecificCommands(entityName, entityDef, domain);
        commands.push(...businessCommands);

        return commands;
    }

    private generateBusinessSpecificCommands(entityName: string, entityDef: any, domain: BusinessDomainModel): CommandDefinition[] {
        const commands: CommandDefinition[] = [];

        // Generate commands based on entity definition and business workflows
        // This replaces hard-coded business logic with dynamic pattern generation
        
        // Generate workflow-based commands from domain workflows
        for (const workflow of domain.workflows || []) {
            if (workflow.steps && workflow.steps.length > 0) {
                const workflowCommand = this.generateWorkflowCommandForEntity(entityName, workflow, domain);
                if (workflowCommand) {
                    commands.push(workflowCommand);
                }
            }
        }

        // Generate field-based commands from entity fields
        const fieldCommands = this.generateFieldBasedCommands(entityName, entityDef, domain);
        commands.push(...fieldCommands);

        return commands;
    }

    private generateWorkflowCommandForEntity(entityName: string, workflow: any, domain: BusinessDomainModel): CommandDefinition | null {
        // Generate commands based on workflow steps that involve this entity
        const workflowName = workflow.name.toLowerCase().replace(/\s+/g, '-');
        const entityFields = domain.entities[entityName]?.fields || [];
        
        // Create workflow command for this entity
        return {
            name: `${entityName}:${workflowName}`,
            description: `Execute ${workflow.name} for ${entityName}`,
            category: 'porcelain',
            entityType: entityName,
            operation: workflowName,
            arguments: [
                { name: `${entityName}Id`, type: 'string', required: true, description: `${entityName} identifier` },
            ],
            options: this.generateOptionsFromEntityFields(entityFields),
            examples: [`${entityName}:${workflowName} "entity_123"`],
        };
    }

    private generateFieldBasedCommands(entityName: string, entityDef: any, domain: BusinessDomainModel): CommandDefinition[] {
        const commands: CommandDefinition[] = [];
        const fields = entityDef.fields || [];

        // Generate status update commands for enum fields
        for (const field of fields) {
            if (field.type === 'enum' && field.name.includes('status')) {
                commands.push({
                    name: `${entityName}:update-${field.name}`,
                    description: `Update ${field.name} for ${entityName}`,
                    category: 'porcelain',
                    entityType: entityName,
                    operation: 'update-status',
                    arguments: [
                        { name: `${entityName}Id`, type: 'string', required: true, description: `${entityName} identifier` },
                        { name: field.name, type: 'string', required: true, description: `New ${field.name} value` },
                    ],
                    options: [
                        { name: 'reason', type: 'string', required: false, description: 'Reason for status change' },
                    ],
                    examples: [`${entityName}:update-${field.name} "entity_123" "${field.values?.[0] || 'active'}"`],
                });
            }
        }

        // Generate assignment commands for reference fields
        for (const field of fields) {
            if (field.type === 'reference' && field.name.includes('assign')) {
                commands.push({
                    name: `${entityName}:assign`,
                    description: `Assign ${entityName} to ${field.entity}`,
                    category: 'porcelain',
                    entityType: entityName,
                    operation: 'assign',
                    arguments: [
                        { name: `${entityName}Id`, type: 'string', required: true, description: `${entityName} identifier` },
                        { name: field.name, type: 'string', required: true, description: `${field.entity} to assign to` },
                    ],
                    options: [],
                    examples: [`${entityName}:assign "entity_123" "assignee_456"`],
                });
            }
        }

        return commands;
    }

    private generateOptionsFromEntityFields(fields: any[]): any[] {
        const options: any[] = [];
        
        for (const field of fields) {
            if (!field.required && field.name !== 'id') {
                options.push({
                    name: field.name,
                    type: field.type === 'enum' ? 'string' : field.type,
                    required: false,
                    description: `${field.name} value`,
                });
            }
        }

        return options;
    }

    private generateWorkflowCommands(workflow: any, domain: BusinessDomainModel): CommandDefinition[] {
        const commands: CommandDefinition[] = [];

        commands.push({
            name: `workflow:${workflow.name}`,
            description: workflow.description,
            category: 'porcelain',
            operation: 'workflow',
            businessContext: workflow.name,
            arguments: workflow.steps
                .filter((step: any) => step.entity)
                .map((step: any) => ({
                    name: `${step.entity}Id`,
                    type: 'string',
                    required: true,
                    description: `${step.entity} ID for ${step.name}`,
                })),
            options: [],
            examples: [`workflow:${workflow.name} "entity_123"`],
        });

        return commands;
    }

    // =============================================================================
    // SERVICE MAPPING GENERATION
    // =============================================================================

    private async createServiceMapping(domain: BusinessDomainModel, serviceName: string): Promise<TranslationMapping | null> {
        const serviceMappings: Record<string, any> = {
            stripe: {
                customer: {
                    mapping: 'business.customer',
                    fields: {
                        email: 'email',
                        name: 'name',
                        phone: 'phone',
                        'metadata.dietary': 'dietaryRestrictions',
                        'metadata.table': 'favoriteTable',
                        'metadata.loyalty': 'loyaltyPoints',
                    },
                },
                payment: {
                    mapping: 'business.payment',
                    fields: {
                        amount: 'amount',
                        currency: 'currency',
                        status: 'status',
                        customer: 'customerId',
                        description: 'description',
                    },
                },
            },
            shopify: {
                customer: {
                    mapping: 'business.customer',
                    fields: {
                        email: 'email',
                        first_name: 'name',
                        phone: 'phone',
                        default_address: 'address',
                        orders_count: 'totalOrders',
                    },
                },
                product: {
                    mapping: 'business.product',
                    fields: {
                        title: 'name',
                        body_html: 'description',
                        vendor: 'brand',
                        product_type: 'category',
                        handle: 'slug',
                    },
                },
                order: {
                    mapping: 'business.order',
                    fields: {
                        name: 'orderNumber',
                        email: 'customerEmail',
                        total_price: 'total',
                        financial_status: 'paymentStatus',
                        fulfillment_status: 'fulfillmentStatus',
                    },
                },
            },
            mailchimp: {
                contact: {
                    mapping: 'business.customer',
                    fields: {
                        email_address: 'email',
                        'merge_fields.FNAME': 'firstName',
                        'merge_fields.LNAME': 'lastName',
                        status: 'subscriptionStatus',
                        'stats.avg_open_rate': 'engagementRate',
                    },
                },
                campaign: {
                    mapping: 'business.marketing',
                    fields: {
                        subject_line: 'subject',
                        preview_text: 'preview',
                        send_time: 'sentAt',
                        emails_sent: 'recipients',
                        opens: 'opens',
                        clicks: 'clicks',
                    },
                },
            },
            notion: {
                page: {
                    mapping: 'business.document',
                    fields: {
                        title: 'name',
                        content: 'description',
                        created_time: 'createdAt',
                        last_edited_time: 'updatedAt',
                    },
                },
            },
            github: {
                issue: {
                    mapping: 'business.task',
                    fields: {
                        title: 'name',
                        body: 'description',
                        state: 'status',
                        created_at: 'createdAt',
                        updated_at: 'updatedAt',
                    },
                },
            },
        };

        if (!serviceMappings[serviceName]) {
            return null;
        }

        return {
            sourceModel: serviceName,
            targetModel: domain.businessType,
            mappings: serviceMappings[serviceName],
            confidence: 0.8,
            bidirectional: true,
        } as TranslationMapping;
    }

    // =============================================================================
    // PATTERN INITIALIZATION
    // =============================================================================

    private initializePatterns(): void {
        // Remove hard-coded business patterns
        // Patterns are now loaded dynamically from recipe files via RecipeManager
        // This allows for universal business type support without code changes
        
        // The pattern recognition will be handled by:
        // 1. RecipeManager.getRecipe() for loading business context
        // 2. Dynamic command generation from entity fields and workflows
        // 3. Business-agnostic pattern matching in extractBusinessType()
        
        // Future: Load additional patterns from configuration files
        // if needed for enhanced business type detection
    }
}

// =============================================================================
// HELPER INTERFACES
// =============================================================================

interface BusinessPattern {
    keywords: string[];
    entities: string[];
    workflows: string[];
}

interface EntityPattern {
    fields: string[];
    relationships: string[];
    businessRules: string[];
}

interface WorkflowPattern {
    steps: string[];
    triggers: string[];
    conditions: string[];
}