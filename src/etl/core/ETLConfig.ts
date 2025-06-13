import { ETLConfig as IETLConfig } from './interfaces.js';

export class ETLConfig implements IETLConfig {
    readonly batchSize?: number;
    readonly maxRetries?: number;
    readonly timeout?: number;
    readonly parallel?: boolean;
    readonly maxConcurrency?: number;
    readonly validateInput?: boolean;
    readonly validateOutput?: boolean;

    constructor(config: Partial<IETLConfig> = {}) {
        this.batchSize = config.batchSize ?? 100;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeout = config.timeout ?? 30000;
        this.parallel = config.parallel ?? false;
        this.maxConcurrency = config.maxConcurrency ?? 1;
        this.validateInput = config.validateInput ?? true;
        this.validateOutput = config.validateOutput ?? true;
    }

    static create(config: Partial<IETLConfig> = {}): ETLConfig {
        return new ETLConfig(config);
    }
} 