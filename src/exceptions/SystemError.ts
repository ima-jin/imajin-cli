/**
 * SystemError - Exception for internal system failures
 * 
 * @package     @imajin/cli
 * @subpackage  exceptions
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - System resource management
 * - File system operations
 * - Process management
 */

import { BaseException, ErrorContext, RecoveryStrategy } from './BaseException';

export type SystemErrorType = 'file_not_found' | 'permission_denied' | 'disk_space' | 'memory_limit' | 'process_error' | 'config_error' | 'dependency_missing' | 'provider_not_found';

export interface SystemErrorDetails {
    type: SystemErrorType;
    resource?: string;
    path?: string;
    processId?: number;
    exitCode?: number;
    availableSpace?: number;
    requiredSpace?: number;
    memoryUsed?: number;
    memoryLimit?: number;
    missingDependency?: string;
    configFile?: string;
}

/**
 * Exception thrown when system-level errors occur
 */
export class SystemError extends BaseException {
    public readonly systemDetails: SystemErrorDetails;

    constructor(
        message: string,
        systemDetails: SystemErrorDetails,
        context: ErrorContext = {}
    ) {
        const recoveryStrategy = SystemError.determineRecoveryStrategy(systemDetails);
        const severity = SystemError.determineSeverity(systemDetails);

        super(
            message,
            'SYSTEM_ERROR',
            severity,
            'system',
            SystemError.isRecoverable(systemDetails),
            SystemError.generateUserMessage(systemDetails),
            systemDetails,
            context,
            recoveryStrategy
        );

        this.systemDetails = systemDetails;
    }

    /**
     * Determine recovery strategy based on system error type
     */
    private static determineRecoveryStrategy(details: SystemErrorDetails): RecoveryStrategy {
        switch (details.type) {
            case 'file_not_found':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Verify the file path is correct',
                        'Check if the file exists',
                        'Create the file if needed'
                    ]
                };

            case 'permission_denied':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Check file/directory permissions',
                        'Run with appropriate privileges',
                        'Contact your system administrator'
                    ]
                };

            case 'disk_space':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Free up disk space',
                        'Delete unnecessary files',
                        'Use a different location'
                    ]
                };

            case 'memory_limit':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Close other applications',
                        'Increase system memory',
                        'Process data in smaller chunks'
                    ]
                };

            case 'dependency_missing':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Install missing dependency',
                        'Check system requirements',
                        'Update your environment'
                    ]
                };

            case 'config_error':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Check configuration file',
                        'Fix configuration errors',
                        'Reset to default config if needed'
                    ]
                };

            case 'process_error':
                return {
                    type: 'retry',
                    maxAttempts: 2,
                    backoffMs: 1000
                };

            default:
                return {
                    type: 'manual',
                    manualSteps: ['Check system status and resources']
                };
        }
    }

    /**
     * Determine error severity
     */
    private static determineSeverity(details: SystemErrorDetails): 'low' | 'medium' | 'high' | 'critical' {
        switch (details.type) {
            case 'memory_limit':
            case 'disk_space':
                return 'critical';

            case 'permission_denied':
            case 'dependency_missing':
                return 'high';

            case 'process_error':
            case 'config_error':
                return 'medium';

            default:
                return 'low';
        }
    }

    /**
     * Check if error is recoverable
     */
    private static isRecoverable(details: SystemErrorDetails): boolean {
        return details.type === 'process_error';
    }

    /**
     * Generate user-friendly message
     */
    private static generateUserMessage(details: SystemErrorDetails): string {
        switch (details.type) {
            case 'file_not_found':
                return `File not found: ${details.path || 'unknown'}`;

            case 'permission_denied':
                return `Permission denied: ${details.resource || details.path || 'system resource'}`;

            case 'disk_space': {
                const spaceMsg = details.requiredSpace && details.availableSpace
                    ? ` (need ${details.requiredSpace}MB, have ${details.availableSpace}MB)`
                    : '';
                return `Insufficient disk space${spaceMsg}`;
            }

            case 'memory_limit': {
                const memoryMsg = details.memoryLimit
                    ? ` (limit: ${details.memoryLimit}MB)`
                    : '';
                return `Memory limit exceeded${memoryMsg}`;
            }

            case 'process_error': {
                const exitMsg = details.exitCode ? ` (exit code: ${details.exitCode})` : '';
                return `Process failed${exitMsg}`;
            }

            case 'config_error':
                return `Configuration error: ${details.configFile || 'unknown file'}`;

            case 'dependency_missing':
                return `Missing dependency: ${details.missingDependency || 'unknown'}`;

            default:
                return 'System error occurred';
        }
    }

    /**
     * Create SystemError for file not found
     */
    public static fileNotFound(path: string, context: ErrorContext = {}): SystemError {
        return new SystemError(
            `File not found: ${path}`,
            { type: 'file_not_found', path },
            context
        );
    }

    /**
     * Create SystemError for permission denied
     */
    public static permissionDenied(resource: string, context: ErrorContext = {}): SystemError {
        return new SystemError(
            `Permission denied: ${resource}`,
            { type: 'permission_denied', resource },
            context
        );
    }

    /**
     * Create SystemError for disk space issues
     */
    public static diskSpace(
        requiredSpace?: number,
        availableSpace?: number,
        context: ErrorContext = {}
    ): SystemError {
        return new SystemError(
            'Insufficient disk space',
            {
                type: 'disk_space',
                ...(requiredSpace && { requiredSpace }),
                ...(availableSpace && { availableSpace })
            },
            context
        );
    }

    /**
     * Create SystemError for memory limit
     */
    public static memoryLimit(
        memoryUsed?: number,
        memoryLimit?: number,
        context: ErrorContext = {}
    ): SystemError {
        return new SystemError(
            'Memory limit exceeded',
            {
                type: 'memory_limit',
                ...(memoryUsed && { memoryUsed }),
                ...(memoryLimit && { memoryLimit })
            },
            context
        );
    }

    /**
     * Create SystemError for process failures
     */
    public static processError(
        processId?: number,
        exitCode?: number,
        context: ErrorContext = {}
    ): SystemError {
        return new SystemError(
            'Process execution failed',
            {
                type: 'process_error',
                ...(processId && { processId }),
                ...(exitCode && { exitCode })
            },
            context
        );
    }

    /**
     * Create SystemError for configuration issues
     */
    public static configError(configFile: string, context: ErrorContext = {}): SystemError {
        return new SystemError(
            `Configuration error in: ${configFile}`,
            { type: 'config_error', configFile },
            context
        );
    }

    /**
     * Create SystemError for missing dependencies
     */
    public static dependencyMissing(dependency: string, context: ErrorContext = {}): SystemError {
        return new SystemError(
            `Missing dependency: ${dependency}`,
            { type: 'dependency_missing', missingDependency: dependency },
            context
        );
    }
} 