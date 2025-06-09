/**
 * TemplateEngine Tests - Comprehensive tests for enhanced template engine
 * 
 * @package     @imajin/cli
 * @subpackage  generators/__tests__
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { TemplateEngine } from '../templates/TemplateEngine.js';
import type { TemplateContext } from '../types.js';

describe('TemplateEngine', () => {
    let engine: TemplateEngine;
    let context: TemplateContext;

    beforeEach(() => {
        engine = new TemplateEngine();
        context = {
            pluginName: 'TestPlugin',
            pluginDescription: 'A test plugin',
            baseUrl: 'https://api.example.com',
            commands: [
                {
                    name: 'testCommand',
                    description: 'Test command',
                    method: 'GET',
                    path: '/test',
                    parameters: [],
                    responses: [],
                    requiresAuth: false
                }
            ],
            models: [],
            imports: [],
            currentDate: '2025-01-01',
            utils: {
                pascalCase: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
                camelCase: (str: string) => str.charAt(0).toLowerCase() + str.slice(1),
                kebabCase: (str: string) => str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
            }
        };
    });

    describe('Basic Variable Replacement', () => {
        it('should replace simple variables', () => {
            const template = 'Hello {{pluginName}}!';
            const result = engine.render(template, context);
            expect(result).toBe('Hello TestPlugin!');
        });

        it('should handle missing variables gracefully', () => {
            const template = 'Hello {{missingVar}}!';
            const result = engine.render(template, context);
            expect(result).toBe('Hello {{missingVar}}!');
        });

        it('should replace multiple variables', () => {
            const template = '{{pluginName}} - {{pluginDescription}}';
            const result = engine.render(template, context);
            expect(result).toBe('TestPlugin - A test plugin');
        });
    });

    describe('JavaScript Expression Evaluation', () => {
        it('should evaluate date expressions', () => {
            const template = 'Date: {{new Date().toISOString().split(\'T\')[0]}}';
            const result = engine.render(template, context);
            const today = new Date().toISOString().split('T')[0];
            expect(result).toBe(`Date: ${today}`);
        });

        it('should evaluate utility function calls', () => {
            const template = 'Pascal: {{utils.pascalCase(\'test-name\')}}';
            const result = engine.render(template, context);
            expect(result).toBe('Pascal: Test-name');
        });

        it('should handle invalid expressions gracefully', () => {
            const template = 'Invalid: {{invalid.expression()}}';
            const result = engine.render(template, context);
            expect(result).toBe('Invalid: {{invalid.expression()}}');
        });
    });

    describe('Nested Property Access', () => {
        it('should handle this.property access', () => {
            const template = 'Command: {{this.name}}';
            const contextWithThis = { ...context, this: { name: 'testCommand' } };
            const result = engine.render(template, contextWithThis);
            expect(result).toBe('Command: testCommand');
        });

        it('should handle object.property access', () => {
            const template = 'Auth: {{authConfig.type}}';
            const contextWithAuth = { ...context, authConfig: { type: 'bearer' as const } };
            const result = engine.render(template, contextWithAuth);
            expect(result).toBe('Auth: bearer');
        });
    });

    describe('Conditional Blocks', () => {
        it('should render if blocks when condition is true', () => {
            const template = '{{#if pluginName}}Plugin exists{{/if}}';
            const result = engine.render(template, context);
            expect(result).toBe('Plugin exists');
        });

        it('should not render if blocks when condition is false', () => {
            const template = '{{#if missingVar}}Should not show{{/if}}';
            const result = engine.render(template, context);
            expect(result).toBe('');
        });

        it('should render unless blocks when condition is false', () => {
            const template = '{{#unless missingVar}}Should show{{/unless}}';
            const result = engine.render(template, context);
            expect(result).toBe('Should show');
        });

        it('should handle nested property conditions', () => {
            const template = '{{#if authConfig.type}}Has auth{{/if}}';
            const contextWithAuth = { ...context, authConfig: { type: 'bearer' as const } };
            const result = engine.render(template, contextWithAuth);
            expect(result).toBe('Has auth');
        });
    });

    describe('Loop Processing', () => {
        it('should process simple loops', () => {
            const template = '{{#each commands}}{{this.name}} {{/each}}';
            const result = engine.render(template, context);
            expect(result).toBe('testCommand ');
        });

        it('should provide loop context variables', () => {
            const template = '{{#each commands}}{{@index}}: {{this.name}}{{#unless @last}}, {{/unless}}{{/each}}';
            const contextWithMultiple = {
                ...context,
                commands: [
                    { name: 'cmd1', description: 'Command 1', method: 'GET' as const, path: '/cmd1', parameters: [], responses: [], requiresAuth: false },
                    { name: 'cmd2', description: 'Command 2', method: 'POST' as const, path: '/cmd2', parameters: [], responses: [], requiresAuth: false }
                ]
            };
            const result = engine.render(template, contextWithMultiple);
            expect(result).toBe('0: cmd1, 1: cmd2');
        });

        it('should handle empty arrays', () => {
            const template = '{{#each emptyArray}}Should not show{{/each}}';
            const result = engine.render(template, context);
            expect(result).toBe('');
        });
    });

    describe('Complex Template Scenarios', () => {
        it('should handle nested conditionals and loops', () => {
            const template = `
{{#each commands}}
{{#if this.requiresAuth}}
Auth required for {{this.name}}
{{/if}}
{{/each}}`.trim();

            const contextWithAuth = {
                ...context,
                commands: [
                    { name: 'publicCmd', description: 'Public', method: 'GET' as const, path: '/public', parameters: [], responses: [], requiresAuth: false },
                    { name: 'privateCmd', description: 'Private', method: 'GET' as const, path: '/private', parameters: [], responses: [], requiresAuth: true }
                ]
            };

            const result = engine.render(template, contextWithAuth);
            expect(result.trim()).toBe('Auth required for privateCmd');
        });

        it('should handle complex command template structure', () => {
            const template = `
export class {{this.name}}Command {
    public readonly name = '{{pluginName}}:{{this.name}}';
    {{#if this.parameters}}
    // Parameters: {{#each this.parameters}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}
    {{/if}}
}`.trim();

            const contextWithParams = {
                ...context,
                this: {
                    name: 'CreateUser',
                    parameters: [
                        { name: 'username', type: 'string', required: true },
                        { name: 'email', type: 'string', required: true }
                    ]
                }
            };

            const result = engine.render(template, contextWithParams);
            expect(result).toContain('export class CreateUserCommand');
            expect(result).toContain('name = \'TestPlugin:CreateUser\'');
            expect(result).toContain('// Parameters: username, email');
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed templates gracefully', () => {
            const template = '{{#if unclosed condition';
            const result = engine.render(template, context);
            expect(result).toBe(template); // Should return original if malformed
        });

        it('should handle circular references safely', () => {
            const circularContext = { ...context };
            (circularContext as any).self = circularContext;

            const template = 'Safe: {{pluginName}}';
            const result = engine.render(template, circularContext);
            expect(result).toBe('Safe: TestPlugin');
        });
    });

    describe('Static Methods', () => {
        it('should create engine from string', () => {
            const newEngine = TemplateEngine.fromString('test template');
            expect(newEngine).toBeInstanceOf(TemplateEngine);
        });
    });
}); 