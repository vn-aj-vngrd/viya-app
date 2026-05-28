import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import {
	Button,
	Chip,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextField,
} from "heroui-native";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

const dateMs = 86_400_000;
const expenseCategories = [
	"food",
	"transport",
	"activity",
	"hotel",
	"shopping",
	"documents",
	"other",
] as const;

type ExpenseCategory = (typeof expenseCategories)[number];

interface ExpenseFormState {
	amount: string;
	category: ExpenseCategory;
	notes: string;
	spentAt: string;
	title: string;
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const initialExpenseForm = (): ExpenseFormState => ({
	amount: "",
	category: "food",
	notes: "",
	spentAt: todayIsoDate(),
	title: "",
});

const formatMoney = (amount: number, currency = "PHP") =>
	`${currency} ${Math.round(amount).toLocaleString()}`;

const parseAmount = (value: string) => Number(value.replaceAll(",", "").trim());

const getRemainingTripDays = (endDate: string) => {
	const end = new Date(`${endDate}T00:00:00.000Z`);
	const today = new Date(`${todayIsoDate()}T00:00:00.000Z`);

	if (Number.isNaN(end.getTime())) {
		return 1;
	}

	return Math.max(1, Math.ceil((end.getTime() - today.getTime()) / dateMs) + 1);
};

const getBudgetStatusLabel = ({
	budgetAmount,
	remainingAmount,
	totalTrackedSpend,
}: {
	budgetAmount?: number;
	remainingAmount: number;
	totalTrackedSpend: number;
}) => {
	if (!budgetAmount) {
		return "Set budget";
	}

	if (remainingAmount <= 0) {
		return "Over budget";
	}

	if (totalTrackedSpend / budgetAmount >= 0.8) {
		return "Watch spend";
	}

	return "On track";
};

function MetricTile({ label, value }: { label: string; value: string }) {
	return (
		<Surface className="min-w-[46%] flex-1 gap-1 rounded-[22px] border border-border bg-surface-secondary p-4">
			<Text color="muted" type="body-xs" weight="semibold">
				{label}
			</Text>
			<Text type="body" weight="bold">
				{value}
			</Text>
		</Surface>
	);
}

function CategoryPicker({
	onChange,
	value,
}: {
	onChange: (value: ExpenseCategory) => void;
	value: ExpenseCategory;
}) {
	return (
		<View className="flex-row flex-wrap gap-2">
			{expenseCategories.map((category) => (
				<Button
					key={category}
					onPress={() => onChange(category)}
					size="sm"
					variant={category === value ? "primary" : "secondary"}
				>
					<Button.Label>{category}</Button.Label>
				</Button>
			))}
		</View>
	);
}

export function TripBudgetScreen() {
	const tripId = useTripIdParam();
	const budget = useQuery(
		api.trips.getTripBudget,
		tripId ? { tripId } : "skip"
	);
	const updateTripBudget = useMutation(api.trips.updateTripBudget);
	const addTripExpense = useMutation(api.trips.addTripExpense);
	const [budgetDraft, setBudgetDraft] = useState("");
	const [expenseForm, setExpenseForm] =
		useState<ExpenseFormState>(initialExpenseForm);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSavingBudget, setIsSavingBudget] = useState(false);
	const [isAddingExpense, setIsAddingExpense] = useState(false);

	const summary = useMemo(() => {
		if (!budget) {
			return null;
		}

		return getBudgetWalletSummary({
			bookings: budget.bookings,
			budgetAmount: budget.trip.budgetAmount,
			budgetCurrency: budget.trip.budgetCurrency,
			expenses: budget.expenses,
			itineraryItems: budget.itineraryItems,
			remainingTripDays: getRemainingTripDays(budget.trip.endDate),
		});
	}, [budget]);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before reviewing budget."
					icon="wallet-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (budget === undefined || !summary) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const currency = budget.trip.budgetCurrency ?? "PHP";
	const budgetAmount = budget.trip.budgetAmount;
	const budgetStatus = getBudgetStatusLabel({
		budgetAmount,
		remainingAmount: summary.remainingAmount,
		totalTrackedSpend: summary.totalTrackedSpend,
	});

