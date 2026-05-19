/**
 * CredentialServiceProvider - Service provider for credential management system
 * 
 * @package     @imajin/cli
 * @subpackage  core/credentials
 * @author      Generated
 * @copyright   imajin
 * @license     .fair LICENSING AGREEMENT
 * @version     0.1.0
 * @since       2025-06-09
 *
 * Integration Points:
 * - ServiceProvider registration and bootstrapping
 * - CredentialManager container registration
 * - AuthCommands CLI integration
 * - Logger and configuration injection
 */

import { AuthCommands } from '../../commands/auth/AuthCommands.js';
import { ChatCommands } from '../../commands/chat/ChatCommands.js';
import { CommerceCommands } from '../../commands/commerce/CommerceCommands.js';
import { IdentityCommands } from '../../commands/identity/IdentityCommands.js';
import { NotifyCommands } from '../../commands/notify/NotifyCommands.js';
import { TrustCommands } from '../../commands/trust/TrustCommands.js';
import { WorkspaceCommands } from '../../commands/workspace/WorkspaceCommands.js';
import { Container } from '../../container/Container.js';
import { Logger } from '../../logging/Logger.js';
import { ServiceProvider } from '../../providers/ServiceProvider.js';
import { ImajinAiChatService } from '../../services/imajin-ai/ImajinAiChatService.js';
import { ImajinAiCommerceService } from '../../services/imajin-ai/ImajinAiCommerceService.js';
import { ImajinAiIdentityService } from '../../services/imajin-ai/ImajinAiIdentityService.js';
import { ImajinAiNotifyService } from '../../services/imajin-ai/ImajinAiNotifyService.js';
import { ImajinAiSessionService } from '../../services/imajin-ai/ImajinAiSessionService.js';
import { ImajinAiTrustService } from '../../services/imajin-ai/ImajinAiTrustService.js';
import { ImajinAiWorkspaceService } from '../../services/imajin-ai/ImajinAiWorkspaceService.js';
import { CredentialManager } from './CredentialManager.js';

export class CredentialServiceProvider extends ServiceProvider {
    /**
     * Register credential services with the container
     */
    public register(): void {
        // Register CredentialManager as singleton
        this.container.singleton('credentialManager', (container: Container) => {
            const logger = container.resolve<Logger>('logger');
            return new CredentialManager(logger);
        });

        // Register AuthCommands
        this.container.singleton('authCommands', (container: Container) => {
            const credentialManager = container.resolve<CredentialManager>('credentialManager');
            const logger = container.resolve<Logger>('logger');
            return new AuthCommands(credentialManager, logger);
        });

        this.container.singleton('imajinAiSessionService', (container: Container) => {
            const credentialManager = container.resolve<CredentialManager>('credentialManager');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiSessionService(credentialManager, logger);
        });

        this.container.singleton('imajinAiIdentityService', (container: Container) => {
            const sessionService = container.resolve<ImajinAiSessionService>('imajinAiSessionService');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiIdentityService(sessionService, logger);
        });

        this.container.singleton('identityCommands', (container: Container) => {
            const identityService = container.resolve<ImajinAiIdentityService>('imajinAiIdentityService');
            const logger = container.resolve<Logger>('logger');
            return new IdentityCommands(identityService, logger);
        });

        this.container.singleton('imajinAiWorkspaceService', (container: Container) => {
            const sessionService = container.resolve<ImajinAiSessionService>('imajinAiSessionService');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiWorkspaceService(sessionService, logger);
        });

        this.container.singleton('workspaceCommands', (container: Container) => {
            const workspaceService = container.resolve<ImajinAiWorkspaceService>('imajinAiWorkspaceService');
            const logger = container.resolve<Logger>('logger');
            return new WorkspaceCommands(workspaceService, logger);
        });

        this.container.singleton('imajinAiCommerceService', (container: Container) => {
            const sessionService = container.resolve<ImajinAiSessionService>('imajinAiSessionService');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiCommerceService(sessionService, logger);
        });

        this.container.singleton('commerceCommands', (container: Container) => {
            const commerceService = container.resolve<ImajinAiCommerceService>('imajinAiCommerceService');
            const logger = container.resolve<Logger>('logger');
            return new CommerceCommands(commerceService, logger);
        });

        this.container.singleton('imajinAiChatService', (container: Container) => {
            const sessionService = container.resolve<ImajinAiSessionService>('imajinAiSessionService');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiChatService(sessionService, logger);
        });

        this.container.singleton('chatCommands', (container: Container) => {
            const chatService = container.resolve<ImajinAiChatService>('imajinAiChatService');
            const logger = container.resolve<Logger>('logger');
            return new ChatCommands(chatService, logger);
        });

        this.container.singleton('imajinAiNotifyService', (container: Container) => {
            const sessionService = container.resolve<ImajinAiSessionService>('imajinAiSessionService');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiNotifyService(sessionService, logger);
        });

        this.container.singleton('notifyCommands', (container: Container) => {
            const notifyService = container.resolve<ImajinAiNotifyService>('imajinAiNotifyService');
            const logger = container.resolve<Logger>('logger');
            return new NotifyCommands(notifyService, logger);
        });

        this.container.singleton('imajinAiTrustService', (container: Container) => {
            const sessionService = container.resolve<ImajinAiSessionService>('imajinAiSessionService');
            const logger = container.resolve<Logger>('logger');
            return new ImajinAiTrustService(sessionService, logger);
        });

        this.container.singleton('trustCommands', (container: Container) => {
            const trustService = container.resolve<ImajinAiTrustService>('imajinAiTrustService');
            const logger = container.resolve<Logger>('logger');
            return new TrustCommands(trustService, logger);
        });
    }

    /**
     * Boot credential services
     */
    public boot(): void {
        // Register CLI commands
        const authCommands = this.container.resolve<AuthCommands>('authCommands');
        authCommands.registerCommands(this.program);
        const identityCommands = this.container.resolve<IdentityCommands>('identityCommands');
        identityCommands.registerCommands(this.program);
        const workspaceCommands = this.container.resolve<WorkspaceCommands>('workspaceCommands');
        workspaceCommands.registerCommands(this.program);
        const commerceCommands = this.container.resolve<CommerceCommands>('commerceCommands');
        commerceCommands.registerCommands(this.program);
        const chatCommands = this.container.resolve<ChatCommands>('chatCommands');
        chatCommands.registerCommands(this.program);
        const notifyCommands = this.container.resolve<NotifyCommands>('notifyCommands');
        notifyCommands.registerCommands(this.program);
        const trustCommands = this.container.resolve<TrustCommands>('trustCommands');
        trustCommands.registerCommands(this.program);
    }

    /**
     * Get service provider name
     */
    public getName(): string {
        return 'CredentialServiceProvider';
    }

    /**
     * Get services provided
     */
    public getServices(): string[] {
        return [
            'credentialManager',
            'authCommands',
            'imajinAiSessionService',
            'imajinAiIdentityService',
            'identityCommands',
            'imajinAiWorkspaceService',
            'workspaceCommands',
            'imajinAiCommerceService',
            'commerceCommands',
            'imajinAiChatService',
            'chatCommands',
            'imajinAiNotifyService',
            'notifyCommands',
            'imajinAiTrustService',
            'trustCommands'
        ];
    }

    /**
     * Check if this provider provides a specific service
     */
    public provides(service: string): boolean {
        return this.getServices().includes(service);
    }
} 