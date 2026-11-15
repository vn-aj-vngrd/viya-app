import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getCompanionCounts, getTravelerCount } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Linking, View } from "react-native";
import {
	AppText,
	EmptyState,
	Icon,
	ListGroup,
	ListRow,
	metrics,
	radius,
	ScreenShell,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	FormError,
	RecordSheet,
	SwipeRow,
} from "@/src/features/bookings/module-kit";
import { formatCount, formatEnumLabel } from "@/src/lib/format";
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

const initialLeadCompanionForm: CompanionForm = {
	...initialCompanionForm,
	role: "organizer",
};

const companionRoleOptions = [
	"traveler",
	"organizer",
	"emergencyContact",
	"driver",
	"payer",
	"localContact",
	"child",
	"other",
] as const;

const unsafePhoneUriCharactersPattern = /[^\d+]/g;

const getPhoneContactUrl = (scheme: "sms" | "tel", phone: string) =>
	`${scheme}:${phone.replace(unsafePhoneUriCharactersPattern, "")}`;

const getEmailContactUrl = (email: string) => `mailto:${email.trim()}`;

/** Neutral initials circle; no colour, no badge. */
function Monogram({ name }: { name: string }) {
	const { palette } = useUITheme();

	return (
		<View
			accessibilityElementsHidden={true}
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: metrics.minTarget,
				justifyContent: "center",
				width: metrics.minTarget,
			}}
		>
			<AppText bold={true} tone="secondary" variant="headline">
				{name.trim().charAt(0).toUpperCase()}
			</AppText>
		</View>
	);
}

function CompanionSheet({
	companion,
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onDelete,
	onOpenChange,
	onOpenContact,
	onSubmit,
	onUpdateForm,
}: {
	companion: Doc<"tripCompanions"> | null;
	errorMessage: string | null;
	form: CompanionForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onDelete: (() => void) | null;
	onOpenChange: (isOpen: boolean) => void;
	onOpenContact: (url: string) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof CompanionForm, value: string) => void;
}) {
	const hasContact = Boolean(companion?.phone || companion?.email);

	return (
		<RecordSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSave={onSubmit}
			title={mode === "edit" ? "Traveler" : "Add traveler"}
		>
			{mode === "edit" && hasContact ? (
				<ListGroup>
					{companion?.phone ? (
						<ListRow
							leading={<Icon name="call-outline" size={20} tone="secondary" />}
							onPress={() =>
								onOpenContact(getPhoneContactUrl("tel", companion.phone ?? ""))
							}
							showChevron={false}
							title="Call"
							value={companion.phone}
						/>
					) : null}
					{companion?.phone ? (
						<ListRow
							leading={
								<Icon name="chatbubble-outline" size={20} tone="secondary" />
							}
							onPress={() =>
								onOpenContact(getPhoneContactUrl("sms", companion.phone ?? ""))
							}
							showChevron={false}
							title="Message"
						/>
					) : null}
					{companion?.email ? (
						<ListRow
							leading={<Icon name="mail-outline" size={20} tone="secondary" />}
							onPress={() =>
								onOpenContact(getEmailContactUrl(companion.email ?? ""))
							}
							showChevron={false}
							title="Email"
							value={companion.email}
						/>
					) : null}
				</ListGroup>
			) : null}
			<FieldGroup>
				<FieldRow
					autoCapitalize="words"
					label="Name"
					onChangeText={(value) => onUpdateForm("name", value)}
					placeholder="Alex Reyes"
					value={form.name}
				/>
				<FieldRow
					autoCapitalize="none"
					label="Email"
					onChangeText={(value) => onUpdateForm("email", value)}
					placeholder="Optional"
					value={form.email}
				/>
				<FieldRow
					label="Phone"
					onChangeText={(value) => onUpdateForm("phone", value)}
					placeholder="Optional"
					value={form.phone}
				/>
				<FieldRow
					label="Notes"
					multiline={true}
					onChangeText={(value) => onUpdateForm("notes", value)}
					placeholder="Dietary needs, tasks"
					value={form.notes}
				/>
				<ChoiceRow
					format={formatEnumLabel}
					label="Role"
					onChange={(value) => onUpdateForm("role", value)}
					options={companionRoleOptions}
					value={form.role}
				/>
			</FieldGroup>
			{onDelete ? (
				<ListGroup>
					<ListRow
						destructive={true}
						onPress={onDelete}
						title="Delete traveler"
					/>
				</ListGroup>
			) : null}
		</RecordSheet>
	);
}

function getTravelersSummary(
	companions: readonly { role: string }[],
	expectedTravelers: number | null
) {
	if (companions.length === 0) {
		return;
	}

	const counts = getCompanionCounts(companions);
	const notAddedYet =
		expectedTravelers !== null && expectedTravelers > counts.travelers
			? expectedTravelers - counts.travelers
			: 0;

	return [
		formatCount(counts.travelers, "traveler"),
		counts.contacts > 0 ? formatCount(counts.contacts, "contact") : null,
		notAddedYet > 0 ? `${notAddedYet} not added yet` : null,
	]
		.filter(Boolean)
		.join(" · ");
}

