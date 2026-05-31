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
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Spinner,
	Text,
	TextArea,
	TextField,
	useToast,
} from "heroui-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
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
const readinessAccent = "#0A84FF";
const readinessTrackStyle = { backgroundColor: "rgba(10, 132, 255, 0.12)" };
const readinessRingSize = 48;
const readinessRingStroke = 4;
const readinessRingRadius = (readinessRingSize - readinessRingStroke) / 2;
const readinessRingCircumference = 2 * Math.PI * readinessRingRadius;
const readinessRingCenter = readinessRingSize / 2;

const workspaceModuleGroups = [
	{
		accentBackgroundColor: "rgba(191, 90, 242, 0.12)",
		accentColor: "#BF5AF2",
		categories: ["schedule", "transport", "weather"] as const,
		detail: "Schedule, transfers, and weather",
		icon: "calendar-outline",
		label: "Itinerary",
		route: VIYA_ROUTES.tripItinerary,
	},
	{
		accentBackgroundColor: "rgba(10, 165, 181, 0.12)",
		accentColor: "#0AA5B5",
		categories: ["budget"] as const,
		detail: "Spend, receipts, and daily pace",
		icon: "wallet-outline",
		label: "Budget",
		route: VIYA_ROUTES.tripBudget,
	},
	{
		accentBackgroundColor: "rgba(255, 159, 10, 0.12)",
		accentColor: "#FF9F0A",
		categories: ["documents", "bookings", "packing"] as const,
		detail: "Bookings, passports, tickets, and documents",
		icon: "folder-open-outline",
		label: "Vault",
		route: VIYA_ROUTES.tripVault,
	},
	{
		accentBackgroundColor: "rgba(52, 199, 89, 0.12)",
		accentColor: "#34C759",
		categories: ["safety", "group", "backupPlan"] as const,
		detail: "Safety, group coverage, and backups",
		icon: "shield-checkmark-outline",
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
				className="h-12 border border-border bg-surface px-4"
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
				className="min-h-20 rounded-[18px] border border-border bg-surface px-4 py-3"
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
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{options.map((option) => (
					<Button
						key={option}
						onPress={() => onChange(option)}
						size="sm"
						variant={value === option ? "primary" : "secondary"}
					>
						<Button.Label>
							{READINESS_CATEGORY_LABELS[option as ReadinessCategory] ??
								PRIORITY_LABELS[option as Priority] ??
								option}
						</Button.Label>
					</Button>
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
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				OWNER
			</Text>
			<View className="flex-row flex-wrap gap-2">
				<Button
					onPress={() => onChange("")}
					size="sm"
					variant={value ? "secondary" : "primary"}
				>
					<Button.Label>Unassigned</Button.Label>
				</Button>
				{companions.map((companion) => (
					<Button
						key={companion._id}
						onPress={() => onChange(companion._id)}
						size="sm"
						variant={value === companion._id ? "primary" : "secondary"}
					>
						<Button.Label>{companion.name}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

function ReadinessPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full bg-surface-secondary px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}

function ReadinessMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[45%] flex-1 gap-0.5">
			<Text color="muted" numberOfLines={1} type="body-xs">
				{label}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="semibold">
				{value}
			</Text>
		</View>
	);
}

function ReadinessProgressBar({ score }: { score: number }) {
	const clampedScore = Math.max(0, Math.min(100, score));

	return (
		<View
			className="h-2 overflow-hidden rounded-full"
			style={readinessTrackStyle}
		>
			<View
				className="h-full rounded-full"
				style={{ backgroundColor: readinessAccent, width: `${clampedScore}%` }}
			/>
		</View>
	);
}

const getReadinessTone = (progress: number, hasCoverage: boolean) => {
	if (!hasCoverage) {
		return "#A1A1AA";
	}

	if (progress >= 70) {
		return "#1CCB68";
	}

	if (progress >= 40) {
		return "#FF9F0A";
	}

	return "#FF3B30";
};

function ReadinessRing({
	hasCoverage,
	progress,
}: {
	hasCoverage: boolean;
	progress: number;
}) {
	const tone = getReadinessTone(progress, hasCoverage);
	const boundedProgress = Math.min(100, Math.max(0, Math.round(progress)));
	const dashOffset = readinessRingCircumference * (1 - boundedProgress / 100);

	return (
		<View
			className="items-center justify-center rounded-full bg-surface"
			style={{ height: readinessRingSize, width: readinessRingSize }}
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
					stroke="rgba(24, 24, 27, 0.08)"
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
				<Text style={{ color: tone, fontSize: 13 }} weight="bold">
					{boundedProgress}
				</Text>
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
	const isTravelReady = score.overallScore >= 90;
	const hasReadinessCoverage = domainItemCount > 0;

	return (
		<View className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<View className="flex-row items-start justify-between gap-4">
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						READINESS
					</Text>
					<Text.Heading type="h4" weight="semibold">
						{score.overallScore}% ready
					</Text.Heading>
					<Text color="muted" numberOfLines={2} type="body-sm">
						{score.summary}
					</Text>
				</View>
				<View className="items-end gap-2">
					<ReadinessRing
						hasCoverage={hasReadinessCoverage}
						progress={score.overallScore}
					/>
					<Button onPress={onCreateTask} size="sm" variant="secondary">
						<Ionicons color="#0A84FF" name="add-circle-outline" size={16} />
						<Button.Label>Add task</Button.Label>
					</Button>
				</View>
			</View>
			<ReadinessProgressBar score={score.overallScore} />
			<View className="flex-row flex-wrap gap-x-4 gap-y-3">
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
			{isTravelReady ? (
				<Link asChild href={VIYA_ROUTES.tripTravelMode(tripId)}>
					<Button size="sm">
						<Button.Label>Open travel mode</Button.Label>
					</Button>
				</Link>
			) : (
				<Button
					isDisabled={!highestPriorityItem}
					onPress={onFixTopGap}
					size="sm"
				>
					<Ionicons color="#FFFFFF" name="construct-outline" size={16} />
					<Button.Label>Fix highest-priority gap</Button.Label>
				</Button>
			)}
		</View>
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
	return (
		<View className="gap-3 rounded-[28px] border border-border bg-surface p-4">
			<View className="flex-row items-center gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="alert-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						NEXT GAP
					</Text>
					<Text numberOfLines={1} type="body" weight="semibold">
						{item?.title ?? "No open gap"}
					</Text>
				</View>
			</View>
			<Text.Paragraph color="muted" numberOfLines={2} type="body-sm">
				{item
					? item.description
					: "All required readiness tasks are resolved or ignored."}
			</Text.Paragraph>
			{item ? (
				<>
					<View className="flex-row flex-wrap gap-2">
						<ReadinessPill>
							{READINESS_CATEGORY_LABELS[item.category as ReadinessCategory]}
						</ReadinessPill>
						<ReadinessPill>
							{PRIORITY_LABELS[item.priority as Priority]}
						</ReadinessPill>
						<ReadinessPill>{assignedToName ?? "Unassigned"}</ReadinessPill>
					</View>
					<View className="gap-2">
						<Button onPress={onReview} size="sm">
							<Ionicons color="#FFFFFF" name="create-outline" size={16} />
							<Button.Label>Review top gap</Button.Label>
						</Button>
						<View className="flex-row flex-wrap gap-2">
							<Button
								className="min-w-[132px] flex-1"
								onPress={onMarkDone}
								size="sm"
								variant="secondary"
							>
								<Ionicons color="#0A84FF" name="checkmark-outline" size={15} />
								<Button.Label>Mark top done</Button.Label>
							</Button>
							{categoryHref ? (
								<Link asChild href={categoryHref}>
									<Button
										className="min-w-[148px] flex-1"
										size="sm"
										variant="secondary"
									>
										<Ionicons color="#0A84FF" name="open-outline" size={15} />
										<Button.Label>Open top category</Button.Label>
									</Button>
								</Link>
							) : null}
							{ownerHref ? (
								<Link asChild href={ownerHref}>
									<Button
										className="min-w-[132px] flex-1"
										size="sm"
										variant="secondary"
									>
										<Ionicons color="#0A84FF" name="people-outline" size={15} />
										<Button.Label>Open top owner</Button.Label>
									</Button>
								</Link>
							) : null}
						</View>
					</View>
				</>
			) : (
				<Button onPress={onCreateTopGap} size="sm" variant="secondary">
					<Ionicons color="#0A84FF" name="add-circle-outline" size={16} />
					<Button.Label>Add readiness task</Button.Label>
				</Button>
			)}
		</View>
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

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["82%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit"
										? "Edit checklist task"
										: "Add checklist task"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Add a concrete requirement before travel.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close readiness task form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
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
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save task" : "Add task"}
							</Button.Label>
						</Button>
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
	const { toast } = useToast();
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

	const showReadinessSuccessToast = useCallback(
		(message: string) => {
			toast.show({
				description: message,
				duration: 3600,
				label: "Readiness updated",
				variant: "success",
			});
		},
		[toast]
	);

	const showReadinessErrorToast = useCallback(
		(message: string) => {
			toast.show({
				description: message,
				duration: 4200,
				label: "Readiness needs attention",
				variant: "danger",
			});
		},
		[toast]
	);

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
				const message = "Could not prepare readiness checklist.";
				setReadinessErrorMessage(message);
				showReadinessErrorToast(message);
			});
		}
	}, [
		baselineRequestedTripId,
		ensureBaselineReadinessItems,
		readinessItems,
		showReadinessErrorToast,
		tripId,
	]);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
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
			showReadinessSuccessToast(
				editingItemId ? "Readiness task saved." : "Readiness task added."
			);
		} catch {
			const message = "Could not save readiness task.";
			setReadinessErrorMessage(message);
			showReadinessErrorToast(message);
		} finally {
			setIsSaving(false);
		}
	};
	const runReadinessAction = async (action: () => Promise<unknown>) => {
		setReadinessErrorMessage(null);
		try {
			await action();
		} catch {
			const message = "Could not update readiness task.";
			setReadinessErrorMessage(message);
			showReadinessErrorToast(message);
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
						gap: 14,
						paddingBottom: 112,
						paddingHorizontal: 16,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{readinessErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{readinessErrorMessage}
						</Text>
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

					<View className="gap-3">
						<View className="flex-row items-end justify-between gap-4">
							<View className="min-w-0 flex-1">
								<Text.Heading type="h5" weight="semibold">
									Workspace
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Open the module that owns each gap.
								</Text>
							</View>
						</View>
						<View className="flex-row flex-wrap gap-3">
							{workspaceModules.map((module) => (
								<ReadinessCategoryCard
									accentBackgroundColor={module.accentBackgroundColor}
									accentColor={module.accentColor}
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

					<View className="gap-3">
						<Text.Heading type="h5" weight="semibold">
							Checklist
						</Text.Heading>
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
