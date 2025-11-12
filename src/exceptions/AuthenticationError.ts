/**
 * AuthenticationError - Exception for authentication and authorization failures
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
 * - Credential management system
 * - Service provider authentication
 * - OAuth flow handling
 */

import { BaseException, ErrorContext, RecoveryStrategy } from './BaseException.js';

export type AuthErrorType = 'invalid_credentials' | 'expired_token' | 'insufficient_permissions' | 'oauth_error' | 'missing_credentials';

export interface AuthErrorDetails {
    type: AuthErrorType;
    service?: string;
    userId?: string;
    tokenType?: string;
    expiresAt?: Date;
    requiredPermissions?: string[];
    currentPermissions?: string[];
    oauthError?: string;
}

/**
 * Exception thrown when authentication or authorization fails
 */
export class AuthenticationError extends BaseException {
    public readonly authDetails: AuthErrorDetails;

    constructor(
        message: string,
        authDetails: AuthErrorDetails,
        context: ErrorContext = {}
    ) {
        const recoveryStrategy = AuthenticationError.determineRecoveryStrategy(authDetails);

        super(
            message,
            'AUTH_ERROR',
            'high',
            'auth',
            AuthenticationError.isRecoverable(authDetails),
            AuthenticationError.generateUserMessage(authDetails),
            authDetails,
            context,
            recoveryStrategy
        );

        this.authDetails = authDetails;
    }

    /**
     * Determine recovery strategy based on auth error type
     */
    private static determineRecoveryStrategy(details: AuthErrorDetails): RecoveryStrategy {
        switch (details.type) {
            case 'missing_credentials':
            case 'oauth_error':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Run authentication setup',
                        'Follow the login flow',
                        'Verify your credentials'
                    ]
                };

            case 'expired_token':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Refresh your authentication token',
                        'Re-login if refresh fails'
                    ]
                };

            case 'invalid_credentials':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Check your username and password',
                        'Verify API key or token',
                        'Re-authenticate if needed'
                    ]
                };

            case 'insufficient_permissions':
                return {
                    type: 'manual',
                    manualSteps: [
                        'Contact your administrator',
                        'Request additional permissions',
                        'Use a different account with proper access'
                    ]
                };

            default:
                return {
                    type: 'manual',
                    manualSteps: ['Check your authentication setup']
                };
        }
    }

    /**
     * Check if error is recoverable
     */
    private static isRecoverable(details: AuthErrorDetails): boolean {
        // Most auth errors require manual intervention
        return details.type === 'expired_token';
    }

    /**
     * Generate user-friendly message
     */
    private static generateUserMessage(details: AuthErrorDetails): string {
        const { type, service } = details;
        const serviceName = service ? ` for ${service}` : '';

        switch (type) {
            case 'missing_credentials':
                return `No credentials found${serviceName}. Please login first.`;

            case 'invalid_credentials':
                return `Invalid credentials${serviceName}. Please check your login details.`;

            case 'expired_token':
                return `Authentication token expired${serviceName}. Please refresh or re-login.`;

            case 'insufficient_permissions':
                return `Insufficient permissions${serviceName}. Contact your administrator.`;

            case 'oauth_error':
                return `OAuth authentication failed${serviceName}. Please try logging in again.`;

            default:
                return `Authentication failed${serviceName}.`;
        }
    }

    /**
     * Create AuthenticationError for missing credentials
     */
    public static missingCredentials(service?: string, context: ErrorContext = {}): AuthenticationError {
        const servicePart = service ? ` for ${service}` : '';
        return new AuthenticationError(
            `Missing credentials${servicePart}`,
            { type: 'missing_credentials', ...(service && { service }) },
            context
        );
    }

    /**
     * Create AuthenticationError for invalid credentials
     */
    public static invalidCredentials(service?: string, context: ErrorContext = {}): AuthenticationError {
        const servicePart = service ? ` for ${service}` : '';
        return new AuthenticationError(
            `Invalid credentials${servicePart}`,
            { type: 'invalid_credentials', ...(service && { service }) },
            context
        );
    }

    /**
     * Create AuthenticationError for expired token
     */
    public static expiredToken(
        service?: string,
        expiresAt?: Date,
        context: ErrorContext = {}
    ): AuthenticationError {
        const servicePart = service ? ` for ${service}` : '';
        return new AuthenticationError(
            `Authentication token expired${servicePart}`,
            {
                type: 'expired_token',
                ...(service && { service }),
                ...(expiresAt && { expiresAt })
            },
            context
        );
    }

    /**
     * Create AuthenticationError for insufficient permissions
     */
    public static insufficientPermissions(
        requiredPermissions: string[],
        currentPermissions: string[] = [],
        service?: string,
        context: ErrorContext = {}
    ): AuthenticationError {
        const servicePart = service ? ` for ${service}` : '';
        return new AuthenticationError(
            `Insufficient permissions${servicePart}`,
            {
                type: 'insufficient_permissions',
                ...(service && { service }),
                requiredPermissions,
                currentPermissions
            },
            context
        );
    }

    /**
     * Create AuthenticationError for OAuth failures
     */
    public static oauthError(
        oauthError: string,
        service?: string,
        context: ErrorContext = {}
    ): AuthenticationError {
        const servicePart = service ? ` for ${service}` : '';
        return new AuthenticationError(
            `OAuth authentication failed${servicePart}: ${oauthError}`,
            {
                type: 'oauth_error',
                ...(service && { service }),
                oauthError
            },
            context
        );
    }

    /**
     * Get login instructions for the user
     */
    public getLoginInstructions(): string[] {
        const { service } = this.authDetails;
        const baseCommand = service ? `imajin auth login ${service}` : 'imajin auth login';

        return [
            `Run: ${baseCommand}`,
            'Follow the authentication prompts',
            'Verify your credentials are correct'
        ];
    }

    /**
     * Check if token refresh is possible
     */
    public canRefreshToken(): boolean {
        return this.authDetails.type === 'expired_token';
    }
} 