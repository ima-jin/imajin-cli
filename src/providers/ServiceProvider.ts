/**
 * ServiceProvider - Abstract base class for service providers
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 * @updated      2025-07-03
 *
 * @see        docs/architecture.md
 * 
 * Integration Points:
 * - Service registration phase
 * - Service bootstrapping phase
 * - Container access for dependency registration
 * - Command registration system
 */

import type { Command } from 'commander';
import type { Container } from '../container/Container.js';

export abstract class ServiceProvider {
    protected container: Container;
    protected program: Command;

    constructor(container: Container, program: Command) {
        this.container = container;
        this.program = program;
    }

    /**
     * Register services with the container
     * This method is called during the registration phase
     */
    public abstract register(): void | Promise<void>;

    /**
     * Bootstrap services after all providers have been registered
     * This method is called during the boot phase
     */
    public abstract boot(): void | Promise<void>;

    /**
     * Get the service provider name
     */
    public abstract getName(): string;

    /**
     * Register CLI commands (optional)
     * This method is called to register commands with the CLI program
     */
    public registerCommands?(program: Command): void;

    /**
     * Get service provider version
     */
    public getVersion(): string {
        return '0.1.0';
    }

    /**
     * Check if this provider provides a specific service
     */
    public provides(_service: string): boolean {
        return false;
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return [];
    }
} 