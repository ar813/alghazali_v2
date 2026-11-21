export const DEFAULT_BANNER_URL =
  "https://alghazali.vercel.app/email_data_format/333.jpg";

export const DEFAULT_BANNER_NAME = "Al-Ghazali Official Banner";

/** Gmail clips the message body at ~102KB. Leave headroom for provider wrapping. */
export const MAX_EMAIL_HTML_BYTES = 90 * 1024;

export type BannerUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Validates and normalises a banner URL.
 *
 * A banner must always be a short, publicly reachable HTTPS URL. Email clients
 * cannot authenticate and cannot resolve `data:` URIs reliably, so a base64
 * inline image is never acceptable here — it inflates the HTML past Gmail's
 * clip limit and renders as a broken image.
 */
export function sanitizeBannerUrl(input: unknown): BannerUrlResult {
  if (typeof input !== "string") {
    return { ok: true, url: DEFAULT_BANNER_URL };
  }

  const raw = input.trim();
  if (!raw) {
    return { ok: true, url: DEFAULT_BANNER_URL };
  }

  if (/^data:/i.test(raw)) {
    return {
      ok: false,
      reason:
        "Inline base64 banner images are not supported — they make the email exceed Gmail's 102KB clip limit. Please upload the banner through the banner manager so it is stored as a public image URL.",
    };
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { ok: false, reason: `"${raw}" is not a valid image URL.` };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "Banner images must be served over HTTPS for email clients to load them.",
    };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Scans markdown for `:::banner url="..." :::` blocks that inline a data URI and
 * removes them, since they would be embedded a second time on top of the header
 * banner. Returns the cleaned markdown plus whether anything was removed.
 */
export function stripInlineDataUriBanners(markdown: string): {
  markdown: string;
  removed: number;
} {
  let removed = 0;
  const cleaned = markdown.replace(
    /^:::banner\s+[\s\S]*?:::$/gim,
    (block) => {
      if (/\burl\s*=\s*["']?\s*data:/i.test(block) || /\bsrc\s*=\s*["']?\s*data:/i.test(block)) {
        removed += 1;
        return "";
      }
      return block;
    }
  );
  return { markdown: cleaned, removed };
}

/** Rejects any remaining data: image reference anywhere in a string. */
export function containsDataUri(value: string): boolean {
  return /["'(\s]data:image\//i.test(value);
}
