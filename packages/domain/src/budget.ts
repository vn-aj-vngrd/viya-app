import { isBookingSecured } from "./trip-metrics";

interface BudgetBookingLike {
	_id?: string;
	cost?: number;
	currency?: string;
	id?: string;
	startDateTime?: string;
	status: string;
	type: string;
}

interface BudgetExpenseLike {
	amount: number;
	bookingId?: string;
	category: string;
	currency?: string;
	spentAt?: string;
}

interface TripExpenseReviewSortInput {
	createdAt?: number;
	spentAt: string;
	title: string;
	updatedAt?: number;
}

interface BudgetItineraryItemLike {
	bookingId?: string;
	category: string;
	dayId?: string;
	estimatedCost?: number;
	status?: string;
}

interface BudgetItineraryDayLike {
	_id?: string;
	date: string;
	id?: string;
}

interface BudgetWalletInput {
	bookings: readonly BudgetBookingLike[];
	budgetAmount?: number;
	budgetCurrency?: string;
	expenses: readonly BudgetExpenseLike[];
	itineraryDays?: readonly BudgetItineraryDayLike[];
	itineraryItems: readonly BudgetItineraryItemLike[];
	remainingTripDays: number;
}

export type BudgetAlertLevel = "none" | "ok" | "near" | "over";

export interface BudgetAlert {
	level: BudgetAlertLevel;
	/** Committed (spent + planned) share of the budget, 0 when no budget. */
	ratio: number;
}

export interface BudgetCategorySummary {
	category: string;
	planned: number;
	spent: number;
	total: number;
}

export interface BudgetDaySummary {
	date: string;
	planned: number;
	spent: number;
	total: number;
}

/** Committed spend at or above this share of the budget raises a "near" alert. */
export const BUDGET_NEAR_LIMIT_RATIO = 0.85;

interface BudgetCategoryTotal {
	amount: number;
	category: string;
}

interface BudgetCurrencyTotal {
	amount: number;
	currency: string;
}

const addCategoryAmount = (
	totals: Map<string, number>,
	category: string,
	amount: number
) => {
	if (!(Number.isFinite(amount) && amount > 0)) {
		return;
	}

	totals.set(category, (totals.get(category) ?? 0) + amount);
};

const getPositiveAmount = (amount?: number) =>
	Number.isFinite(amount) && amount ? Math.max(0, amount) : 0;

const normalizeCurrency = (currency?: string) =>
	(currency ?? "PHP").trim().toUpperCase();

const isBudgetCurrency = (
	currency: string | undefined,
	budgetCurrency?: string
) => normalizeCurrency(currency) === normalizeCurrency(budgetCurrency);

const addCurrencyAmount = (
	totals: Map<string, number>,
	currency: string | undefined,
	amount: number
) => {
	if (!(Number.isFinite(amount) && amount > 0)) {
		return;
	}

	const normalizedCurrency = normalizeCurrency(currency);
	totals.set(
		normalizedCurrency,
		(totals.get(normalizedCurrency) ?? 0) + amount
	);
};

const sortCategoryTotals = (
	firstCategory: BudgetCategoryTotal,
	secondCategory: BudgetCategoryTotal
) =>
	secondCategory.amount - firstCategory.amount ||
	firstCategory.category.localeCompare(secondCategory.category);

const sortCurrencyTotals = (
	firstCurrency: BudgetCurrencyTotal,
	secondCurrency: BudgetCurrencyTotal
) =>
	secondCurrency.amount - firstCurrency.amount ||
	firstCurrency.currency.localeCompare(secondCurrency.currency);

const compareTripExpensesForReview = (
	firstExpense: TripExpenseReviewSortInput,
	secondExpense: TripExpenseReviewSortInput
) =>
	secondExpense.spentAt.localeCompare(firstExpense.spentAt) ||
	(secondExpense.updatedAt ?? 0) - (firstExpense.updatedAt ?? 0) ||
	(secondExpense.createdAt ?? 0) - (firstExpense.createdAt ?? 0) ||
	firstExpense.title.localeCompare(secondExpense.title);

export const sortTripExpensesForReview = <
	Expense extends TripExpenseReviewSortInput,
>(
	expenses: readonly Expense[]
) => [...expenses].sort(compareTripExpensesForReview);

const SKIPPED_ITEM_STATUSES = new Set(["skipped"]);

const getDateKey = (value?: string) => value?.slice(0, 10) ?? "";

const addDayAmount = (
	totals: Map<string, number>,
	date: string,
	amount: number
) => {
	if (date && amount > 0) {
		totals.set(date, (totals.get(date) ?? 0) + amount);
	}
};

const getDateByDayId = (days: readonly BudgetItineraryDayLike[]) => {
	const dateByDayId = new Map<string, string>();

	for (const day of days) {
		const dayId = day.id ?? day._id;

		if (dayId) {
			dateByDayId.set(dayId, day.date);
		}
	}

	return dateByDayId;
};

/**
 * Planned itinerary costs are money not yet spent. Skipped stops and stops
 * backed by a secured booking (already counted as spend) are left out.
 */
const collectPlannedCosts = ({
	dateByDayId,
	dayPlanned,
	items,
	plannedCategoryTotals,
	securedBookingIds,
}: {
	dateByDayId: ReadonlyMap<string, string>;
	dayPlanned: Map<string, number>;
	items: readonly BudgetItineraryItemLike[];
	plannedCategoryTotals: Map<string, number>;
	securedBookingIds: ReadonlySet<string>;
}) => {
	let total = 0;

	for (const item of items) {
		const isSkipped = Boolean(
			item.status && SKIPPED_ITEM_STATUSES.has(item.status)
		);
		const isCoveredByBooking = Boolean(
			item.bookingId && securedBookingIds.has(item.bookingId)
		);

		if (isSkipped || isCoveredByBooking) {
			continue;
		}

		const amount = getPositiveAmount(item.estimatedCost);
		total += amount;
		addCategoryAmount(plannedCategoryTotals, item.category, amount);
		addDayAmount(
			dayPlanned,
			item.dayId ? (dateByDayId.get(item.dayId) ?? "") : "",
			amount
		);
	}

	return total;
};

