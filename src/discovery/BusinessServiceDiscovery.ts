/**
 * BusinessServiceDiscovery - Discover services and map to business context
 * 
 * @package     @imajin/cli
 * @subpackage  discovery
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 *
 * Integration Points:
 * - Discovers available services and APIs
 * - Maps service capabilities to business domains
 * - Generates translation mappings for ETL system
 * - Suggests business workflows based on available services
 */

import type { BusinessDomainModel } from '../context/BusinessContextProcessor.js';
import type { TranslationMapping } from '../etl/graphs/models.js';
import type { ServiceSchemaType } from '../etl/graphs/BusinessModelFactory.js';
import { BusinessModelFactory, type WorkflowSuggestion } from '../etl/graphs/BusinessModelFactory.js';
import { z } from 'zod';

// =============================================================================
// SERVICE DISCOVERY SCHEMAS
// =============================================================================

export const ServiceMappingSchema = z.object({
    serviceName: z.string(),
    businessDomain: z.string(),
    mappings: z.record(z.any()),
    workflows: z.array(z.string()),
    integrationComplexity: z.enum(['simple', 'moderate', 'complex']),
    estimatedSetupTime: z.string(),
});

export const ServiceCapabilitySchema = z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    endpoints: z.array(z.string()),
    authentication: z.object({
        type: z.enum(['api-key', 'oauth', 'bearer']),
        required: z.boolean(),
    }),
    rateLimit: z.object({
        requests: z.number(),
        period: z.string(),
    }),
    entities: z.record(z.any()),
    capabilities: z.array(z.string()),
});

export type ServiceMapping = z.infer<typeof ServiceMappingSchema>;

/**
 * Schema definition for service capability
 */
export type ServiceCapability = z.infer<typeof ServiceCapabilitySchema>;

// =============================================================================
// BUSINESS SERVICE DISCOVERY
// =============================================================================

export class BusinessServiceDiscovery {
    private readonly discoveredServices: Map<string, ServiceCapability> = new Map();
    private readonly businessMappings: Map<string, ServiceMapping[]> = new Map();
    private readonly knownServices: Map<string, ServiceTemplate> = new Map();

    constructor() {
        this.initializeKnownServices();
    }

    /**
     * Discover services and map to business context
     */
    async discoverAndMapServices(
        businessContext: BusinessDomainModel
    ): Promise<ServiceMapping[]> {
        console.log(`🔍 Discovering services for ${businessContext.businessType} business...`);
        
        // Simulate service discovery (in real implementation, this would scan environment)
        const availableServices = await this.discoverAvailableServices();
        
        const mappings: ServiceMapping[] = [];
        
        for (const service of availableServices) {
            const mapping = await this.mapServiceToBusinessContext(service, businessContext);
            if (mapping) {
                mappings.push(mapping);
            }
        }
        
        // Cache mappings for this business domain
        this.businessMappings.set(businessContext.businessType, mappings);
        
        console.log(`✅ Discovered ${mappings.length} relevant services for ${businessContext.businessType}`);
        return mappings;
    }

