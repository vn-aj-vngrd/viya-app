const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_ALLOWED_PATTERN = /^\+?[\d\s().-]+$/;
const NON_DIGIT_PATTERN = /\D/g;
const WHITESPACE_PATTERN = /\s+/g;
const MIN_PHONE_DIGITS = 5;
const MAX_PHONE_DIGITS = 15;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s/$.?#][^\s]*$/i;

/** Collapses whitespace and trims; empty string when nothing is left. */
export const cleanText = (value: string): string =>
	value.replace(WHITESPACE_PATTERN, " ").trim();

/** Trims but keeps line breaks, for notes and descriptions. */
export const cleanMultilineText = (value: string): string => value.trim();

export const isValidEmail = (value: string): boolean =>
	EMAIL_PATTERN.test(value.trim());

export const isValidPhone = (value: string): boolean => {
	const trimmed = value.trim();

	if (!PHONE_ALLOWED_PATTERN.test(trimmed)) {
		return false;
	}

	const digits = trimmed.replace(NON_DIGIT_PATTERN, "").length;

	return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS;
};

export const isValidHttpUrl = (value: string): boolean =>
	HTTP_URL_PATTERN.test(value.trim());

/**
 * Normalises an optional contact field. Returns null for "blank" (caller
 * stores nothing), the cleaned value when valid, or undefined when invalid.
 */
export const normalizeOptionalContact = (
	value: string | undefined | null,
	kind: "email" | "phone"
): string | null | undefined => {
	const trimmed = value?.trim() ?? "";

	if (!trimmed) {
		return null;
	}

	const valid =
		kind === "email" ? isValidEmail(trimmed) : isValidPhone(trimmed);

	if (!valid) {
		return;
	}

	return kind === "email" ? trimmed.toLowerCase() : trimmed;
};
