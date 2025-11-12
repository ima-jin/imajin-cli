/**
 * TemplateEngine - Handlebars-based template engine for code generation
 * 
 * @package     @imajin/cli
 * @subpackage  generators/templates
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - Code generation from templates using Handlebars
 * - Variable substitution with enhanced context
 * - Helper functions for utility operations
 * - Template compilation and rendering
 */

import Handlebars from 'handlebars';
import type { TemplateContext } from '../types.js';

export class TemplateEngine {
    private readonly handlebars: typeof Handlebars;

    constructor() {
        this.handlebars = Handlebars.create();
        this.registerHelpers();
    }

    /**
     * Register custom Handlebars helpers
     */
    private registerHelpers(): void {
        // Register utility helpers
        this.handlebars.registerHelper('pascalCase', (str: string) => {
            if (!str) {
return '';
}
            // Handle camelCase, kebab-case, snake_case, and space-separated words
            return str
                .replaceAll(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
                .split(/[-_\s]+/) // Split on separators
                .filter(word => word.length > 0) // Remove empty strings
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');
        });

        this.handlebars.registerHelper('camelCase', (str: string) => {
            if (!str) {
return '';
}
            const pascalCase = str
                .split(/[-_\s]+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('');
            return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
        });

        this.handlebars.registerHelper('kebabCase', (str: string) => {
            if (!str) {
return '';
}
            return str
                .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase()
                .replaceAll(/[_\s]+/g, '-');
        });

        this.handlebars.registerHelper('snakeCase', (str: string) => {
            if (!str) {
return '';
}
            return str
                .replaceAll(/([a-z])([A-Z])/g, '$1_$2')
                .toLowerCase()
                .replaceAll(/[-\s]+/g, '_');
        });

        this.handlebars.registerHelper('upperCase', (str: string) => {
            return str ? str.toUpperCase() : '';
        });

        this.handlebars.registerHelper('lowerCase', (str: string) => {
            return str ? str.toLowerCase() : '';
        });

        // Date helpers
        this.handlebars.registerHelper('currentDate', () => {
            return new Date().toISOString().split('T')[0];
        });

        this.handlebars.registerHelper('currentDateTime', () => {
            return new Date().toISOString();
        });

        this.handlebars.registerHelper('currentYear', () => {
            return new Date().getFullYear().toString();
        });

        // Conditional helpers
        this.handlebars.registerHelper('eq', (a: any, b: any) => {
            return a === b;
        });

        this.handlebars.registerHelper('ne', (a: any, b: any) => {
            return a !== b;
        });

        this.handlebars.registerHelper('gt', (a: any, b: any) => {
            return a > b;
        });

        this.handlebars.registerHelper('lt', (a: any, b: any) => {
            return a < b;
        });

        this.handlebars.registerHelper('and', (...args: any[]) => {
            // Remove the options object (last argument)
            const values = args.slice(0, -1);
            return values.every(Boolean);
        });

        this.handlebars.registerHelper('or', (...args: any[]) => {
            // Remove the options object (last argument)
            const values = args.slice(0, -1);
            return values.some(Boolean);
        });

        // Array helpers
        this.handlebars.registerHelper('join', (array: any[], separator: string = ', ') => {
            if (!Array.isArray(array)) {
return '';
}
            return array.join(separator);
        });

        this.handlebars.registerHelper('length', (array: any[] | string) => {
            if (Array.isArray(array) || typeof array === 'string') {
                return array.length;
            }
            return 0;
        });

        // JSON helpers
        this.handlebars.registerHelper('json', (obj: any) => {
            return JSON.stringify(obj, null, 2);
        });

        this.handlebars.registerHelper('jsonInline', (obj: any) => {
            return JSON.stringify(obj);
        });
    }

    /**
     * Render a template with the given context
     */
    public render(template: string, context: TemplateContext): string {
        try {
            // Compile the template
            const compiledTemplate = this.handlebars.compile(template);

            // Create the full context with utilities
            const fullContext = {
                ...context,
                utils: {
                    pascalCase: (str: string) => {
                        if (!str) {
return '';
}
                        // Handle camelCase, kebab-case, snake_case, and space-separated words
                        return str
                            .replaceAll(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
                            .split(/[-_\s]+/) // Split on separators
                            .filter(word => word.length > 0) // Remove empty strings
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join('');
                    },
                    camelCase: (str: string) => {
                        if (!str) {
return '';
}
                        const pascalCase = str
                            .split(/[-_\s]+/)
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join('');
                        return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
                    },
                    kebabCase: (str: string) => {
                        if (!str) {
return '';
}
                        return str
                            .replaceAll(/([a-z])([A-Z])/g, '$1-$2')
                            .toLowerCase()
                            .replaceAll(/[_\s]+/g, '-');
                    },
                    snakeCase: (str: string) => {
                        if (!str) {
return '';
}
                        return str
                            .replaceAll(/([a-z])([A-Z])/g, '$1_$2')
                            .toLowerCase()
                            .replaceAll(/[-\s]+/g, '_');
                    },
                    upperCase: (str: string) => str ? str.toUpperCase() : '',
                    lowerCase: (str: string) => str ? str.toLowerCase() : '',
                }
            };

            // Render the template
            return compiledTemplate(fullContext);
        } catch (error) {
            throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Register a custom helper
     */
    public registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
        this.handlebars.registerHelper(name, helper);
    }

    /**
     * Register a partial template
     */
    public registerPartial(name: string, partial: string): void {
        this.handlebars.registerPartial(name, partial);
    }

    /**
     * Precompile a template for better performance
     */
    public precompile(template: string): HandlebarsTemplateDelegate {
        return this.handlebars.compile(template);
    }
} 