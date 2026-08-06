/**
 * Custody-pair resolution for delegation grants (#1603).
 *
 * @package     @imajin/cli
 * @subpackage  services/vault
 * @license     .fair LICENSING AGREEMENT
 *
 * A grant names two DIDs: `subject` (who is granting) and `grantedTo` (who is
 * authorized). Until #1603 the owner agent hardcoded them to `ownerDid` and
 * `nodeDid`, because the only custody shape a kernel could ask for was the node's
 * own self-grant.
 *
 * Static-secret credentials (#1439) are granted to a connector app DID instead,
 * so the kernel now states the pair on the request and the owner agent signs what
 * it was asked for. Kernels older than #1603 send neither field, and for those the
 * self-grant fallback is exact rather than a guess — no other shape could have
 * produced the request.
 *
 * Extracted as a pure function because the seal-time and renewal paths must agree
 * on the rule: if they drift, one of them signs a grant the kernel will reject or,
 * worse, a grant naming the wrong grantee that installs cleanly and is never read.
 *
 * IMPORTANT: `grantedTo` is an authorization label. It never changes where the
 * field key is wrapped — that stays the node's X25519 key, because the node
 * unseals on the grantee's behalf at call time.
 */

/** The DIDs a kernel may state on a grant request or renewal entry. */
export interface RequestedCustodyPair {
    subject?: string;
    grantedTo?: string;
}

/** The self-grant shape to assume when the kernel states nothing. */
export interface CustodyFallback {
    ownerDid: string;
    nodeDid: string;
}

export interface CustodyPair {
    subject: string;
    grantedTo: string;
}

/**
 * Resolve the pair to sign, preferring what the kernel asked for.
 *
 * Blank strings are treated as absent: a kernel that sends an empty column is
 * saying "unset", and signing a grant with an empty DID would produce a row that
 * matches nothing.
 */
export function resolveCustodyPair(
    requested: RequestedCustodyPair,
    fallback: CustodyFallback,
): CustodyPair {
    const subject = nonEmpty(requested.subject) ?? fallback.ownerDid;
    const grantedTo = nonEmpty(requested.grantedTo) ?? fallback.nodeDid;
    return { subject, grantedTo };
}

/** True when this grant authorizes someone other than the node itself. */
export function isDelegatedGrantee(pair: CustodyPair, nodeDid: string): boolean {
    return pair.grantedTo !== nodeDid;
}

function nonEmpty(value: string | undefined): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
