import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip risks top risk actions contract", () => {
	it("keeps the top risk summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/app/(app)/trips/[tripId]/risks.tsx"
		);

		expect(source).toContain("TopRiskSummary");
		expect(source).toContain("Review top risk");
		expect(source).toContain("Open top linked item");
		expect(source).toContain("Mark top mitigated");
		expect(source).toContain("openEditSheet(activeRisk)");
	});
});
