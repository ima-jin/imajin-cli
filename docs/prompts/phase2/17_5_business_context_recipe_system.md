# 🍯 IMPLEMENT: Business Context Recipe System

**Status:** ⏳ **PENDING**  
**Phase:** 2 - Infrastructure Components  
**Estimated Time:** 3-4 hours  
**Dependencies:** Business Context System Cleanup (Prompt 17.4)  

---

## CONTEXT

Implement a recipe-based business context setup system to improve user experience over free-form business descriptions. Instead of requiring users to write detailed business descriptions, provide pre-built templates/recipes for common business types that can be quickly customized.

**Current Pain Point:**
```bash
# Current: Users must write detailed descriptions
imajin init setup --business "We run a coffee shop with online ordering and payment processing, we have inventory management, customer loyalty programs, table reservations..."

# Desired: Quick recipe selection
imajin init recipe --type coffee-shop
imajin init recipe --type saas --features "subscriptions,teams,billing"
```

## CURRENT STATE ANALYSIS

**✅ Existing Foundation:**
- `BusinessContextProcessor.ts` has basic business type templates (restaurant, ecommerce, saas)
- `getBaseEntitiesForBusinessType()` method contains hardcoded templates
- Business context generation works well for template-based setups
- CLI commands in `BusinessContextCommands.ts` handle init flow

**❌ Limitations of Current System:**
- Templates are hardcoded in TypeScript (not easily extensible)
- No recipe discovery or listing functionality  
- Limited business type coverage (only 3 types)
- No recipe customization or feature flags
- No recipe validation or testing framework

**🎯 Discovered During Implementation:**
- Users created business contexts successfully: `ecommerce` with `customer, product, order, payment`
- Template system generated proper entity relationships and workflows
- Recipe approach would be much more user-friendly than description parsing
- **Critical Issue**: Commands fail silently when business context not initialized (e.g., `stripe payment create` returns "Business context not initialized" error)

---

## DELIVERABLES

### 1. **Recipe Template System**
Create extensible YAML-based recipe templates for common business types.

### 2. **Recipe Discovery CLI**
Add commands to list, preview, and customize recipes before initialization.

### 3. **Interactive Recipe Builder**
Implement interactive mode for recipe selection and customization.

### 4. **Recipe Validation Framework**
Create testing system to validate recipe templates generate proper business contexts.

### 5. **Extended Recipe Library**
Implement comprehensive recipe collection for common business types.

### 6. **Community Recipe Contribution System**
Enable GitHub-based community contributions for extending the recipe library.

### 7. **Business Context Validation & User Onboarding**
Implement CLI validation to ensure business context is initialized before running commands that require it.

---

## IMPLEMENTATION REQUIREMENTS

### 1. **Recipe Template Structure**

**Create Recipe Directory Structure:**
```
src/templates/business-recipes/
├── README.md                    # Recipe system documentation
├── core/                        # Essential business types
│   ├── ecommerce.yaml
│   ├── restaurant.yaml
│   ├── saas.yaml
│   └── consulting.yaml
├── specialized/                 # Specialized business types
│   ├── coffee-shop.yaml
│   ├── agency.yaml
│   ├── retail-store.yaml
│   ├── gym-fitness.yaml
│   ├── real-estate.yaml
│   ├── blog.yaml
│   └── artist-portfolio.yaml
├── industry/                    # Industry-specific templates
│   ├── healthcare.yaml
│   ├── education.yaml
│   ├── finance.yaml
│   └── manufacturing.yaml
├── community/                   # Community-contributed recipes
│   ├── README.md               # Community contribution guidelines
│   └── [user-contributed-recipes.yaml]
└── schema.yaml                  # Recipe schema definition
```

**Recipe YAML Schema:**
```yaml
# src/templates/business-recipes/core/coffee-shop.yaml
name: "Coffee Shop"
description: "Complete setup for coffee shops with POS, inventory, and customer management"
category: "retail"
tags: ["food-service", "retail", "pos", "inventory"]
version: "1.0.0"

features:
  - name: "pos_system"
    description: "Point of sale integration"
    default: true
    entities: ["transaction", "payment_method"]
  - name: "loyalty_program" 
    description: "Customer loyalty and rewards"
    default: true
    entities: ["loyalty_account", "reward"]
  - name: "inventory_management"
    description: "Stock tracking and ordering"
    default: true
    entities: ["inventory_item", "supplier", "purchase_order"]
  - name: "table_service"
    description: "Table reservations and service tracking"
    default: false
    entities: ["table", "reservation"]

entities:
  customer:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "email"
        type: "string" 
        required: false
      - name: "phone"
        type: "string"
        required: false
      - name: "loyalty_points"
        type: "number"
        default: 0
        feature: "loyalty_program"
    relationships:
      - type: "hasMany"
        entity: "order"
        description: "Customer order history"
      - type: "hasOne"
        entity: "loyalty_account"
        feature: "loyalty_program"
        
  product:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "category"
        type: "enum"
        values: ["beverage", "food", "retail", "other"]
        required: true
      - name: "price"
        type: "number"
        required: true
      - name: "cost"
        type: "number"
        required: false
        feature: "inventory_management"
      - name: "stock_level"
        type: "number"
        default: 0
        feature: "inventory_management"
    
  order:
    fields:
      - name: "customer_id"
        type: "string"
        required: false
      - name: "items"
        type: "array"
        items: "order_item"
        required: true
      - name: "total"
        type: "number"
        required: true
      - name: "status"
        type: "enum"
        values: ["pending", "preparing", "ready", "completed", "cancelled"]
        required: true
      - name: "order_type"
        type: "enum"
        values: ["dine_in", "takeout", "delivery"]
        required: true
      - name: "table_number"
        type: "number"
        required: false
        feature: "table_service"

workflows:
  - name: "Order Processing"
    description: "From order placement to completion"
    steps:
      - "Customer places order"
      - "Payment processed"
      - "Order sent to preparation"
      - "Order ready notification"
      - "Order completed"
    
  - name: "Inventory Restocking"
    description: "Automated inventory management"
    feature: "inventory_management"
    steps:
      - "Monitor stock levels"
      - "Generate reorder alerts"
      - "Create purchase orders"
      - "Receive and update inventory"

businessRules:
  - rule: "Loyalty points earned = 1 point per $1 spent"
    feature: "loyalty_program"
    priority: "medium"
  - rule: "Low stock alert when quantity < reorder_level"
    feature: "inventory_management" 
    priority: "high"
  - rule: "Table reservations limited to 2 hours"
    feature: "table_service"
    priority: "medium"

integrations:
  stripe:
    enabled: true
    entities: ["customer", "payment", "subscription"]
  square:
    enabled: false
    entities: ["customer", "payment", "inventory"]
  mailchimp:
    enabled: false
    entities: ["customer"]
```

