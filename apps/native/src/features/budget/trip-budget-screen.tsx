import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link } from "expo-router";
import {
	Button,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextField,
} from "heroui-native";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Linking, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	formatMoney,
	formatStatus,
} from "@/src/features/trips/trip-dashboard-utils";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

const dateMs = 86_400_000;
const budgetAccentColor = "#0AA5B5";
const budgetAccentBackground = "rgba(10, 165, 181, 0.12)";
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

const expenseCategorySet = new Set<string>(expenseCategories);

const getExpenseCategory = (value: string): ExpenseCategory =>
	expenseCategorySet.has(value) ? (value as ExpenseCategory) : "other";

interface ExpenseFormState {
	amount: string;
	bookingId: Id<"bookings"> | "";
	category: ExpenseCategory;
	notes: string;
	spentAt: string;
	title: string;
	vaultItemId: Id<"vaultItems"> | "";
}

interface ExpenseLinkPatch {
	bookingId?: Id<"bookings">;
	vaultItemId?: Id<"vaultItems">;
}

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const initialExpenseForm = (): ExpenseFormState => ({
	amount: "",
	bookingId: "",
	category: "food",
	notes: "",
	spentAt: todayIsoDate(),
	title: "",
	vaultItemId: "",
});

const parseAmount = (value: string) => Number(value.replaceAll(",", "").trim());

const getExpenseLinkPatch = (form: ExpenseFormState): ExpenseLinkPatch => ({
	bookingId: form.bookingId || undefined,
	vaultItemId: form.vaultItemId || undefined,
});

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

function BudgetSnapshotStat({
	detail,
	label,
	value,
}: {
	detail?: string;
	label: string;
	value: string;
}) {
	return (
		<View className="min-w-[30%] flex-1 gap-1 rounded-[20px] bg-surface px-3 py-3">
			<Text color="muted" numberOfLines={1} type="body-xs" weight="semibold">
				{label}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="bold">
				{value}
			</Text>
			{detail ? (
				<Text color="muted" numberOfLines={1} type="body-xs">
					{detail}
				</Text>
			) : null}
		</View>
	);
}

function ProgressBar({ progress }: { progress: number }) {
	return (
		<View
			className="h-2 overflow-hidden rounded-full"
			style={{ backgroundColor: budgetAccentBackground }}
		>
			<View
				className="h-full rounded-full"
				style={{ backgroundColor: budgetAccentColor, width: `${progress}%` }}
			/>
		</View>
	);
}

function BudgetOverviewCard({
	bookingHref,
	budgetStatus,
	dailySafeSpendLabel,
	onLogExpense,
	onOpenBudgetEditor,
	plannedBudgetLabel,
	progress,
	remainingAmountLabel,
	totalTrackedSpendLabel,
}: {
	bookingHref: Href;
	budgetStatus: string;
	dailySafeSpendLabel: string;
	onLogExpense: () => void;
	onOpenBudgetEditor: () => void;
	plannedBudgetLabel: string;
	progress: number;
	remainingAmountLabel: string;
	totalTrackedSpendLabel: string;
}) {
	return (
		<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
			<View className="flex-row items-start justify-between gap-3">
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						REMAINING
					</Text>
					<Text.Heading numberOfLines={1} type="h2" weight="semibold">
						{remainingAmountLabel}
					</Text.Heading>
					<Text color="muted" numberOfLines={1} type="body-sm">
						{dailySafeSpendLabel} per travel day
					</Text>
				</View>
				<View
					className="rounded-full px-3 py-1"
					style={{ backgroundColor: budgetAccentBackground }}
				>
					<Text
						numberOfLines={1}
						style={{ color: budgetAccentColor }}
						type="body-xs"
						weight="bold"
					>
						{budgetStatus}
					</Text>
				</View>
			</View>

			<View className="gap-2">
				<ProgressBar progress={progress} />
				<View className="flex-row justify-between gap-3">
					<Text color="muted" type="body-xs">
						{totalTrackedSpendLabel} spent
					</Text>
					<Text color="muted" type="body-xs">
						{plannedBudgetLabel} budget
					</Text>
				</View>
			</View>

			<View className="flex-row flex-wrap gap-2">
				<Button className="min-w-[150px] flex-1" onPress={onLogExpense}>
					<Ionicons color="#FFFFFF" name="receipt-outline" size={17} />
					<Button.Label>Log expense</Button.Label>
				</Button>
				<Link asChild href={bookingHref}>
					<Button className="min-w-[150px] flex-1" variant="secondary">
						<Ionicons
							color={budgetAccentColor}
							name="ticket-outline"
							size={17}
						/>
						<Button.Label>Bookings</Button.Label>
					</Button>
				</Link>
			</View>

			<View className="flex-row flex-wrap gap-2">
				<BudgetSnapshotStat
					detail="Logged"
					label="Spent"
					value={totalTrackedSpendLabel}
				/>
				<BudgetSnapshotStat label="Daily" value={dailySafeSpendLabel} />
				<Button
					className="min-w-[30%] flex-1 rounded-[20px]"
					onPress={onOpenBudgetEditor}
					variant="tertiary"
				>
					<Button.Label>{`Budget ${plannedBudgetLabel}`}</Button.Label>
				</Button>
			</View>
		</Surface>
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
			<Ionicons color={budgetAccentColor} name={icon} size={18} />
			<Text.Heading type="h5" weight="semibold">
				{title}
			</Text.Heading>
		</View>
	);
}

