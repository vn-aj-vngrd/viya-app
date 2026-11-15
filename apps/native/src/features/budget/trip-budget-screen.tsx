import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getBudgetDayCount,
	getBudgetWalletSummary,
	getTripDayCount,
	isBookingSecured,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import {
	DatePickerField,
	formatIsoDate,
} from "@/src/components/date/date-picker-field";
import {
	AppText,
	EmptyState,
	haptic,
	ListGroup,
	ListRow,
	radius,
	ScreenShell,
	spacing,
	useFeedback,
	useLayoutSpring,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import {
	formatCount,
	formatDay,
	formatEnumLabel,
	formatMoney,
	toLocalDateKey,
} from "@/src/lib/format";

import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	LinkRow,
	RecordSheet,
	StatusLabel,
	SwipeRow,
} from "../bookings/module-kit";

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

interface LinkOption<TId extends string> {
	detail: string;
	id: TId;
	label: string;
}

const initialExpenseForm = (): ExpenseFormState => ({
	amount: "",
	bookingId: "",
	category: "food",
	notes: "",
	spentAt: toLocalDateKey(),
	title: "",
	vaultItemId: "",
});

const parseAmount = (value: string) => Number(value.replaceAll(",", "").trim());

const getExpenseLinkPatch = (form: ExpenseFormState): ExpenseLinkPatch => ({
	bookingId: form.bookingId || undefined,
	vaultItemId: form.vaultItemId || undefined,
});

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

const formatForeignCurrencyTotals = (
	totals: Array<{ amount: number; currency: string }>
) =>
	totals
		.map(({ amount, currency }) => formatMoney(amount, currency))
		.join(", ");

const getVaultItemLabel = (
	item: Pick<Doc<"vaultItems">, "fileName" | "title">
) => item.title || item.fileName;

function ProgressBar({
	isOver,
	progress,
}: {
	isOver: boolean;
	progress: number;
}) {
	const { palette } = useUITheme();
	const spring = useLayoutSpring();
	const width = useSharedValue(0);

	useEffect(() => {
		width.value = spring(progress);
	}, [progress, spring, width]);

	const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

	return (
		<View
			accessibilityLabel={`${Math.round(progress)} percent of budget spent`}
			accessibilityRole="progressbar"
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: 6,
				overflow: "hidden",
			}}
		>
			<Animated.View
				style={[
					{
						backgroundColor: isOver ? palette.danger : palette.accent,
						borderRadius: radius.pill,
						height: "100%",
					},
					fillStyle,
				]}
			/>
		</View>
	);
}

/** One large figure, a thin track and a quiet line. No tiles, no ring. */
function BudgetFigure({
	budgetAmount,
	currency,
	dailySafeSpend,
	dayCount,
	hasDates,
	leftAmount,
	overAmount,
	progress,
	totalTrackedSpend,
}: {
	budgetAmount?: number;
	currency: string;
	dailySafeSpend: number;
	dayCount: number;
	hasDates: boolean;
	leftAmount: number;
	overAmount: number;
	progress: number;
	totalTrackedSpend: number;
}) {
	const isOver = Boolean(budgetAmount) && overAmount > 0;

	return (
		<View style={{ gap: spacing.md }}>
			<View style={{ gap: spacing.xs }}>
				<AppText tone="secondary" variant="subhead">
					Spent
				</AppText>
				<View
					style={{
						alignItems: "baseline",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: spacing.sm,
					}}
				>
					<AppText variant="title">
						{formatMoney(totalTrackedSpend, currency)}
					</AppText>
					{budgetAmount ? (
						<AppText tone="secondary" variant="callout">
							of {formatMoney(budgetAmount, currency)}
						</AppText>
					) : null}
				</View>
			</View>
			{budgetAmount ? (
				<>
					<ProgressBar isOver={isOver} progress={progress} />
					{isOver ? (
						<StatusLabel
							icon="alert-circle-outline"
							label={`Over by ${formatMoney(overAmount, currency)}`}
							tone="danger"
						/>
					) : (
						<AppText tone="secondary" variant="subhead">
							{formatMoney(leftAmount, currency)} left
							{hasDates && dayCount > 0
								? ` · ${formatMoney(dailySafeSpend, currency)} a day for ${formatCount(dayCount, "day")}`
								: ""}
						</AppText>
					)}
				</>
			) : null}
		</View>
	);
}

