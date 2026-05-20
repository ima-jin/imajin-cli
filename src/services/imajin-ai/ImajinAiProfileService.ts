import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface ProfileCreateInput {
    handle: string;
    displayName: string;
    displayType: 'human' | 'agent' | 'presence';
    avatar?: string;
    avatarAssetId?: string;
    bio?: string;
    email?: string;
    phone?: string;
    optInUpdates?: boolean;
    metadata?: Record<string, unknown>;
}

export interface ProfileUpdateInput {
    id: string;
    handle?: string;
    displayName?: string;
    displayType?: 'human' | 'agent' | 'presence';
    avatar?: string;
    avatarAssetId?: string;
    bio?: string;
    email?: string;
    phone?: string;
    optInUpdates?: boolean;
    metadata?: Record<string, unknown>;
}

export interface ProfileDeleteInput {
    id: string;
}

export interface ProfileGetInput {
    id: string;
}

export interface ProfileSearchInput {
    query: string;
    type?: 'human' | 'agent' | 'presence';
    limit?: number;
    cursor?: string;
}

export interface ProfileCountsInput {
    id: string;
}

export interface ProfileClaimHandleInput {
    handle: string;
}

export interface ProfileHandleCheckInput {
    handle: string;
}

export interface ProfileInferenceToggleInput {
    enabled: boolean;
}

export interface ProfileQueryInput {
    id: string;
    query: string;
    context?: Record<string, unknown>;
}

export interface ProfileStreamInput {
    id: string;
    query: string;
    context?: Record<string, unknown>;
}

export class ImajinAiProfileService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async getProfile(input: ProfileGetInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const client = this.createClient();
        const response = await client.get(`/api/profile/${encodeURIComponent(id)}`);
        return response.data;
    }

    public async createProfile(input: ProfileCreateInput): Promise<any> {
        const payload: Record<string, unknown> = {
            handle: this.requiredString(input.handle, 'handle'),
            displayName: this.requiredString(input.displayName, 'displayName'),
            displayType: this.requiredDisplayType(input.displayType)
        };
        if (input.avatar) {
            payload.avatar = this.requiredString(input.avatar, 'avatar');
        }
        if (input.avatarAssetId) {
            payload.avatarAssetId = this.requiredString(input.avatarAssetId, 'avatarAssetId');
        }
        if (input.bio) {
            payload.bio = this.requiredString(input.bio, 'bio');
        }
        if (input.email) {
            payload.email = this.requiredString(input.email, 'email');
        }
        if (input.phone) {
            payload.phone = this.requiredString(input.phone, 'phone');
        }
        if (typeof input.optInUpdates === 'boolean') {
            payload.optInUpdates = input.optInUpdates;
        }
        if (input.metadata) {
            payload.metadata = input.metadata;
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/profile', payload);
        return response.data;
    }

    public async updateProfile(input: ProfileUpdateInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const payload: Record<string, unknown> = {};
        if (input.handle !== undefined) {
            payload.handle = this.requiredString(input.handle, 'handle');
        }
        if (input.displayName !== undefined) {
            payload.displayName = this.requiredString(input.displayName, 'displayName');
        }
        if (input.displayType !== undefined) {
            payload.displayType = this.requiredDisplayType(input.displayType);
        }
        if (input.avatar !== undefined) {
            payload.avatar = this.requiredString(input.avatar, 'avatar');
        }
        if (input.avatarAssetId !== undefined) {
            payload.avatarAssetId = this.requiredString(input.avatarAssetId, 'avatarAssetId');
        }
        if (input.bio !== undefined) {
            payload.bio = this.requiredString(input.bio, 'bio');
        }
        if (input.email !== undefined) {
            payload.email = this.requiredString(input.email, 'email');
        }
        if (input.phone !== undefined) {
            payload.phone = this.requiredString(input.phone, 'phone');
        }
        if (typeof input.optInUpdates === 'boolean') {
            payload.optInUpdates = input.optInUpdates;
        }
        if (input.metadata !== undefined) {
            payload.metadata = input.metadata;
        }
        if (Object.keys(payload).length === 0) {
            throw new Error('At least one update field is required');
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.put(`/api/profile/${encodeURIComponent(id)}`, payload);
        return response.data;
    }

    public async deleteProfile(input: ProfileDeleteInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.delete(`/api/profile/${encodeURIComponent(id)}`);
        return response.data;
    }

    public async searchProfiles(input: ProfileSearchInput): Promise<any> {
        const query = this.requiredString(input.query, 'query');
        const params = new URLSearchParams();
        params.set('q', query);
        if (input.type) {
            params.set('type', this.requiredDisplayType(input.type));
        }
        if (input.limit !== undefined) {
            params.set('limit', String(this.requiredPositiveInteger(input.limit, 'limit')));
        }
        if (input.cursor) {
            const offset = Number.parseInt(this.requiredString(input.cursor, 'cursor'), 10);
            if (!Number.isFinite(offset) || offset < 0) {
                throw new Error('cursor must be a numeric offset');
            }
            params.set('offset', String(offset));
        }

        const client = this.createClient();
        const response = await client.get(`/api/profile/search?${params.toString()}`);
        return response.data;
    }

    public async getProfileCounts(input: ProfileCountsInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const client = this.createClient();
        const response = await client.get(`/api/profile/${encodeURIComponent(id)}/counts`);
        return response.data;
    }

    public async claimHandle(input: ProfileClaimHandleInput): Promise<any> {
        const payload = {
            handle: this.requiredString(input.handle, 'handle')
        };
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/profile/claim-handle', payload);
        return response.data;
    }

    public async checkHandleAvailability(input: ProfileHandleCheckInput): Promise<any> {
        const handle = this.requiredString(input.handle, 'handle');
        const client = this.createClient();
        const response = await client.get(`/api/handle-check?handle=${encodeURIComponent(handle)}`);
        return response.data;
    }

    public async toggleInference(input: ProfileInferenceToggleInput): Promise<any> {
        if (typeof input.enabled !== 'boolean') {
            throw new Error('enabled is required');
        }
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post('/api/profile/inference', { enabled: input.enabled });
        return response.data;
    }

    public async queryProfile(input: ProfileQueryInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const query = this.requiredString(input.query, 'query');
        const payload: Record<string, unknown> = {
            ...(input.context ?? {}),
            message: query
        };

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post(`/api/profile/${encodeURIComponent(id)}/query`, payload);
        return response.data;
    }

    public async streamProfile(input: ProfileStreamInput): Promise<any> {
        const id = this.requiredString(input.id, 'id');
        const query = this.requiredString(input.query, 'query');
        const payload: Record<string, unknown> = {
            ...(input.context ?? {}),
            message: query
        };

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const response = await client.post(`/api/profile/${encodeURIComponent(id)}/stream`, payload);
        return response.data;
    }

    private requiredString(value: string, name: string): string {
        if (!value || !value.trim()) {
            throw new Error(`${name} is required`);
        }
        return value.trim();
    }

    private requiredDisplayType(value: string): 'human' | 'agent' | 'presence' {
        const parsed = this.requiredString(value, 'displayType') as 'human' | 'agent' | 'presence';
        if (!['human', 'agent', 'presence'].includes(parsed)) {
            throw new Error('displayType must be one of: human, agent, presence');
        }
        return parsed;
    }

    private requiredPositiveInteger(value: number, name: string): number {
        if (!Number.isInteger(value) || value <= 0) {
            throw new Error(`${name} must be a positive integer`);
        }
        return value;
    }

    private createClient(headers: Record<string, string> = {}): HttpClientSimple {
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
