# Vault Key Recovery Guide

This document explains how to back up and recover the owner vault X25519 key used by `imajin vault serve` (Tier 1 custody).

---

## Why this matters

Under Tier 1 custody, your owner vault X25519 private key lives exclusively on your local machine — it is never sent to the cloud node. This means:

- ✅ The cloud node cannot access your secrets without your participation.
- ⚠️ If the key is lost (hardware failure, reinstall, theft), any vault fields sealed under Tier 1 are **permanently unrecoverable**. There is no fallback and no "forgot my key" recovery path.

**Create a Shamir backup _before_ you begin sealing production secrets.**

---

## How the backup works

`imajin vault backup` uses [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_secret_sharing) to split the owner key seed into **N** encrypted shares. Any **M** of those shares are sufficient to reconstruct the key; fewer than M reveal nothing.

Each share is:
- Encrypted with an independently chosen passphrase (AES-256-GCM, PBKDF2-SHA256 key derivation).
- Written as a self-describing JSON file (`.enc`) that includes creation timestamp, threshold/total counts, share index, and a key fingerprint for identification.
- Safe to store in plain sight **as long as fewer than M passphrases are compromised simultaneously**.

---

## Step 1 — Create a backup

```bash
imajin vault backup --shares 3 --threshold 2 --out ./vault-recovery
```

This produces `vault-recovery/share-1.enc`, `share-2.enc`, and `share-3.enc`.

You will be prompted to enter and confirm a separate passphrase for each share.

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--shares N` | `3` | Total shares to produce |
| `--threshold M` | `2` | Minimum shares required for recovery |
| `--out <dir>` | `./vault-recovery` | Output directory |

A 2-of-3 split (the default) means any 2 shares recover the key. Even if one share is lost or its passphrase is forgotten, recovery is still possible.

---

## Step 2 — Distribute shares safely

**Store each share in a separate location.** Good examples:

- Share 1: Encrypted USB drive in a locked drawer at your office.
- Share 2: Secure cloud storage (e.g. a password manager attachment).
- Share 3: Trusted custodian (colleague, lawyer, secure notes app).

**Do not store all shares in the same place** — that would defeat the purpose of splitting.

Each share file is safe to store alongside other files; it is encrypted and reveals nothing without the passphrase.

---

## Step 3 — Recovery procedure

If you need to restore the key on a new machine (or after reinstalling):

1. **Gather at least M share files.** You need only 2 of the 3 (with the default 2-of-3 split).

2. **Run the restore command:**

   ```bash
   imajin vault restore ./vault-recovery/share-1.enc ./vault-recovery/share-3.enc
   ```

   You will be prompted for each share's passphrase.

3. **Verify the restored key matches your kernel configuration:**

   ```bash
   imajin vault pubkey
   ```

   The printed `VAULT_OWNER_X_PUB` must match what is set as `VAULT_OWNER_X_PUB` on the kernel. If it differs, you may have restored from a different backup — check that you used shares from the same backup set (they share a fingerprint).

4. **Start the owner agent:**

   ```bash
   imajin vault serve
   ```

   The cloud node will now be able to process new grant requests for any vault fields that need re-sealing.

---

## Keeping the agent alive under expiring grants

If the kernel has `VAULT_GRANT_TTL_DAYS` set, delegation grants expire, and expiry **crypto-erases** the wrapped field key on the kernel side. An expired grant is not a soft failure — the node cannot read that field again until the owner agent issues a fresh grant. `vault serve` handles this automatically by polling for grants that are missing or nearing expiry, alongside its usual poll for new grant requests.

**Flags:**

| Flag | Default | Description |
|---|---|---|
| `--renew-policy <prompt\|auto\|never>` | `prompt` | Approval policy for renewals. See below. |
| `--renew-within <days>` | `7` | Treat a grant as renewable this many days before it expires. Keep this comfortably above `--interval` so a briefly-offline agent isn't treated as an outage. |
| `--grant-ttl-days <days>` | none (no expiry) | TTL applied to a *renewed* grant. See the caveat below before relying on this. |

**`--renew-policy` is separate from `--auto-approve` on purpose.** Approving a *new* grant request costs little: the node already holds the plaintext it just sealed, and it cannot fabricate a request for a field it cannot read. Approving a *renewal* is different — it extends the node's access to a secret it may no longer legitimately need, on a recurring schedule, with no human in the loop. `--auto-approve` never implies `--renew-policy auto`; unattended renewal requires asking for it explicitly:

```bash
imajin vault serve --auto-approve --renew-policy auto
```

Running with `--renew-policy prompt` (the default) means an offline/unattended agent will stall waiting for a renewal confirmation the first time a grant needs renewing. If you want the agent to survive expiry with nobody watching, you need `--renew-policy auto`; `--renew-policy never` disables renewal entirely and leaves a lapsed grant as a lockout until you run `vault serve` interactively.

Every renewal (and every skip or failure) is reported on stdout, so a silently-failing renewal is visible before it takes down a connector.

**`--grant-ttl-days` is a known-imperfect stopgap.** The actual expiry policy (`VAULT_GRANT_TTL_DAYS`) lives on the kernel, and the CLI currently has no way to read it — this flag is a *second, unenforced* copy of that setting. Nothing checks that the two agree. If you set `VAULT_GRANT_TTL_DAYS` on the kernel, set a matching `--grant-ttl-days` here, or renewed grants will stop expiring after their first renewal (silently ending TTL rotation for that field, which is worse than never enabling it, since it looks like rotation is still happening). Track ima-jin/imajin-ai#1558 for a kernel-advertised TTL that would remove this requirement.

---

## What happens if fewer than M shares are available

If you have fewer than M shares (or if their passphrases are lost):

> **The owner vault key cannot be recovered. Any vault fields sealed under Tier 1 are permanently unreadable.**

There is no backdoor, no recovery escrow, and no support ticket that can help — this is the honest trade-off of owner-custody. The cloud node holds only encrypted ciphertext; without the owner key it cannot unseal anything.

**This is why you must create a backup before relying on Tier 1 for production secrets.**

---

## Share file format

Each `.enc` file is a JSON document:

```json
{
  "version": 1,
  "createdAt": "2026-07-29T04:00:00.000Z",
  "threshold": 2,
  "total": 3,
  "shareIndex": 1,
  "fingerprint": "ab12cd34",
  "salt": "<base64 PBKDF2 salt>",
  "nonce": "<base64 AES-GCM nonce>",
  "encryptedShare": "<base64 authTag + ciphertext>"
}
```

The `fingerprint` field contains the first 8 hex characters of `ownerXPub`. Use it to confirm that all shares you are presenting belong to the same backup.

---

## Replacing a lost share

If you lose one share (but still have ≥ M), you can create a fresh backup from the recovered key:

```bash
imajin vault restore share-1.enc share-3.enc   # recover
imajin vault backup --shares 3 --threshold 2 --out ./new-vault-recovery  # re-split
```

Distribute the new shares and securely delete the old ones.
