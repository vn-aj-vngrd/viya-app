import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { RiskSeverity, RiskType } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
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
import { RouteHeader } from "@/src/components/navigation/route-header";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

interface RiskForm {
	message: string;
	severity: string;
	suggestedAction: string;
	title: string;
	type: string;
}

const initialRiskForm: RiskForm = {
	message: "",
	severity: "medium",
	suggestedAction: "",
	title: "",
	type: "unknown",
};

const riskSeverities = new Set<string>(["low", "medium", "high", "critical"]);
const riskTypes = new Set<string>([
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
]);

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

const getRiskSeverity = (value: string): RiskSeverity => {
	const severity = value.trim();

	return riskSeverities.has(severity) ? (severity as RiskSeverity) : "medium";
};

const getRiskType = (value: string): RiskType => {
	const type = value.trim();

	return riskTypes.has(type) ? (type as RiskType) : "unknown";
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

function RiskSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: RiskForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof RiskForm, value: string) => void;
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
									watch-out.
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
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Type"
										onChangeText={(value) => onUpdateForm("type", value)}
										placeholder="transport"
										value={form.type}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Severity"
										onChangeText={(value) => onUpdateForm("severity", value)}
										placeholder="medium"
										value={form.severity}
									/>
								</View>
							</View>
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

export default function TripRisksScreen() {
	const tripId = useTripIdParam();
	const risks = useQuery(api.risks.listRisks, tripId ? { tripId } : "skip");
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

	const updateForm = (key: keyof RiskForm, value: string) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingRiskId(null);
		setForm(initialRiskForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (risk: Doc<"risks">) => {
		setEditingRiskId(risk._id);
		setForm({
			message: risk.message,
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
			return;
		}

		setIsSaving(true);
		try {
			const riskPatch = {
				message: form.message.trim() || title,
				severity: getRiskSeverity(form.severity),
				suggestedAction:
					form.suggestedAction.trim() || "Review and create a backup plan.",
				title,
				type: getRiskType(form.type),
			};

			if (editingRiskId) {
				await updateRisk({
					...riskPatch,
					riskId: editingRiskId,
				});
			} else {
				await createRisk({
					...riskPatch,
					tripId,
				});
			}
			setForm(initialRiskForm);
			setEditingRiskId(null);
			setIsSheetOpen(false);
		} finally {
			setIsSaving(false);
		}
	};

	const runRiskAction = async (
		riskId: Id<"risks">,
		action: () => Promise<unknown>
	) => {
		setPendingRiskId(riskId);
		try {
			await action();
		} finally {
			setPendingRiskId(null);
		}
	};

	if (risks === undefined) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const openRisks = risks.filter((risk) => risk.status === "open");

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Watch"
					icon="warning-outline"
					subtitle="Schedule, safety, budget, transport, and document watch-outs."
					title="Risks"
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
							<Ionicons color="#0A84FF" name="warning-outline" size={20} />
						</View>
						<View className="flex-1 gap-1">
							<Text type="body" weight="bold">
								{openRisks.length} open risks
							</Text>
							<Text color="muted" type="body-sm">
								Add risks early so Travel Mode can surface backup actions.
							</Text>
						</View>
					</View>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add risk</Button.Label>
					</Button>
				</Surface>

				{risks.length === 0 ? (
					<EmptyState
						description="No watch-outs yet. Add weather, schedule, budget, document, or safety risks as they appear."
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
								risk={risk}
							/>
						))}
					</View>
				)}
			</View>
			<RiskSheet
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingRiskId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsSheetOpen(isOpen);
					if (!isOpen) {
						setEditingRiskId(null);
						setForm(initialRiskForm);
					}
				}}
				onSubmit={handleSaveRisk}
				onUpdateForm={updateForm}
			/>
		</Container>
	);
}

function RiskCard({
	isPending,
	onDelete,
	onDismiss,
	onEdit,
	onMitigate,
	risk,
}: {
	isPending: boolean;
	onDelete: () => void;
	onDismiss: () => void;
	onEdit: () => void;
	onMitigate: () => void;
	risk: Doc<"risks">;
}) {
	return (
		<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-5">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="alert-circle-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{risk.type}</Chip.Label>
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
