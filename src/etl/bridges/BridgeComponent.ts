/**
 * BridgeComponent - Base class for ETL bridge components
 * 
 * @package     @imajin/cli
 * @subpackage  etl/bridges
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 */

export interface Bridge {
    id: string;
    name: string;
    description: string;
    version: string;
}

export class BridgeComponent {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;
    public readonly version: string;

    constructor(bridge: Bridge) {
        this.id = bridge.id;
        this.name = bridge.name;
        this.description = bridge.description;
        this.version = bridge.version;
    }
} 