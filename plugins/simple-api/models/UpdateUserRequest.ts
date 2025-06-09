/**
 * UpdateUserRequest - 
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/SimpleApi/models
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

export interface UpdateUserRequest {
    /**
     * Username
     */
    username?: string;
    /**
     * User email address
     */
    email?: string;
    /**
     * User&#x27;s first name
     */
    firstName?: string;
    /**
     * User&#x27;s last name
     */
    lastName?: string;
    /**
     * Whether the user account is active
     */
    isActive?: boolean;
}