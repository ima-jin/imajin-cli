/**
 * BusinessContextValidator - Validate business context before command execution
 * 
 * @package     @imajin/cli
 * @subpackage  middleware
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-25
 *
 * Integration Points:
 * - Command execution middleware for context validation
 * - Business context management integration
 * - User onboarding guidance and error recovery
 * - Recipe system discovery and recommendations
 */

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
        'database',
        'services',
        'workflow',
        'entity'
    ];
    
    /**
     * Validate business context before command execution
     */
    async validateBusinessContext(command: string): Promise<boolean> {
        // Skip validation for init commands and help
        if (command.startsWith('init') || command.startsWith('context') || 
            command.startsWith('recipe') || command === 'help' || 
            command === 'banner' || command === 'diagnose' || 
            command === 'list-services' || command === 'describe') {
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
        const hasContext = await this.contextManager.configurationExists();
        
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
        } else if (attemptedCommand.includes('api') || attemptedCommand.includes('services')) {
            console.log(chalk.cyan('🔗 For API integration:'));
            console.log(chalk.gray('   imajin init recipe --type saas'));
            console.log(chalk.gray('   imajin init recipe --type ecommerce'));
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
    
    /**
     * Check if business context has been initialized
     */
    async hasBusinessContext(): Promise<boolean> {
        return await this.contextManager.configurationExists();
    }
} 