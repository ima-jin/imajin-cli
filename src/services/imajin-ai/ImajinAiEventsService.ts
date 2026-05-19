import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface EventsCreateInput {
    title: string;
    start: string;
    end?: string;
    venue?: string;
    price?: string;
    currency?: string;
}

export class ImajinAiEventsService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async createEvent(input: EventsCreateInput): Promise<any> {
        const payload: Record<string, unknown> = {
            title: this.requiredString(input.title, 'title'),
            start: this.requiredString(input.start, 'start')
        };
        if (input.end) {
            payload.end = this.requiredString(input.end, 'end');
        }
        if (input.venue) {
            payload.venue = this.requiredString(input.venue, 'venue');
        }
        if (input.price) {
            payload.price = this.requiredDecimal(input.price, 'price');
        }
        if (input.currency) {
            payload.currency = this.requiredString(input.currency, 'currency').toUpperCase();
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/events', payload);
        return response.data;
    }

    private requiredString(value: string, name: string): string {
        if (!value || !value.trim()) {
            throw new Error(`${name} is required`);
        }
        return value.trim();
    }

    private requiredDecimal(value: string, name: string): string {
        const raw = this.requiredString(value, name);
        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error(`${name} must be a non-negative decimal`);
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
