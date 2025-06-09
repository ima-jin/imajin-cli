/**
 * SimpleApi Plugin - Generated plugin for A simple API for demonstration purposes
 * 
 * @package     @imajin/cli
 * @subpackage  plugins/simple-api
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     1.0.0
 * @since       2025-06-09
 */

// Service
export { SimpleApiService } from './SimpleApiService.js';

// Commands
export { ListUsersCommand } from './commands/ListUsersCommand.js';
export { CreateUserCommand } from './commands/CreateUserCommand.js';
export { GetUserByIdCommand } from './commands/GetUserByIdCommand.js';
export { UpdateUserCommand } from './commands/UpdateUserCommand.js';
export { DeleteUserCommand } from './commands/DeleteUserCommand.js';
export { ListPostsCommand } from './commands/ListPostsCommand.js';

// Models
export type { User } from './models/User.js';
export type { CreateUserRequest } from './models/CreateUserRequest.js';
export type { UpdateUserRequest } from './models/UpdateUserRequest.js';
export type { Post } from './models/Post.js';

// Configuration
export { SimpleApiConfig } from './SimpleApiConfig.js';
