import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip companions empty lead action contract", () => {
	it("keeps the empty lead contact summary connected to organizer capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-companions-screen.tsx"
		);

		expect(source).toContain("No lead contact yet");
		expect(source).toContain("Add lead contact");
		expect(source).toContain("openLeadContactSheet");
		expect(source).toContain('role: "organizer"');
	});
});
