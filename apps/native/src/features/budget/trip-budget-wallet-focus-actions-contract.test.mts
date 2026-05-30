import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget overview actions contract", () => {
	it("keeps the first budget viewport focused on expense tracking", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		expect(source).toContain("BudgetOverviewCard");
		expect(source).toContain("Log expense");
		expect(source).toContain("Bookings");
		expect(source).toContain("openNewExpenseForm");
		expect(source).toContain("handleAddCategoryExpense");
		expect(source).toContain("getExpenseCategory(item.category)");
	});
});
