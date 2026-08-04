import { ImajinAiIdentityService } from '../../../services/imajin-ai/ImajinAiIdentityService.js';
import { ImajinAiSessionService } from '../../../services/imajin-ai/ImajinAiSessionService.js';
import type { Logger } from '../../../logging/Logger.js';

jest.mock('../../../services/imajin-ai/ImajinAiSessionService');
jest.mock('../../../http/HttpClientSimple');

const mockPost = jest.fn().mockResolvedValue({ data: { id: 'att_test' } });
const mockGet = jest.fn().mockResolvedValue({ data: [] });

jest.mock('../../../http/HttpClientSimple', () => ({
    HttpClientSimple: jest.fn().mockImplementation(() => ({
        post: mockPost,
        get: mockGet,
    })),
}));

const mockLogger: Logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
} as unknown as Logger;

const mockSessionService = {
    getBaseUrl: jest.fn().mockReturnValue('https://api.imajin.ai'),
    getAuthHeadersForRequest: jest.fn().mockResolvedValue({ Cookie: 'imajin_session=abc' }),
    fetchSession: jest.fn(),
    createLoginChallenge: jest.fn(),
} as unknown as ImajinAiSessionService;

describe('ImajinAiIdentityService', () => {
    let service: ImajinAiIdentityService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ImajinAiIdentityService(mockSessionService, mockLogger);
    });

    describe('createAttestation', () => {
        const validInput = {
            issuerDid: 'did:imajin:issuer',
            subjectDid: 'did:imajin:subject',
            type: 'github_account',
            signature: 'abc123sig',
        };

        it('POSTs to /auth/api/attestations (not /api/attestations or registry/api/attestations)', async () => {
            await service.createAttestation(validInput);

            expect(mockPost).toHaveBeenCalledTimes(1);
            const [path] = mockPost.mock.calls[0];
            expect(path).toBe('/auth/api/attestations');
        });

        it('sends required fields in the payload', async () => {
            await service.createAttestation(validInput);

            const [, payload] = mockPost.mock.calls[0];
            expect(payload).toMatchObject({
                issuer_did: validInput.issuerDid,
                subject_did: validInput.subjectDid,
                type: validInput.type,
                signature: validInput.signature,
            });
        });

        it('accepts new attestation types from issue #1281 vocabulary', async () => {
            const newTypes = [
                'github_account',
                'contributor.issue.closed',
                'contributor.pr.merged',
                'contributor.rfc.authored',
                'contributor.review',
                'contributor.design',
            ];

            for (const type of newTypes) {
                mockPost.mockClear();
                await service.createAttestation({ ...validInput, type });
                const [, payload] = mockPost.mock.calls[0];
                expect(payload.type).toBe(type);
            }
        });

        it('throws when issuerDid is missing', async () => {
            await expect(
                service.createAttestation({ ...validInput, issuerDid: '' })
            ).rejects.toThrow('issuerDid is required');
        });

        it('throws when subjectDid is missing', async () => {
            await expect(
                service.createAttestation({ ...validInput, subjectDid: '' })
            ).rejects.toThrow('subjectDid is required');
        });

        it('returns response data', async () => {
            const result = await service.createAttestation(validInput);
            expect(result).toEqual({ id: 'att_test' });
        });
    });
});
