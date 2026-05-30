import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap wrap-up navigation contract", () => {
	it("keeps wrap-up checklist rows navigable to their source modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain("actionHref={VIYA_ROUTES.tripPlaces(tripId)}");
		expect(source).toContain("actionHref={VIYA_ROUTES.tripVault(tripId)}");
		expect(source).toContain("actionHref={VIYA_ROUTES.tripBudget(tripId)}");
		expect(source).toContain('actionLabel="Open route"');
		expect(source).toContain('actionLabel="Open files"');
		expect(source).toContain('actionLabel="Open budget"');
		expect(source).toContain("Link asChild");
	});
});