function BudgetEditorSheet({
	budgetDraft,
	budgetErrorMessage,
	isOpen,
	isSavingBudget,
	onOpenChange,
	onSave,
	onUpdateBudgetDraft,
}: {
	budgetDraft: string;
	budgetErrorMessage: string | null;
	isOpen: boolean;
	isSavingBudget: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSave: () => void;
	onUpdateBudgetDraft: (value: string) => void;
}) {
	return (
		<RecordSheet
			errorMessage={budgetErrorMessage}
			isOpen={isOpen}
			isSaving={isSavingBudget}
			onOpenChange={onOpenChange}
			onSave={onSave}
			snapPoints={["48%"]}
			title="Total budget"
		>
			<FieldGroup footer="The most you want to spend on this trip.">
				<FieldRow
					keyboardType="decimal-pad"
					label="Total (₱)"
					onChangeText={onUpdateBudgetDraft}
					placeholder="25,000"
					value={budgetDraft}
				/>
			</FieldGroup>
		</RecordSheet>
	);
}

function ExpenseFormSheet({
	bookingOptions,
	editingExpense,
	expenseErrorMessage,
	expenseForm,
	isAddingExpense,
	isOpen,
	onDelete,
	onOpenChange,
	onOpenReceipt,
	onSave,
	onUpdateForm,
	receiptOptions,
	receiptUrl,
	tripId,
}: {
	bookingOptions: LinkOption<Id<"bookings">>[];
	editingExpense: Doc<"expenses"> | null;
	expenseErrorMessage: string | null;
	expenseForm: ExpenseFormState;
	isAddingExpense: boolean;
	isOpen: boolean;
	onDelete: () => void;
	onOpenChange: (isOpen: boolean) => void;
	onOpenReceipt: (url: string) => void;
	onSave: () => void;
	onUpdateForm: (patch: Partial<ExpenseFormState>) => void;
	receiptOptions: LinkOption<Id<"vaultItems">>[];
	receiptUrl?: string | null;
	tripId: Id<"trips">;
}) {
	const [showMore, setShowMore] = useState(false);
	const hasLinks = Boolean(expenseForm.bookingId || expenseForm.vaultItemId);
	const moreVisible = showMore || hasLinks || Boolean(expenseForm.notes);

	useEffect(() => {
		if (!isOpen) {
			setShowMore(false);
		}
	}, [isOpen]);

	const bookingLabels = new Map<string, string>(
		bookingOptions.map((option) => [option.id, option.label])
	);
	const receiptLabels = new Map<string, string>(
		receiptOptions.map((option) => [option.id, option.label])
	);

	return (
		<RecordSheet
			errorMessage={expenseErrorMessage}
			isOpen={isOpen}
			isSaving={isAddingExpense}
			onOpenChange={onOpenChange}
			onSave={onSave}
			saveLabel={editingExpense ? "Save" : "Add"}
			title={editingExpense ? "Edit expense" : "Add expense"}
		>
			<FieldGroup>
				<FieldRow
					label="Title"
					onChangeText={(title) => onUpdateForm({ title })}
					placeholder="Lunch, taxi, museum ticket"
					value={expenseForm.title}
				/>
				<FieldRow
					keyboardType="decimal-pad"
					label="Amount (₱)"
					onChangeText={(amount) => onUpdateForm({ amount })}
					placeholder="1,200"
					value={expenseForm.amount}
				/>
				<DatePickerField
					formatDate={(date) => formatDay(formatIsoDate(date))}
					label="Date"
					onChangeText={(spentAt) => onUpdateForm({ spentAt })}
					value={expenseForm.spentAt}
				/>
				<CategoryPicker
					onChange={(category) => onUpdateForm({ category })}
					value={expenseForm.category}
				/>
			</FieldGroup>

			{moreVisible ? (
				<FieldGroup>
					<ChoiceRow
						format={(id) =>
							id === "" ? "None" : (bookingLabels.get(id) ?? id)
						}
						label="Booking"
						onChange={(bookingId) =>
							onUpdateForm({ bookingId: bookingId as Id<"bookings"> | "" })
						}
						options={["", ...bookingOptions.map((option) => option.id)]}
						value={expenseForm.bookingId}
					/>
					<ChoiceRow
						format={(id) =>
							id === "" ? "None" : (receiptLabels.get(id) ?? id)
						}
						label="Receipt"
						onChange={(vaultItemId) =>
							onUpdateForm({
								vaultItemId: vaultItemId as Id<"vaultItems"> | "",
							})
						}
						options={["", ...receiptOptions.map((option) => option.id)]}
						value={expenseForm.vaultItemId}
					/>
					<FieldRow
						label="Notes"
						multiline={true}
						onChangeText={(notes) => onUpdateForm({ notes })}
						placeholder="Optional"
						value={expenseForm.notes}
					/>
				</FieldGroup>
			) : (
				<ListGroup>
					<ListRow
						onPress={() => setShowMore(true)}
						subtitle="Booking, receipt, notes"
						title="More"
					/>
				</ListGroup>
			)}

			{editingExpense?.bookingId || receiptUrl ? (
				<ListGroup>
					{editingExpense?.bookingId ? (
						<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
							<LinkRow icon="ticket-outline" label="Open booking" />
						</Link>
					) : null}
					{receiptUrl ? (
						<LinkRow
							icon="document-attach-outline"
							label="Open receipt"
							onPress={() => onOpenReceipt(receiptUrl)}
						/>
					) : null}
				</ListGroup>
			) : null}

			{editingExpense ? (
				<ListGroup>
					<ListRow
						destructive={true}
						onPress={onDelete}
						showChevron={false}
						title="Delete expense"
					/>
				</ListGroup>
			) : null}
		</RecordSheet>
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
		<ChoiceRow
			format={formatEnumLabel}
			label="Category"
			onChange={onChange}
			options={expenseCategories}
			value={value}
		/>
	);
}

