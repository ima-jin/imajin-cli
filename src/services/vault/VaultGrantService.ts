/**
 * VaultGrantService - HTTP client for the kernel's Tier 1 vault grant endpoints.
 *
 * @package     @imajin/cli
 * @subpackage  services/vault
 * @license     .fair LICENSING AGREEMENT
 *
 * Provides:
 *   fetchPendingGrants()   ΓÇö polls GET /api/vault/grants/pending (new grants)
 *   fetchRenewableGrants() ΓÇö polls GET /api/vault/grants/renewable (#1536:
 *                            grants that are missing or expiring soon)
 *   submitGrant()          ΓÇö posts to POST /api/vault/delegation/grant.
 *                            Present `requestId` for a new grant, omit it for
 *                            a renewal ΓÇö its absence is what tells the kernel
 *                            this is a renewal rather than a seal-time handshake.
 *
 * Authentication: Bearer token passed via Authorization header.
 * All endpoints are admin-only on the kernel side.
 */

import axios, { type AxiosError } from 'axios';

// ΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface PendingGrantRequest {
    requestId: string;
    field: string;
    keyId: string;
    nodeXPub: string;
    ownerXPub: string;
    /** fieldKey ECDH-wrapped nodeXPrivΓåÆownerXPub. Unwrap with ownerXPriv to recover fieldKey. */
    wrappedFieldKey: string;
    wrappedFieldKeyNonce: string;
    createdAt: string;
    expiresAt: string | null;
}

export interface GrantSubmission {
    /**
     * Present for the initial seal-time handshake, omitted for a renewal (#1536).
     * The kernel treats its absence as the marker that this is a renewal ΓÇö there
     * is no `vault_grant_requests` row to reference, because the owner envelope
     * is the key source instead.
     */
    requestId?: string;
    subject: string;       // ownerDid
    grantedTo: string;     // nodeDid
    field: string;
    ownerXPub: string;
    wrappedKey: string;    // fieldKey ECDH-wrapped ownerXPrivΓåÆnodeXPub
    wrappedNonce: string;
    keyId: string;
    ownerSignature: string;
    expiresAt?: string | null;
}

export interface GrantResult {
    ok: boolean;
    grantId: string;
    field: string;
    renewal?: boolean;
}

/**
 * A field whose delegation grant needs issuing or re-issuing: either no active
 * grant exists at all (`reason: 'missing'` ΓÇö revoked, swept after expiry, or
 * never granted), or the active grant lapses within the requested window
 * (`reason: 'expiring'`).
 *
 * Carries the owner envelope (#1521) for the field: the field key wrapped
 * `nodeXPriv ΓåÆ ownerXPub`. Only the holder of `ownerXPriv` can open it ΓÇö the
 * same reasoning that lets `/api/vault/grants/pending` return `wrappedFieldKey`.
 *
 * IMPORTANT: `senderXPub` is the node's X25519 pubkey (the envelope's sender).
 * It is NOT called `nodeXPub` because the field is inherited from the wrap
 * direction, but it plays exactly that role ΓÇö it is both the ECDH counterparty
 * for unwrapping this envelope AND the recipient to wrap the renewed grant to.
 */
export interface RenewableGrant {
    field: string;
    keyId: string;
    reason: 'missing' | 'expiring';
    expiresAt: string | null;
    ownerXPub: string;
    senderXPub: string;
    wrappedKey: string;
    wrappedNonce: string;
}

// ΓöÇΓöÇ VaultGrantService ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
     * Fetch the owner agent's renewal worklist: fields whose delegation grant
     * is missing or expires within `withinDays`.
     *
     * Counterpart to fetchPendingGrants(): that covers fields the node has just
     * sealed and cannot yet read; this covers fields the node could read before
     * and can no longer, or soon won't be able to.
     */
    async fetchRenewableGrants(withinDays: number): Promise<RenewableGrant[]> {
        const url = `${this.baseUrl.replace(/\/$/, '')}/api/vault/grants/renewable?withinDays=${encodeURIComponent(String(withinDays))}`;
        try {
            const response = await axios.get<{ grants: RenewableGrant[] }>(url, {
                headers: { Authorization: `Bearer ${this.adminToken}` },
                timeout: 10_000,
            });
            return response.data.grants ?? [];
        } catch (err) {
            throw new Error(`Failed to fetch renewable grants from ${url}: ${formatAxiosError(err)}`);
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

// ΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function formatAxiosError(err: unknown): string {
    const axiosErr = err as AxiosError<{ error?: string }>;
    if (axiosErr.response) {
        const msg = axiosErr.response.data?.error ?? axiosErr.response.statusText;
        return `HTTP ${axiosErr.response.status}: ${msg}`;
    }
    return String(err);
}