### 2. **Recipe Manager Implementation**

**Create Recipe Manager:**
```typescript
// src/context/RecipeManager.ts
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import yaml from 'js-yaml';
import type { BusinessDomainModel } from './BusinessContextProcessor.js';

export interface Recipe {
    name: string;
    description: string;
    category: string;
    tags: string[];
    version: string;
    features: RecipeFeature[];
    entities: Record<string, any>;
    workflows?: any[];
    businessRules?: any[];
    integrations?: Record<string, any>;
}

export interface RecipeFeature {
    name: string;
    description: string;
    default: boolean;
    entities?: string[];
}

export interface RecipeCustomization {
    recipeId: string;
    enabledFeatures: string[];
    customFields?: Record<string, any[]>;
    businessName?: string;
    businessDescription?: string;
}

export class RecipeManager {
    private readonly recipesDir: string;
    private recipeCache: Map<string, Recipe> = new Map();

    constructor() {
        this.recipesDir = join(__dirname, '../templates/business-recipes');
    }

    /**
     * List all available recipes
     */
    async listRecipes(): Promise<Recipe[]> {
        const categories = ['core', 'specialized', 'industry'];
        const recipes: Recipe[] = [];

        for (const category of categories) {
            const categoryPath = join(this.recipesDir, category);
            try {
                const files = await readdir(categoryPath);
                for (const file of files) {
                    if (file.endsWith('.yaml')) {
                        const recipe = await this.loadRecipe(category, file);
                        if (recipe) recipes.push(recipe);
                    }
                }
            } catch (error) {
                // Category directory doesn't exist
                continue;
            }
        }

        return recipes;
    }

    /**
     * Get recipe by ID
     */
    async getRecipe(recipeId: string): Promise<Recipe | null> {
        if (this.recipeCache.has(recipeId)) {
            return this.recipeCache.get(recipeId)!;
        }

        const recipes = await this.listRecipes();
        const recipe = recipes.find(r => this.getRecipeId(r) === recipeId);
        
        if (recipe) {
            this.recipeCache.set(recipeId, recipe);
        }
        
        return recipe || null;
    }

    /**
     * Generate business context from recipe and customization
     */
    async generateBusinessContext(
        recipeId: string, 
        customization: RecipeCustomization
    ): Promise<BusinessDomainModel> {
        const recipe = await this.getRecipe(recipeId);
        if (!recipe) {
            throw new Error(`Recipe not found: ${recipeId}`);
        }

        // Filter entities based on enabled features
        const filteredEntities = this.filterEntitiesByFeatures(
            recipe.entities,
            customization.enabledFeatures,
            recipe.features
        );

        // Apply custom fields
        const enhancedEntities = this.applyCustomFields(
            filteredEntities,
            customization.customFields || {}
        );

        // Generate business domain model
        const domainModel: BusinessDomainModel = {
            businessType: this.getRecipeId(recipe),
            description: customization.businessDescription || recipe.description,
            entities: enhancedEntities,
            workflows: this.filterWorkflowsByFeatures(
                recipe.workflows || [],
                customization.enabledFeatures
            ),
            businessRules: this.filterBusinessRulesByFeatures(
                recipe.businessRules || [],
                customization.enabledFeatures
            )
        };

        return domainModel;
    }

    /**
     * Validate recipe template
     */
    async validateRecipe(recipe: Recipe): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields validation
        if (!recipe.name) errors.push('Recipe name is required');
        if (!recipe.description) errors.push('Recipe description is required');
        if (!recipe.entities || Object.keys(recipe.entities).length === 0) {
            errors.push('Recipe must have at least one entity');
        }

        // Entity validation
        for (const [entityName, entityDef] of Object.entries(recipe.entities)) {
            if (!entityDef.fields || !Array.isArray(entityDef.fields)) {
                errors.push(`Entity ${entityName} must have fields array`);
                continue;
            }

            for (const field of entityDef.fields) {
                if (!field.name) errors.push(`Field in ${entityName} missing name`);
                if (!field.type) errors.push(`Field ${field.name} in ${entityName} missing type`);
            }
        }

        // Feature validation
        if (recipe.features) {
            const featureNames = new Set(recipe.features.map(f => f.name));
            
            // Check if entity features reference valid features
            for (const [entityName, entityDef] of Object.entries(recipe.entities)) {
                for (const field of entityDef.fields || []) {
                    if (field.feature && !featureNames.has(field.feature)) {
                        warnings.push(`Field ${field.name} in ${entityName} references unknown feature: ${field.feature}`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    private async loadRecipe(category: string, filename: string): Promise<Recipe | null> {
        try {
            const filePath = join(this.recipesDir, category, filename);
            const content = await readFile(filePath, 'utf-8');
            const recipe = yaml.load(content) as Recipe;
            
            // Add computed properties
            recipe.category = category;
            
            const validation = await this.validateRecipe(recipe);
            if (!validation.valid) {
                console.warn(`Invalid recipe ${filename}:`, validation.errors);
                return null;
            }
            
            return recipe;
        } catch (error) {
            console.warn(`Failed to load recipe ${filename}:`, error);
            return null;
        }
    }

    private getRecipeId(recipe: Recipe): string {
        return recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    private filterEntitiesByFeatures(
        entities: Record<string, any>,
        enabledFeatures: string[],
        features: RecipeFeature[]
    ): Record<string, any> {
        const result: Record<string, any> = {};
        
        for (const [entityName, entityDef] of Object.entries(entities)) {
            const filteredEntity = { ...entityDef };
            
            // Filter fields by features
            if (filteredEntity.fields) {
                filteredEntity.fields = filteredEntity.fields.filter((field: any) => {
                    if (!field.feature) return true; // Always include non-feature fields
                    return enabledFeatures.includes(field.feature);
                });
            }
            
            // Filter relationships by features
            if (filteredEntity.relationships) {
                filteredEntity.relationships = filteredEntity.relationships.filter((rel: any) => {
                    if (!rel.feature) return true;
                    return enabledFeatures.includes(rel.feature);
                });
            }
            
            result[entityName] = filteredEntity;
        }
        
        return result;
    }

    private applyCustomFields(
        entities: Record<string, any>,
        customFields: Record<string, any[]>
    ): Record<string, any> {
        const result = { ...entities };
        
        for (const [entityName, fields] of Object.entries(customFields)) {
            if (result[entityName]) {
                result[entityName].fields = [
                    ...(result[entityName].fields || []),
                    ...fields
                ];
            }
        }
        
        return result;
    }

    private filterWorkflowsByFeatures(workflows: any[], enabledFeatures: string[]): any[] {
        return workflows.filter(workflow => {
            if (!workflow.feature) return true;
            return enabledFeatures.includes(workflow.feature);
        });
    }

    private filterBusinessRulesByFeatures(rules: any[], enabledFeatures: string[]): any[] {
        return rules.filter(rule => {
            if (!rule.feature) return true;
            return enabledFeatures.includes(rule.feature);
        });
    }
}
```

