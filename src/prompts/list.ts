/**
 * Prompts List - Dynamic prompt definitions for graph model operations
 * 
 * @package     @imajin/cli
 * @subpackage  prompts
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-12
 */

import { ModelFactory } from '../etl/graphs/models.js';
import { GraphModel } from '../etl/core/interfaces.js';

export interface PromptDefinition {
    id: string;
    name: string;
    description: string;
    modelType: string;
    modelVersion: string;
    template: string;
    variables: string[];
    metadata?: Record<string, any>;
}

export class PromptRegistry {
    private static instance: PromptRegistry;
    private prompts: Map<string, PromptDefinition> = new Map();

    private constructor() {}

    public static getInstance(): PromptRegistry {
        if (!PromptRegistry.instance) {
            PromptRegistry.instance = new PromptRegistry();
        }
        return PromptRegistry.instance;
    }

    public registerPrompt(definition: PromptDefinition): void {
        if (!definition.id || !definition.modelType || !definition.modelVersion) {
            throw new Error('Invalid prompt definition: id, modelType, and modelVersion are required');
        }

        // Verify that the model exists
        if (!ModelFactory.isModelRegistered(definition.modelType, definition.modelVersion)) {
            throw new Error(`Model ${definition.modelType}@${definition.modelVersion} not found`);
        }

        this.prompts.set(definition.id, definition);
    }

    public getPrompt(id: string): PromptDefinition | undefined {
        return this.prompts.get(id);
    }

    public getPromptsForModel(modelType: string, modelVersion?: string): PromptDefinition[] {
        return Array.from(this.prompts.values()).filter(prompt => {
            if (modelVersion) {
                return prompt.modelType === modelType && prompt.modelVersion === modelVersion;
            }
            return prompt.modelType === modelType;
        });
    }

    public getAllPrompts(): PromptDefinition[] {
        return Array.from(this.prompts.values());
    }

    public unregisterPrompt(id: string): boolean {
        return this.prompts.delete(id);
    }
}

// Default prompts for common operations
export const registerDefaultPrompts = () => {
    const registry = PromptRegistry.getInstance();

    // Social Commerce Prompts
    registry.registerPrompt({
        id: 'social-commerce-product-description',
        name: 'Product Description Generator',
        description: 'Generates SEO-optimized product descriptions',
        modelType: 'social-commerce',
        modelVersion: '1.0.0',
        template: 'Generate a compelling product description for {productName} in the {category} category. Include key features: {features}. Target audience: {audience}.',
        variables: ['productName', 'category', 'features', 'audience']
    });

    // Creative Portfolio Prompts
    registry.registerPrompt({
        id: 'creative-portfolio-artwork-description',
        name: 'Artwork Description Generator',
        description: 'Generates artistic descriptions for portfolio pieces',
        modelType: 'creative-portfolio',
        modelVersion: '1.0.0',
        template: 'Create an evocative description for {artworkTitle}, a {medium} piece created in {year}. Style: {style}. Theme: {theme}.',
        variables: ['artworkTitle', 'medium', 'year', 'style', 'theme']
    });

    // Professional Network Prompts
    registry.registerPrompt({
        id: 'professional-network-profile-summary',
        name: 'Professional Profile Summary',
        description: 'Generates professional profile summaries',
        modelType: 'professional-network',
        modelVersion: '1.0.0',
        template: 'Write a professional summary for a {role} with {yearsExperience} years of experience. Skills: {skills}. Achievements: {achievements}.',
        variables: ['role', 'yearsExperience', 'skills', 'achievements']
    });

    // Community Hub Prompts
    registry.registerPrompt({
        id: 'community-hub-group-description',
        name: 'Group Description Generator',
        description: 'Generates engaging group descriptions',
        modelType: 'community-hub',
        modelVersion: '1.0.0',
        template: 'Create an engaging description for a {category} group called {groupName}. Purpose: {purpose}. Target members: {targetMembers}.',
        variables: ['category', 'groupName', 'purpose', 'targetMembers']
    });
};

// Export the registry instance
export const promptRegistry = PromptRegistry.getInstance(); 