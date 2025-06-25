/**
 * FinalBusinessContextValidation.test.ts - End-to-end business context integration test
 * 
 * @package     @imajin/cli
 * @subpackage  test/integration
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-25
 *
 * Integration Points:
 * - BusinessContextProcessor for domain model generation
 * - BusinessContextManager for context lifecycle
 * - BusinessModelFactory for ETL integration
 * - RepositoryFactory for business entity repositories
 * - Validates end-to-end business context workflows
 */

import { BusinessContextProcessor } from '../../context/BusinessContextProcessor.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';
import { BusinessModelFactory } from '../../etl/graphs/BusinessModelFactory.js';
import { RepositoryFactory } from '../../repositories/RepositoryFactory.js';
import { BusinessTypeRegistry } from '../../types/Core.js';
import type { Container } from '../../container/Container.js';
import type { Logger } from '../../logging/Logger.js';

// Mock dependencies
const mockContainer = {
    resolve: jest.fn().mockImplementation((service: string) => {
        if (service === 'logger') {
            return {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                debug: jest.fn()
            };
        }
        if (service === 'eventEmitter') {
            return {
                emit: jest.fn(),
                on: jest.fn(),
                off: jest.fn()
            };
        }
        return {};
    })
} as unknown as Container;

describe('Final Business Context Integration', () => {
    let processor: BusinessContextProcessor;
    let manager: BusinessContextManager;
    let repositoryFactory: RepositoryFactory;
    
    beforeEach(async () => {
        processor = new BusinessContextProcessor();
        manager = new BusinessContextManager();
        repositoryFactory = new RepositoryFactory(mockContainer);
        
        // Clear any existing registrations
        BusinessTypeRegistry['registeredTypes']?.clear?.();
        BusinessTypeRegistry['businessDomains']?.clear?.();
    });
    
    afterEach(() => {
        // Clean up registrations
        BusinessTypeRegistry['registeredTypes']?.clear?.();
        BusinessTypeRegistry['businessDomains']?.clear?.();
    });
    
    it('should complete restaurant business workflow without Universal types', async () => {
        // 1. Process business description
        const description = `I run a restaurant chain with customer loyalty program. 
            I track dietary restrictions, favorite tables, and order history.`;
        
        const domain = await processor.processBusinessDescription(description);
        expect(domain.businessType).toBe('restaurant');
        expect(domain.entities).toHaveProperty('customer');
        expect(domain.entities).toHaveProperty('order');
        
        // 2. Initialize all systems with business context
        await manager.initialize(domain.description, `${domain.businessType} business`);
        BusinessModelFactory.registerBusinessDomainWithETL(domain);
        await repositoryFactory.initializeWithBusinessContext();
        
        // 3. Verify no Universal types are used
        const registeredTypes = repositoryFactory.getRegisteredBusinessTypes();
        const universalTypes = registeredTypes.filter(type => type.includes('Universal'));
        expect(universalTypes).toHaveLength(0);
        
        // 4. Verify business-specific repositories exist
        expect(registeredTypes).toContain('restaurant.customer');
        expect(registeredTypes).toContain('restaurant.order');
        
        // 5. Test ETL mappings use business context
        const mappings = BusinessModelFactory.generateBusinessMappings('restaurant');
        expect(mappings.customer).toBe('restaurant.customer');
        expect(mappings.order).toBe('restaurant.order');
        
        console.log('✅ Restaurant workflow completed without Universal types');
    });
    
    it('should support ecommerce business workflow', async () => {
        const description = `I run an online store selling handmade jewelry. 
            I track customer purchase history and shipping preferences.`;
        
        const domain = await processor.processBusinessDescription(description);
        expect(domain.businessType).toBe('ecommerce');
        expect(domain.entities).toHaveProperty('customer');
        expect(domain.entities).toHaveProperty('product');
        
        await manager.initialize(domain.description, `${domain.businessType} business`);
        BusinessModelFactory.registerBusinessDomainWithETL(domain);
        await repositoryFactory.initializeWithBusinessContext();
        
        const mappings = BusinessModelFactory.generateBusinessMappings('ecommerce');
        expect(mappings.customer).toBe('ecommerce.customer');
        expect(mappings.product).toBe('ecommerce.product');
        
        // Verify no Universal type contamination
        const registeredTypes = repositoryFactory.getRegisteredBusinessTypes();
        const universalTypes = registeredTypes.filter(type => 
            type.includes('Universal') || type.startsWith('Universal')
        );
        expect(universalTypes).toHaveLength(0);
        
        console.log('✅ Ecommerce workflow completed with business context');
    });
    
    it('should generate business-native repository instances', async () => {
        const description = `I manage a SaaS platform with subscriptions and user accounts.`;
        
        const domain = await processor.processBusinessDescription(description);
        expect(domain.businessType).toBe('saas');
        
        await manager.initialize(domain.description, `${domain.businessType} business`);
        await repositoryFactory.initializeWithBusinessContext();
        
        // Test creating business entity repositories
        const customerRepo = repositoryFactory.create('saas.customer');
        expect(customerRepo).toBeDefined();
        
        const subscriptionRepo = repositoryFactory.create('saas.subscription');
        expect(subscriptionRepo).toBeDefined();
        
        // Verify factory stats show business entities only
        const stats = repositoryFactory.getStats();
        expect(stats.totalFactories).toBeGreaterThan(0);
        
        // No Universal types should be registered
        const availableTypes = repositoryFactory.getAvailableTypes();
        const universalTypes = availableTypes.filter(type => 
            type.includes('Universal') || type.startsWith('Universal')
        );
        expect(universalTypes).toHaveLength(0);
        
        console.log('✅ SaaS workflow completed with business-native repositories');
    });
    
    it('should handle multiple business contexts independently', async () => {
        // Test restaurant context
        const restaurantDescription = `I run a restaurant with table reservations.`;
        const restaurantDomain = await processor.processBusinessDescription(restaurantDescription);
        
        // Test ecommerce context
        const ecommerceDescription = `I run an online store with product catalog.`;
        const ecommerceDomain = await processor.processBusinessDescription(ecommerceDescription);
        
        // Initialize both contexts
        await manager.initialize(restaurantDomain.description, `${restaurantDomain.businessType} business`);
        BusinessModelFactory.registerBusinessDomainWithETL(restaurantDomain);
        
        // For simplicity, we'll just test the last initialized domain
        await manager.initialize(ecommerceDomain.description, `${ecommerceDomain.businessType} business`);
        BusinessModelFactory.registerBusinessDomainWithETL(ecommerceDomain);
        
        await repositoryFactory.initializeWithBusinessContext();
        
        // Verify both business contexts are supported
        const restaurantMappings = BusinessModelFactory.generateBusinessMappings('restaurant');
        const ecommerceMappings = BusinessModelFactory.generateBusinessMappings('ecommerce');
        
        expect(restaurantMappings).toHaveProperty('customer');
        expect(ecommerceMappings).toHaveProperty('customer');
        
        expect(restaurantMappings.customer).toBe('restaurant.customer');
        expect(ecommerceMappings.customer).toBe('ecommerce.customer');
        
        // Verify independent repository instances
        const restaurantCustomerRepo = repositoryFactory.create('restaurant.customer');
        const ecommerceCustomerRepo = repositoryFactory.create('ecommerce.customer');
        
        expect(restaurantCustomerRepo).toBeDefined();
        expect(ecommerceCustomerRepo).toBeDefined();
        expect(restaurantCustomerRepo).not.toBe(ecommerceCustomerRepo);
        
        console.log('✅ Multiple business contexts handled independently');
    });
    
    it('should validate business entity schemas dynamically', async () => {
        const description = `I run a fitness studio with member subscriptions and class bookings.`;
        
        const domain = await processor.processBusinessDescription(description);
        expect(domain.businessType).toBe('fitness');
        
        await manager.initialize(domain.description, `${domain.businessType} business`);
        await repositoryFactory.initializeWithBusinessContext();
        
        // Test business entity schema validation
        const registeredTypes = BusinessTypeRegistry.getRegisteredTypes();
        expect(registeredTypes.length).toBeGreaterThan(0);
        
        for (const typeName of registeredTypes) {
            const parts = typeName.split('.');
            const businessType = parts[0];
            const entityName = parts[1];
            
            if (businessType && entityName) {
                const schema = BusinessTypeRegistry.getBusinessEntitySchema(businessType, entityName);
                expect(schema).toBeDefined();
                
                // Verify schema can validate data
                const testData = {
                    id: 'test-id',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    businessType: businessType
                };
                
                expect(() => schema?.parse(testData)).not.toThrow();
            }
        }
        
        console.log('✅ Business entity schemas validate dynamically');
    });
}); 