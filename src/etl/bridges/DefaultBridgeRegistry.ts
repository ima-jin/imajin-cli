/**
 * DefaultBridgeRegistry - Registry for ETL bridge components
 * 
 * @package     @imajin/cli
 * @subpackage  etl/bridges
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 */

import { EventEmitter } from 'node:events';
import type { Bridge, BridgeRegistry } from './index.js';

export class DefaultBridgeRegistry extends EventEmitter implements BridgeRegistry {
    private readonly bridges: Map<string, Bridge> = new Map();

    constructor() {
        super();
    }

    public initialize(): void {
        // Initialize registry
    }

    public register(bridge: Bridge): void {
        this.bridges.set(bridge.id, bridge);
        this.emit('etl.bridge.registered', bridge);
    }

    public getBridge(source: string, target: string): Bridge | undefined {
        const key = `${source}:${target}`;
        return Array.from(this.bridges.values()).find(bridge => 
            `${bridge.source}:${bridge.target}` === key
        );
    }

    public getBridges(): Bridge[] {
        return Array.from(this.bridges.values());
    }

    public validate(bridge: Bridge): boolean {
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

    public get(id: string): Bridge | undefined {
        return this.bridges.get(id);
    }

    public getAll(): Bridge[] {
        return Array.from(this.bridges.values());
    }
} 