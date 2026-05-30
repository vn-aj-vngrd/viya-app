import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip dashboard story preview actions contract", () => {
	it("keeps notes, memories, recap highlights, and recap spend actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-tabs.tsx"
		);

		expect(source).toContain('actionLabel="Open note"');
		expect(source).toContain('actionLabel="Open memory"');
		expect(source).toContain('actionLabel="Open highlight"');
		expect(source).toContain('actionLabel="Review recap spend"');
		expect(source).toContain("href={VIYA_ROUTES.tripNotes(model.tripId)}");
		expect(source).toContain("href={VIYA_ROUTES.tripMoments(model.tripId)}");
		expect(source).toContain("href={VIYA_ROUTES.tripWrapped(model.tripId)}");
		expect(source).toContain("href={VIYA_ROUTES.tripBudget(model.tripId)}");
	});
});
