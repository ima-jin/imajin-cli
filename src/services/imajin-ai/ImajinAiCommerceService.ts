import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface CommerceBalanceInput {
    did: string;
}

export interface CommerceCheckoutCreateInput {
    amount: string;
    currency: string;
    recipientDid?: string;
    fair?: string;
    metadata?: Record<string, unknown>;
}

export interface CommerceSettleCreateInput {
    amount: string;
    currency: string;
    fromDid: string;
    fair?: string;
    reference?: string;
}

export class ImajinAiCommerceService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async getBalance(input: CommerceBalanceInput): Promise<any> {
        const did = this.requiredString(input.did, 'did');
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(`/api/balance/${encodeURIComponent(did)}`);
        return response.data;
    }

    public async createCheckout(input: CommerceCheckoutCreateInput): Promise<any> {
        const amount = this.requiredAmount(input.amount, 'amount');
        const currency = this.requiredString(input.currency, 'currency').toUpperCase();

        const payload: Record<string, unknown> = {
            amount,
            currency
        };
        if (input.recipientDid) {
            payload.recipient_did = this.requiredString(input.recipientDid, 'recipientDid');
        }
        if (input.fair) {
            payload.fair = input.fair;
        }
        if (input.metadata) {
            payload.metadata = input.metadata;
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/checkout', payload);
        return response.data;
    }

    public async createSettle(input: CommerceSettleCreateInput): Promise<any> {
        const amount = this.requiredAmount(input.amount, 'amount');
        const currency = this.requiredString(input.currency, 'currency').toUpperCase();
        const fromDid = this.requiredString(input.fromDid, 'fromDid');

        const payload: Record<string, unknown> = {
            amount,
            currency,
            from_did: fromDid
        };
        if (input.fair) {
            payload.fair = input.fair;
        }
        if (input.reference) {
            payload.reference = input.reference;
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/settle', payload);
        return response.data;
    }

    private requiredString(value: string, name: string): string {
        if (!value || !value.trim()) {
            throw new Error(`${name} is required`);
        }
        return value.trim();
    }

    private requiredAmount(value: string, name: string): string {
        const raw = this.requiredString(value, name);
        const parsed = Number.parseFloat(raw);
        if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(`${name} must be a positive decimal`);
        }
        return raw;
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
