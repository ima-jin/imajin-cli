---
# Task Metadata (YAML Frontmatter)
task_id: "TASK-004G"
title: "Business Model Factory Refactoring"
updated: "2025-07-05T20:39:43.517Z"
priority: "HIGH"
---
**Last Updated**: July 2025

**Status**: Ready for Implementation  
**Priority**: HIGH (Complexity Reduction - High Impact)  
**Estimated Effort**: 3-4 hours  
**Dependencies**: Task-004f (Business Context Processor Refactoring)  

## 🎯 **Objective**

Refactor the BusinessModelFactory.ts (797 lines) into focused, domain-specific factories following RefakTS principles. This file is the second-largest in the codebase and handles multiple model creation responsibilities.

**⚠️ CRITICAL**: This refactoring will significantly reduce complexity and improve maintainability for business model generation.

## 🔍 **Current State Analysis**

### **Available Monitoring Data**
- ✅ Real-time health check data from MonitoringService
- ✅ Service metrics collection (errors, response times, operations)
- ✅ Service lifecycle events (startup, shutdown, errors)
- ✅ Historical data for trend analysis
- ❌ **Missing: Alert rule engine**
- ❌ **Missing: Notification system**
- ❌ **Missing: Alert management (acknowledgment, escalation)**

### **Critical Alerting Gaps**
1. **No automated alerting** - Service issues go unnoticed
2. **No notification channels** - No way to communicate alerts
3. **No alert rules** - No criteria for when to alert
4. **No alert management** - No way to acknowledge or manage alerts

## 🛠️ **Implementation Plan**

### **Phase 1: Alert Rule Engine**

#### **1.1 AlertManager Service**
```typescript
// src/services/monitoring/AlertManager.ts
export class AlertManager extends BaseService {
    private alertRules: Map<string, AlertRule> = new Map();
    private activeAlerts: Map<string, Alert> = new Map();
    private alertHistory: Alert[] = [];
    private notificationChannels: NotificationChannel[] = [];

    constructor(
        container: Container,
        config: AlertConfig & ServiceConfig,
        eventEmitter?: EventEmitter
    ) {
        super(container, config, eventEmitter);
        this.setupDefaultRules();
        this.setupNotificationChannels();
        this.setupMonitoringListeners();
    }

    public getName(): string {
        return 'alert-manager';
    }

    public getVersion(): string {
        return '1.0.0';
    }

    private setupMonitoringListeners(): void {
        // Listen to monitoring events from MonitoringService
        this.eventEmitter.on('monitoring:health-update', this.evaluateHealthAlerts.bind(this));
        this.eventEmitter.on('monitoring:metrics-update', this.evaluateMetricsAlerts.bind(this));
        this.eventEmitter.on('monitoring:service-error', this.handleServiceError.bind(this));
    }

    protected async onInitialize(): Promise<void> {
        // Initialize notification channels
        for (const channel of this.notificationChannels) {
            await channel.initialize();
        }
        
        this.emit('service:ready', { service: 'alert-manager' });
    }

    protected async onHealthCheck(): Promise<HealthCheckResult[]> {
        const checks: HealthCheckResult[] = [];

        // Check notification channels
        for (const channel of this.notificationChannels) {
            checks.push({
                name: `notification-${channel.name}`,
                healthy: await channel.isHealthy(),
                message: `${channel.name} notification channel status`
            });
        }

        // Check alert rule processing
        checks.push({
            name: 'alert-rules',
            healthy: this.alertRules.size > 0,
            message: `${this.alertRules.size} alert rules active`
        });

        return checks;
    }

    private async evaluateHealthAlerts(event: MonitoringHealthUpdateEvent): Promise<void> {
        const { serviceName, health } = event;
        
        for (const [ruleId, rule] of this.alertRules.entries()) {
            if (rule.type === 'health' && rule.condition.health) {
                const shouldAlert = rule.condition.health(serviceName, health);
                
                if (shouldAlert) {
                    await this.triggerAlert(ruleId, {
                        serviceName,
                        type: 'health_check_failed',
                        severity: rule.severity,
                        message: `Health check failed for ${serviceName}`,
                        details: health.checks
                            .filter(check => !check.healthy)
                            .map(check => check.message)
                            .join(', ')
                    });
                } else {
                    // Resolve alert if it exists
                    await this.resolveAlert(ruleId, serviceName);
                }
            }
        }
    }

    private async evaluateMetricsAlerts(event: MonitoringMetricsUpdateEvent): Promise<void> {
        const { serviceName, metrics } = event;
        
        for (const [ruleId, rule] of this.alertRules.entries()) {
            if (rule.type === 'metrics' && rule.condition.metrics) {
                const shouldAlert = rule.condition.metrics(serviceName, metrics);
                
                if (shouldAlert) {
                    await this.triggerAlert(ruleId, {
                        serviceName,
                        type: rule.metricType || 'performance_issue',
                        severity: rule.severity,
                        message: rule.generateMessage(serviceName, metrics),
                        details: `Current: ${rule.getCurrentValue(metrics)}, Threshold: ${rule.threshold}`
                    });
                } else {
                    await this.resolveAlert(ruleId, serviceName);
                }
            }
        }
    }

    private async triggerAlert(ruleId: string, alertData: Partial<Alert>): Promise<void> {
        const alertKey = `${ruleId}-${alertData.serviceName}`;
        
        // Check if alert already exists and is not resolved
        if (this.activeAlerts.has(alertKey)) {
            return; // Don't spam alerts
        }

        const alert: Alert = {
            id: generateAlertId(),
            ruleId,
            timestamp: new Date(),
            acknowledged: false,
            resolved: false,
            ...alertData
        } as Alert;

        // Store alert
        this.activeAlerts.set(alertKey, alert);
        this.alertHistory.push(alert);

        // Send notifications
        await this.sendNotifications(alert);

        // Emit alert event
        this.emit('alert:triggered', alert);
    }

    private async resolveAlert(ruleId: string, serviceName: string): Promise<void> {
        const alertKey = `${ruleId}-${serviceName}`;
        const alert = this.activeAlerts.get(alertKey);
        
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = new Date();
            this.activeAlerts.delete(alertKey);
            
            this.emit('alert:resolved', alert);
        }
    }

    private async sendNotifications(alert: Alert): Promise<void> {
        const rule = this.alertRules.get(alert.ruleId);
        if (!rule) return;

        // Send to configured channels based on severity
        const targetChannels = this.getChannelsForSeverity(alert.severity);
        
        for (const channel of targetChannels) {
            try {
                await channel.send(alert);
            } catch (error) {
                this.logger.error(`Failed to send alert via ${channel.name}:`, error);
            }
        }
    }

    private getChannelsForSeverity(severity: AlertSeverity): NotificationChannel[] {
        // Filter channels based on severity configuration
        return this.notificationChannels.filter(channel => 
            channel.shouldHandleSeverity(severity)
        );
    }

    // Public API for alert management
    public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
        for (const alert of this.activeAlerts.values()) {
            if (alert.id === alertId) {
                alert.acknowledged = true;
                alert.acknowledgedBy = acknowledgedBy;
                alert.acknowledgedAt = new Date();
                
                this.emit('alert:acknowledged', alert);
                break;
            }
        }
    }

    public getActiveAlerts(): Alert[] {
        return Array.from(this.activeAlerts.values());
    }

    public getAlertHistory(limit: number = 100): Alert[] {
        return this.alertHistory.slice(-limit);
    }

    public addAlertRule(rule: AlertRule): void {
        this.alertRules.set(rule.id, rule);
    }

    public removeAlertRule(ruleId: string): void {
        this.alertRules.delete(ruleId);
    }
}
```

