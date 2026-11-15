import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	calculateReadinessScore,
	getMissingRequiredReadinessCategories,
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
	type ReadinessItem,
	sortReadinessItemsForReview,
	type WorkStatus,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { BottomSheet, Input, Label, TextArea, TextField } from "heroui-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, {
	FadeIn,
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
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
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { PillAction } from "@/src/features/bookings/pill-action";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

import { ReadinessCategoryCard } from "./readiness-category-card";
import { ReadinessItemRow } from "./readiness-item-row";

const priorityRank: Record<Priority, number> = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
};

const toDomainReadinessItem = (item: Doc<"readinessItems">): ReadinessItem => ({
	aiReason: item.aiReason,
	assignedToMemberId: item.assignedToMemberId ?? null,
	category: item.category as ReadinessCategory,
	description: item.description,
	dueDate: item.dueDate,
	id: item._id,
	priority: item.priority as Priority,
	source: item.source as ReadinessItem["source"],
	status: item.status as WorkStatus,
	title: item.title,
	tripId: item.tripId,
});

const getHighestPriority = (items: ReadinessItem[]) =>
	items.reduce<Priority | null>((highest, item) => {
		if (item.status === "done" || item.status === "ignored") {
			return highest;
		}

		if (!highest || priorityRank[item.priority] > priorityRank[highest]) {
			return item.priority;
		}

		return highest;
	}, null);

interface ReadinessForm {
	assignedToMemberId: string;
	category: string;
	description: string;
	dueDate: string;
	priority: string;
	title: string;
}

const initialReadinessForm: ReadinessForm = {
	assignedToMemberId: "",
	category: "documents",
	description: "",
	dueDate: "",
	priority: "medium",
	title: "",
};

const readinessCategoryOptions = [
	"documents",
	"bookings",
	"packing",
	"budget",
	"schedule",
	"transport",
	"weather",
	"safety",
	"group",
	"backupPlan",
] as const;

const priorityOptions = ["low", "medium", "high", "critical"] as const;
const readinessCategories = new Set<string>(readinessCategoryOptions);
const priorities = new Set<string>(priorityOptions);

const readinessRingSize = 48;
const readinessRingStroke = 4;
const readinessRingRadius = (readinessRingSize - readinessRingStroke) / 2;
const readinessRingCircumference = 2 * Math.PI * readinessRingRadius;
const readinessRingCenter = readinessRingSize / 2;

const workspaceModuleGroups = [
	{
		categories: ["schedule", "transport", "weather"] as const,
		detail: "Schedule, transfers, and weather",
		icon: "calendar-outline" as const,
		label: "Itinerary",
		route: VIYA_ROUTES.tripItinerary,
	},
	{
		categories: ["budget"] as const,
		detail: "Spend, receipts, and daily pace",
		icon: "wallet-outline" as const,
		label: "Budget",
		route: VIYA_ROUTES.tripBudget,
	},
	{
		categories: ["documents", "bookings", "packing"] as const,
		detail: "Bookings, passports, tickets, and documents",
		icon: "folder-open-outline" as const,
		label: "Vault",
		route: VIYA_ROUTES.tripVault,
	},
	{
		categories: ["safety", "group", "backupPlan"] as const,
		detail: "Safety, group coverage, and backups",
		icon: "shield-checkmark-outline" as const,
		label: "Readiness",
		route: VIYA_ROUTES.tripReadiness,
	},
] as const;

const getReadinessCategory = (value: string): ReadinessCategory => {
	const category = value.trim();

	return readinessCategories.has(category)
		? (category as ReadinessCategory)
		: "documents";
};

const getPriority = (value: string): Priority => {
	const priority = value.trim();

	return priorities.has(priority) ? (priority as Priority) : "medium";
};

