import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link } from "expo-router";
import { BottomSheet, Input, Label, Menu, TextField } from "heroui-native";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import {
	AppText,
	Card,
	Chip,
	EmptyState,
	GlassIconButton,
	ListGroup,
	motion,
	type Palette,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { PillAction } from "@/src/features/bookings/pill-action";
import {
	formatMoney,
	formatStatus,
} from "@/src/features/trips/trip-dashboard-utils";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
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

const getTripBudgetDayCount = (startDate: string, endDate: string) => {
	const start = new Date(`${startDate}T00:00:00.000Z`);
	const end = new Date(`${endDate}T00:00:00.000Z`);
	const today = new Date(`${todayIsoDate()}T00:00:00.000Z`);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return 1;
	}

	const tripDayCount = Math.max(
		1,
		Math.ceil((end.getTime() - start.getTime()) / dateMs) + 1
	);

	if (today.getTime() < start.getTime()) {
		return tripDayCount;
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

const getBudgetStatusColor = (status: string, palette: Palette) => {
	if (status === "Over budget") {
		return palette.danger;
	}
	if (status === "Watch spend") {
		return palette.warning;
	}
	return status === "On track" ? palette.success : palette.inkTertiary;
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
		<View style={{ alignItems: align, flex: 1, gap: 2, minWidth: 0 }}>
			<AppText numberOfLines={1} tone="secondary" variant="footnote">
				{label}
			</AppText>
			<AppText bold={true} numberOfLines={1} variant="subhead">
				{value}
			</AppText>
			{detail ? (
				<AppText numberOfLines={1} tone="tertiary" variant="footnote">
					{detail}
				</AppText>
			) : null}
		</View>
	);
}

function ProgressBar({ color, progress }: { color: string; progress: number }) {
	const { palette } = useUITheme();
	const width = useSharedValue(0);

	useEffect(() => {
		width.value = withSpring(progress, motion.spring.selection);
	}, [progress, width]);

	const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

	return (
		<View
			accessibilityLabel={`${Math.round(progress)} percent of budget spent`}
			accessibilityRole="progressbar"
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: 8,
				overflow: "hidden",
			}}
		>
			<Animated.View
				style={[
					{ backgroundColor: color, borderRadius: radius.pill, height: "100%" },
					fillStyle,
				]}
			/>
		</View>
	);
}

function BudgetOverviewCard({
	budgetActionLabel,
	budgetStatus,
	dailySafeSpendLabel,
	foreignSpendLabel,
	onOpenBudgetEditor,
	plannedBudgetLabel,
	progress,
	remainingAmountLabel,
	totalTrackedSpendLabel,
}: {
	budgetActionLabel: string;
	budgetStatus: string;
	dailySafeSpendLabel: string;
	foreignSpendLabel?: string;
	onOpenBudgetEditor: () => void;
	plannedBudgetLabel: string;
	progress: number;
	remainingAmountLabel: string;
	totalTrackedSpendLabel: string;
}) {
	const { palette } = useUITheme();
	const statusColor = getBudgetStatusColor(budgetStatus, palette);

	return (
		<Animated.View entering={FadeInDown.springify().damping(20)}>
			<Card padding="lg" style={{ gap: spacing.lg }}>
				<View
					style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}
				>
					<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
						<AppText tone="secondary" variant="eyebrow">
							BUDGET STATUS
						</AppText>
						<AppText numberOfLines={1} variant="title">
							{remainingAmountLabel}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{dailySafeSpendLabel} safe daily spend
						</AppText>
						{foreignSpendLabel ? (
							<AppText numberOfLines={1} tone="secondary" variant="footnote">
								{foreignSpendLabel} tracked separately
							</AppText>
						) : null}
					</View>
					<View
						style={{
							alignItems: "center",
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							flexDirection: "row",
							gap: 6,
							paddingHorizontal: 10,
							paddingVertical: 6,
						}}
					>
						<View
							style={{
								backgroundColor: statusColor,
								borderRadius: radius.pill,
								height: 8,
								width: 8,
							}}
						/>
						<AppText bold={true} numberOfLines={1} variant="footnote">
							{budgetStatus}
						</AppText>
					</View>
				</View>

				<View style={{ gap: spacing.sm }}>
					<ProgressBar color={statusColor} progress={progress} />
					<View
						style={{ flexDirection: "row", justifyContent: "space-between" }}
					>
						<AppText tone="secondary" variant="footnote">
							{totalTrackedSpendLabel} spent
						</AppText>
						<AppText tone="secondary" variant="footnote">
							{plannedBudgetLabel} budget
						</AppText>
					</View>
				</View>

				<View
					style={{
						alignItems: "stretch",
						borderTopColor: palette.separator,
						borderTopWidth: StyleSheet.hairlineWidth,
						flexDirection: "row",
						gap: spacing.lg,
						paddingTop: spacing.md,
					}}
				>
					<BudgetSnapshotStat
						detail="Logged"
						label="Spent"
						value={totalTrackedSpendLabel}
					/>
					<BudgetSnapshotStat label="Daily" value={dailySafeSpendLabel} />
					<BudgetSnapshotStat
						align="flex-end"
						label="Budget"
						value={plannedBudgetLabel}
					/>
				</View>

				<SecondaryButton
					icon="create-outline"
					label={budgetActionLabel}
					onPress={onOpenBudgetEditor}
				/>
			</Card>
		</Animated.View>
	);
}