const groupExpensesByDay = (expenses: Doc<"expenses">[]) => {
	const sorted = [...expenses].sort(
		(left, right) =>
			right.spentAt.localeCompare(left.spentAt) ||
			right._creationTime - left._creationTime
	);
	const groups: { day: string; items: Doc<"expenses">[] }[] = [];

	for (const expense of sorted) {
		const last = groups.at(-1);

		if (last && last.day === expense.spentAt) {
			last.items.push(expense);
		} else {
			groups.push({ day: expense.spentAt, items: [expense] });
		}
	}

	return groups;
};

function WhereItComesFrom({
	bookedCount,
	confirmedBookingCosts,
	currency,
	expenseCount,
	manualExpenses,
	plannedCosts,
	tripId,
}: {
	bookedCount: number;
	confirmedBookingCosts: number;
	currency: string;
	expenseCount: number;
	manualExpenses: number;
	plannedCosts: number;
	tripId: Id<"trips">;
}) {
	return (
		<ListGroup header="Where it comes from">
			<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
				<ListRow
					subtitle={formatCount(bookedCount, "booking")}
					title="Booked"
					value={formatMoney(confirmedBookingCosts, currency)}
				/>
			</Link>
			<ListRow
				showChevron={false}
				subtitle={formatCount(expenseCount, "expense")}
				title="Logged expenses"
				value={formatMoney(manualExpenses, currency)}
			/>
			{plannedCosts > 0 ? (
				<Link asChild href={VIYA_ROUTES.tripItinerary(tripId)}>
					<ListRow
						subtitle="Estimates, not counted in spent"
						title="Planned in itinerary"
						value={formatMoney(plannedCosts, currency)}
					/>
				</Link>
			) : null}
		</ListGroup>
	);
}

const getEmptyCopy = (
	budgetAmount: number | undefined,
	currency: string,
	tripDays: number | null
) => {
	if (!budgetAmount) {
		return {
			description: "Set a total to see what is left each day.",
			title: "No budget or expenses yet",
		};
	}

	return {
		description: `${formatMoney(budgetAmount, currency)} to spend${tripDays ? ` over ${formatCount(tripDays, "day")}` : ""}.`,
		title: "No expenses logged",
	};
};

