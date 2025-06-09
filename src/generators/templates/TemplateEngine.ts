/**
 * TemplateEngine - Enhanced template engine for code generation
 * 
 * @package     @imajin/cli
 * @subpackage  generators/templates
 * @author      VETEZE
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Code generation from templates
 * - Variable substitution with enhanced context
 * - JavaScript expression evaluation
 * - Template compilation and rendering
 * - Utility functions in template context
 */

import type { TemplateContext } from '../types.js';

export class TemplateEngine {
    /**
     * Enhanced template rendering with better context support
     */
    render(template: string, context: TemplateContext & { this?: any }): string {
        let result = template;

        // Handle JavaScript expressions in templates (first pass)
        result = this.handleExpressions(result, context);

        // Replace template variables (enhanced)
        result = this.replaceVariables(result, context);

        // Handle conditional blocks (enhanced)
        result = this.handleConditionals(result, context);

        // Handle loops (enhanced with better context)
        result = this.handleLoops(result, context);

        return result;
    }

    /**
     * Handle JavaScript expressions like {{new Date().toISOString().split('T')[0]}}
     */
    private handleExpressions(template: string, context: TemplateContext): string {
        return template.replace(/\{\{([^{}]*(?:new Date\(\)[^{}]*|[^{}]*\([^)]*\))+[^{}]*)\}\}/g, (match, expr) => {
            try {
                // Safe evaluation of simple expressions
                return this.evaluateExpression(expr, context);
            } catch {
                return match; // Return original if evaluation fails
            }
        });
    }

    /**
     * Safely evaluate simple JavaScript expressions
     */
    private evaluateExpression(expr: string, context: TemplateContext): string {
        const trimmedExpr = expr.trim();

        // Handle date expressions
        if (trimmedExpr.includes('new Date()')) {
            if (trimmedExpr === 'new Date().toISOString().split(\'T\')[0]') {
                return new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10);
            }
            if (trimmedExpr === 'new Date().toISOString()') {
                return new Date().toISOString();
            }
            if (trimmedExpr === 'new Date().getFullYear()') {
                return String(new Date().getFullYear());
            }
        }

        // Handle utility function calls
        if (context.utils) {
            const utils = context.utils;
            if (trimmedExpr.startsWith('utils.')) {
                const funcCall = trimmedExpr.substring(6);
                if (funcCall.startsWith('pascalCase(') && funcCall.endsWith(')')) {
                    const arg = funcCall.slice(11, -1).replace(/['"]/g, '');
                    return utils.pascalCase?.(arg) ?? arg;
                }
                if (funcCall.startsWith('camelCase(') && funcCall.endsWith(')')) {
                    const arg = funcCall.slice(10, -1).replace(/['"]/g, '');
                    return utils.camelCase?.(arg) ?? arg;
                }
                if (funcCall.startsWith('kebabCase(') && funcCall.endsWith(')')) {
                    const arg = funcCall.slice(10, -1).replace(/['"]/g, '');
                    return utils.kebabCase?.(arg) ?? arg;
                }
            }
        }

        // If no specific handler, return the original
        throw new Error(`Unsupported expression: ${expr}`);
    }

    /**
     * Replace template variables like {{variableName}} with enhanced nested property support
     */
    private replaceVariables(template: string, context: TemplateContext & { this?: any }): string {
        // Handle simple variables
        template = template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            const value = (context as any)[varName];
            return value !== undefined ? String(value) : match;
        });

        // Handle nested properties like {{this.property}}
        template = template.replace(/\{\{this\.(\w+)\}\}/g, (match, prop) => {
            if (context.this && (context.this as any)[prop] !== undefined) {
                return String((context.this as any)[prop]);
            }
            return match;
        });

        // Handle nested object properties like {{object.property}}
        template = template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, objName, prop) => {
            const obj = (context as any)[objName];
            if (obj && obj[prop] !== undefined) {
                return String(obj[prop]);
            }
            return match;
        });

        return template;
    }

    /**
     * Handle conditional blocks like {{#if condition}}...{{/if}} with enhanced features
     */
    private handleConditionals(template: string, context: TemplateContext & { this?: any }): string {
        // Handle {{#if condition}}...{{/if}}
        template = template.replace(/\{\{#if\s+(\w+(?:\.\w+)?)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            const value = this.resolveValue(condition, context);
            return value ? content : '';
        });

        // Handle {{#unless condition}}...{{/unless}}
        template = template.replace(/\{\{#unless\s+(\w+(?:\.\w+)?)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match, condition, content) => {
            const value = this.resolveValue(condition, context);
            return !value ? content : '';
        });

        return template;
    }

    /**
     * Handle loops like {{#each items}}...{{/each}} with enhanced context
     */
    private handleLoops(template: string, context: TemplateContext & { this?: any }): string {
        // Handle {{#each arrayName}}...{{/each}}
        return template.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, itemTemplate) => {
            const array = (context as any)[arrayName];
            if (!Array.isArray(array)) {
                return '';
            }

            return array.map((item, index) => {
                let itemContent = itemTemplate;

                // Create enhanced item context
                const itemContext = {
                    ...context,
                    this: item,
                    '@index': index,
                    '@first': index === 0,
                    '@last': index === array.length - 1
                };

                // Replace {{this.property}} with item properties
                itemContent = itemContent.replace(/\{\{this\.(\w+)\}\}/g, (match: string, prop: string) => {
                    const value = (item as any)[prop];
                    return value !== undefined ? String(value) : match;
                });

                // Replace {{@index}}, {{@first}}, {{@last}}
                itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));
                itemContent = itemContent.replace(/\{\{@first\}\}/g, String(index === 0));
                itemContent = itemContent.replace(/\{\{@last\}\}/g, String(index === array.length - 1));

                // Handle nested conditionals within loops
                itemContent = this.handleConditionals(itemContent, itemContext);

                // Handle nested loops
                itemContent = this.handleLoops(itemContent, itemContext);

                return itemContent;
            }).join('');
        });
    }

    /**
     * Resolve value from context with support for nested properties
     */
    private resolveValue(path: string, context: TemplateContext & { this?: any }): any {
        if (path.includes('.')) {
            const parts = path.split('.');
            const objName = parts[0];
            const prop = parts[1];

            if (!objName || !prop) return undefined;

            if (objName === 'this' && context.this) {
                return (context.this as any)[prop];
            }
            const obj = (context as any)[objName];
            return obj?.[prop];
        }
        return (context as any)[path];
    }

    /**
     * Load template from string
     */
    static fromString(template: string): TemplateEngine {
        const engine = new TemplateEngine();
        return engine;
    }
} 