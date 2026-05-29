import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
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
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import {
	formatMoney,
	formatStatus,
} from "@/src/features/trips/trip-dashboard-utils";
import { TripModuleViyaAssistCard } from "@/src/features/trips/trip-module-viya-assist-card";
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

const getBudgetProgress = ({
	budgetAmount,
	totalTrackedSpend,
}: {
	budgetAmount?: number;
	totalTrackedSpend: number;
}) => {
	if (!budgetAmount) {
		return 0;
	}

	return Math.min(100, Math.max(0, (totalTrackedSpend / budgetAmount) * 100));
};

function MetricTile({
	detail,
	icon,
	label,
	value,
}: {
	detail?: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
	value: string;
}) {
	return (
		<View className="min-w-[46%] flex-1 gap-2 rounded-[22px] bg-surface-secondary p-4">
			<View className="flex-row items-center gap-2">
				<Ionicons color="#0A84FF" name={icon} size={16} />
				<Text color="muted" numberOfLines={1} type="body-xs" weight="semibold">
					{label}
				</Text>
			</View>
			<View className="gap-0.5">
				<Text numberOfLines={1} type="body" weight="bold">
					{value}
				</Text>
				{detail ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{detail}
					</Text>
				) : null}
			</View>
		</View>
	);
}

function ProgressBar({ progress }: { progress: number }) {
	return (
		<View className="h-2 overflow-hidden rounded-full bg-primary/10">
			<View
				className="h-full rounded-full bg-primary"
				style={{ width: `${progress}%` }}
			/>
		</View>
	);
}

