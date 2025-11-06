/**
 * OpenAPIParser - Parse OpenAPI specifications and extract plugin metadata
 * 
 * @package     @imajin/cli
 * @subpackage  generators
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - OpenAPI v3.x specification parsing
 * - Command definition extraction
 * - TypeScript model generation
 * - Authentication configuration detection
 */

import type {
    AuthConfig,
    CommandDefinition,
    ModelDefinition,
    OpenAPIParser,
    ParameterDefinition,
    ParsedOpenAPI,
    PropertyDefinition,
    RequestBodyDefinition,
    ResponseDefinition,
    ValidationResult
} from './types.js';

// Simplified OpenAPI types to avoid complex imports
interface OpenAPIOperation {
    operationId?: string;
    summary?: string;
    description?: string;
    parameters?: any[];
    requestBody?: any;
    responses: Record<string, any>;
    security?: any[];
}

interface OpenAPIPathItem {
    get?: OpenAPIOperation;
    post?: OpenAPIOperation;
    put?: OpenAPIOperation;
    delete?: OpenAPIOperation;
    patch?: OpenAPIOperation;
    parameters?: any[];
}

interface OpenAPISchema {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
    description?: string;
    format?: string;
    example?: any;
    enum?: any[];
}

interface OpenAPISecurityScheme {
    type: string;
    scheme?: string;
    name?: string;
    in?: string;
    bearerFormat?: string;
    flows?: any;
}

export class DefaultOpenAPIParser implements OpenAPIParser {
    /**
     * Parse OpenAPI specification
     */
    async parse(spec: any): Promise<ParsedOpenAPI> {
        const validation = this.validateSpec(spec);
        if (!validation.isValid) {
            throw new Error(`Invalid OpenAPI spec: ${validation.errors.join(', ')}`);
        }

        const authConfig = this.extractAuthConfig(spec);
        const result: ParsedOpenAPI = {
            info: {
                title: spec.info?.title || 'Unknown API',
                version: spec.info?.version || '1.0.0',
                description: spec.info?.description
            },
            baseUrl: this.extractBaseUrl(spec),
            commands: this.extractCommands(spec),
            models: this.extractModels(spec)
        };

        if (authConfig) {
            result.authConfig = authConfig;
        }

        return result;
    }