### 3. **Enhanced CLI Commands**

**Update Business Context Commands:**
```typescript
// src/commands/generated/BusinessContextCommands.ts (additions)

// Add recipe commands
cmd.command('recipe')
    .description('Initialize from business recipe template')
    .option('-t, --type <type>', 'Recipe type (e.g., coffee-shop, saas, restaurant)')
    .option('-l, --list', 'List available recipes')
    .option('-i, --interactive', 'Interactive recipe selection')
    .option('--features <features>', 'Comma-separated list of features to enable')
    .option('-n, --name <name>', 'Business name')
    .option('--preview', 'Preview recipe without creating')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
        try {
            const recipeManager = new RecipeManager();
            
            if (options.list) {
                // List all available recipes
                const recipes = await recipeManager.listRecipes();
                
                if (options.json) {
                    console.log(JSON.stringify(recipes, null, 2));
                } else {
                    console.log(chalk.blue('📋 Available Business Recipes:'));
                    
                    const grouped = recipes.reduce((acc, recipe) => {
                        if (!acc[recipe.category]) acc[recipe.category] = [];
                        acc[recipe.category].push(recipe);
                        return acc;
                    }, {} as Record<string, Recipe[]>);
                    
                    for (const [category, categoryRecipes] of Object.entries(grouped)) {
                        console.log(chalk.yellow(`\n${category.toUpperCase()}:`));
                        for (const recipe of categoryRecipes) {
                            const recipeId = recipe.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                            console.log(`  • ${chalk.cyan(recipeId)} - ${recipe.description}`);
                            console.log(`    Features: ${recipe.features.map(f => f.name).join(', ')}`);
                        }
                    }
                }
                return;
            }
            
            let recipeType = options.type;
            let enabledFeatures: string[] = [];
            
            if (options.interactive || !recipeType) {
                // Interactive mode
                const inquirer = await import('inquirer');
                const recipes = await recipeManager.listRecipes();
                
                if (!recipeType) {
                    const choices = recipes.map(r => ({
                        name: `${r.name} - ${r.description}`,
                        value: r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    }));
                    
                    const typeAnswer = await inquirer.default.prompt([{
                        type: 'list',
                        name: 'type',
                        message: 'Select a business recipe:',
                        choices
                    }]);
                    recipeType = typeAnswer.type;
                }
                
                // Get recipe and show features
                const recipe = await recipeManager.getRecipe(recipeType);
                if (!recipe) {
                    throw new Error(`Recipe not found: ${recipeType}`);
                }
                
                if (recipe.features.length > 0) {
                    const featureChoices = recipe.features.map(f => ({
                        name: `${f.name} - ${f.description}`,
                        value: f.name,
                        checked: f.default
                    }));
                    
                    const featureAnswer = await inquirer.default.prompt([{
                        type: 'checkbox',
                        name: 'features',
                        message: 'Select features to enable:',
                        choices: featureChoices
                    }]);
                    enabledFeatures = featureAnswer.features;
                }
            } else {
                // Parse features from command line
                enabledFeatures = options.features ? 
                    options.features.split(',').map((f: string) => f.trim()) : 
                    [];
            }
            
            if (!recipeType) {
                throw new Error('Recipe type is required. Use --type or --interactive');
            }
            
            const recipe = await recipeManager.getRecipe(recipeType);
            if (!recipe) {
                throw new Error(`Recipe not found: ${recipeType}`);
            }
            
            // If no features specified, use defaults
            if (enabledFeatures.length === 0) {
                enabledFeatures = recipe.features
                    .filter(f => f.default)
                    .map(f => f.name);
            }
            
            const customization: RecipeCustomization = {
                recipeId: recipeType,
                enabledFeatures,
                businessName: options.name,
                businessDescription: `${recipe.description} with features: ${enabledFeatures.join(', ')}`
            };
            
            if (options.preview) {
                // Preview mode - show what would be generated
                const domainModel = await recipeManager.generateBusinessContext(recipeType, customization);
                
                if (options.json) {
                    console.log(JSON.stringify(domainModel, null, 2));
                } else {
                    console.log(chalk.blue('📋 Recipe Preview:'));
                    console.log(chalk.cyan(`Business Type: ${domainModel.businessType}`));
                    console.log(chalk.cyan(`Entities: ${Object.keys(domainModel.entities).join(', ')}`));
                    console.log(chalk.cyan(`Features: ${enabledFeatures.join(', ')}`));
                    
                    if (domainModel.workflows && domainModel.workflows.length > 0) {
                        console.log(chalk.cyan(`Workflows: ${domainModel.workflows.map(w => w.name).join(', ')}`));
                    }
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
            const domainModel = await recipeManager.generateBusinessContext(recipeType, customization);
            
            // Initialize business context
            await manager.initialize(domainModel.description, customization.businessName);
            
            // Save the generated domain model
            const config = await manager.getCurrentConfiguration();
            config.entities = domainModel.entities;
            config.workflows = domainModel.workflows;
            config.businessRules = domainModel.businessRules;
            await manager.saveConfiguration(config);
            
            if (options.json) {
                console.log(JSON.stringify({
                    success: true,
                    recipe: recipeType,
                    businessType: domainModel.businessType,
                    entities: Object.keys(domainModel.entities),
                    features: enabledFeatures,
                    configPath: manager.getConfigurationPath()
                }, null, 2));
            } else {
                console.log(chalk.green('✅ Business context created from recipe!'));
                console.log(chalk.cyan(`Recipe: ${recipe.name}`));
                console.log(chalk.cyan(`Business Type: ${domainModel.businessType}`));
                console.log(chalk.cyan(`Entities: ${Object.keys(domainModel.entities).join(', ')}`));
                console.log(chalk.cyan(`Features: ${enabledFeatures.join(', ')}`));
                console.log(chalk.yellow(`Config: ${manager.getConfigurationPath()}`));
                
                console.log(chalk.blue('\n🎯 Next steps:'));
                console.log('  • Run "imajin config show" to see your configuration');
                console.log('  • Run "imajin stripe payment create --amount 1000" to test integration');
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to setup from recipe:'), error);
            process.exit(1);
        }
    });
```

