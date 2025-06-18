/**
 * ServiceStrategyManager - Strategy pattern implementation for dynamic behavior selection
 * 
 * @package     @imajin/cli
 * @subpackage  services
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-10
 *
 * @see         docs/architecture.md
 * 
 * Integration Points:
 * - Service interfaces and strategy contracts
 * - Logging for strategy selection and execution
 * - Event system for strategy lifecycle events
 * - Error handling and fallback mechanisms
 */

import type { Container } from '../container/Container.js';
import type { Logger } from '../logging/Logger.js';
import {
    type IServiceStrategy,
    type IServiceStrategyManager
} from './interfaces/ServiceInterface.js';

export interface StrategyExecutionResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
    strategyName: string;
    executionTime: number;
    timestamp: Date;
}

export interface StrategySelectionCriteria {
    priority?: boolean; // Use priority-based selection
    firstMatch?: boolean; // Use first matching strategy
    allMatching?: boolean; // Execute all matching strategies
    fallback?: string; // Fallback strategy name
}

export class ServiceStrategyManager<T = any> implements IServiceStrategyManager<T> {
    private readonly strategies: Map<string, IServiceStrategy<T>> = new Map();
    private strategiesByPriority: IServiceStrategy<T>[] = [];
    private readonly container: Container;
    private readonly logger: Logger;
    private defaultCriteria: StrategySelectionCriteria = {
        priority: true,
        firstMatch: false,
        allMatching: false
    };

    constructor(container: Container) {
        this.container = container;
        this.logger = container.resolve<Logger>('logger');
    }

    /**
     * Add a strategy to the manager
     */
    public addStrategy(strategy: IServiceStrategy<T>): void {
        const strategyName = strategy.getName();

        if (this.strategies.has(strategyName)) {
            throw new Error(`Strategy '${strategyName}' is already registered`);
        }

        this.strategies.set(strategyName, strategy);
        this.updatePriorityOrder();

        this.logger.info(`Strategy added: ${strategyName}`, {
            priority: strategy.getPriority(),
            totalStrategies: this.strategies.size
        });
    }

    /**
     * Remove a strategy from the manager
     */
    public removeStrategy(strategyName: string): void {
        if (!this.strategies.has(strategyName)) {
            throw new Error(`Strategy '${strategyName}' is not registered`);
        }

        this.strategies.delete(strategyName);
        this.updatePriorityOrder();

        this.logger.info(`Strategy removed: ${strategyName}`, {
            totalStrategies: this.strategies.size
        });
    }

    /**
     * Get a strategy that can handle the given input
     */
    public getStrategy(input: T): IServiceStrategy<T> | undefined {
        // Use priority-based selection by default
        for (const strategy of this.strategiesByPriority) {
            if (strategy.canHandle(input)) {
                this.logger.debug(`Strategy selected: ${strategy.getName()}`, {
                    priority: strategy.getPriority()
                });
                return strategy;
            }
        }

        this.logger.debug('No strategy found for input', { inputType: typeof input });
        return undefined;
    }

    /**
     * Get a strategy by name
     */
    public getStrategyByName(strategyName: string): IServiceStrategy<T> | undefined {
        return this.strategies.get(strategyName);
    }

    /**
     * Get all matching strategies for the given input
     */
    public getMatchingStrategies(input: T): IServiceStrategy<T>[] {
        return this.strategiesByPriority.filter(strategy => strategy.canHandle(input));
    }

    /**
     * Get all registered strategies
     */
    public getAllStrategies(): IServiceStrategy<T>[] {
        return Array.from(this.strategies.values());
    }

    /**
     * Execute using the best matching strategy
     */
    public async execute(
        input: T,
        criteria: StrategySelectionCriteria = this.defaultCriteria
    ): Promise<StrategyExecutionResult> {
        const startTime = Date.now();

        try {
            if (criteria.allMatching) {
                return await this.executeAllMatching(input, startTime);
            }

            const strategy = this.selectStrategy(input, criteria);
            if (!strategy) {
                throw new Error('No suitable strategy found for input');
            }

            return await this.executeStrategy(strategy, input, startTime);
        } catch (error) {
            this.logger.error('Strategy execution failed', error as Error);

            return {
                success: false,
                error: error as Error,
                strategyName: 'none',
                executionTime: Date.now() - startTime,
                timestamp: new Date()
            };
        }
    }

    /**
     * Execute with a specific strategy by name
     */
    public async executeWithStrategy(
        strategyName: string,
        input: T
    ): Promise<StrategyExecutionResult> {
        const startTime = Date.now();
        const strategy = this.strategies.get(strategyName);

        if (!strategy) {
            throw new Error(`Strategy '${strategyName}' not found`);
        }

        if (!strategy.canHandle(input)) {
            throw new Error(`Strategy '${strategyName}' cannot handle the provided input`);
        }

        return await this.executeStrategy(strategy, input, startTime);
    }