const formatForeignCurrencyTotals = (
	totals: Array<{ amount: number; currency: string }>
) =>
	totals
		.map(({ amount, currency }) => formatMoney(amount, currency))
		.join(" · ");

function CategoryPicker({
	onChange,
	value,
}: {
	onChange: (value: ExpenseCategory) => void;
	value: ExpenseCategory;
}) {
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
			{expenseCategories.map((category) => (
				<Chip
					key={category}
					label={formatStatus(category)}
					onPress={() => onChange(category)}
					selected={category === value}
				/>
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
		<View style={{ gap: spacing.sm }}>
			<AppText tone="secondary" variant="eyebrow">
				{label}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				<Chip
					label={emptyLabel}
					onPress={() => onChange("")}
					selected={!value}
				/>
				{options.map((option) => (
					<Chip
						key={option.id}
						label={`${option.label} · ${option.detail}`}
						onPress={() => onChange(option.id)}
						selected={value === option.id}
					/>
				))}
			</View>
		</View>
	);
}

function FormError({ message }: { message: string }) {
	return (
		<Animated.View entering={FadeIn.duration(motion.duration.normal)}>
			<AppText accessibilityRole="alert" tone="danger" variant="subhead">
				{message}
			</AppText>
		</Animated.View>
	);
}

const fieldClassName = "h-12 border-0 bg-surface px-4";

function BudgetEditorSheet({
	actionLabel,
	budgetAmount,
	budgetDraft,
	budgetErrorMessage,
	isOpen,
	isSavingBudget,
	onOpenChange,
	onSave,
	onUpdateBudgetDraft,
}: {
	actionLabel: string;
	budgetAmount?: number;
	budgetDraft: string;
	budgetErrorMessage: string | null;
	isOpen: boolean;
	isSavingBudget: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSave: () => void;
	onUpdateBudgetDraft: (value: string) => void;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="bg-background"
					backgroundStyle={{
						backgroundColor: palette.canvas,
						borderTopLeftRadius: radius.sheet,
						borderTopRightRadius: radius.sheet,
					}}
					enablePanDownToClose={true}
					snapPoints={["48%"]}
				>
					<View
						style={{
							gap: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
						}}
					>
						<View
							style={{
								alignItems: "flex-start",
								flexDirection: "row",
								gap: spacing.lg,
							}}
						>
							<View style={{ flex: 1, gap: 2 }}>
								<BottomSheet.Title>{actionLabel}</BottomSheet.Title>
								<BottomSheet.Description>
									Set the total amount you want to spend on this trip.
								</BottomSheet.Description>
							</View>
							<GlassIconButton
								accessibilityLabel="Close budget form"
								icon="close"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<SheetField label="Total budget">
							{({ onBlur, onFocus }) => (
								<Input
									className={fieldClassName}
									keyboardType="numeric"
									onBlur={onBlur}
									onChangeText={onUpdateBudgetDraft}
									onFocus={onFocus}
									placeholder={budgetAmount?.toString() ?? "25000"}
									value={budgetDraft}
									variant="secondary"
								/>
							)}
						</SheetField>
						{budgetErrorMessage ? (
							<FormError message={budgetErrorMessage} />
						) : null}
						<PrimaryButton
							disabled={isSavingBudget}
							isPending={isSavingBudget}
							label="Save budget"
							onPress={onSave}
						/>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
	const { palette } = useUITheme();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="bg-background"
					backgroundStyle={{
						backgroundColor: palette.canvas,
						borderTopLeftRadius: radius.sheet,
						borderTopRightRadius: radius.sheet,
					}}
					enablePanDownToClose={true}
					snapPoints={["86%"]}
				>
					<ScrollView
						contentContainerStyle={{
							gap: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
						}}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View
							style={{
								alignItems: "flex-start",
								flexDirection: "row",
								gap: spacing.lg,
							}}
						>
							<View style={{ flex: 1, gap: 2 }}>
								<BottomSheet.Title>
									{editingExpenseId ? "Edit expense" : "Add expense"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Log manual spend and link booking or receipt proof.
								</BottomSheet.Description>
							</View>
							<GlassIconButton
								accessibilityLabel="Close expense form"
								icon="close"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<SheetField label="Title">
							{({ onBlur, onFocus }) => (
								<Input
									className={fieldClassName}
									onBlur={onBlur}
									onChangeText={(title) => onUpdateForm({ title })}
									onFocus={onFocus}
									placeholder="Lunch, taxi, museum ticket"
									value={expenseForm.title}
									variant="secondary"
								/>
							)}
						</SheetField>
						<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
							<View style={{ flex: 1, minWidth: 0 }}>
								<SheetField label="Amount">
									{({ onBlur, onFocus }) => (
										<Input
											className={fieldClassName}
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
							<View style={{ flex: 1, minWidth: 0 }}>
								<SheetField label="Date">
									{({ onBlur, onFocus }) => (
										<Input
											className={fieldClassName}
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
						<View style={{ gap: spacing.sm }}>
							<AppText tone="secondary" variant="eyebrow">
								CATEGORY
							</AppText>
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
									className={fieldClassName}
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
							<FormError message={expenseErrorMessage} />
						) : null}
						<PrimaryButton
							disabled={isAddingExpense}
							isPending={isAddingExpense}
							label={editingExpenseId ? "Save expense" : "Add expense"}
							onPress={onSave}
						/>
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
	const { palette } = useUITheme();
	const isDeletingThis = deletingExpenseId === expense._id;

	return (
		<View
			style={{
				alignItems: "flex-start",
				flexDirection: "row",
				gap: spacing.md,
				opacity: isDeletingThis ? 0.5 : 1,
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing.md,
			}}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: 36,
					justifyContent: "center",
					width: 36,
				}}
			>
				<Ionicons color={palette.accent} name="receipt-outline" size={17} />
			</View>
			<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<View style={{ flex: 1, minWidth: 0 }}>
						<AppText bold={true} numberOfLines={1}>
							{expense.title}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{formatStatus(expense.category)} · {expense.spentAt}
						</AppText>
					</View>
					<AppText bold={true} variant="subhead">
						{formatMoney(expense.amount, expense.currency)}
					</AppText>
					<Menu>
						<Menu.Trigger asChild={true}>
							<PressableScale
								accessibilityLabel="Expense options"
								accessibilityRole="button"
								accessibilityState={{ disabled: isDeletingThis }}
								disabled={isDeletingThis}
								haptic="selection"
								hitSlop={8}
								scaleTo={0.92}
								style={{
									alignItems: "center",
									height: 32,
									justifyContent: "center",
									marginTop: -4,
									width: 32,
								}}
							>
								<Ionicons
									color={palette.inkTertiary}
									name="ellipsis-horizontal"
									size={18}
								/>
							</PressableScale>
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Overlay />
							<Menu.Content
								align="end"
								className="rounded-[20px] bg-surface p-2"
								offset={8}
								placement="bottom"
								presentation="popover"
								width={200}
							>
								<Menu.Item
									accessibilityLabel="Edit expense"
									className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
									isAnimatedStyleActive={false}
									onPress={() => onEdit(expense)}
								>
									<Ionicons
										color={palette.accent}
										name="create-outline"
										size={18}
									/>
									<Menu.ItemTitle className="font-semibold text-sm">
										Edit
									</Menu.ItemTitle>
								</Menu.Item>
								<Menu.Item
									accessibilityLabel="Delete expense"
									className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
									isAnimatedStyleActive={false}
									onPress={() => onDelete(expense._id)}
								>
									<Ionicons
										color={palette.danger}
										name="trash-outline"
										size={18}
									/>
									<Menu.ItemTitle className="font-semibold text-danger text-sm">
										Delete
									</Menu.ItemTitle>
								</Menu.Item>
							</Menu.Content>
						</Menu.Portal>
					</Menu>
				</View>
				{expense.bookingId || expense.vaultItemId ? (
					<AppText numberOfLines={1} tone="secondary" variant="footnote">
						{[
							expense.bookingId ? `Booking ${bookingLabel ?? "linked"}` : null,
							expense.vaultItemId
								? `Receipt ${receiptLabel ?? "linked"}`
								: null,
						]
							.filter(Boolean)
							.join(" · ")}
					</AppText>
				) : null}
				{expense.bookingId || receiptUrl ? (
					<View
						style={{
							flexDirection: "row",
							flexWrap: "wrap",
							gap: spacing.sm,
							paddingTop: spacing.xs,
						}}
					>
						{expense.bookingId ? (
							<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
								<PillAction icon="ticket-outline" label="Open booking" />
							</Link>
						) : null}
						{receiptUrl ? (
							<PillAction
								icon="document-attach-outline"
								label="Open receipt"
								onPress={() => onOpenReceipt(receiptUrl)}
							/>
						) : null}
					</View>
				) : null}
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
			remainingTripDays: getTripBudgetDayCount(
				budget.trip.startDate,
				budget.trip.endDate
			),
		});
	}, [budget]);

	if (!tripId) {
		return (
			<Container className="pb-28">
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
	const budgetActionLabel = budgetAmount ? "Edit budget" : "Set budget";
	const plannedBudgetLabel = budgetAmount
		? formatMoney(budgetAmount, currency)
		: "Not set";
	const foreignSpendLabel =
		summary.foreignCurrencyTotals.length > 0
			? formatForeignCurrencyTotals(summary.foreignCurrencyTotals)
			: undefined;
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
			closeBudgetEditor();
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
						budgetActionLabel={budgetActionLabel}
						budgetStatus={budgetStatus}
						dailySafeSpendLabel={formatMoney(summary.dailySafeSpend, currency)}
						foreignSpendLabel={foreignSpendLabel}
						onOpenBudgetEditor={openBudgetEditor}
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

					<View style={{ gap: spacing.sm }}>
						<AppText
							accessibilityRole="header"
							style={{ paddingHorizontal: spacing.lg }}
							tone="secondary"
							variant="eyebrow"
						>
							ALL EXPENSES
						</AppText>
						{receiptOpenErrorMessage ? (
							<FormError message={receiptOpenErrorMessage} />
						) : null}
						{budget.expenses.length === 0 ? (
							<Card padding="none">
								<EmptyState
									action={{
										label: "Add first expense",
										onPress: openNewExpenseForm,
									}}
									description="Manual expenses will appear here."
									icon="card-outline"
									title="No expenses yet"
								/>
							</Card>
						) : (
							<ListGroup>
								{budget.expenses.map((expense) => {
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
								})}
							</ListGroup>
						)}
					</View>
				</ScrollView>
				<BudgetEditorSheet
					actionLabel={budgetActionLabel}
					budgetAmount={budgetAmount}
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
