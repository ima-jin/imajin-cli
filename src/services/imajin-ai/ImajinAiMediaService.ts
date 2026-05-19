import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface MediaUploadInput {
    fileName: string;
    contentBase64: string;
    folderId?: string;
    access?: 'public' | 'private' | 'trusted';
    fair?: string;
}

export interface MediaGetInput {
    id: string;
    include?: string[];
}

export class ImajinAiMediaService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async uploadAsset(input: MediaUploadInput): Promise<any> {
        const payload: Record<string, unknown> = {
            file_name: this.requiredString(input.fileName, 'fileName'),
            content_base64: this.requiredString(input.contentBase64, 'contentBase64')
        };
        if (input.folderId) {
            payload.folder_id = this.requiredString(input.folderId, 'folderId');
        }
        if (input.access) {
            payload.access = this.requiredString(input.access, 'access');
        }
        if (input.fair) {
            payload.fair = this.requiredString(input.fair, 'fair');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/assets', payload);
        return response.data;
    }

    public async getAsset(input: MediaGetInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const params = new URLSearchParams();
        if (input.include && input.include.length > 0) {
            const include = input.include
                .map(part => this.requiredString(part, 'include'))
                .join(',');
            params.set('include', include);
        }

        const query = params.toString();
        const path = `/api/assets/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
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