function SectionTitle({
	icon,
	title,
}: {
	icon: ComponentProps<typeof Ionicons>["name"];
	title: string;
}) {
	return (
		<View className="flex-row items-center gap-2">
			<Ionicons color="#0A84FF" name={icon} size={18} />
			<Text.Heading type="h5" weight="semibold">
				{title}
			</Text.Heading>
		</View>
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
					<Button.Label>{formatStatus(category)}</Button.Label>
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
	const deleteTripExpense = useMutation(api.trips.deleteTripExpense);
	const updateTripExpense = useMutation(api.trips.updateTripExpense);
	const [budgetDraft, setBudgetDraft] = useState("");
	const [expenseForm, setExpenseForm] =
		useState<ExpenseFormState>(initialExpenseForm);
	const [editingExpenseId, setEditingExpenseId] =
		useState<Id<"expenses"> | null>(null);
	const [budgetErrorMessage, setBudgetErrorMessage] = useState<string | null>(
		null
	);
	const [expenseErrorMessage, setExpenseErrorMessage] = useState<string | null>(
		null
	);
	const [isSavingBudget, setIsSavingBudget] = useState(false);
	const [isAddingExpense, setIsAddingExpense] = useState(false);
	const [deletingExpenseId, setDeletingExpenseId] =
		useState<Id<"expenses"> | null>(null);

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
	const budgetProgress = getBudgetProgress({
		budgetAmount,
		totalTrackedSpend: summary.totalTrackedSpend,
	});
	const plannedBudgetLabel = budgetAmount
		? formatMoney(budgetAmount, currency)
		: "Not set";

	const handleSaveBudget = async () => {
		const amount = parseAmount(budgetDraft);
		if (!(Number.isFinite(amount) && amount > 0)) {
			setBudgetErrorMessage("Budget must be a positive number.");
			return;
		}

		setBudgetErrorMessage(null);
		setIsSavingBudget(true);
		try {
			await updateTripBudget({
				budgetAmount: amount,
				budgetCurrency: currency,
				tripId,
			});
			setBudgetDraft("");
		} catch (error) {
			setBudgetErrorMessage(
				error instanceof Error ? error.message : "Could not update budget."
			);
		} finally {
			setIsSavingBudget(false);
		}
	};

	const handleSaveExpense = async () => {
		const amount = parseAmount(expenseForm.amount);
		const title = expenseForm.title.trim();
		if (!title) {
			setExpenseErrorMessage("Add an expense title.");
			return;
		}

		if (!(Number.isFinite(amount) && amount > 0)) {
			setExpenseErrorMessage("Expense amount must be positive.");
			return;
		}

		setExpenseErrorMessage(null);
		setIsAddingExpense(true);
		try {
			if (editingExpenseId) {
				await updateTripExpense({
					amount,
					category: expenseForm.category,
					currency,
					expenseId: editingExpenseId,
					notes: expenseForm.notes.trim() || undefined,
					spentAt: expenseForm.spentAt,
					title,
				});
			} else {
				await addTripExpense({
					amount,
					category: expenseForm.category,
					currency,
					notes: expenseForm.notes.trim() || undefined,
					spentAt: expenseForm.spentAt,
					title,
					tripId,
				});
			}
			setExpenseForm(initialExpenseForm());
			setEditingExpenseId(null);
		} catch (error) {
			setExpenseErrorMessage(
				error instanceof Error ? error.message : "Could not save expense."
			);
		} finally {
			setIsAddingExpense(false);
		}
	};

	const handleDeleteExpense = async (expenseId: Id<"expenses">) => {
		setDeletingExpenseId(expenseId);
		try {
			await deleteTripExpense({ expenseId });
			if (editingExpenseId === expenseId) {
				setEditingExpenseId(null);
				setExpenseForm(initialExpenseForm());
			}
		} finally {
			setDeletingExpenseId(null);
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
					subtitle="Budget, bookings, manual expenses, and safe daily spend from this trip."
					title="Budget Wallet"
				/>
				<TripModuleViyaAssistCard
					agentModule="budget"
					description="Estimate costs, review overspend risk, or ask Viya where the budget is weakest."
					moduleLabel="budget"
					tripId={tripId}
				/>

				<Surface className="gap-5 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>Track</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{budgetStatus}</Chip.Label>
						</Chip>
					</View>

					<View className="gap-3">
						<View className="min-w-0 flex-1 gap-1">
							<Text color="muted" type="body-xs" weight="semibold">
								REMAINING WALLET
							</Text>
							<Text.Heading type="h2" weight="semibold">
								{formatMoney(summary.remainingAmount, currency)}
							</Text.Heading>
							<Text color="muted" type="body-sm">
								{formatMoney(summary.dailySafeSpend, currency)} daily safe spend
							</Text>
						</View>
						<View className="gap-2">
							<ProgressBar progress={budgetProgress} />
							<View className="flex-row justify-between gap-3">
								<Text color="muted" type="body-xs">
									{formatMoney(summary.totalTrackedSpend, currency)} tracked
								</Text>
								<Text color="muted" type="body-xs">
									{plannedBudgetLabel} planned
								</Text>
							</View>
						</View>
					</View>

					<View className="flex-row flex-wrap gap-3">
						<MetricTile
							detail="Trip cap"
							icon="flag-outline"
							label="Planned"
							value={plannedBudgetLabel}
						/>
						<MetricTile
							detail="Confirmed costs"
							icon="briefcase-outline"
							label="Booked"
							value={formatMoney(summary.confirmedBookingCosts, currency)}
						/>
						<MetricTile
							detail="Logged here"
							icon="receipt-outline"
							label="Manual spend"
							value={formatMoney(summary.manualExpenses, currency)}
						/>
						<MetricTile
							detail="Estimated items"
							icon="calendar-outline"
							label="Itinerary plan"
							value={formatMoney(summary.plannedCosts, currency)}
						/>
					</View>
				</Surface>

				<Surface className="gap-4 rounded-[26px] border border-border bg-surface p-5">
					<SectionTitle icon="create-outline" title="Edit budget" />
					<TextField className="gap-2">
						<Label>
							<Label.Text>Total budget</Label.Text>
						</Label>
						<Input
							className="h-12 rounded-[18px] border-0 bg-surface-secondary px-4"
							keyboardType="numeric"
							onChangeText={setBudgetDraft}
							placeholder={budgetAmount?.toString() ?? "25000"}
							value={budgetDraft}
							variant="secondary"
						/>
					</TextField>
					{budgetErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{budgetErrorMessage}
						</Text>
					) : null}
					<Button
						isDisabled={isSavingBudget}
						onPress={() => {
							handleSaveBudget().catch(() => undefined);
						}}
					>
						{isSavingBudget ? <Spinner size="sm" /> : null}
						<Button.Label>Save budget</Button.Label>
					</Button>
				</Surface>

				<Surface className="gap-4 rounded-[26px] border border-border bg-surface p-5">
					<SectionTitle
						icon="receipt-outline"
						title={editingExpenseId ? "Edit expense" : "Add expense"}
					/>
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
					<View className="flex-row flex-wrap gap-3">
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
					{expenseErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{expenseErrorMessage}
						</Text>
					) : null}
					<Button
						isDisabled={isAddingExpense}
						onPress={() => {
							handleSaveExpense().catch(() => undefined);
						}}
					>
						{isAddingExpense ? <Spinner size="sm" /> : null}
						<Button.Label>
							{editingExpenseId ? "Save expense" : "Add expense"}
						</Button.Label>
					</Button>
					{editingExpenseId ? (
						<Button
							isDisabled={isAddingExpense}
							onPress={() => {
								setEditingExpenseId(null);
								setExpenseForm(initialExpenseForm());
							}}
							variant="secondary"
						>
							<Button.Label>Cancel edit</Button.Label>
						</Button>
					) : null}
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
										{formatStatus(item.category)}
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
											{formatStatus(expense.category)} · {expense.spentAt}
										</Text>
									</View>
									<View className="items-end gap-2">
										<Text type="body-sm" weight="semibold">
											{formatMoney(expense.amount, expense.currency)}
										</Text>
										<View className="flex-row gap-2">
											<Button
												onPress={() => {
													setEditingExpenseId(expense._id);
													setExpenseForm({
														amount: expense.amount.toString(),
														category: expense.category as ExpenseCategory,
														notes: expense.notes ?? "",
														spentAt: expense.spentAt,
														title: expense.title,
													});
												}}
												size="sm"
												variant="secondary"
											>
												<Button.Label>Edit</Button.Label>
											</Button>
											<Button
												isDisabled={deletingExpenseId === expense._id}
												onPress={() => {
													handleDeleteExpense(expense._id).catch(
														() => undefined
													);
												}}
												size="sm"
												variant="tertiary"
											>
												<Button.Label>Delete</Button.Label>
											</Button>
										</View>
									</View>
								</View>
							))
						)}
					</Surface>
				</View>
			</View>
		</Container>
	);
}
