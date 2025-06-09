/**
 * BaseTransformer - Abstract base class for data transformation components
 * 
 * @package     @imajin/cli
 * @subpackage  etl/transformers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Zod schemas for input/output validation
 * - Event system for progress tracking
 * - Batch processing for large datasets
 */

import { z } from 'zod';
import { ETLConfig, ETLContext, ETLProgress, ETLResult, Transformer } from '../core/interfaces.js';

/**
 * Base configuration for transformers
 */
export interface BaseTransformerConfig extends ETLConfig {
    readonly fieldMappings?: Record<string, string>;
    readonly defaultValues?: Record<string, any>;
    readonly skipInvalidItems?: boolean;
    readonly transformRules?: TransformRule[];
}

/**
 * Individual transformation rule
 */
export interface TransformRule {
    readonly field: string;
    readonly operation: 'rename' | 'convert' | 'format' | 'calculate' | 'filter' | 'default';
    readonly target?: string;
    readonly value?: any;
    readonly converter?: (value: any) => any;
    readonly condition?: (item: any) => boolean;
}

/**
 * Abstract base transformer providing common transformation functionality
 */
export abstract class BaseTransformer<TInput = any, TOutput = any> implements Transformer<TInput, TOutput> {
    public abstract readonly name: string;
    public abstract readonly description?: string;
    public abstract readonly inputSchema?: z.ZodSchema<TInput>;
    public abstract readonly outputSchema?: z.ZodSchema<TOutput>;

    constructor(protected config: BaseTransformerConfig = {}) { }

