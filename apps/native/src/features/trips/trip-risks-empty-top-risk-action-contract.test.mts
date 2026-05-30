import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip risks empty top risk action contract", () => {
	it("keeps the empty top risk summary connected to risk capture", () => {
		const source = readWorkspaceFile(
			"apps/native/app/(app)/trips/[tripId]/risks.tsx"
		);

		expect(source).toContain("No active risk");
		expect(source).toContain("onCreateTopRisk");
		expect(source).toContain("Add top risk");
		expect(source).toContain("openCreateSheet");
	});
});
