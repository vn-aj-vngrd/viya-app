import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	type RiskSeverity,
	type RiskType,
	sortTripRisksForReview,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link } from "expo-router";
import {
	BottomSheet,
	Button,
	Chip,
	CloseButton,
	Input,
	Label,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import { TripModuleManualEntryCard } from "@/src/features/trips/trip-module-manual-entry-card";
import {
	getCompactRelatedLabel,
	getRelatedEntityKey,
	getRelatedEntityMutationFields,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
	getTripRelatedEntityOptions,
	type TripRelatedEntityOption,
} from "@/src/features/trips/trip-related-entities";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

interface RiskForm {
	message: string;
	relatedEntityKey: string;
	severity: string;
	suggestedAction: string;
	title: string;
	type: string;
}

const initialRiskForm: RiskForm = {
	message: "",
	relatedEntityKey: "",
	severity: "medium",
	suggestedAction: "",
	title: "",
	type: "unknown",
};

const riskSeverityOptions = ["low", "medium", "high", "critical"] as const;
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

const riskSeverities = new Set<string>(riskSeverityOptions);
const riskTypes = new Set<string>(riskTypeOptions);

const severityLabels: Record<string, string> = {
	critical: "Critical",
	high: "High",
	low: "Low",
	medium: "Medium",
};

const statusLabels: Record<string, string> = {
	dismissed: "Dismissed",
	mitigated: "Mitigated",
	open: "Open",
};

const severityRank: Record<string, number> = {
	critical: 4,
	high: 3,
	low: 1,
	medium: 2,
};

const getRiskSeverity = (value: string): RiskSeverity => {
	const severity = value.trim();

	return riskSeverities.has(severity) ? (severity as RiskSeverity) : "medium";
};

const getRiskType = (value: string): RiskType => {
	const type = value.trim();

	return riskTypes.has(type) ? (type as RiskType) : "unknown";
};

const formatRiskChoiceLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

const getRiskRelatedLabel = (
	risk: Doc<"risks">,
	relatedEntityLabelByKey: Map<string, string>
) =>
	getTripRelatedEntityLabel(
		{
			relatedEntityId: risk.relatedEntityId,
			relatedEntityType: risk.relatedEntityType,
		},
		relatedEntityLabelByKey
	);

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
			return VIYA_ROUTES.tripRisks(tripId);
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

function RiskChoiceGroup({
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
							{severityLabels[option] ?? formatRiskChoiceLabel(option)}
						</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

function RiskRelatedEntityPicker({
	onChange,
	options,
	value,
}: {
	onChange: (value: string) => void;
	options: TripRelatedEntityOption[];
	value: string;
}) {
	const visibleOptions = options.slice(0, 12);

	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				LINK TO TRIP ITEM
			</Text>
			<View className="flex-row flex-wrap gap-2">
				<Button
					onPress={() => onChange("")}
					size="sm"
					variant={value ? "secondary" : "primary"}
				>
					<Button.Label>None</Button.Label>
				</Button>
				{visibleOptions.map((option) => (
					<Button
						key={option.key}
						onPress={() => onChange(option.key)}
						size="sm"
						variant={value === option.key ? "primary" : "secondary"}
					>
						<Button.Label>{getCompactRelatedLabel(option.label)}</Button.Label>
					</Button>
				))}
			</View>
			{options.length > visibleOptions.length ? (
				<Text color="muted" type="body-xs">
					Showing the most relevant {visibleOptions.length} trip items.
				</Text>
			) : null}
		</View>
	);
}

function RiskSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
	relatedEntityOptions,
}: {
	errorMessage: string | null;
	form: RiskForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof RiskForm, value: string) => void;
	relatedEntityOptions: TripRelatedEntityOption[];
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["84%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit" ? "Edit risk" : "Add risk"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Capture a schedule, budget, safety, document, or transport
									risk with a clear backup action.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close risk form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 500 }}
						>
							<SheetField
								label="Title"
								onChangeText={(value) => onUpdateForm("title", value)}
								placeholder="Tight transfer window"
								value={form.title}
							/>
							<RiskChoiceGroup
								label="Type"
								onChange={(value) => onUpdateForm("type", value)}
								options={riskTypeOptions}
								value={form.type}
							/>
							<RiskChoiceGroup
								label="Severity"
								onChange={(value) => onUpdateForm("severity", value)}
								options={riskSeverityOptions}
								value={form.severity}
							/>
							<RiskRelatedEntityPicker
								onChange={(value) => onUpdateForm("relatedEntityKey", value)}
								options={relatedEntityOptions}
								value={form.relatedEntityKey}
							/>
							<SheetTextArea
								label="Risk"
								onChangeText={(value) => onUpdateForm("message", value)}
								placeholder="What could go wrong?"
								value={form.message}
							/>
							<SheetTextArea
								label="Suggested action"
								onChangeText={(value) => onUpdateForm("suggestedAction", value)}
								placeholder="What should the traveler do?"
								value={form.suggestedAction}
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
								{mode === "edit" ? "Save risk" : "Add risk"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function TopRiskSummary({
	isPending,
	onCreateTopRisk,
	onMitigate,
	onReview,
	relatedEntityHref,
	relatedEntityLabel,
	risk,
}: {
	isPending: boolean;
	onCreateTopRisk: () => void;
	onMitigate: () => void;
	onReview: () => void;
	relatedEntityHref: Href | null;
	relatedEntityLabel: string | null;
	risk: Doc<"risks"> | null;
}) {
	return (
		<View className="gap-3 rounded-[24px] bg-surface p-4">
			<View className="flex-row items-center gap-3">
				<View
					className="h-9 w-9 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(255, 59, 48, 0.12)" }}
				>
					<Ionicons color="#FF3B30" name="alert-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						TOP RISK
					</Text>
					<Text numberOfLines={1} type="body-sm" weight="bold">
						{risk?.title ?? "No active risk"}
					</Text>
				</View>
			</View>
			<Text.Paragraph color="muted" type="body-sm">
				{risk
					? risk.suggestedAction
					: "Add weather, schedule, budget, document, or safety risks so Travel Mode can surface backup actions."}
			</Text.Paragraph>
			{risk ? (
				<>
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{formatRiskChoiceLabel(risk.type)}</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{severityLabels[risk.severity] ?? risk.severity}
							</Chip.Label>
						</Chip>
						{relatedEntityLabel ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>{relatedEntityLabel}</Chip.Label>
							</Chip>
						) : null}
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Button
							className="flex-1"
							isDisabled={isPending}
							onPress={onReview}
							size="sm"
						>
							<Ionicons color="#FFFFFF" name="create-outline" size={16} />
							<Button.Label>Review top risk</Button.Label>
						</Button>
						{relatedEntityHref ? (
							<Link asChild href={relatedEntityHref}>
								<Button className="flex-1" size="sm" variant="secondary">
									<Ionicons color="#0A84FF" name="open-outline" size={15} />
									<Button.Label>Open top linked item</Button.Label>
								</Button>
							</Link>
						) : null}
						<Button
							className="flex-1"
							isDisabled={isPending || risk.status === "mitigated"}
							onPress={onMitigate}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Mark top mitigated</Button.Label>
						</Button>
					</View>
				</>
			) : (
				<Button onPress={onCreateTopRisk} size="sm" variant="secondary">
					<Ionicons color="#0A84FF" name="add-circle-outline" size={16} />
					<Button.Label>Add top risk</Button.Label>
				</Button>
			)}
		</View>
	);
}