    /**
     * Transform input data to output format
     */
    public async transform(
        data: TInput[],
        context: ETLContext,
        config?: ETLConfig
    ): Promise<ETLResult<TOutput[]>> {
        const startTime = Date.now();
        const mergedConfig = { ...this.config, ...config } as BaseTransformerConfig;

        try {
            context.events.emit('step:start', this.name, context);

            const transformedData: TOutput[] = [];
            const batchSize = mergedConfig.batchSize || 100;

            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                const batchResult = await this.transformBatch(batch, context, mergedConfig);
                transformedData.push(...batchResult);

                // Emit progress
                this.emitProgress(context, {
                    stage: 'transform',
                    step: this.name,
                    processed: i + batch.length,
                    total: data.length,
                    percentage: Math.round(((i + batch.length) / data.length) * 100),
                    message: `Transformed ${i + batch.length}/${data.length} items`,
                });
            }

            const duration = Date.now() - startTime;

            // Validate output if schema provided
            if (this.outputSchema && mergedConfig.validateOutput) {
                await this.validateOutput(transformedData);
            }

            const result: ETLResult<TOutput[]> = {
                success: true,
                data: transformedData,
                processed: transformedData.length,
                metadata: {
                    transformer: this.name,
                    config: mergedConfig,
                    inputCount: data.length,
                    outputCount: transformedData.length,
                },
                duration,
            };

            context.events.emit('step:complete', this.name, result, context);
            context.events.emit('data:transformed', transformedData.length, context);

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            const result: ETLResult<TOutput[]> = {
                success: false,
                error: error as Error,
                processed: 0,
                metadata: {
                    transformer: this.name,
                    config: mergedConfig,
                },
                duration,
            };

            context.events.emit('step:error', this.name, error as Error, context);
            return result;
        }
    }

    /**
     * Transform a single item (for streaming/batch processing)
     */
    public async transformItem(item: TInput, context: ETLContext): Promise<TOutput> {
        // Validate input if schema provided
        if (this.inputSchema && this.config.validateInput) {
            try {
                this.inputSchema.parse(item);
            } catch (error) {
                throw new Error(`Input validation failed: ${error}`);
            }
        }

        // Apply transformation rules
        let transformedItem = await this.performTransformation(item, context, this.config);

        // Apply field mappings
        if (this.config.fieldMappings) {
            transformedItem = this.applyFieldMappings(transformedItem, this.config.fieldMappings);
        }

        // Apply default values
        if (this.config.defaultValues) {
            transformedItem = this.applyDefaultValues(transformedItem, this.config.defaultValues);
        }

        // Apply transformation rules
        if (this.config.transformRules) {
            transformedItem = await this.applyTransformRules(transformedItem, this.config.transformRules, context);
        }

        return transformedItem;
    }

    /**
     * Validate transformation configuration
     */
    public async validate(config?: ETLConfig): Promise<boolean> {
        const mergedConfig = { ...this.config, ...config } as BaseTransformerConfig;

        // Validate transformation rules
        if (mergedConfig.transformRules) {
            return this.validateTransformRules(mergedConfig.transformRules);
        }

        return true;
    }

    /**
     * Abstract method for actual data transformation
     */
    protected abstract performTransformation(
        item: TInput,
        context: ETLContext,
        config: BaseTransformerConfig
    ): Promise<TOutput>;

    /**
     * Transform a batch of items
     */
    protected async transformBatch(
        batch: TInput[],
        context: ETLContext,
        config: BaseTransformerConfig
    ): Promise<TOutput[]> {
        const results: TOutput[] = [];

        for (const item of batch) {
            try {
                const transformed = await this.transformItem(item, context);
                results.push(transformed);
            } catch (error) {
                if (config.skipInvalidItems) {
                    // Log error but continue processing
                    console.warn(`Skipping invalid item: ${error}`);
                    continue;
                } else {
                    throw error;
                }
            }
        }

        return results;
    }

    /**
     * Apply field mappings to rename/restructure fields
     */
    protected applyFieldMappings(item: any, mappings: Record<string, string>): any {
        const result = { ...item };

        for (const [sourceField, targetField] of Object.entries(mappings)) {
            if (sourceField in result) {
                result[targetField] = result[sourceField];
                if (sourceField !== targetField) {
                    delete result[sourceField];
                }
            }
        }

        return result;
    }

    /**
     * Apply default values for missing fields
     */
    protected applyDefaultValues(item: any, defaults: Record<string, any>): any {
        const result = { ...item };

        for (const [field, defaultValue] of Object.entries(defaults)) {
            if (!(field in result) || result[field] === null || result[field] === undefined) {
                result[field] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
            }
        }

        return result;
    }

    /**
     * Apply transformation rules
     */
    protected async applyTransformRules(
        item: any,
        rules: TransformRule[],
        context: ETLContext
    ): Promise<any> {
        let result = { ...item };

        for (const rule of rules) {
            // Check condition if specified
            if (rule.condition && !rule.condition(result)) {
                continue;
            }

            switch (rule.operation) {
                case 'rename':
                    if (rule.target && rule.field in result) {
                        result[rule.target] = result[rule.field];
                        delete result[rule.field];
                    }
                    break;

                case 'convert':
                    if (rule.converter && rule.field in result) {
                        result[rule.field] = rule.converter(result[rule.field]);
                    }
                    break;

                case 'format':
                    if (rule.value && rule.field in result) {
                        result[rule.field] = this.formatValue(result[rule.field], rule.value);
                    }
                    break;

                case 'calculate':
                    if (rule.target && rule.converter) {
                        result[rule.target] = rule.converter(result);
                    }
                    break;

                case 'filter':
                    if (rule.condition && !rule.condition(result)) {
                        return null; // Filter out this item
                    }
                    break;

                case 'default':
                    if (!(rule.field in result) || result[rule.field] === null || result[rule.field] === undefined) {
                        result[rule.field] = rule.value;
                    }
                    break;
            }
        }

        return result;
    }

    /**
     * Format a value according to a format string
     */
    protected formatValue(value: any, format: string): any {
        if (typeof value === 'string') {
            switch (format) {
                case 'lowercase':
                    return value.toLowerCase();
                case 'uppercase':
                    return value.toUpperCase();
                case 'trim':
                    return value.trim();
                case 'email':
                    return value.toLowerCase().trim();
                default:
                    return value;
            }
        }

        if (typeof value === 'number') {
            switch (format) {
                case 'currency':
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(value);
                case 'percentage':
                    return `${(value * 100).toFixed(2)}%`;
                default:
                    return value;
            }
        }

        if (value instanceof Date) {
            switch (format) {
                case 'iso':
                    return value.toISOString();
                case 'date':
                    return value.toDateString();
                case 'time':
                    return value.toTimeString();
                default:
                    return value;
            }
        }

        return value;
    }

    /**
     * Validate transformation rules
     */
    protected validateTransformRules(rules: TransformRule[]): boolean {
        for (const rule of rules) {
            if (!rule.field || !rule.operation) {
                return false;
            }

            switch (rule.operation) {
                case 'rename':
                    if (!rule.target) return false;
                    break;
                case 'convert':
                    if (!rule.converter) return false;
                    break;
                case 'calculate':
                    if (!rule.converter || !rule.target) return false;
                    break;
                case 'default':
                    if (rule.value === undefined) return false;
                    break;
            }
        }

        return true;
    }

    /**
     * Validate output data against schema
     */
    protected async validateOutput(data: TOutput[]): Promise<void> {
        if (!this.outputSchema) {
            return;
        }

        for (let i = 0; i < data.length; i++) {
            try {
                this.outputSchema.parse(data[i]);
            } catch (error) {
                throw new Error(`Output validation failed for item ${i}: ${error}`);
            }
        }
    }

    /**
     * Emit progress event
     */
    protected emitProgress(context: ETLContext, progress: Partial<ETLProgress>): void {
        const fullProgress: ETLProgress = {
            stage: 'transform',
            step: this.name,
            processed: 0,
            ...progress,
        };

        context.events.emit('progress', fullProgress);
    }
} 