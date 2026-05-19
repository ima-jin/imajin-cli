import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import { isDeepStrictEqual } from 'node:util';
import type { Logger } from '../../logging/Logger.js';
import { ImajinAiSessionService } from './ImajinAiSessionService.js';

export interface WorkspaceGetInput {
    path: string;
    version?: number;
    etag?: string;
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

export interface WorkspacePatchInput {
    path: string;
    operations: JsonPatchOperation[];
    ifMatch?: string;
}

export interface WorkspaceMoveInput {
    from: string;
    to: string;
    ifMatch?: string;
}

export interface WorkspaceDiffInput {
    path: string;
    from: string;
    to?: string;
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

export interface WorkspacePatchResult {
    path: string;
    operationCount: number;
    etag?: string;
    version?: number;
    raw: unknown;
}

export interface WorkspaceMoveResult {
    from: string;
    to: string;
    deletedSource: boolean;
    etag?: string;
    version?: number;
    rawWrite: unknown;
    rawDelete: unknown;
}

export interface WorkspaceDiffResult {
    path: string;
    from: string;
    to: string;
    changed: boolean;
    diff: string;
    fromVersion?: number;
    toVersion?: number;
    fromEtag?: string;
    toEtag?: string;
    rawFrom: unknown;
    rawTo: unknown;
}

type JsonRecord = Record<string, unknown>;

export interface JsonPatchOperation {
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    from?: string;
    value?: unknown;
}

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
        if (input.etag !== undefined) {
            toolInput.etag = input.etag;
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

    public async patch(input: WorkspacePatchInput): Promise<WorkspacePatchResult> {
        const normalizedPath = this.normalizeRequiredPath(input.path);
        if (!Array.isArray(input.operations) || input.operations.length === 0) {
            throw new Error('operations must be a non-empty JSON patch array');
        }

        const current = await this.get({ path: normalizedPath });
        const currentDoc = this.parseJsonDocument(current.content, normalizedPath);
        const patchedDoc = this.applyJsonPatch(currentDoc, input.operations);
        const patchedContent = `${JSON.stringify(patchedDoc, null, 2)}\n`;

        const written = await this.put({
            path: normalizedPath,
            content: patchedContent,
            contentType: current.contentType ?? 'application/json',
            ...(input.ifMatch ? { ifMatch: input.ifMatch } : {})
        });

        return {
            path: written.path,
            operationCount: input.operations.length,
            ...(written.etag !== undefined ? { etag: written.etag } : {}),
            ...(written.version !== undefined ? { version: written.version } : {}),
            raw: written.raw
        };
    }

    public async move(input: WorkspaceMoveInput): Promise<WorkspaceMoveResult> {
        const from = this.normalizeRequiredPath(input.from);
        const to = this.normalizeRequiredPath(input.to);
        if (from === to) {
            throw new Error('from and to paths must be different');
        }

        const source = await this.get({ path: from });
        const written = await this.put({
            path: to,
            content: source.content,
            ...(source.contentType ? { contentType: source.contentType } : {}),
            ...(input.ifMatch ? { ifMatch: input.ifMatch } : {})
        });
        const deleted = await this.delete({
            path: from,
            ...(input.ifMatch ? { ifMatch: input.ifMatch } : {})
        });

        return {
            from,
            to: written.path,
            deletedSource: deleted.deleted,
            ...(written.etag !== undefined ? { etag: written.etag } : {}),
            ...(written.version !== undefined ? { version: written.version } : {}),
            rawWrite: written.raw,
            rawDelete: deleted.raw
        };
    }

    public async diff(input: WorkspaceDiffInput): Promise<WorkspaceDiffResult> {
        const path = this.normalizeRequiredPath(input.path);
        const fromRevision = this.normalizeRequiredPath(input.from);
        const toRevision = input.to?.trim() || 'latest';

        const fromReadInput = this.toGetInputForRevision(path, fromRevision);
        const toReadInput = toRevision === 'latest'
            ? { path }
            : this.toGetInputForRevision(path, toRevision);

        const fromDoc = await this.get(fromReadInput);
        const toDoc = await this.get(toReadInput);
        const diffText = this.buildSimpleUnifiedDiff(
            fromDoc.content,
            toDoc.content,
            `${path}@${fromRevision}`,
            `${path}@${toRevision}`
        );

        const changed = fromDoc.content !== toDoc.content;
        return {
            path,
            from: fromRevision,
            to: toRevision,
            changed,
            diff: diffText,
            ...(fromDoc.version !== undefined ? { fromVersion: fromDoc.version } : {}),
            ...(toDoc.version !== undefined ? { toVersion: toDoc.version } : {}),
            ...(fromDoc.etag !== undefined ? { fromEtag: fromDoc.etag } : {}),
            ...(toDoc.etag !== undefined ? { toEtag: toDoc.etag } : {}),
            rawFrom: fromDoc.raw,
            rawTo: toDoc.raw
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

    private toGetInputForRevision(path: string, revision: string): WorkspaceGetInput {
        if (/^\d+$/.test(revision)) {
            return { path, version: Number.parseInt(revision, 10) };
        }
        return { path, etag: revision };
    }

    private parseJsonDocument(content: string, path: string): unknown {
        if (!content.trim()) {
            throw new Error(`Cannot patch empty document at ${path}`);
        }
        try {
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`workspace.patch requires JSON content at ${path}: ${error}`);
        }
    }

    private applyJsonPatch(document: unknown, operations: JsonPatchOperation[]): unknown {
        let current = this.deepClone(document);

        for (const operation of operations) {
            if (!operation || typeof operation !== 'object') {
                throw new Error('Invalid patch operation');
            }
            const op = operation.op;
            const path = operation.path;
            if (!op || !path.startsWith('/')) {
                throw new Error('Each patch operation requires op and absolute JSON Pointer path');
            }

            if (op === 'add') {
                current = this.patchAdd(current, path, operation.value);
                continue;
            }
            if (op === 'remove') {
                current = this.patchRemove(current, path);
                continue;
            }
            if (op === 'replace') {
                current = this.patchReplace(current, path, operation.value);
                continue;
            }
            if (op === 'move') {
                if (!operation.from) {
                    throw new Error('move operation requires from');
                }
                const value = this.pointerGet(current, operation.from);
                current = this.patchRemove(current, operation.from);
                current = this.patchAdd(current, path, value);
                continue;
            }
            if (op === 'copy') {
                if (!operation.from) {
                    throw new Error('copy operation requires from');
                }
                const value = this.pointerGet(current, operation.from);
                current = this.patchAdd(current, path, value);
                continue;
            }
            if (op === 'test') {
                const value = this.pointerGet(current, path);
                if (!isDeepStrictEqual(value, operation.value)) {
                    throw new Error(`test operation failed at ${path}`);
                }
                continue;
            }

            throw new Error(`Unsupported patch op: ${op}`);
        }

        return current;
    }

    private patchAdd(document: unknown, pointer: string, value: unknown): unknown {
        if (pointer === '') {
            return this.deepClone(value);
        }
        const { parent, key } = this.pointerGetParent(document, pointer);
        const cloneValue = this.deepClone(value);

        if (Array.isArray(parent)) {
            if (key === '-') {
                parent.push(cloneValue);
                return document;
            }
            const index = this.parseArrayIndex(key, parent.length, true);
            parent.splice(index, 0, cloneValue);
            return document;
        }

        parent[key] = cloneValue;
        return document;
    }

    private patchRemove(document: unknown, pointer: string): unknown {
        if (pointer === '') {
            throw new Error('Cannot remove the root document');
        }
        const { parent, key } = this.pointerGetParent(document, pointer);

        if (Array.isArray(parent)) {
            const index = this.parseArrayIndex(key, parent.length - 1, false);
            parent.splice(index, 1);
            return document;
        }

        if (!(key in parent)) {
            throw new Error(`Path not found: ${pointer}`);
        }
        delete parent[key];
        return document;
    }

    private patchReplace(document: unknown, pointer: string, value: unknown): unknown {
        if (pointer === '') {
            return this.deepClone(value);
        }
        const { parent, key } = this.pointerGetParent(document, pointer);
        const cloneValue = this.deepClone(value);

        if (Array.isArray(parent)) {
            const index = this.parseArrayIndex(key, parent.length - 1, false);
            parent[index] = cloneValue;
            return document;
        }

        if (!(key in parent)) {
            throw new Error(`Path not found: ${pointer}`);
        }
        parent[key] = cloneValue;
        return document;
    }

    private pointerGet(document: unknown, pointer: string): unknown {
        if (pointer === '') {
            return document;
        }

        const tokens = this.pointerTokens(pointer);
        let current = document;
        for (const token of tokens) {
            if (Array.isArray(current)) {
                const index = this.parseArrayIndex(token, current.length - 1, false);
                current = current[index];
                continue;
            }
            if (this.isRecord(current)) {
                if (!(token in current)) {
                    throw new Error(`Path not found: ${pointer}`);
                }
                current = current[token];
                continue;
            }
            throw new Error(`Path not found: ${pointer}`);
        }

        return this.deepClone(current);
    }

    private pointerGetParent(document: unknown, pointer: string): { parent: JsonRecord | unknown[]; key: string } {
        const tokens = this.pointerTokens(pointer);
        if (tokens.length === 0) {
            throw new Error('Path cannot be root');
        }
        const key = tokens[tokens.length - 1]!;

        let current = document;
        for (const token of tokens.slice(0, -1)) {
            if (Array.isArray(current)) {
                const index = this.parseArrayIndex(token, current.length - 1, false);
                current = current[index];
                continue;
            }
            if (this.isRecord(current)) {
                if (!(token in current)) {
                    throw new Error(`Path not found: ${pointer}`);
                }
                current = current[token];
                continue;
            }
            throw new Error(`Path not found: ${pointer}`);
        }

        if (!Array.isArray(current) && !this.isRecord(current)) {
            throw new Error(`Path not found: ${pointer}`);
        }

        return { parent: current, key };
    }

    private pointerTokens(pointer: string): string[] {
        if (pointer === '') {
            return [];
        }
        if (!pointer.startsWith('/')) {
            throw new Error(`Invalid JSON pointer: ${pointer}`);
        }
        return pointer
            .slice(1)
            .split('/')
            .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
    }

    private parseArrayIndex(token: string, maxIndex: number, allowAppend: boolean): number {
        if (allowAppend && token === '-') {
            return maxIndex + 1;
        }
        const parsed = Number.parseInt(token, 10);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > maxIndex) {
            throw new Error(`Invalid array index: ${token}`);
        }
        return parsed;
    }

    private deepClone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }

