import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip companions lead contact contract", () => {
	it("keeps the lead contact summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-companions-screen.tsx"
		);

		expect(source).toContain("Review lead");
		expect(source).toContain("Call lead");
		expect(source).toContain("Message lead");
		expect(source).toContain("Email lead");
		expect(source).toContain("openEditSheet(leadCompanion)");
	});
});
