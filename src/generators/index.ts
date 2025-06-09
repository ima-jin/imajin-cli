/**
 * Plugin Generator Module - Export all generator components
 * 
 * @package     @imajin/cli
 * @subpackage  generators
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 */

// Core generator classes
export { DefaultOpenAPIParser } from './OpenAPIParser.js';
export { DefaultPluginGenerator } from './PluginGenerator.js';

// Template engine
export { TemplateEngine } from './templates/TemplateEngine.js';

// Templates
export {
    COMMAND_TEMPLATE, MODEL_TEMPLATE,
    PLUGIN_CONFIG_TEMPLATE, SERVICE_TEMPLATE
} from './templates/command.template.js';

// Types
export type {
    AuthConfig, CommandDefinition, GeneratedPlugin, ModelDefinition, OAuth2FlowConfig, OpenAPIParser, OpenAPISpec, ParameterDefinition, ParsedOpenAPI, PluginFile, PluginGenerator, PropertyDefinition, RequestBodyDefinition,
    ResponseDefinition, TemplateContext, ValidationResult
} from './types.js';