### 4. **Recipe Templates**

**Core Recipe: Coffee Shop**
```yaml
# src/templates/business-recipes/core/coffee-shop.yaml
name: "Coffee Shop"
description: "Complete setup for coffee shops with POS, inventory, and customer management"
category: "core"
tags: ["food-service", "retail", "pos", "inventory"]
version: "1.0.0"

features:
  - name: "loyalty_program"
    description: "Customer loyalty and rewards system"
    default: true
  - name: "inventory_management"
    description: "Stock tracking and automated reordering"
    default: true
  - name: "table_service"
    description: "Table reservations and order tracking"
    default: false
  - name: "delivery_service"
    description: "Delivery and pickup order management"
    default: false

entities:
  customer:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "email"
        type: "string"
        required: false
      - name: "phone"
        type: "string"
        required: false
      - name: "loyalty_points"
        type: "number"
        default: 0
        feature: "loyalty_program"
    relationships:
      - type: "hasMany"
        entity: "order"
        
  product:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "category"
        type: "enum"
        values: ["beverage", "food", "retail"]
        required: true
      - name: "price"
        type: "number"
        required: true
      - name: "stock_level"
        type: "number"
        default: 0
        feature: "inventory_management"
    
  order:
    fields:
      - name: "customer_id"
        type: "string"
        required: false
      - name: "items"
        type: "array"
        items: "order_item"
        required: true
      - name: "total"
        type: "number"
        required: true
      - name: "status"
        type: "enum"
        values: ["pending", "preparing", "ready", "completed"]
        required: true
      - name: "table_number"
        type: "number"
        required: false
        feature: "table_service"
      - name: "delivery_address"
        type: "object"
        required: false
        feature: "delivery_service"

workflows:
  - name: "Order Processing"
    description: "From order to completion"
    steps:
      - "Order placed"
      - "Payment processed"  
      - "Preparation started"
      - "Order ready"
      - "Order completed"

businessRules:
  - rule: "Loyalty points: 1 point per $1 spent"
    feature: "loyalty_program"
    priority: "medium"
  - rule: "Reorder when stock < 10 units"
    feature: "inventory_management"
    priority: "high"

integrations:
  stripe:
    enabled: true
    entities: ["customer", "payment"]
  square:
    enabled: false
    entities: ["customer", "payment", "inventory"]
```

**Specialized Recipe: SaaS Platform**
```yaml
# src/templates/business-recipes/specialized/saas.yaml
name: "SaaS Platform"
description: "Complete setup for software-as-a-service businesses"
category: "specialized"
tags: ["saas", "subscriptions", "users", "billing"]
version: "1.0.0"

features:
  - name: "team_management"
    description: "Multi-user team collaboration"
    default: true
  - name: "usage_tracking"
    description: "Track feature usage and limits"
    default: true
  - name: "api_access"
    description: "API keys and developer access"
    default: false
  - name: "white_label"
    description: "White-label customization"
    default: false

entities:
  user:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "email"
        type: "string"
        required: true
      - name: "role"
        type: "enum"
        values: ["owner", "admin", "user", "viewer"]
        required: true
      - name: "last_login"
        type: "date"
        required: false
      - name: "usage_stats"
        type: "object"
        required: false
        feature: "usage_tracking"
    relationships:
      - type: "belongsTo"
        entity: "organization"
        
  organization:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "plan"
        type: "enum"
        values: ["free", "starter", "professional", "enterprise"]
        required: true
      - name: "billing_email"
        type: "string"
        required: true
      - name: "custom_branding"
        type: "object"
        required: false
        feature: "white_label"
    relationships:
      - type: "hasMany"
        entity: "user"
      - type: "hasOne" 
        entity: "subscription"
        
  subscription:
    fields:
      - name: "organization_id"
        type: "string"
        required: true
      - name: "plan"
        type: "string"
        required: true
      - name: "status"
        type: "enum"
        values: ["active", "cancelled", "past_due", "trialing"]
        required: true
      - name: "current_period_start"
        type: "date"
        required: true
      - name: "current_period_end"
        type: "date" 
        required: true
      - name: "usage_limits"
        type: "object"
        required: false
        feature: "usage_tracking"

workflows:
  - name: "User Onboarding"
    description: "New user signup and activation"
    steps:
      - "User registration"
      - "Email verification"
      - "Organization setup"
      - "Plan selection"
      - "Onboarding completed"
      
  - name: "Subscription Management"
    description: "Billing and subscription changes"
    steps:
      - "Plan change requested"
      - "Billing updated"
      - "Access permissions updated"
      - "User notified"

businessRules:
  - rule: "Free plan limited to 2 users"
    priority: "high"
  - rule: "Usage limits enforced in real-time"
    feature: "usage_tracking"
    priority: "high"
  - rule: "API rate limits based on plan"
    feature: "api_access"
    priority: "medium"

integrations:
  stripe:
    enabled: true
    entities: ["user", "organization", "subscription"]
  intercom:
    enabled: false
    entities: ["user", "organization"]
  mixpanel:
    enabled: false
    entities: ["user"]
```

