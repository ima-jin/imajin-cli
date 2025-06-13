/**
 * BusinessContextProcessor - Convert business descriptions to domain models
 * 
 * @package     @imajin/cli
 * @subpackage  context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-01-09
 *
 * Integration Points:
 * - ETL graph system for dynamic model registration
 * - Service discovery and translation mappings
 * - Command generation from business context
 * - Configuration management for user customization
 */

import { z } from 'zod';
import { ModelFactory } from '../etl/graphs/models.js';
import type { GraphModel, TranslationMapping } from '../etl/graphs/models.js';

// =============================================================================
// BUSINESS DOMAIN MODEL DEFINITIONS
// =============================================================================

export const BusinessDomainModelSchema = z.object({
    businessType: z.string().min(1).max(100),
    description: z.string().min(10).max(2000),
    entities: z.record(z.object({
        fields: z.array(z.object({
            name: z.string(),
            type: z.enum(['string', 'number', 'boolean', 'date', 'array', 'object', 'enum']),
            required: z.boolean().default(false),
            optional: z.boolean().default(true),
            default: z.any().optional(),
            items: z.string().optional(), // For arrays
            values: z.array(z.string()).optional(), // For enums
            validation: z.object({
                min: z.number().optional(),
                max: z.number().optional(),
                pattern: z.string().optional(),
                format: z.string().optional(),
            }).optional(),
        })),
        businessRules: z.array(z.string()).optional(),
        workflows: z.array(z.string()).optional(),
        relationships: z.array(z.object({
            type: z.enum(['hasOne', 'hasMany', 'belongsTo', 'manyToMany']),
            entity: z.string(),
            foreignKey: z.string().optional(),
            description: z.string().optional(),
        })).optional(),
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
    })).optional(),
    businessRules: z.array(z.object({
        rule: z.string(),
        entity: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
        enforcement: z.enum(['soft', 'hard']).default('soft'),
    })).optional(),
});

export type BusinessDomainModel = z.infer<typeof BusinessDomainModelSchema>;

export const CommandDefinitionSchema = z.object({
    name: z.string(),
    description: z.string(),
    category: z.enum(['porcelain', 'plumbing']),
    entity: z.string().optional(),
    action: z.string(),
    parameters: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().default(false),
        description: z.string(),
        validation: z.object({
            min: z.number().optional(),
            max: z.number().optional(),
            pattern: z.string().optional(),
            options: z.array(z.string()).optional(),
        }).optional(),
    })),
    workflow: z.string().optional(),
    serviceMapping: z.object({
        primary: z.string(),
        secondary: z.array(z.string()).optional(),
    }).optional(),
});

export type CommandDefinition = z.infer<typeof CommandDefinitionSchema>;

// =============================================================================
// BUSINESS CONTEXT ANALYSIS ENGINE
// =============================================================================

export class BusinessContextProcessor {
    private readonly businessPatterns: Map<string, BusinessPattern> = new Map();
    private readonly entityPatterns: Map<string, EntityPattern> = new Map();
    private readonly workflowPatterns: Map<string, WorkflowPattern> = new Map();

    constructor() {
        this.initializePatterns();
    }