#### **1.2 Alert Rule Definitions**
```typescript
// src/services/monitoring/AlertRules.ts
export interface AlertRule {
    id: string;
    name: string;
    description: string;
    type: 'health' | 'metrics';
    severity: AlertSeverity;
    condition: {
        health?: (serviceName: string, health: HealthStatus) => boolean;
        metrics?: (serviceName: string, metrics: ServiceMetrics) => boolean;
    };
    threshold?: number;
    metricType?: string;
    generateMessage: (serviceName: string, data: any) => string;
    getCurrentValue: (data: any) => string;
}

export class DefaultAlertRules {
    static getDefaultRules(): AlertRule[] {
        return [
            {
                id: 'health-check-failed',
                name: 'Service Health Check Failed',
                description: 'Triggers when any service health check fails',
                type: 'health',
                severity: 'critical',
                condition: {
                    health: (serviceName, health) => 
                        health.checks.some(check => !check.healthy)
                },
                generateMessage: (serviceName) => 
                    `Service ${serviceName} health check failed`,
                getCurrentValue: (health) => 
                    `${health.checks.filter(c => !c.healthy).length} failed checks`
            },
            {
                id: 'high-error-rate',
                name: 'High Error Rate',
                description: 'Triggers when error rate exceeds 5%',
                type: 'metrics',
                severity: 'warning',
                threshold: 0.05,
                metricType: 'error_rate',
                condition: {
                    metrics: (serviceName, metrics) => 
                        (metrics.errorsCount / metrics.operationsCount) > 0.05
                },
                generateMessage: (serviceName, metrics) => 
                    `High error rate for ${serviceName}: ${((metrics.errorsCount / metrics.operationsCount) * 100).toFixed(2)}%`,
                getCurrentValue: (metrics) => 
                    `${((metrics.errorsCount / metrics.operationsCount) * 100).toFixed(2)}%`
            },
            {
                id: 'slow-response-time',
                name: 'Slow Response Time',
                description: 'Triggers when average response time exceeds 1000ms',
                type: 'metrics',
                severity: 'warning',
                threshold: 1000,
                metricType: 'response_time',
                condition: {
                    metrics: (serviceName, metrics) => 
                        metrics.averageResponseTime > 1000
                },
                generateMessage: (serviceName, metrics) => 
                    `Slow response time for ${serviceName}: ${metrics.averageResponseTime}ms`,
                getCurrentValue: (metrics) => 
                    `${metrics.averageResponseTime}ms`
            }
        ];
    }
}
```

