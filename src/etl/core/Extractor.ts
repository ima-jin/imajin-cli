import { z } from 'zod';
import { ETLConfig, ETLContext, ETLResult, Extractor as IExtractor } from './interfaces.js';

export abstract class Extractor<TOutput = any> implements IExtractor<TOutput> {
    readonly name: string;
    readonly description?: string;
    readonly outputSchema?: z.ZodSchema<TOutput>;

    constructor(name: string, description?: string, outputSchema?: z.ZodSchema<TOutput>) {
        this.name = name;
        if (description !== undefined) {
            this.description = description;
        }
        if (outputSchema !== undefined) {
            this.outputSchema = outputSchema;
        }
    }

    abstract extract(context: ETLContext, config?: ETLConfig): Promise<ETLResult<TOutput[]>>;

    async validate(_config?: ETLConfig): Promise<boolean> {
        return true;
    }

    async getMetadata(): Promise<Record<string, any>> {
        return {
            name: this.name,
            description: this.description,
            hasSchema: !!this.outputSchema
        };
    }
} 