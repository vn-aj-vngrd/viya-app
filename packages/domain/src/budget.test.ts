import { describe, expect, it } from "vitest";

import {
	getBudgetAlert,
	getBudgetWalletSummary,
	sortTripExpensesForReview,
} from "./budget";

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
			dailySafeSpend: 1600,
			leftBeforePlanned: 10_500,
			manualExpenses: 1500,
			plannedCosts: 2500,
			remainingAmount: 8000,
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

describe("budget math guards", () => {
	const base = {
		budgetAmount: 10_000,
		budgetCurrency: "PHP",
		remainingTripDays: 2,
	};

	it("does not double count an expense linked to a booking", () => {
		const summary = getBudgetWalletSummary({
			...base,
			bookings: [
				{
					_id: "b1",
					cost: 5000,
					currency: "PHP",
					status: "confirmed",
					type: "hotel",
				},
			],
			expenses: [
				{ amount: 4800, bookingId: "b1", category: "hotel", currency: "PHP" },
			],
			itineraryItems: [],
		});

		expect(summary.totalTrackedSpend).toBe(4800);
		expect(summary.linkedBookingCount).toBe(1);
		expect(summary.categoryBreakdown).toEqual([
			{ amount: 4800, category: "hotel" },
		]);
	});

	it("skips planned items that are skipped or backed by a secured booking", () => {
		const summary = getBudgetWalletSummary({
			...base,
			bookings: [{ _id: "b1", cost: 3000, status: "confirmed", type: "hotel" }],
			expenses: [],
			itineraryItems: [
				{ bookingId: "b1", category: "hotel", estimatedCost: 3000 },
				{ category: "food", estimatedCost: 500, status: "skipped" },
				{ category: "food", estimatedCost: 700 },
			],
		});

		expect(summary.plannedCosts).toBe(700);
		expect(summary.leftAmount).toBe(6300);
	});

	it("flags foreign currency instead of dropping it silently", () => {
		const summary = getBudgetWalletSummary({
			...base,
			bookings: [],
			expenses: [{ amount: 20, category: "food", currency: "usd" }],
			itineraryItems: [],
		});

		expect(summary.hasForeignCurrency).toBe(true);
		expect(summary.foreignCurrencyTotals).toEqual([
			{ amount: 20, currency: "USD" },
		]);
	});

	it("summarises per category and per day", () => {
		const summary = getBudgetWalletSummary({
			...base,
			bookings: [],
			expenses: [
				{
					amount: 400,
					category: "food",
					currency: "PHP",
					spentAt: "2026-11-02",
				},
			],
			itineraryDays: [
				{ date: "2026-11-02", id: "d1" },
				{ date: "2026-11-03", id: "d2" },
			],
			itineraryItems: [
				{ category: "food", dayId: "d1", estimatedCost: 100 },
				{ category: "activity", dayId: "d2", estimatedCost: 900 },
			],
		});

		expect(summary.categorySummaries).toEqual([
			{ category: "activity", planned: 900, spent: 0, total: 900 },
			{ category: "food", planned: 100, spent: 400, total: 500 },
		]);
		expect(summary.daySummaries).toEqual([
			{ date: "2026-11-02", planned: 100, spent: 400, total: 500 },
			{ date: "2026-11-03", planned: 900, spent: 0, total: 900 },
		]);
	});

	it("raises near and over alerts from committed spend", () => {
		expect(getBudgetAlert(0, 500).level).toBe("none");
		expect(getBudgetAlert(1000, 500).level).toBe("ok");
		expect(getBudgetAlert(1000, 900).level).toBe("near");
		expect(getBudgetAlert(1000, 1001).level).toBe("over");
		expect(
			getBudgetWalletSummary({
				...base,
				bookings: [],
				expenses: [{ amount: 9500, category: "food" }],
				itineraryItems: [],
			}).alert.level
		).toBe("near");
	});
});
