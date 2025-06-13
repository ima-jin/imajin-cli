/**
 * DefaultBridgeRegistry - Registry for ETL bridge components
 * 
 * @package     @imajin/cli
 * @subpackage  etl/bridges
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import { EventEmitter } from 'events';
import { BridgeComponent } from './BridgeComponent.js';

export class DefaultBridgeRegistry extends EventEmitter {
    private bridges = new Map<string, BridgeComponent>();

    constructor() {
        super();
    }

    public initialize(): void {
        // Initialize registry
    }

    public register(bridge: BridgeComponent): void {
        this.bridges.set(bridge.id, bridge);
        this.emit('etl.bridge.registered', bridge);
    }

    public get(id: string): BridgeComponent | undefined {
        return this.bridges.get(id);
    }

    public getAll(): BridgeComponent[] {
        return Array.from(this.bridges.values());
    }
} 