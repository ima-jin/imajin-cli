import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface WorkspaceGetInput {
    path: string;
    version?: number;
}

export interface WorkspacePutInput {
    path: string;
    content: string;
    contentType?: string;
    ifMatch?: string;
}

export interface WorkspaceListInput {
    path?: string;
    recursive?: boolean;
    limit?: number;
    cursor?: string;
    type?: 'file' | 'doc' | 'blob' | 'folder';
}

export interface WorkspaceDeleteInput {
    path: string;
    recursive?: boolean;
    ifMatch?: string;
}

export interface WorkspaceEntry {
    path: string;
    type?: string;
    size?: number;
    etag?: string;
    version?: number;
    raw: unknown;
}

export interface WorkspaceGetResult {
    path: string;
    content: string;
    contentType?: string;
    etag?: string;
    version?: number;
    raw: unknown;
}

export interface WorkspacePutResult {
    path: string;
    etag?: string;
    version?: number;
    raw: unknown;
}

export interface WorkspaceSearchInput {
    query: string;
    path?: string;
    type?: 'file' | 'doc' | 'blob' | 'folder';
    limit?: number;
}

export interface WorkspaceSearchMatch {
    path: string;
    type?: string;
    snippet?: string;
    etag?: string;
    version?: number;
    score: number;
}

export interface WorkspaceSearchResult {
    query: string;
    limit: number;
    scanned: number;
    matches: WorkspaceSearchMatch[];
    rawList: unknown;
}

export interface WorkspaceListResult {
    entries: WorkspaceEntry[];
    cursor?: string;
    raw: unknown;
}

export interface WorkspaceDeleteResult {
    path: string;
    deleted: boolean;
    version?: number;
    etag?: string;
    raw: unknown;
}

type JsonRecord = Record<string, unknown>;

export class ImajinAiWorkspaceService {
    public static readonly TOOL_ENDPOINT_ENV_KEY = 'IMAJIN_AI_WORKSPACE_TOOL_ENDPOINT';

    constructor(
        private readonly sessionService: ImajinAiSessionService,
        private readonly logger: Logger
    ) {}

    public async get(input: WorkspaceGetInput): Promise<WorkspaceGetResult> {
        const normalizedPath = this.normalizeRequiredPath(input.path);
        const toolInput: JsonRecord = { path: normalizedPath };
        if (input.version !== undefined) {
            toolInput.version = input.version;
        }

        const rawResponse = await this.invokeWorkspaceTool('workspace.read', toolInput);
        const payload = this.unwrapToolPayload(rawResponse);

        if (typeof payload === 'string') {
            return {
                path: normalizedPath,
                content: payload,
                raw: rawResponse
            };
        }

        if (this.isRecord(payload)) {
            const contentCandidate =
                payload.content ??
                payload.text ??
                payload.value ??
                payload.body ??
                (this.isRecord(payload.data) ? payload.data.content : undefined);

            const content = typeof contentCandidate === 'string'
                ? contentCandidate
                : contentCandidate !== undefined
                    ? JSON.stringify(contentCandidate)
                    : '';

            const getResult: WorkspaceGetResult = {
                path: this.readString(payload, ['path']) ?? normalizedPath,
                content,
                raw: rawResponse
            };

            const contentType = this.readString(payload, ['contentType', 'mimeType', 'type']);
            if (contentType !== undefined) {
                getResult.contentType = contentType;
            }
            const etag = this.readString(payload, ['etag']);
            if (etag !== undefined) {
                getResult.etag = etag;
            }
            const version = this.readNumber(payload, ['version']);
            if (version !== undefined) {
                getResult.version = version;
            }

            return getResult;
        }

        return {
            path: normalizedPath,
            content: '',
            raw: rawResponse
        };
    }

    public async put(input: WorkspacePutInput): Promise<WorkspacePutResult> {
        const normalizedPath = this.normalizeRequiredPath(input.path);
        if (!input.content) {
            throw new Error('content is required');
        }

        const toolInput: JsonRecord = {
            path: normalizedPath,
            content: input.content
        };
        if (input.contentType) {
            toolInput.contentType = input.contentType;
        }
        if (input.ifMatch) {
            toolInput.ifMatch = input.ifMatch;
        }

        const rawResponse = await this.invokeWorkspaceTool('workspace.write', toolInput);
        const payload = this.unwrapToolPayload(rawResponse);

        if (this.isRecord(payload)) {
            const putResult: WorkspacePutResult = {
                path: this.readString(payload, ['path']) ?? normalizedPath,
                raw: rawResponse
            };
            const etag = this.readString(payload, ['etag']);
            if (etag !== undefined) {
                putResult.etag = etag;
            }
            const version = this.readNumber(payload, ['version']);
            if (version !== undefined) {
                putResult.version = version;
            }
            return putResult;
        }

        return {
            path: normalizedPath,
            raw: rawResponse
        };
    }

