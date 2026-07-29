import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import type { SessionFetchOptions } from './ImajinAiSessionService.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface CreateAttestationInput {
    issuerDid: string;
    subjectDid: string;
    type: string;
    signature: string;
    contextId?: string;
    contextType?: string;
    payload?: Record<string, any>;
    issuedAt?: number;
    authorJws?: string;
}

export interface ListAttestationsInput {
    did: string;
    issuerDid?: string;
    type?: string;
    status?: 'pending' | 'bilateral' | 'declined';
    limit?: number;
}

export class ImajinAiIdentityService {
    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async getSession(options: SessionFetchOptions = {}): Promise<any> {
        return this.sessionService.fetchSession(options);
    }

    public async resolveIdentity(did: string): Promise<any> {
        if (!did || !did.trim()) {
            throw new Error('did is required');
        }

        const client = this.createClient();
        const encodedDid = encodeURIComponent(did.trim());
        const response = await client.get(`/api/identity/${encodedDid}`);
        return response.data;
    }

    public async lookupIdentity(id: string): Promise<any> {
        if (!id || !id.trim()) {
            throw new Error('id is required');
        }

        const client = this.createClient();
        const encodedId = encodeURIComponent(id.trim());
        const response = await client.get(`/api/lookup/${encodedId}`);
        return response.data;
    }

    public async createAttestation(input: CreateAttestationInput): Promise<any> {
        const requiredFields = [
            { key: 'issuerDid', value: input.issuerDid },
            { key: 'subjectDid', value: input.subjectDid },
            { key: 'type', value: input.type },
            { key: 'signature', value: input.signature }
        ];
        for (const field of requiredFields) {
            if (!field.value || !field.value.trim()) {
                throw new Error(`${field.key} is required`);
            }
        }

        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const payload: Record<string, any> = {
            issuer_did: input.issuerDid.trim(),
            subject_did: input.subjectDid.trim(),
            type: input.type.trim(),
            signature: input.signature.trim()
        };
        if (input.contextId) {
            payload.context_id = input.contextId;
        }
        if (input.contextType) {
            payload.context_type = input.contextType;
        }
        if (input.payload) {
            payload.payload = input.payload;
        }
        if (input.issuedAt) {
            payload.issued_at = input.issuedAt;
        }
        if (input.authorJws) {
            payload.author_jws = input.authorJws;
        }

        const response = await client.post('/auth/api/attestations', payload);
        return response.data;
    }

    public async listAttestations(input: ListAttestationsInput): Promise<any> {
        if (!input.did || !input.did.trim()) {
            throw new Error('did is required');
        }

        const params = new URLSearchParams();
        params.set('subject_did', input.did.trim());
        if (input.issuerDid) {
            params.set('issuer_did', input.issuerDid.trim());
        }
        if (input.type) {
            params.set('type', input.type.trim());
        }
        if (input.status) {
            params.set('status', input.status);
        }
        if (input.limit) {
            params.set('limit', String(input.limit));
        }

        const client = this.createClient();
        const response = await client.get(`/api/attestations?${params.toString()}`);
        return response.data;
    }

    public async createLoginChallenge(handle: string): Promise<any> {
        return this.sessionService.createLoginChallenge(handle);
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
