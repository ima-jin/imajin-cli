/**
 * CustomerRepository - Example repository implementation for UniversalCustomer
 * 
 * @package     @imajin/cli
 * @subpackage  repositories/examples
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - MemoryRepository for data storage
 * - UniversalCustomer entity type
 * - Repository pattern demonstration
 */

import type { EventEmitter } from 'events';
import type { Logger } from '../../logging/Logger.js';
// Universal types removed - now using dynamic business context types
// Customer type will be defined by business context registry
import { MemoryRepository } from '../implementations/MemoryRepository.js';
import type { RepositoryOptions } from '../Repository.js';

/**
 * Example customer repository using memory storage
 */
export class CustomerRepository extends MemoryRepository<any> {
    constructor(
        logger: Logger,
        eventEmitter: EventEmitter,
        options: RepositoryOptions = {}
    ) {
        super('CustomerRepository', logger, eventEmitter, {
            dataSource: 'memory',
            caching: { enabled: true, ttl: 300000, maxSize: 1000 },
            validation: { enabled: true, strict: false },
            ...options
        });
    }

    /**
     * Find customers by email
     */
    async findByEmail(email: string): Promise<any | null> {
        const customers = await this.findAll({
            filters: [{ field: 'email', operator: 'eq', value: email }]
        });
        return customers.length > 0 ? customers[0]! : null;
    }

    /**
     * Find customers by service source
     */
    async findByService(serviceSource: string): Promise<any[]> {
        return this.findAll({
            filters: [{ field: 'serviceSource', operator: 'eq', value: serviceSource }]
        });
    }

    /**
     * Search customers by name pattern
     */
    async searchByName(nameQuery: string): Promise<any[]> {
        return this.findAll({
            filters: [{ field: 'name', operator: 'like', value: `%${nameQuery}%` }]
        });
    }

    /**
     * Get customer statistics
     */
    async getStats(): Promise<{
        totalCustomers: number;
        customersByService: Record<string, number>;
        recentCustomers: number;
    }> {
        const allCustomers = await this.findAll();
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const customersByService: Record<string, number> = {};
        let recentCustomers = 0;

        for (const customer of allCustomers) {
            // Count by service
            const service = customer.sourceService;
            customersByService[service] = (customersByService[service] ?? 0) + 1;

            // Count recent customers
            if (customer.createdAt > oneDayAgo) {
                recentCustomers++;
            }
        }

        return {
            totalCustomers: allCustomers.length,
            customersByService,
            recentCustomers
        };
    }

    /**
     * Create sample customer data for testing
     */
    async createSampleData(): Promise<void> {
        const sampleCustomers = [
            {
                email: 'john.doe@example.com',
                name: 'John Doe',
                phone: '+1-555-0123',
                sourceService: 'stripe',
                metadata: { plan: 'premium' },
                serviceData: { customerId: 'cus_stripe_123' }
            },
            {
                email: 'jane.smith@example.com',
                name: 'Jane Smith',
                phone: '+1-555-0456',
                sourceService: 'salesforce',
                metadata: { region: 'north-america' },
                serviceData: { accountId: 'sf_acc_456' }
            },
            {
                email: 'bob.wilson@example.com',
                name: 'Bob Wilson',
                sourceService: 'hubspot',
                metadata: { lead_score: 85 },
                serviceData: { contactId: 'hs_contact_789' }
            }
        ];

        for (const customerData of sampleCustomers) {
            await this.create(customerData);
        }

        this.logger.info('Sample customer data created', {
            count: sampleCustomers.length,
            repository: this.getName()
        });
    }
} 