### 5. **Testing Framework**

**Recipe Validation Tests:**
```typescript
// src/test/context/RecipeManager.test.ts
import { RecipeManager } from '../../context/RecipeManager.js';
import { BusinessContextManager } from '../../context/BusinessContextManager.js';

describe('RecipeManager', () => {
    let recipeManager: RecipeManager;
    
    beforeEach(() => {
        recipeManager = new RecipeManager();
    });
    
    describe('Recipe Loading', () => {
        it('should load all available recipes', async () => {
            const recipes = await recipeManager.listRecipes();
            expect(recipes.length).toBeGreaterThan(0);
            
            // Verify required fields
            for (const recipe of recipes) {
                expect(recipe.name).toBeDefined();
                expect(recipe.description).toBeDefined();
                expect(recipe.entities).toBeDefined();
                expect(Object.keys(recipe.entities).length).toBeGreaterThan(0);
            }
        });
        
        it('should validate recipe schemas', async () => {
            const recipes = await recipeManager.listRecipes();
            
            for (const recipe of recipes) {
                const validation = await recipeManager.validateRecipe(recipe);
                expect(validation.valid).toBe(true);
                
                if (validation.errors.length > 0) {
                    console.warn(`Recipe ${recipe.name} has errors:`, validation.errors);
                }
            }
        });
    });
    
    describe('Business Context Generation', () => {
        it('should generate valid business context from coffee-shop recipe', async () => {
            const customization = {
                recipeId: 'coffee-shop',
                enabledFeatures: ['loyalty_program', 'inventory_management'],
                businessName: 'Test Coffee Shop'
            };
            
            const domainModel = await recipeManager.generateBusinessContext(
                'coffee-shop', 
                customization
            );
            
            expect(domainModel.businessType).toBe('coffee-shop');
            expect(domainModel.entities.customer).toBeDefined();
            expect(domainModel.entities.product).toBeDefined();
            expect(domainModel.entities.order).toBeDefined();
            
            // Verify loyalty program feature is included
            const customerFields = domainModel.entities.customer.fields;
            const loyaltyField = customerFields.find((f: any) => f.name === 'loyalty_points');
            expect(loyaltyField).toBeDefined();
        });
        
        it('should filter features correctly', async () => {
            const customization = {
                recipeId: 'coffee-shop',
                enabledFeatures: ['loyalty_program'], // Only loyalty program
                businessName: 'Test Coffee Shop'
            };
            
            const domainModel = await recipeManager.generateBusinessContext(
                'coffee-shop',
                customization
            );
            
            // Should have loyalty_points field
            const customerFields = domainModel.entities.customer.fields;
            const loyaltyField = customerFields.find((f: any) => f.name === 'loyalty_points');
            expect(loyaltyField).toBeDefined();
            
            // Should NOT have inventory management fields
            const productFields = domainModel.entities.product.fields;
            const stockField = productFields.find((f: any) => f.name === 'stock_level');
            expect(stockField).toBeUndefined();
        });
    });
});
```

---

## COMMUNITY CONTRIBUTION SYSTEM

### **GitHub-Based Recipe Contributions**

**Contribution Workflow:**
1. **Recipe Submission**: Users submit recipes via GitHub Pull Requests to `src/templates/business-recipes/community/`
2. **Automated Validation**: CI/CD pipeline runs recipe validation tests
3. **Community Review**: Core maintainers and community review submissions
4. **Recipe Publishing**: Approved recipes are merged and available via CLI

**Community Recipe Directory Structure:**
```
src/templates/business-recipes/community/
├── README.md                    # Contribution guidelines
├── TEMPLATE.yaml               # Template for new recipes
├── blog.yaml                   # Community-contributed blog recipe
├── artist-portfolio.yaml      # Artist portfolio with sales
├── podcast.yaml               # Podcast with sponsorships
├── online-course.yaml         # Educational content platform
├── event-management.yaml      # Event planning and ticketing
├── nonprofit.yaml             # Nonprofit organization management
└── [more-community-recipes...]
```

