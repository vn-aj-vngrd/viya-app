import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip dashboard checklist and budget preview actions contract", () => {
	it("keeps checklist tasks and budget categories connected to their modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-tabs.tsx"
		);

		expect(source).toContain('actionLabel="Open checklist item"');
		expect(source).toContain('actionLabel="Review category spend"');
		expect(source).toContain("href={VIYA_ROUTES.tripReadiness(model.tripId)}");
		expect(source).toContain("href={VIYA_ROUTES.tripBudget(model.tripId)}");
	});
});
