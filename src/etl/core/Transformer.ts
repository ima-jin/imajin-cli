import { z } from 'zod';
import { ETLConfig, ETLContext, ETLResult, Transformer as ITransformer } from './interfaces.js';

export abstract class Transformer<TInput = any, TOutput = any> implements ITransformer<TInput, TOutput> {
    readonly name: string;
    readonly description?: string;
    readonly inputSchema?: z.ZodSchema<TInput>;
    readonly outputSchema?: z.ZodSchema<TOutput>;

    constructor(
        name: string,
        description?: string,
        inputSchema?: z.ZodSchema<TInput>,
        outputSchema?: z.ZodSchema<TOutput>
    ) {
        this.name = name;
        if (description !== undefined) {
            this.description = description;
        }
        if (inputSchema !== undefined) {
            this.inputSchema = inputSchema;
        }
        if (outputSchema !== undefined) {
            this.outputSchema = outputSchema;
        }
    }

    abstract transform(data: TInput[], context: ETLContext, config?: ETLConfig): Promise<ETLResult<TOutput[]>>;

    async transformItem(_item: TInput, _context: ETLContext): Promise<TOutput> {
        throw new Error('transformItem not implemented');
    }

    async validate(_config?: ETLConfig): Promise<boolean> {
        return true;
    }
} 