**Blog Recipe Example:**
```yaml
# src/templates/business-recipes/community/blog.yaml
name: "Blog Platform"
description: "Content management system for bloggers with monetization features"
category: "content"
tags: ["blog", "content", "cms", "monetization"]
version: "1.0.0"
author: "community@imajin.dev"
contributors: ["@blogmaster", "@contentcreator"]

features:
  - name: "newsletter"
    description: "Email newsletter subscription management"
    default: true
    entities: ["subscriber", "newsletter_campaign"]
  - name: "premium_content"
    description: "Paid subscription content"
    default: false
    entities: ["subscription", "premium_post"]
  - name: "affiliate_marketing"
    description: "Affiliate link tracking and commissions"
    default: false
    entities: ["affiliate_link", "commission"]
  - name: "comment_system"
    description: "Reader comments and moderation"
    default: true
    entities: ["comment", "moderation_queue"]

entities:
  post:
    fields:
      - name: "title"
        type: "string"
        required: true
      - name: "content"
        type: "text"
        required: true
      - name: "slug"
        type: "string"
        required: true
        unique: true
      - name: "status"
        type: "enum"
        values: ["draft", "published", "archived"]
        default: "draft"
      - name: "featured_image"
        type: "string"
        required: false
      - name: "tags"
        type: "array"
        items: "string"
      - name: "is_premium"
        type: "boolean"
        default: false
        feature: "premium_content"
      - name: "published_at"
        type: "date"
        required: false
    relationships:
      - type: "hasMany"
        entity: "comment"
        feature: "comment_system"

  author:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "email"
        type: "string"
        required: true
      - name: "bio"
        type: "text"
        required: false
      - name: "avatar"
        type: "string"
        required: false
      - name: "social_links"
        type: "object"
        properties:
          twitter: "string"
          instagram: "string"
          linkedin: "string"
    relationships:
      - type: "hasMany"
        entity: "post"

  subscriber:
    fields:
      - name: "email"
        type: "string"
        required: true
        unique: true
      - name: "name"
        type: "string"
        required: false
      - name: "subscribed_at"
        type: "date"
        required: true
      - name: "status"
        type: "enum"
        values: ["active", "unsubscribed", "bounced"]
        default: "active"
      - name: "subscription_type"
        type: "enum"
        values: ["free", "premium"]
        default: "free"
        feature: "premium_content"

workflows:
  - name: "Content Publishing"
    description: "From draft to published post"
    steps:
      - "Create draft post"
      - "Review and edit"
      - "Schedule or publish"
      - "Notify subscribers"
      - "Track engagement"

integrations:
  mailchimp:
    enabled: true
    entities: ["subscriber", "newsletter_campaign"]
    feature: "newsletter"
  stripe:
    enabled: false
    entities: ["subscriber", "subscription"]
    feature: "premium_content"
```

**Artist Portfolio Recipe Example:**
```yaml
# src/templates/business-recipes/community/artist-portfolio.yaml
name: "Artist Portfolio with Sales"
description: "Professional portfolio with e-commerce for artists and creators"
category: "creative"
tags: ["art", "portfolio", "sales", "gallery", "creative"]
version: "1.0.0"
author: "community@imajin.dev"
contributors: ["@artcreator", "@galleryowner"]

features:
  - name: "print_sales"
    description: "Sell prints and physical artwork"
    default: true
    entities: ["print_option", "shipping_method"]
  - name: "digital_downloads"
    description: "Sell digital artwork and files"
    default: true
    entities: ["digital_product"]
  - name: "commission_requests"
    description: "Custom artwork commissions"
    default: false
    entities: ["commission_request", "commission_quote"]
  - name: "exhibition_management"
    description: "Gallery shows and exhibitions"
    default: false
    entities: ["exhibition", "venue"]

entities:
  artwork:
    fields:
      - name: "title"
        type: "string"
        required: true
      - name: "description"
        type: "text"
        required: false
      - name: "medium"
        type: "string"
        required: true
      - name: "dimensions"
        type: "string"
        required: false
      - name: "year_created"
        type: "number"
        required: false
      - name: "price"
        type: "number"
        required: false
      - name: "status"
        type: "enum"
        values: ["available", "sold", "on_hold", "not_for_sale"]
        default: "available"
      - name: "images"
        type: "array"
        items: "string"
        required: true
      - name: "categories"
        type: "array"
        items: "string"
      - name: "is_digital"
        type: "boolean"
        default: false
        feature: "digital_downloads"
    relationships:
      - type: "hasMany"
        entity: "print_option"
        feature: "print_sales"

  customer:
    fields:
      - name: "name"
        type: "string"
        required: true
      - name: "email"
        type: "string"
        required: true
      - name: "phone"
        type: "string"
        required: false
      - name: "shipping_address"
        type: "object"
        required: false
        feature: "print_sales"
      - name: "purchase_history"
        type: "array"
        items: "purchase"
        required: false
    relationships:
      - type: "hasMany"
        entity: "order"

  order:
    fields:
      - name: "customer_id"
        type: "string"
        required: true
      - name: "items"
        type: "array"
        items: "order_item"
        required: true
      - name: "total"
        type: "number"
        required: true
      - name: "status"
        type: "enum"
        values: ["pending", "processing", "shipped", "delivered", "cancelled"]
        default: "pending"
      - name: "shipping_method"
        type: "string"
        required: false
        feature: "print_sales"
      - name: "tracking_number"
        type: "string"
        required: false
        feature: "print_sales"

workflows:
  - name: "Artwork Sale Process"
    description: "From artwork selection to delivery"
    steps:
      - "Customer selects artwork"
      - "Choose print options (if applicable)"
      - "Payment processing"
      - "Order fulfillment"
      - "Shipping notification"
      - "Delivery confirmation"

  - name: "Commission Process"
    description: "Custom artwork commission workflow"
    feature: "commission_requests"
    steps:
      - "Commission inquiry"
      - "Quote and timeline"
      - "Deposit payment"
      - "Creation process"
      - "Client approval"
      - "Final payment"
      - "Delivery"

integrations:
  stripe:
    enabled: true
    entities: ["customer", "order"]
  printful:
    enabled: false
    entities: ["artwork", "print_option"]
    feature: "print_sales"
  etsy:
    enabled: false
    entities: ["artwork", "customer", "order"]
```

