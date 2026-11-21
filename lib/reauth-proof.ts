import "server-only";
import crypto from "crypto";

/**
 * Short-lived, signed proof that the acting admin really typed their own
 * password a moment ago.
 *
 * The change-password flow is intentionally two requests: verifying the current
 * password and then applying the new one. Without a proof binding the two, a
 * hijacked ID token could skip straight to step 2. The proof carries who
 * verified, when, and for which target, so it cannot be replayed against a
 * different account or reused after the window closes.
 */

const PROOF_TTL_MS = 5 * 60 * 1000;

interface ProofPayload {
    /** Acting admin who proved their identity. */
    au: string;
    /** Acting admin's email, for audit readability only. */
    ae: string;
    /** Account whose password is being changed. */
    tu: string;
    /** Issued-at, epoch ms. */
    ts: number;
    /** HMAC of the verified old password, so we can refuse an unchanged one. */
    oh: string;
}

function getSigningSecret(): string {
    const explicit = process.env.ADMIN_REAUTH_SECRET;
    if (explicit) return explicit;

    // Fall back to a key derived from a secret the server already requires.
    // Deriving (rather than reading it raw) keeps the service account private
    // key out of any accidental logging, and the service account is rotated
    // rarely enough that in-flight proofs are unaffected.
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
        throw new Error(
            "Cannot issue a re-auth proof: set ADMIN_REAUTH_SECRET or FIREBASE_SERVICE_ACCOUNT_KEY."
        );
    }

    let material = raw;
    try {
        material = JSON.parse(raw)?.private_key || raw;
    } catch {
        // Not JSON — use the literal value.
    }
    return crypto.createHash("sha256").update(material).digest("hex");
}

const b64url = (input: Buffer | string) =>
    Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (input: string) =>
    Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function sign(data: string): string {
    return b64url(crypto.createHmac("sha256", getSigningSecret()).update(data).digest());
}

/** Salted digest of a password, used only to reject an unchanged password. */
export function passwordDigest(password: string): string {
    return crypto
        .createHmac("sha256", getSigningSecret())
        .update(`pwd:${password}`)
        .digest("hex");
}

export function issueReauthProof(input: {
    actorUid: string;
    actorEmail: string;
    targetUid: string;
    oldPassword: string;
}): string {
    const payload: ProofPayload = {
        au: input.actorUid,
        ae: input.actorEmail,
        tu: input.targetUid,
        ts: Date.now(),
        oh: passwordDigest(input.oldPassword),
    };

    const encoded = b64url(JSON.stringify(payload));
    return `${encoded}.${sign(encoded)}`;
}

export type ProofVerification =
    | { ok: true; payload: ProofPayload }
    | { ok: false; reason: string };

export function verifyReauthProof(
    token: unknown,
    expected: { actorUid: string; targetUid: string }
): ProofVerification {
    if (typeof token !== "string" || !token.includes(".")) {
        return { ok: false, reason: "Missing re-authentication proof. Please verify your password again." };
    }

    const [encoded, providedSig] = token.split(".");
    const expectedSig = sign(encoded);

    const a = Buffer.from(providedSig ?? "");
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false, reason: "Re-authentication proof is invalid. Please verify your password again." };
    }

    let payload: ProofPayload;
    try {
        payload = JSON.parse(fromB64url(encoded));
    } catch {
        return { ok: false, reason: "Re-authentication proof is malformed." };
    }

    if (payload.au !== expected.actorUid) {
        return { ok: false, reason: "Re-authentication proof belongs to a different admin." };
    }
    if (payload.tu !== expected.targetUid) {
        return { ok: false, reason: "Re-authentication proof was issued for a different account." };
    }

    const age = Date.now() - payload.ts;
    if (!Number.isFinite(age) || age < 0 || age > PROOF_TTL_MS) {
        return { ok: false, reason: "Re-authentication expired. Please verify your password again." };
    }

    return { ok: true, payload };
}

/** True when the candidate is byte-identical to the password just verified. */
export function isUnchangedPassword(payload: ProofPayload, candidate: string): boolean {
    return payload.oh === passwordDigest(candidate);
}
