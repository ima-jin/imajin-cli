/**
 * PluginGenerator Integration Tests - End-to-end tests for enhanced plugin generation
 * 
 * @package     @imajin/cli
 * @subpackage  generators/__tests__
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { DefaultOpenAPIParser } from '../OpenAPIParser.js';
import { DefaultPluginGenerator } from '../PluginGenerator.js';
import { TemplateEngine } from '../templates/TemplateEngine.js';

describe('PluginGenerator Integration', () => {
    let generator: DefaultPluginGenerator;
    let mockOpenAPISpec: any;

    beforeEach(() => {
        const parser = new DefaultOpenAPIParser();
        const templateEngine = new TemplateEngine();
        generator = new DefaultPluginGenerator(parser, templateEngine);

        // Mock OpenAPI specification
        mockOpenAPISpec = {
            openapi: '3.0.0',
            info: {
                title: 'Test API',
                version: '1.0.0',
                description: 'A test API for plugin generation'
            },
            servers: [
                {
                    url: 'https://api.test.com/v1'
                }
            ],
            paths: {
                '/users': {
                    get: {
                        summary: 'List users',
                        operationId: 'listUsers',
                        parameters: [
                            {
                                name: 'limit',
                                in: 'query',
                                schema: { type: 'integer' },
                                required: false
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'array',
                                            items: { $ref: '#/components/schemas/User' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    post: {
                        summary: 'Create user',
                        operationId: 'createUser',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/CreateUserRequest' }
                                }
                            }
                        },
                        responses: {
                            '201': {
                                description: 'Created',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/User' }
                                    }
                                }
                            }
                        }
                    }
                },
                '/users/{id}': {
                    get: {
                        summary: 'Get user by ID',
                        operationId: 'getUserById',
                        parameters: [
                            {
                                name: 'id',
                                in: 'path',
                                required: true,
                                schema: { type: 'string' }
                            }
                        ],
                        responses: {
                            '200': {
                                description: 'Success',
                                content: {
                                    'application/json': {
                                        schema: { $ref: '#/components/schemas/User' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            components: {
                schemas: {
                    User: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            email: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' }
                        },
                        required: ['id', 'username', 'email']
                    },
                    CreateUserRequest: {
                        type: 'object',
                        properties: {
                            username: { type: 'string' },
                            email: { type: 'string' },
                            password: { type: 'string' }
                        },
                        required: ['username', 'email', 'password']
                    }
                },
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            security: [
                {
                    bearerAuth: []
                }
            ]
        };
    });

    describe('Complete Plugin Generation Workflow', () => {
        it('should generate a complete plugin from OpenAPI spec', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            // Validate plugin structure
            expect(plugin.name).toBe('test-api');
            expect(plugin.version).toBe('1.0.0');
            expect(plugin.description).toBe('A test API for plugin generation');
            expect(plugin.baseUrl).toBe('https://api.test.com/v1');
            expect(plugin.authType).toBe('bearer');

            // Validate commands
            expect(plugin.commands).toHaveLength(3);
            expect(plugin.commands.map(cmd => cmd.name)).toEqual(['listUsers', 'createUser', 'getUserById']);

            // Validate models
            expect(plugin.models).toHaveLength(2);
            expect(plugin.models.map(model => model.name)).toEqual(['User', 'CreateUserRequest']);

            // Validate files
            expect(plugin.files).toHaveLength(8); // service + 3 commands + 2 models + config + index
        });

        it('should generate valid TypeScript command files', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const commandFile = plugin.files.find(f => f.path.includes('ListUsersCommand.ts'));
            expect(commandFile).toBeDefined();
            expect(commandFile!.content).toContain('export class ListUsersCommand extends BaseCommand');
            expect(commandFile!.content).toContain('public readonly name = \'TestApi:listUsers\'');
            expect(commandFile!.content).toContain('import type { CommandResult }');
            expect(commandFile!.content).toContain('validateAndConvertParameter');
        });

        it('should generate enhanced service file with proper error handling', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const serviceFile = plugin.files.find(f => f.path.includes('Service.ts'));
            expect(serviceFile).toBeDefined();
            expect(serviceFile!.content).toContain('export class TestApiService');
            expect(serviceFile!.content).toContain('private createHttpClient()');
            expect(serviceFile!.content).toContain('private applyAuthentication');
            expect(serviceFile!.content).toContain('private buildRequestConfig');
            expect(serviceFile!.content).toContain('private handleApiError');
            expect(serviceFile!.content).toContain('buildUrlWithPathParams');
        });

        it('should generate model interfaces', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const userModel = plugin.files.find(f => f.path.includes('User.ts'));
            expect(userModel).toBeDefined();
            expect(userModel!.content).toContain('export interface User');
            expect(userModel!.content).toContain('id?: string;');
            expect(userModel!.content).toContain('username?: string;');
            expect(userModel!.content).toContain('email?: string;');
            expect(userModel!.content).toContain('createdAt?: string;');
        });

        it('should generate enhanced plugin configuration', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const configFile = plugin.files.find(f => f.path.includes('Config.ts'));
            expect(configFile).toBeDefined();
            expect(configFile!.content).toContain('export const TestApiConfig');
            expect(configFile!.content).toContain('authType: \'bearer\'');
            expect(configFile!.content).toContain('commands: [');
            expect(configFile!.content).toContain('\'listUsers\'');
            expect(configFile!.content).toContain('\'createUser\'');
            expect(configFile!.content).toContain('\'getUserById\'');
        });

        it('should generate complete index file', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const indexFile = plugin.files.find(f => f.path === 'index.ts');
            expect(indexFile).toBeDefined();
            expect(indexFile!.content).toContain('export { TestApiService }');
            expect(indexFile!.content).toContain('export { ListUsersCommand }');
            expect(indexFile!.content).toContain('export { CreateUserCommand }');
            expect(indexFile!.content).toContain('export { GetUserByIdCommand }');
            expect(indexFile!.content).toContain('export type { User }');
            expect(indexFile!.content).toContain('export type { CreateUserRequest }');
            expect(indexFile!.content).toContain('export { TestApiConfig }');
        });
    });

    describe('Template Context Enhancement', () => {
        it('should provide utility functions in template context', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            // Check that PascalCase conversion worked
            const commandFile = plugin.files.find(f => f.path.includes('ListUsersCommand.ts'));
            expect(commandFile!.content).toContain('export class ListUsersCommand');

            // Check that service uses proper naming
            const serviceFile = plugin.files.find(f => f.path.includes('Service.ts'));
            expect(serviceFile!.content).toContain('export class TestApiService');
        });

        it('should include current date in generated files', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);
            const currentDate = new Date().toISOString().split('T')[0];

            const serviceFile = plugin.files.find(f => f.path.includes('Service.ts'));
            expect(serviceFile!.content).toContain(`@since       ${currentDate}`);
        });
    });

    describe('Error Handling and Validation', () => {
        it('should validate OpenAPI specification', () => {
            const invalidSpec = { invalid: 'spec' };
            const validation = generator.validateSpec(invalidSpec);

            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });

        it('should handle missing authentication gracefully', async () => {
            const specWithoutAuth = { ...mockOpenAPISpec };
            delete specWithoutAuth.security;
            delete specWithoutAuth.components?.securitySchemes;

            const plugin = await generator.generateFromOpenAPI(specWithoutAuth);
            expect(plugin.authType).toBe('none');
        });

        it('should handle complex path parameters', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const getUserCommand = plugin.files.find(f => f.path.includes('GetUserByIdCommand.ts'));
            expect(getUserCommand!.content).toContain('GetUserByIdCommand');
            expect(getUserCommand!.content).toContain('id');
        });
    });

    describe('Authentication Integration', () => {
        it('should generate proper bearer token authentication', async () => {
            const plugin = await generator.generateFromOpenAPI(mockOpenAPISpec);

            const serviceFile = plugin.files.find(f => f.path.includes('Service.ts'));
            expect(serviceFile!.content).toContain('Bearer ${credentials.token}');
            expect(serviceFile!.content).toContain('applyAuthentication');
        });

        it('should handle API key authentication', async () => {
            const apiKeySpec = {
                ...mockOpenAPISpec,
                components: {
                    ...mockOpenAPISpec.components,
                    securitySchemes: {
                        apiKey: {
                            type: 'apiKey',
                            in: 'header',
                            name: 'X-API-Key'
                        }
                    }
                },
                security: [{ apiKey: [] }]
            };

            const plugin = await generator.generateFromOpenAPI(apiKeySpec);
            expect(plugin.authType).toBe('api-key');

            const serviceFile = plugin.files.find(f => f.path.includes('Service.ts'));
            expect(serviceFile!.content).toContain('X-API-Key');
        });
    });
}); 