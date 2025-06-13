import { ETLProgress as IETLProgress } from './interfaces.js';

export class ETLProgress implements IETLProgress {
    readonly stage: 'extract' | 'transform' | 'load';
    readonly step: string;
    readonly processed: number;
    readonly total?: number;
    readonly percentage?: number;
    readonly message?: string;
    readonly data?: any;

    constructor(params: {
        stage: 'extract' | 'transform' | 'load';
        step: string;
        processed: number;
        total?: number;
        message?: string;
        data?: any;
    }) {
        this.stage = params.stage;
        this.step = params.step;
        this.processed = params.processed;
        if (params.total !== undefined) {
            this.total = params.total;
        }
        if (params.message !== undefined) {
            this.message = params.message;
        }
        if (params.data !== undefined) {
            this.data = params.data;
        }

        if (this.total !== undefined) {
            this.percentage = Math.round((this.processed / this.total) * 100);
        }
    }

    static create(params: {
        stage: 'extract' | 'transform' | 'load';
        step: string;
        processed: number;
        total?: number;
        message?: string;
        data?: any;
    }): ETLProgress {
        return new ETLProgress(params);
    }
} 