export default function TripRisksScreen() {
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const createRisk = useMutation(api.risks.createRisk);
	const deleteRisk = useMutation(api.risks.deleteRisk);
	const dismissRisk = useMutation(api.risks.dismissRisk);
	const mitigateRisk = useMutation(api.risks.mitigateRisk);
	const updateRisk = useMutation(api.risks.updateRisk);
	const [form, setForm] = useState<RiskForm>(initialRiskForm);
	const [editingRiskId, setEditingRiskId] = useState<Id<"risks"> | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [pendingRiskId, setPendingRiskId] = useState<Id<"risks"> | null>(null);
	const [riskErrorMessage, setRiskErrorMessage] = useState<string | null>(null);

	const updateForm = (key: keyof RiskForm, value: string) => {
		setRiskErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setRiskErrorMessage(null);
		setEditingRiskId(null);
		setForm(initialRiskForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (risk: Doc<"risks">) => {
		setRiskErrorMessage(null);
		setEditingRiskId(risk._id);
		setForm({
			message: risk.message,
			relatedEntityKey: getRelatedEntityKey({
				id: risk.relatedEntityId,
				type: risk.relatedEntityType,
			}),
			severity: risk.severity,
			suggestedAction: risk.suggestedAction,
			title: risk.title,
			type: risk.type,
		});
		setIsSheetOpen(true);
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before reviewing risks."
					icon="warning-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const handleSaveRisk = async () => {
		const title = form.title.trim();
		if (!title) {
			setRiskErrorMessage("Add a risk title.");
			return;
		}

		setRiskErrorMessage(null);
		setIsSaving(true);
		try {
			const riskPatch: {
				message: string;
				relatedEntityId?: string;
				relatedEntityType?: string;
				severity: RiskSeverity;
				suggestedAction: string;
				title: string;
				type: RiskType;
			} = {
				message: form.message.trim() || title,
				severity: getRiskSeverity(form.severity),
				suggestedAction:
					form.suggestedAction.trim() || "Review and create a backup plan.",
				title,
				type: getRiskType(form.type),
			};
			const relatedEntityFields = getRelatedEntityMutationFields({
				relatedEntityKey: form.relatedEntityKey,
				shouldClear: Boolean(editingRiskId),
			});

			if (editingRiskId) {
				await updateRisk({
					...riskPatch,
					...relatedEntityFields,
					riskId: editingRiskId,
				});
			} else {
				await createRisk({
					...riskPatch,
					...relatedEntityFields,
					tripId,
				});
			}
			setForm(initialRiskForm);
			setEditingRiskId(null);
			setIsSheetOpen(false);
		} catch {
			setRiskErrorMessage("Could not save risk.");
		} finally {
			setIsSaving(false);
		}
	};

	const runRiskAction = async (
		riskId: Id<"risks">,
		action: () => Promise<unknown>
	) => {
		setRiskErrorMessage(null);
		setPendingRiskId(riskId);
		try {
			await action();
		} catch {
			setRiskErrorMessage("Could not update risk.");
		} finally {
			setPendingRiskId(null);
		}
	};

	if (workspace === undefined) {
		return <ScreenLoadingState />;
	}

	const risks = sortTripRisksForReview(workspace.risks);
	const relatedEntityOptions = getTripRelatedEntityOptions(workspace, {
		expenseLimit: 6,
		itineraryItemLimit: 8,
		vaultItemLimit: 6,
	});
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(workspace);
	const openRisks = risks.filter((risk) => risk.status === "open");
	const activeRisk =
		[...openRisks]
			.sort(
				(left, right) =>
					(severityRank[right.severity] ?? 0) -
					(severityRank[left.severity] ?? 0)
			)
			.at(0) ?? null;
	const severeRiskCount = openRisks.filter(
		(risk) => risk.severity === "critical" || risk.severity === "high"
	).length;
	const mitigatedRiskCount = risks.filter(
		(risk) => risk.status === "mitigated"
	).length;
	const riskTypeCount = new Set(risks.map((risk) => risk.type)).size;
	const linkedRiskCount = risks.filter(
		(risk) => risk.relatedEntityId && risk.relatedEntityType
	).length;
	const activeRiskRelatedLabel = activeRisk
		? getRiskRelatedLabel(activeRisk, relatedEntityLabelByKey)
		: null;
	const activeRiskRelatedHref = activeRisk
		? getRiskRelatedHref({
				relatedEntityType: activeRisk.relatedEntityType,
				tripId,
			})
		: null;

	return (
		<TripModuleScreenFrame activeTab="risks" tripId={tripId}>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Track schedule, budget, safety, document, and transport risks with clear backup actions."
						moduleLabel="risks"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="warning-outline"
						primaryActionLabel="Add risk"
					/>
					{riskErrorMessage ? (
						<Text className="px-1 text-danger" type="body-sm">
							{riskErrorMessage}
						</Text>
					) : null}

					<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Risk board
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Surface the most urgent risk and its backup move.
								</Text>
							</View>
							<View
								className="h-11 w-11 items-center justify-center rounded-full"
								style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
							>
								<Ionicons color="#FF3B30" name="warning-outline" size={20} />
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<Chip size="sm" variant="secondary">
								<Chip.Label>{openRisks.length} open</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{severeRiskCount} severe</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{mitigatedRiskCount} mitigated</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{riskTypeCount} types</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{linkedRiskCount} linked</Chip.Label>
							</Chip>
						</View>
						<TopRiskSummary
							isPending={activeRisk ? pendingRiskId === activeRisk._id : false}
							onCreateTopRisk={openCreateSheet}
							onMitigate={() => {
								if (activeRisk) {
									runRiskAction(activeRisk._id, () =>
										mitigateRisk({ riskId: activeRisk._id })
									).catch(() => undefined);
								}
							}}
							onReview={() => {
								if (activeRisk) {
									openEditSheet(activeRisk);
								}
							}}
							relatedEntityHref={activeRiskRelatedHref}
							relatedEntityLabel={activeRiskRelatedLabel}
							risk={activeRisk}
						/>
					</Surface>

					{risks.length === 0 ? (
						<EmptyState
							action={{
								label: "Add risk",
								onPress: openCreateSheet,
							}}
							description="No risks yet. Add weather, schedule, budget, document, or safety risks as they appear."
							icon="warning-outline"
							title="No risks"
						/>
					) : (
						<View className="gap-3">
							{risks.map((risk) => (
								<RiskCard
									isPending={pendingRiskId === risk._id}
									key={risk._id}
									onDelete={() => {
										runRiskAction(risk._id, () =>
											deleteRisk({ riskId: risk._id })
										).catch(() => undefined);
									}}
									onDismiss={() => {
										runRiskAction(risk._id, () =>
											dismissRisk({ riskId: risk._id })
										).catch(() => undefined);
									}}
									onEdit={() => openEditSheet(risk)}
									onMitigate={() => {
										runRiskAction(risk._id, () =>
											mitigateRisk({ riskId: risk._id })
										).catch(() => undefined);
									}}
									relatedEntityHref={getRiskRelatedHref({
										relatedEntityType: risk.relatedEntityType,
										tripId,
									})}
									relatedEntityLabel={getRiskRelatedLabel(
										risk,
										relatedEntityLabelByKey
									)}
									risk={risk}
								/>
							))}
						</View>
					)}
				</View>
				<RiskSheet
					errorMessage={riskErrorMessage}
					form={form}
					isOpen={isSheetOpen}
					isSaving={isSaving}
					mode={editingRiskId ? "edit" : "create"}
					onOpenChange={(isOpen) => {
						setIsSheetOpen(isOpen);
						if (!isOpen) {
							setEditingRiskId(null);
							setRiskErrorMessage(null);
							setForm(initialRiskForm);
						}
					}}
					onSubmit={handleSaveRisk}
					onUpdateForm={updateForm}
					relatedEntityOptions={relatedEntityOptions}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}

function RiskCard({
	isPending,
	onDelete,
	onDismiss,
	onEdit,
	onMitigate,
	risk,
	relatedEntityHref,
	relatedEntityLabel,
}: {
	isPending: boolean;
	onDelete: () => void;
	onDismiss: () => void;
	onEdit: () => void;
	onMitigate: () => void;
	risk: Doc<"risks">;
	relatedEntityHref: Href | null;
	relatedEntityLabel: string | null;
}) {
	return (
		<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-5">
			<View className="flex-row items-start gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
				>
					<Ionicons color="#FF3B30" name="alert-circle-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{formatRiskChoiceLabel(risk.type)}</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{severityLabels[risk.severity] ?? risk.severity}
							</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{statusLabels[risk.status] ?? risk.status}
							</Chip.Label>
						</Chip>
						{relatedEntityLabel ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>{relatedEntityLabel}</Chip.Label>
							</Chip>
						) : null}
					</View>
					<Text type="body" weight="bold">
						{risk.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{risk.message}
					</Text.Paragraph>
					<Text.Paragraph color="muted" type="body-xs">
						{risk.suggestedAction}
					</Text.Paragraph>
				</View>
			</View>
			<View className="flex-row flex-wrap gap-2">
				{relatedEntityHref ? (
					<Link asChild href={relatedEntityHref}>
						<Button className="flex-1" size="sm" variant="secondary">
							<Ionicons color="#0A84FF" name="open-outline" size={15} />
							<Button.Label>Open linked item</Button.Label>
						</Button>
					</Link>
				) : null}
				<Button
					className="flex-1"
					isDisabled={isPending || risk.status === "mitigated"}
					onPress={onMitigate}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Mitigate</Button.Label>
				</Button>
				<Button
					className="flex-1"
					isDisabled={isPending}
					onPress={onEdit}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Edit</Button.Label>
				</Button>
				<Button
					className="flex-1"
					isDisabled={isPending || risk.status === "dismissed"}
					onPress={onDismiss}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Dismiss</Button.Label>
				</Button>
				<Button
					className="w-full"
					isDisabled={isPending}
					onPress={onDelete}
					size="sm"
					variant="tertiary"
				>
					<Button.Label>Delete risk</Button.Label>
				</Button>
			</View>
		</Surface>
	);
}
