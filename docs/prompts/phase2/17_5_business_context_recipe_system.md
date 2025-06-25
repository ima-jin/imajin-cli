---
# Metadata
title: "17 5 Business Context Recipe System"
created: "2025-06-13T22:32:39Z"
updated: "2025-06-13T23:00:00Z"
---

# 🍯 IMPLEMENT: Business Context Recipe System (Simplified)

**Status:** ⏳ **PENDING**  
**Phase:** 2 - Infrastructure Components  
**Estimated Time:** 2 hours (REDUCED SCOPE)  
**Dependencies:** Business Context System Cleanup (Prompt 17.4)  

---

## CONTEXT

Implement a simplified recipe-based business context setup system to improve user experience and fix critical UX issues. Focus on extracting existing hardcoded templates into a simple, discoverable system while addressing the urgent problem of silent command failures.

**Current Pain Points:**
```bash
# CRITICAL: Commands fail silently without helpful guidance
$ imajin stripe payment create --amount 1000
Error: Business context not initialized

# IMPROVEMENT NEEDED: Manual description writing is cumbersome  
imajin context init --description "We run a coffee shop with online ordering..."

# DESIRED: Quick recipe selection
imajin recipes list
imajin init recipe --type coffee-shop
```

## CURRENT STATE ANALYSIS

**✅ Existing Foundation:**
- `BusinessContextProcessor.ts` has working templates for `restaurant`, `ecommerce`, `saas` ✅
- `getBaseEntitiesForBusinessType()` method contains functional hardcoded templates ✅  
- Business context generation works well for template-based setups ✅
- Interactive initialization with `imajin context init --interactive` ✅

**❌ Critical Issues to Address:**
- **Silent Command Failures**: Commands requiring business context fail without helpful guidance
- **Template Discovery**: No way to list available business types 
- **Template Access**: Hardcoded templates in TypeScript (not user-discoverable)
- **Poor Error UX**: Users get cryptic errors instead of actionable guidance

**🎯 Business Impact:**
- **User Onboarding**: Faster time-to-value with quick setup options
- **Market Expansion**: Easy addition of new business types without code changes
- **Reduced Support**: Self-service template discovery reduces user confusion

**🚀 Future Evolution Path:**
This implementation lays the foundation for advanced **identity-based context switching** where authentication determines user context automatically (employee vs customer vs vendor views) rather than manual context switching. The current architecture is designed to migrate seamlessly to this sophisticated multi-perspective system.

---

## DELIVERABLES

### 1. **Critical UX Fix: Business Context Validation**
Add middleware to validate business context before command execution and provide helpful guidance.

### 2. **Simple Recipe System**
Extract existing templates to JSON files with basic CLI commands.

### 3. **Recipe Discovery Commands**
Add commands to list available recipes and initialize from templates.

### 4. **Enhanced Error Messages**
Provide actionable guidance when business context is missing.

---

## IMPLEMENTATION REQUIREMENTS

### 1. **Critical Fix: Business Context Validation Middleware**

**Create Validation Middleware:**
```typescript
// src/middleware/BusinessContextValidator.ts
import { BusinessContextManager } from '../context/BusinessContextManager.js';
import chalk from 'chalk';

export class BusinessContextValidator {
    private contextManager: BusinessContextManager;
    
    constructor() {
        this.contextManager = new BusinessContextManager();
    }
    
    /**
     * Commands that require business context to be initialized
     */
    private readonly CONTEXT_REQUIRED_COMMANDS = [
        'stripe',
        'generate',
        'deploy',
        'api',
        'database'
    ];
    
    /**
     * Validate business context before command execution
     */
    async validateBusinessContext(command: string): Promise<boolean> {
        // Skip validation for init commands and help
        if (command.startsWith('init') || command.startsWith('context') || 
            command === 'help' || command === 'recipes') {
            return true;
        }
        
        // Check if command requires business context
        const requiresContext = this.CONTEXT_REQUIRED_COMMANDS.some(cmd => 
            command.startsWith(cmd)
        );
        
        if (!requiresContext) {
            return true;
        }
        
        // Check if business context exists
        const hasContext = await this.contextManager.hasBusinessContext();
        
        if (!hasContext) {
            this.showQuickSetupGuidance(command);
            return false;
        }
        
        return true;
    }
    
    /**
     * Show helpful onboarding guidance when context is missing
     */
    private showQuickSetupGuidance(attemptedCommand: string): void {
        console.log(chalk.red('\n❌ Business context not initialized'));
        console.log(chalk.yellow('\n🚀 Quick setup options:\n'));
        
        // Show relevant templates based on attempted command
        if (attemptedCommand.includes('stripe')) {
            console.log(chalk.cyan('💳 For payment processing:'));
            console.log(chalk.gray('   imajin init recipe --type coffee-shop'));
            console.log(chalk.gray('   imajin init recipe --type ecommerce'));
            console.log(chalk.gray('   imajin init recipe --type saas'));
        } else {
            console.log(chalk.cyan('⚡ Quick templates:'));
            console.log(chalk.gray('   imajin recipes list                   # See all options'));
            console.log(chalk.gray('   imajin init recipe --type coffee-shop # Use template'));
        }
        
        console.log(chalk.cyan('\n✏️  Custom setup:'));
        console.log(chalk.gray('   imajin context init --interactive     # Interactive setup'));
        console.log(chalk.gray('   imajin context init --description "..." # From description'));
        
        console.log(chalk.blue('\n📚 Learn more: imajin help\n'));
    }
}
```

