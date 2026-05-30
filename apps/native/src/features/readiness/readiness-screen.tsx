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
} from "heroui-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import { TripModuleManualEntryCard } from "@/src/features/trips/trip-module-manual-entry-card";
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
		<View className="rounded-full border border-border bg-white px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}

function ReadinessMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[47%] flex-1 gap-0.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="bold">
				{value}
			</Text>
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
		<View className="gap-3 rounded-[24px] bg-surface p-4">
			<View className="flex-row items-center gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="alert-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						TOP GAP
					</Text>
					<Text numberOfLines={1} type="body-sm" weight="bold">
						{item?.title ?? "No open gap"}
					</Text>
				</View>
			</View>
			<Text.Paragraph color="muted" type="body-sm">
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
					<View className="flex-row flex-wrap gap-2">
						<Button className="flex-1" onPress={onReview} size="sm">
							<Ionicons color="#FFFFFF" name="create-outline" size={16} />
							<Button.Label>Review top gap</Button.Label>
						</Button>
						{categoryHref ? (
							<Link asChild href={categoryHref}>
								<Button className="flex-1" size="sm" variant="secondary">
									<Ionicons color="#0A84FF" name="open-outline" size={15} />
									<Button.Label>Open top category</Button.Label>
								</Button>
							</Link>
						) : null}
						{ownerHref ? (
							<Link asChild href={ownerHref}>
								<Button className="flex-1" size="sm" variant="secondary">
									<Ionicons color="#0A84FF" name="people-outline" size={15} />
									<Button.Label>Open top owner</Button.Label>
								</Button>
							</Link>
						) : null}
						<Button
							className="flex-1"
							onPress={onMarkDone}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Mark top done</Button.Label>
						</Button>
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
						gap: 16,
						paddingBottom: 112,
						paddingHorizontal: 16,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<TripModuleManualEntryCard
						description="Add and resolve concrete prep tasks for documents, bookings, packing, budget, safety, and backup plans."
						moduleLabel="readiness"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="checkbox-outline"
						primaryActionLabel="Add task"
					/>
					{readinessErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{readinessErrorMessage}
						</Text>
					) : null}

					<View className="gap-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Prep control
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Resolve blockers before switching into Travel Mode.
								</Text>
							</View>
							<View className="h-11 w-11 items-center justify-center rounded-full bg-surface-secondary">
								<Ionicons
									color="#0A84FF"
									name="shield-checkmark-outline"
									size={20}
								/>
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<ReadinessPill>Check</ReadinessPill>
							<ReadinessPill>{openItems.length} open</ReadinessPill>
							<ReadinessPill>{urgentOpenCount} urgent</ReadinessPill>
							<ReadinessPill>{assignedOpenCount} assigned</ReadinessPill>
						</View>
						<View className="flex-row items-end justify-between gap-4">
							<View className="flex-1 gap-1">
								<Text color="muted" type="body-xs" weight="semibold">
									READINESS SCORE
								</Text>
								<Text.Paragraph color="muted" type="body-sm">
									{score.summary}
								</Text.Paragraph>
							</View>
							<Text.Heading className="text-5xl" type="h1" weight="semibold">
								{score.overallScore}
							</Text.Heading>
						</View>
						<View className="flex-row flex-wrap gap-3">
							<ReadinessMetric
								label="Done"
								value={`${completedCount}/${domainItems.length}`}
							/>
							<ReadinessMetric label="Weakest" value={weakestCategoryLabel} />
							<ReadinessMetric
								label="Priority"
								value={
									highestPriorityDomainItem
										? PRIORITY_LABELS[highestPriorityDomainItem.priority]
										: "Clear"
								}
							/>
							<ReadinessMetric
								label="Assigned"
								value={`${assignedOpenCount}/${openItems.length} open`}
							/>
						</View>
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
						{score.overallScore >= 90 ? (
							<Link asChild href={VIYA_ROUTES.tripTravelMode(tripId)}>
								<Button>
									<Button.Label>Open travel mode</Button.Label>
								</Button>
							</Link>
						) : (
							<Button
								isDisabled={!highestPriorityItem}
								onPress={() => {
									if (highestPriorityItem) {
										openEditSheet(highestPriorityItem);
									}
								}}
								variant="secondary"
							>
								<Button.Label>Fix highest-priority gap</Button.Label>
							</Button>
						)}
					</View>

					<View className="flex-row flex-wrap gap-3">
						{categories.map(([category, categoryScore]) => {
							const categoryItems = domainItems.filter(
								(item) => item.category === category
							);
							const categoryOpenItems = categoryItems.filter(
								(item) => item.status !== "done" && item.status !== "ignored"
							);

							return (
								<ReadinessCategoryCard
									category={category}
									categoryHref={getReadinessCategoryHref({
										category,
										tripId,
									})}
									highestPriority={getHighestPriority(categoryItems)}
									key={category}
									openCount={categoryOpenItems.length}
									score={categoryScore}
								/>
							);
						})}
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
