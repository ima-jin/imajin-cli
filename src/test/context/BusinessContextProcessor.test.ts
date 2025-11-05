/**
 * BusinessContextProcessor Tests
 * 
 * @package     @imajin/cli
 * @subpackage  test/context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-04
 */

import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';

describe('BusinessContextProcessor', () => {
    let processor: BusinessContextProcessor;
    
    beforeEach(() => {
        processor = new BusinessContextProcessor();
    });
    
    describe('processBusinessDescription', () => {
        it('should generate community domain from business description', async () => {
            const description = `We run a local community center supporting members with events, 
                resources, and support requests. We help people connect and access services.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            // Universal system intelligently matches 'community-platform' recipe
            expect(domain.businessType).toBe('community-platform');
            expect(domain.entities).toHaveProperty('member');
            expect(domain.entities).toHaveProperty('event');
            expect(domain.entities).toHaveProperty('resource');
        });
        
        it('should generate business domain when no recipe matches', async () => {
            const description = `Industrial widget manufacturing facility with automated assembly lines, 
                quality control protocols, and supply chain logistics for heavy machinery components.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            // No manufacturing recipe exists, falls back to 'business' with universal entity extraction
            expect(domain.businessType).toBe('business');
            expect(domain.entities).toBeDefined();
        });
        
        it('should match lighting business to appropriate recipe', async () => {
            const description = `Imajin Lighting PCB manufacturer specializing in custom circuit boards, 
                LED lighting solutions, and electrical component design for commercial applications.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            // Universal system matches 'imajin-lighting' recipe when lighting keywords present
            expect(domain.businessType).toBe('imajin-lighting');
            expect(domain.entities).toBeDefined();
        });
    });
    
    describe('generateBusinessCommands', () => {
        it('should generate universal CRUD commands', async () => {
            const domain = {
                businessType: 'business',
                description: 'Universal business',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'email', type: 'string' as const, required: false, optional: true },
                            { name: 'phone', type: 'string' as const, required: false, optional: true }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };
            
            const commands = await processor.generateBusinessCommands(domain);
            
            // Universal pattern system generates CRUD commands for any entity type
            expect(commands).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'customer:create',
                        category: 'porcelain',
                        entityType: 'customer',
                        operation: 'create'
                    }),
                    expect.objectContaining({
                        name: 'customer:list',
                        category: 'porcelain',
                        entityType: 'customer',
                        operation: 'list'
                    })
                ])
            );
        });
        
        it('should generate commands for multiple entity types', async () => {
            const domain = {
                businessType: 'business',
                description: 'Multi-entity business',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'email', type: 'string' as const, required: true, optional: false }
                        ]
                    },
                    product: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'price', type: 'number' as const, required: true, optional: false },
                            { name: 'category', type: 'string' as const, required: true, optional: false }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };
            
            const commands = await processor.generateBusinessCommands(domain);
            
            // Universal system generates commands for all entity types
            expect(commands).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.stringMatching(/customer/),
                        category: 'porcelain'
                    }),
                    expect.objectContaining({
                        name: expect.stringMatching(/product/),
                        category: 'porcelain'
                    })
                ])
            );
        });
    });
    
    describe('generateServiceMappings', () => {
        it('should generate Stripe mappings for universal business', async () => {
            const domain = {
                businessType: 'business',
                description: 'Universal business',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as 'string', required: true, optional: false },
                            { name: 'email', type: 'string' as 'string', required: true, optional: false },
                            { name: 'phone', type: 'string' as 'string', required: false, optional: true }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };
            
            const mappings = await processor.generateServiceMappings(domain, ['stripe']);
            
            expect(mappings).toHaveProperty('stripe');
            if (mappings.stripe) {
                expect(mappings.stripe).toHaveProperty('sourceModel');
                expect(mappings.stripe).toHaveProperty('targetModel');
                expect(mappings.stripe).toHaveProperty('mappings');
            }
        });
        
        it('should generate complex mappings for multi-service business', async () => {
            const domain = {
                businessType: 'business',
                description: 'Universal business with multiple integrations',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as 'string', required: true, optional: false },
                            { name: 'email', type: 'string' as 'string', required: true, optional: false }
                        ]
                    },
                    order: {
                        fields: [
                            { name: 'id', type: 'string' as 'string', required: true, optional: false },
                            { name: 'total', type: 'number' as 'number', required: true, optional: false },
                            { name: 'status', type: 'enum' as 'enum', values: ['pending', 'shipped', 'delivered'], required: true, optional: false }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };
            
            const mappings = await processor.generateServiceMappings(domain, ['stripe', 'shopify', 'mailchimp']);
            
            expect(mappings).toHaveProperty('stripe');
            expect(mappings).toHaveProperty('shopify');
            expect(mappings).toHaveProperty('mailchimp');
            
            if (mappings.stripe) {
                expect(mappings.stripe).toHaveProperty('sourceModel');
            }
            if (mappings.shopify) {
                expect(mappings.shopify).toHaveProperty('sourceModel');
            }
            if (mappings.mailchimp) {
                expect(mappings.mailchimp).toHaveProperty('sourceModel');
            }
        });

        it('should process basic business domain via description', async () => {
            const description = 'I run an online store selling electronics with customer accounts and order tracking.';

            const result = await processor.processBusinessDescription(description);
            
            // Universal system falls back to 'business' when no recipe matches
            expect(result.businessType).toBe('business');
            expect(result.entities).toHaveProperty('customer');
            expect(result.entities.customer?.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: expect.any(String), type: expect.any(String) })
                ])
            );
        });

        it('should generate service mappings', async () => {
            const domain = {
                businessType: 'ecommerce',
                description: 'Online store',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'email', type: 'string' as const, required: true, optional: false }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };

            const mappings = await processor.generateServiceMappings(domain, ['stripe']);
            
            expect(mappings).toHaveProperty('stripe');
            if (mappings.stripe) {
                expect(mappings.stripe).toHaveProperty('sourceModel');
                expect(mappings.stripe).toHaveProperty('targetModel');
                expect(mappings.stripe).toHaveProperty('mappings');
            }
        });

        it('should handle complex business domains', async () => {
            const domain = {
                businessType: 'marketplace',
                description: 'Multi-vendor marketplace',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'email', type: 'string' as const, required: true, optional: false }
                        ]
                    },
                    order: {
                        fields: [
                            { name: 'total', type: 'number' as const, required: true, optional: false },
                            { name: 'status', type: 'enum' as const, values: ['pending', 'completed', 'cancelled'], required: true, optional: false }
                        ]
                    }
                },
                workflows: [],
                businessRules: [],
                integrations: [],
                commands: []
            };

            const mappings = await processor.generateServiceMappings(domain, ['stripe', 'shopify', 'mailchimp']);
            
            expect(Object.keys(mappings)).toHaveLength(3);
            expect(mappings).toHaveProperty('stripe');
            expect(mappings).toHaveProperty('shopify');
            expect(mappings).toHaveProperty('mailchimp');
        });
    });
    
    describe('Business Registry Integration', () => {
        it('should initialize business registry with extracted domain', async () => {
            const description = 'Tech consulting firm handling client projects and deliverables.';
            
            const domain = await processor.processBusinessDescription(description);
            
            // Initialize business context
            BusinessTypeRegistry.initialize(domain);
            
            // Test customer validation
            const testCustomer = {
                name: 'Test Customer',
                email: 'test@example.com',
                preferences: ['web-development', 'mobile-apps']
            };
            
            const validation = BusinessTypeRegistry.validateEntity('customer', testCustomer);
            expect(validation).toBeDefined();
        });
    });
}); 