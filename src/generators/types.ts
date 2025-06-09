/**
 * Plugin Generator Types - Core types and interfaces for plugin generation
 * 
 * @package     @imajin/cli
 * @subpackage  generators
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - OpenAPI specification parsing
 * - Command Pattern framework integration
 * - Credential Management system integration
 * - Plugin loading and management
 */

/**
 * OpenAPI specification type (simplified)
 */
export type OpenAPISpec = any;

/**
 * Validation result for OpenAPI specs
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Command definition for generated plugins
 */
export interface CommandDefinition {
    name: string;
    description: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    parameters: ParameterDefinition[];
    requestBody?: RequestBodyDefinition;
    responses: ResponseDefinition[];
    requiresAuth: boolean;
}

/**
 * Parameter definition
 */
export interface ParameterDefinition {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description?: string;
    example?: any;
    enum?: string[];
}

/**
 * Request body definition
 */
export interface RequestBodyDefinition {
    required: boolean;
    contentType: string;
    schema: any;
}

/**
 * Response definition
 */
export interface ResponseDefinition {
    statusCode: number;
    description: string;
    schema?: any;
}

/**
 * Generated plugin file
 */
export interface PluginFile {
    path: string;
    content: string;
    type: 'command' | 'model' | 'service' | 'config';
}

/**
 * Generated plugin structure
 */
export interface GeneratedPlugin {
    name: string;
    version: string;
    description: string;
    baseUrl: string;
    commands: CommandDefinition[];
    authType: 'api-key' | 'oauth2' | 'bearer' | 'basic' | 'none';
    authConfig?: AuthConfig;
    files: PluginFile[];
    models: ModelDefinition[];
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
    type: 'api-key' | 'oauth2' | 'bearer' | 'basic';
    apiKeyHeader?: string | undefined;
    apiKeyQuery?: string | undefined;
    oauth2Flows?: OAuth2FlowConfig[] | undefined;
    bearerFormat?: string | undefined;
}

/**
 * OAuth2 flow configuration
 */
export interface OAuth2FlowConfig {
    type: 'authorization_code' | 'client_credentials' | 'implicit' | 'password';
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes: Record<string, string>;
}

/**
 * Model definition for TypeScript interfaces
 */
export interface ModelDefinition {
    name: string;
    description?: string;
    properties: PropertyDefinition[];
    required: string[];
}

/**
 * Property definition for models
 */
export interface PropertyDefinition {
    name: string;
    type: string;
    description?: string;
    required: boolean;
    format?: string;
    example?: any;
}

/**
 * Plugin Generator interface
 */
export interface PluginGenerator {
    generateFromOpenAPI(spec: OpenAPISpec): Promise<GeneratedPlugin>;
    validateSpec(spec: OpenAPISpec): ValidationResult;
    createPluginFiles(plugin: GeneratedPlugin): Promise<string[]>;
}

/**
 * OpenAPI Parser interface
 */
export interface OpenAPIParser {
    parse(spec: OpenAPISpec): Promise<ParsedOpenAPI>;
    extractCommands(spec: OpenAPISpec): CommandDefinition[];
    extractModels(spec: OpenAPISpec): ModelDefinition[];
    extractAuthConfig(spec: OpenAPISpec): AuthConfig | undefined;
}

/**
 * Parsed OpenAPI result
 */
export interface ParsedOpenAPI {
    info: {
        title: string;
        version: string;
        description?: string;
    };
    baseUrl: string;
    commands: CommandDefinition[];
    models: ModelDefinition[];
    authConfig?: AuthConfig;
}

/**
 * Template context for code generation
 */
export interface TemplateContext {
    pluginName: string;
    pluginDescription: string;
    baseUrl: string;
    commands: CommandDefinition[];
    models: ModelDefinition[];
    authConfig?: AuthConfig;
    imports: string[];
    currentDate: string;
    utils?: {
        pascalCase?: (str: string) => string;
        camelCase?: (str: string) => string;
        kebabCase?: (str: string) => string;
    };
} 