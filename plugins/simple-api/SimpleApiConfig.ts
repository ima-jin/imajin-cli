/**
 * SimpleApi Plugin Configuration
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/SimpleApi
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

export const SimpleApiConfig = {
    name: 'SimpleApi',
    version: '1.0.0',
    description: 'A simple API for demonstration purposes',
    baseUrl: 'https://api.simple.com/v1',
    authType: 'bearer' as const,
    authConfig: {
        type: 'bearer',
        bearerFormat: 'JWT',
    },
    commands: [
        'listUsers',
        'createUser',
        'getUserById',
        'updateUser',
        'deleteUser',
        'listPosts'
    ]
};