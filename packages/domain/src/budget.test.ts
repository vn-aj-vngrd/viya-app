import { describe, expect, it } from "vitest";

import { getBudgetWalletSummary, sortTripExpensesForReview } from "./budget";

describe("budget wallet selectors", () => {
	it("combines confirmed bookings and manual expenses", () => {
		const summary = getBudgetWalletSummary({
			bookings: [
				{ cost: 8000, currency: "PHP", status: "confirmed", type: "flight" },
				{ cost: 4500, currency: "PHP", status: "target", type: "hotel" },
			],
			budgetAmount: 20_000,
			budgetCurrency: "PHP",
			expenses: [
				{ amount: 1200, category: "food", currency: "PHP" },
				{ amount: 300, category: "transport", currency: "PHP" },
			],
			itineraryItems: [{ category: "activity", estimatedCost: 2500 }],
			remainingTripDays: 5,
		});

		expect(summary).toMatchObject({
			confirmedBookingCosts: 8000,
			dailySafeSpend: 2100,
			manualExpenses: 1500,
			plannedCosts: 2500,
			remainingAmount: 10_500,
			totalTrackedSpend: 9500,
		});
	});

	it("keeps foreign-currency expenses out of the base budget totals", () => {
		const summary = getBudgetWalletSummary({
			bookings: [
				{
					cost: 21_800,
					currency: "PHP",
					status: "confirmed",
					type: "flight",
				},
				{
					cost: 32_400,
					currency: "PHP",
					status: "confirmed",
					type: "hotel",
				},
			],
			budgetAmount: 90_000,
			budgetCurrency: "PHP",
			expenses: [{ amount: 82, category: "transport", currency: "SGD" }],
			itineraryItems: [],
			remainingTripDays: 4,
		});

		expect(summary).toMatchObject({
			confirmedBookingCosts: 54_200,
			dailySafeSpend: 8950,
			manualExpenses: 0,
			remainingAmount: 35_800,
			totalTrackedSpend: 54_200,
		});
		expect(summary.foreignCurrencyTotals).toEqual([
			{ amount: 82, currency: "SGD" },
		]);
		expect(summary.categoryBreakdown).toEqual([
			{ amount: 32_400, category: "hotel" },
			{ amount: 21_800, category: "flight" },
		]);
	});

	it("groups spending by category across bookings and expenses", () => {
		const summary = getBudgetWalletSummary({
			bookings: [
				{ cost: 5000, currency: "PHP", status: "confirmed", type: "hotel" },
			],
			budgetAmount: 10_000,
			budgetCurrency: "PHP",
			expenses: [{ amount: 750, category: "food", currency: "PHP" }],
			itineraryItems: [],
			remainingTripDays: 0,
		});

		expect(summary.categoryBreakdown).toEqual([
			{ amount: 5000, category: "hotel" },
			{ amount: 750, category: "food" },
		]);
		expect(summary.dailySafeSpend).toBe(4250);
	});

	it("orders category spend by highest amount first", () => {
		const summary = getBudgetWalletSummary({
			bookings: [
				{ cost: 900, currency: "PHP", status: "confirmed", type: "food" },
				{ cost: 4500, currency: "PHP", status: "confirmed", type: "hotel" },
			],
			budgetAmount: 10_000,
			budgetCurrency: "PHP",
			expenses: [
				{ amount: 600, category: "food", currency: "PHP" },
				{ amount: 1500, category: "transport", currency: "PHP" },
			],
			itineraryItems: [],
			remainingTripDays: 2,
		});

		expect(summary.categoryBreakdown).toEqual([
			{ amount: 4500, category: "hotel" },
			{ amount: 1500, category: "food" },
			{ amount: 1500, category: "transport" },
		]);
	});

	it("orders expenses by newest spend date and latest update first", () => {
		const expenses = [
			{
				_id: "older",
				createdAt: 10,
				spentAt: "2026-04-02",
				title: "Older ferry",
				updatedAt: 20,
			},
			{
				_id: "newer-edit",
				createdAt: 11,
				spentAt: "2026-04-03",
				title: "Dinner",
				updatedAt: 80,
			},
			{
				_id: "newer-date",
				createdAt: 12,
				spentAt: "2026-04-04",
				title: "Museum",
				updatedAt: 30,
			},
			{
				_id: "same-date-older-edit",
				createdAt: 13,
				spentAt: "2026-04-03",
				title: "Train",
				updatedAt: 40,
			},
		] as const;

		expect(
			sortTripExpensesForReview(expenses).map((expense) => expense._id)
		).toEqual(["newer-date", "newer-edit", "same-date-older-edit", "older"]);
		expect(expenses.map((expense) => expense._id)).toEqual([
			"older",
			"newer-edit",
			"newer-date",
			"same-date-older-edit",
		]);
	});
});
