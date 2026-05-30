import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextField,
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
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
const budgetAccentTrack = "rgba(10, 165, 181, 0.16)";
const subtleBorderColor = "rgba(24, 24, 27, 0.08)";
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
	align = "flex-start",
	detail,
	label,
	value,
}: {
	align?: "flex-end" | "flex-start";
	detail?: string;
	label: string;
	value: string;
}) {
	return (
		<View className="min-w-0 flex-1 gap-1.5" style={{ alignItems: align }}>
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
			style={{ backgroundColor: budgetAccentTrack }}
		>
			<View
				className="h-full rounded-full"
				style={{ backgroundColor: budgetAccentColor, width: `${progress}%` }}
			/>
		</View>
	);
}

function BudgetOverviewCard({
	budgetStatus,
	dailySafeSpendLabel,
	onOpenBudgetEditor,
	plannedBudgetLabel,
	progress,
	remainingAmountLabel,
	totalTrackedSpendLabel,
}: {
	budgetStatus: string;
	dailySafeSpendLabel: string;
	onOpenBudgetEditor: () => void;
	plannedBudgetLabel: string;
	progress: number;
	remainingAmountLabel: string;
	totalTrackedSpendLabel: string;
}) {
	return (
		<Surface className="gap-3 rounded-[30px] bg-surface-secondary p-4">
			<View className="flex-row items-center gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: budgetAccentBackground }}
				>
					<Ionicons color={budgetAccentColor} name="wallet-outline" size={20} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						BUDGET STATUS
					</Text>
					<Text.Heading numberOfLines={1} type="h3" weight="semibold">
						{remainingAmountLabel}
					</Text.Heading>
					<Text color="muted" numberOfLines={1} type="body-xs">
						{dailySafeSpendLabel} safe daily spend
					</Text>
				</View>
				<View
					className="rounded-full px-3 py-1.5"
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

			<View className="gap-2 rounded-[20px] bg-surface px-3 py-2.5">
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

			<View
				className="flex-row items-stretch gap-4 border-t pt-3"
				style={{ borderColor: subtleBorderColor }}
			>
				<BudgetSnapshotStat
					detail="Logged"
					label="Spent"
					value={totalTrackedSpendLabel}
				/>
				<View className="w-px self-stretch bg-border" />
				<BudgetSnapshotStat label="Daily" value={dailySafeSpendLabel} />
				<View className="w-px self-stretch bg-border" />
				<BudgetSnapshotStat
					align="flex-end"
					label="Budget"
					value={plannedBudgetLabel}
				/>
			</View>

			<Button onPress={onOpenBudgetEditor} size="sm" variant="secondary">
				<Ionicons color={budgetAccentColor} name="create-outline" size={15} />
				<Button.Label>Edit budget</Button.Label>
			</Button>
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

function SheetField({
	children,
	label,
}: {
	children: (
		handlers: ReturnType<typeof useCompatibleBottomSheetAwareHandlers>
	) => ReactNode;
	label: string;
}) {
	const handlers = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			{children(handlers)}
		</TextField>
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

function ExpenseFormSheet({
	bookingOptions,
	editingExpenseId,
	expenseErrorMessage,
	expenseForm,
	isAddingExpense,
	isOpen,
	onOpenChange,
	onSave,
	onUpdateForm,
	receiptOptions,
}: {
	bookingOptions: { detail: string; id: Id<"bookings">; label: string }[];
	editingExpenseId: Id<"expenses"> | null;
	expenseErrorMessage: string | null;
	expenseForm: ExpenseFormState;
	isAddingExpense: boolean;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSave: () => void;
	onUpdateForm: (patch: Partial<ExpenseFormState>) => void;
	receiptOptions: { detail: string; id: Id<"vaultItems">; label: string }[];
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["86%"]}
				>
					<ScrollView
						contentContainerStyle={{
							gap: 16,
							paddingBottom: Math.max(insets.bottom, 18),
							paddingHorizontal: 20,
							paddingTop: 8,
						}}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{editingExpenseId ? "Edit expense" : "Add expense"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Log manual spend and link booking or receipt proof.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close expense form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<SheetField label="Title">
							{({ onBlur, onFocus }) => (
								<Input
									className="h-12 border border-border bg-surface px-4"
									onBlur={onBlur}
									onChangeText={(title) => onUpdateForm({ title })}
									onFocus={onFocus}
									placeholder="Lunch, taxi, museum ticket"
									value={expenseForm.title}
									variant="secondary"
								/>
							)}
						</SheetField>
						<View className="flex-row flex-wrap gap-3">
							<View className="min-w-0 flex-1">
								<SheetField label="Amount">
									{({ onBlur, onFocus }) => (
										<Input
											className="h-12 border border-border bg-surface px-4"
											keyboardType="numeric"
											onBlur={onBlur}
											onChangeText={(amount) => onUpdateForm({ amount })}
											onFocus={onFocus}
											placeholder="1200"
											value={expenseForm.amount}
											variant="secondary"
										/>
									)}
								</SheetField>
							</View>
							<View className="min-w-0 flex-1">
								<SheetField label="Date">
									{({ onBlur, onFocus }) => (
										<Input
											className="h-12 border border-border bg-surface px-4"
											onBlur={onBlur}
											onChangeText={(spentAt) => onUpdateForm({ spentAt })}
											onFocus={onFocus}
											placeholder="2026-07-10"
											value={expenseForm.spentAt}
											variant="secondary"
										/>
									)}
								</SheetField>
							</View>
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
						<SheetField label="Notes">
							{({ onBlur, onFocus }) => (
								<Input
									className="h-12 border border-border bg-surface px-4"
									onBlur={onBlur}
									onChangeText={(notes) => onUpdateForm({ notes })}
									onFocus={onFocus}
									placeholder="Optional"
									value={expenseForm.notes}
									variant="secondary"
								/>
							)}
						</SheetField>
						{expenseErrorMessage ? (
							<Text className="text-danger" type="body-sm">
								{expenseErrorMessage}
							</Text>
						) : null}
						<Button isDisabled={isAddingExpense} onPress={onSave} size="lg">
							{isAddingExpense ? <Spinner size="sm" /> : null}
							<Button.Label>
								{editingExpenseId ? "Save expense" : "Add expense"}
							</Button.Label>
						</Button>
					</ScrollView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
			className="flex-row items-center justify-between gap-3 border-border border-b px-4 py-3.5"
			key={expense._id}
		>
			<View
				className="h-10 w-10 items-center justify-center rounded-full"
				style={{ backgroundColor: budgetAccentBackground }}
			>
				<Ionicons color={budgetAccentColor} name="receipt-outline" size={18} />
			</View>
			<View className="min-w-0 flex-1 gap-0.5">
				<View className="flex-row items-start justify-between gap-3">
					<View className="min-w-0 flex-1">
						<Text numberOfLines={1} type="body-sm" weight="semibold">
							{expense.title}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{formatStatus(expense.category)} · {expense.spentAt}
						</Text>
					</View>
					<Text type="body-sm" weight="semibold">
						{formatMoney(expense.amount, expense.currency)}
					</Text>
				</View>
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
				<View className="flex-row flex-wrap gap-2 pt-2">
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

	const handleOpenReceipt = async (url: string) => {
		setReceiptOpenErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setReceiptOpenErrorMessage("Could not open this receipt.");
		}
	};

	return (
		<TripModuleScreenFrame
			activeTab="budget"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add expense"
					icon="add"
					onPress={openNewExpenseForm}
				/>
			}
			tripId={tripId}
		>
			<Container includeBottomInset={false} isScrollable={false}>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						gap: 14,
						paddingBottom: 112,
						paddingHorizontal: 16,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<BudgetOverviewCard
						budgetStatus={budgetStatus}
						dailySafeSpendLabel={formatMoney(summary.dailySafeSpend, currency)}
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

					<View className="gap-3">
						<Text
							className="px-1"
							color="muted"
							type="body-xs"
							weight="semibold"
						>
							ALL EXPENSES
						</Text>
						{receiptOpenErrorMessage ? (
							<Text className="px-1 text-danger" type="body-sm">
								{receiptOpenErrorMessage}
							</Text>
						) : null}
						<Surface className="overflow-hidden rounded-[30px] border border-border bg-surface">
							{budget.expenses.length === 0 ? (
								<View className="items-center gap-3 p-6">
									<View className="h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
										<Ionicons color="#8E8E93" name="card-outline" size={23} />
									</View>
									<Text align="center" color="muted" type="body-sm">
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
				</ScrollView>
				<ExpenseFormSheet
					bookingOptions={bookingOptions}
					editingExpenseId={editingExpenseId}
					expenseErrorMessage={expenseErrorMessage}
					expenseForm={expenseForm}
					isAddingExpense={isAddingExpense}
					isOpen={isExpenseFormOpen}
					onOpenChange={(isOpen) => {
						if (isOpen) {
							setIsExpenseFormOpen(true);
							return;
						}

						closeExpenseForm();
					}}
					onSave={() => {
						handleSaveExpense().catch(() => undefined);
					}}
					onUpdateForm={(patch) => {
						setExpenseForm((current) => ({ ...current, ...patch }));
					}}
					receiptOptions={receiptOptions}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}
