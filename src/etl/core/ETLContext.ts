import { EventEmitter } from 'node:events';
import { ETLContext as IETLContext } from './interfaces.js';

export class ETLContext implements IETLContext {
    readonly id: string;
    readonly pipelineId: string;
    readonly metadata: Record<string, any>;
    readonly startTime: Date;
    readonly events: EventEmitter;

    constructor(pipelineId: string, metadata: Record<string, any> = {}) {
        this.id = crypto.randomUUID();
        this.pipelineId = pipelineId;
        this.metadata = metadata;
        this.startTime = new Date();
        this.events = new EventEmitter();
    }

    setMetadata(key: string, value: any): void {
        this.metadata[key] = value;
    }

    getMetadata(key: string): any {
        return this.metadata[key];
    }

    on(event: string, listener: (...args: any[]) => void): void {
        this.events.on(event, listener);
    }

    off(event: string, listener: (...args: any[]) => void): void {
        this.events.off(event, listener);
    }
} 