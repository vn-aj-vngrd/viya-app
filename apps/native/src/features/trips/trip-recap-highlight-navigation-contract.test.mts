import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap highlight navigation contract", () => {
	it("keeps recap highlight rows connected to the moments module", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain("router.push(VIYA_ROUTES.tripMoments(tripId))");
		expect(source).toContain("Open moments");
	});
});
