import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip dashboard travel alert actions contract", () => {
	it("keeps visible travel alerts connected to their source modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-tabs.tsx"
		);

		expect(source).toContain("TravelAlertRow");
		expect(source).toContain('actionLabel="Review risk"');
		expect(source).toContain('actionLabel="Fix gap"');
		expect(source).toContain("href={VIYA_ROUTES.tripRisks(model.tripId)}");
		expect(source).toContain("href={item.href}");
		expect(source).toContain('<LinkButton href={href} icon="open-outline">');
	});
});
