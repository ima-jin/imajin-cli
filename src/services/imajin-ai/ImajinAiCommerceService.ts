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

export interface CommerceChargeCreateInput {
    paymentMethod: string;
    amount: string;
    currency: string;
    customerDid?: string;
}

export interface CommerceRefundCreateInput {
    transactionId: string;
    amount?: string;
    reason?: string;
}

export interface CommerceTransferCreateInput {
    fromDid: string;
    toDid: string;
    amount: string;
    currency: string;
    memo?: string;
}

export interface CommerceTransactionsListInput {
    did: string;
    limit?: number;
    cursor?: string;
    from?: string;
    to?: string;
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

    public async createCharge(input: CommerceChargeCreateInput): Promise<any> {
        const paymentMethod = this.requiredString(input.paymentMethod, 'paymentMethod');
        const amount = this.requiredAmount(input.amount, 'amount');
        const currency = this.requiredString(input.currency, 'currency').toUpperCase();

        const payload: Record<string, unknown> = {
            payment_method: paymentMethod,
            amount,
            currency
        };
        if (input.customerDid) {
            payload.customer_did = this.requiredString(input.customerDid, 'customerDid');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/charge', payload);
        return response.data;
    }

    public async createRefund(input: CommerceRefundCreateInput): Promise<any> {
        const transactionId = this.requiredString(input.transactionId, 'transactionId');
        const payload: Record<string, unknown> = {
            transaction_id: transactionId
        };
        if (input.amount) {
            payload.amount = this.requiredAmount(input.amount, 'amount');
        }
        if (input.reason) {
            payload.reason = this.requiredString(input.reason, 'reason');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/refund', payload);
        return response.data;
    }

    public async createTransfer(input: CommerceTransferCreateInput): Promise<any> {
        const fromDid = this.requiredString(input.fromDid, 'fromDid');
        const toDid = this.requiredString(input.toDid, 'toDid');
        const amount = this.requiredAmount(input.amount, 'amount');
        const currency = this.requiredString(input.currency, 'currency').toUpperCase();

        const payload: Record<string, unknown> = {
            from_did: fromDid,
            to_did: toDid,
            amount,
            currency
        };
        if (input.memo) {
            payload.memo = this.requiredString(input.memo, 'memo');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/balance/transfer', payload);
        return response.data;
    }

    public async listTransactions(input: CommerceTransactionsListInput): Promise<any> {
        const did = this.requiredString(input.did, 'did');
        const params = new URLSearchParams();
        if (input.limit !== undefined) {
            params.set('limit', String(input.limit));
        }
        if (input.cursor) {
            params.set('cursor', this.requiredString(input.cursor, 'cursor'));
        }
        if (input.from) {
            params.set('from', this.requiredString(input.from, 'from'));
        }
        if (input.to) {
            params.set('to', this.requiredString(input.to, 'to'));
        }

        const query = params.toString();
        const path = `/api/transactions/${encodeURIComponent(did)}${query ? `?${query}` : ''}`;
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
