/**
 * LLM - Types for LLM integration and real-time communication
 * 
 * @package     @imajin/cli
 * @subpackage  types
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-08
 * @updated      2025-06-18
 *
 * @see        docs/llm-integration.md
 * 
 * Integration Points:
 * - Real-time progress callbacks
 * - LLM introspection interfaces
 * - Command discovery and execution
 * - JSON API responses for AI parsing
 */

// Progress callback for real-time LLM interaction
export type LLMProgressCallback = (event: LLMProgressEvent) => void;

export interface LLMProgressEvent {
    type: 'start' | 'progress' | 'complete' | 'error';
    message: string;
    progress?: number; // 0-100
    data?: any;
    timestamp: Date;
}

// Command introspection for LLM discovery
export interface CommandIntrospection {
    name: string;
    description: string;
    usage: string;
    arguments: ArgumentInfo[];
    options: OptionInfo[];
    examples: string[];
    service: string;
}

export interface ArgumentInfo {
    name: string;
    description: string;
    required: boolean;
    type: 'string' | 'number' | 'boolean';
    choices?: string[];
}

export interface OptionInfo {
    name: string;
    short?: string;
    description: string;
    type: 'string' | 'number' | 'boolean';
    default?: any;
    choices?: string[];
}

// Service introspection for LLM discovery
export interface ServiceIntrospection {
    name: string;
    description: string;
    version: string;
    commands: CommandIntrospection[];
    capabilities: string[];
    realTimeSupported: boolean;
    authentication: {
        required: boolean;
        type?: 'api-key' | 'oauth' | 'basic';
        instructions?: string;
    };
}

// JSON API response format for LLM parsing
export interface LLMResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
    service: string;
    command: string;
    executionTime: number;
}

// Real-time event types
export interface RealTimeEvent {
    id: string;
    type: string;
    service: string;
    data: any;
    timestamp: Date;
}

// WebSocket message format
export interface WebSocketMessage {
    type: 'command' | 'response' | 'event' | 'error';
    payload: any;
    correlationId?: string;
} 