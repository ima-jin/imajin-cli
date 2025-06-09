/**
 * Post - 
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/SimpleApi/models
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

export interface Post {
    /**
     * Unique post identifier
     */
    id?: string;
    /**
     * Post title
     */
    title?: string;
    /**
     * Post content
     */
    content?: string;
    /**
     * ID of the user who created the post
     */
    userId?: string;
    /**
     * When the post was created
     */
    createdAt?: string;
    /**
     * When the post was last updated
     */
    updatedAt?: string;
}