**Community Contribution Guidelines:**
```markdown
# Contributing Business Recipes

## Recipe Submission Process

1. **Fork Repository**: Fork the imajin-cli repository
2. **Create Recipe**: Use `TEMPLATE.yaml` in `community/` directory
3. **Test Recipe**: Run validation tests locally
4. **Submit PR**: Create pull request with recipe and tests
5. **Review Process**: Community and maintainer review
6. **Merge**: Approved recipes are merged and published

## Recipe Requirements

- **Unique Business Type**: Recipe should address a distinct business model
- **Complete Entity Model**: Include all essential entities and relationships  
- **Feature Flags**: Use features for optional functionality
- **Workflow Definition**: Define key business processes
- **Integration Support**: Include relevant third-party integrations
- **Proper Documentation**: Clear descriptions and examples

## Quality Standards

- Schema validation must pass
- Recipe must generate functional business context
- Include test cases for the recipe
- Follow naming conventions and file structure
- Provide real-world examples and use cases

## Recognition

Contributors are credited in:
- Recipe YAML files (`contributors` field)
- Community contributors page
- Release notes for major versions
```

### **Recipe Discovery and Installation**

**Enhanced CLI Commands:**
```bash
# List all recipes (core + community)
imajin recipes list
imajin recipes list --category creative
imajin recipes list --tags ecommerce,inventory

# Preview recipe details
imajin recipes show blog
imajin recipes show artist-portfolio --features

# Install from community recipes
imajin init recipe --type blog --features newsletter,premium_content
imajin init recipe --type artist-portfolio --features print_sales,commissions

# Interactive recipe browser
imajin recipes browse
```

**Recipe Marketplace UI:**
```
╭─────────────────────────────────────────────────────────────╮
│                   📚 Recipe Marketplace                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏪 CORE RECIPES                                            │
│    • coffee-shop        Coffee shops with POS & inventory   │
│    • restaurant         Full-service restaurant management  │ 
│    • saas              Software-as-a-service platform      │
│    • ecommerce         Online store with catalog & orders  │
│                                                             │
│  🎨 CREATIVE (Community)                                    │
│    • blog              Content platform with monetization  │
│    • artist-portfolio  Art sales and commission management │
│    • podcast           Audio content with sponsorships     │
│                                                             │
│  📈 BUSINESS SERVICES                                       │
│    • consulting        Professional service management     │
│    • agency            Creative agency project tracking    │
│    • real-estate       Property listings and transactions │
│                                                             │
│  🎓 EDUCATION & CONTENT                                     │
│    • online-course     Educational platform with payments │
│    • nonprofit         Donation and volunteer management   │
│                                                             │
│  [↑/↓] Navigate  [Enter] Preview  [Space] Select  [Q] Quit  │
╰─────────────────────────────────────────────────────────────╯
```

---

## BUSINESS CONTEXT VALIDATION & USER ONBOARDING

### **Critical UX Issue: Silent Command Failures**

**Current Problem:**
Commands that require business context fail with cryptic errors when context is not initialized:
```bash
$ imajin stripe payment create --amount 1000 --currency usd
Error: Business context not initialized
```

**Required Solution:**
Implement proactive business context validation with helpful user guidance.

### **Business Context Validation System**

**CLI Validation Middleware:**
```typescript
// src/middleware/BusinessContextValidator.ts
import { BusinessContextManager } from '../context/BusinessContextManager.js';
import { RecipeManager } from '../context/RecipeManager.js';
import chalk from 'chalk';

export class BusinessContextValidator {
    private contextManager: BusinessContextManager;
    private recipeManager: RecipeManager;
    
    constructor() {
        this.contextManager = new BusinessContextManager();
        this.recipeManager = new RecipeManager();
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
        if (command.startsWith('init') || command === 'help' || command === 'recipes') {
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
            await this.showOnboardingGuidance();
            return false;
        }
        
        return true;
    }
    
    /**
     * Show helpful onboarding guidance when context is missing
     */
    private async showOnboardingGuidance(): Promise<void> {
        console.log(chalk.red('\n❌ Business context not initialized'));
        console.log(chalk.yellow('\n🚀 Get started by setting up your business context:\n'));
        
        // Show available recipes
        const recipes = await this.recipeManager.listRecipes();
        const popularRecipes = recipes.slice(0, 5);
        
        console.log(chalk.cyan('📚 Quick Setup with Recipes:'));
        for (const recipe of popularRecipes) {
            console.log(chalk.gray(`   imajin init recipe --type ${recipe.id}`));
        }
        
        console.log(chalk.cyan('\n🎯 Custom Business Setup:'));
        console.log(chalk.gray('   imajin init setup --business "Your business description"'));
        
        console.log(chalk.cyan('\n🔍 Browse All Recipes:'));
        console.log(chalk.gray('   imajin recipes list'));
        console.log(chalk.gray('   imajin recipes browse'));
        
        console.log(chalk.yellow('\n💡 Once initialized, you can run any command!\n'));
    }
}
```