	const handleSaveBudget = async () => {
		const amount = parseAmount(budgetDraft);
		if (!(Number.isFinite(amount) && amount > 0)) {
			setErrorMessage("Budget must be a positive number.");
			return;
		}

		setErrorMessage(null);
		setIsSavingBudget(true);
		try {
			await updateTripBudget({
				budgetAmount: amount,
				budgetCurrency: currency,
				tripId,
			});
			setBudgetDraft("");
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not update budget."
			);
		} finally {
			setIsSavingBudget(false);
		}
	};

	const handleAddExpense = async () => {
		const amount = parseAmount(expenseForm.amount);
		const title = expenseForm.title.trim();
		if (!title) {
			setErrorMessage("Add an expense title.");
			return;
		}

		if (!(Number.isFinite(amount) && amount > 0)) {
			setErrorMessage("Expense amount must be positive.");
			return;
		}

		setErrorMessage(null);
		setIsAddingExpense(true);
		try {
			await addTripExpense({
				amount,
				category: expenseForm.category,
				currency,
				notes: expenseForm.notes.trim() || undefined,
				spentAt: expenseForm.spentAt,
				title,
				tripId,
			});
			setExpenseForm(initialExpenseForm());
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Could not add expense."
			);
		} finally {
			setIsAddingExpense(false);
		}
	};

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Track"
					icon="wallet-outline"
					subtitle="Planned budget, booked costs, manual expenses, and safe daily spend."
					title="Budget Wallet"
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row items-start justify-between gap-3">
						<View className="min-w-0 flex-1 gap-1">
							<Text color="muted" type="body-xs" weight="semibold">
								REMAINING
							</Text>
							<Text.Heading type="h2" weight="semibold">
								{formatMoney(summary.remainingAmount, currency)}
							</Text.Heading>
							<Text color="muted" type="body-sm">
								{formatMoney(summary.dailySafeSpend, currency)} daily safe spend
							</Text>
						</View>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{budgetStatus}</Chip.Label>
						</Chip>
					</View>

					<View className="flex-row flex-wrap gap-3">
						<MetricTile
							label="Planned"
							value={
								budgetAmount ? formatMoney(budgetAmount, currency) : "Not set"
							}
						/>
						<MetricTile
							label="Booked"
							value={formatMoney(summary.confirmedBookingCosts, currency)}
						/>
						<MetricTile
							label="Manual spend"
							value={formatMoney(summary.manualExpenses, currency)}
						/>
						<MetricTile
							label="Itinerary plan"
							value={formatMoney(summary.plannedCosts, currency)}
						/>
					</View>
				</Surface>

				<Surface className="gap-3 rounded-[26px] border border-border bg-surface p-5">
					<Text.Heading type="h5" weight="semibold">
						Edit budget
					</Text.Heading>
					<View className="flex-row gap-2">
						<TextField className="min-w-0 flex-1">
							<Label>
								<Label.Text>Total budget</Label.Text>
							</Label>
							<Input
								className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
								keyboardType="numeric"
								onChangeText={setBudgetDraft}
								placeholder={budgetAmount?.toString() ?? "25000"}
								value={budgetDraft}
								variant="secondary"
							/>
						</TextField>
						<Button
							className="self-end"
							isDisabled={isSavingBudget}
							onPress={() => {
								handleSaveBudget().catch(() => undefined);
							}}
						>
							{isSavingBudget ? <Spinner size="sm" /> : null}
							<Button.Label>Save</Button.Label>
						</Button>
					</View>
				</Surface>

				<Surface className="gap-4 rounded-[26px] border border-border bg-surface p-5">
					<Text.Heading type="h5" weight="semibold">
						Add expense
					</Text.Heading>
					<TextField className="gap-2">
						<Label>
							<Label.Text>Title</Label.Text>
						</Label>
						<Input
							className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
							onChangeText={(title) =>
								setExpenseForm((current) => ({ ...current, title }))
							}
							placeholder="Lunch, taxi, museum ticket"
							value={expenseForm.title}
							variant="secondary"
						/>
					</TextField>
					<View className="flex-row gap-3">
						<TextField className="min-w-0 flex-1 gap-2">
							<Label>
								<Label.Text>Amount</Label.Text>
							</Label>
							<Input
								className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
								keyboardType="numeric"
								onChangeText={(amount) =>
									setExpenseForm((current) => ({ ...current, amount }))
								}
								placeholder="1200"
								value={expenseForm.amount}
								variant="secondary"
							/>
						</TextField>
						<TextField className="min-w-0 flex-1 gap-2">
							<Label>
								<Label.Text>Date</Label.Text>
							</Label>
							<Input
								className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
								onChangeText={(spentAt) =>
									setExpenseForm((current) => ({ ...current, spentAt }))
								}
								placeholder="2026-07-10"
								value={expenseForm.spentAt}
								variant="secondary"
							/>
						</TextField>
					</View>
					<View className="gap-2">
						<Text color="muted" type="body-xs" weight="semibold">
							CATEGORY
						</Text>
						<CategoryPicker
							onChange={(category) =>
								setExpenseForm((current) => ({ ...current, category }))
							}
							value={expenseForm.category}
						/>
					</View>
					<TextField className="gap-2">
						<Label>
							<Label.Text>Notes</Label.Text>
						</Label>
						<Input
							className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
							onChangeText={(notes) =>
								setExpenseForm((current) => ({ ...current, notes }))
							}
							placeholder="Optional"
							value={expenseForm.notes}
							variant="secondary"
						/>
					</TextField>
					{errorMessage ? (
						<Text className="text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}
					<Button
						isDisabled={isAddingExpense}
						onPress={() => {
							handleAddExpense().catch(() => undefined);
						}}
					>
						{isAddingExpense ? <Spinner size="sm" /> : null}
						<Button.Label>Add expense</Button.Label>
					</Button>
				</Surface>

				<View className="gap-3">
					<Text className="px-1" color="muted" type="body-xs" weight="semibold">
						SPEND BREAKDOWN
					</Text>
					<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
						{summary.categoryBreakdown.length === 0 ? (
							<View className="items-center gap-2 p-6">
								<Ionicons color="#8E8E93" name="receipt-outline" size={24} />
								<Text color="muted" type="body-sm">
									No booked costs or manual expenses yet.
								</Text>
							</View>
						) : (
							summary.categoryBreakdown.map((item) => (
								<View
									className="flex-row items-center justify-between gap-3 border-border border-b px-4 py-3"
									key={item.category}
								>
									<Text type="body-sm" weight="semibold">
										{item.category}
									</Text>
									<Text color="muted" type="body-sm">
										{formatMoney(item.amount, currency)}
									</Text>
								</View>
							))
						)}
					</Surface>
				</View>

				<View className="gap-3">
					<Text className="px-1" color="muted" type="body-xs" weight="semibold">
						RECENT EXPENSES
					</Text>
					<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
						{budget.expenses.length === 0 ? (
							<View className="p-5">
								<Text color="muted" type="body-sm">
									Manual expenses will appear here.
								</Text>
							</View>
						) : (
							budget.expenses.map((expense) => (
								<View
									className="flex-row items-center justify-between gap-3 border-border border-b px-4 py-3"
									key={expense._id}
								>
									<View className="min-w-0 flex-1">
										<Text numberOfLines={1} type="body-sm" weight="semibold">
											{expense.title}
										</Text>
										<Text color="muted" numberOfLines={1} type="body-xs">
											{expense.category} · {expense.spentAt}
										</Text>
									</View>
									<Text type="body-sm" weight="semibold">
										{formatMoney(expense.amount, expense.currency)}
									</Text>
								</View>
							))
						)}
					</Surface>
				</View>
			</View>
		</Container>
	);
}
