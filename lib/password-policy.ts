/**
 * Shared password policy for the admin portal.
 *
 * Kept free of server-only imports so the same rules can drive the live
 * strength meter in the UI and be re-checked authoritatively on the server.
 * The server is always the source of truth; the client copy exists purely to
 * give instant feedback instead of a round trip per keystroke.
 */

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordRule {
    id: string;
    label: string;
    test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
    {
        id: "length",
        label: `At least ${PASSWORD_MIN_LENGTH} characters`,
        test: (p) => p.length >= PASSWORD_MIN_LENGTH,
    },
    {
        id: "lowercase",
        label: "One lowercase letter",
        test: (p) => /[a-z]/.test(p),
    },
    {
        id: "uppercase",
        label: "One uppercase letter",
        test: (p) => /[A-Z]/.test(p),
    },
    {
        id: "number",
        label: "One number",
        test: (p) => /\d/.test(p),
    },
];

/** Every rule the password fails, in display order. Empty means it passes. */
export const getPasswordIssues = (password: string): string[] =>
    PASSWORD_RULES.filter((rule) => !rule.test(password)).map((rule) => rule.label);

export const isPasswordValid = (password: string): boolean =>
    getPasswordIssues(password).length === 0;

export type StrengthLabel = "Empty" | "Weak" | "Fair" | "Good" | "Strong";

export interface PasswordStrength {
    /** 0–4, drives the number of filled meter segments. */
    score: number;
    label: StrengthLabel;
    /** Tailwind text colour for the label. */
    color: string;
    /** Tailwind background colour for the filled segments. */
    barColor: string;
}

/**
 * 0–4 score. The four policy rules give a guaranteed floor, then length and
 * character variety can push an already-valid password up to "Strong" so the
 * meter still discriminates between two valid passwords.
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
    if (!password) {
        return { score: 0, label: "Empty", color: "text-neutral-400", barColor: "bg-neutral-300 dark:bg-neutral-700" };
    }

    const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
    const variety = new Set(password.replace(/\s/g, "").split("")).size;
    const longEnough = password.length >= 12;
    const extraSymbols = /[^A-Za-z0-9]/.test(password);

    let score = passed;
    if (passed === PASSWORD_RULES.length) {
        if (longEnough && (variety >= 10 || extraSymbols)) score = 4;
        else if (longEnough || variety >= 8) score = 3;
    }

    const scale: Record<number, { label: StrengthLabel; color: string; barColor: string }> = {
        0: { label: "Weak", color: "text-red-500", barColor: "bg-red-500" },
        1: { label: "Weak", color: "text-red-500", barColor: "bg-red-500" },
        2: { label: "Fair", color: "text-amber-500", barColor: "bg-amber-500" },
        3: { label: "Good", color: "text-emerald-500", barColor: "bg-emerald-500" },
        4: { label: "Strong", color: "text-emerald-400", barColor: "bg-emerald-400" },
    };

    return { score, ...scale[score] };
};