**Integrate with CLI:**
```typescript
// src/cli/ImajinCLI.ts (or wherever main CLI execution happens)
import { BusinessContextValidator } from '../middleware/BusinessContextValidator.js';

export class ImajinCLI {
    private validator: BusinessContextValidator;
    
    constructor() {
        this.validator = new BusinessContextValidator();
    }
    
    async execute(args: string[]): Promise<void> {
        const command = args.join(' ');
        
        // Validate business context before command execution
        const isValid = await this.validator.validateBusinessContext(command);
        if (!isValid) {
            process.exit(1);
        }
        
        // Continue with normal command execution
        await this.executeCommand(command);
    }
}
```

### 2. **Simple Recipe System**

**Extract Templates to JSON Files:**
```json
// src/templates/recipes/coffee-shop.json
{
  "name": "Coffee Shop",
  "description": "Complete setup for coffee shops with POS and customer management",
  "businessType": "coffee-shop",
  "entities": {
    "customer": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "email", "type": "string", "required": false },
        { "name": "phone", "type": "string", "required": false },
        { "name": "loyaltyPoints", "type": "number", "default": 0 },
        { "name": "dietaryRestrictions", "type": "array", "items": "string", "required": false }
      ]
    },
    "order": {
      "fields": [
        { "name": "items", "type": "array", "items": "orderItem", "required": true },
        { "name": "total", "type": "number", "required": true },
        { "name": "status", "type": "enum", "values": ["pending", "preparing", "ready", "completed"], "required": true },
        { "name": "customerName", "type": "string", "required": false }
      ]
    },
    "product": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "price", "type": "number", "required": true },
        { "name": "category", "type": "enum", "values": ["beverage", "food", "retail"], "required": true }
      ]
    }
  },
  "workflows": [
    {
      "name": "Order Processing",
      "description": "From order to completion",
      "steps": ["Order placed", "Payment processed", "Preparation", "Order ready", "Completed"]
    }
  ]
}
```

```typescript
// src/templates/recipes/restaurant.json
{
  "name": "Restaurant",
  "description": "Full-service restaurant with table management and reservations", 
  "businessType": "restaurant",
  "entities": {
    "customer": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "email", "type": "string", "required": false },
        { "name": "phone", "type": "string", "required": false },
        { "name": "dietaryRestrictions", "type": "array", "items": "string", "required": false },
        { "name": "favoriteTable", "type": "number", "required": false },
        { "name": "loyaltyPoints", "type": "number", "default": 0 }
      ]
    },
    "table": {
      "fields": [
        { "name": "number", "type": "number", "required": true },
        { "name": "section", "type": "string", "required": true },
        { "name": "capacity", "type": "number", "required": true },
        { "name": "status", "type": "enum", "values": ["available", "occupied", "reserved"], "required": true }
      ]
    },
    "order": {
      "fields": [
        { "name": "table", "type": "number", "required": true },
        { "name": "items", "type": "array", "items": "menuItem", "required": true },
        { "name": "total", "type": "number", "required": true },
        { "name": "status", "type": "enum", "values": ["ordered", "preparing", "ready", "served"], "required": true }
      ]
    }
  }
}
```

