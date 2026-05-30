import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip moments empty spotlight action contract", () => {
	it("keeps the empty spotlight summary connected to moment capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-moments-screen.tsx"
		);

		expect(source).toContain("No spotlight yet");
		expect(source).toContain("Add first moment");
		expect(source).toContain("onCreateSpotlight");
		expect(source).toContain("onCreateSpotlight={openCreateSheet}");
	});
});