export const getBudgetAlert = (
	budgetTotal: number,
	committed: number
): BudgetAlert => {
	if (!(budgetTotal > 0)) {
		return { level: "none", ratio: 0 };
	}

	const ratio = committed / budgetTotal;

	if (ratio > 1) {
		return { level: "over", ratio };
	}

	return { level: ratio >= BUDGET_NEAR_LIMIT_RATIO ? "near" : "ok", ratio };
};

export const getBudgetWalletSummary = ({
	bookings,
	budgetAmount,
	budgetCurrency,
	expenses,
	itineraryDays = [],
	itineraryItems,
	remainingTripDays,
}: BudgetWalletInput) => {
	const categoryTotals = new Map<string, number>();
	const plannedCategoryTotals = new Map<string, number>();
	const foreignCurrencyTotals = new Map<string, number>();
	const daySpent = new Map<string, number>();
	const dayPlanned = new Map<string, number>();
	const dateByDayId = getDateByDayId(itineraryDays);
	let confirmedBookingCosts = 0;
	let manualExpenses = 0;
	let linkedBookingCount = 0;

	// An expense linked to a booking is the actual payment: it replaces the
	// booking's quoted cost so the same money is never counted twice.
	const expenseBookingIds = new Set(
		expenses
			.map((expense) => expense.bookingId)
			.filter((id): id is string => Boolean(id))
	);
	const securedBookingIds = new Set<string>();

	for (const booking of bookings) {
		if (!isBookingSecured(booking.status)) {
			continue;
		}

		const bookingId = booking.id ?? booking._id;

		if (bookingId) {
			securedBookingIds.add(bookingId);
		}

		if (bookingId && expenseBookingIds.has(bookingId)) {
			linkedBookingCount += 1;
			continue;
		}

		const amount = getPositiveAmount(booking.cost);
		if (!isBudgetCurrency(booking.currency, budgetCurrency)) {
			addCurrencyAmount(foreignCurrencyTotals, booking.currency, amount);
			continue;
		}

		confirmedBookingCosts += amount;
		addCategoryAmount(categoryTotals, booking.type, amount);
		addDayAmount(daySpent, getDateKey(booking.startDateTime), amount);
	}

	for (const expense of expenses) {
		const amount = getPositiveAmount(expense.amount);
		if (!isBudgetCurrency(expense.currency, budgetCurrency)) {
			addCurrencyAmount(foreignCurrencyTotals, expense.currency, amount);
			continue;
		}

		manualExpenses += amount;
		addCategoryAmount(categoryTotals, expense.category, amount);
		addDayAmount(daySpent, getDateKey(expense.spentAt), amount);
	}

	const plannedCosts = collectPlannedCosts({
		dateByDayId,
		dayPlanned,
		items: itineraryItems,
		plannedCategoryTotals,
		securedBookingIds,
	});

	const totalTrackedSpend = confirmedBookingCosts + manualExpenses;
	const committedSpend = totalTrackedSpend + plannedCosts;
	const budgetTotal = getPositiveAmount(budgetAmount);
	const leftBeforePlanned = Math.max(0, budgetTotal - totalTrackedSpend);
	const leftAmount = Math.max(0, budgetTotal - committedSpend);
	const overAmount = Math.max(0, committedSpend - budgetTotal);
	const safeSpendDays = Math.max(1, remainingTripDays);
	const dailySafeSpend = Math.floor(leftAmount / safeSpendDays);
	const categoryBreakdown: BudgetCategoryTotal[] = Array.from(
		categoryTotals.entries()
	)
		.map(([category, amount]) => ({ amount, category }))
		.sort(sortCategoryTotals);
	const foreignCurrencyBreakdown: BudgetCurrencyTotal[] = Array.from(
		foreignCurrencyTotals.entries()
	)
		.map(([currency, amount]) => ({ amount, currency }))
		.sort(sortCurrencyTotals);
	const categorySummaries: BudgetCategorySummary[] = Array.from(
		new Set([...categoryTotals.keys(), ...plannedCategoryTotals.keys()])
	)
		.map((category) => {
			const spent = categoryTotals.get(category) ?? 0;
			const planned = plannedCategoryTotals.get(category) ?? 0;

			return { category, planned, spent, total: spent + planned };
		})
		.sort(
			(first, second) =>
				second.total - first.total ||
				first.category.localeCompare(second.category)
		);
	const daySummaries: BudgetDaySummary[] = Array.from(
		new Set([...daySpent.keys(), ...dayPlanned.keys()])
	)
		.sort()
		.map((date) => {
			const spent = daySpent.get(date) ?? 0;
			const planned = dayPlanned.get(date) ?? 0;

			return { date, planned, spent, total: spent + planned };
		});

	return {
		alert: getBudgetAlert(budgetTotal, committedSpend),
		categoryBreakdown,
		categorySummaries,
		committedSpend,
		confirmedBookingCosts,
		dailySafeSpend,
		daySummaries,
		/** True when amounts in another currency are excluded from the totals. */
		hasForeignCurrency: foreignCurrencyBreakdown.length > 0,
		foreignCurrencyTotals: foreignCurrencyBreakdown,
		leftAmount,
		leftBeforePlanned,
		linkedBookingCount,
		manualExpenses,
		overAmount,
		plannedCosts,
		remainingAmount: leftAmount,
		totalTrackedSpend,
	};
};
