/**
 * Model Service Provider - Registers and initializes the model system
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 */

import { ServiceProvider } from '../core/ServiceProvider.js';
import { registerStandardModels } from '../etl/graphs/model-definitions.js';
import { registerDefaultPrompts } from '../prompts/list.js';

export class ModelServiceProvider extends ServiceProvider {
    public async register(): Promise<void> {
        // Register standard models
        registerStandardModels();

        // Register default prompts
        registerDefaultPrompts();
    }

    public async boot(): Promise<void> {
        // Any additional bootstrapping logic can go here
    }
} 