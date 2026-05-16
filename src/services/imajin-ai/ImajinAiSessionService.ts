import { HttpClientSimple } from '../../http/HttpClientSimple.js';
import type { Logger } from '../../logging/Logger.js';
import type { CredentialData } from '../../core/credentials/interfaces.js';
import { CredentialManager } from '../../core/credentials/CredentialManager.js';

export interface ImajinAiSessionCredential extends CredentialData {
    accessToken?: string;
    refreshToken?: string;
    sessionCookie?: string;
    expiresAt?: Date;
    scopes?: string[];
    metadata?: Record<string, any>;
}

export interface SessionFetchOptions {
    includeGrants?: boolean;
    includeGas?: boolean;
}

export interface LoginFinalizeOptions {
    challengeId: string;
    signature: string;
    dfosChain?: string[];
}

export class ImajinAiSessionService {
    public static readonly SERVICE_KEY = 'imajin-ai';
    public static readonly BASE_URL_ENV_KEY = 'IMAJIN_AI_BASE_URL';

    constructor(
        private readonly credentialManager: CredentialManager,
        private readonly logger: Logger
    ) {}

    public async getStoredSession(): Promise<ImajinAiSessionCredential | null> {
        const stored = await this.credentialManager.retrieve(ImajinAiSessionService.SERVICE_KEY);
        if (!stored) {
            return null;
        }

        return this.normalizeSession(stored);
    }

    public async clearStoredSession(): Promise<void> {
        await this.credentialManager.delete(ImajinAiSessionService.SERVICE_KEY);
    }

    public getBaseUrl(): string {
        return this.getRequiredBaseUrl();
    }

    public async getAuthHeadersForRequest(): Promise<Record<string, string>> {
        const session = await this.getStoredSession();
        return this.buildSessionHeaders(session);
    }

    public async fetchSession(options: SessionFetchOptions = {}): Promise<any> {
        const session = await this.getStoredSession();
        const headers = this.buildSessionHeaders(session);

        const params = new URLSearchParams();
        if (options.includeGrants) {
            params.set('include-grants', 'true');
        }
        if (options.includeGas) {
            params.set('include-gas', 'true');
        }

        const query = params.toString();
        const path = query ? `/api/session?${query}` : '/api/session';

        const client = this.createHttpClient(headers);
        const response = await client.get(path);
        return response.data;
    }

    public async createLoginChallenge(handle: string): Promise<any> {
        if (!handle || !handle.trim()) {
            throw new Error('Handle is required');
        }

        const client = this.createHttpClient();
        const response = await client.post('/api/login/challenge', {
            handle: handle.trim()
        });
        return response.data;
    }

    public async finalizeLogin(options: LoginFinalizeOptions): Promise<{
        identity: any;
        stored: boolean;
        authMode: 'cookie-session';
    }> {
        const challengeId = options.challengeId?.trim();
        const signature = options.signature?.trim();
        if (!challengeId) {
            throw new Error('challengeId is required');
        }
        if (!signature) {
            throw new Error('signature is required');
        }

        const payload: Record<string, any> = {
            challengeId,
            signature
        };
        if (options.dfosChain && options.dfosChain.length > 0) {
            payload.dfosChain = options.dfosChain;
        }

        const client = this.createHttpClient();
        const response = await client.post('/api/login/verify', payload);
        const cookie = this.extractSessionCookie(response?.headers?.['set-cookie']);
        if (!cookie.cookieHeaderValue) {
            throw new Error('Login verify succeeded but no imajin_session cookie was returned.');
        }

        const sessionCredential: ImajinAiSessionCredential = {
            sessionCookie: cookie.cookieHeaderValue,
            metadata: {
                ...(response.data ?? {}),
                authMode: 'cookie-session',
                loginAt: new Date().toISOString()
            }
        };
        if (cookie.expiresAt) {
            sessionCredential.expiresAt = cookie.expiresAt;
        }
        await this.credentialManager.store(ImajinAiSessionService.SERVICE_KEY, sessionCredential);

        return {
            identity: response.data ?? null,
            stored: true,
            authMode: 'cookie-session'
        };
    }

    public async getSessionStatusSummary(): Promise<{
        configured: boolean;
        hasSessionCookie: boolean;
        hasAccessToken: boolean;
        hasRefreshToken: boolean;
        expiresAt: string | null;
        isExpired: boolean | null;
        scopes: string[];
        baseUrlConfigured: boolean;
    }> {
        const session = await this.getStoredSession();
        const expiresAt = session?.expiresAt ? new Date(session.expiresAt) : null;
        const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : null;
        const baseUrlConfigured = !!process.env[ImajinAiSessionService.BASE_URL_ENV_KEY];

        return {
            configured: !!session,
            hasSessionCookie: !!session?.sessionCookie,
            hasAccessToken: !!session?.accessToken,
            hasRefreshToken: !!session?.refreshToken,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            isExpired,
            scopes: session?.scopes ?? [],
            baseUrlConfigured
        };
    }

    private normalizeSession(stored: CredentialData): ImajinAiSessionCredential {
        const normalized: ImajinAiSessionCredential = { ...stored };
        if (stored.expiresAt) {
            const parsed = new Date(stored.expiresAt);
            if (!Number.isNaN(parsed.getTime())) {
                normalized.expiresAt = parsed;
            }
        }
        return normalized;
    }

    private buildSessionHeaders(session: ImajinAiSessionCredential | null): Record<string, string> {
        if (session?.sessionCookie) {
            return {
                Cookie: session.sessionCookie
            };
        }
        if (session?.accessToken) {
            return {
                Authorization: `Bearer ${session.accessToken}`
            };
        }

        throw new Error('No stored imajin-ai session found. Run `imajin auth imajin-ai login` first.');
    }

    private extractSessionCookie(setCookieHeader: string[] | string | undefined): {
        cookieHeaderValue: string | null;
        expiresAt: Date | null;
    } {
        if (!setCookieHeader) {
            return {
                cookieHeaderValue: null,
                expiresAt: null
            };
        }

        const cookieLines = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        const sessionLine = cookieLines.find(line => line.toLowerCase().startsWith('imajin_session='));
        if (!sessionLine) {
            return {
                cookieHeaderValue: null,
                expiresAt: null
            };
        }

        const segments = sessionLine.split(';').map(part => part.trim());
        const keyValue = segments[0] ?? null;

        let expiresAt: Date | null = null;
        const expiresSegment = segments.find(s => s.toLowerCase().startsWith('expires='));
        if (expiresSegment) {
            const raw = expiresSegment.substring('expires='.length).trim();
            const parsed = new Date(raw);
            if (!Number.isNaN(parsed.getTime())) {
                expiresAt = parsed;
            }
        }

        return {
            cookieHeaderValue: keyValue,
            expiresAt
        };
    }

    private createHttpClient(headers: Record<string, string> = {}): HttpClientSimple {
        const baseURL = this.getRequiredBaseUrl();
        return new HttpClientSimple(
            {
                baseURL,
                timeout: 30000,
                headers
            },
            this.logger
        );
    }

    private getRequiredBaseUrl(): string {
        const raw = process.env[ImajinAiSessionService.BASE_URL_ENV_KEY]?.trim();
        if (!raw) {
            throw new Error(`Missing ${ImajinAiSessionService.BASE_URL_ENV_KEY}. Set it to your imajin-ai API base URL.`);
        }

        this.logger.debug('Using imajin-ai base URL', { baseURL: raw });
        return raw.replace(/\/+$/, '');
    }
}