function CategoryBreakdownRow({
	currency,
	item,
	onAddCategoryExpense,
}: {
	currency: string;
	item: { amount: number; category: string };
	onAddCategoryExpense: (category: ExpenseCategory) => void;
}) {
	return (
		<View className="gap-3 border-border border-b px-4 py-3">
			<View className="flex-row items-center justify-between gap-3">
				<Text type="body-sm" weight="semibold">
					{formatStatus(item.category)}
				</Text>
				<Text color="muted" type="body-sm">
					{formatMoney(item.amount, currency)}
				</Text>
			</View>
			<Button
				className="self-start"
				onPress={() => onAddCategoryExpense(getExpenseCategory(item.category))}
				size="sm"
				variant="secondary"
			>
				<Ionicons color={budgetAccentColor} name="add-outline" size={15} />
				<Button.Label>Add expense</Button.Label>
			</Button>
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

function LinkPicker<TId extends string>({
	emptyLabel,
	label,
	onChange,
	options,
	value,
}: {
	emptyLabel: string;
	label: string;
	onChange: (value: TId | "") => void;
	options: { detail: string; id: TId; label: string }[];
	value: TId | "";
}) {
	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<View className="flex-row flex-wrap gap-2">
				<Button
					onPress={() => onChange("")}
					size="sm"
					variant={value ? "secondary" : "primary"}
				>
					<Button.Label>{emptyLabel}</Button.Label>
				</Button>
				{options.map((option) => (
					<Button
						key={option.id}
						onPress={() => onChange(option.id)}
						size="sm"
						variant={value === option.id ? "primary" : "secondary"}
					>
						<Button.Label>
							{option.label} · {option.detail}
						</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

function BudgetEditorCard({
	budgetAmount,
	budgetDraft,
	budgetErrorMessage,
	isSavingBudget,
	onCancel,
	onSave,
	onUpdateBudgetDraft,
}: {
	budgetAmount?: number;
	budgetDraft: string;
	budgetErrorMessage: string | null;
	isSavingBudget: boolean;
	onCancel: () => void;
	onSave: () => void;
	onUpdateBudgetDraft: (value: string) => void;
}) {
	return (
		<Surface className="gap-4 rounded-[26px] border border-border bg-surface p-5">
			<SectionTitle icon="create-outline" title="Trip budget" />
			<TextField className="gap-2">
				<Label>
					<Label.Text>Total budget</Label.Text>
				</Label>
				<Input
					className="h-12 rounded-[18px] border-0 bg-surface-secondary px-4"
					keyboardType="numeric"
					onChangeText={onUpdateBudgetDraft}
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
			<View className="flex-row flex-wrap gap-2">
				<Button
					className="min-w-[132px] flex-1"
					isDisabled={isSavingBudget}
					onPress={onSave}
				>
					{isSavingBudget ? <Spinner size="sm" /> : null}
					<Button.Label>Save budget</Button.Label>
				</Button>
				{budgetAmount ? (
					<Button
						className="min-w-[132px] flex-1"
						isDisabled={isSavingBudget}
						onPress={onCancel}
						variant="secondary"
					>
						<Button.Label>Cancel</Button.Label>
					</Button>
				) : null}
			</View>
		</Surface>
	);
}

function ExpenseFormCard({
	bookingOptions,
	editingExpenseId,
	expenseErrorMessage,
	expenseForm,
	isAddingExpense,
	onCancel,
	onSave,
	onUpdateForm,
	receiptOptions,
}: {
	bookingOptions: { detail: string; id: Id<"bookings">; label: string }[];
	editingExpenseId: Id<"expenses"> | null;
	expenseErrorMessage: string | null;
	expenseForm: ExpenseFormState;
	isAddingExpense: boolean;
	onCancel: () => void;
	onSave: () => void;
	onUpdateForm: (patch: Partial<ExpenseFormState>) => void;
	receiptOptions: { detail: string; id: Id<"vaultItems">; label: string }[];
}) {
	return (
		<Surface className="gap-4 rounded-[26px] border border-border bg-surface p-5">
			<SectionTitle
				icon="receipt-outline"
				title={editingExpenseId ? "Edit expense" : "Log expense"}
			/>
			<TextField className="gap-2">
				<Label>
					<Label.Text>Title</Label.Text>
				</Label>
				<Input
					className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
					onChangeText={(title) => onUpdateForm({ title })}
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
						onChangeText={(amount) => onUpdateForm({ amount })}
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
						onChangeText={(spentAt) => onUpdateForm({ spentAt })}
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
					onChange={(category) => onUpdateForm({ category })}
					value={expenseForm.category}
				/>
			</View>
			<LinkPicker
				emptyLabel="No booking"
				label="Booking"
				onChange={(bookingId) => onUpdateForm({ bookingId })}
				options={bookingOptions}
				value={expenseForm.bookingId}
			/>
			<LinkPicker
				emptyLabel="No receipt"
				label="Receipt proof"
				onChange={(vaultItemId) => onUpdateForm({ vaultItemId })}
				options={receiptOptions}
				value={expenseForm.vaultItemId}
			/>
			<TextField className="gap-2">
				<Label>
					<Label.Text>Notes</Label.Text>
				</Label>
				<Input
					className="h-11 rounded-[18px] border-0 bg-surface-secondary px-4"
					onChangeText={(notes) => onUpdateForm({ notes })}
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
			<Button isDisabled={isAddingExpense} onPress={onSave}>
				{isAddingExpense ? <Spinner size="sm" /> : null}
				<Button.Label>
					{editingExpenseId ? "Save expense" : "Add expense"}
				</Button.Label>
			</Button>
			<Button
				isDisabled={isAddingExpense}
				onPress={onCancel}
				variant="secondary"
			>
				<Button.Label>
					{editingExpenseId ? "Cancel edit" : "Cancel"}
				</Button.Label>
			</Button>
		</Surface>
	);
}

const getVaultItemLabel = (
	item: Pick<Doc<"vaultItems">, "fileName" | "title">
) => item.title || item.fileName;

function ExpenseRow({
	bookingLabel,
	deletingExpenseId,
	expense,
	onDelete,
	onEdit,
	onOpenReceipt,
	receiptLabel,
	receiptUrl,
	tripId,
}: {
	bookingLabel?: string;
	deletingExpenseId: Id<"expenses"> | null;
	expense: Doc<"expenses">;
	onDelete: (expenseId: Id<"expenses">) => void;
	onEdit: (expense: Doc<"expenses">) => void;
	onOpenReceipt: (url: string) => void;
	receiptLabel?: string;
	receiptUrl?: string | null;
	tripId: Id<"trips">;
}) {
	return (
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
				{expense.bookingId || expense.vaultItemId ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{[
							expense.bookingId ? `Booking ${bookingLabel ?? "linked"}` : null,
							expense.vaultItemId
								? `Receipt ${receiptLabel ?? "linked"}`
								: null,
						]
							.filter(Boolean)
							.join(" · ")}
					</Text>
				) : null}
			</View>
			<View className="items-end gap-2">
				<Text type="body-sm" weight="semibold">
					{formatMoney(expense.amount, expense.currency)}
				</Text>
				<View className="flex-row flex-wrap justify-end gap-2">
					{expense.bookingId ? (
						<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
							<Button size="sm" variant="secondary">
								<Ionicons
									color={budgetAccentColor}
									name="ticket-outline"
									size={15}
								/>
								<Button.Label>Open booking</Button.Label>
							</Button>
						</Link>
					) : null}
					{receiptUrl ? (
						<Button
							onPress={() => onOpenReceipt(receiptUrl)}
							size="sm"
							variant="secondary"
						>
							<Ionicons
								color={budgetAccentColor}
								name="document-attach-outline"
								size={15}
							/>
							<Button.Label>Open receipt</Button.Label>
						</Button>
					) : null}
					<Button onPress={() => onEdit(expense)} size="sm" variant="secondary">
						<Button.Label>Edit</Button.Label>
					</Button>
					<Button
						isDisabled={deletingExpenseId === expense._id}
						onPress={() => onDelete(expense._id)}
						size="sm"
						variant="tertiary"
					>
						<Button.Label>Delete</Button.Label>
					</Button>
				</View>
			</View>
		</View>
	);
}

export function TripBudgetScreen() {
	const tripId = useTripIdParam();
	const budget = useQuery(
		api.trips.getTripBudget,
		tripId ? { tripId } : "skip"
	);
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
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
	const [receiptOpenErrorMessage, setReceiptOpenErrorMessage] = useState<
		string | null
	>(null);
	const [isSavingBudget, setIsSavingBudget] = useState(false);
	const [isAddingExpense, setIsAddingExpense] = useState(false);
	const [deletingExpenseId, setDeletingExpenseId] =
		useState<Id<"expenses"> | null>(null);
	const [isBudgetEditorOpen, setIsBudgetEditorOpen] = useState(false);
	const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);

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
		return <ScreenLoadingState />;
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
	const receiptVaultItems =
		workspace?.vaultItems.filter(
			(item) => item.kind === "receipt" || item.kind === "booking"
		) ?? [];
	const bookingOptions = budget.bookings.map((booking) => ({
		detail: `${formatStatus(booking.type)} · ${booking.provider ?? "Provider TBD"}`,
		id: booking._id,
		label: booking.title,
	}));
	const receiptOptions = receiptVaultItems.map((item) => ({
		detail: formatStatus(item.kind),
		id: item._id,
		label: getVaultItemLabel(item),
	}));
	const bookingLabelById = new Map(
		bookingOptions.map((option) => [option.id, option.label])
	);
	const receiptLabelById = new Map(
		receiptOptions.map((option) => [option.id, option.label])
	);
	const receiptUrlById = new Map(
		receiptVaultItems.map((item) => [item._id, item.url])
	);
	const budgetEditorIsVisible = isBudgetEditorOpen || !budgetAmount;

	const openNewExpenseForm = () => {
		setEditingExpenseId(null);
		setExpenseErrorMessage(null);
		setExpenseForm(initialExpenseForm());
		setIsExpenseFormOpen(true);
	};

	const closeExpenseForm = () => {
		setEditingExpenseId(null);
		setExpenseErrorMessage(null);
		setExpenseForm(initialExpenseForm());
		setIsExpenseFormOpen(false);
	};

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
			setIsBudgetEditorOpen(false);
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
					...getExpenseLinkPatch(expenseForm),
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
					...getExpenseLinkPatch(expenseForm),
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
			setIsExpenseFormOpen(false);
		} catch (error) {
			setExpenseErrorMessage(
				error instanceof Error ? error.message : "Could not save expense."
			);
		} finally {
			setIsAddingExpense(false);
		}
	};

	const handleDeleteExpense = async (expenseId: Id<"expenses">) => {
		setExpenseErrorMessage(null);
		setDeletingExpenseId(expenseId);
		try {
			await deleteTripExpense({ expenseId });
			if (editingExpenseId === expenseId) {
				setEditingExpenseId(null);
				setExpenseForm(initialExpenseForm());
				setIsExpenseFormOpen(false);
			}
		} catch (error) {
			setExpenseErrorMessage(
				error instanceof Error ? error.message : "Could not delete expense."
			);
		} finally {
			setDeletingExpenseId(null);
		}
	};

	const openExpenseForEdit = (expense: Doc<"expenses">) => {
		setEditingExpenseId(expense._id);
		setExpenseForm({
			amount: expense.amount.toString(),
			bookingId: expense.bookingId ?? "",
			category: expense.category as ExpenseCategory,
			notes: expense.notes ?? "",
			spentAt: expense.spentAt,
			title: expense.title,
			vaultItemId: expense.vaultItemId ?? "",
		});
		setIsExpenseFormOpen(true);
	};
	const handleAddCategoryExpense = (category: ExpenseCategory) => {
		setEditingExpenseId(null);
		setExpenseErrorMessage(null);
		setExpenseForm({
			...initialExpenseForm(),
			category,
		});
		setIsExpenseFormOpen(true);
	};

	const handleOpenReceipt = async (url: string) => {
		setReceiptOpenErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setReceiptOpenErrorMessage("Could not open this receipt.");
		}
	};

	return (
		<TripModuleScreenFrame activeTab="budget" tripId={tripId}>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<BudgetOverviewCard
						bookingHref={VIYA_ROUTES.tripBookings(tripId)}
						budgetStatus={budgetStatus}
						dailySafeSpendLabel={formatMoney(summary.dailySafeSpend, currency)}
						onLogExpense={openNewExpenseForm}
						onOpenBudgetEditor={() => {
							setBudgetErrorMessage(null);
							setIsBudgetEditorOpen(true);
						}}
						plannedBudgetLabel={plannedBudgetLabel}
						progress={budgetProgress}
						remainingAmountLabel={formatMoney(
							summary.remainingAmount,
							currency
						)}
						totalTrackedSpendLabel={formatMoney(
							summary.totalTrackedSpend,
							currency
						)}
					/>

					{budgetEditorIsVisible ? (
						<BudgetEditorCard
							budgetAmount={budgetAmount}
							budgetDraft={budgetDraft}
							budgetErrorMessage={budgetErrorMessage}
							isSavingBudget={isSavingBudget}
							onCancel={() => {
								setBudgetErrorMessage(null);
								setBudgetDraft("");
								setIsBudgetEditorOpen(false);
							}}
							onSave={() => {
								handleSaveBudget().catch(() => undefined);
							}}
							onUpdateBudgetDraft={setBudgetDraft}
						/>
					) : null}

					{isExpenseFormOpen ? (
						<ExpenseFormCard
							bookingOptions={bookingOptions}
							editingExpenseId={editingExpenseId}
							expenseErrorMessage={expenseErrorMessage}
							expenseForm={expenseForm}
							isAddingExpense={isAddingExpense}
							onCancel={closeExpenseForm}
							onSave={() => {
								handleSaveExpense().catch(() => undefined);
							}}
							onUpdateForm={(patch) => {
								setExpenseForm((current) => ({ ...current, ...patch }));
							}}
							receiptOptions={receiptOptions}
						/>
					) : null}

					<View className="gap-3">
						<Text
							className="px-1"
							color="muted"
							type="body-xs"
							weight="semibold"
						>
							SPEND BREAKDOWN
						</Text>
						<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
							{summary.categoryBreakdown.length === 0 ? (
								<View className="items-center gap-2 p-6">
									<Ionicons color="#8E8E93" name="receipt-outline" size={24} />
									<Text color="muted" type="body-sm">
										No booked costs or manual expenses yet.
									</Text>
									<View className="flex-row flex-wrap justify-center gap-2">
										<Button
											onPress={openNewExpenseForm}
											size="sm"
											variant="secondary"
										>
											<Button.Label>Add expense</Button.Label>
										</Button>
										<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
											<Button size="sm" variant="secondary">
												<Button.Label>Add booking cost</Button.Label>
											</Button>
										</Link>
									</View>
								</View>
							) : (
								summary.categoryBreakdown.map((item) => (
									<CategoryBreakdownRow
										currency={currency}
										item={item}
										key={item.category}
										onAddCategoryExpense={handleAddCategoryExpense}
									/>
								))
							)}
						</Surface>
					</View>

					<View className="gap-3">
						<Text
							className="px-1"
							color="muted"
							type="body-xs"
							weight="semibold"
						>
							RECENT EXPENSES
						</Text>
						{receiptOpenErrorMessage ? (
							<Text className="px-1 text-danger" type="body-sm">
								{receiptOpenErrorMessage}
							</Text>
						) : null}
						<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
							{budget.expenses.length === 0 ? (
								<View className="items-center gap-2 p-5">
									<Text color="muted" type="body-sm">
										Manual expenses will appear here.
									</Text>
									<Button
										onPress={openNewExpenseForm}
										size="sm"
										variant="secondary"
									>
										<Ionicons
											color={budgetAccentColor}
											name="add-outline"
											size={15}
										/>
										<Button.Label>Add first expense</Button.Label>
									</Button>
								</View>
							) : (
								budget.expenses.map((expense) => {
									const receiptUrl = expense.vaultItemId
										? receiptUrlById.get(expense.vaultItemId)
										: null;

									return (
										<ExpenseRow
											bookingLabel={
												expense.bookingId
													? bookingLabelById.get(expense.bookingId)
													: undefined
											}
											deletingExpenseId={deletingExpenseId}
											expense={expense}
											key={expense._id}
											onDelete={(expenseId) => {
												handleDeleteExpense(expenseId).catch(() => undefined);
											}}
											onEdit={openExpenseForEdit}
											onOpenReceipt={(url) => {
												handleOpenReceipt(url).catch(() => undefined);
											}}
											receiptLabel={
												expense.vaultItemId
													? receiptLabelById.get(expense.vaultItemId)
													: undefined
											}
											receiptUrl={receiptUrl}
											tripId={tripId}
										/>
									);
								})
							)}
						</Surface>
					</View>
				</View>
			</Container>
		</TripModuleScreenFrame>
	);
}