```typescript
// src/templates/recipes/ecommerce.json
{
  "name": "E-commerce Store",
  "description": "Online store with product catalog and order management",
  "businessType": "ecommerce", 
  "entities": {
    "customer": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "email", "type": "string", "required": true },
        { "name": "shippingAddress", "type": "object", "required": false },
        { "name": "orderHistory", "type": "array", "items": "order", "required": false }
      ]
    },
    "product": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "price", "type": "number", "required": true },
        { "name": "sku", "type": "string", "required": true },
        { "name": "inventory", "type": "number", "required": true },
        { "name": "category", "type": "string", "required": false }
      ]
    },
    "order": {
      "fields": [
        { "name": "customerId", "type": "string", "required": true },
        { "name": "items", "type": "array", "items": "orderItem", "required": true },
        { "name": "total", "type": "number", "required": true },
        { "name": "status", "type": "enum", "values": ["pending", "processing", "shipped", "delivered"], "required": true }
      ]
    }
  }
}
```

```typescript
// src/templates/recipes/saas.json
{
  "name": "SaaS Platform",
  "description": "Software-as-a-service with user management and subscriptions",
  "businessType": "saas",
  "entities": {
    "user": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "email", "type": "string", "required": true },
        { "name": "role", "type": "enum", "values": ["admin", "user", "viewer"], "required": true },
        { "name": "lastLogin", "type": "date", "required": false }
      ]
    },
    "organization": {
      "fields": [
        { "name": "name", "type": "string", "required": true },
        { "name": "plan", "type": "string", "required": true },
        { "name": "billingEmail", "type": "string", "required": true }
      ]
    },
    "subscription": {
      "fields": [
        { "name": "organizationId", "type": "string", "required": true },
        { "name": "plan", "type": "string", "required": true },
        { "name": "status", "type": "enum", "values": ["active", "cancelled", "past_due"], "required": true }
      ]
    }
  }
}
```

### 3. **Recipe Manager Implementation**

**Create Simple Recipe Manager:**
```typescript
// src/context/RecipeManager.ts
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import type { BusinessDomainModel } from './BusinessContextProcessor.js';

export interface Recipe {
    name: string;
    description: string;
    businessType: string;
    entities: Record<string, any>;
    workflows?: any[];
    // Future: Role-based context views
    contextViews?: Record<string, ContextView>;
}

// Future-ready: Context view definition for role-based access
export interface ContextView {
    role: string;
    permissions: string[];
    entityAccess: Record<string, {
        fields: string[];
        operations: string[];
    }>;
}

export class RecipeManager {
    private readonly recipesDir: string;

    constructor() {
        this.recipesDir = join(__dirname, '../templates/recipes');
    }

    /**
     * List all available recipes
     */
    async listRecipes(): Promise<Recipe[]> {
        try {
            const files = await readdir(this.recipesDir);
            const recipes: Recipe[] = [];
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const recipe = await this.loadRecipe(file);
                    if (recipe) recipes.push(recipe);
                }
            }
            
            return recipes;
        } catch (error) {
            console.warn('No recipes directory found, using fallback recipes');
            return this.getFallbackRecipes();
        }
    }

    /**
     * Get recipe by business type
     */
    async getRecipe(businessType: string): Promise<Recipe | null> {
        try {
            const filePath = join(this.recipesDir, `${businessType}.json`);
            const content = await readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            // Fallback to hardcoded recipe if file doesn't exist
            return this.getFallbackRecipe(businessType);
        }
    }

    /**
     * Generate business context from recipe
     */
    generateBusinessContext(recipe: Recipe): BusinessDomainModel {
        return {
            businessType: recipe.businessType,
            description: recipe.description,
            entities: recipe.entities,
            workflows: recipe.workflows || [],
            // Future: Store context views for role-based access
            contextViews: recipe.contextViews || {}
        };
    }

    /**
     * Future-ready: Get context view for specific role
     * This method will be expanded when implementing identity-based context switching
     */
    getContextViewForRole(recipe: Recipe, role: string): ContextView | null {
        if (!recipe.contextViews) return null;
        return recipe.contextViews[role] || null;
    }

    private async loadRecipe(filename: string): Promise<Recipe | null> {
        try {
            const filePath = join(this.recipesDir, filename);
            const content = await readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn(`Failed to load recipe ${filename}:`, error);
            return null;
        }
    }

    private getFallbackRecipes(): Recipe[] {
        return [
            { name: "Coffee Shop", businessType: "coffee-shop", description: "Coffee shop with POS and customer management", entities: { customer: { fields: [] }, order: { fields: [] } } },
            { name: "Restaurant", businessType: "restaurant", description: "Full-service restaurant management", entities: { customer: { fields: [] }, table: { fields: [] } } },
            { name: "E-commerce", businessType: "ecommerce", description: "Online store with catalog and orders", entities: { customer: { fields: [] }, product: { fields: [] } } },
            { name: "SaaS Platform", businessType: "saas", description: "Software-as-a-service platform", entities: { user: { fields: [] }, subscription: { fields: [] } } }
        ];
    }

    private getFallbackRecipe(businessType: string): Recipe | null {
        const fallbacks = this.getFallbackRecipes();
        return fallbacks.find(r => r.businessType === businessType) || null;
    }
}
```

