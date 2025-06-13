/**
 * Business Context Integration Test - End-to-End Workflow
 * 
 * @package     @imajin/cli
 * @subpackage  test/integration
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 */

import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';
import { BusinessTypeRegistry } from '../../context/BusinessTypeRegistry.js';
import { initializeBusinessSchemas, validateBusinessEntity } from '../../context/BusinessSchemaRegistry.js';

describe('Business Context Integration', () => {
    let processor: BusinessContextProcessor;
    let manager: BusinessContextManager;
    
    beforeEach(async () => {
        processor = new BusinessContextProcessor();
        manager = new BusinessContextManager();
    });
    
    it('should complete full business context workflow', async () => {
        // 1. Process business description
        const description = `I run a restaurant with customer loyalty program. 
            I track dietary restrictions and favorite tables. I use Stripe for payments.`;
        
        const domain = await processor.processBusinessDescription(description);
        
        expect(domain).toEqual(expect.objectContaining({
            businessType: 'restaurant',
            entities: expect.objectContaining({
                customer: expect.any(Object)
            })
        }));
        
        // 2. Initialize business context using correct method
        await manager.initialize(description, 'Test Restaurant');
        
        // 3. Initialize business schemas
        await initializeBusinessSchemas(domain);
        
        // 4. Validate business context system is working
        expect(BusinessTypeRegistry.hasEntityType('customer')).toBe(true);
        expect(BusinessTypeRegistry.getEntityTypes()).toContain('customer');
        
        // 5. Test business entity validation
        const customerData = {
            name: 'John Doe',
            email: 'john@restaurant.com',
            dietaryRestrictions: ['vegetarian'],
            favoriteTable: 5
        };
        
        const validation = validateBusinessEntity('customer', customerData);
        expect(validation.valid).toBe(true);
        expect(validation.data).toEqual(expect.objectContaining({
            name: 'John Doe',
            email: 'john@restaurant.com'
        }));
        
        console.log('✅ Full business context workflow completed successfully');
    });
    
    it('should handle service integration with business context', async () => {
        // Setup business context for restaurant
        const businessContext = {
            businessType: 'restaurant',
            description: 'Test restaurant',
            entities: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string' as const, required: true, optional: false },
                        { name: 'email', type: 'string' as const, required: true, optional: false },
                        { name: 'dietaryRestrictions', type: 'array' as const, required: false, optional: true }
                    ]
                }
            }
        };
        
        // Initialize business context
        BusinessTypeRegistry.initialize(businessContext);
        
        // Test business context customer creation
        const businessCustomer = {
            name: 'John Doe',
            email: 'john@restaurant.com',
            dietaryRestrictions: ['vegan', 'gluten-free']
        };
        
        // Validate against business schema
        const validation = BusinessTypeRegistry.validateEntity('customer', businessCustomer);
        expect(validation.valid).toBe(true);
        expect(validation.data).toEqual(expect.objectContaining({
            name: 'John Doe',
            email: 'john@restaurant.com',
            dietaryRestrictions: ['vegan', 'gluten-free']
        }));
        
        console.log('✅ Service integration with business context working');
    });
    
    it('should generate service mappings for business context', async () => {
        const domain = {
            businessType: 'ecommerce',
            description: 'Online store',
            entities: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string' as const, required: true, optional: false },
                        { name: 'email', type: 'string' as const, required: true, optional: false },
                        { name: 'purchaseHistory', type: 'array' as const, required: false, optional: true }
                    ]
                },
                product: {
                    fields: [
                        { name: 'name', type: 'string' as const, required: true, optional: false },
                        { name: 'price', type: 'number' as const, required: true, optional: false },
                        { name: 'inventory', type: 'number' as const, required: true, optional: false }
                    ]
                }
            }
        };
        
        // Generate service mappings
        const mappings = await processor.generateServiceMappings(domain, ['stripe']);
        
        expect(mappings).toHaveProperty('stripe');
        expect(mappings.stripe).toEqual(expect.objectContaining({
            serviceName: 'stripe',
            entityMappings: expect.objectContaining({
                customer: expect.any(Object)
            })
        }));
        
        console.log('✅ Service mappings generated successfully');
    });
    
    it('should validate business entity schemas', async () => {
        const domain = {
            businessType: 'consulting',
            description: 'Consulting firm',
            entities: {
                client: {
                    fields: [
                        { name: 'companyName', type: 'string' as const, required: true, optional: false },
                        { name: 'contactEmail', type: 'string' as const, required: true, optional: false },
                        { name: 'industry', type: 'string' as const, required: false, optional: true },
                        { name: 'projectBudget', type: 'number' as const, required: false, optional: true }
                    ]
                }
            }
        };
        
        BusinessTypeRegistry.initialize(domain);
        
        // Test valid client
        const validClient = {
            companyName: 'Tech Corp',
            contactEmail: 'contact@techcorp.com',
            industry: 'Software',
            projectBudget: 50000
        };
        
        const validation = BusinessTypeRegistry.validateEntity('client', validClient);
        expect(validation.valid).toBe(true);
        
        // Test invalid client (missing required field)
        const invalidClient = {
            companyName: 'Tech Corp'
            // Missing required contactEmail
        };
        
        const invalidValidation = BusinessTypeRegistry.validateEntity('client', invalidClient);
        expect(invalidValidation.valid).toBe(false);
        expect(invalidValidation.errors).toContain(expect.stringContaining('contactEmail'));
        
        console.log('✅ Business entity validation working correctly');
    });
    
    it('should handle complex business workflows', async () => {
        const description = `I run a multi-location spa business. We track client appointments, 
            therapist schedules, treatment packages, membership levels, and product sales. 
            We integrate with Square for payments and Mailchimp for marketing.`;
        
        const domain = await processor.processBusinessDescription(description);
        
        expect(domain.businessType).toBe('spa');
        expect(domain.entities).toEqual(expect.objectContaining({
            client: expect.any(Object),
            appointment: expect.any(Object),
            therapist: expect.any(Object),
            treatment: expect.any(Object)
        }));
        
        // Initialize with complex business context
        await initializeBusinessSchemas(domain);
        
        // Generate business commands
        const commands = await processor.generateBusinessCommands(domain);
        
        expect(commands).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: expect.stringMatching(/client:(create|book|schedule)/),
                    category: 'porcelain'
                }),
                expect.objectContaining({
                    name: expect.stringMatching(/appointment:(schedule|cancel|reschedule)/),
                    category: 'porcelain'
                })
            ])
        );
        
        console.log('✅ Complex business workflow processing successful');
    });
    
    it('should export business schema definitions', async () => {
        const domain = {
            businessType: 'retail',
            description: 'Retail store',
            entities: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string' as const, required: true, optional: false },
                        { name: 'email', type: 'string' as const, required: true, optional: false },
                        { name: 'loyaltyPoints', type: 'number' as const, required: false, optional: true, default: 0 }
                    ]
                }
            }
        };
        
        BusinessTypeRegistry.initialize(domain);
        
        // Export schema definitions
        const { exportBusinessSchemaDefinitions } = await import('../../context/BusinessSchemaRegistry.js');
        const definitions = exportBusinessSchemaDefinitions();
        
        expect(definitions).toHaveProperty('customer');
        expect(definitions.customer).toEqual(expect.objectContaining({
            entityName: 'customer',
            businessType: 'retail',
            schema: expect.any(Object),
            fields: expect.arrayContaining([
                expect.objectContaining({ name: 'name', type: 'string' }),
                expect.objectContaining({ name: 'email', type: 'string' }),
                expect.objectContaining({ name: 'loyaltyPoints', type: 'number', default: 0 })
            ])
        }));
        
        console.log('✅ Business schema export working correctly');
    });
}); 