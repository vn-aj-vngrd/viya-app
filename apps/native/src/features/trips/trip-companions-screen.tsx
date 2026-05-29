import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
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
import { ScreenLoadingState } from "@/src/components/screen-loading-state";

import { TripModuleViyaAssistCard } from "./trip-module-viya-assist-card";
import { useTripIdParam } from "./use-trip-id-param";

interface CompanionForm {
	email: string;
	name: string;
	notes: string;
	phone: string;
	role: string;
}

const initialCompanionForm: CompanionForm = {
	email: "",
	name: "",
	notes: "",
	phone: "",
	role: "traveler",
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

function CompanionSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: CompanionForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof CompanionForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

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
									{mode === "edit" ? "Edit companion" : "Add companion"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Save traveler, emergency contact, or coordinator details.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close companion form"
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
								label="Name"
								onChangeText={(value) => onUpdateForm("name", value)}
								placeholder="Alex Reyes"
								value={form.name}
							/>
							<SheetField
								label="Role"
								onChangeText={(value) => onUpdateForm("role", value)}
								placeholder="traveler, organizer, emergency contact"
								value={form.role}
							/>
							<SheetField
								label="Email"
								onChangeText={(value) => onUpdateForm("email", value)}
								placeholder="name@example.com"
								value={form.email}
							/>
							<SheetField
								label="Phone"
								onChangeText={(value) => onUpdateForm("phone", value)}
								placeholder="+63..."
								value={form.phone}
							/>
							<TextField className="gap-2">
								<Label>
									<Label.Text>Notes</Label.Text>
								</Label>
								<TextArea
									className="min-h-20 rounded-[18px] border border-border bg-surface px-4 py-3"
									onBlur={onBlur}
									onChangeText={(value) => onUpdateForm("notes", value)}
									onFocus={onFocus}
									placeholder="Dietary needs, emergency instructions, assigned tasks"
									value={form.notes}
									variant="secondary"
								/>
							</TextField>
						</ScrollView>
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save companion" : "Add companion"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function TripCompanionsScreen() {
	const tripId = useTripIdParam();
	const companions = useQuery(
		api.companions.listTripCompanions,
		tripId ? { tripId } : "skip"
	);
	const createCompanion = useMutation(api.companions.createTripCompanion);
	const updateCompanion = useMutation(api.companions.updateTripCompanion);
	const deleteCompanion = useMutation(api.companions.deleteTripCompanion);
	const [form, setForm] = useState<CompanionForm>(initialCompanionForm);
	const [editingCompanionId, setEditingCompanionId] =
		useState<Id<"tripCompanions"> | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [pendingCompanionId, setPendingCompanionId] =
		useState<Id<"tripCompanions"> | null>(null);

	const updateForm = (key: keyof CompanionForm, value: string) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingCompanionId(null);
		setForm(initialCompanionForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (companion: Doc<"tripCompanions">) => {
		setEditingCompanionId(companion._id);
		setForm({
			email: companion.email ?? "",
			name: companion.name,
			notes: companion.notes ?? "",
			phone: companion.phone ?? "",
			role: companion.role,
		});
		setIsSheetOpen(true);
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before adding companions."
					icon="people-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const handleSaveCompanion = async () => {
		const name = form.name.trim();

		if (!name) {
			return;
		}

		setIsSaving(true);
		try {
			const companionPatch = {
				email: form.email.trim() || undefined,
				name,
				notes: form.notes.trim() || undefined,
				phone: form.phone.trim() || undefined,
				role: form.role.trim() || "traveler",
			};

			if (editingCompanionId) {
				await updateCompanion({
					...companionPatch,
					companionId: editingCompanionId,
				});
			} else {
				await createCompanion({
					...companionPatch,
					tripId,
				});
			}
			setEditingCompanionId(null);
			setForm(initialCompanionForm);
			setIsSheetOpen(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteCompanion = async (companionId: Id<"tripCompanions">) => {
		setPendingCompanionId(companionId);
		try {
			await deleteCompanion({ companionId });
		} finally {
			setPendingCompanionId(null);
		}
	};

	if (companions === undefined) {
		return <ScreenLoadingState />;
	}

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Coordinate"
					icon="people-outline"
					subtitle="Travelers, organizers, and emergency contacts for this trip."
					title="Companions"
				/>
				<TripModuleViyaAssistCard
					description="Ask Viya how to coordinate roles, contacts, and group reminders."
					moduleLabel="companions"
					tripId={tripId}
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
							<Ionicons color="#0A84FF" name="people-outline" size={20} />
						</View>
						<View className="flex-1 gap-1">
							<Text type="body" weight="bold">
								{companions.length} companions
							</Text>
							<Text color="muted" type="body-sm">
								Keep group and emergency coordination in the workspace.
							</Text>
						</View>
					</View>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add companion</Button.Label>
					</Button>
				</Surface>

				{companions.length === 0 ? (
					<EmptyState
						description="Add travelers, coordinators, or emergency contacts."
						icon="people-outline"
						title="No companions yet"
					/>
				) : (
					<View className="gap-3">
						{companions.map((companion) => (
							<Surface
								className="gap-3 rounded-[28px] border border-border bg-surface p-5"
								key={companion._id}
							>
								<View className="flex-row flex-wrap gap-2">
									<Chip size="sm" variant="secondary">
										<Chip.Label>{companion.role}</Chip.Label>
									</Chip>
								</View>
								<Text type="body" weight="bold">
									{companion.name}
								</Text>
								{companion.email || companion.phone ? (
									<Text color="muted" type="body-sm">
										{[companion.email, companion.phone]
											.filter(Boolean)
											.join(" · ")}
									</Text>
								) : null}
								{companion.notes ? (
									<Text.Paragraph color="muted" type="body-sm">
										{companion.notes}
									</Text.Paragraph>
								) : null}
								<View className="flex-row flex-wrap gap-2">
									<Button
										className="flex-1"
										onPress={() => openEditSheet(companion)}
										size="sm"
										variant="secondary"
									>
										<Button.Label>Edit</Button.Label>
									</Button>
									<Button
										className="flex-1"
										isDisabled={pendingCompanionId === companion._id}
										onPress={() => {
											handleDeleteCompanion(companion._id).catch(
												() => undefined
											);
										}}
										size="sm"
										variant="tertiary"
									>
										<Button.Label>Delete</Button.Label>
									</Button>
								</View>
							</Surface>
						))}
					</View>
				)}
			</View>
			<CompanionSheet
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingCompanionId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsSheetOpen(isOpen);
					if (!isOpen) {
						setEditingCompanionId(null);
						setForm(initialCompanionForm);
					}
				}}
				onSubmit={() => {
					handleSaveCompanion().catch(() => undefined);
				}}
				onUpdateForm={updateForm}
			/>
		</Container>
	);
}
