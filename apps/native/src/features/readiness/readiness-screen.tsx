import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	calculateReadinessScore,
	getMissingRequiredReadinessCategories,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
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
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleViyaAssistCard } from "@/src/features/trips/trip-module-viya-assist-card";
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
	category: string;
	description: string;
	dueDate: string;
	priority: string;
	title: string;
}

const initialReadinessForm: ReadinessForm = {
	category: "documents",
	description: "",
	dueDate: "",
	priority: "medium",
	title: "",
};

const readinessCategories = new Set<string>([
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
]);

const priorities = new Set<string>(["low", "medium", "high", "critical"]);

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

function ReadinessPill({ children }: { children: ReactNode }) {
	return (
		<View className="rounded-full bg-surface-secondary px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}

function ReadinessTaskSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
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
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Category"
										onChangeText={(value) => onUpdateForm("category", value)}
										placeholder="documents"
										value={form.category}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Priority"
										onChangeText={(value) => onUpdateForm("priority", value)}
										placeholder="medium"
										value={form.priority}
									/>
								</View>
							</View>
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

	useEffect(() => {
		if (!(tripId && readinessItems)) {
			return;
		}

		const missingCategories = getMissingRequiredReadinessCategories(
			readinessItems.map(toDomainReadinessItem)
		);

		if (missingCategories.length > 0 && baselineRequestedTripId !== tripId) {
			setBaselineRequestedTripId(tripId);
			ensureBaselineReadinessItems({ tripId }).catch(() => undefined);
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

	if (readinessItems === undefined) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const updateForm = (key: keyof ReadinessForm, value: string) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingItemId(null);
		setForm(initialReadinessForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (item: Doc<"readinessItems">) => {
		setEditingItemId(item._id);
		setForm({
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
			return;
		}

		setIsSaving(true);
		try {
			const taskPatch = {
				category: getReadinessCategory(form.category),
				description: form.description.trim() || title,
				dueDate: form.dueDate.trim(),
				priority: getPriority(form.priority),
				title,
			};

			if (editingItemId) {
				await updateReadinessItemDetails({
					...taskPatch,
					readinessItemId: editingItemId,
				});
			} else {
				await createReadinessItem({
					...taskPatch,
					tripId,
				});
			}
			setForm(initialReadinessForm);
			setEditingItemId(null);
			setIsSheetOpen(false);
		} finally {
			setIsSaving(false);
		}
	};
	const domainItems = readinessItems.map(toDomainReadinessItem);
	const score = calculateReadinessScore(domainItems);
	const categories = Object.entries(score.categoryScores) as [
		ReadinessCategory,
		number,
	][];
	const openItems = domainItems
		.filter((item) => item.status !== "done" && item.status !== "ignored")
		.sort(
			(left, right) =>
				priorityRank[right.priority] - priorityRank[left.priority]
		);

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Check"
					icon="shield-checkmark-outline"
					subtitle="Resolve booking, document, budget, packing, schedule, safety, and backup gaps before travel."
					title="Readiness"
				/>
				<TripModuleViyaAssistCard
					action="audit"
					agentModule="readiness"
					description="Audit missing prep, generate checklist fixes, or ask what to close first."
					moduleLabel="readiness"
					tripId={tripId}
				/>

				<Surface className="gap-4 rounded-[34px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<ReadinessPill>Check</ReadinessPill>
						<ReadinessPill>{openItems.length} open</ReadinessPill>
					</View>
					<View className="flex-row items-end justify-between gap-4">
						<View className="flex-1 gap-1">
							<Text.Heading type="h3" weight="semibold">
								Readiness
							</Text.Heading>
							<Text.Paragraph color="muted" type="body-sm">
								{score.summary}
							</Text.Paragraph>
						</View>
						<Text.Heading className="text-5xl" type="h1" weight="semibold">
							{score.overallScore}
						</Text.Heading>
					</View>
					{score.overallScore >= 90 ? (
						<Link asChild href={VIYA_ROUTES.tripTravelMode(tripId)}>
							<Button>
								<Button.Label>Open travel mode</Button.Label>
							</Button>
						</Link>
					) : (
						<Button variant="secondary">
							<Button.Label>Fix highest-priority gap</Button.Label>
						</Button>
					)}
					<Button onPress={openCreateSheet}>
						<Button.Label>Add task</Button.Label>
					</Button>
				</Surface>

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
					{readinessItems.map((item) => (
						<ReadinessItemRow
							item={item}
							key={item._id}
							onDelete={(readinessItemId) => {
								deleteReadinessItem({ readinessItemId }).catch(() => undefined);
							}}
							onEdit={openEditSheet}
							onStatusChange={(readinessItemId, status) => {
								updateReadinessItem({ readinessItemId, status }).catch(
									() => undefined
								);
							}}
						/>
					))}
				</View>
			</View>
			<ReadinessTaskSheet
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingItemId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsSheetOpen(isOpen);
					if (!isOpen) {
						setEditingItemId(null);
						setForm(initialReadinessForm);
					}
				}}
				onSubmit={handleSaveTask}
				onUpdateForm={updateForm}
			/>
		</Container>
	);
}
