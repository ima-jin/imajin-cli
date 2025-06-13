/**
 * Common string constants to avoid duplication
 * 
 * @package     @imajin/cli
 * @subpackage  constants
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-12
 */

// CLI Options
export const CLI_OPTIONS = {
    JSON: '--json',
    WATCH: '--watch',
    VERBOSE: '--verbose',
    DEBUG: '--debug'
} as const;

// CLI Option Descriptions
export const CLI_DESCRIPTIONS = {
    JSON_OUTPUT: 'Output in JSON format'
} as const;

// Common error messages
export const ERROR_MESSAGES = {
    MASTER_PASSWORD_NOT_SET: 'Master password not set. Call setMasterPassword() first.',
    MACOS_KEYCHAIN_NOT_AVAILABLE: 'macOS Keychain is not available on this platform',
    LINUX_SECRET_SERVICE_NOT_AVAILABLE: 'Linux Secret Service is not available on this platform',
    WINDOWS_CREDENTIAL_MANAGER_NOT_AVAILABLE: 'Windows Credential Manager is not available on this platform'
} as const;

// Circuit breaker events
export const CIRCUIT_BREAKER_EVENTS = {
    STATE_CHANGED: 'state-changed',
    CIRCUIT_OPENED: 'circuit-opened',
    CIRCUIT_CLOSED: 'circuit-closed',
    CIRCUIT_HALF_OPENED: 'circuit-half-opened',
    REQUEST_REJECTED: 'request-rejected',
    FALLBACK_EXECUTED: 'fallback-executed'
} as const;

// Common service identifiers
export const SERVICE_IDS = {
    STRIPE: 'stripe',
    CORE: 'core',
    AUTH: 'auth'
} as const;

// Log levels
export const LOG_LEVELS = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn', 
    ERROR: 'error'
} as const;

// Graph node types
export const GRAPH_NODE_TYPES = {
    ENTITY: 'entity',
    RELATIONSHIP: 'relationship',
    ATTRIBUTE: 'attribute',
    VALUE: 'value'
} as const;

// Common field names
export const FIELD_NAMES = {
    WORKFLOW_ID: 'workflowId',
    EXECUTION_ID: 'executionId',
    PIPELINE_ID: 'pipelineId',
    NODE_ID: 'nodeId'
} as const;

// Status values
export const STATUS_VALUES = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    RUNNING: 'running'
} as const;

// Common paths and extensions
export const FILE_PATHS = {
    TEST_PLUGIN_PATH: 'test-plugin-path',
    TEMP_DIR: '/tmp/test-',
    PLUGINS_DIR: '/plugins'
} as const;

// Graph translation types
export const GRAPH_TRANSLATION = {
    SOCIAL_COMMERCE: 'social-commerce',
    CREATIVE_PORTFOLIO: 'creative-portfolio',
    PROFESSIONAL_NETWORK: 'professional-network',
    COMMUNITY_HUB: 'community-hub'
} as const;