    /**
     * Generate suggested business workflows
     */
    async suggestWorkflows(
        businessContext: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): Promise<WorkflowSuggestion[]> {
        console.log(`💡 Generating workflow suggestions for ${businessContext.businessType}...`);
        
        // Use BusinessModelFactory for workflow generation
        const suggestions = BusinessModelFactory.suggestWorkflows(businessContext, availableServices);
        
        // Add discovery-specific workflow suggestions
        const discoveryWorkflows = await this.generateDiscoverySpecificWorkflows(
            businessContext,
            availableServices
        );
        
        const allSuggestions = [...suggestions, ...discoveryWorkflows];
        
        // Sort by priority and business value
        allSuggestions.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.priority || 'medium'];
            const bPriority = priorityOrder[b.priority || 'medium'];
            return bPriority - aPriority;
        });
        
        console.log(`✅ Generated ${allSuggestions.length} workflow suggestions`);
        return allSuggestions;
    }

    /**
     * Get service compatibility score with business domain
     */
    async getServiceCompatibilityScore(
        serviceName: string,
        businessContext: BusinessDomainModel
    ): Promise<number> {
        const service = this.discoveredServices.get(serviceName);
        if (!service) {
            return 0;
        }
        
        let score = 0;
        let maxScore = 0;
        
        // Check entity overlap
        const businessEntities = Object.keys(businessContext.entities);
        const serviceEntities = Object.keys(service.entities);
        
        for (const businessEntity of businessEntities) {
            maxScore += 1;
            
            for (const serviceEntity of serviceEntities) {
                const entityScore = this.calculateEntityCompatibility(
                    businessEntity,
                    businessContext.entities[businessEntity],
                    serviceEntity,
                    service.entities[serviceEntity]
                );
                
                if (entityScore > 0.3) {
                    score += entityScore;
                    break; // Best match for this business entity
                }
            }
        }
        
        // Normalize score
        return maxScore > 0 ? score / maxScore : 0;
    }

    /**
     * Get cached mappings for business domain
     */
    getCachedMappings(businessType: string): ServiceMapping[] {
        return this.businessMappings.get(businessType) || [];
    }

    /**
     * Get all discovered services
     */
    getDiscoveredServices(): Record<string, ServiceCapability> {
        return Object.fromEntries(this.discoveredServices.entries());
    }

    // =============================================================================
    // SERVICE DISCOVERY IMPLEMENTATION
    // =============================================================================

    private async discoverAvailableServices(): Promise<ServiceCapability[]> {
        const services: ServiceCapability[] = [];
        
        // Check for known service configurations/credentials
        const potentialServices = [
            'stripe', 'notion', 'github', 'shopify', 'mailchimp', 
            'salesforce', 'hubspot', 'slack', 'discord', 'twilio'
        ];
        
        for (const serviceName of potentialServices) {
            const capability = await this.checkServiceAvailability(serviceName);
            if (capability) {
                services.push(capability);
                this.discoveredServices.set(serviceName, capability);
            }
        }
        
        return services;
    }

    private async checkServiceAvailability(serviceName: string): Promise<ServiceCapability | null> {
        // In real implementation, this would check for:
        // - Environment variables (API keys)
        // - Configuration files
        // - Network connectivity
        // - Service health checks
        
        const template = this.knownServices.get(serviceName);
        if (!template) {
            return null;
        }
        
        // Simulate availability check (return template as available for demo)
        return template.capability;
    }

    private async mapServiceToBusinessContext(
        service: ServiceCapability,
        businessContext: BusinessDomainModel
    ): Promise<ServiceMapping | null> {
        const mappings: Record<string, any> = {};
        let totalConfidence = 0;
        let mappingCount = 0;
        
        // Map each service entity to business entities
        for (const [serviceEntity, serviceEntityDef] of Object.entries(service.entities)) {
            const bestMatch = this.findBestBusinessEntityMatch(
                serviceEntity,
                serviceEntityDef,
                businessContext
            );
            
            if (bestMatch) {
                mappings[serviceEntity] = bestMatch;
                totalConfidence += bestMatch.confidence;
                mappingCount++;
            }
        }
        
        if (mappingCount === 0) {
            return null; // No viable mappings
        }
        
        const averageConfidence = totalConfidence / mappingCount;
        
        // Determine integration complexity
        const complexity = this.determineIntegrationComplexity(service, businessContext);
        
        // Estimate setup time
        const setupTime = this.estimateSetupTime(service, complexity, mappingCount);
        
        return {
            serviceName: service.name,
            businessDomain: businessContext.businessType,
            mappings,
            workflows: this.suggestServiceWorkflows(service, businessContext),
            integrationComplexity: complexity,
            estimatedSetupTime: setupTime,
        };
    }

    private findBestBusinessEntityMatch(
        serviceEntity: string,
        serviceEntityDef: any,
        businessContext: BusinessDomainModel
    ): any | null {
        let bestMatch: any = null;
        let bestScore = 0;
        
        for (const [businessEntity, businessEntityDef] of Object.entries(businessContext.entities)) {
            const score = this.calculateEntityCompatibility(
                businessEntity,
                businessEntityDef,
                serviceEntity,
                serviceEntityDef
            );
            
            if (score > bestScore && score > 0.3) {
                bestScore = score;
                bestMatch = {
                    entity: businessEntity,
                    confidence: score,
                    fieldMappings: this.generateFieldMappings(serviceEntityDef, businessEntityDef),
                    transformations: this.suggestTransformations(serviceEntityDef, businessEntityDef),
                };
            }
        }
        
        return bestMatch;
    }

    private calculateEntityCompatibility(
        businessEntity: string,
        businessEntityDef: any,
        serviceEntity: string,
        serviceEntityDef: any
    ): number {
        let score = 0;
        
        // Name similarity
        if (businessEntity.toLowerCase() === serviceEntity.toLowerCase()) {
            score += 0.4;
        } else if (this.areEntitiesSemanticallySimilar(businessEntity, serviceEntity)) {
            score += 0.3;
        }
        
        // Field overlap
        const businessFields = businessEntityDef.fields?.map((f: any) => f.name) || [];
        const serviceFields = serviceEntityDef.fields?.map((f: any) => f.name) || [];
        const commonFields = businessFields.filter((f: string) => serviceFields.includes(f));
        const fieldOverlap = commonFields.length / Math.max(businessFields.length, serviceFields.length);
        score += fieldOverlap * 0.4;
        
        // Operation support
        const requiredOps = ['create', 'read', 'update', 'delete'];
        const supportedOps = serviceEntityDef.operations || [];
        const opSupport = requiredOps.filter(op => supportedOps.includes(op)).length / requiredOps.length;
        score += opSupport * 0.2;
        
        return Math.min(score, 1.0);
    }

    private areEntitiesSemanticallySimilar(entity1: string, entity2: string): boolean {
        const synonyms: Record<string, string[]> = {
            customer: ['user', 'client', 'buyer', 'patron', 'contact'],
            product: ['item', 'good', 'merchandise', 'sku'],
            order: ['purchase', 'transaction', 'sale', 'cart'],
            payment: ['transaction', 'charge', 'billing', 'invoice'],
            employee: ['user', 'staff', 'team_member', 'worker'],
            appointment: ['booking', 'reservation', 'meeting', 'event'],
        };
        
        const e1 = entity1.toLowerCase();
        const e2 = entity2.toLowerCase();
        
        for (const [key, values] of Object.entries(synonyms)) {
            if ((key === e1 && values.includes(e2)) || (key === e2 && values.includes(e1))) {
                return true;
            }
        }
        
        return false;
    }

    private generateFieldMappings(serviceEntityDef: any, businessEntityDef: any): Record<string, string> {
        const mappings: Record<string, string> = {};
        
        const serviceFields = serviceEntityDef.fields || [];
        const businessFields = businessEntityDef.fields || [];
        
        for (const serviceField of serviceFields) {
            const matchingBusinessField = businessFields.find((bf: any) =>
                bf.name.toLowerCase() === serviceField.name.toLowerCase() ||
                this.areFieldsSemanticallySimilar(serviceField.name, bf.name)
            );
            
            if (matchingBusinessField) {
                mappings[serviceField.name] = matchingBusinessField.name;
            }
        }
        
        return mappings;
    }

    private areFieldsSemanticallySimilar(field1: string, field2: string): boolean {
        const synonyms: Record<string, string[]> = {
            name: ['title', 'label', 'display_name', 'full_name'],
            email: ['email_address', 'mail', 'e_mail'],
            phone: ['telephone', 'mobile', 'phone_number', 'tel'],
            amount: ['price', 'cost', 'value', 'total', 'sum'],
            description: ['details', 'notes', 'body', 'content', 'summary'],
            status: ['state', 'condition', 'stage'],
            id: ['identifier', 'key', 'uuid', 'guid'],
        };
        
        const f1 = field1.toLowerCase();
        const f2 = field2.toLowerCase();
        
        for (const [key, values] of Object.entries(synonyms)) {
            if ((key === f1 && values.includes(f2)) || (key === f2 && values.includes(f1))) {
                return true;
            }
        }
        
        return false;
    }

    private suggestTransformations(serviceEntityDef: any, businessEntityDef: any): string[] {
        const transformations: string[] = [];
        
        // Date format transformation
        const serviceDateFields = serviceEntityDef.fields?.filter((f: any) => 
            f.type === 'date' || f.name.toLowerCase().includes('date') || f.name.toLowerCase().includes('time')
        ) || [];
        
        const businessDateFields = businessEntityDef.fields?.filter((f: any) => f.type === 'date') || [];
        
        if (serviceDateFields.length > 0 && businessDateFields.length > 0) {
            transformations.push('dateNormalization');
        }
        
        // Currency transformation
        const serviceAmountFields = serviceEntityDef.fields?.filter((f: any) =>
            f.name.toLowerCase().includes('amount') || f.name.toLowerCase().includes('price')
        ) || [];
        
        if (serviceAmountFields.length > 0) {
            transformations.push('currencyNormalization');
        }
        
        // Enum mapping
        const serviceEnumFields = serviceEntityDef.fields?.filter((f: any) => f.type === 'enum') || [];
        const businessEnumFields = businessEntityDef.fields?.filter((f: any) => f.type === 'enum') || [];
        
        if (serviceEnumFields.length > 0 && businessEnumFields.length > 0) {
            transformations.push('enumMapping');
        }
        
        return transformations;
    }

    private suggestServiceWorkflows(service: ServiceCapability, businessContext: BusinessDomainModel): string[] {
        const workflows: string[] = [];
        
        // Generate workflows based on service capabilities and business entities
        const businessEntities = Object.keys(businessContext.entities);
        const serviceName = service.name.toLowerCase();
        
        // Universal workflow patterns based on service capabilities and business entities
        const workflowPatterns = this.generateUniversalWorkflowPatterns(service, businessEntities);
        
        // Service-specific workflow suggestions based on service capabilities
        const serviceWorkflows = this.generateServiceSpecificWorkflows(service, businessEntities);
        
        workflows.push(...workflowPatterns, ...serviceWorkflows);
        
        return [...new Set(workflows)]; // Remove duplicates
    }

    /**
     * Generate universal workflow patterns based on service capabilities
     */
    private generateUniversalWorkflowPatterns(service: ServiceCapability, businessEntities: string[]): string[] {
        const workflows: string[] = [];
        const capabilities = service.capabilities || [];
        
        // Payment-related workflows
        if (capabilities.includes('payments') || service.name.toLowerCase().includes('stripe')) {
            if (businessEntities.includes('customer') || businessEntities.includes('client')) {
                workflows.push('payment_processing', 'customer_billing');
            }
            if (businessEntities.includes('order') || businessEntities.includes('transaction')) {
                workflows.push('order_payment_workflow');
            }
            if (businessEntities.includes('subscription') || businessEntities.includes('member')) {
                workflows.push('subscription_management');
            }
        }
        
        // Marketing/Communication workflows
        if (capabilities.includes('marketing') || service.name.toLowerCase().includes('mailchimp')) {
            if (businessEntities.includes('customer') || businessEntities.includes('member')) {
                workflows.push('customer_engagement', 'newsletter_automation');
            }
            if (businessEntities.includes('event')) {
                workflows.push('event_promotion');
            }
        }
        
        // Content/Knowledge management workflows
        if (capabilities.includes('content') || service.name.toLowerCase().includes('notion')) {
            workflows.push('knowledge_management', 'documentation_sync');
            if (businessEntities.includes('project')) {
                workflows.push('project_documentation');
            }
        }
        
        // E-commerce workflows
        if (capabilities.includes('inventory') || service.name.toLowerCase().includes('shopify')) {
            if (businessEntities.includes('product')) {
                workflows.push('inventory_sync', 'product_updates');
            }
            if (businessEntities.includes('order')) {
                workflows.push('order_fulfillment');
            }
        }
        
        return workflows;
    }

    /**
     * Generate service-specific workflows based on entity operations
     */
    private generateServiceSpecificWorkflows(service: ServiceCapability, businessEntities: string[]): string[] {
        const workflows: string[] = [];
        
        // Generate workflows based on service entities and business entities overlap
        const serviceEntities = Object.keys(service.entities);
        
        for (const serviceEntity of serviceEntities) {
            const serviceEntityDef = service.entities[serviceEntity];
            const operations = serviceEntityDef.operations || [];
            
            // Find matching business entities
            const matchingBusinessEntities = businessEntities.filter(businessEntity => 
                this.areEntitiesSemanticallySimilar(serviceEntity, businessEntity)
            );
            
            for (const businessEntity of matchingBusinessEntities) {
                // Generate CRUD workflows
                if (operations.includes('create') && operations.includes('update')) {
                    workflows.push(`${businessEntity}_${serviceEntity}_sync`);
                }
                if (operations.includes('list')) {
                    workflows.push(`${businessEntity}_${serviceEntity}_reporting`);
                }
                if (operations.includes('delete')) {
                    workflows.push(`${businessEntity}_${serviceEntity}_cleanup`);
                }
            }
        }
        
        return workflows;
    }

    private determineIntegrationComplexity(service: ServiceCapability, businessContext: BusinessDomainModel): 'simple' | 'moderate' | 'complex' {
        let complexityScore = 0;
        
        // Authentication complexity
        if (service.authentication.type === 'oauth') complexityScore += 2;
        else if (service.authentication.type === 'bearer') complexityScore += 1;
        
        // API type complexity
        if (service.endpoints.length > 2) complexityScore += 1;
        
        // Entity count
        const entityCount = Object.keys(service.entities).length;
        if (entityCount > 10) complexityScore += 2;
        else if (entityCount > 5) complexityScore += 1;
        
        // Business entity mapping complexity
        const businessEntityCount = Object.keys(businessContext.entities).length;
        if (businessEntityCount > 8) complexityScore += 1;
        
        if (complexityScore >= 4) return 'complex';
        if (complexityScore >= 2) return 'moderate';
        return 'simple';
    }

    private estimateSetupTime(service: ServiceCapability, complexity: 'simple' | 'moderate' | 'complex', mappingCount: number): string {
        const baseTime: Record<'simple' | 'moderate' | 'complex', number> = {
            simple: 30,
            moderate: 90,
            complex: 180,
        };
        
        const time = baseTime[complexity] + (mappingCount * 10);
        return `${time} minutes`;
    }

    // =============================================================================
    // DISCOVERY-SPECIFIC WORKFLOWS
    // =============================================================================

    private async generateDiscoverySpecificWorkflows(
        businessContext: BusinessDomainModel,
        availableServices: ServiceSchemaType[]
    ): Promise<WorkflowSuggestion[]> {
        const workflows: WorkflowSuggestion[] = [];
        
        // Data synchronization workflow
        if (availableServices.length >= 2) {
            workflows.push({
                name: 'automated_data_sync',
                description: 'Automatically synchronize data between all connected services',
                steps: [
                    'Monitor data changes across services',
                    'Validate data consistency',
                    'Transform data for each service format',
                    'Update records in all connected services',
                    'Log synchronization results and conflicts',
                ],
                services: availableServices.map(s => s.name),
                businessEntities: Object.keys(businessContext.entities),
                estimatedSavings: '3-5 hours per week',
                priority: 'high',
                complexity: 'moderate',
            });
        }
        
        // Service health monitoring
        workflows.push({
            name: 'service_health_monitoring',
            description: 'Monitor health and performance of all integrated services',
            steps: [
                'Check service availability',
                'Monitor API rate limits',
                'Track response times',
                'Alert on service issues',
                'Generate integration health reports',
            ],
            services: availableServices.map(s => s.name),
            businessEntities: [],
            estimatedSavings: '1-2 hours per week',
            priority: 'medium',
            complexity: 'simple',
        });
        
        return workflows;
    }

    // =============================================================================
    // KNOWN SERVICES INITIALIZATION
    // =============================================================================

    private initializeKnownServices(): void {
        // Initialize templates for known services
        this.knownServices.set('stripe', {
            name: 'stripe',
            capability: {
                name: 'Stripe',
                version: '2024-06-20',
                description: 'Payment processing and subscription management',
                endpoints: ['https://api.stripe.com'],
                authentication: {
                    type: 'api-key',
                    required: true,
                },
                entities: {
                    customer: {
                        fields: [
                            { name: 'id', type: 'string', required: true },
                            { name: 'email', type: 'string', required: true },
                            { name: 'name', type: 'string', required: false },
                            { name: 'phone', type: 'string', required: false },
                            { name: 'metadata', type: 'object', required: false },
                        ],
                        operations: ['create', 'read', 'update', 'delete', 'list'],
                    },
                    payment: {
                        fields: [
                            { name: 'id', type: 'string', required: true },
                            { name: 'amount', type: 'number', required: true },
                            { name: 'currency', type: 'string', required: true },
                            { name: 'status', type: 'string', required: true },
                            { name: 'customer', type: 'string', required: false },
                        ],
                        operations: ['create', 'read', 'list'],
                    },
                },
                rateLimit: {
                    requests: 100,
                    period: '1 second',
                },
                capabilities: ['payments', 'subscriptions'],
            },
        });
        
        this.knownServices.set('notion', {
            name: 'notion',
            capability: {
                name: 'Notion',
                version: '2022-06-28',
                description: 'Note-taking and knowledge management',
                endpoints: ['https://api.notion.com'],
                authentication: {
                    type: 'oauth',
                    required: true,
                },
                entities: {
                    page: {
                        fields: [
                            { name: 'id', type: 'string', required: true },
                            { name: 'title', type: 'string', required: true },
                            { name: 'content', type: 'object', required: false },
                            { name: 'created_time', type: 'date', required: true },
                            { name: 'last_edited_time', type: 'date', required: true },
                        ],
                        operations: ['create', 'read', 'update', 'list'],
                    },
                    database: {
                        fields: [
                            { name: 'id', type: 'string', required: true },
                            { name: 'title', type: 'string', required: true },
                            { name: 'properties', type: 'object', required: true },
                        ],
                        operations: ['create', 'read', 'update', 'list'],
                    },
                },
                rateLimit: {
                    requests: 3,
                    period: '1 second',
                },
                capabilities: ['note_taking', 'knowledge_management'],
            },
        });
        
        // Add more service templates as needed
    }
}

// =============================================================================
// HELPER INTERFACES
// =============================================================================

interface ServiceTemplate {
    name: string;
    capability: ServiceCapability;
}