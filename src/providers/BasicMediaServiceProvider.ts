/**
 * BasicMediaServiceProvider - Register basic media processing services
 * 
 * @package     @imajin/cli
 * @subpackage  providers
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * @see        docs/providers/media.md
 * 
 * Integration Points:
 * - Basic media command registration
 * - Simple file operations
 * - CLI integration
 */


import { MediaCommand } from '../commands/media/MediaCommand.js';
import { ServiceProvider } from './ServiceProvider.js';

export class BasicMediaServiceProvider extends ServiceProvider {
    /**
     * Register services with the container
     */
    public register(): void {
        // Register basic media command
        this.container.singleton('MediaCommand', () => {
            return new MediaCommand(this.container);
        });
    }

    /**
     * Bootstrap services after all providers have been registered
     */
    public boot(): void {
        // Services are already registered, no additional boot actions needed
        // Commands will be registered by Application.registerProviderCommands()
    }

    /**
     * Get the service provider name
     */
    public getName(): string {
        return 'BasicMediaServiceProvider';
    }

    /**
     * Get list of services this provider offers
     */
    public getServices(): string[] {
        return [
            'MediaCommand'
        ];
    }

    /**
     * Register CLI commands
     */
    public registerCommands(): void {
        const mediaCommand = this.container.resolve('MediaCommand') as MediaCommand;
        mediaCommand.register(this.program);
    }
} 