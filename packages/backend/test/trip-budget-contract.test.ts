import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const atomicExpenseCreatePattern =
	/addTripExpense[\s\S]*bookingId: v\.optional\(v\.id\("bookings"\)\)/;
const linkedReceiptCreatePattern =
	/addTripExpense[\s\S]*vaultItemId: v\.optional\(v\.id\("vaultItems"\)\)/;
const reverseVaultLinkPattern =
	/syncExpenseVaultLink\(ctx, undefined, args\.vaultItemId, expenseId\)/;
const createThenUpdatePattern = /const createdExpense = await addTripExpense/;
const explicitBookingUpdatePattern =
	/const shouldUpdateBooking = hasOwnObjectProperty\(args, "bookingId"\)/;
const explicitVaultUpdatePattern =
	/const shouldUpdateVaultItem = hasOwnObjectProperty\(args, "vaultItemId"\)/;
const conditionalExpenseBookingPatchPattern =
	/if \(shouldUpdateBooking\) \{\s*patch\.bookingId = args\.bookingId;\s*\}/;
const conditionalExpenseVaultPatchPattern =
	/if \(shouldUpdateVaultItem\) \{\s*patch\.vaultItemId = args\.vaultItemId;\s*\}/;
const conditionalExpenseVaultSyncPattern =
	/if \(shouldUpdateVaultItem\) \{\s*await syncExpenseVaultLink\(/;
const budgetWorkspaceSortImportPattern =
	/import \{[\s\S]*sortTripExpensesForReview[\s\S]*\} from "@viya-app\/domain";/;
const sortedWorkspaceExpensesPattern =
	/const sortedExpenses = sortTripExpensesForReview\(expenses\);/;
const budgetSummarySortedExpensesPattern =
	/getTripModuleSummaries\(\{[\s\S]*expenses: sortedExpenses,/;
const workspaceReturnsSortedExpensesPattern =
	/return \{[\s\S]*expenses: sortedExpenses,/;

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip budget contract", () => {
	it("creates linked expenses atomically", () => {
		const backendSource = readWorkspaceFile("packages/backend/convex/trips.ts");
		const budgetScreenSource = readWorkspaceFile(
			"apps/native/src/features/budget/trip-budget-screen.tsx"
		);

		assert.match(
			backendSource,
			atomicExpenseCreatePattern,
			"addTripExpense should accept a booking link"
		);
		assert.match(
			backendSource,
			linkedReceiptCreatePattern,
			"addTripExpense should accept a Vault receipt link"
		);
		assert.match(
			backendSource,
			reverseVaultLinkPattern,
			"addTripExpense should keep the Vault receipt reverse link aligned"
		);
		assert.doesNotMatch(
			budgetScreenSource,
			createThenUpdatePattern,
			"the budget screen should not depend on create-then-update for links"
		);
	});

	it("updates linked expenses without clearing omitted fields", () => {
		const backendSource = readWorkspaceFile("packages/backend/convex/trips.ts");

		assert.match(
			backendSource,
			explicitBookingUpdatePattern,
			"updateTripExpense should distinguish omitted booking links from clear requests"
		);
		assert.match(
			backendSource,
			explicitVaultUpdatePattern,
			"updateTripExpense should distinguish omitted Vault receipt links from clear requests"
		);
		assert.match(
			backendSource,
			conditionalExpenseBookingPatchPattern,
			"updateTripExpense should patch bookingId only when explicitly provided"
		);
		assert.match(
			backendSource,
			conditionalExpenseVaultPatchPattern,
			"updateTripExpense should patch vaultItemId only when explicitly provided"
		);
		assert.match(
			backendSource,
			conditionalExpenseVaultSyncPattern,
			"updateTripExpense should sync reverse Vault links only when the receipt link changes"
		);
	});

	it("returns recent expenses first in the trip workspace", () => {
		const workspaceSource = readWorkspaceFile(
			"packages/backend/convex/tripWorkspace.ts"
		);

		assert.match(
			workspaceSource,
			budgetWorkspaceSortImportPattern,
			"trip workspace should import the shared expense review sorter"
		);
		assert.match(
			workspaceSource,
			sortedWorkspaceExpensesPattern,
			"trip workspace should sort expenses before using them"
		);
		assert.match(
			workspaceSource,
			budgetSummarySortedExpensesPattern,
			"module summaries should read sorted expenses for consistent budget state"
		);
		assert.match(
			workspaceSource,
			workspaceReturnsSortedExpensesPattern,
			"workspace payload should expose sorted expenses to Budget and linked pickers"
		);
	});
});
