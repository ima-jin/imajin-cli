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
 */

import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';

describe('BusinessContextProcessor', () => {
    let processor: BusinessContextProcessor;
    
    beforeEach(() => {
        processor = new BusinessContextProcessor();
    });
    
    describe('processBusinessDescription', () => {
        it('should generate restaurant domain from business description', async () => {
            const description = `I run a restaurant chain with multiple locations. 
                We track customer dietary restrictions, preferred seating, order history, 
                and loyalty points. We use Stripe for payments and Toast for POS.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            expect(domain.businessType).toBe('restaurant');
            expect(domain.entities).toHaveProperty('customer');
            expect(domain.entities).toHaveProperty('order');
            expect(domain.entities.customer?.fields).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'dietaryRestrictions' }),
                    expect.objectContaining({ name: 'favoriteTable' }),
                    expect.objectContaining({ name: 'loyaltyPoints' })
                ])
            );
        });
        
        it('should generate ecommerce domain from business description', async () => {
            const description = `I run an online store selling handmade jewelry. 
                I track customer purchase history, wishlist items, and shipping preferences. 
                I use Shopify for my store and Mailchimp for marketing.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            expect(domain.businessType).toBe('ecommerce');
            expect(domain.entities).toHaveProperty('customer');
            expect(domain.entities).toHaveProperty('product');
            expect(domain.entities).toHaveProperty('order');
        });
        
        it('should generate consulting domain from business description', async () => {
            const description = `I run a consulting firm specializing in digital transformation. 
                We track client projects, deliverables, team assignments, and billing hours. 
                We use Microsoft Teams and Asana for project management.`;
            
            const domain = await processor.processBusinessDescription(description);
            
            expect(domain.businessType).toBe('consulting');
            expect(domain.entities).toHaveProperty('client');
            expect(domain.entities).toHaveProperty('project');
            expect(domain.entities).toHaveProperty('deliverable');
        });
    });
    
    describe('generateBusinessCommands', () => {
        it('should generate restaurant-specific commands', async () => {
            const domain = {
                businessType: 'restaurant',
                description: 'Restaurant business',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'dietaryRestrictions', type: 'array' as const, required: false, optional: true },
                            { name: 'favoriteTable', type: 'number' as const, required: false, optional: true }
                        ]
                    }
                }
            };
            
            const commands = await processor.generateBusinessCommands(domain);
            
            expect(commands).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'customer:create',
                        category: 'porcelain'
                    }),
                    expect.objectContaining({
                        name: 'customer:seat',
                        category: 'porcelain'
                    })
                ])
            );
        });
        
        it('should generate ecommerce-specific commands', async () => {
            const domain = {
                businessType: 'ecommerce',
                description: 'Online store',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'email', type: 'string' as const, required: true, optional: false },
                            { name: 'wishlist', type: 'array' as const, required: false, optional: true }
                        ]
                    },
                    product: {
                        fields: [
                            { name: 'name', type: 'string' as const, required: true, optional: false },
                            { name: 'price', type: 'number' as const, required: true, optional: false },
                            { name: 'category', type: 'string' as const, required: true, optional: false }
                        ]
                    }
                }
            };
            
            const commands = await processor.generateBusinessCommands(domain);
            
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
        it('should generate Stripe mappings for restaurant business', async () => {
            const domain = {
                businessType: 'restaurant',
                description: 'Restaurant business',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as 'string', required: true, optional: false },
                            { name: 'email', type: 'string' as 'string', required: true, optional: false },
                            { name: 'loyaltyPoints', type: 'number' as 'number', required: false, optional: true }
                        ]
                    }
                }
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
                businessType: 'ecommerce',
                description: 'Online store with multiple integrations',
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
                }
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
            
            expect(result.businessType).toBe('ecommerce');
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
                }
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
                }
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
    });
    
    describe('Business Context Integration', () => {
        it('should initialize TypeRegistry with business context', async () => {
            const domain = {
                businessType: 'restaurant',
                description: 'Test restaurant',
                entities: {
                    customer: {
                        fields: [
                            { name: 'name', type: 'string' as 'string', required: true, optional: false },
                            { name: 'email', type: 'string' as 'string', required: true, optional: false },
                            { name: 'dietaryRestrictions', type: 'array' as 'array', required: false, optional: true }
                        ]
                    }
                }
            };

            BusinessTypeRegistry.initialize(domain);
            
            expect(BusinessTypeRegistry.hasEntityType('customer')).toBe(true);
            expect(BusinessTypeRegistry.getEntityTypes()).toContain('customer');
            
            const customerSchema = BusinessTypeRegistry.getSchema('customer');
            expect(customerSchema).toBeDefined();
            
            // Test schema validation
            const validCustomer = {
                name: 'John Doe',
                email: 'john@restaurant.com',
                dietaryRestrictions: ['vegetarian']
            };
            
            const validation = BusinessTypeRegistry.validateEntity('customer', validCustomer);
            expect(validation.valid).toBe(true);
            expect(validation.data).toEqual(expect.objectContaining({
                name: 'John Doe',
                email: 'john@restaurant.com',
                dietaryRestrictions: ['vegetarian']
            }));
        });
    });
}); 