/**
 * CommonOptions - Reusable CLI option builders for consistent command interfaces
 *
 * @package     @imajin/cli
 * @subpackage  utils
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-11-05
 *
 * Integration Points:
 * - Commander.js Option class for CLI argument parsing
 * - Used across all command files for consistent UX
 * - Reduces duplication of option definitions
 */

import { Option } from 'commander';

/**
 * Common CLI option builders
 *
 * Provides standardized options used across multiple commands.
 * Ensures consistent naming, descriptions, and behavior.
 */
export class CommonOptions {
  /**
   * JSON output option (--json)
   *
   * When enabled, commands output structured JSON instead of human-readable text.
   * Useful for scripting and automation.
   */
  static json(): Option {
    return new Option('--json', 'Output as JSON for programmatic consumption')
      .default(false);
  }

  /**
   * Output file option (-o, --output <file>)
   *
   * Redirects command output to a file instead of stdout.
   */
  static output(): Option {
    return new Option('-o, --output <file>', 'Write output to file instead of console');
  }

  /**
   * Format option (-f, --format <format>)
   *
   * Specifies output format with configurable choices.
   *
   * @param formats - Available format choices (default: ['text', 'json', 'table'])
   */
  static format(formats: string[] = ['text', 'json', 'table']): Option {
    return new Option('-f, --format <format>', 'Output format')
      .choices(formats)
      .default('text');
  }

  /**
   * Limit option (-l, --limit <number>)
   *
   * Limits the number of results returned by list commands.
   *
   * @param defaultValue - Default limit (default: 10)
   */
  static limit(defaultValue: number = 10): Option {
    return new Option('-l, --limit <number>', 'Maximum number of results to return')
      .argParser((value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 1) {
          throw new Error('Limit must be a positive integer');
        }
        return parsed;
      })
      .default(defaultValue);
  }

  /**
   * Watch mode option (-w, --watch)
   *
   * Enables continuous monitoring and re-execution on changes.
   */
  static watch(): Option {
    return new Option('-w, --watch', 'Watch for changes and automatically re-run command')
      .default(false);
  }

  /**
   * Verbose option (-v, --verbose)
   *
   * Enables detailed output including debug information.
   */
  static verbose(): Option {
    return new Option('-v, --verbose', 'Show detailed output with debug information')
      .default(false);
  }

  /**
   * Quiet option (-q, --quiet)
   *
   * Suppresses non-essential output, showing only critical information.
   */
  static quiet(): Option {
    return new Option('-q, --quiet', 'Suppress non-essential output (errors only)')
      .default(false);
  }

  /**
   * Dry run option (--dry-run)
   *
   * Simulates command execution without making actual changes.
   * Useful for previewing the effects of destructive operations.
   */
  static dryRun(): Option {
    return new Option('--dry-run', 'Simulate execution without making changes')
      .default(false);
  }

  /**
   * Force option (--force)
   *
   * Bypasses confirmation prompts and safety checks.
   * Use with caution for destructive operations.
   */
  static force(): Option {
    return new Option('--force', 'Skip confirmation prompts and safety checks')
      .default(false);
  }

  /**
   * Debug option (--debug)
   *
   * Enables comprehensive debug logging.
   * More detailed than verbose mode.
   */
  static debug(): Option {
    return new Option('--debug', 'Enable comprehensive debug logging')
      .default(false);
  }

  /**
   * Yes option (-y, --yes)
   *
   * Automatically confirms all prompts (answers "yes" to everything).
   * Alias for force in interactive scenarios.
   */
  static yes(): Option {
    return new Option('-y, --yes', 'Automatically answer yes to all prompts')
      .default(false);
  }

  /**
   * Config file option (-c, --config <file>)
   *
   * Specifies a custom configuration file path.
   */
  static config(defaultPath?: string): Option {
    const option = new Option('-c, --config <file>', 'Path to configuration file');
    if (defaultPath) {
      option.default(defaultPath);
    }
    return option;
  }

  /**
   * Timeout option (--timeout <ms>)
   *
   * Sets maximum execution time in milliseconds.
   *
   * @param defaultValue - Default timeout in milliseconds (default: 30000)
   */
  static timeout(defaultValue: number = 30000): Option {
    return new Option('--timeout <ms>', 'Maximum execution time in milliseconds')
      .argParser((value) => {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 0) {
          throw new Error('Timeout must be a non-negative integer');
        }
        return parsed;
      })
      .default(defaultValue);
  }

  /**
   * No color option (--no-color)
   *
   * Disables colored output (useful for logging to files or CI/CD).
   */
  static noColor(): Option {
    return new Option('--no-color', 'Disable colored output')
      .default(false);
  }
}
