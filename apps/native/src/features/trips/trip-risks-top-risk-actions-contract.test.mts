import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip risks top risk actions contract", () => {
	it("keeps risk rows actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		expect(source).toContain("HeadsUpList");
		expect(source).toContain("onEdit(risk)");
		expect(source).toContain('label: "Handled"');
		expect(source).toContain("onMitigate(risk)");
		expect(source).toContain("Open linked item");
	});
});