    /**
     * Validate OpenAPI specification
     */
    validateSpec(spec: any): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!spec.info) {
            errors.push('Missing info section');
        } else {
            if (!spec.info.title) {
                errors.push('Missing info.title');
            }
            if (!spec.info.version) {
                errors.push('Missing info.version');
            }
        }

        if (!spec.paths || Object.keys(spec.paths).length === 0) {
            errors.push('No paths defined');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Extract commands from OpenAPI paths
     */
    extractCommands(spec: any): CommandDefinition[] {
        const commands: CommandDefinition[] = [];

        if (!spec.paths) {
            return commands;
        }

        for (const [path, pathItem] of Object.entries(spec.paths)) {
            if (!pathItem || typeof pathItem !== 'object') {
continue;
}

            const pathObj = pathItem as OpenAPIPathItem;

            // Handle each HTTP method
            if (pathObj.get) {
                commands.push(this.createCommand('GET', path, pathObj.get, pathObj, spec));
            }
            if (pathObj.post) {
                commands.push(this.createCommand('POST', path, pathObj.post, pathObj, spec));
            }
            if (pathObj.put) {
                commands.push(this.createCommand('PUT', path, pathObj.put, pathObj, spec));
            }
            if (pathObj.delete) {
                commands.push(this.createCommand('DELETE', path, pathObj.delete, pathObj, spec));
            }
            if (pathObj.patch) {
                commands.push(this.createCommand('PATCH', path, pathObj.patch, pathObj, spec));
            }
        }

        return commands;
    }

    /**
     * Create a command definition from an operation
     */
    private createCommand(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: string,
        operation: OpenAPIOperation,
        pathItem: OpenAPIPathItem,
        spec: any
    ): CommandDefinition {
        const commandName = this.generateCommandName(operation.operationId, method.toLowerCase(), path);
        const requestBody = this.extractRequestBody(operation.requestBody);

        const command: CommandDefinition = {
            name: commandName,
            description: operation.summary || operation.description || `${method} ${path}`,
            method,
            path,
            parameters: this.extractParameters(operation.parameters, pathItem.parameters),
            responses: this.extractResponses(operation.responses),
            requiresAuth: this.operationRequiresAuth(operation, spec)
        };

        if (requestBody) {
            command.requestBody = requestBody;
        }

        return command;
    }

    /**
     * Extract models from OpenAPI components
     */
    extractModels(spec: any): ModelDefinition[] {
        const models: ModelDefinition[] = [];

        if (!spec.components?.schemas) {
            return models;
        }

        for (const [name, schema] of Object.entries(spec.components.schemas)) {
            if (!schema || typeof schema !== 'object') {
continue;
}

            const schemaObj = schema as OpenAPISchema;
            if (schemaObj.type === 'object' || schemaObj.properties) {
                const model: ModelDefinition = {
                    name: this.pascalCase(name),
                    properties: this.extractProperties(schemaObj.properties || {}),
                    required: schemaObj.required || []
                };

                if (schemaObj.description) {
                    model.description = schemaObj.description;
                }

                models.push(model);
            }
        }

        return models;
    }

    /**
     * Extract authentication configuration
     */
    extractAuthConfig(spec: any): AuthConfig | undefined {
        if (!spec.components?.securitySchemes) {
            return undefined;
        }

        // Use the first security scheme found
        const schemes = Object.entries(spec.components.securitySchemes);
        if (schemes.length === 0) {
            return undefined;
        }

        const firstScheme = schemes[0];
        if (!firstScheme) {
            return undefined;
        }

        const [, scheme] = firstScheme;
        if (!scheme || typeof scheme !== 'object') {
            return undefined;
        }

        const schemeObj = scheme as OpenAPISecurityScheme;

        switch (schemeObj.type) {
            case 'apiKey':
                return {
                    type: 'api-key',
                    apiKeyHeader: schemeObj.in === 'header' ? schemeObj.name : undefined,
                    apiKeyQuery: schemeObj.in === 'query' ? schemeObj.name : undefined
                };

            case 'http':
                if (schemeObj.scheme === 'bearer') {
                    return {
                        type: 'bearer',
                        bearerFormat: schemeObj.bearerFormat
                    };
                } else if (schemeObj.scheme === 'basic') {
                    return {
                        type: 'basic'
                    };
                }
                break;

            case 'oauth2':
                return {
                    type: 'oauth2',
                    oauth2Flows: this.extractOAuth2Flows(schemeObj.flows)
                };
        }

        return undefined;
    }

    /**
     * Extract base URL from servers
     */
    private extractBaseUrl(spec: any): string {
        if (spec.servers && Array.isArray(spec.servers) && spec.servers.length > 0) {
            return spec.servers[0].url || 'https://api.example.com';
        }
        return 'https://api.example.com';
    }

    /**
     * Generate command name from operation
     */
    private generateCommandName(operationId?: string, method?: string, path?: string): string {
        if (operationId) {
            return this.camelCase(operationId);
        }

        // Generate from method and path
        const pathParts = path?.split('/').filter(part => part && !part.startsWith('{')) || [];
        const methodPart = method || 'action';

        return this.camelCase([methodPart, ...pathParts].join('-'));
    }

    /**
     * Extract parameters from operation
     */
    private extractParameters(
        operationParams?: any[],
        pathParams?: any[]
    ): ParameterDefinition[] {
        const parameters: ParameterDefinition[] = [];
        const allParams = [...(pathParams || []), ...(operationParams || [])];

        for (const param of allParams) {
            if (!param || typeof param !== 'object' || param.$ref) {
continue;
}

            const enumValues = this.extractEnum(param.schema);

            const parameter: ParameterDefinition = {
                name: param.name || 'unknown',
                type: this.mapSchemaType(param.schema),
                required: param.required || false,
                description: param.description,
                example: param.example
            };

            if (enumValues) {
                parameter.enum = enumValues;
            }

            parameters.push(parameter);
        }

        return parameters;
    }

    /**
     * Extract request body
     */
    private extractRequestBody(requestBody?: any): RequestBodyDefinition | undefined {
        if (!requestBody || typeof requestBody !== 'object' || requestBody.$ref) {
            return undefined;
        }

        const content = requestBody.content;
        if (!content || typeof content !== 'object') {
            return undefined;
        }

        const contentTypes = Object.keys(content);
        if (contentTypes.length === 0) {
            return undefined;
        }

        const contentType = contentTypes[0];
        if (!contentType) {
            return undefined;
        }

        const mediaType = content[contentType];
        return {
            required: requestBody.required || false,
            contentType,
            schema: mediaType?.schema
        };
    }

    /**
     * Extract responses
     */
    private extractResponses(responses: Record<string, any>): ResponseDefinition[] {
        const responseList: ResponseDefinition[] = [];

        for (const [statusCode, response] of Object.entries(responses)) {
            if (!response || typeof response !== 'object' || response.$ref) {
continue;
}

            responseList.push({
                statusCode: parseInt(statusCode, 10) || 200,
                description: response.description || 'Response',
                schema: this.extractResponseSchema(response.content)
            });
        }

        return responseList;
    }

    /**
     * Extract properties from schema
     */
    private extractProperties(properties: Record<string, any>): PropertyDefinition[] {
        const props: PropertyDefinition[] = [];

        for (const [name, schema] of Object.entries(properties)) {
            if (!schema || typeof schema !== 'object' || schema.$ref) {
continue;
}

            props.push({
                name,
                type: this.mapSchemaType(schema),
                description: schema.description,
                required: false, // Will be set by parent
                format: schema.format,
                example: schema.example
            });
        }

        return props;
    }

    /**
     * Check if operation requires authentication
     */
    private operationRequiresAuth(operation: OpenAPIOperation, spec: any): boolean {
        // Check operation-level security
        if (operation.security && Array.isArray(operation.security)) {
            return operation.security.length > 0;
        }

        // Check global security
        if (spec.security && Array.isArray(spec.security)) {
            return spec.security.length > 0;
        }

        return false;
    }

    /**
     * Extract OAuth2 flows
     */
    private extractOAuth2Flows(flows: any): any[] {
        const flowList: any[] = [];

        if (!flows || typeof flows !== 'object') {
            return flowList;
        }

        if (flows.authorizationCode) {
            flowList.push({
                type: 'authorization_code',
                authorizationUrl: flows.authorizationCode.authorizationUrl,
                tokenUrl: flows.authorizationCode.tokenUrl,
                scopes: flows.authorizationCode.scopes || {}
            });
        }

        if (flows.clientCredentials) {
            flowList.push({
                type: 'client_credentials',
                tokenUrl: flows.clientCredentials.tokenUrl,
                scopes: flows.clientCredentials.scopes || {}
            });
        }

        return flowList;
    }

    /**
     * Extract response schema
     */
    private extractResponseSchema(content?: Record<string, any>): any {
        if (!content || typeof content !== 'object') {
return undefined;
}

        const contentTypes = Object.keys(content);
        if (contentTypes.length === 0) {
return undefined;
}

        const contentType = contentTypes[0];
        if (!contentType) {
            return undefined;
        }

        const mediaType = content[contentType];
        return mediaType?.schema;
    }

    /**
     * Map OpenAPI schema type to TypeScript type
     */
    private mapSchemaType(schema?: any): 'string' | 'number' | 'boolean' | 'array' | 'object' {
        if (!schema || typeof schema !== 'object' || schema.$ref) {
            return 'object';
        }

        switch (schema.type) {
            case 'string':
                return 'string';
            case 'number':
            case 'integer':
                return 'number';
            case 'boolean':
                return 'boolean';
            case 'array':
                return 'array';
            case 'object':
                return 'object';
            default:
                return 'object';
        }
    }

    /**
     * Extract enum values
     */
    private extractEnum(schema?: any): string[] | undefined {
        if (!schema || typeof schema !== 'object' || schema.$ref) {
            return undefined;
        }

        if (schema.enum && Array.isArray(schema.enum)) {
            return schema.enum.map(String);
        }

        return undefined;
    }

    /**
     * Convert string to camelCase
     */
    private camelCase(str: string): string {
        return str
            .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^[A-Z]/, c => c.toLowerCase());
    }

    /**
     * Convert string to PascalCase
     */
    private pascalCase(str: string): string {
        const camelCased = this.camelCase(str);
        return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
    }
} 