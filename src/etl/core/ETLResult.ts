import { ETLResult as IETLResult } from './interfaces.js';

export class ETLResult<T = any> implements IETLResult<T> {
    readonly success: boolean;
    readonly data?: T;
    readonly error?: Error;
    readonly processed: number;
    readonly metadata: Record<string, any>;
    readonly duration: number;

    constructor(params: {
        success: boolean;
        data?: T;
        error?: Error;
        processed: number;
        metadata?: Record<string, any>;
        duration: number;
    }) {
        this.success = params.success;
        if (params.data !== undefined) {
            this.data = params.data;
        }
        if (params.error !== undefined) {
            this.error = params.error;
        }
        this.processed = params.processed;
        this.metadata = params.metadata ?? {};
        this.duration = params.duration;
    }

    static success<T>(data: T, processed: number, metadata: Record<string, any> = {}, duration: number = 0): ETLResult<T> {
        return new ETLResult<T>({
            success: true,
            data,
            processed,
            metadata,
            duration
        });
    }

    static error(error: Error, processed: number, metadata: Record<string, any> = {}, duration: number = 0): ETLResult {
        return new ETLResult({
            success: false,
            error,
            processed,
            metadata,
            duration
        });
    }
} 