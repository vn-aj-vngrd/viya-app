import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

describe("trip dashboard simplified workspace contract", () => {
	it("keeps the primary workspace focused on itinerary, budget, vault, and readiness", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-components.tsx"
		);

		expect(source).toContain('type WorkspaceModuleGroupKey = "core"');
		expect(source).toContain("includeOverview: true");
		expect(source).toContain('label: "Overview"');
		expect(source).toContain('span: "full"');
		expect(source).toContain('label: "Itinerary"');
		expect(source).toContain('label: "Budget"');
		expect(source).toContain('label: "Vault"');
		expect(source).toContain('label: "Readiness"');
		expect(source).toContain("Bookings, passports, tickets, and documents");
		expect(source).toContain(
			'backgroundClassName="rounded-t-[36px] bg-surface"'
		);
	});
});
