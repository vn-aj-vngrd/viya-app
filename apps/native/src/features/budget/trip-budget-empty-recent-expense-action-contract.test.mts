import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget empty all-expenses action contract", () => {
	it("keeps the empty all-expenses state connected to manual expense entry", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		expect(source).toContain("No expenses logged");
		expect(source).toContain("No budget or expenses yet");
		expect(source).toContain("Add expense");
		expect(source).toContain("openNewExpenseForm");
	});
});