export function TripCompanionsScreen() {
	const tripId = useTripIdParam();
	const companions = useQuery(
		api.companions.listTripCompanions,
		tripId ? { tripId } : "skip"
	);
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const readinessItems = useQuery(
		api.readiness.listReadinessItems,
		tripId ? { tripId } : "skip"
	);
	const createCompanion = useMutation(api.companions.createTripCompanion);
	const updateCompanion = useMutation(api.companions.updateTripCompanion);
	const deleteCompanion = useMutation(api.companions.deleteTripCompanion);
	const { confirm } = useFeedback();
	const [form, setForm] = useState<CompanionForm>(initialCompanionForm);
	const [editingCompanionId, setEditingCompanionId] =
		useState<Id<"tripCompanions"> | null>(null);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [screenErrorMessage, setScreenErrorMessage] = useState<string | null>(
		null
	);
	const [sheetErrorMessage, setSheetErrorMessage] = useState<string | null>(
		null
	);

	const updateForm = (key: keyof CompanionForm, value: string) => {
		setSheetErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCompanionSheet = (nextForm: CompanionForm) => {
		setSheetErrorMessage(null);
		setEditingCompanionId(null);
		setForm(nextForm);
		setIsSheetOpen(true);
	};
	const openCreateSheet = () => {
		openCompanionSheet(initialCompanionForm);
	};
	const openLeadContactSheet = () => {
		openCompanionSheet(initialLeadCompanionForm);
	};
	const openEditSheet = (companion: Doc<"tripCompanions">) => {
		setSheetErrorMessage(null);
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
	const closeSheet = () => {
		setIsSheetOpen(false);
		setEditingCompanionId(null);
		setSheetErrorMessage(null);
		setForm(initialCompanionForm);
	};

	if (!tripId) {
		return (
			<ScreenShell
				state={{
					description: "Open a saved trip to see who is traveling.",
					icon: "people-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Travelers"
			/>
		);
	}

	if (companions === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading travelers" }}
				title="Travelers"
			/>
		);
	}

	const handleSaveCompanion = async () => {
		const name = form.name.trim();

		if (!name) {
			setSheetErrorMessage("Add a name.");
			return;
		}

		setSheetErrorMessage(null);
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
				await createCompanion({ ...companionPatch, tripId });
			}
			closeSheet();
		} catch {
			setSheetErrorMessage("Could not save this traveler. Try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleOpenContact = async (url: string) => {
		setSheetErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setSheetErrorMessage("Could not open that app on this device.");
		}
	};

	const handleDeleteCompanion = async (companionId: Id<"tripCompanions">) => {
		setScreenErrorMessage(null);
		try {
			await deleteCompanion({ companionId });
		} catch {
			setScreenErrorMessage("Could not delete this traveler. Try again.");
		}
	};

	const confirmDeleteCompanion = async (companion: Doc<"tripCompanions">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete traveler",
			destructive: true,
			message: `${companion.name} will be removed from this trip.`,
			title: "Delete traveler?",
		});
		if (confirmed) {
			closeSheet();
			await handleDeleteCompanion(companion._id);
		}
	};
	const openContact = (url: string) => {
		handleOpenContact(url).catch(() => undefined);
	};

	const sortedCompanions = [...companions].sort(
		(a, b) => Number(b.role === "organizer") - Number(a.role === "organizer")
	);
	const editingCompanion =
		companions.find((companion) => companion._id === editingCompanionId) ??
		null;

	const expectedTravelers = workspace
		? getTravelerCount(workspace.trip, companions)
		: null;
	const summary = getTravelersSummary(companions, expectedTravelers);
	const getOpenTaskCount = (companionId: string) =>
		(readinessItems ?? []).filter(
			(item) =>
				item.assignedToMemberId === companionId &&
				item.status !== "done" &&
				item.status !== "ignored"
		).length;
	const emptyDescription =
		expectedTravelers !== null && expectedTravelers > 1
			? `This trip is for ${expectedTravelers}. Add each person so tasks and contacts have an owner.`
			: "Add the people on this trip, starting with you.";

	return (
		<>
			<ScreenShell
				actions={
					companions.length > 0
						? [
								{
									icon: "person-add-outline",
									key: "add",
									label: "Add traveler",
									onPress: openCreateSheet,
									type: "button",
								},
							]
						: []
				}
				summary={summary}
				title="Travelers"
			>
				<FormError message={screenErrorMessage} />
				{companions.length === 0 ? (
					<EmptyState
						action={{ label: "Add traveler", onPress: openLeadContactSheet }}
						description={emptyDescription}
						icon="people-outline"
						title={
							expectedTravelers !== null && expectedTravelers > 1
								? "No travelers added"
								: "No travelers yet"
						}
					/>
				) : (
					<ListGroup>
						{sortedCompanions.map((companion) => (
							<SwipeRow
								key={companion._id}
								trailing={{
									icon: "trash-outline",
									label: "Delete",
									onPress: () => {
										confirmDeleteCompanion(companion).catch(() => undefined);
									},
									tone: "danger",
								}}
							>
								<ListRow
									accessibilityLabel={`${companion.name}, ${formatEnumLabel(companion.role)}. Open`}
									leading={<Monogram name={companion.name} />}
									onPress={() => openEditSheet(companion)}
									showChevron={false}
									subtitle={
										[
											companion.phone,
											companion.email,
											getOpenTaskCount(companion._id) > 0
												? formatCount(
														getOpenTaskCount(companion._id),
														"open task"
													)
												: null,
										]
											.filter(Boolean)
											.join(" · ") || undefined
									}
									title={companion.name}
									value={formatEnumLabel(companion.role)}
								/>
							</SwipeRow>
						))}
					</ListGroup>
				)}
			</ScreenShell>
			<CompanionSheet
				companion={editingCompanion}
				errorMessage={sheetErrorMessage}
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingCompanionId ? "edit" : "create"}
				onDelete={
					editingCompanion
						? () => {
								confirmDeleteCompanion(editingCompanion).catch(() => undefined);
							}
						: null
				}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						closeSheet();
					}
				}}
				onOpenContact={openContact}
				onSubmit={() => {
					handleSaveCompanion().catch(() => undefined);
				}}
				onUpdateForm={updateForm}
			/>
		</>
	);
}
