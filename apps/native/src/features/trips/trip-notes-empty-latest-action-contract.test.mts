import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip notes empty latest action contract", () => {
	it("keeps the empty latest-context summary connected to note capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-notes-screen.tsx"
		);

		expect(source).toContain("No context captured yet");
		expect(source).toContain("Add first note");
		expect(source).toContain("onPress={openCreateSheet}");
		expect(source).toContain("Review latest");
	});
});
