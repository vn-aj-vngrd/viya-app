import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip dashboard preview source actions contract", () => {
	it("keeps booking and document preview rows connected to source modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-tabs.tsx"
		);

		expect(source).toContain("DashboardPreviewActionRow");
		expect(source).toContain('actionLabel="Open booking"');
		expect(source).toContain('actionLabel="Open document"');
		expect(source).toContain(
			'linkedEntityHref ? "Open linked item" : "Open file"'
		);
		expect(source).toContain("getTripRelatedEntityHref");
		expect(source).toContain("href={VIYA_ROUTES.tripBookings(model.tripId)}");
		expect(source).toContain(
			"href={linkedEntityHref ?? VIYA_ROUTES.tripVault(model.tripId)}"
		);
	});
});
