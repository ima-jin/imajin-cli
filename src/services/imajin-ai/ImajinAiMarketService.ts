import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface MarketListingsListInput {
    sellerDid?: string;
    status?: 'active' | 'sold' | 'archived';
    limit?: number;
    cursor?: string;
}

export class ImajinAiMarketService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async listListings(input: MarketListingsListInput = {}): Promise<any> {
        const params = new URLSearchParams();
        if (input.sellerDid) {
            params.set('seller_did', this.requiredString(input.sellerDid, 'sellerDid'));
        }
        if (input.status) {
            params.set('status', this.requiredString(input.status, 'status'));
        }
        if (input.limit !== undefined) {
            params.set('limit', String(input.limit));
        }
        if (input.cursor) {
            params.set('cursor', this.requiredString(input.cursor, 'cursor'));
        }

        const query = params.toString();
        const path = `/api/listings${query ? `?${query}` : ''}`;
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
