import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap moment coverage actions contract", () => {
	it("keeps the empty recap highlights row connected to moments", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain("No moments yet");
		expect(source).toContain('header="Highlights"');
		expect(source).toContain("router.push(VIYA_ROUTES.tripMoments(tripId))");
	});
});
