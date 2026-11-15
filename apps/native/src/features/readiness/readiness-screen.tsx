import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getMissingRequiredReadinessCategories,
	getReadinessProgress,
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
	type RiskSeverity,
	type RiskType,
	sortReadinessItemsForReview,
	sortTripRisksForReview,
	toReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link, useLocalSearchParams } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
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
	ScreenShell,
	SecondaryButton,
	Segmented,
	spacing,
	useFeedback,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	LinkRow,
	RecordSheet,
	StatusLabel,
	SwipeRow,
} from "@/src/features/bookings/module-kit";
import {
	getCompactRelatedLabel,
	getRelatedEntityKey,
	getRelatedEntityMutationFields,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
	getTripRelatedEntityOptions,
} from "@/src/features/trips/trip-related-entities";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import { formatDay, formatEnumLabel, toLocalDateKey } from "@/src/lib/format";

import { getTaskSubtitle, ReadinessTaskRow } from "./readiness-item-row";

type Segment = "done" | "heads-up" | "todo";
type SheetKind = "risk" | "task";

const segmentOptions = [
	{ label: "To do", value: "todo" },
	{ label: "Risks", value: "heads-up" },
	{ label: "Done", value: "done" },
] as const;

const sheetKindOptions = [
	{ label: "Task", value: "task" },
	{ label: "Risk", value: "risk" },
] as const;

interface TaskForm {
	assignedToMemberId: string;
	category: string;
	description: string;
	dueDate: string;
	priority: string;
	title: string;
}

interface RiskForm {
	message: string;
	relatedEntityKey: string;
	severity: string;
	suggestedAction: string;
	title: string;
	type: string;
}

const initialTaskForm: TaskForm = {
	assignedToMemberId: "",
	category: "documents",
	description: "",
	dueDate: "",
	priority: "medium",
	title: "",
};

