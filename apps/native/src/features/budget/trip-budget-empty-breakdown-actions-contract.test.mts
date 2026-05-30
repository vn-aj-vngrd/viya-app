import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget header action contract", () => {
	it("keeps expense creation in the header add action and sheet", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		expect(source).toContain('accessibilityLabel="Add expense"');
		expect(source).toContain('icon="add"');
		expect(source).toContain("ExpenseFormSheet");
		expect(source).toContain("BottomSheet.Content");
		expect(source).toContain("Add expense");
		expect(source).toContain("setExpenseForm(initialExpenseForm())");
	});
});