    /**
     * Convert business description to domain model
     */
    async processBusinessDescription(description: string): Promise<BusinessDomainModel> {
        console.log('🔍 Analyzing business description for domain model generation...');
        
        const businessType = this.extractBusinessType(description);
        const entities = this.extractEntities(description, businessType);
        const workflows = this.extractWorkflows(description, entities);
        const businessRules = this.extractBusinessRules(description, entities);

        const domainModel: BusinessDomainModel = {
            businessType,
            description,
            entities,
            workflows,
            businessRules,
        };

        // Validate the generated model
        const validationResult = BusinessDomainModelSchema.safeParse(domainModel);
        if (!validationResult.success) {
            throw new Error(`Generated domain model validation failed: ${validationResult.error.message}`);
        }

        console.log(`✅ Generated domain model for "${businessType}" with ${Object.keys(entities).length} entities`);
        return domainModel;
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

    private extractBusinessType(description: string): string {
        const text = description.toLowerCase();
        
        // Restaurant/Food Service
        if (text.includes('restaurant') || text.includes('food') || text.includes('menu') || 
            text.includes('kitchen') || text.includes('dining') || text.includes('chef')) {
            return 'restaurant';
        }
        
        // E-commerce/Retail
        if (text.includes('store') || text.includes('shop') || text.includes('product') || 
            text.includes('inventory') || text.includes('retail') || text.includes('ecommerce')) {
            return 'ecommerce';
        }
        
        // SaaS/Software
        if (text.includes('software') || text.includes('saas') || text.includes('subscription') || 
            text.includes('platform') || text.includes('application') || text.includes('service')) {
            return 'saas';
        }
        
        // Healthcare
        if (text.includes('health') || text.includes('medical') || text.includes('patient') || 
            text.includes('doctor') || text.includes('clinic') || text.includes('hospital')) {
            return 'healthcare';
        }
        
        // Education
        if (text.includes('school') || text.includes('education') || text.includes('student') || 
            text.includes('course') || text.includes('learning') || text.includes('university')) {
            return 'education';
        }
        
        // Professional Services
        if (text.includes('consulting') || text.includes('agency') || text.includes('professional') || 
            text.includes('client') || text.includes('project') || text.includes('service')) {
            return 'professional_services';
        }
        
        // Default to generic business
        return 'business';
    }

    // =============================================================================
    // ENTITY EXTRACTION
    // =============================================================================

    private extractEntities(description: string, businessType: string): Record<string, any> {
        const entities: Record<string, any> = {};
        const text = description.toLowerCase();

        // Get base entities for business type
        const baseEntities = this.getBaseEntitiesForBusinessType(businessType);
        
        // Extract custom entities from description
        const extractedEntities = this.extractCustomEntities(text);
        
        // Merge and enhance entities
        for (const [entityName, entityDef] of Object.entries({ ...baseEntities, ...extractedEntities })) {
            entities[entityName] = this.enhanceEntityDefinition(entityName, entityDef, description);
        }

        return entities;
    }

    private getBaseEntitiesForBusinessType(businessType: string): Record<string, any> {
        const baseEntities: Record<string, Record<string, any>> = {
            restaurant: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'email', type: 'string', required: false },
                        { name: 'phone', type: 'string', required: false },
                        { name: 'dietaryRestrictions', type: 'array', items: 'string', required: false },
                        { name: 'favoriteTable', type: 'number', required: false },
                        { name: 'loyaltyPoints', type: 'number', default: 0 },
                        { name: 'visits', type: 'array', items: 'visit', required: false },
                    ],
                    businessRules: [
                        'Customers with allergies require dietary restriction tracking',
                        'VIP customers get preferred table assignments',
                    ],
                },
                order: {
                    fields: [
                        { name: 'table', type: 'number', required: true },
                        { name: 'items', type: 'array', items: 'menuItem', required: true },
                        { name: 'specialInstructions', type: 'string', required: false },
                        { name: 'status', type: 'enum', values: ['ordered', 'preparing', 'ready', 'served', 'paid'], required: true },
                        { name: 'server', type: 'string', required: true },
                        { name: 'total', type: 'number', required: true },
                    ],
                    workflows: ['Order placement → Kitchen → Service → Payment'],
                },
                table: {
                    fields: [
                        { name: 'number', type: 'number', required: true },
                        { name: 'section', type: 'string', required: true },
                        { name: 'capacity', type: 'number', required: true },
                        { name: 'server', type: 'string', required: false },
                        { name: 'status', type: 'enum', values: ['available', 'occupied', 'reserved', 'cleaning'], required: true },
                    ],
                },
            },
            ecommerce: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'email', type: 'string', required: true },
                        { name: 'phone', type: 'string', required: false },
                        { name: 'shippingAddress', type: 'object', required: false },
                        { name: 'billingAddress', type: 'object', required: false },
                        { name: 'orderHistory', type: 'array', items: 'order', required: false },
                    ],
                },
                product: {
                    fields: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'description', type: 'string', required: false },
                        { name: 'price', type: 'number', required: true },
                        { name: 'sku', type: 'string', required: true },
                        { name: 'inventory', type: 'number', required: true },
                        { name: 'category', type: 'string', required: false },
                        { name: 'images', type: 'array', items: 'string', required: false },
                    ],
                },
                order: {
                    fields: [
                        { name: 'customerId', type: 'string', required: true },
                        { name: 'items', type: 'array', items: 'orderItem', required: true },
                        { name: 'total', type: 'number', required: true },
                        { name: 'status', type: 'enum', values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], required: true },
                        { name: 'shippingAddress', type: 'object', required: true },
                    ],
                },
            },
            saas: {
                user: {
                    fields: [
                        { name: 'name', type: 'string', required: true },
                        { name: 'email', type: 'string', required: true },
                        { name: 'role', type: 'enum', values: ['admin', 'user', 'viewer'], required: true },
                        { name: 'subscription', type: 'object', required: false },
                        { name: 'lastLogin', type: 'date', required: false },
                    ],
                },
                subscription: {
                    fields: [
                        { name: 'userId', type: 'string', required: true },
                        { name: 'plan', type: 'string', required: true },
                        { name: 'status', type: 'enum', values: ['active', 'cancelled', 'past_due', 'trialing'], required: true },
                        { name: 'currentPeriodStart', type: 'date', required: true },
                        { name: 'currentPeriodEnd', type: 'date', required: true },
                    ],
                },
            },
            // Add more business types as needed
        };

        return baseEntities[businessType] || {
            customer: {
                fields: [
                    { name: 'name', type: 'string', required: true },
                    { name: 'email', type: 'string', required: false },
                    { name: 'phone', type: 'string', required: false },
                ],
            },
        };
    }

    private extractCustomEntities(text: string): Record<string, any> {
        const entities: Record<string, any> = {};
        
        // Simple keyword-based entity extraction
        // In a real implementation, this would use NLP/AI for better extraction
        
        const entityKeywords = [
            'employee', 'staff', 'team', 'member',
            'invoice', 'bill', 'receipt', 'payment',
            'appointment', 'booking', 'reservation',
            'location', 'branch', 'store', 'office',
            'inventory', 'stock', 'item', 'product',
            'project', 'task', 'milestone', 'deliverable',
        ];

        for (const keyword of entityKeywords) {
            if (text.includes(keyword)) {
                entities[keyword] = {
                    fields: this.generateFieldsForEntity(keyword),
                };
            }
        }

        return entities;
    }

    private generateFieldsForEntity(entityName: string): any[] {
        const commonFields = [
            { name: 'name', type: 'string', required: true },
            { name: 'description', type: 'string', required: false },
            { name: 'status', type: 'string', required: false },
            { name: 'createdAt', type: 'date', required: false },
            { name: 'updatedAt', type: 'date', required: false },
        ];

        const entitySpecificFields: Record<string, any[]> = {
            employee: [
                { name: 'email', type: 'string', required: true },
                { name: 'department', type: 'string', required: false },
                { name: 'role', type: 'string', required: false },
                { name: 'salary', type: 'number', required: false },
            ],
            invoice: [
                { name: 'customerId', type: 'string', required: true },
                { name: 'amount', type: 'number', required: true },
                { name: 'currency', type: 'string', required: true },
                { name: 'dueDate', type: 'date', required: true },
            ],
            appointment: [
                { name: 'customerId', type: 'string', required: true },
                { name: 'startTime', type: 'date', required: true },
                { name: 'endTime', type: 'date', required: true },
                { name: 'type', type: 'string', required: false },
            ],
            location: [
                { name: 'address', type: 'string', required: true },
                { name: 'city', type: 'string', required: true },
                { name: 'state', type: 'string', required: false },
                { name: 'zipCode', type: 'string', required: false },
            ],
            inventory: [
                { name: 'sku', type: 'string', required: true },
                { name: 'quantity', type: 'number', required: true },
                { name: 'location', type: 'string', required: false },
                { name: 'reorderLevel', type: 'number', required: false },
            ],
        };

        return [...commonFields, ...(entitySpecificFields[entityName] || [])];
    }

    private enhanceEntityDefinition(entityName: string, entityDef: any, description: string): any {
        // Enhance entity definition based on context from description
        // This is where we'd add AI-driven enhancements in a real implementation
        
        return {
            ...entityDef,
            relationships: this.inferRelationships(entityName, description),
        };
    }

    private inferRelationships(entityName: string, description: string): any[] {
        const relationships: any[] = [];
        
        // Simple relationship inference based on common patterns
        const relationshipPatterns: Record<string, any[]> = {
            customer: [
                { type: 'hasMany', entity: 'order', description: 'Customer can have multiple orders' },
                { type: 'hasMany', entity: 'appointment', description: 'Customer can have multiple appointments' },
            ],
            order: [
                { type: 'belongsTo', entity: 'customer', foreignKey: 'customerId', description: 'Order belongs to a customer' },
                { type: 'hasMany', entity: 'orderItem', description: 'Order contains multiple items' },
            ],
            employee: [
                { type: 'belongsTo', entity: 'location', foreignKey: 'locationId', description: 'Employee works at a location' },
            ],
        };

        return relationshipPatterns[entityName] || [];
    }

    // =============================================================================
    // WORKFLOW AND RULE EXTRACTION
    // =============================================================================

    private extractWorkflows(description: string, entities: Record<string, any>): any[] {
        const workflows: any[] = [];
        
        // Extract workflow patterns from description
        const workflowPatterns = [
            {
                pattern: /order.*kitchen.*service.*payment/i,
                workflow: {
                    name: 'order_fulfillment',
                    description: 'Complete order fulfillment process',
                    steps: [
                        { name: 'place_order', action: 'create', entity: 'order' },
                        { name: 'prepare_food', action: 'update', entity: 'order', conditions: ['status = preparing'] },
                        { name: 'serve_food', action: 'update', entity: 'order', conditions: ['status = ready'] },
                        { name: 'process_payment', action: 'create', entity: 'payment' },
                    ],
                },
            },
            {
                pattern: /customer.*appointment.*service/i,
                workflow: {
                    name: 'appointment_booking',
                    description: 'Book and manage customer appointments',
                    steps: [
                        { name: 'check_availability', action: 'query', entity: 'appointment' },
                        { name: 'book_appointment', action: 'create', entity: 'appointment' },
                        { name: 'send_confirmation', action: 'notify' },
                        { name: 'complete_service', action: 'update', entity: 'appointment' },
                    ],
                },
            },
        ];

        for (const pattern of workflowPatterns) {
            if (pattern.pattern.test(description)) {
                workflows.push(pattern.workflow);
            }
        }

        return workflows;
    }

    private extractBusinessRules(description: string, entities: Record<string, any>): any[] {
        const rules: any[] = [];
        
        // Extract business rules from description
        const rulePatterns = [
            {
                pattern: /allerg|dietary/i,
                rule: {
                    rule: 'Customers with allergies require dietary restriction tracking',
                    entity: 'customer',
                    priority: 'high' as const,
                    enforcement: 'hard' as const,
                },
            },
            {
                pattern: /vip|preferred/i,
                rule: {
                    rule: 'VIP customers get preferred treatment and assignments',
                    entity: 'customer',
                    priority: 'medium' as const,
                    enforcement: 'soft' as const,
                },
            },
            {
                pattern: /inventory|stock/i,
                rule: {
                    rule: 'Inventory levels must be maintained above reorder thresholds',
                    entity: 'inventory',
                    priority: 'high' as const,
                    enforcement: 'hard' as const,
                },
            },
        ];

        for (const pattern of rulePatterns) {
            if (pattern.pattern.test(description)) {
                rules.push(pattern.rule);
            }
        }

        return rules;
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
                entity: entityName,
                action: 'create',
                parameters: entityDef.fields
                    .filter((field: any) => field.required || field.name === 'name')
                    .map((field: any) => ({
                        name: field.name,
                        type: field.type,
                        required: field.required,
                        description: `${entityName} ${field.name}`,
                        validation: field.validation,
                    })),
            },
            {
                name: `${entityName}:list`,
                description: `List all ${entityName}s`,
                category: 'porcelain' as const,
                entity: entityName,
                action: 'list',
                parameters: [
                    { name: 'limit', type: 'number', required: false, description: 'Number of items to return' },
                    { name: 'offset', type: 'number', required: false, description: 'Offset for pagination' },
                    { name: 'filter', type: 'string', required: false, description: 'Filter criteria' },
                ],
            },
            {
                name: `${entityName}:update`,
                description: `Update existing ${entityName}`,
                category: 'porcelain' as const,
                entity: entityName,
                action: 'update',
                parameters: [
                    { name: 'id', type: 'string', required: true, description: `${entityName} ID` },
                    ...entityDef.fields
                        .filter((field: any) => !field.required)
                        .map((field: any) => ({
                            name: field.name,
                            type: field.type,
                            required: false,
                            description: `Updated ${field.name}`,
                            validation: field.validation,
                        })),
                ],
            },
            {
                name: `${entityName}:delete`,
                description: `Delete ${entityName}`,
                category: 'porcelain' as const,
                entity: entityName,
                action: 'delete',
                parameters: [
                    { name: 'id', type: 'string', required: true, description: `${entityName} ID` },
                ],
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

        // Restaurant-specific commands
        if (domain.businessType === 'restaurant') {
            if (entityName === 'customer') {
                commands.push({
                    name: 'customer:seat',
                    description: 'Assign customer to table',
                    category: 'porcelain',
                    entity: 'customer',
                    action: 'seat',
                    parameters: [
                        { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
                        { name: 'table', type: 'number', required: true, description: 'Table number' },
                        { name: 'partySize', type: 'number', required: false, description: 'Party size' },
                    ],
                });
                
                commands.push({
                    name: 'loyalty:award',
                    description: 'Award loyalty points to customer',
                    category: 'porcelain',
                    entity: 'customer',
                    action: 'loyalty',
                    parameters: [
                        { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
                        { name: 'points', type: 'number', required: true, description: 'Points to award' },
                        { name: 'reason', type: 'string', required: false, description: 'Reason for award' },
                    ],
                });
            }
            
            if (entityName === 'order') {
                commands.push({
                    name: 'order:place',
                    description: 'Place new order for table',
                    category: 'porcelain',
                    entity: 'order',
                    action: 'place',
                    parameters: [
                        { name: 'table', type: 'number', required: true, description: 'Table number' },
                        { name: 'items', type: 'array', required: true, description: 'Order items' },
                        { name: 'special', type: 'string', required: false, description: 'Special instructions' },
                    ],
                });
            }
        }

        // E-commerce specific commands
        if (domain.businessType === 'ecommerce') {
            if (entityName === 'product') {
                commands.push({
                    name: 'inventory:check',
                    description: 'Check product inventory levels',
                    category: 'porcelain',
                    entity: 'product',
                    action: 'inventory',
                    parameters: [
                        { name: 'sku', type: 'string', required: true, description: 'Product SKU' },
                    ],
                });
            }
        }

        return commands;
    }

    private generateWorkflowCommands(workflow: any, domain: BusinessDomainModel): CommandDefinition[] {
        const commands: CommandDefinition[] = [];

        commands.push({
            name: `workflow:${workflow.name}`,
            description: workflow.description,
            category: 'porcelain',
            action: 'workflow',
            workflow: workflow.name,
            parameters: workflow.steps
                .filter((step: any) => step.entity)
                .map((step: any) => ({
                    name: `${step.entity}Id`,
                    type: 'string',
                    required: true,
                    description: `${step.entity} ID for ${step.name}`,
                })),
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
        // Initialize business patterns for better analysis
        // This would be expanded with more sophisticated pattern recognition
        this.businessPatterns.set('restaurant', {
            keywords: ['restaurant', 'food', 'menu', 'kitchen', 'dining'],
            entities: ['customer', 'order', 'table', 'menu'],
            workflows: ['order_fulfillment', 'table_management'],
        });

        this.businessPatterns.set('ecommerce', {
            keywords: ['store', 'shop', 'product', 'inventory', 'order'],
            entities: ['customer', 'product', 'order', 'inventory'],
            workflows: ['order_processing', 'inventory_management'],
        });
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