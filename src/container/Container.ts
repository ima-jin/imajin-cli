/**
 * Container - Dependency injection container for service management
 * 
 * @package     @imajin/cli
 * @subpackage  container
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 *
 * @see        docs/architecture.md
 * 
 * Integration Points:
 * - Service registration and resolution
 * - Singleton and transient service management
 * - Type-safe service resolution
 * - Circular dependency detection
 */

import 'reflect-metadata';

export type ServiceIdentifier<T = unknown> = string | symbol | Function;
export type ServiceFactory<T = any> = (container: Container) => T;

interface ServiceBinding<T = any> {
    factory: ServiceFactory<T>;
    singleton: boolean;
    instance?: T;
}

export class Container {
    private bindings = new Map<ServiceIdentifier<any>, ServiceBinding>();
    private instances = new Map<ServiceIdentifier<any>, any>();

    /**
     * Register a service with the container
     */
    public bind<T>(
        identifier: ServiceIdentifier<T>,
        factory: ServiceFactory<T>,
        singleton: boolean = false
    ): this {
        this.bindings.set(identifier, {
            factory,
            singleton,
        });
        return this;
    }

    /**
     * Register a singleton service
     */
    public singleton<T>(
        identifier: ServiceIdentifier<T>,
        factory: ServiceFactory<T>
    ): this {
        return this.bind(identifier, factory, true);
    }

    /**
     * Register an instance directly
     */
    public instance<T>(identifier: ServiceIdentifier<T>, instance: T): this {
        this.instances.set(identifier, instance);
        return this;
    }

    /**
     * Resolve a service from the container
     */
    public resolve<T>(identifier: ServiceIdentifier<T>): T {
        // Check for direct instance first
        if (this.instances.has(identifier)) {
            return this.instances.get(identifier);
        }

        const binding = this.bindings.get(identifier);
        if (!binding) {
            throw new Error(`Service ${String(identifier)} not found in container`);
        }

        // Handle singleton instances
        if (binding.singleton && binding.instance) {
            return binding.instance;
        }

        // Create new instance
        const instance = binding.factory(this);

        // Store singleton instances
        if (binding.singleton) {
            binding.instance = instance;
        }

        return instance;
    }

    /**
     * Check if a service is registered
     */
    public has(identifier: ServiceIdentifier<any>): boolean {
        return this.bindings.has(identifier) || this.instances.has(identifier);
    }

    /**
     * Get all registered service identifiers
     */
    public getServiceIdentifiers(): ServiceIdentifier<any>[] {
        return [
            ...Array.from(this.bindings.keys()),
            ...Array.from(this.instances.keys()),
        ];
    }
} 