    public async list(input: WorkspaceListInput = {}): Promise<WorkspaceListResult> {
        const toolInput: JsonRecord = {};
        if (input.path) {
            toolInput.path = input.path.trim();
        }
        if (input.recursive !== undefined) {
            toolInput.recursive = input.recursive;
        }
        if (input.limit !== undefined) {
            toolInput.limit = input.limit;
        }
        if (input.cursor) {
            toolInput.cursor = input.cursor;
        }
        if (input.type) {
            toolInput.type = input.type;
        }

        const rawResponse = await this.invokeWorkspaceTool('workspace.list', toolInput);
        const payload = this.unwrapToolPayload(rawResponse);
        const entries = this.normalizeWorkspaceEntries(payload, input.path);
        const result: WorkspaceListResult = { entries, raw: rawResponse };
        if (this.isRecord(payload)) {
            const cursor = this.readString(payload, ['cursor', 'nextCursor', 'next_token', 'continuationToken']);
            if (cursor !== undefined) {
                result.cursor = cursor;
            }
        }

        return result;
    }

    public async delete(input: WorkspaceDeleteInput): Promise<WorkspaceDeleteResult> {
        const normalizedPath = this.normalizeRequiredPath(input.path);
        const toolInput: JsonRecord = { path: normalizedPath };
        if (input.recursive !== undefined) {
            toolInput.recursive = input.recursive;
        }
        if (input.ifMatch) {
            toolInput.ifMatch = input.ifMatch;
        }

        const rawResponse = await this.invokeWorkspaceTool('workspace.rm', toolInput);
        const payload = this.unwrapToolPayload(rawResponse);

        if (this.isRecord(payload)) {
            const result: WorkspaceDeleteResult = {
                path: this.readString(payload, ['path']) ?? normalizedPath,
                deleted: this.readBoolean(payload, ['deleted', 'ok', 'success']) ?? true,
                raw: rawResponse
            };
            const etag = this.readString(payload, ['etag']);
            if (etag !== undefined) {
                result.etag = etag;
            }
            const version = this.readNumber(payload, ['version']);
            if (version !== undefined) {
                result.version = version;
            }
            return result;
        }

        return {
            path: normalizedPath,
            deleted: true,
            raw: rawResponse
        };
    }

