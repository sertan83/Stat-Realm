const MAX_REVIEW_LENGTH = 1000;

export function sanitizeReviewText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, MAX_REVIEW_LENGTH);
}

export function normalizeOptionalReviewText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const sanitized = sanitizeReviewText(value);
  return sanitized.length > 0 ? sanitized : null;
}