### 4. **Enhanced CLI Commands**

**Add Recipe Commands:**
```typescript
// src/commands/generated/RecipeCommands.ts
import { Command } from 'commander';
import { RecipeManager } from '../../context/RecipeManager.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';
import chalk from 'chalk';

export function createRecipeCommands(): Command {
    const cmd = new Command('recipes');
    cmd.description('Manage business recipe templates');

    // List available recipes
    cmd.command('list')
        .description('List available business recipe templates')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
            try {
                const recipeManager = new RecipeManager();
                const recipes = await recipeManager.listRecipes();
                
                if (options.json) {
                    console.log(JSON.stringify(recipes, null, 2));
                } else {
                    console.log(chalk.blue('📚 Available Business Recipe Templates:\n'));
                    
                    for (const recipe of recipes) {
                        console.log(chalk.cyan(`  • ${chalk.bold(recipe.businessType)}`));
                        console.log(chalk.gray(`    ${recipe.name} - ${recipe.description}`));
                        console.log(chalk.gray(`    Entities: ${Object.keys(recipe.entities).join(', ')}\n`));
                    }
                    
                    console.log(chalk.yellow('💡 Usage:'));
                    console.log(chalk.gray('   imajin init recipe --type <businessType>'));
                    console.log(chalk.gray('   imajin init recipe --type coffee-shop'));
                }
                
            } catch (error) {
                console.error(chalk.red('❌ Failed to list recipes:'), error);
                process.exit(1);
            }
        });

    return cmd;
}

// Update BusinessContextCommands.ts to add recipe initialization
// Add this to createBusinessContextCommands():

cmd.command('recipe')
    .description('Initialize from business recipe template')
    .option('-t, --type <type>', 'Recipe type (e.g., coffee-shop, restaurant, ecommerce, saas)')
    .option('-n, --name <name>', 'Business name')
    .option('--preview', 'Preview recipe without creating')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
        try {
            const recipeManager = new RecipeManager();
            
            if (!options.type) {
                // Show available recipes if no type specified
                const recipes = await recipeManager.listRecipes();
                console.log(chalk.yellow('⚠️  Please specify a recipe type:\n'));
                
                for (const recipe of recipes) {
                    console.log(chalk.gray(`   imajin init recipe --type ${recipe.businessType}`));
                }
                return;
            }
            
            const recipe = await recipeManager.getRecipe(options.type);
            if (!recipe) {
                console.log(chalk.red(`❌ Recipe not found: ${options.type}`));
                console.log(chalk.yellow('\n💡 Available recipes:'));
                const recipes = await recipeManager.listRecipes();
                for (const r of recipes) {
                    console.log(chalk.gray(`   ${r.businessType}`));
                }
                return;
            }
            
            if (options.preview) {
                // Preview mode - show what would be generated
                if (options.json) {
                    console.log(JSON.stringify(recipe, null, 2));
                } else {
                    console.log(chalk.blue('📋 Recipe Preview:'));
                    console.log(chalk.cyan(`Name: ${recipe.name}`));
                    console.log(chalk.cyan(`Type: ${recipe.businessType}`));
                    console.log(chalk.cyan(`Description: ${recipe.description}`));
                    console.log(chalk.cyan(`Entities: ${Object.keys(recipe.entities).join(', ')}`));
                }
                return;
            }
            
            // Check if business context already exists
            const manager = new BusinessContextManager();
            if (await manager.configurationExists()) {
                console.log(chalk.yellow('⚠️  Business context already exists.'));
                
                const inquirer = await import('inquirer');
                const overwriteAnswer = await inquirer.default.prompt([{
                    type: 'confirm',
                    name: 'overwrite',
                    message: 'Overwrite existing business context?',
                    default: false
                }]);
                
                if (!overwriteAnswer.overwrite) {
                    console.log(chalk.blue('Recipe setup cancelled.'));
                    return;
                }
            }
            
            // Generate business context from recipe
            const domainModel = recipeManager.generateBusinessContext(recipe);
            
            // Initialize business context
            const businessName = options.name || recipe.name;
            const config = await manager.initialize(domainModel.description, businessName);
            
            // Save the generated domain model
            config.entities = domainModel.entities;
            config.workflows = domainModel.workflows;
            await manager.saveConfiguration(config);
            
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    recipe: options.type,
                    businessType: domainModel.businessType,
                    entities: Object.keys(domainModel.entities),
                    configPath: manager.getConfigurationPath()
                }, null, 2));
            } else {
                console.log(chalk.green('✅ Business context created from recipe!'));
                console.log(chalk.cyan(`Recipe: ${recipe.name}`));
                console.log(chalk.cyan(`Business Type: ${domainModel.businessType}`));
                console.log(chalk.cyan(`Entities: ${Object.keys(domainModel.entities).join(', ')}`));
                console.log(chalk.yellow(`Config: ${manager.getConfigurationPath()}`));
                
                console.log(chalk.blue('\n🎯 Next steps:'));
                console.log('  • Run "imajin context show" to see your configuration');
                console.log('  • Run "imajin stripe payment create --amount 1000" to test integration');
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to setup from recipe:'), error);
            process.exit(1);
        }
    });
```

