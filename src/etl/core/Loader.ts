import { z } from 'zod';
import { ETLConfig, ETLContext, ETLResult, Loader as ILoader } from './interfaces.js';

export abstract class Loader<TInput = any> implements ILoader<TInput> {
    readonly name: string;
    readonly description?: string;
    readonly inputSchema?: z.ZodSchema<TInput>;

    constructor(name: string, description?: string, inputSchema?: z.ZodSchema<TInput>) {
        this.name = name;
        if (description !== undefined) {
            this.description = description;
        }
        if (inputSchema !== undefined) {
            this.inputSchema = inputSchema;
        }
    }

    abstract load(data: TInput[], context: ETLContext, config?: ETLConfig): Promise<ETLResult<any>>;

    async loadItem(item: TInput, context: ETLContext): Promise<any> {
        throw new Error('loadItem not implemented');
    }

    async validate(config?: ETLConfig): Promise<boolean> {
        return true;
    }

    async handleConflict(existing: any, incoming: TInput, context: ETLContext): Promise<TInput> {
        return incoming;
    }
} 