### **Phase 2: Notification Channels**

#### **2.1 Console Notification Channel**
```typescript
// src/services/monitoring/channels/ConsoleNotificationChannel.ts
export class ConsoleNotificationChannel implements NotificationChannel {
    public readonly name = 'console';

    constructor(private config: ConsoleChannelConfig) {}

    async initialize(): Promise<void> {
        // No initialization needed
    }

    async isHealthy(): Promise<boolean> {
        return true; // Console is always available
    }

    shouldHandleSeverity(severity: AlertSeverity): boolean {
        const severityLevels = ['info', 'warning', 'critical'];
        const configLevel = this.config.minimumSeverity || 'info';
        const configIndex = severityLevels.indexOf(configLevel);
        const alertIndex = severityLevels.indexOf(severity);
        
        return alertIndex >= configIndex;
    }

    async send(alert: Alert): Promise<void> {
        const timestamp = alert.timestamp.toISOString();
        const severity = alert.severity.toUpperCase();
        const icon = this.getSeverityIcon(alert.severity);
        
        console.log(`${icon} [${timestamp}] [${severity}] ${alert.serviceName}: ${alert.message}`);
        
        if (alert.details) {
            console.log(`   Details: ${alert.details}`);
        }
        
        if (this.config.colors && process.stdout.isTTY) {
            const colorCode = this.getSeverityColor(alert.severity);
            console.log(`\x1b[${colorCode}m▌\x1b[0m Alert ID: ${alert.id}`);
        }
    }

    private getSeverityIcon(severity: AlertSeverity): string {
        switch (severity) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📢';
        }
    }

    private getSeverityColor(severity: AlertSeverity): string {
        switch (severity) {
            case 'critical': return '31'; // Red
            case 'warning': return '33';  // Yellow
            case 'info': return '36';     // Cyan
            default: return '37';         // White
        }
    }
}
```

#### **2.2 Email Notification Channel**
```typescript
// src/services/monitoring/channels/EmailNotificationChannel.ts
export class EmailNotificationChannel implements NotificationChannel {
    public readonly name = 'email';
    private transporter: any;
    private healthStatus = false;

    constructor(private config: EmailChannelConfig) {}

    async initialize(): Promise<void> {
        const nodemailer = require('nodemailer');
        
        this.transporter = nodemailer.createTransporter({
            host: this.config.smtp.host,
            port: this.config.smtp.port,
            secure: this.config.smtp.secure,
            auth: {
                user: this.config.smtp.username,
                pass: this.config.smtp.password
            }
        });

        // Test connection
        try {
            await this.transporter.verify();
            this.healthStatus = true;
        } catch (error) {
            this.healthStatus = false;
            throw new Error(`Email configuration invalid: ${error.message}`);
        }
    }

    async isHealthy(): Promise<boolean> {
        return this.healthStatus;
    }

    shouldHandleSeverity(severity: AlertSeverity): boolean {
        const severityLevels = ['info', 'warning', 'critical'];
        const configLevel = this.config.minimumSeverity || 'warning';
        const configIndex = severityLevels.indexOf(configLevel);
        const alertIndex = severityLevels.indexOf(severity);
        
        return alertIndex >= configIndex;
    }

    async send(alert: Alert): Promise<void> {
        const subject = `[${alert.severity.toUpperCase()}] ${alert.serviceName}: ${alert.message}`;
        
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: ${this.getSeverityColor(alert.severity)};">
                    ${this.getSeverityIcon(alert.severity)} Service Alert
                </h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Service:</td>
                        <td style="padding: 8px;">${alert.serviceName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Severity:</td>
                        <td style="padding: 8px;">
                            <span style="color: ${this.getSeverityColor(alert.severity)};">
                                ${alert.severity.toUpperCase()}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Message:</td>
                        <td style="padding: 8px;">${alert.message}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Time:</td>
                        <td style="padding: 8px;">${alert.timestamp.toISOString()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Alert ID:</td>
                        <td style="padding: 8px;">${alert.id}</td>
                    </tr>
                    ${alert.details ? `
                    <tr>
                        <td style="padding: 8px; font-weight: bold;">Details:</td>
                        <td style="padding: 8px;">${alert.details}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
        `;

        await this.transporter.sendMail({
            from: this.config.from,
            to: this.config.to,
            subject,
            html
        });
    }

    private getSeverityIcon(severity: AlertSeverity): string {
        switch (severity) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '📢';
        }
    }

    private getSeverityColor(severity: AlertSeverity): string {
        switch (severity) {
            case 'critical': return '#dc3545';
            case 'warning': return '#fd7e14';
            case 'info': return '#0dcaf0';
            default: return '#6c757d';
        }
    }
}
```

#### **2.3 Webhook Notification Channel**
```typescript
// src/services/monitoring/channels/WebhookNotificationChannel.ts
export class WebhookNotificationChannel implements NotificationChannel {
    public readonly name = 'webhook';
    private healthStatus = true;

    constructor(private config: WebhookChannelConfig) {}

    async initialize(): Promise<void> {
        // Test webhook endpoint
        try {
            const response = await fetch(this.config.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'imajin-cli-alerting/1.0.0',
                    ...this.config.headers
                },
                body: JSON.stringify({
                    type: 'health_check',
                    timestamp: new Date().toISOString(),
                    message: 'Webhook notification channel test'
                })
            });

            this.healthStatus = response.ok;
        } catch (error) {
            this.healthStatus = false;
        }
    }

    async isHealthy(): Promise<boolean> {
        return this.healthStatus;
    }

    shouldHandleSeverity(severity: AlertSeverity): boolean {
        const severityLevels = ['info', 'warning', 'critical'];
        const configLevel = this.config.minimumSeverity || 'warning';
        const configIndex = severityLevels.indexOf(configLevel);
        const alertIndex = severityLevels.indexOf(severity);
        
        return alertIndex >= configIndex;
    }

    async send(alert: Alert): Promise<void> {
        const payload = {
            id: alert.id,
            service: alert.serviceName,
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            timestamp: alert.timestamp.toISOString(),
            resolved: alert.resolved || false,
            acknowledged: alert.acknowledged || false
        };

        const response = await fetch(this.config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'imajin-cli-alerting/1.0.0',
                ...this.config.headers
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
        }
    }
}
```

## 🧪 **Testing Strategy**

### **Unit Tests**
- AlertManager alert rule evaluation
- Notification channel message formatting
- Alert lifecycle management (trigger, acknowledge, resolve)
- Rule condition testing

### **Integration Tests**
- End-to-end alerting pipeline
- Multiple notification channel coordination
- Alert rule evaluation with real monitoring data
- Notification delivery verification

### **Mock Testing**
- Simulated service failures for alert testing
- Network failure scenarios for notification channels
- High load testing for alert processing

## 📊 **Success Metrics**

### **Functional Metrics**
- ✅ Alerts trigger within 30 seconds of issue detection
- ✅ All configured notification channels receive alerts
- ✅ Alert resolution properly clears active alerts
- ✅ Alert acknowledgment prevents duplicate notifications

### **Performance Metrics**
- ✅ Alert evaluation latency < 100ms
- ✅ Notification delivery time < 5 seconds
- ✅ Alert processing throughput > 100 alerts/minute
- ✅ Zero missed alerts during normal operation

### **Reliability Metrics**
- ✅ 99.9% alert delivery success rate
- ✅ Graceful degradation when notification channels fail
- ✅ Alert system remains operational during high load

## 🚀 **Next Steps**

1. **Implement AlertManager** - Core alert rule engine and management
2. **Create Notification Channels** - Console, email, and webhook channels
3. **Setup Default Rules** - Health check and performance alert rules
4. **Integration Testing** - Validate with real monitoring data
5. **Configure Channels** - Set up notification endpoints and credentials
6. **Deploy and Monitor** - Roll out to production with monitoring

## 🔗 **Related Tasks**

- **Task-004f**: Core Service Monitoring Infrastructure (prerequisite)
- **Task-004h**: Service Dashboard Interface (parallel/follows)
- **Task-004i**: Service Performance Monitoring (parallel)

## 📝 **Notes**

This alerting system provides:
- **Real-time alerts** for service health and performance issues
- **Multiple notification channels** for different severity levels
- **Alert management** with acknowledgment and resolution tracking
- **Extensible architecture** for custom alert rules and channels
- **Production-ready** notification delivery with error handling

The system is designed to be reliable, fast, and easy to configure for different operational requirements.
