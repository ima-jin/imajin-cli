/**
 * Secure Random Utilities
 * Cryptographically secure random string generation for IDs and tokens
 *
 * @package     @imajin/cli
 * @subpackage  utils
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-11-05
 */

import { randomBytes } from 'node:crypto';

/**
 * Generate a cryptographically secure random string
 * Uses Node's crypto.randomBytes instead of Math.random() to prevent predictability
 *
 * @param length - Desired length of the random string (default: 9)
 * @returns Alphanumeric random string (lowercase + numbers)
 *
 * @example
 * ```typescript
 * const id = generateSecureRandomString(9); // "a3f9k2m1p"
 * const short = generateSecureRandomString(5); // "x7j2q"
 * ```
 */
export function generateSecureRandomString(length: number = 9): string {
    // Generate enough random bytes (each byte gives us ~1.3 base36 chars)
    // Multiply by 2 to ensure we have enough bytes
    const bytes = randomBytes(Math.ceil(length * 2));

    // Convert to base36 (0-9, a-z) and take required length
    return bytes
        .toString('base64')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .substring(0, length);
}

/**
 * Generate a secure ID with a prefix and timestamp
 * Common pattern for event, transaction, and entity IDs
 *
 * @param prefix - ID prefix (e.g., 'task', 'tx', 'event')
 * @param randomLength - Length of random suffix (default: 9)
 * @returns Secure ID in format: prefix_timestamp_random
 *
 * @example
 * ```typescript
 * generateSecureId('task'); // "task_lg2x8k_a3f9k2m1p"
 * generateSecureId('tx', 6); // "tx_lg2x8k_x7j2q1"
 * ```
 */
export function generateSecureId(prefix: string, randomLength: number = 9): string {
    const timestamp = Date.now().toString(36);
    const random = generateSecureRandomString(randomLength);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a task ID with timestamp + short random suffix
 * Specific format for task IDs: task-{timestamp}{random}
 *
 * @returns Task ID in format: task-timestamp3char
 *
 * @example
 * ```typescript
 * generateTaskId(); // "task-lg2x8ka3f"
 * ```
 */
export function generateTaskId(): string {
    const timestamp = Date.now().toString(36);
    const random = generateSecureRandomString(3);
    return `task-${timestamp}${random}`;
}