    /**
     * Execute all matching strategies
     */
    public async executeAll(input: T): Promise<StrategyExecutionResult[]> {
        const matchingStrategies = this.getMatchingStrategies(input);
        const results: StrategyExecutionResult[] = [];

        for (const strategy of matchingStrategies) {
            const startTime = Date.now();
            const result = await this.executeStrategy(strategy, input, startTime);
            results.push(result);
        }

        return results;
    }

    /**
     * Test if any strategy can handle the input
     */
    public canHandle(input: T): boolean {
        return this.strategiesByPriority.some(strategy => strategy.canHandle(input));
    }

    /**
     * Get strategy statistics
     */
    public getStatistics(): {
        totalStrategies: number;
        byPriority: Array<{ name: string; priority: number; }>;
        executionCounts: Record<string, number>;
    } {
        return {
            totalStrategies: this.strategies.size,
            byPriority: this.strategiesByPriority.map(s => ({
                name: s.getName(),
                priority: s.getPriority()
            })),
            executionCounts: {} // Would need to track this in actual implementation
        };
    }

    /**
     * Set default selection criteria
     */
    public setDefaultCriteria(criteria: StrategySelectionCriteria): void {
        this.defaultCriteria = { ...this.defaultCriteria, ...criteria };
        this.logger.debug('Default strategy criteria updated', criteria);
    }

    /**
     * Clear all strategies
     */
    public clear(): void {
        const count = this.strategies.size;
        this.strategies.clear();
        this.strategiesByPriority = [];

        this.logger.info(`All strategies cleared`, { removedCount: count });
    }

    /**
     * Check if a strategy is registered
     */
    public hasStrategy(strategyName: string): boolean {
        return this.strategies.has(strategyName);
    }

    /**
     * Get strategies by priority range
     */
    public getStrategiesByPriorityRange(minPriority: number, maxPriority: number): IServiceStrategy<T>[] {
        return this.strategiesByPriority.filter(strategy => {
            const priority = strategy.getPriority();
            return priority >= minPriority && priority <= maxPriority;
        });
    }

    // Private helper methods

    /**
     * Update the priority-ordered list of strategies
     */
    private updatePriorityOrder(): void {
        this.strategiesByPriority = Array.from(this.strategies.values())
            .sort((a, b) => b.getPriority() - a.getPriority()); // Higher priority first
    }

    /**
     * Select a strategy based on criteria
     */
    private selectStrategy(
        input: T,
        criteria: StrategySelectionCriteria
    ): IServiceStrategy<T> | undefined {
        let strategy: IServiceStrategy<T> | undefined;

        if (criteria.priority || criteria.firstMatch) {
            strategy = this.getStrategy(input);
        }

        // Try fallback if no strategy found
        if (!strategy && criteria.fallback) {
            const fallbackStrategy = this.strategies.get(criteria.fallback);
            if (fallbackStrategy?.canHandle(input)) {
                strategy = fallbackStrategy;
                this.logger.debug(`Using fallback strategy: ${criteria.fallback}`);
            }
        }

        return strategy;
    }

    /**
     * Execute a single strategy
     */
    private async executeStrategy(
        strategy: IServiceStrategy<T>,
        input: T,
        startTime: number
    ): Promise<StrategyExecutionResult> {
        const strategyName = strategy.getName();

        try {
            this.logger.debug(`Executing strategy: ${strategyName}`);

            const data = await strategy.handle(input);
            const executionTime = Date.now() - startTime;

            this.logger.debug(`Strategy execution completed: ${strategyName}`, {
                executionTime
            });

            return {
                success: true,
                data,
                strategyName,
                executionTime,
                timestamp: new Date()
            };
        } catch (error) {
            const executionTime = Date.now() - startTime;

            this.logger.error(`Strategy execution failed: ${strategyName}`, error as Error);

            return {
                success: false,
                error: error as Error,
                strategyName,
                executionTime,
                timestamp: new Date()
            };
        }
    }

    /**
     * Execute all matching strategies
     */
    private async executeAllMatching(input: T, startTime: number): Promise<StrategyExecutionResult> {
        const matchingStrategies = this.getMatchingStrategies(input);

        if (matchingStrategies.length === 0) {
            throw new Error('No matching strategies found');
        }

        const results: any[] = [];
        const errors: Error[] = [];

        for (const strategy of matchingStrategies) {
            try {
                const data = await strategy.handle(input);
                results.push({
                    strategy: strategy.getName(),
                    data
                });
            } catch (error) {
                errors.push(error as Error);
            }
        }

        const executionTime = Date.now() - startTime;
        const success = errors.length === 0;

        return {
            success,
            data: {
                results,
                errors: errors.map(e => e.message)
            },
            strategyName: `${matchingStrategies.length} strategies`,
            executionTime,
            timestamp: new Date()
        };
    }
} 