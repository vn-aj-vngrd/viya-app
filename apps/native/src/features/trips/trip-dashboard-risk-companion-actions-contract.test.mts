import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip dashboard risk and companion preview actions contract", () => {
	it("keeps risk and companion preview rows connected to owning modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-tabs.tsx"
		);

		expect(source).toContain('actionLabel="Open risk"');
		expect(source).toContain('actionLabel="Review resolved risk"');
		expect(source).toContain('actionLabel="Open companion"');
		expect(source).toContain("href={VIYA_ROUTES.tripRisks(model.tripId)}");
		expect(source).toContain("href={VIYA_ROUTES.tripCompanions(model.tripId)}");
	});
});
