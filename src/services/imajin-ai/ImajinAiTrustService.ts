import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface TrustInviteCreateInput {
    delivery?: string;
    email?: string;
    message?: string;
}

export interface TrustInviteAcceptInput {
    code: string;
}

export interface TrustConnectionsListInput {
    did?: string;
    scope?: string;
    limit?: number;
    cursor?: string;
}

export interface TrustDistanceGetInput {
    fromDid: string;
    toDid: string;
}

export class ImajinAiTrustService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async createInvite(input: TrustInviteCreateInput = {}): Promise<any> {
        const payload: Record<string, unknown> = {};
        if (input.delivery) {
            payload.delivery = this.requiredString(input.delivery, 'delivery');
        }
        if (input.email) {
            payload.email = this.requiredString(input.email, 'email');
        }
        if (input.message) {
            payload.message = this.requiredString(input.message, 'message');
        }
        if (payload.delivery === 'email' && !payload.email) {
            throw new Error('email is required when delivery is email');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/invites', payload);
        return response.data;
    }

    public async acceptInvite(input: TrustInviteAcceptInput): Promise<any> {
        const code = this.requiredString(input.code, 'code');
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post(`/api/invites/${encodeURIComponent(code)}/accept`, {});
        return response.data;
    }

    public async listConnections(input: TrustConnectionsListInput = {}): Promise<any> {
        const params = new URLSearchParams();
        if (input.did) {
            params.set('did', this.requiredString(input.did, 'did'));
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
        const path = `/api/connections${query ? `?${query}` : ''}`;
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(path);
        return response.data;
    }

    public async getDistance(input: TrustDistanceGetInput): Promise<any> {
        const fromDid = this.requiredString(input.fromDid, 'fromDid');
        const toDid = this.requiredString(input.toDid, 'toDid');

        const params = new URLSearchParams();
        params.set('from_did', fromDid);
        params.set('to_did', toDid);

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(`/api/trust/distance?${params.toString()}`);
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
