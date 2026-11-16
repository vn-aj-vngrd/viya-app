import { describe, expect, it } from "vitest";

import {
	cleanText,
	isValidEmail,
	isValidHttpUrl,
	isValidPhone,
	normalizeOptionalContact,
} from "./validation";

describe("validation helpers", () => {
	it("cleans whitespace", () => {
		expect(cleanText("  Maria   Santos ")).toBe("Maria Santos");
		expect(cleanText("   ")).toBe("");
	});

	it("validates email, phone and url", () => {
		expect(isValidEmail("a@b.co")).toBe(true);
		expect(isValidEmail("a@b")).toBe(false);
		expect(isValidPhone("+63 917 123 4567")).toBe(true);
		expect(isValidPhone("abc")).toBe(false);
		expect(isValidPhone("12")).toBe(false);
		expect(isValidHttpUrl("https://example.com/x")).toBe(true);
		expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
	});

	it("normalises optional contacts to null, value or undefined", () => {
		expect(normalizeOptionalContact("  ", "email")).toBeNull();
		expect(normalizeOptionalContact(" A@B.CO ", "email")).toBe("a@b.co");
		expect(normalizeOptionalContact("nope", "email")).toBeUndefined();
		expect(normalizeOptionalContact("0917 123 4567", "phone")).toBe(
			"0917 123 4567"
		);
	});
});
