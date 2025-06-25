/**
 * RecipeManager - Manage business recipe templates and context generation
 * 
 * @package     @imajin/cli
 * @subpackage  context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-25
 *
 * Integration Points:
 * - Recipe template discovery and loading
 * - Business context generation from recipes
 * - Future: Role-based context views for identity-based switching
 * - Template fallback system for reliability
 */

import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
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
        // ES module equivalent of __dirname
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
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
        } as BusinessDomainModel;
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
            {
                name: "Coffee Shop",
                businessType: "coffee-shop",
                description: "Complete setup for coffee shops with POS and customer management",
                entities: {
                    customer: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "email", type: "string", required: false },
                            { name: "phone", type: "string", required: false },
                            { name: "loyaltyPoints", type: "number", default: 0 },
                            { name: "dietaryRestrictions", type: "array", items: "string", required: false }
                        ]
                    },
                    order: {
                        fields: [
                            { name: "items", type: "array", items: "orderItem", required: true },
                            { name: "total", type: "number", required: true },
                            { name: "status", type: "enum", values: ["pending", "preparing", "ready", "completed"], required: true },
                            { name: "customerName", type: "string", required: false }
                        ]
                    },
                    product: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "price", type: "number", required: true },
                            { name: "category", type: "enum", values: ["beverage", "food", "retail"], required: true }
                        ]
                    }
                },
                workflows: [
                    {
                        name: "Order Processing",
                        description: "From order to completion",
                        steps: ["Order placed", "Payment processed", "Preparation", "Order ready", "Completed"]
                    }
                ]
            },
            {
                name: "Restaurant",
                businessType: "restaurant",
                description: "Full-service restaurant with table management and reservations",
                entities: {
                    customer: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "email", type: "string", required: false },
                            { name: "phone", type: "string", required: false },
                            { name: "dietaryRestrictions", type: "array", items: "string", required: false },
                            { name: "favoriteTable", type: "number", required: false },
                            { name: "loyaltyPoints", type: "number", default: 0 }
                        ]
                    },
                    table: {
                        fields: [
                            { name: "number", type: "number", required: true },
                            { name: "section", type: "string", required: true },
                            { name: "capacity", type: "number", required: true },
                            { name: "status", type: "enum", values: ["available", "occupied", "reserved"], required: true }
                        ]
                    },
                    order: {
                        fields: [
                            { name: "table", type: "number", required: true },
                            { name: "items", type: "array", items: "menuItem", required: true },
                            { name: "total", type: "number", required: true },
                            { name: "status", type: "enum", values: ["ordered", "preparing", "ready", "served"], required: true }
                        ]
                    }
                }
            },
            {
                name: "E-commerce Store",
                businessType: "ecommerce",
                description: "Online store with product catalog and order management",
                entities: {
                    customer: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "email", type: "string", required: true },
                            { name: "shippingAddress", type: "object", required: false },
                            { name: "orderHistory", type: "array", items: "order", required: false }
                        ]
                    },
                    product: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "price", type: "number", required: true },
                            { name: "sku", type: "string", required: true },
                            { name: "inventory", type: "number", required: true },
                            { name: "category", type: "string", required: false }
                        ]
                    },
                    order: {
                        fields: [
                            { name: "customerId", type: "string", required: true },
                            { name: "items", type: "array", items: "orderItem", required: true },
                            { name: "total", type: "number", required: true },
                            { name: "status", type: "enum", values: ["pending", "processing", "shipped", "delivered"], required: true }
                        ]
                    }
                }
            },
            {
                name: "SaaS Platform",
                businessType: "saas",
                description: "Software-as-a-service with user management and subscriptions",
                entities: {
                    user: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "email", type: "string", required: true },
                            { name: "role", type: "enum", values: ["admin", "user", "viewer"], required: true },
                            { name: "lastLogin", type: "date", required: false }
                        ]
                    },
                    organization: {
                        fields: [
                            { name: "name", type: "string", required: true },
                            { name: "plan", type: "string", required: true },
                            { name: "billingEmail", type: "string", required: true }
                        ]
                    },
                    subscription: {
                        fields: [
                            { name: "organizationId", type: "string", required: true },
                            { name: "plan", type: "string", required: true },
                            { name: "status", type: "enum", values: ["active", "cancelled", "past_due"], required: true }
                        ]
                    }
                }
            }
        ];
    }

    private getFallbackRecipe(businessType: string): Recipe | null {
        const fallbacks = this.getFallbackRecipes();
        return fallbacks.find(r => r.businessType === businessType) || null;
    }
} 