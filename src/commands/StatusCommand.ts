/**
 * StatusCommand - Simplified system status and monitoring
 * 
 * @package     @imajin/cli
 * @subpackage  commands
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 * @updated      2025-07-03
 *
 * Integration Points:
 * - System health monitoring via diagnostics
 * - Service provider status
 * - ETL pipeline status
 * - Background job status (if available)
 * - LLM-friendly JSON status responses
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { SystemMonitor } from '../diagnostics/index.js';
import type { LLMResponse } from '../types/LLM.js';
import type { Logger } from '../logging/Logger.js';
import { CommonOptions } from '../utils/commonOptions.js';

export interface StatusOptions {
    json?: boolean;
    detailed?: boolean;
    watch?: boolean;
    interval?: number;
}

export class StatusCommand {
    private readonly systemMonitor: SystemMonitor;
    private readonly logger: Logger | null = null;

    constructor() {
        this.systemMonitor = new SystemMonitor();

        // Get logger from container
        try {
            const container = (globalThis as any).imajinApp?.container;
            if (container) {
                this.logger = container.resolve('logger') as Logger;
            }
        } catch (error) {
            // Logger not available yet - intentionally ignored during initialization
        }
    }

    public register(program: Command): void {
        program
            .command('status')
            .description('Show system status and health')
            .addOption(CommonOptions.json())
            .option('--detailed', 'Show detailed status information')
            .addOption(CommonOptions.watch())
            .option('--interval <seconds>', 'Update interval for watch mode (default: 5)', '5')
            .action(async (options: StatusOptions) => {
                await this.execute(options);
            });
    }

    public async execute(options: StatusOptions): Promise<void> {
        try {
            this.logger?.debug('Executing status command', { watch: options.watch, json: options.json, detailed: options.detailed });
            if (options.watch) {
                await this.watchStatus(options);
            } else {
                await this.showStatus(options);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger?.error('Failed to get system status', error instanceof Error ? error : undefined, { options });

            if (options.json) {
                const errorResponse: LLMResponse = {
                    success: false,
                    error: errorMessage,
                    timestamp: new Date(),
                    service: 'status',
                    command: 'status',
                    executionTime: 0,
                };
                console.log(JSON.stringify(errorResponse, null, 2));
            } else {
                console.error(chalk.red('❌ Failed to get system status:'), errorMessage);
            }

            process.exit(1);
        }
    }

    private async showStatus(options: StatusOptions): Promise<void> {
        this.logger?.debug('Fetching system status', { json: options.json, detailed: options.detailed });
        const status = await this.systemMonitor.getSystemStatus();
        this.logger?.info('System status retrieved', { overall: status.overall, uptime: status.uptime });

        if (options.json) {
            const response: LLMResponse = {
                success: true,
                data: status,
                timestamp: new Date(),
                service: 'status',
                command: 'status',
                executionTime: 0,
            };
            console.log(JSON.stringify(response, null, 2));
        } else {
            this.displayStatus(status, options.detailed ?? false);
        }
    }

    private async watchStatus(options: StatusOptions): Promise<void> {
        const interval = Number.parseInt(String(options.interval ?? '5')) * 1000;
        this.logger?.info('Starting status watch mode', { interval: interval / 1000, json: options.json });

        console.log(chalk.blue('👀 Watching system status... (Press Ctrl+C to stop)\n'));

        const updateStatus = async () => {
            // Clear screen
            process.stdout.write('\x1B[2J\x1B[0f');

            this.logger?.debug('Updating watch status');
            const status = await this.systemMonitor.getSystemStatus();

            if (options.json) {
                const response: LLMResponse = {
                    success: true,
                    data: status,
                    timestamp: new Date(),
                    service: 'status',
                    command: 'status',
                    executionTime: 0,
                };
                console.log(JSON.stringify(response, null, 2));
            } else {
                console.log(chalk.blue(`📊 System Status - ${new Date().toLocaleString()}\n`));
                this.displayStatus(status, options.detailed ?? false);
            }
        };

        // Initial status
        await updateStatus();

        // Set up interval - wrap async function for setInterval
        const intervalId = setInterval(() => {
            void updateStatus().catch(err => {
                this.logger?.error('Status update failed', err instanceof Error ? err : new Error(String(err)));
            });
        }, interval);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            clearInterval(intervalId);
            this.logger?.info('Status monitoring stopped by user');
            console.log(chalk.yellow('\n👋 Status monitoring stopped'));
            process.exit(0);
        });
    }

    private displayStatus(status: any, detailed: boolean): void {
        this.logger?.debug('Displaying status', { overall: status.overall, detailed });
        // Overall status
        const statusIcon = this.getStatusIcon(status.overall);
        const statusColor = this.getStatusColor(status.overall);

        console.log(chalk.bold(`${statusIcon} Overall Status: ${statusColor(status.overall.toUpperCase())}`));
        console.log(chalk.gray(`Uptime: ${this.formatUptime(status.uptime)} | Version: ${status.version}`));
        console.log();

        // Health Checks
        if (status.health?.checks) {
            const healthTable = new Table({
                head: ['Health Check', 'Status', 'Details'],
                style: { head: ['cyan'] }
            });

            Object.entries(status.health.checks).forEach(([name, check]: [string, any]) => {
                const statusIcon = this.getStatusIcon(check.status);
                const statusColor = this.getStatusColor(check.status);
                const details = check.details?.message ?? check.details?.error ?? 'OK';

                let displayDetails;
                if (detailed) {
                    displayDetails = details;
                } else {
                    displayDetails = details.length > 50 ? details.substring(0, 47) + '...' : details;
                }

                healthTable.push([
                    name,
                    `${statusIcon} ${statusColor(check.status)}`,
                    displayDetails
                ]);
            });

            console.log(chalk.bold('🔍 Health Checks:'));
            console.log(healthTable.toString());
            console.log();
        }

        // Performance Metrics
        if (status.metrics?.performance) {
            const perf = status.metrics.performance;

            console.log(chalk.bold('📊 Performance:'));
            console.log(`Memory: ${this.formatBytes(perf.memory.used)} (${perf.memory.percentage}%)`);
            console.log(`Commands: ${perf.commands.totalExecutions} executed (${perf.commands.successRate.toFixed(1)}% success)`);
            console.log(`Services: ${perf.services.totalApiCalls} API calls (${perf.services.errorRate.toFixed(1)}% error rate)`);
            console.log();
        }

        // Alerts
        if (status.alerts && status.alerts.length > 0) {
            console.log(chalk.bold('🚨 Active Alerts:'));

            status.alerts.forEach((alert: any) => {
                const severityColor = this.getSeverityColor(alert.severity);
                const severityLabel = severityColor(`[${alert.severity.toUpperCase()}]`);
                console.log(`${severityLabel} ${alert.message}`);
            });
            console.log();
        }

        // Metrics Summary
        if (status.metrics?.summary && detailed) {
            const summary = status.metrics.summary;
            console.log(chalk.bold('📈 Metrics Summary:'));
            console.log(`Total Metrics: ${summary.total} (${summary.counters} counters, ${summary.gauges} gauges, ${summary.histograms} histograms)`);
            console.log();
        }
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'healthy':
                return '✅';
            case 'degraded':
                return '⚠️';
            case 'unhealthy':
                return '❌';
            default:
                return '❓';
        }
    }

    private getStatusColor(status: string): (text: string) => string {
        switch (status) {
            case 'healthy':
                return chalk.green;
            case 'degraded':
                return chalk.yellow;
            case 'unhealthy':
                return chalk.red;
            default:
                return chalk.gray;
        }
    }

    private getSeverityColor(severity: string): (text: string) => string {
        switch (severity) {
            case 'critical':
                return chalk.red.bold;
            case 'high':
                return chalk.red;
            case 'medium':
                return chalk.yellow;
            case 'low':
                return chalk.blue;
            default:
                return chalk.gray;
        }
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    private formatBytes(bytes: number): string {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) {
return '0 B';
}
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
} 