    private buildSimpleUnifiedDiff(fromContent: string, toContent: string, fromLabel: string, toLabel: string): string {
        const fromLines = fromContent.replaceAll('\r\n', '\n').split('\n');
        const toLines = toContent.replaceAll('\r\n', '\n').split('\n');
        const out: string[] = [`--- ${fromLabel}`, `+++ ${toLabel}`];

        let i = 0;
        let j = 0;
        while (i < fromLines.length || j < toLines.length) {
            const left = i < fromLines.length ? fromLines[i] : undefined;
            const right = j < toLines.length ? toLines[j] : undefined;

            if (left !== undefined && right !== undefined && left === right) {
                out.push(` ${left}`);
                i += 1;
                j += 1;
                continue;
            }

            if (
                left !== undefined &&
                right !== undefined &&
                i + 1 < fromLines.length &&
                fromLines[i + 1] === right
            ) {
                out.push(`-${left}`);
                i += 1;
                continue;
            }

            if (
                left !== undefined &&
                right !== undefined &&
                j + 1 < toLines.length &&
                toLines[j + 1] === left
            ) {
                out.push(`+${right}`);
                j += 1;
                continue;
            }

            if (left !== undefined) {
                out.push(`-${left}`);
                i += 1;
            }
            if (right !== undefined) {
                out.push(`+${right}`);
                j += 1;
            }
        }

        return out.join('\n');
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
