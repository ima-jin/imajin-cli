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
 * @updated      2025-07-04
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
        // 1. Process business description - use community description that matches existing recipe
        const description = `I run a local community platform with member management. 
            We organize events, share resources, and connect people with projects.`;
        
        const domain = await processor.processBusinessDescription(description);
        
        expect(domain).toEqual(expect.objectContaining({
            businessType: 'community-platform', // Updated to match actual recipe
            entities: expect.objectContaining({
                member: expect.any(Object), // Updated to match community recipe entities
                event: expect.any(Object),
                resource: expect.any(Object)
            })
        }));
        
        // 2. Initialize business context using correct method
        await manager.initialize(description, 'Test Community Platform');
        
        // 3. Initialize business schemas
        await initializeBusinessSchemas(domain);
        
        // 4. Validate business context system is working
        expect(BusinessTypeRegistry.hasEntityType('member')).toBe(true);
        expect(BusinessTypeRegistry.getEntityTypes()).toContain('member');
        
        // 5. Test business entity validation - use complete test data that matches the member schema
        const memberData = {
            name: 'John Doe',
            email: 'john@community.com',
            bio: 'Community organizer',
            skills: ['event planning', 'marketing'],
            membershipType: 'organizer', // Required field
            joinDate: new Date('2025-01-01'), // Required field
            isActive: true,
            availableForMentoring: true,
            lookingForMentor: false
        };
        
        const validation = validateBusinessEntity('member', memberData);
        expect(validation.valid).toBe(true);
        
        console.log('✅ Full business context workflow completed successfully');
    });
    
    it('should handle service integration with business context', async () => {
        // Setup business context for community platform (matches existing recipe)
        const businessContext = {
            businessType: 'community-platform',
            description: 'Test community platform',
            entities: {
                member: {
                    fields: [
                        { name: 'name', type: 'string' as const, required: true, optional: false },
                        { name: 'email', type: 'string' as const, required: true, optional: false },
                        { name: 'skills', type: 'array' as const, required: false, optional: true }
                    ]
                }
            },
            workflows: [],
            businessRules: [],
            integrations: [],
            commands: []
        };
        
        // Initialize business context
        BusinessTypeRegistry.initialize(businessContext);
        
        // Test business context member creation
        const businessMember = {
            name: 'John Doe',
            email: 'john@community.com',
            skills: ['leadership', 'project management']
        };
        
        // Validate against business schema
        const validation = BusinessTypeRegistry.validateEntity('member', businessMember);
        expect(validation.valid).toBe(true);
        expect(validation.data).toEqual(expect.objectContaining({
            name: 'John Doe',
            email: 'john@community.com',
            skills: ['leadership', 'project management']
        }));
        
        console.log('✅ Service integration with business context working');
    });
    
    it('should generate service mappings for business context', async () => {
        const domain = {
            businessType: 'business', // Updated to use universal fallback
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
            },
            workflows: [],
            businessRules: [],
            integrations: [],
            commands: []
        };
        
        // Generate service mappings
        const mappings = await processor.generateServiceMappings(domain, ['stripe']);
        
        expect(mappings).toHaveProperty('stripe');
        expect(mappings.stripe).toEqual(expect.objectContaining({
            sourceModel: 'stripe',
            targetModel: 'business',
            mappings: expect.objectContaining({
                customer: expect.any(Object)
            })
        }));
        
        console.log('✅ Service mappings generated successfully');
    });
    
    it('should validate business entity schemas', async () => {
        const domain = {
            businessType: 'business', // Updated to use universal fallback
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
            },
            workflows: [],
            businessRules: [],
            integrations: [],
            commands: []
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
        expect(invalidValidation.errors).toContainEqual(expect.stringContaining('contactEmail'));
        
        console.log('✅ Business entity validation working correctly');
    });
    
    it('should handle complex business workflows', async () => {
        const description = `PCB lighting equipment manufacturer and installer. We design custom lighting solutions, 
            manufacture circuit boards, and provide installation services for commercial venues.`;
        
        const domain = await processor.processBusinessDescription(description);
        
        // Universal system should match to imajin-lighting recipe with specific keywords
        expect(domain.businessType).toMatch(/^(imajin-lighting|business)$/);
        expect(domain.entities).toBeDefined();
        expect(Object.keys(domain.entities).length).toBeGreaterThan(0);
        
        // Initialize with complex business context
        await initializeBusinessSchemas(domain);
        
        // Generate business commands
        const commands = await processor.generateBusinessCommands(domain);
        
        expect(commands).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    category: 'porcelain',
                    name: expect.stringMatching(/.+:(create|list|update|delete)$/)
                })
            ])
        );
        
        console.log('✅ Complex business workflow processing successful');
    });
    
    it('should export business schema definitions', async () => {
        const domain = {
            businessType: 'business', // Updated to use universal fallback
            description: 'Retail store',
            entities: {
                customer: {
                    fields: [
                        { name: 'name', type: 'string' as const, required: true, optional: false },
                        { name: 'email', type: 'string' as const, required: true, optional: false },
                        { name: 'loyaltyPoints', type: 'number' as const, required: false, optional: true, default: 0 }
                    ]
                }
            },
            workflows: [],
            businessRules: [],
            integrations: [],
            commands: []
        };
        
        BusinessTypeRegistry.initialize(domain);
        
        // Export schema definitions
        const { exportBusinessSchemaDefinitions } = await import('../../context/BusinessSchemaRegistry.js');
        const definitions = exportBusinessSchemaDefinitions();
        
        expect(definitions).toHaveProperty('customer');
        expect(definitions.customer).toEqual(expect.objectContaining({
            entityName: 'customer',
            businessType: 'business', // Updated expectation
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