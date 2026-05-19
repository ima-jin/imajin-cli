import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface LearnCoursesListInput {
    mine?: boolean;
    teaching?: boolean;
    limit?: number;
    cursor?: string;
}

export class ImajinAiLearnService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async listCourses(input: LearnCoursesListInput = {}): Promise<any> {
        const params = new URLSearchParams();
        if (input.mine) {
            params.set('mine', 'true');
        }
        if (input.teaching) {
            params.set('teaching', 'true');
        }
        if (input.limit !== undefined) {
            params.set('limit', String(input.limit));
        }
        if (input.cursor) {
            params.set('cursor', this.requiredString(input.cursor, 'cursor'));
        }

        const query = params.toString();
        const path = `/api/courses${query ? `?${query}` : ''}`;
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
