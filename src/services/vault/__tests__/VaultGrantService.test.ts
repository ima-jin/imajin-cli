/**
 * VaultGrantService tests (#1536).
 *
 * Verifies:
 *   - fetchRenewableGrants() calls the right URL with withinDays, and returns
 *     the grants array (or [] when the kernel omits it).
 *   - fetchRenewableGrants() wraps request failures with a helpful message.
 *   - submitGrant() omits requestId from the request body when not provided ΓÇö
 *     that omission is the renewal marker the kernel checks for.
 *   - submitGrant() still includes requestId for a normal seal-time handshake.
 */

import axios from 'axios';
import { VaultGrantService, type GrantSubmission } from '../VaultGrantService.js';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const BASE_URL = 'https://kernel.example';
const TOKEN = 'admin-token-123';

function baseSubmission(overrides: Partial<GrantSubmission> = {}): GrantSubmission {
    return {
        subject: 'did:imajin:owner123',
        grantedTo: 'did:imajin:node456',
        field: 'GH_TOKEN',
        ownerXPub: 'a'.repeat(64),
        wrappedKey: 'wrapped-key',
        wrappedNonce: 'wrapped-nonce',
        keyId: 'kid:1',
        ownerSignature: 'sig',
        ...overrides,
    };
}

describe('VaultGrantService.fetchRenewableGrants', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('requests /api/vault/grants/renewable with the withinDays query param', async () => {
        mockedAxios.get.mockResolvedValue({ data: { grants: [] } });
        const service = new VaultGrantService(BASE_URL, TOKEN);

        await service.fetchRenewableGrants(7);

        // mockedAxios.get is a jest mock function, not a `this`-bound method.
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockedAxios.get).toHaveBeenCalledWith(
            `${BASE_URL}/api/vault/grants/renewable?withinDays=7`,
            expect.objectContaining({
                headers: { Authorization: `Bearer ${TOKEN}` },
            }),
        );
    });

    it('strips a trailing slash from the base URL', async () => {
        mockedAxios.get.mockResolvedValue({ data: { grants: [] } });
        const service = new VaultGrantService(`${BASE_URL}/`, TOKEN);

        await service.fetchRenewableGrants(3);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockedAxios.get).toHaveBeenCalledWith(
            `${BASE_URL}/api/vault/grants/renewable?withinDays=3`,
            expect.anything(),
        );
    });

    it('returns the grants array from the response', async () => {
        const grants = [{
            field: 'GH_TOKEN', keyId: 'kid:1', reason: 'expiring' as const,
            expiresAt: '2030-01-01T00:00:00.000Z', ownerXPub: 'a'.repeat(64),
            senderXPub: 'b'.repeat(64), wrappedKey: 'k', wrappedNonce: 'n',
        }];
        mockedAxios.get.mockResolvedValue({ data: { grants } });
        const service = new VaultGrantService(BASE_URL, TOKEN);

        const result = await service.fetchRenewableGrants(7);

        expect(result).toEqual(grants);
    });

    it('returns an empty array when the kernel response omits grants', async () => {
        mockedAxios.get.mockResolvedValue({ data: {} });
        const service = new VaultGrantService(BASE_URL, TOKEN);

        const result = await service.fetchRenewableGrants(7);

        expect(result).toEqual([]);
    });

    it('wraps a failed request in a descriptive error', async () => {
        mockedAxios.get.mockRejectedValue(new Error('network down'));
        const service = new VaultGrantService(BASE_URL, TOKEN);

        await expect(service.fetchRenewableGrants(7)).rejects.toThrow(
            /Failed to fetch renewable grants/
        );
    });
});

describe('VaultGrantService.submitGrant', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('omits requestId from the submitted body for a renewal', async () => {
        mockedAxios.post.mockResolvedValue({ data: { ok: true, grantId: 'vdg_1', field: 'GH_TOKEN', renewal: true } });
        const service = new VaultGrantService(BASE_URL, TOKEN);

        await service.submitGrant(baseSubmission());

        const [, body] = mockedAxios.post.mock.calls[0]!;
        expect(Object.prototype.hasOwnProperty.call(body, 'requestId')).toBe(false);
    });

    it('includes requestId for a new-grant handshake', async () => {
        mockedAxios.post.mockResolvedValue({ data: { ok: true, grantId: 'vdg_2', field: 'GH_TOKEN' } });
        const service = new VaultGrantService(BASE_URL, TOKEN);

        await service.submitGrant(baseSubmission({ requestId: 'req-abc' }));

        const [, body] = mockedAxios.post.mock.calls[0]! as [string, GrantSubmission];
        expect(body.requestId).toBe('req-abc');
    });

    it('posts to /api/vault/delegation/grant with the admin bearer token', async () => {
        mockedAxios.post.mockResolvedValue({ data: { ok: true, grantId: 'vdg_3', field: 'GH_TOKEN' } });
        const service = new VaultGrantService(BASE_URL, TOKEN);

        await service.submitGrant(baseSubmission());

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${BASE_URL}/api/vault/delegation/grant`,
            expect.any(Object),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
            }),
        );
    });

    it('wraps a failed submission in a descriptive error naming the field', async () => {
        mockedAxios.post.mockRejectedValue(new Error('boom'));
        const service = new VaultGrantService(BASE_URL, TOKEN);

        await expect(service.submitGrant(baseSubmission({ field: 'STRIPE_KEY' }))).rejects.toThrow(
            /Failed to submit grant for 'STRIPE_KEY'/
        );
    });
});
