/**
 * VaultGrantService - HTTP client for the kernel's Tier 1 vault grant endpoints.
 *
 * @package     @imajin/cli
 * @subpackage  services/vault
 * @license     .fair LICENSING AGREEMENT
 *
 * Provides:
 *   fetchPendingGrants() — polls GET /api/vault/grants/pending
 *   submitGrant()        — posts to POST /api/vault/delegation/grant
 *
 * Authentication: Bearer token passed via Authorization header.
 * Both endpoints are admin-only on the kernel side.
 */

import axios, { type AxiosError } from 'axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingGrantRequest {
    requestId: string;
    field: string;
    keyId: string;
    nodeXPub: string;
    ownerXPub: string;
    /** fieldKey ECDH-wrapped nodeXPriv→ownerXPub. Unwrap with ownerXPriv to recover fieldKey. */
    wrappedFieldKey: string;
    wrappedFieldKeyNonce: string;
    createdAt: string;
    expiresAt: string | null;
}

export interface GrantSubmission {
    requestId: string;
    subject: string;       // ownerDid
    grantedTo: string;     // nodeDid
    field: string;
    ownerXPub: string;
    wrappedKey: string;    // fieldKey ECDH-wrapped ownerXPriv→nodeXPub
    wrappedNonce: string;
    keyId: string;
    ownerSignature: string;
    expiresAt?: string | null;
}

export interface GrantResult {
    ok: boolean;
    grantId: string;
    field: string;
}

// ── VaultGrantService ─────────────────────────────────────────────────────────

export class VaultGrantService {
    constructor(
        private readonly baseUrl: string,
        private readonly adminToken: string,
    ) {}

    /**
     * Fetch all pending vault grant requests from the kernel.
     * Returns an empty array when none are pending.
     */
    async fetchPendingGrants(): Promise<PendingGrantRequest[]> {
        const url = `${this.baseUrl.replace(/\/$/, '')}/api/vault/grants/pending`;
        try {
            const response = await axios.get<{ requests: PendingGrantRequest[] }>(url, {
                headers: { Authorization: `Bearer ${this.adminToken}` },
                timeout: 10_000,
            });
            return response.data.requests ?? [];
        } catch (err) {
            throw new Error(`Failed to fetch pending grants from ${url}: ${formatAxiosError(err)}`);
        }
    }

    /**
     * Submit a signed delegation grant to the kernel.
     * The kernel verifies ownerSignature against VAULT_OWNER_ED_PUB before accepting.
     */
    async submitGrant(body: GrantSubmission): Promise<GrantResult> {
        const url = `${this.baseUrl.replace(/\/$/, '')}/api/vault/delegation/grant`;
        try {
            const response = await axios.post<GrantResult>(url, body, {
                headers: {
                    Authorization: `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15_000,
            });
            return response.data;
        } catch (err) {
            throw new Error(`Failed to submit grant for '${body.field}': ${formatAxiosError(err)}`);
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAxiosError(err: unknown): string {
    const axiosErr = err as AxiosError<{ error?: string }>;
    if (axiosErr.response) {
        const msg = axiosErr.response.data?.error ?? axiosErr.response.statusText;
        return `HTTP ${axiosErr.response.status}: ${msg}`;
    }
    return String(err);
}
