import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget category quick add contract", () => {
	it("keeps spend breakdown categories connected to prefilled expense entry", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		expect(source).toContain("CategoryBreakdownRow");
		expect(source).toContain("onAddCategoryExpense");
		expect(source).toContain("Add expense");
		expect(source).toContain("getExpenseCategory(item.category)");
		expect(source).toContain("setEditingExpenseId(null)");
		expect(source).toContain("setExpenseErrorMessage(null)");
	});
});
