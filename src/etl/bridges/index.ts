import type { ETLComponent, ETLContext, ETLResult } from '../core/index.js';

export interface BridgeRule {
    name: string;
    from: string;
    transform?: (value: any) => any;
}

export interface BridgeTransformation {
    source: string;
    target: string;
    rules: BridgeRule[];
}

export interface Bridge {
    id: string;
    version: string;
    source: string;
    target: string;
    mappings: Record<string, string>;
    transformations: Record<string, BridgeTransformation>;
    metadata: {
        efficiency: number;
        confidence: number;
        lastUpdated: Date;
    };
}

export interface BridgeRegistry {
    register(bridge: Bridge): void;
    getBridge(source: string, target: string): Bridge | undefined;
    getBridges(): Bridge[];
    validate(bridge: Bridge): boolean;
}

export class DefaultBridgeRegistry implements BridgeRegistry {
    private readonly bridges: Map<string, Bridge> = new Map();

    private getBridgeKey(source: string, target: string): string {
        return `${source}:${target}`;
    }

    register(bridge: Bridge): void {
        const key = this.getBridgeKey(bridge.source, bridge.target);
        this.bridges.set(key, bridge);
    }

    getBridge(source: string, target: string): Bridge | undefined {
        const key = this.getBridgeKey(source, target);
        return this.bridges.get(key);
    }

    getBridges(): Bridge[] {
        return Array.from(this.bridges.values());
    }

    validate(bridge: Bridge): boolean {
        // Basic validation
        if (!bridge.id || !bridge.version || !bridge.source || !bridge.target) {
            return false;
        }

        // Validate mappings
        if (!bridge.mappings || typeof bridge.mappings !== 'object') {
            return false;
        }

        // Validate transformations
        if (!bridge.transformations || typeof bridge.transformations !== 'object') {
            return false;
        }

        // Validate metadata
        if (!bridge.metadata || 
            typeof bridge.metadata.efficiency !== 'number' ||
            typeof bridge.metadata.confidence !== 'number' ||
            !(bridge.metadata.lastUpdated instanceof Date)) {
            return false;
        }

        return true;
    }
}

export class BridgeComponent implements ETLComponent {
    constructor(
        private readonly bridge: Bridge,
        private readonly registry: BridgeRegistry
    ) {
        this.id = bridge.id;
        this.version = bridge.version;
    }

    public readonly id: string;
    public readonly version: string;

    async validate(_context: ETLContext): Promise<boolean> {
        return this.registry.validate(this.bridge);
    }

    async execute(context: ETLContext): Promise<ETLResult> {
        const startTime = Date.now();
        const processed = 0;
        const succeeded = 0;
        const failed = 0;

        try {
            const transformedData = await this.transformData(context.data);
            
            return {
                data: transformedData,
                metadata: {
                    timestamp: new Date(),
                    duration: Date.now() - startTime,
                    source: this.bridge.source,
                    target: this.bridge.target,
                    stats: {
                        processed,
                        succeeded,
                        failed
                    }
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Bridge transformation failed: ${errorMessage}`);
        }
    }

    private async transformData(data: any): Promise<any> {
        // Apply transformations on original data
        const transformationResult = this.applyTransformations(data);

        // Apply mappings on original data
        const mappingResult = this.applyMappings(data);

        // Merge both results (transformations take precedence)
        return this.deepMerge(mappingResult, transformationResult);
    }

    private applyMappings(data: any): any {
        const result: any = {};

        for (const [sourcePath, targetPath] of Object.entries(this.bridge.mappings)) {
            const value = this.getNestedValue(data, sourcePath);
            this.setNestedValue(result, targetPath, value);
        }

        return result;
    }

    private applyTransformations(data: any): any {
        const result: any = {};

        for (const [_key, transformation] of Object.entries(this.bridge.transformations)) {
            const sourceValue = this.getNestedValue(data, transformation.source);

            if (sourceValue !== undefined) {
                let transformedValue = sourceValue;

                for (const rule of transformation.rules) {
                    if (rule.transform) {
                        transformedValue = rule.transform(transformedValue);
                    }
                }

                this.setNestedValue(result, transformation.target, transformedValue);
            }
        }

        return result;
    }

    private deepMerge(target: any, source: any): any {
        const result = { ...target };

        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, key) => {
            current[key] = current[key] || {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
} 