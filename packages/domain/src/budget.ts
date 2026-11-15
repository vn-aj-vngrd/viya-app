import { isBookingSecured } from "./trip-metrics";

interface BudgetBookingLike {
	cost?: number;
	currency?: string;
	status: string;
	type: string;
}

interface BudgetExpenseLike {
	amount: number;
	category: string;
	currency?: string;
}

interface TripExpenseReviewSortInput {
	createdAt?: number;
	spentAt: string;
	title: string;
	updatedAt?: number;
}

interface BudgetItineraryItemLike {
	category: string;
	estimatedCost?: number;
}

interface BudgetWalletInput {
	bookings: readonly BudgetBookingLike[];
	budgetAmount?: number;
	budgetCurrency?: string;
	expenses: readonly BudgetExpenseLike[];
	itineraryItems: readonly BudgetItineraryItemLike[];
	remainingTripDays: number;
}

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

export const getBudgetWalletSummary = ({
	bookings,
	budgetAmount,
	budgetCurrency,
	expenses,
	itineraryItems,
	remainingTripDays,
}: BudgetWalletInput) => {
	const categoryTotals = new Map<string, number>();
	const foreignCurrencyTotals = new Map<string, number>();
	let confirmedBookingCosts = 0;
	let manualExpenses = 0;
	let plannedCosts = 0;

	for (const booking of bookings) {
		if (!isBookingSecured(booking.status)) {
			continue;
		}

		const amount = getPositiveAmount(booking.cost);
		if (!isBudgetCurrency(booking.currency, budgetCurrency)) {
			addCurrencyAmount(foreignCurrencyTotals, booking.currency, amount);
			continue;
		}

		confirmedBookingCosts += amount;
		addCategoryAmount(categoryTotals, booking.type, amount);
	}

	for (const expense of expenses) {
		const amount = getPositiveAmount(expense.amount);
		if (!isBudgetCurrency(expense.currency, budgetCurrency)) {
			addCurrencyAmount(foreignCurrencyTotals, expense.currency, amount);
			continue;
		}

		manualExpenses += amount;
		addCategoryAmount(categoryTotals, expense.category, amount);
	}

	for (const item of itineraryItems) {
		plannedCosts += getPositiveAmount(item.estimatedCost);
	}

	const totalTrackedSpend = confirmedBookingCosts + manualExpenses;
	const budgetTotal = getPositiveAmount(budgetAmount);
	const leftAmount = Math.max(0, budgetTotal - totalTrackedSpend);
	const overAmount = Math.max(0, totalTrackedSpend - budgetTotal);
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

	return {
		categoryBreakdown,
		confirmedBookingCosts,
		dailySafeSpend,
		foreignCurrencyTotals: foreignCurrencyBreakdown,
		leftAmount,
		manualExpenses,
		overAmount,
		plannedCosts,
		remainingAmount: leftAmount,
		totalTrackedSpend,
	};
};
