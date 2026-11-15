import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("readiness empty top gap action contract", () => {
	it("keeps the empty top gap summary connected to task capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/readiness/readiness-screen.tsx"
		);

		expect(source).toContain("Nothing left to do");
		expect(source).toContain("onAddTask");
		expect(source).toContain("Add task");
		expect(source).toContain("openSheet");
	});
});