const getReadinessCategoryHref = ({
	category,
	tripId,
}: {
	category: string;
	tripId: Id<"trips">;
}): Href | null => {
	switch (category) {
		case "documents":
		case "packing":
			return VIYA_ROUTES.tripVault(tripId);
		case "bookings":
			return VIYA_ROUTES.tripBookings(tripId);
		case "budget":
			return VIYA_ROUTES.tripBudget(tripId);
		case "schedule":
		case "transport":
		case "weather":
			return VIYA_ROUTES.tripItinerary(tripId);
		case "group":
			return VIYA_ROUTES.tripCompanions(tripId);
		case "backupPlan":
		case "safety":
			return VIYA_ROUTES.tripRisks(tripId);
		default:
			return null;
	}
};

function SheetField({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				className="h-12 border-0 bg-surface px-4"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function SheetTextArea({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<TextArea
				className="min-h-20 rounded-[16px] border-0 bg-surface px-4 py-3"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function ReadinessChoiceGroup({
	label,
	onChange,
	options,
	value,
}: {
	label: string;
	onChange: (value: string) => void;
	options: readonly string[];
	value: string;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			<AppText tone="secondary" variant="eyebrow">
				{label}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{options.map((option) => (
					<Chip
						key={option}
						label={
							READINESS_CATEGORY_LABELS[option as ReadinessCategory] ??
							PRIORITY_LABELS[option as Priority] ??
							option
						}
						onPress={() => onChange(option)}
						selected={value === option}
					/>
				))}
			</View>
		</View>
	);
}

function ReadinessAssigneePicker({
	companions,
	onChange,
	value,
}: {
	companions: Doc<"tripCompanions">[];
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			<AppText tone="secondary" variant="eyebrow">
				OWNER
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				<Chip
					label="Unassigned"
					onPress={() => onChange("")}
					selected={!value}
				/>
				{companions.map((companion) => (
					<Chip
						key={companion._id}
						label={companion.name}
						onPress={() => onChange(companion._id)}
						selected={value === companion._id}
					/>
				))}
			</View>
		</View>
	);
}

function ReadinessMetric({ label, value }: { label: string; value: string }) {
	return (
		<View style={{ flexBasis: "45%", flexGrow: 1, gap: 2 }}>
			<AppText numberOfLines={1} tone="secondary" variant="footnote">
				{label}
			</AppText>
			<AppText bold={true} numberOfLines={1} variant="subhead">
				{value}
			</AppText>
		</View>
	);
}

function ReadinessProgressBar({
	color,
	score,
}: {
	color: string;
	score: number;
}) {
	const { palette } = useUITheme();
	const clampedScore = Math.max(0, Math.min(100, score));
	const width = useSharedValue(0);

	useEffect(() => {
		width.value = withSpring(clampedScore, motion.spring.selection);
	}, [clampedScore, width]);

	const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

	return (
		<View
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

const getReadinessTone = (
	progress: number,
	hasCoverage: boolean,
	palette: Palette
) => {
	if (!hasCoverage) {
		return palette.inkTertiary;
	}

	if (progress >= 70) {
		return palette.success;
	}

	if (progress >= 40) {
		return palette.warning;
	}

	return palette.danger;
};

function ReadinessRing({
	hasCoverage,
	progress,
}: {
	hasCoverage: boolean;
	progress: number;
}) {
	const { palette } = useUITheme();
	const tone = getReadinessTone(progress, hasCoverage, palette);
	const boundedProgress = Math.min(100, Math.max(0, Math.round(progress)));
	const dashOffset = readinessRingCircumference * (1 - boundedProgress / 100);

	return (
		<View
			accessibilityLabel={`${boundedProgress} percent ready`}
			style={{
				alignItems: "center",
				height: readinessRingSize,
				justifyContent: "center",
				width: readinessRingSize,
			}}
		>
			<Svg
				height={readinessRingSize}
				style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
				width={readinessRingSize}
			>
				<Circle
					cx={readinessRingCenter}
					cy={readinessRingCenter}
					fill="none"
					r={readinessRingRadius}
					stroke={palette.fill}
					strokeWidth={readinessRingStroke}
				/>
				{hasCoverage ? (
					<Circle
						cx={readinessRingCenter}
						cy={readinessRingCenter}
						fill="none"
						r={readinessRingRadius}
						stroke={tone}
						strokeDasharray={readinessRingCircumference}
						strokeDashoffset={dashOffset}
						strokeLinecap="round"
						strokeWidth={readinessRingStroke}
					/>
				) : null}
			</Svg>
			{hasCoverage && boundedProgress >= 100 ? (
				<Ionicons color={tone} name="checkmark" size={22} />
			) : null}
			{hasCoverage && boundedProgress < 100 ? (
				<AppText bold={true} style={{ color: tone }} variant="footnote">
					{boundedProgress}
				</AppText>
			) : null}
			{hasCoverage ? null : (
				<Ionicons color={tone} name="sparkles-outline" size={16} />
			)}
		</View>
	);
}

function ReadinessOverview({
	assignedOpenCount,
	completedCount,
	domainItemCount,
	highestPriorityLabel,
	highestPriorityItem,
	onCreateTask,
	onFixTopGap,
	openCount,
	score,
	tripId,
	urgentOpenCount,
	weakestCategoryLabel,
}: {
	assignedOpenCount: number;
	completedCount: number;
	domainItemCount: number;
	highestPriorityLabel: string;
	highestPriorityItem?: Doc<"readinessItems">;
	onCreateTask: () => void;
	onFixTopGap: () => void;
	openCount: number;
	score: ReturnType<typeof calculateReadinessScore>;
	tripId: Id<"trips">;
	urgentOpenCount: number;
	weakestCategoryLabel: string;
}) {
	const { palette } = useUITheme();
	const isTravelReady = score.overallScore >= 90;
	const hasReadinessCoverage = domainItemCount > 0;
	const tone = getReadinessTone(
		score.overallScore,
		hasReadinessCoverage,
		palette
	);

	return (
		<Animated.View entering={FadeInDown.springify().damping(20)}>
			<Card padding="lg" style={{ gap: spacing.lg }}>
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.lg,
					}}
				>
					<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
						<AppText tone="secondary" variant="eyebrow">
							READINESS
						</AppText>
						<AppText variant="title">{score.overallScore}% ready</AppText>
						<AppText numberOfLines={2} tone="secondary" variant="subhead">
							{score.summary}
						</AppText>
					</View>
					<ReadinessRing
						hasCoverage={hasReadinessCoverage}
						progress={score.overallScore}
					/>
				</View>
				<ReadinessProgressBar color={tone} score={score.overallScore} />
				<View
					style={{
						columnGap: spacing.lg,
						flexDirection: "row",
						flexWrap: "wrap",
						rowGap: spacing.md,
					}}
				>
					<ReadinessMetric
						label="Done"
						value={`${completedCount}/${domainItemCount}`}
					/>
					<ReadinessMetric label="Open" value={`${openCount} tasks`} />
					<ReadinessMetric label="Urgent" value={`${urgentOpenCount}`} />
					<ReadinessMetric label="Assigned" value={`${assignedOpenCount}`} />
					<ReadinessMetric label="Weakest" value={weakestCategoryLabel} />
					<ReadinessMetric label="Priority" value={highestPriorityLabel} />
				</View>
				<View style={{ gap: spacing.sm }}>
					{isTravelReady ? (
						<Link asChild href={VIYA_ROUTES.tripTravelMode(tripId)}>
							<PrimaryButton
								label="Open travel mode"
								onPress={() => undefined}
							/>
						</Link>
					) : (
						<PrimaryButton
							disabled={!highestPriorityItem}
							label="Fix highest-priority gap"
							onPress={onFixTopGap}
						/>
					)}
					<SecondaryButton
						icon="add-circle-outline"
						label="Add task"
						onPress={onCreateTask}
					/>
				</View>
			</Card>
		</Animated.View>
	);
}

function TopReadinessGapSummary({
	assignedToName,
	categoryHref,
	item,
	onCreateTopGap,
	onMarkDone,
	onReview,
	ownerHref,
}: {
	assignedToName?: string;
	categoryHref: Href | null;
	item?: Doc<"readinessItems">;
	onCreateTopGap: () => void;
	onMarkDone: () => void;
	onReview: () => void;
	ownerHref: Href | null;
}) {
	const { palette } = useUITheme();

	return (
		<Card padding="lg" style={{ gap: spacing.md }}>
			<View
				style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}
			>
				<Ionicons
					color={palette.accent}
					name="alert-circle-outline"
					size={22}
				/>
				<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
					<AppText tone="secondary" variant="eyebrow">
						NEXT GAP
					</AppText>
					<AppText numberOfLines={1} variant="headline">
						{item?.title ?? "No open gap"}
					</AppText>
				</View>
			</View>
			<AppText numberOfLines={2} tone="secondary" variant="subhead">
				{item
					? item.description
					: "All required readiness tasks are resolved or ignored."}
			</AppText>
			{item ? (
				<>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						<Chip
							label={
								READINESS_CATEGORY_LABELS[item.category as ReadinessCategory]
							}
						/>
						<Chip label={PRIORITY_LABELS[item.priority as Priority]} />
						<Chip label={assignedToName ?? "Unassigned"} />
					</View>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						<PillAction
							icon="create-outline"
							label="Review top gap"
							onPress={onReview}
							tone="primary"
						/>
						<PillAction
							icon="checkmark-outline"
							label="Mark top done"
							onPress={onMarkDone}
						/>
						{categoryHref ? (
							<Link asChild href={categoryHref}>
								<PillAction icon="open-outline" label="Open top category" />
							</Link>
						) : null}
						{ownerHref ? (
							<Link asChild href={ownerHref}>
								<PillAction icon="people-outline" label="Open top owner" />
							</Link>
						) : null}
					</View>
				</>
			) : (
				<View style={{ alignItems: "flex-start" }}>
					<PillAction
						icon="add-circle-outline"
						label="Add readiness task"
						onPress={onCreateTopGap}
					/>
				</View>
			)}
		</Card>
	);
}

function ReadinessTaskSheet({
	companions,
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	companions: Doc<"tripCompanions">[];
	errorMessage: string | null;
	form: ReadinessForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof ReadinessForm, value: string) => void;
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
					snapPoints={["82%"]}
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
								<BottomSheet.Title>
									{mode === "edit"
										? "Edit checklist task"
										: "Add checklist task"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Add a concrete requirement before travel.
								</BottomSheet.Description>
							</View>
							<GlassIconButton
								accessibilityLabel="Close readiness task form"
								icon="close"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<ScrollView
							contentContainerStyle={{
								gap: spacing.lg,
								paddingBottom: spacing.sm,
							}}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 480 }}
						>
							<SheetField
								label="Task"
								onChangeText={(value) => onUpdateForm("title", value)}
								placeholder="Upload passport copy"
								value={form.title}
							/>
							<ReadinessChoiceGroup
								label="Category"
								onChange={(value) => onUpdateForm("category", value)}
								options={readinessCategoryOptions}
								value={form.category}
							/>
							<ReadinessChoiceGroup
								label="Priority"
								onChange={(value) => onUpdateForm("priority", value)}
								options={priorityOptions}
								value={form.priority}
							/>
							<ReadinessAssigneePicker
								companions={companions}
								onChange={(value) => onUpdateForm("assignedToMemberId", value)}
								value={form.assignedToMemberId}
							/>
							<SheetField
								label="Due date"
								onChangeText={(value) => onUpdateForm("dueDate", value)}
								placeholder="2026-06-01"
								value={form.dueDate}
							/>
							<SheetTextArea
								label="Details"
								onChangeText={(value) => onUpdateForm("description", value)}
								placeholder="What needs to be true for this to be done?"
								value={form.description}
							/>
						</ScrollView>
						{errorMessage ? (
							<Animated.View entering={FadeIn}>
								<AppText
									accessibilityRole="alert"
									tone="danger"
									variant="subhead"
								>
									{errorMessage}
								</AppText>
							</Animated.View>
						) : null}
						<PrimaryButton
							disabled={isSaving}
							isPending={isSaving}
							label={mode === "edit" ? "Save task" : "Add task"}
							onPress={onSubmit}
						/>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function ReadinessScreen() {
	const tripId = useTripIdParam();
	const readinessItems = useQuery(
		api.readiness.listReadinessItems,
		tripId ? { tripId } : "skip"
	);
	const companions = useQuery(
		api.companions.listTripCompanions,
		tripId ? { tripId } : "skip"
	);
	const ensureBaselineReadinessItems = useMutation(
		api.readiness.ensureBaselineReadinessItems
	);
	const createReadinessItem = useMutation(api.readiness.createReadinessItem);
	const deleteReadinessItem = useMutation(api.readiness.deleteReadinessItem);
	const updateReadinessItem = useMutation(api.readiness.updateReadinessItem);
	const updateReadinessItemDetails = useMutation(
		api.readiness.updateReadinessItemDetails
	);
	const [form, setForm] = useState<ReadinessForm>(initialReadinessForm);
	const [editingItemId, setEditingItemId] =
		useState<Id<"readinessItems"> | null>(null);
	const [baselineRequestedTripId, setBaselineRequestedTripId] =
		useState<Id<"trips"> | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [readinessErrorMessage, setReadinessErrorMessage] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (!(tripId && readinessItems)) {
			return;
		}

		const missingCategories = getMissingRequiredReadinessCategories(
			readinessItems.map(toDomainReadinessItem)
		);

		if (missingCategories.length > 0 && baselineRequestedTripId !== tripId) {
			setBaselineRequestedTripId(tripId);
			ensureBaselineReadinessItems({ tripId }).catch(() => {
				setReadinessErrorMessage("Could not prepare readiness checklist.");
			});
		}
	}, [
		baselineRequestedTripId,
		ensureBaselineReadinessItems,
		readinessItems,
		tripId,
	]);

	if (!tripId) {
		return (
			<Container className="pb-28">
				<EmptyState
					description="Open a saved trip before checking readiness."
					icon="shield-checkmark-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (readinessItems === undefined || companions === undefined) {
		return <ScreenLoadingState />;
	}

	const updateForm = (key: keyof ReadinessForm, value: string) => {
		setReadinessErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setReadinessErrorMessage(null);
		setEditingItemId(null);
		setForm(initialReadinessForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (item: Doc<"readinessItems">) => {
		setReadinessErrorMessage(null);
		setEditingItemId(item._id);
		setForm({
			assignedToMemberId: item.assignedToMemberId ?? "",
			category: item.category,
			description: item.description,
			dueDate: item.dueDate,
			priority: item.priority,
			title: item.title,
		});
		setIsSheetOpen(true);
	};
	const handleSaveTask = async () => {
		if (!tripId) {
			return;
		}

		const title = form.title.trim();
		if (!title) {
			setReadinessErrorMessage("Add a task title.");
			return;
		}

		setReadinessErrorMessage(null);
		setIsSaving(true);
		try {
			const taskPatch = {
				category: getReadinessCategory(form.category),
				description: form.description.trim() || title,
				dueDate: form.dueDate.trim(),
				priority: getPriority(form.priority),
				title,
			};
			const assignedToMemberId = form.assignedToMemberId.trim() || undefined;

			if (editingItemId) {
				await updateReadinessItemDetails({
					...taskPatch,
					assignedToMemberId,
					readinessItemId: editingItemId,
				});
			} else {
				await createReadinessItem({
					...taskPatch,
					assignedToMemberId,
					tripId,
				});
			}
			setForm(initialReadinessForm);
			setEditingItemId(null);
			setIsSheetOpen(false);
		} catch {
			setReadinessErrorMessage("Could not save readiness task.");
		} finally {
			setIsSaving(false);
		}
	};
	const runReadinessAction = async (action: () => Promise<unknown>) => {
		setReadinessErrorMessage(null);
		try {
			await action();
		} catch {
			setReadinessErrorMessage("Could not update readiness task.");
		}
	};
	const sortedReadinessItems = sortReadinessItemsForReview(readinessItems);
	const domainItems = sortedReadinessItems.map(toDomainReadinessItem);
	const score = calculateReadinessScore(domainItems);
	const categories = Object.entries(score.categoryScores) as [
		ReadinessCategory,
		number,
	][];
	const openItems = sortReadinessItemsForReview(
		domainItems.filter(
			(item) => item.status !== "done" && item.status !== "ignored"
		)
	);
	const highestPriorityItem = sortedReadinessItems.find(
		(item) => item._id === openItems[0]?.id
	);
	const urgentOpenCount = openItems.filter(
		(item) => item.priority === "critical" || item.priority === "high"
	).length;
	const completedCount = domainItems.filter(
		(item) => item.status === "done"
	).length;
	const companionById = new Map<string, string>(
		companions.map((companion) => [companion._id, companion.name])
	);
	const assignedOpenCount = openItems.filter(
		(item) => item.assignedToMemberId
	).length;
	const getAssignedToName = (memberId?: string) =>
		memberId ? companionById.get(memberId) : undefined;
	const weakestCategory =
		[...categories].sort((left, right) => left[1] - right[1]).at(0) ?? null;
	const weakestCategoryLabel = weakestCategory
		? READINESS_CATEGORY_LABELS[weakestCategory[0]]
		: "No category";
	const highestPriorityDomainItem = openItems[0] ?? null;
	const highestPriorityCategoryHref = highestPriorityItem
		? getReadinessCategoryHref({
				category: highestPriorityItem.category,
				tripId,
			})
		: null;
	const highestPriorityOwnerHref = highestPriorityItem?.assignedToMemberId
		? VIYA_ROUTES.tripCompanions(tripId)
		: null;
	const highestPriorityAssignedName = getAssignedToName(
		highestPriorityItem?.assignedToMemberId
	);
	const workspaceModules = workspaceModuleGroups.map((module) => {
		const moduleCategories = new Set<ReadinessCategory>(module.categories);
		const moduleItems = domainItems.filter((item) =>
			moduleCategories.has(item.category)
		);
		const moduleOpenItems = moduleItems.filter(
			(item) => item.status !== "done" && item.status !== "ignored"
		);
		const moduleScore = Math.round(
			module.categories.reduce(
				(total, category) => total + score.categoryScores[category],
				0
			) / module.categories.length
		);

		return {
			...module,
			categoryHref: module.route(tripId),
			highestPriority: getHighestPriority(moduleItems),
			openCount: moduleOpenItems.length,
			score: moduleScore,
		};
	});

	return (
		<TripModuleScreenFrame
			activeTab="checklist"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add readiness task"
					icon="add"
					onPress={openCreateSheet}
				/>
			}
			tripId={tripId}
		>
			<Container includeBottomInset={false} isScrollable={false}>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						gap: spacing.section,
						paddingBottom: 112,
						paddingHorizontal: spacing.screen,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{readinessErrorMessage ? (
						<Animated.View entering={FadeIn}>
							<AppText
								accessibilityRole="alert"
								tone="danger"
								variant="subhead"
							>
								{readinessErrorMessage}
							</AppText>
						</Animated.View>
					) : null}

					<ReadinessOverview
						assignedOpenCount={assignedOpenCount}
						completedCount={completedCount}
						domainItemCount={domainItems.length}
						highestPriorityItem={highestPriorityItem}
						highestPriorityLabel={
							highestPriorityDomainItem
								? PRIORITY_LABELS[highestPriorityDomainItem.priority]
								: "Clear"
						}
						onCreateTask={openCreateSheet}
						onFixTopGap={() => {
							if (highestPriorityItem) {
								openEditSheet(highestPriorityItem);
							}
						}}
						openCount={openItems.length}
						score={score}
						tripId={tripId}
						urgentOpenCount={urgentOpenCount}
						weakestCategoryLabel={weakestCategoryLabel}
					/>

					<TopReadinessGapSummary
						assignedToName={highestPriorityAssignedName}
						categoryHref={highestPriorityCategoryHref}
						item={highestPriorityItem}
						onCreateTopGap={openCreateSheet}
						onMarkDone={() => {
							if (highestPriorityItem) {
								runReadinessAction(() =>
									updateReadinessItem({
										readinessItemId: highestPriorityItem._id,
										status: "done",
									})
								).catch(() => undefined);
							}
						}}
						onReview={() => {
							if (highestPriorityItem) {
								openEditSheet(highestPriorityItem);
							}
						}}
						ownerHref={highestPriorityOwnerHref}
					/>

					<View style={{ gap: spacing.md }}>
						<View style={{ gap: 2, paddingHorizontal: spacing.xs }}>
							<AppText accessibilityRole="header" variant="heading">
								Workspace
							</AppText>
							<AppText tone="secondary" variant="subhead">
								Open the module that owns each gap.
							</AppText>
						</View>
						<View
							style={{
								flexDirection: "row",
								flexWrap: "wrap",
								gap: spacing.md,
							}}
						>
							{workspaceModules.map((module) => (
								<ReadinessCategoryCard
									categoryHref={module.categoryHref}
									detail={module.detail}
									highestPriority={module.highestPriority}
									icon={module.icon}
									key={module.label}
									label={module.label}
									openCount={module.openCount}
									score={module.score}
								/>
							))}
						</View>
					</View>

					<View style={{ gap: spacing.md }}>
						<AppText
							accessibilityRole="header"
							style={{ paddingHorizontal: spacing.xs }}
							variant="heading"
						>
							Checklist
						</AppText>
						{sortedReadinessItems.length === 0 ? (
							<Card padding="none">
								<EmptyState
									action={{
										label: "Add readiness task",
										onPress: openCreateSheet,
									}}
									description="Add a concrete requirement to start tracking travel readiness."
									icon="checkbox-outline"
									title="No checklist tasks"
								/>
							</Card>
						) : (
							<ListGroup>
								{sortedReadinessItems.map((item) => (
									<ReadinessItemRow
										assignedToName={getAssignedToName(item.assignedToMemberId)}
										categoryHref={getReadinessCategoryHref({
											category: item.category,
											tripId,
										})}
										item={item}
										key={item._id}
										onDelete={(readinessItemId) => {
											runReadinessAction(() =>
												deleteReadinessItem({ readinessItemId })
											).catch(() => undefined);
										}}
										onEdit={openEditSheet}
										onStatusChange={(readinessItemId, status) => {
											runReadinessAction(() =>
												updateReadinessItem({ readinessItemId, status })
											).catch(() => undefined);
										}}
										ownerHref={
											item.assignedToMemberId
												? VIYA_ROUTES.tripCompanions(tripId)
												: null
										}
									/>
								))}
							</ListGroup>
						)}
					</View>
				</ScrollView>
				<ReadinessTaskSheet
					companions={companions}
					errorMessage={readinessErrorMessage}
					form={form}
					isOpen={isSheetOpen}
					isSaving={isSaving}
					mode={editingItemId ? "edit" : "create"}
					onOpenChange={(isOpen) => {
						setIsSheetOpen(isOpen);
						if (!isOpen) {
							setEditingItemId(null);
							setReadinessErrorMessage(null);
							setForm(initialReadinessForm);
						}
					}}
					onSubmit={handleSaveTask}
					onUpdateForm={updateForm}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}
