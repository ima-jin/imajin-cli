/**
 * Tests for custody-pair resolution (#1603).
 *
 * The owner agent signs a grant naming two DIDs. Getting `grantedTo` wrong does
 * not fail loudly: the kernel installs a grant nobody reads while the credential
 * that needed it stays unusable. These pin the rule both signing paths share.
 */
import { resolveCustodyPair, isDelegatedGrantee } from '../custody-pair.js';

const OWNER_DID = 'did:imajin:owner';
const NODE_DID = 'did:imajin:testnode';
const PRINCIPAL = 'did:imajin:veteze';
const CONNECTOR = 'did:imajin:warp-connector';

const fallback = { ownerDid: OWNER_DID, nodeDid: NODE_DID };

describe('resolveCustodyPair', () => {
    it('signs the pair the kernel asked for', () => {
        expect(
            resolveCustodyPair({ subject: PRINCIPAL, grantedTo: CONNECTOR }, fallback),
        ).toEqual({ subject: PRINCIPAL, grantedTo: CONNECTOR });
    });

    it('falls back to the self-grant shape for a pre-#1603 kernel', () => {
        // Those kernels only ever queued node self-grants, so this is exact rather
        // than a guess — and it is what keeps the CLI working against them.
        expect(resolveCustodyPair({}, fallback)).toEqual({
            subject: OWNER_DID,
            grantedTo: NODE_DID,
        });
    });

    it('treats a blank grantee as unset rather than signing an empty DID', () => {
        // An empty DID would produce a grant row that matches nothing, which is a
        // silent failure rather than a rejected request.
        expect(resolveCustodyPair({ subject: '  ', grantedTo: '' }, fallback)).toEqual({
            subject: OWNER_DID,
            grantedTo: NODE_DID,
        });
    });

    it('trims incidental whitespace', () => {
        expect(
            resolveCustodyPair({ subject: ` ${PRINCIPAL} `, grantedTo: ` ${CONNECTOR} ` }, fallback),
        ).toEqual({ subject: PRINCIPAL, grantedTo: CONNECTOR });
    });

    it('resolves each side independently', () => {
        // A kernel that states only the grantee still gets the right grantee.
        expect(resolveCustodyPair({ grantedTo: CONNECTOR }, fallback)).toEqual({
            subject: OWNER_DID,
            grantedTo: CONNECTOR,
        });
    });

    it('ignores a non-string value from an untyped JSON payload', () => {
        const requested = { subject: 42 as unknown as string, grantedTo: null as unknown as string };
        expect(resolveCustodyPair(requested, fallback)).toEqual({
            subject: OWNER_DID,
            grantedTo: NODE_DID,
        });
    });
});

describe('isDelegatedGrantee', () => {
    it('is false for the node own self-grant', () => {
        expect(isDelegatedGrantee({ subject: OWNER_DID, grantedTo: NODE_DID }, NODE_DID)).toBe(false);
    });

    it('is true when a third party is being authorized', () => {
        // This is what the serve prompt surfaces, so an operator can see they are
        // granting a connector rather than the node they are running.
        expect(isDelegatedGrantee({ subject: PRINCIPAL, grantedTo: CONNECTOR }, NODE_DID)).toBe(true);
    });
});