    public async search(input: WorkspaceSearchInput): Promise<WorkspaceSearchResult> {
        const query = input.query?.trim();
        if (!query) {
            throw new Error('query is required');
        }

        const limit = input.limit && input.limit > 0 ? input.limit : 20;
        const listLimit = Math.min(Math.max(limit * 5, 50), 500);
        const listInput: WorkspaceListInput = {
            recursive: true,
            limit: listLimit
        };
        if (input.path !== undefined) {
            listInput.path = input.path;
        }
        if (input.type !== undefined) {
            listInput.type = input.type;
        }
        const listResult = await this.list(listInput);

        const queryLower = query.toLowerCase();
        const matches: WorkspaceSearchMatch[] = [];
        let scanned = 0;

        for (const entry of listResult.entries) {
            if (matches.length >= limit) {
                break;
            }

            if (entry.type === 'folder') {
                continue;
            }

            scanned += 1;
            try {
                const doc = await this.get({ path: entry.path });
                const searchableContent = doc.content.slice(0, 200000);
                const contentLower = searchableContent.toLowerCase();
                const index = contentLower.indexOf(queryLower);
                if (index < 0) {
                    continue;
                }

                const match: WorkspaceSearchMatch = {
                    path: entry.path,
                    snippet: this.extractSnippet(searchableContent, index, query.length),
                    score: 1
                };
                if (entry.type !== undefined) {
                    match.type = entry.type;
                }
                if (doc.etag !== undefined) {
                    match.etag = doc.etag;
                }
                if (doc.version !== undefined) {
                    match.version = doc.version;
                }

                matches.push(match);
            } catch (error) {
                this.logger.warn('Workspace search skipped unreadable entry', {
                    path: entry.path,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return {
            query,
            limit,
            scanned,
            matches,
            rawList: listResult.raw
        };
    }

    private async invokeWorkspaceTool(tool: string, input: JsonRecord): Promise<unknown> {
        const headers = await this.sessionService.getAuthHeadersForRequest();
        const client = this.createClient(headers);
        const configuredEndpoint = process.env[ImajinAiWorkspaceService.TOOL_ENDPOINT_ENV_KEY]?.trim();
        const endpoints = configuredEndpoint
            ? [configuredEndpoint]
            : ['/api/tools/execute', '/api/agent/tools/execute', '/api/workspace/tools/execute'];
        const payloads: JsonRecord[] = [
            { tool, input },
            { name: tool, input }
        ];

        const errors: string[] = [];

        for (const endpoint of endpoints) {
            for (const payload of payloads) {
                try {
                    const response = await client.post(endpoint, payload);
                    return response.data;
                } catch (error) {
                    const status = this.extractHttpStatus(error);
                    const message = error instanceof Error ? error.message : String(error);
                    errors.push(`${endpoint} (${status ?? 'n/a'}): ${message}`);

                    if (status !== 400 && status !== 404 && status !== 405 && status !== 422) {
                        throw error;
                    }
                }
            }
        }

        throw new Error(
            `Unable to invoke workspace tool "${tool}". Set ${ImajinAiWorkspaceService.TOOL_ENDPOINT_ENV_KEY} if your backend uses a custom endpoint. Attempts: ${errors.join(' | ')}`
        );
    }

    private normalizeWorkspaceEntries(payload: unknown, basePath?: string): WorkspaceEntry[] {
        const source = this.extractEntryArray(payload);
        const entries: WorkspaceEntry[] = [];

        for (const item of source) {
            if (!this.isRecord(item)) {
                continue;
            }

            const rawPath =
                this.readString(item, ['path', 'name', 'key', 'id']) ??
                (basePath ? `${basePath}/${this.readString(item, ['filename']) ?? ''}` : null);

            if (!rawPath) {
                continue;
            }

            const normalized: WorkspaceEntry = {
                path: rawPath,
                raw: item
            };
            const type = this.readString(item, ['type', 'kind']);
            if (type !== undefined) {
                normalized.type = type;
            }
            const size = this.readNumber(item, ['size']);
            if (size !== undefined) {
                normalized.size = size;
            }
            const etag = this.readString(item, ['etag']);
            if (etag !== undefined) {
                normalized.etag = etag;
            }
            const version = this.readNumber(item, ['version']);
            if (version !== undefined) {
                normalized.version = version;
            }

            entries.push(normalized);
        }

        return entries;
    }

    private extractEntryArray(payload: unknown): unknown[] {
        if (Array.isArray(payload)) {
            return payload;
        }

        if (!this.isRecord(payload)) {
            return [];
        }

        const directKeys = ['entries', 'items', 'files', 'results', 'documents'];
        for (const key of directKeys) {
            const value = payload[key];
            if (Array.isArray(value)) {
                return value;
            }
        }

        const nestedKeys = ['data', 'result', 'output', 'payload'];
        for (const key of nestedKeys) {
            const value = payload[key];
            if (Array.isArray(value)) {
                return value;
            }
            if (this.isRecord(value)) {
                for (const nested of directKeys) {
                    const nestedValue = value[nested];
                    if (Array.isArray(nestedValue)) {
                        return nestedValue;
                    }
                }
            }
        }

        return [];
    }

    private unwrapToolPayload(raw: unknown): unknown {
        if (!this.isRecord(raw)) {
            return raw;
        }

        if (raw.ok === false && raw.error) {
            throw new Error(typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error));
        }

        for (const key of ['result', 'data', 'output', 'payload']) {
            if (key in raw) {
                return raw[key];
            }
        }

        return raw;
    }

    private extractSnippet(content: string, matchIndex: number, queryLength: number): string {
        const radius = 80;
        const start = Math.max(0, matchIndex - radius);
        const end = Math.min(content.length, matchIndex + queryLength + radius);
        return content.slice(start, end).replaceAll(/\s+/g, ' ').trim();
    }

    private normalizeRequiredPath(pathValue: string): string {
        if (!pathValue || !pathValue.trim()) {
            throw new Error('path is required');
        }
        return pathValue.trim();
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

    private isRecord(value: unknown): value is JsonRecord {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    private readString(source: JsonRecord, keys: string[]): string | undefined {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
        return undefined;
    }

    private readBoolean(source: JsonRecord, keys: string[]): boolean | undefined {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'boolean') {
                return value;
            }
            if (typeof value === 'string' && value.trim()) {
                const normalized = value.trim().toLowerCase();
                if (normalized === 'true') {
                    return true;
                }
                if (normalized === 'false') {
                    return false;
                }
            }
            if (typeof value === 'number') {
                if (value === 1) {
                    return true;
                }
                if (value === 0) {
                    return false;
                }
            }
        }
        return undefined;
    }

    private readNumber(source: JsonRecord, keys: string[]): number | undefined {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'number' && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === 'string' && value.trim()) {
                const parsed = Number.parseInt(value, 10);
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            }
        }
        return undefined;
    }

    private extractHttpStatus(error: unknown): number | undefined {
        if (typeof error !== 'object' || error === null) {
            return undefined;
        }

        const err = error as { response?: { status?: unknown } };
        if (typeof err.response?.status === 'number') {
            return err.response.status;
        }
        return undefined;
    }
}
