## **PROMPT 5.1: PLUGIN GENERATOR ENGINE FIXES & ENHANCEMENTS**

```markdown
# 🔧 IMPLEMENT: Plugin Generator Engine Fixes & Enhancements

## CONTEXT
Address specific issues identified in the Plugin Generator Engine implementation from Prompt 5, including template engine improvements, better error handling, integration fixes, and enhanced testing.

## IDENTIFIED ISSUES TO FIX

### 1. Template Engine Context Issues
- Template context access patterns need refinement
- Complex nested property access in templates
- Date generation in templates causing issues
- Loop context (`{{this.property}}`) needs better handling

### 2. Command Template Integration
- Generated commands need better BaseCommand integration
- Parameter extraction logic needs improvement
- Missing import resolution for complex models
- Authentication integration needs standardization

### 3. Service Template Issues
- HTTP client configuration needs enhancement
- URL building with path parameters needs fixing
- Query parameter extraction logic improvements
- Better error handling and response transformation

### 4. Plugin Structure & File Organization
- Index file generation needs completion
- Plugin configuration template needs enhancement
- Missing plugin loading mechanism
- Directory structure creation improvements

## DELIVERABLES

### 1. Enhanced Template Engine (`src/generators/templates/TemplateEngine.ts`)
Fix template context handling and add advanced features:

```typescript
/**
 * Enhanced template rendering with better context support
 */
