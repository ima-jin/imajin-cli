/**
 * RecipeManager - Manage business recipe templates and context generation
 * 
 * @package     @imajin/cli
 * @subpackage  context
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-07-03
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
        // Use absolute path resolution to avoid import.meta.url issues
        // This works in both ES modules and CommonJS environments
        this.recipesDir = join(process.cwd(), 'src/templates/recipes');
    }

    /**
     * List all available recipes from files only
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
            // No recipes directory found - return empty array
            console.warn('No recipes directory found, no recipes available');
            return [];
        }
    }

    /**
     * Get recipe by business type from files only
     */
    async getRecipe(businessType: string): Promise<Recipe | null> {
        try {
            const filePath = join(this.recipesDir, `${businessType}.json`);
            const content = await readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            // No recipe file found - return null
            return null;
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
            businessRules: [], // Add missing property
            integrations: [], // Add missing property
            commands: [], // Add missing property
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
} 