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
export interface EventsListInput {
    status?: string;
    limit?: number;
    courseSlug?: string;
    upcoming?: boolean;
}

export interface EventsTicketBuyInput {
    eventId: string;
    ticketTypeId: string;
    quantity?: number;
    email?: string;
    invite?: string;
}

export interface EventsRsvpInput {
    eventId: string;
    ticketTypeId: string;
    email?: string;
    name?: string;
    invite?: string;
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
    public async listEvents(input: EventsListInput): Promise<any> {
        const params = new URLSearchParams();
        if (input.status) {
            params.set('status', this.requiredString(input.status, 'status'));
        }
        if (input.limit !== undefined) {
            params.set('limit', String(this.requiredPositiveInt(input.limit, 'limit')));
        }
        if (input.courseSlug) {
            params.set('courseSlug', this.requiredString(input.courseSlug, 'courseSlug'));
        }
        if (input.upcoming !== undefined) {
            params.set('upcoming', input.upcoming ? 'true' : 'false');
        }

        const query = params.toString();
        const path = `/api/events${query ? `?${query}` : ''}`;
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.get(path);
        return response.data;
    }

    public async buyTicket(input: EventsTicketBuyInput): Promise<any> {
        const payload: Record<string, unknown> = {
            eventId: this.requiredString(input.eventId, 'eventId'),
            ticketTypeId: this.requiredString(input.ticketTypeId, 'ticketTypeId')
        };
        if (input.quantity !== undefined) {
            payload.quantity = this.requiredPositiveInt(input.quantity, 'quantity');
        }
        if (input.email) {
            payload.email = this.requiredString(input.email, 'email');
        }
        if (input.invite) {
            payload.invite = this.requiredString(input.invite, 'invite');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/checkout', payload);
        return response.data;
    }

    public async rsvp(input: EventsRsvpInput): Promise<any> {
        const payload: Record<string, unknown> = {
            eventId: this.requiredString(input.eventId, 'eventId'),
            ticketTypeId: this.requiredString(input.ticketTypeId, 'ticketTypeId')
        };
        if (input.email) {
            payload.email = this.requiredString(input.email, 'email');
        }
        if (input.name) {
            payload.name = this.requiredString(input.name, 'name');
        }
        if (input.invite) {
            payload.invite = this.requiredString(input.invite, 'invite');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/checkout/free', payload);
        return response.data;
    }

    private requiredString(value: string, name: string): string {
        if (!value || !value.trim()) {
            throw new Error(`${name} is required`);
        }
        return value.trim();
    }
    private requiredPositiveInt(value: number, name: string): number {
        if (!Number.isInteger(value) || value <= 0) {
            throw new Error(`${name} must be a positive integer`);
        }
        return value;
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
