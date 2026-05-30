import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("readiness top gap actions contract", () => {
	it("keeps the top readiness gap summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		expect(source).toContain("TopReadinessGapSummary");
		expect(source).toContain("Review top gap");
		expect(source).toContain("Open top category");
		expect(source).toContain("Open top owner");
		expect(source).toContain("Mark top done");
		expect(source).toContain("openEditSheet(highestPriorityItem)");
	});
});
