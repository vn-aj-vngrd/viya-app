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

const sortCategoryTotals = (
	firstCategory: BudgetCategoryTotal,
	secondCategory: BudgetCategoryTotal
) =>
	secondCategory.amount - firstCategory.amount ||
	firstCategory.category.localeCompare(secondCategory.category);

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
	expenses,
	itineraryItems,
	remainingTripDays,
}: BudgetWalletInput) => {
	const categoryTotals = new Map<string, number>();
	let confirmedBookingCosts = 0;
	let manualExpenses = 0;
	let plannedCosts = 0;

	for (const booking of bookings) {
		if (booking.status !== "confirmed") {
			continue;
		}

		const amount = getPositiveAmount(booking.cost);
		confirmedBookingCosts += amount;
		addCategoryAmount(categoryTotals, booking.type, amount);
	}

	for (const expense of expenses) {
		const amount = getPositiveAmount(expense.amount);
		manualExpenses += amount;
		addCategoryAmount(categoryTotals, expense.category, amount);
	}

	for (const item of itineraryItems) {
		plannedCosts += getPositiveAmount(item.estimatedCost);
	}

	const totalTrackedSpend = confirmedBookingCosts + manualExpenses;
	const budgetTotal = getPositiveAmount(budgetAmount);
	const remainingAmount = Math.max(0, budgetTotal - totalTrackedSpend);
	const safeSpendDays = Math.max(1, remainingTripDays);
	const dailySafeSpend = Math.floor(remainingAmount / safeSpendDays);
	const categoryBreakdown: BudgetCategoryTotal[] = Array.from(
		categoryTotals.entries()
	)
		.map(([category, amount]) => ({ amount, category }))
		.sort(sortCategoryTotals);

	return {
		categoryBreakdown,
		confirmedBookingCosts,
		dailySafeSpend,
		manualExpenses,
		plannedCosts,
		remainingAmount,
		totalTrackedSpend,
	};
};