## FILE UPDATES REQUIRED

### **Files to Create (4 files):**

1. **src/middleware/BusinessContextValidator.ts** - Critical UX validation
2. **src/context/RecipeManager.ts** - Simple recipe system 
3. **src/commands/generated/RecipeCommands.ts** - Recipe CLI commands
4. **src/templates/recipes/*.json** - Recipe template files (4 templates)

### **Files to Update (2 files):**

1. **src/commands/generated/BusinessContextCommands.ts** - Add recipe command
2. **src/cli/ImajinCLI.ts** - Integrate validation middleware

### **Directory Structure:**
```
src/
├── middleware/
│   └── BusinessContextValidator.ts
├── context/
│   └── RecipeManager.ts
├── templates/
│   └── recipes/
│       ├── coffee-shop.json
│       ├── restaurant.json  
│       ├── ecommerce.json
│       └── saas.json
└── commands/generated/
    └── RecipeCommands.ts
```

## SUCCESS CRITERIA

### **🎯 Critical UX Improvement**
- [ ] Commands requiring business context show helpful guidance when not initialized
- [ ] Users get actionable next steps instead of cryptic error messages
- [ ] Silent failures eliminated - all errors include setup guidance

### **🎯 Recipe System**
- [ ] `imajin recipes list` shows available templates
- [ ] `imajin init recipe --type coffee-shop` creates working business context
- [ ] Recipe templates extracted from hardcoded TypeScript to discoverable JSON
- [ ] Preview mode works: `imajin init recipe --type saas --preview`

### **🎯 User Experience**
- [ ] Time-to-value improved: One command setup vs writing descriptions
- [ ] Self-service template discovery reduces support burden
- [ ] Clear upgrade path from simple to complex setups

## TESTING REQUIREMENTS

### **Critical UX Tests**
```bash
# Test command validation
imajin stripe payment create --amount 1000  # Should show helpful guidance
imajin init recipe --type coffee-shop       # Should work
imajin stripe payment create --amount 1000  # Should work now
```

### **Recipe System Tests**
```bash
# Test recipe discovery
imajin recipes list                          # Should show templates
imajin init recipe --type invalid          # Should show available options
imajin init recipe --type saas --preview   # Should show preview
```

### **Integration Tests**
- [ ] Recipe-generated business context works with Stripe integration
- [ ] Context validation prevents command execution when needed
- [ ] Error messages include relevant template suggestions

---

## IMPLEMENTATION APPROACH

### **Phase 1: Critical Fix (30 minutes)**
1. Add `BusinessContextValidator` middleware
2. Integrate with CLI execution flow
3. Test command validation and helpful error messages

### **Phase 2: Simple Recipe System (1 hour)**
1. Extract hardcoded templates to JSON files
2. Create `RecipeManager` class
3. Add basic `recipes list` command

### **Phase 3: Recipe Initialization (30 minutes)**
1. Add `init recipe` command to BusinessContextCommands
2. Test end-to-end recipe → business context → service integration
3. Verify error messages and user guidance

### **Testing Strategy**
- Manual testing of critical user journeys
- Verify error messages are helpful and actionable
- Test recipe system generates valid business contexts
- Ensure backward compatibility with existing initialization

---

## BUSINESS IMPACT

After completion, this simplified system enables:

1. **Improved User Experience** - No more silent failures, helpful guidance for setup
2. **Faster Onboarding** - One command setup: `imajin init recipe --type coffee-shop`
3. **Self-Service Discovery** - Users can explore templates: `imajin recipes list`
4. **Market Expansion Ready** - Easy to add new business types by adding JSON files

**Result**: Your CLI provides a smooth onboarding experience that gets users from zero to working integration in minutes, directly supporting your $43B market opportunity.

**Skipped for Future:**
- Complex YAML system with features/flags
- Community contribution workflow
- Advanced recipe validation framework  
- Interactive recipe builder

These can be added later once the core system proves valuable and user feedback guides enhanced features.

---

## 🚀 **FUTURE EVOLUTION: Identity-Based Context System**

### **Migration Path to Advanced Context Switching**

The current implementation is architected to seamlessly evolve into a sophisticated **authentication-driven context system** where user identity determines available context views automatically.

### **Future Vision (Phase 3):**
```typescript
// Authentication determines context - no manual switching needed
const user = await authenticate(token);
// { id: "john", role: "employee", business: "coffee-shop-123" }

// AI agent automatically applies context based on user identity
const contextView = await contextRouter.getContextForUser(user);

// Same commands, different data based on authenticated role
await aiAgent.processCommand("show inventory", contextView);
// Employee: cost, suppliers, margins, full access
// Customer: availability, public names only
// Vendor: reorder points, payment terms
// Auditor: compliance data, transaction logs
```

### **Migration Architecture Hooks (Already Built-In):**

1. **Recipe Interface Extensions** ✅
   - `contextViews?: Record<string, ContextView>` ready for role definitions
   - `getContextViewForRole()` method prepared for expansion

2. **Business Context Storage** ✅
   - Context views stored in business configuration
   - Backward compatible with current simple setup

3. **Command System Ready** ✅
   - CLI architecture supports context-aware command execution
   - Validation middleware can be extended for role-based filtering

### **Future Recipe Format (Backward Compatible):**
```json
{
  "name": "Coffee Shop",
  "businessType": "coffee-shop",
  "entities": { "customer": {...}, "order": {...} },
  "contextViews": {
    "employee": {
      "role": "employee",
      "permissions": ["read", "write", "delete"],
      "entityAccess": {
        "customer": {
          "fields": ["name", "email", "phone", "loyaltyPoints", "internalNotes"],
          "operations": ["create", "update", "delete", "view"]
        },
        "order": {
          "fields": ["items", "total", "cost", "profit", "customerNotes"],
          "operations": ["create", "update", "cancel", "refund"]
        }
      }
    },
    "customer": {
      "role": "customer", 
      "permissions": ["read"],
      "entityAccess": {
        "customer": {
          "fields": ["name", "email", "loyaltyPoints"],
          "operations": ["view", "update_own"]
        },
        "order": {
          "fields": ["items", "total", "status"],
          "operations": ["create", "view_own", "cancel_own"]
        }
      }
    }
  }
}
```

### **Migration Benefits:**
- **Zero Breaking Changes**: Current simple recipes continue working
- **Gradual Enhancement**: Businesses can add role-based views when ready
- **AI-Ready Architecture**: Context switching handled by AI agent, not manual commands
- **Authentication Integration**: Ready for OAuth, SAML, JWT token-based access control

**Next Epic: 18.X Identity-Based Context System**
- User authentication & role management
- AI agent context awareness
- Automatic context application based on identity
- Multi-tenant business isolation

---

## 🔗 **RELATED FILES**
- `src/context/BusinessContextProcessor.ts` - Extract templates from here
- `src/context/BusinessContextManager.ts` - Integration point for recipes
- `src/commands/generated/BusinessContextCommands.ts` - Add recipe commands