import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface NotifySendInput {
    to: string;
    scope: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

export interface NotifyInboxListInput {
    unreadOnly?: boolean;
    scope?: string;
    limit?: number;
    cursor?: string;
}

export class ImajinAiNotifyService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async send(input: NotifySendInput): Promise<any> {
        const payload: Record<string, unknown> = {
            to: this.requiredString(input.to, 'to'),
            scope: this.requiredString(input.scope, 'scope'),
            title: this.requiredString(input.title, 'title'),
            body: this.requiredString(input.body, 'body')
        };
        if (input.data) {
            payload.data = input.data;
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/send', payload);
        return response.data;
    }

    public async listInbox(input: NotifyInboxListInput = {}): Promise<any> {
        const params = new URLSearchParams();
        if (input.unreadOnly !== undefined) {
            params.set('unread_only', String(input.unreadOnly));
        }
        if (input.scope) {
            params.set('scope', this.requiredString(input.scope, 'scope'));
        }
        if (input.limit !== undefined) {
            params.set('limit', String(input.limit));
        }
        if (input.cursor) {
            params.set('cursor', this.requiredString(input.cursor, 'cursor'));
        }

        const query = params.toString();
        const path = `/api/notifications${query ? `?${query}` : ''}`;
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(path);
        return response.data;
    }

    private requiredString(value: string, name: string): string {
        if (!value || !value.trim()) {
            throw new Error(`${name} is required`);
        }
        return value.trim();
    }

    private createClient(headers: Record<string, string>): HttpClientSimple {
        return new HttpClientSimple(
            {
                baseURL: this.sessionService.getBaseUrl(),
                timeout: 30000,
                headers
            },
            this.logger
        );
    }
}
