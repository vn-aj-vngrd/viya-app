import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap moment coverage actions contract", () => {
	it("keeps recap story coverage and empty memory rows connected to moments", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain('actionLabel="Add memory"');
		expect(source).toContain('actionLabel="Review story coverage"');
		expect(source).toContain('label="No moments captured yet"');
		expect(source).toContain('label="Story coverage"');
		expect(source).toContain("actionHref={VIYA_ROUTES.tripMoments(tripId)}");
	});
});