**CLI Integration:**
```typescript
// src/cli/ImajinCLI.ts
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

### **Enhanced First-Run Experience**

**Welcome Message for New Users:**
```typescript
// src/cli/WelcomeMessage.ts
export class WelcomeMessage {
    static async showFirstRunWelcome(): Promise<void> {
        console.log(chalk.blue(`
╭─────────────────────────────────────────────────────────────╮
│                  🎉 Welcome to Imajin CLI!                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Let's set up your business context to get started.        │
│                                                             │
│  Choose your setup method:                                  │
│                                                             │
│  🍯 Quick Recipe Setup (Recommended)                       │
│     imajin recipes browse                                   │
│                                                             │
│  ⚡ Popular Recipes:                                        │
│     imajin init recipe --type coffee-shop                  │
│     imajin init recipe --type saas                         │
│     imajin init recipe --type ecommerce                    │
│                                                             │
│  ✏️  Custom Setup:                                          │
│     imajin init setup --business "Your description"        │
│                                                             │
│  📚 Learn More:                                             │
│     imajin help                                             │
│                                                             │
╰─────────────────────────────────────────────────────────────╯
        `));
    }
}
```

**Smart Command Suggestions:**
```typescript
// Enhanced error messages with contextual suggestions
export class SmartErrorHandler {
    static handleBusinessContextError(attemptedCommand: string): void {
        console.log(chalk.red(`\n❌ Cannot run "${attemptedCommand}" - business context required`));
        
        // Suggest relevant recipes based on attempted command
        if (attemptedCommand.includes('stripe')) {
            console.log(chalk.yellow('\n💡 For payment processing, try:'));
            console.log(chalk.gray('   imajin init recipe --type ecommerce'));
            console.log(chalk.gray('   imajin init recipe --type coffee-shop'));
            console.log(chalk.gray('   imajin init recipe --type saas'));
        } else if (attemptedCommand.includes('database')) {
            console.log(chalk.yellow('\n💡 For database operations, initialize any business context:'));
            console.log(chalk.gray('   imajin recipes browse'));
        }
        
        console.log(chalk.cyan('\n🚀 Quick start: imajin recipes browse\n'));
    }
}
```

### **Business Context Status Commands**

**New CLI Commands for Context Management:**
```bash
# Check current business context status
imajin status
imajin context status

# Show current business context details
imajin context show
imajin context info

# Reinitialize or update business context
imajin context reset
imajin context update

# Validate current business context
imajin context validate
```

**Status Command Output:**
```
$ imajin status

╭─────────────────────────────────────────────────────────────╮
│                    📊 Imajin CLI Status                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Business Context: coffee-shop                           │
│  📍 Config Location: ~/.imajin/business-context.yaml       │
│  🏗️  Entities: customer, product, order, payment           │
│  🔧 Features: loyalty_program, inventory_management         │
│  🔗 Integrations: stripe (configured)                      │
│                                                             │
│  🎯 Available Commands:                                     │
│     • imajin stripe payment create                         │
│     • imajin generate api                                  │
│     • imajin database migrate                              │
│                                                             │
╰─────────────────────────────────────────────────────────────╯
```

### **Implementation Priority**

**Phase 1: Critical Validation (Immediate)**
1. Add `BusinessContextValidator` middleware to CLI
2. Implement validation for context-dependent commands
3. Show helpful error messages with recipe suggestions

**Phase 2: Enhanced UX (Next)**
1. Add first-run welcome message
2. Implement `imajin status` command
3. Add smart command suggestions based on attempted operations

**Phase 3: Advanced Features (Later)**
1. Context update and reset functionality
2. Interactive context repair/validation
3. Context migration tools for recipe updates

### **Testing Requirements**

**Validation Tests:**
```typescript
describe('BusinessContextValidator', () => {
    it('should allow init commands without context', async () => {
        const validator = new BusinessContextValidator();
        const result = await validator.validateBusinessContext('init recipe --type coffee-shop');
        expect(result).toBe(true);
    });
    
    it('should block stripe commands without context', async () => {
        const validator = new BusinessContextValidator();
        const result = await validator.validateBusinessContext('stripe payment create');
        expect(result).toBe(false);
    });
    
    it('should show helpful guidance when context missing', async () => {
        // Test that onboarding guidance is displayed
        // Test that recipe suggestions are shown
        // Test that command examples are provided
    });
});
```
            expect(stockField).toBeUndefined();
        });
    });
    
    describe('Integration with BusinessContextManager', () => {
        it('should create complete business context configuration', async () => {
            const manager = new BusinessContextManager();
            const customization = {
                recipeId: 'saas',
                enabledFeatures: ['team_management', 'usage_tracking'],
                businessName: 'Test SaaS Company'
            };
            
            const domainModel = await recipeManager.generateBusinessContext(
                'saas',
                customization  
            );
            
            // Should be able to initialize business context
            const config = await manager.initialize(domainModel.description, customization.businessName);
            
            expect(config.business.type).toBe('saas');
            expect(config.entities.user).toBeDefined();
            expect(config.entities.organization).toBeDefined();
            expect(config.entities.subscription).toBeDefined();
        });
    });
});
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (1-2 hours)
- [ ] Create recipe directory structure
- [ ] Implement RecipeManager class
- [ ] Create recipe validation system
- [ ] Write basic recipe schema

### Phase 2: Core Recipes (1 hour)
- [ ] Create coffee-shop.yaml recipe
- [ ] Create saas.yaml recipe  
- [ ] Create restaurant.yaml recipe
- [ ] Create ecommerce.yaml recipe

### Phase 3: CLI Integration (1 hour)
- [ ] Add recipe commands to BusinessContextCommands
- [ ] Implement interactive recipe selection
- [ ] Add recipe preview functionality
- [ ] Update help documentation

### Phase 4: Testing & Validation (30 minutes)
- [ ] Write recipe manager tests
- [ ] Create recipe validation tests
- [ ] Test end-to-end recipe → business context flow
- [ ] Validate generated business contexts work with services

---

## EXPECTED OUTCOMES

**✅ User Experience Improvements:**
- One-command business setup: `imajin init recipe --type coffee-shop`
- Interactive recipe selection with feature customization
- Preview mode to see what will be generated
- Extensible recipe system for new business types

**✅ Developer Experience:**
- YAML-based recipe templates (easy to create/modify)
- Feature-flag system for optional functionality
- Recipe validation and testing framework
- Clear separation between core and specialized templates

**✅ System Integration:**
- Recipes generate proper BusinessDomainModel objects
- Full compatibility with existing business context system
- Service integrations work seamlessly with recipe-generated contexts
- Backward compatibility with description-based initialization

---

## NOTES

- Recipe system should complement, not replace, description-based initialization
- Templates should be business-focused, not service-focused (avoid tight coupling to Stripe/etc)
- Feature system allows recipes to be flexible without becoming overwhelming
- Interactive mode provides guided experience for non-technical users
- Recipe validation ensures quality and prevents broken templates
</rewritten_file> 