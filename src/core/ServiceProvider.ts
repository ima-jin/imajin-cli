/**
 * ServiceProvider - Base class for service providers
 * 
 * @package     @imajin/cli
 * @subpackage  core
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-13
 * @updated      2025-07-03
 */

/**
 * Base class for service providers
 */
export abstract class ServiceProvider {
    /**
     * Register services with the container
     */
    public abstract register(): Promise<void>;

    /**
     * Boot the service provider
     */
    public abstract boot(): Promise<void>;
} 