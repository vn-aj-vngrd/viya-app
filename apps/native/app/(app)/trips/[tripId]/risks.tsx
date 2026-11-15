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
import { BottomSheet, Input, Label, TextArea, TextField } from "heroui-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import {
	AppText,
	Card,
	Chip,
	EmptyState,
	GlassIconButton,
	PrimaryButton,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { PillAction } from "@/src/features/bookings/pill-action";
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
		<View style={{ gap: spacing.sm }}>
			<AppText tone="secondary" variant="eyebrow">
				{label}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{options.map((option) => (
					<Chip
						key={option}
						label={severityLabels[option] ?? formatRiskChoiceLabel(option)}
						onPress={() => onChange(option)}
						selected={value === option}
					/>
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
		<View style={{ gap: spacing.sm }}>
			<AppText tone="secondary" variant="eyebrow">
				LINK TO TRIP ITEM
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				<Chip label="None" onPress={() => onChange("")} selected={!value} />
				{visibleOptions.map((option) => (
					<Chip
						key={option.key}
						label={getCompactRelatedLabel(option.label)}
						onPress={() => onChange(option.key)}
						selected={value === option.key}
					/>
				))}
			</View>
			{options.length > visibleOptions.length ? (
				<AppText tone="secondary" variant="footnote">
					Showing the most relevant {visibleOptions.length} trip items.
				</AppText>
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
					snapPoints={["84%"]}
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
									{mode === "edit" ? "Edit risk" : "Add risk"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Capture a schedule, budget, safety, document, or transport
									risk with a clear backup action.
								</BottomSheet.Description>
							</View>
							<GlassIconButton
								accessibilityLabel="Close risk form"
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
							label={mode === "edit" ? "Save risk" : "Add risk"}
							onPress={onSubmit}
						/>
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
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.card,
				gap: spacing.md,
				padding: spacing.lg,
			}}
		>
			<View
				style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}
			>
				<Ionicons
					color={palette.danger}
					name="alert-circle-outline"
					size={22}
				/>
				<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
					<AppText tone="secondary" variant="eyebrow">
						TOP RISK
					</AppText>
					<AppText bold={true} numberOfLines={1}>
						{risk?.title ?? "No active risk"}
					</AppText>
				</View>
			</View>
			<AppText tone="secondary" variant="subhead">
				{risk
					? risk.suggestedAction
					: "Add weather, schedule, budget, document, or safety risks so Travel Mode can surface backup actions."}
			</AppText>
			{risk ? (
				<>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						<Chip label={formatRiskChoiceLabel(risk.type)} />
						<Chip label={severityLabels[risk.severity] ?? risk.severity} />
						{relatedEntityLabel ? <Chip label={relatedEntityLabel} /> : null}
					</View>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						<PillAction
							disabled={isPending}
							icon="create-outline"
							label="Review top risk"
							onPress={onReview}
							tone="primary"
						/>
						{relatedEntityHref ? (
							<Link asChild href={relatedEntityHref}>
								<PillAction icon="open-outline" label="Open top linked item" />
							</Link>
						) : null}
						<PillAction
							disabled={risk.status === "mitigated"}
							isPending={isPending}
							label="Mark top mitigated"
							onPress={onMitigate}
						/>
					</View>
				</>
			) : (
				<View style={{ alignItems: "flex-start" }}>
					<PillAction
						icon="add-circle-outline"
						label="Add top risk"
						onPress={onCreateTopRisk}
					/>
				</View>
			)}
		</View>
	);
}

export default function TripRisksScreen() {
	const { palette } = useUITheme();

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
			<Container className="pb-28">
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

	if (workspace === null) {
		return (
			<Container className="pb-28">
				<EmptyState
					description="This trip was deleted or is no longer available."
					icon="warning-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

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
				className="px-5 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View style={{ gap: spacing.section, paddingBottom: spacing.lg }}>
					<TripModuleManualEntryCard
						description="Track schedule, budget, safety, document, and transport risks with clear backup actions."
						moduleLabel="risks"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="warning-outline"
						primaryActionLabel="Add risk"
					/>
					{riskErrorMessage ? (
						<Animated.View entering={FadeIn}>
							<AppText
								accessibilityRole="alert"
								tone="danger"
								variant="subhead"
							>
								{riskErrorMessage}
							</AppText>
						</Animated.View>
					) : null}

					<Animated.View entering={FadeInDown.springify().damping(20)}>
						<Card padding="lg" style={{ gap: spacing.lg }}>
							<View
								style={{
									alignItems: "flex-start",
									flexDirection: "row",
									gap: spacing.md,
								}}
							>
								<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
									<AppText accessibilityRole="header" variant="heading">
										Risk board
									</AppText>
									<AppText tone="secondary" variant="subhead">
										Surface the most urgent risk and its backup move.
									</AppText>
								</View>
								<Ionicons
									color={palette.danger}
									name="warning-outline"
									size={24}
								/>
							</View>
							<View
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: spacing.sm,
								}}
							>
								<Chip label={`${openRisks.length} open`} />
								<Chip label={`${severeRiskCount} severe`} />
								<Chip label={`${mitigatedRiskCount} mitigated`} />
								<Chip label={`${riskTypeCount} types`} />
								<Chip label={`${linkedRiskCount} linked`} />
							</View>
							<TopRiskSummary
								isPending={
									activeRisk ? pendingRiskId === activeRisk._id : false
								}
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
						</Card>
					</Animated.View>

					{risks.length === 0 ? (
						<Card padding="none">
							<EmptyState
								action={{
									label: "Add risk",
									onPress: openCreateSheet,
								}}
								description="No risks yet. Add weather, schedule, budget, document, or safety risks as they appear."
								icon="warning-outline"
								title="No risks"
							/>
						</Card>
					) : (
						<View style={{ gap: spacing.md }}>
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
	const { palette } = useUITheme();

	return (
		<Animated.View entering={FadeInDown.springify().damping(20)}>
			<Card padding="lg" style={{ gap: spacing.lg }}>
				<View
					style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}
				>
					<Ionicons
						color={palette.danger}
						name="alert-circle-outline"
						size={22}
						style={{ marginTop: 1 }}
					/>
					<View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
						<View
							style={{
								flexDirection: "row",
								flexWrap: "wrap",
								gap: spacing.sm,
							}}
						>
							<Chip label={formatRiskChoiceLabel(risk.type)} />
							<Chip label={severityLabels[risk.severity] ?? risk.severity} />
							<Chip label={statusLabels[risk.status] ?? risk.status} />
							{relatedEntityLabel ? <Chip label={relatedEntityLabel} /> : null}
						</View>
						<AppText variant="headline">{risk.title}</AppText>
						<AppText tone="secondary" variant="subhead">
							{risk.message}
						</AppText>
						<AppText tone="secondary" variant="footnote">
							{risk.suggestedAction}
						</AppText>
					</View>
				</View>
				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
				>
					{relatedEntityHref ? (
						<Link asChild href={relatedEntityHref}>
							<PillAction icon="open-outline" label="Open linked item" />
						</Link>
					) : null}
					<PillAction
						disabled={risk.status === "mitigated"}
						isPending={isPending}
						label="Mitigate"
						onPress={onMitigate}
					/>
					<PillAction disabled={isPending} label="Edit" onPress={onEdit} />
					<PillAction
						disabled={isPending || risk.status === "dismissed"}
						label="Dismiss"
						onPress={onDismiss}
					/>
					<PillAction
						disabled={isPending}
						label="Delete risk"
						onPress={onDelete}
						tone="danger"
					/>
				</View>
			</Card>
		</Animated.View>
	);
}