export function TripBudgetScreen() {
	const tripId = useTripIdParam();
	const { confirm } = useFeedback();
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
			remainingTripDays: getBudgetDayCount(budget.trip, toLocalDateKey()),
		});
	}, [budget]);

	if (!tripId) {
		return (
			<ScreenShell
				state={{
					description: "Open a saved trip to see its budget.",
					icon: "wallet-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Budget"
			/>
		);
	}

	if (budget === undefined || !summary) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading budget" }}
				title="Budget"
			/>
		);
	}

	const currency = budget.trip.budgetCurrency ?? "PHP";
	const budgetAmount = budget.trip.budgetAmount;
	const budgetProgress = getBudgetProgress({
		budgetAmount,
		totalTrackedSpend: summary.totalTrackedSpend,
	});
	const foreignSpendLabel =
		summary.foreignCurrencyTotals.length > 0
			? formatForeignCurrencyTotals(summary.foreignCurrencyTotals)
			: undefined;
	const receiptVaultItems =
		workspace?.vaultItems.filter(
			(item) => item.kind === "receipt" || item.kind === "booking"
		) ?? [];
	const bookingOptions = budget.bookings.map((booking) => ({
		detail: `${formatEnumLabel(booking.type)}, ${booking.provider ?? "Provider not set"}`,
		id: booking._id,
		label: booking.title,
	}));
	const receiptOptions = receiptVaultItems.map((item) => ({
		detail: formatEnumLabel(item.kind),
		id: item._id,
		label: getVaultItemLabel(item),
	}));
	const bookingLabelById = new Map(
		bookingOptions.map((option) => [option.id, option.label])
	);
	const receiptUrlById = new Map(
		receiptVaultItems.map((item) => [item._id, item.url])
	);
	const editingExpense =
		budget.expenses.find((expense) => expense._id === editingExpenseId) ?? null;
	const editingReceiptUrl = editingExpense?.vaultItemId
		? receiptUrlById.get(editingExpense.vaultItemId)
		: null;
	const hasExpenses = budget.expenses.length > 0;

	const budgetDayCount = getBudgetDayCount(budget.trip, toLocalDateKey());
	const tripDays = getTripDayCount(budget.trip.startDate, budget.trip.endDate);
	const emptyCopy = getEmptyCopy(budgetAmount, currency, tripDays);
	const bookedCount = budget.bookings.filter((booking) =>
		isBookingSecured(booking.status)
	).length;

	const openBudgetEditor = () => {
		setBudgetErrorMessage(null);
		setBudgetDraft(budgetAmount?.toString() ?? "");
		setIsBudgetEditorOpen(true);
	};

	const closeBudgetEditor = () => {
		setBudgetErrorMessage(null);
		setBudgetDraft("");
		setIsBudgetEditorOpen(false);
	};

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
			setBudgetErrorMessage("Enter a budget above zero.");
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
			haptic("success");
			closeBudgetEditor();
		} catch (error) {
			setBudgetErrorMessage(
				error instanceof Error ? error.message : "Could not update the budget."
			);
		} finally {
			setIsSavingBudget(false);
		}
	};

	const handleSaveExpense = async () => {
		const amount = parseAmount(expenseForm.amount);
		const title = expenseForm.title.trim();
		if (!title) {
			setExpenseErrorMessage("Add a title.");
			return;
		}

		if (!(Number.isFinite(amount) && amount > 0)) {
			setExpenseErrorMessage("Enter an amount above zero.");
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
			haptic("success");
			closeExpenseForm();
		} catch (error) {
			setExpenseErrorMessage(
				error instanceof Error ? error.message : "Could not save the expense."
			);
		} finally {
			setIsAddingExpense(false);
		}
	};

	const handleDeleteExpense = async (expense: Doc<"expenses">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete expense",
			destructive: true,
			message: `${expense.title} will be removed from this trip.`,
			title: "Delete expense",
		});
		if (!confirmed) {
			return;
		}

		try {
			await deleteTripExpense({ expenseId: expense._id });
			haptic("warning");
			if (editingExpenseId === expense._id) {
				closeExpenseForm();
			}
		} catch (error) {
			setReceiptOpenErrorMessage(
				error instanceof Error ? error.message : "Could not delete the expense."
			);
		}
	};

	const openExpenseForEdit = (expense: Doc<"expenses">) => {
		setEditingExpenseId(expense._id);
		setExpenseErrorMessage(null);
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
		<>
			<ScreenShell
				actions={
					hasExpenses
						? [
								{
									icon: "add",
									key: "add",
									label: "Add expense",
									onPress: openNewExpenseForm,
									type: "button",
								},
							]
						: []
				}
				title="Budget"
			>
				<BudgetFigure
					budgetAmount={budgetAmount}
					currency={currency}
					dailySafeSpend={summary.dailySafeSpend}
					dayCount={budgetDayCount}
					hasDates={Boolean(budget.trip.startDate && budget.trip.endDate)}
					leftAmount={summary.leftAmount}
					overAmount={summary.overAmount}
					progress={budgetProgress}
					totalTrackedSpend={summary.totalTrackedSpend}
				/>

				<ListGroup
					footer={
						foreignSpendLabel
							? `${foreignSpendLabel} tracked separately.`
							: undefined
					}
				>
					<ListRow
						onPress={openBudgetEditor}
						title="Total budget"
						value={
							budgetAmount ? formatMoney(budgetAmount, currency) : "Not set"
						}
					/>
				</ListGroup>

				{receiptOpenErrorMessage ? (
					<AppText accessibilityRole="alert" tone="danger" variant="subhead">
						{receiptOpenErrorMessage}
					</AppText>
				) : null}

				<WhereItComesFrom
					bookedCount={bookedCount}
					confirmedBookingCosts={summary.confirmedBookingCosts}
					currency={currency}
					expenseCount={budget.expenses.length}
					manualExpenses={summary.manualExpenses}
					plannedCosts={summary.plannedCosts}
					tripId={tripId}
				/>

				{summary.categoryBreakdown.length > 0 ? (
					<ListGroup header="By category">
						{summary.categoryBreakdown.map((entry) => (
							<ListRow
								key={entry.category}
								showChevron={false}
								title={formatEnumLabel(entry.category)}
								value={formatMoney(entry.amount, currency)}
							/>
						))}
					</ListGroup>
				) : null}

				{hasExpenses ? (
					groupExpensesByDay(budget.expenses).map((group) => (
						<ListGroup
							header={`${formatDay(group.day) || group.day} · ${formatMoney(
								group.items.reduce((sum, item) => sum + item.amount, 0),
								currency
							)}`}
							key={group.day}
						>
							{group.items.map((expense) => (
								<SwipeRow
									key={expense._id}
									trailing={{
										icon: "trash-outline",
										label: "Delete",
										onPress: () => {
											handleDeleteExpense(expense).catch(() => undefined);
										},
										tone: "danger",
									}}
								>
									<ListRow
										accessibilityLabel={`${expense.title}, ${formatMoney(expense.amount, expense.currency)}. Edit`}
										onPress={() => openExpenseForEdit(expense)}
										showChevron={false}
										subtitle={[
											formatEnumLabel(expense.category),
											expense.bookingId
												? (bookingLabelById.get(expense.bookingId) ?? "Booking")
												: null,
											expense.vaultItemId ? "Receipt" : null,
										]
											.filter(Boolean)
											.join(", ")}
										title={expense.title}
										value={formatMoney(expense.amount, expense.currency)}
									/>
								</SwipeRow>
							))}
						</ListGroup>
					))
				) : (
					<EmptyState
						action={
							budgetAmount
								? { label: "Add expense", onPress: openNewExpenseForm }
								: { label: "Set budget", onPress: openBudgetEditor }
						}
						description={emptyCopy.description}
						icon="card-outline"
						title={emptyCopy.title}
					/>
				)}
			</ScreenShell>

			<BudgetEditorSheet
				budgetDraft={budgetDraft}
				budgetErrorMessage={budgetErrorMessage}
				isOpen={isBudgetEditorOpen}
				isSavingBudget={isSavingBudget}
				onOpenChange={(isOpen) => {
					if (isOpen) {
						setIsBudgetEditorOpen(true);
						return;
					}

					closeBudgetEditor();
				}}
				onSave={() => {
					handleSaveBudget().catch(() => undefined);
				}}
				onUpdateBudgetDraft={setBudgetDraft}
			/>
			<ExpenseFormSheet
				bookingOptions={bookingOptions}
				editingExpense={editingExpense}
				expenseErrorMessage={expenseErrorMessage}
				expenseForm={expenseForm}
				isAddingExpense={isAddingExpense}
				isOpen={isExpenseFormOpen}
				onDelete={() => {
					if (editingExpense) {
						handleDeleteExpense(editingExpense).catch(() => undefined);
					}
				}}
				onOpenChange={(isOpen) => {
					if (isOpen) {
						setIsExpenseFormOpen(true);
						return;
					}

					closeExpenseForm();
				}}
				onOpenReceipt={(url) => {
					handleOpenReceipt(url).catch(() => undefined);
				}}
				onSave={() => {
					handleSaveExpense().catch(() => undefined);
				}}
				onUpdateForm={(patch) => {
					setExpenseForm((current) => ({ ...current, ...patch }));
				}}
				receiptOptions={receiptOptions}
				receiptUrl={editingReceiptUrl}
				tripId={tripId}
			/>
		</>
	);
}
