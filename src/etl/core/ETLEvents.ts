import { EventEmitter } from 'node:events';
import { ETLContext, ETLProgress, ETLResult, PipelineResult } from './interfaces.js';

export class ETLEvents extends EventEmitter {
    on(event: 'progress', listener: (progress: ETLProgress) => void): this;
    on(event: 'step:start', listener: (step: string, context: ETLContext) => void): this;
    on(event: 'step:complete', listener: (step: string, result: ETLResult, context: ETLContext) => void): this;
    on(event: 'step:error', listener: (step: string, error: Error, context: ETLContext) => void): this;
    on(event: 'pipeline:start', listener: (pipelineId: string, context: ETLContext) => void): this;
    on(event: 'pipeline:complete', listener: (pipelineId: string, result: PipelineResult, context: ETLContext) => void): this;
    on(event: 'pipeline:error', listener: (pipelineId: string, error: Error, context: ETLContext) => void): this;
    on(event: 'data:extracted', listener: (count: number, context: ETLContext) => void): this;
    on(event: 'data:transformed', listener: (count: number, context: ETLContext) => void): this;
    on(event: 'data:loaded', listener: (count: number, context: ETLContext) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    off(event: 'progress', listener: (progress: ETLProgress) => void): this;
    off(event: 'step:start', listener: (step: string, context: ETLContext) => void): this;
    off(event: 'step:complete', listener: (step: string, result: ETLResult, context: ETLContext) => void): this;
    off(event: 'step:error', listener: (step: string, error: Error, context: ETLContext) => void): this;
    off(event: 'pipeline:start', listener: (pipelineId: string, context: ETLContext) => void): this;
    off(event: 'pipeline:complete', listener: (pipelineId: string, result: PipelineResult, context: ETLContext) => void): this;
    off(event: 'pipeline:error', listener: (pipelineId: string, error: Error, context: ETLContext) => void): this;
    off(event: 'data:extracted', listener: (count: number, context: ETLContext) => void): this;
    off(event: 'data:transformed', listener: (count: number, context: ETLContext) => void): this;
    off(event: 'data:loaded', listener: (count: number, context: ETLContext) => void): this;
    off(event: string | symbol, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }
} 