const initialRiskForm: RiskForm = {
	message: "",
	relatedEntityKey: "",
	severity: "medium",
	suggestedAction: "",
	title: "",
	type: "unknown",
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
const riskTypeOptions = [
	"weather",
	"schedule",
	"booking",
	"budget",
	"transport",
	"safety",
	"group",
	"document",
	"fatigue",
	"unknown",
] as const;

const readinessCategories = new Set<string>(readinessCategoryOptions);
const priorities = new Set<string>(priorityOptions);
const riskTypes = new Set<string>(riskTypeOptions);

const getReadinessCategory = (value: string): ReadinessCategory =>
	readinessCategories.has(value.trim())
		? (value.trim() as ReadinessCategory)
		: "documents";

const getPriority = (value: string): Priority =>
	priorities.has(value.trim()) ? (value.trim() as Priority) : "medium";

const getRiskSeverity = (value: string): RiskSeverity =>
	priorities.has(value.trim()) ? (value.trim() as RiskSeverity) : "medium";

const getRiskType = (value: string): RiskType =>
	riskTypes.has(value.trim()) ? (value.trim() as RiskType) : "unknown";

const getRiskRelatedHref = ({
	relatedEntityType,
	tripId,
}: {
	relatedEntityType?: string;
	tripId: Id<"trips">;
}): Href | null => {
	switch (relatedEntityType) {
		case "booking":
			return VIYA_ROUTES.tripBookings(tripId);
		case "companion":
			return VIYA_ROUTES.tripCompanions(tripId);
		case "expense":
			return VIYA_ROUTES.tripBudget(tripId);
		case "itineraryDay":
		case "itineraryItem":
			return VIYA_ROUTES.tripItinerary(tripId);
		case "moment":
			return VIYA_ROUTES.tripMoments(tripId);
		case "readinessItem":
			return VIYA_ROUTES.tripReadiness(tripId);
		case "risk":
			return VIYA_ROUTES.tripReadiness(tripId);
		case "savedPlace":
			return VIYA_ROUTES.tripPlaces(tripId);
		case "travelDocument":
		case "vaultItem":
			return VIYA_ROUTES.tripVault(tripId);
		case "tripNote":
			return VIYA_ROUTES.tripNotes(tripId);
		default:
			return null;
	}
};

const getReadinessCategoryHref = ({
	category,
	tripId,
}: {
	category: string;
	tripId: Id<"trips">;
}): { href: Href; label: string } | null => {
	switch (category) {
		case "documents":
			return { href: VIYA_ROUTES.tripVault(tripId), label: "Open Vault" };
		case "bookings":
			return {
				href: VIYA_ROUTES.tripBookings(tripId),
				label: "Open bookings",
			};
		case "budget":
			return { href: VIYA_ROUTES.tripBudget(tripId), label: "Open budget" };
		case "schedule":
		case "transport":
		case "weather":
			return {
				href: VIYA_ROUTES.tripItinerary(tripId),
				label: "Open itinerary",
			};
		case "group":
			return {
				href: VIYA_ROUTES.tripCompanions(tripId),
				label: "Open travelers",
			};
		default:
			return null;
	}
};

const getReadinessHeader = (
	progress: ReturnType<typeof getReadinessProgress>
) => {
	if (progress.percent === null || progress.active === 0) {
		return {
			headerLine: "Add what you need to do before the trip.",
			headerTitle: "No tasks yet",
		};
	}

	return {
		headerLine: [
			`${progress.done} of ${progress.active} done`,
			progress.highOpen ? `${progress.highOpen} high priority` : null,
			progress.overdue ? `${progress.overdue} overdue` : null,
		]
			.filter(Boolean)
			.join(" · "),
		headerTitle: `${progress.percent}% ready`,
	};
};

const isOpenItem = (item: { status: string }) =>
	item.status !== "done" && item.status !== "ignored";

const getSeverityPresentation = (severity: string) =>
	severity === "critical" || severity === "high"
		? ({ icon: "alert-circle-outline", tone: "danger" } as const)
		: ({ icon: "warning-outline", tone: "warning" } as const);

function TaskFields({
	companions,
	form,
	onUpdate,
}: {
	companions: Doc<"tripCompanions">[];
	form: TaskForm;
	onUpdate: (key: keyof TaskForm, value: string) => void;
}) {
	const names = new Map<string, string>(
		companions.map((companion) => [companion._id, companion.name])
	);

	return (
		<FieldGroup>
			<FieldRow
				label="Task"
				onChangeText={(value) => onUpdate("title", value)}
				placeholder="Upload passport copy"
				value={form.title}
			/>
			<ChoiceRow
				format={(value) =>
					READINESS_CATEGORY_LABELS[value as ReadinessCategory] ?? value
				}
				label="Category"
				onChange={(value) => onUpdate("category", value)}
				options={readinessCategoryOptions}
				value={form.category}
			/>
			<ChoiceRow
				format={(value) => PRIORITY_LABELS[value as Priority] ?? value}
				label="Priority"
				onChange={(value) => onUpdate("priority", value)}
				options={priorityOptions}
				value={form.priority}
			/>
			{companions.length > 0 ? (
				<ChoiceRow
					format={(id) => (id === "" ? "Unassigned" : (names.get(id) ?? id))}
					label="Owner"
					onChange={(value) => onUpdate("assignedToMemberId", value)}
					options={["", ...companions.map((companion) => companion._id)]}
					value={form.assignedToMemberId}
				/>
			) : null}
			<DatePickerField
				formatDate={(date) => formatDay(formatIsoDate(date))}
				label="Due date"
				onChangeText={(value) => onUpdate("dueDate", value)}
				value={form.dueDate}
			/>
			<FieldRow
				label="Details"
				multiline={true}
				onChangeText={(value) => onUpdate("description", value)}
				placeholder="What needs to be true for this to be done?"
				value={form.description}
			/>
		</FieldGroup>
	);
}

function RiskFields({
	form,
	onUpdate,
	relatedOptions,
}: {
	form: RiskForm;
	onUpdate: (key: keyof RiskForm, value: string) => void;
	relatedOptions: { key: string; label: string }[];
}) {
	const labels = new Map(
		relatedOptions.map((option) => [option.key, option.label])
	);

	return (
		<FieldGroup>
			<FieldRow
				label="Title"
				onChangeText={(value) => onUpdate("title", value)}
				placeholder="Tight transfer window"
				value={form.title}
			/>
			<ChoiceRow
				format={formatEnumLabel}
				label="Type"
				onChange={(value) => onUpdate("type", value)}
				options={riskTypeOptions}
				value={form.type}
			/>
			<ChoiceRow
				format={(value) => PRIORITY_LABELS[value as Priority] ?? value}
				label="Severity"
				onChange={(value) => onUpdate("severity", value)}
				options={priorityOptions}
				value={form.severity}
			/>
			{relatedOptions.length > 0 ? (
				<ChoiceRow
					format={(key) =>
						key === "" ? "None" : getCompactRelatedLabel(labels.get(key) ?? key)
					}
					label="Linked to"
					onChange={(value) => onUpdate("relatedEntityKey", value)}
					options={[
						"",
						...relatedOptions.slice(0, 12).map((option) => option.key),
					]}
					value={form.relatedEntityKey}
				/>
			) : null}
			<FieldRow
				label="What could go wrong"
				multiline={true}
				onChangeText={(value) => onUpdate("message", value)}
				placeholder="Describe the risk"
				value={form.message}
			/>
			<FieldRow
				label="What to do"
				multiline={true}
				onChangeText={(value) => onUpdate("suggestedAction", value)}
				placeholder="Backup plan"
				value={form.suggestedAction}
			/>
		</FieldGroup>
	);
}

interface ReadinessSheetProps {
	companions: Doc<"tripCompanions">[];
	editingRisk: Doc<"risks"> | null;
	editingTask: Doc<"readinessItems"> | null;
	initialKind: SheetKind;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	relatedOptions: { key: string; label: string }[];
	tripId: Id<"trips">;
}

const getTaskFormFor = (item: Doc<"readinessItems"> | null): TaskForm =>
	item
		? {
				assignedToMemberId: item.assignedToMemberId ?? "",
				category: item.category,
				description: item.description,
				dueDate: item.dueDate,
				priority: item.priority,
				title: item.title,
			}
		: initialTaskForm;

const getRiskFormFor = (risk: Doc<"risks"> | null): RiskForm =>
	risk
		? {
				message: risk.message,
				relatedEntityKey: getRelatedEntityKey({
					id: risk.relatedEntityId,
					type: risk.relatedEntityType,
				}),
				severity: risk.severity,
				suggestedAction: risk.suggestedAction,
				title: risk.title,
				type: risk.type,
			}
		: initialRiskForm;

/**Add or edit a task or risk. Remounted per open so forms start fresh. */
function ReadinessSheet({
	companions,
	editingRisk,
	editingTask,
	initialKind,
	isOpen,
	onClose,
	onDelete,
	relatedOptions,
	tripId,
}: ReadinessSheetProps) {
	const createReadinessItem = useMutation(api.readiness.createReadinessItem);
	const updateReadinessItemDetails = useMutation(
		api.readiness.updateReadinessItemDetails
	);
	const createRisk = useMutation(api.risks.createRisk);
	const updateRisk = useMutation(api.risks.updateRisk);
	const [kind, setKind] = useState<SheetKind>(initialKind);
	const [taskForm, setTaskForm] = useState(() => getTaskFormFor(editingTask));
	const [riskForm, setRiskForm] = useState(() => getRiskFormFor(editingRisk));
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isEditing = Boolean(editingTask || editingRisk);
	const riskHref = editingRisk
		? getRiskRelatedHref({
				relatedEntityType: editingRisk.relatedEntityType,
				tripId,
			})
		: null;
	const isTask = kind === "task";

	const saveTask = async () => {
		const title = taskForm.title.trim();
		const taskPatch = {
			category: getReadinessCategory(taskForm.category),
			description: taskForm.description.trim() || title,
			dueDate: taskForm.dueDate.trim(),
			priority: getPriority(taskForm.priority),
			title,
		};
		const assignedToMemberId = taskForm.assignedToMemberId.trim() || undefined;

		if (editingTask) {
			await updateReadinessItemDetails({
				...taskPatch,
				assignedToMemberId,
				readinessItemId: editingTask._id,
			});
			return;
		}
		await createReadinessItem({ ...taskPatch, assignedToMemberId, tripId });
	};
	const saveRisk = async () => {
		const title = riskForm.title.trim();
		const riskPatch = {
			message: riskForm.message.trim() || title,
			severity: getRiskSeverity(riskForm.severity),
			suggestedAction: riskForm.suggestedAction.trim(),
			title,
			type: getRiskType(riskForm.type),
		};
		const relatedEntityFields = getRelatedEntityMutationFields({
			relatedEntityKey: riskForm.relatedEntityKey,
			shouldClear: Boolean(editingRisk),
		});

		if (editingRisk) {
			await updateRisk({
				...riskPatch,
				...relatedEntityFields,
				riskId: editingRisk._id,
			});
			return;
		}
		await createRisk({ ...riskPatch, ...relatedEntityFields, tripId });
	};
	const handleSave = async () => {
		if (!(isTask ? taskForm.title : riskForm.title).trim()) {
			setError("Add a title.");
			return;
		}

		setError(null);
		setIsSaving(true);
		try {
			await (isTask ? saveTask() : saveRisk());
			haptic("success");
			onClose();
		} catch {
			setError("Could not save. Try again.");
		} finally {
			setIsSaving(false);
		}
	};

	let deleteLabel = "Delete risk";
	if (editingTask) {
		deleteLabel =
			editingTask.source === "system" ? "Mark not needed" : "Delete task";
	}
	let title = isTask ? "Add task" : "Add risk";
	if (editingTask) {
		title = "Task";
	} else if (editingRisk) {
		title = "Risk";
	}

	return (
		<RecordSheet
			errorMessage={error}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			onSave={() => {
				handleSave().catch(() => undefined);
			}}
			saveLabel={isEditing ? "Save" : "Add"}
			title={title}
		>
			{isEditing ? null : (
				<Segmented
					accessibilityLabel="Task or risk"
					onChange={setKind}
					options={sheetKindOptions}
					value={kind}
				/>
			)}
			{isTask ? (
				<TaskFields
					companions={companions}
					form={taskForm}
					onUpdate={(key, value) => {
						setError(null);
						setTaskForm((current) => ({ ...current, [key]: value }));
					}}
				/>
			) : (
				<RiskFields
					form={riskForm}
					onUpdate={(key, value) => {
						setError(null);
						setRiskForm((current) => ({ ...current, [key]: value }));
					}}
					relatedOptions={relatedOptions}
				/>
			)}
			{editingTask ? (
				<TaskLinks
					ownerName={
						editingTask.assignedToMemberId
							? companions.find(
									(companion) =>
										companion._id === editingTask.assignedToMemberId
								)?.name
							: undefined
					}
					task={editingTask}
					tripId={tripId}
				/>
			) : null}
			{!isTask && editingRisk && riskHref ? (
				<ListGroup>
					<Link asChild href={riskHref}>
						<LinkRow icon="open-outline" label="Open linked item" />
					</Link>
				</ListGroup>
			) : null}
			{isEditing ? (
				<ListGroup>
					<ListRow
						destructive={true}
						onPress={onDelete}
						showChevron={false}
						title={deleteLabel}
					/>
				</ListGroup>
			) : null}
		</RecordSheet>
	);
}

/** Jump to the module a task belongs to, or to its owner. */
function TaskLinks({
	ownerName,
	task,
	tripId,
}: {
	ownerName?: string;
	task: Doc<"readinessItems">;
	tripId: Id<"trips">;
}) {
	const categoryLink = getReadinessCategoryHref({
		category: task.category,
		tripId,
	});
	const ownerHref = task.assignedToMemberId
		? VIYA_ROUTES.tripCompanions(tripId)
		: null;

	if (!(categoryLink || ownerHref)) {
		return null;
	}

	return (
		<ListGroup>
			{categoryLink ? (
				<Link asChild href={categoryLink.href}>
					<LinkRow icon="open-outline" label={categoryLink.label} />
				</Link>
			) : null}
			{ownerHref ? (
				<Link asChild href={ownerHref}>
					<LinkRow
						icon="people-outline"
						label={`Open ${ownerName ?? "owner"}`}
					/>
				</Link>
			) : null}
		</ListGroup>
	);
}

function HeadsUpList({
	labelByKey,
	onAdd,
	onDismiss,
	onEdit,
	onMitigate,
	risks,
}: {
	labelByKey: Map<string, string>;
	onAdd: () => void;
	onDismiss: (risk: Doc<"risks">) => void;
	onEdit: (risk: Doc<"risks">) => void;
	onMitigate: (risk: Doc<"risks">) => void;
	risks: Doc<"risks">[];
}) {
	if (risks.length === 0) {
		return (
			<EmptyState
				action={{ label: "Add risk", onPress: onAdd }}
				description="Add anything that could disrupt the trip and what you will do instead."
				icon="shield-checkmark-outline"
				title="No risks for this trip"
			/>
		);
	}

	return (
		<ListGroup footer="Swipe right when handled, left to dismiss.">
			{risks.map((risk) => {
				const presentation = getSeverityPresentation(risk.severity);
				const severity =
					PRIORITY_LABELS[risk.severity as Priority] ??
					formatEnumLabel(risk.severity);
				const linkedLabel = getTripRelatedEntityLabel(
					{
						relatedEntityId: risk.relatedEntityId,
						relatedEntityType: risk.relatedEntityType,
					},
					labelByKey
				);
				const action = risk.suggestedAction.trim()
					? `What to do: ${risk.suggestedAction.trim()}`
					: null;
				const subtitle =
					[linkedLabel, action].filter(Boolean).join(" · ") || undefined;

				return (
					<SwipeRow
						key={risk._id}
						leading={{
							icon: "checkmark-circle-outline",
							label: "Handled",
							onPress: () => onMitigate(risk),
							tone: "success",
						}}
						trailing={{
							icon: "close",
							label: "Dismiss",
							onPress: () => onDismiss(risk),
							tone: "danger",
						}}
					>
						<ListRow
							accessibilityLabel={`${risk.title}, ${severity} severity. Open`}
							onPress={() => onEdit(risk)}
							showChevron={false}
							subtitle={subtitle}
							title={risk.title}
							trailing={
								<StatusLabel
									icon={presentation.icon}
									label={severity}
									tone={presentation.tone}
								/>
							}
						/>
					</SwipeRow>
				);
			})}
		</ListGroup>
	);
}

function NextUpRow({
	item,
	onEdit,
	onMarkDone,
}: {
	item: Doc<"readinessItems">;
	onEdit: () => void;
	onMarkDone: () => void;
}) {
	return (
		<ListGroup header="Next up">
			<ListRow
				onPress={onEdit}
				showChevron={false}
				subtitle={getTaskSubtitle(item) || undefined}
				title={item.title}
				trailing={
					<SecondaryButton
						fullWidth={false}
						label="Mark done"
						onPress={onMarkDone}
						variant="plain"
					/>
				}
			/>
		</ListGroup>
	);
}

function SegmentContent({
	doneItems,
	labelByKey,
	onAddRisk,
	onAddTask,
	onDismissRisk,
	onEditRisk,
	onMitigateRisk,
	openItems,
	openRisks,
	renderTask,
	segment,
}: {
	doneItems: Doc<"readinessItems">[];
	labelByKey: Map<string, string>;
	onAddRisk: () => void;
	onAddTask: () => void;
	onDismissRisk: (risk: Doc<"risks">) => void;
	onEditRisk: (risk: Doc<"risks">) => void;
	onMitigateRisk: (risk: Doc<"risks">) => void;
	openItems: Doc<"readinessItems">[];
	openRisks: Doc<"risks">[];
	renderTask: (
		item: Doc<"readinessItems">,
		showCategory?: boolean
	) => ReactNode;
	segment: Segment;
}) {
	if (segment === "heads-up") {
		return (
			<HeadsUpList
				labelByKey={labelByKey}
				onAdd={onAddRisk}
				onDismiss={onDismissRisk}
				onEdit={onEditRisk}
				onMitigate={onMitigateRisk}
				risks={openRisks}
			/>
		);
	}

	if (segment === "done") {
		return doneItems.length === 0 ? (
			<AppText style={{ textAlign: "center" }} tone="secondary">
				No finished tasks yet. Tick a task to move it here.
			</AppText>
		) : (
			<ListGroup>{doneItems.map((item) => renderTask(item, true))}</ListGroup>
		);
	}

	if (openItems.length === 0) {
		return (
			<EmptyState
				action={{ label: "Add task", onPress: onAddTask }}
				description="Every task on this trip is done."
				icon="checkmark-circle-outline"
				title="Nothing left to do"
			/>
		);
	}

	const orderedItems = readinessCategoryOptions.flatMap((category) =>
		openItems.filter((item) => item.category === category)
	);

	return (
		<ListGroup>{orderedItems.map((item) => renderTask(item, true))}</ListGroup>
	);
}

export function ReadinessScreen() {
	const tripId = useTripIdParam();
	const params = useLocalSearchParams<{ segment?: string }>();
	const { confirm } = useFeedback();
	const readinessItems = useQuery(
		api.readiness.listReadinessItems,
		tripId ? { tripId } : "skip"
	);
	const companions = useQuery(
		api.companions.listTripCompanions,
		tripId ? { tripId } : "skip"
	);
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const ensureBaselineReadinessItems = useMutation(
		api.readiness.ensureBaselineReadinessItems
	);
	const deleteReadinessItem = useMutation(api.readiness.deleteReadinessItem);
	const updateReadinessItem = useMutation(api.readiness.updateReadinessItem);
	const deleteRisk = useMutation(api.risks.deleteRisk);
	const dismissRisk = useMutation(api.risks.dismissRisk);
	const mitigateRisk = useMutation(api.risks.mitigateRisk);
	const [segment, setSegment] = useState<Segment>(
		params.segment === "heads-up" ? "heads-up" : "todo"
	);
	const [sheet, setSheet] = useState<{
		kind: SheetKind;
		nonce: number;
		riskId: Id<"risks"> | null;
		taskId: Id<"readinessItems"> | null;
	} | null>(null);
	const [baselineRequestedTripId, setBaselineRequestedTripId] =
		useState<Id<"trips"> | null>(null);
	const [screenError, setScreenError] = useState<string | null>(null);

	useEffect(() => {
		if (params.segment === "heads-up") {
			setSegment("heads-up");
		}
	}, [params.segment]);

	useEffect(() => {
		if (!(tripId && readinessItems)) {
			return;
		}

		const missingCategories = getMissingRequiredReadinessCategories(
			readinessItems.map(toReadinessItem)
		);

		if (missingCategories.length > 0 && baselineRequestedTripId !== tripId) {
			setBaselineRequestedTripId(tripId);
			ensureBaselineReadinessItems({ tripId }).catch(() => {
				setScreenError("Could not prepare the checklist. Try again later.");
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
			<ScreenShell
				state={{
					description: "Open a saved trip to check readiness.",
					icon: "shield-checkmark-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Readiness"
			/>
		);
	}

	if (
		readinessItems === undefined ||
		companions === undefined ||
		workspace === undefined
	) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading readiness" }}
				title="Readiness"
			/>
		);
	}

	const risks = sortTripRisksForReview(workspace?.risks ?? []);
	const openRisks = risks.filter((risk) => risk.status === "open");
	const relatedOptions = workspace
		? getTripRelatedEntityOptions(workspace, {
				expenseLimit: 6,
				itineraryItemLimit: 8,
				vaultItemLimit: 6,
			})
		: [];
	const relatedLabelByKey = workspace
		? getTripRelatedEntityLabelByKey(workspace)
		: new Map<string, string>();
	const sortedItems = sortReadinessItemsForReview(readinessItems);
	const progress = getReadinessProgress(sortedItems, toLocalDateKey());
	const openItems = sortedItems.filter(isOpenItem);
	const doneItems = sortedItems.filter((item) => item.status === "done");
	const nextUp = openItems[0] ?? null;
	const { headerLine, headerTitle } = getReadinessHeader(progress);
	const companionById = new Map<string, string>(
		companions.map((companion) => [companion._id, companion.name])
	);

	const runAction = async (action: () => Promise<unknown>, failure: string) => {
		setScreenError(null);
		try {
			await action();
		} catch {
			setScreenError(failure);
		}
	};
	const setTaskStatus = (item: Doc<"readinessItems">, status: WorkStatus) =>
		runAction(async () => {
			await updateReadinessItem({ readinessItemId: item._id, status });
			haptic(status === "done" ? "success" : "selection");
		}, "Could not update this task. Try again.");

	const closeSheet = () => setSheet(null);
	const openSheet = (next: {
		kind: SheetKind;
		riskId?: Id<"risks">;
		taskId?: Id<"readinessItems">;
	}) =>
		setSheet({
			kind: next.kind,
			nonce: Date.now(),
			riskId: next.riskId ?? null,
			taskId: next.taskId ?? null,
		});
	const editingTask =
		readinessItems.find((item) => item._id === sheet?.taskId) ?? null;
	const editingRisk = risks.find((risk) => risk._id === sheet?.riskId) ?? null;

	const confirmDelete = (title: string, noun: string) =>
		confirm({
			confirmLabel: `Delete ${noun}`,
			destructive: true,
			message: `${title} will be removed from this trip.`,
			title: `Delete ${noun}`,
		});
	const removeTask = async (item: Doc<"readinessItems">) => {
		if (!(await confirmDelete(item.title, "task"))) {
			return;
		}
		await runAction(async () => {
			await deleteReadinessItem({ readinessItemId: item._id });
			haptic("warning");
			closeSheet();
		}, "Could not delete this task. Try again.");
	};
	const removeRisk = async (risk: Doc<"risks">) => {
		if (!(await confirmDelete(risk.title, "risk"))) {
			return;
		}
		await runAction(async () => {
			await deleteRisk({ riskId: risk._id });
			haptic("warning");
			closeSheet();
		}, "Could not delete this risk. Try again.");
	};
	const handleDeleteFromSheet = () => {
		if (editingTask?.source === "system") {
			setTaskStatus(editingTask, "ignored")
				.then(closeSheet)
				.catch(() => undefined);
		} else if (editingTask) {
			removeTask(editingTask).catch(() => undefined);
		} else if (editingRisk) {
			removeRisk(editingRisk).catch(() => undefined);
		}
	};

	const renderTask = (item: Doc<"readinessItems">, showCategory = false) => (
		<SwipeRow
			key={item._id}
			trailing={
				item.source === "system"
					? {
							icon: "remove-circle-outline",
							label: "Not needed",
							onPress: () => {
								setTaskStatus(item, "ignored").catch(() => undefined);
							},
							tone: "danger",
						}
					: {
							icon: "trash-outline",
							label: "Delete",
							onPress: () => {
								removeTask(item).catch(() => undefined);
							},
							tone: "danger",
						}
			}
		>
			<ReadinessTaskRow
				assignedToName={
					item.assignedToMemberId
						? companionById.get(item.assignedToMemberId)
						: undefined
				}
				item={item}
				onEdit={() => openSheet({ kind: "task", taskId: item._id })}
				onToggle={() => {
					setTaskStatus(item, item.status === "done" ? "todo" : "done").catch(
						() => undefined
					);
				}}
				showCategory={showCategory}
			/>
		</SwipeRow>
	);

	const content = (
		<SegmentContent
			doneItems={doneItems}
			labelByKey={relatedLabelByKey}
			onAddRisk={() => openSheet({ kind: "risk" })}
			onAddTask={() => openSheet({ kind: "task" })}
			onDismissRisk={(risk) => {
				runAction(
					() => dismissRisk({ riskId: risk._id }),
					"Could not dismiss this risk. Try again."
				).catch(() => undefined);
			}}
			onEditRisk={(risk) => openSheet({ kind: "risk", riskId: risk._id })}
			onMitigateRisk={(risk) => {
				haptic("success");
				runAction(
					() => mitigateRisk({ riskId: risk._id }),
					"Could not update this risk. Try again."
				).catch(() => undefined);
			}}
			openItems={openItems}
			openRisks={openRisks}
			renderTask={renderTask}
			segment={segment}
		/>
	);

	return (
		<>
			<ScreenShell
				actions={[
					{
						icon: "add",
						key: "add",
						label: segment === "heads-up" ? "Add risk" : "Add task",
						onPress: () =>
							openSheet({ kind: segment === "heads-up" ? "risk" : "task" }),
						type: "button",
					},
				]}
				title="Readiness"
			>
				<View style={{ gap: spacing.xs }}>
					<AppText variant="title">{headerTitle}</AppText>
					<AppText tone="secondary" variant="callout">
						{headerLine}
					</AppText>
				</View>
				{nextUp ? (
					<NextUpRow
						item={nextUp}
						onEdit={() => openSheet({ kind: "task", taskId: nextUp._id })}
						onMarkDone={() => {
							setTaskStatus(nextUp, "done").catch(() => undefined);
						}}
					/>
				) : null}
				<Segmented
					accessibilityLabel="Readiness view"
					onChange={setSegment}
					options={segmentOptions}
					value={segment}
				/>
				{screenError ? (
					<AppText accessibilityRole="alert" tone="danger" variant="subhead">
						{screenError}
					</AppText>
				) : null}
				{content}
			</ScreenShell>

			<ReadinessSheet
				companions={companions}
				editingRisk={editingRisk}
				editingTask={editingTask}
				initialKind={sheet?.kind ?? "task"}
				isOpen={sheet !== null}
				key={sheet?.nonce ?? 0}
				onClose={closeSheet}
				onDelete={handleDeleteFromSheet}
				relatedOptions={relatedOptions}
				tripId={tripId}
			/>
		</>
	);
}
