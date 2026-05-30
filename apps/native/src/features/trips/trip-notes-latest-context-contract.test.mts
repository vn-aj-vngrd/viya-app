import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip notes latest context contract", () => {
	it("keeps the latest context summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-notes-screen.tsx"
		);

		expect(source).toContain("latestNoteRelatedHref");
		expect(source).toContain("Review latest");
		expect(source).toContain("Open latest link");
		expect(source).toContain("openEditSheet(latestNote)");
	});
});
