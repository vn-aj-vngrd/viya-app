import { describe, expect, it } from "vitest";

import { getBudgetWalletSummary } from "./budget";

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
});