render(template: string, context: TemplateContext & { this?: any }): string {
    let result = template;

    // Handle JavaScript expressions in templates
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
```

### 2. Improved Command Template (`src/generators/templates/command.template.ts`)
Fix command generation issues:

```typescript
export const COMMAND_TEMPLATE = `/**
 * {{this.name}}Command - {{this.description}}
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/{{pluginName}}/commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       {{currentDate}}
 */

import { BaseCommand } from '../../../core/commands/BaseCommand.js';
import type { CommandResult } from '../../../core/commands/interfaces.js';
import type { Logger } from '../../../logging/Logger.js';
import type { CredentialManager } from '../../../core/credentials/CredentialManager.js';
import { {{pluginName}}Service } from '../{{pluginName}}Service.js';
{{#if imports}}
{{#each imports}}
import type { {{this}} } from '../models/{{this}}.js';
{{/each}}
{{/if}}

export class {{this.name}}Command extends BaseCommand {
    public readonly name = '{{pluginName}}:{{this.name}}';
    public readonly description = '{{this.description}}';
    
    // Define command arguments and options
    public readonly arguments = [
        {{#each this.parameters}}
        {{#if this.required}}
        {
            name: '{{this.name}}',
            description: '{{this.description}}',
            required: {{this.required}},
            type: '{{this.type}}'{{#if this.enum}},
            choices: [{{#each this.enum}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}
        }{{#unless @last}},{{/unless}}
        {{/if}}
        {{/each}}
    ];

    public readonly options = [
        {{#each this.parameters}}
        {{#unless this.required}}
        {
            name: '{{this.name}}',
            description: '{{this.description}}',
            type: '{{this.type}}',
            required: false{{#if this.enum}},
            choices: [{{#each this.enum}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]{{/if}}
        }{{#unless @last}},{{/unless}}
        {{/unless}}
        {{/each}}
    ];

    constructor(
        private credentialManager: CredentialManager,
        private service: {{pluginName}}Service,
        logger?: Logger
    ) {
        super(logger);
    }

    public async execute(args: any[], options: any): Promise<CommandResult> {
        try {
            // Validate inputs
            this.validate(args, options);

            // Get and validate credentials
            const credentials = await this.getCredentials('{{pluginName}}');
            
            // Extract and validate parameters
            const params = this.extractParameters(args, options);

            // Execute service call
            const result = await this.service.{{this.name}}(params, credentials);

            this.logSuccess('{{this.name}} completed successfully', { result });

            return {
                success: true,
                data: result,
                message: '{{this.name}} completed successfully'
            };

        } catch (error) {
            const errorMessage = \`{{this.name}} failed: \${error instanceof Error ? error.message : 'Unknown error'}\`;
            this.logError(errorMessage, error as Error);
            
            return {
                success: false,
                error: error as Error,
                message: errorMessage
            };
        }
    }

    // ... rest of implementation with improved parameter extraction
}`;
```

### 3. Enhanced Service Template
Fix HTTP client and API integration issues:

```typescript
export const SERVICE_TEMPLATE = `/**
 * {{pluginName}}Service - Enhanced service with proper error handling
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import type { CredentialData } from '../../core/credentials/interfaces.js';
{{#if imports}}
{{#each imports}}
import type { {{this}} } from './models/{{this}}.js';
{{/each}}
{{/if}}

export class {{pluginName}}Service {
    private client: AxiosInstance;
    private readonly baseUrl: string;

    constructor(baseUrl: string = '{{baseUrl}}') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.client = this.createHttpClient();
    }

    private createHttpClient(): AxiosInstance {
        return axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imajin-cli/0.1.0',
                'Accept': 'application/json'
            }
        });
    }

    {{#each commands}}
    /**
     * {{this.description}}
     * Method: {{this.method}}
     * Path: {{this.path}}
     */
    public async {{this.name}}(params: any = {}, credentials: CredentialData): Promise<any> {
        try {
            // Apply authentication
            this.applyAuthentication(credentials);

            // Build request configuration
            const config = this.buildRequestConfig('{{this.method}}', '{{this.path}}', params);

            // Execute request
            const response: AxiosResponse = await this.client.request(config);
            
            return this.processResponse(response);

        } catch (error) {
            throw this.handleApiError(error as AxiosError, '{{this.name}}');
        }
    }

    {{/each}}

    // ... enhanced helper methods for URL building, auth, error handling
}`;
```

### 4. Plugin Generator Improvements (`src/generators/PluginGenerator.ts`)
Add missing functionality and fix integration issues:

```typescript
/**
 * Enhanced generateFiles method with better template context
 */
private async generateFiles(plugin: GeneratedPlugin): Promise<PluginFile[]> {
    const files: PluginFile[] = [];
    
    // Enhanced template context with utilities
    const baseContext: TemplateContext = {
        pluginName: this.pascalCase(plugin.name),
        pluginDescription: plugin.description,
        baseUrl: plugin.baseUrl,
        commands: plugin.commands,
        models: plugin.models,
        imports: this.extractImports(plugin.models),
        currentDate: new Date().toISOString().split('T')[0],
        // Add utility functions to context
        utils: {
            pascalCase: this.pascalCase.bind(this),
            camelCase: this.camelCase.bind(this),
            kebabCase: this.kebabCase.bind(this)
        }
    };

    if (plugin.authConfig) {
        baseContext.authConfig = plugin.authConfig;
    }

    // Generate each file with enhanced context
    // ... rest of implementation
}

/**
 * Add missing utility methods
 */
private camelCase(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

private kebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
}
```

### 5. Integration & Testing Improvements

#### A. Enhanced Service Provider Integration
```typescript
// src/providers/PluginGeneratorServiceProvider.ts
export class PluginGeneratorServiceProvider extends ServiceProvider {
    async register(container: DependencyContainer): Promise<void> {
        // Register with proper dependencies
        container.singleton('pluginGenerator', () => {
            const parser = container.resolve<OpenAPIParser>('openApiParser');
            const templateEngine = container.resolve<TemplateEngine>('templateEngine');
            return new DefaultPluginGenerator(parser, templateEngine);
        });

        // Register template engine
        container.singleton('templateEngine', () => new TemplateEngine());
        
        // Register parser
        container.singleton('openApiParser', () => new DefaultOpenAPIParser());
    }
}
```

#### B. Command Integration Fix
```typescript
// src/commands/GeneratePluginCommand.ts
export class GeneratePluginCommand extends BaseCommand {
    // Fix dependency injection
    constructor(
        @inject('pluginGenerator') private generator: PluginGenerator,
        @inject('credentialManager') private credentialManager: CredentialManager,
        logger?: Logger
    ) {
        super(logger);
    }
}
```

## IMPLEMENTATION REQUIREMENTS

### 1. Template Engine Enhancements
- Fix JavaScript expression evaluation in templates
- Improve context handling for nested properties
- Add utility functions to template context
- Better error handling for template rendering failures

### 2. Command Template Fixes
- Complete argument and option definitions
- Fix parameter extraction and validation
- Improve error handling and logging
- Better integration with BaseCommand

### 3. Service Template Improvements
- Enhanced HTTP client configuration
- Better URL building with path parameters
- Improved error handling and response processing
- Proper authentication integration

### 4. Plugin Structure Completion
- Complete index file generation
- Enhanced plugin configuration
- Better directory structure management
- Improved file organization

### 5. Testing & Validation
- Add comprehensive unit tests for template engine
- Test plugin generation with real OpenAPI specs
- Validate generated code compiles and runs
- Integration tests with command system

## SUCCESS CRITERIA
- Template engine handles complex expressions correctly
- Generated plugins compile without TypeScript errors
- Commands integrate properly with the Command Pattern framework
- Services make successful API calls with proper authentication
- Plugin files are organized correctly and complete
- Tests pass and validate functionality
- Generated plugins can be loaded and executed successfully

## NEXT STEPS AFTER COMPLETION
- Test with real-world OpenAPI specifications (Stripe, GitHub, etc.)
- Validate end-to-end plugin generation workflow
- Prepare for advanced features (auto-healing, plugin management)
- Ready for Phase 2 service integrations