import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link } from "expo-router";
import { Menu } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Container } from "@/components/container";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import {
	AppText,
	Card,
	Chip,
	EmptyState,
	LoadingState,
	PrimaryButton,
	radius,
	SecondaryButton,
	SectionHeader,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import {
	ChoiceChips,
	FormSheet,
	MenuDivider,
	MenuIcon,
	MenuTrigger,
	menuContentClassName,
	menuItemClassName,
	SheetField,
	SheetTextArea,
	TagRow,
} from "./trip-module-form-kit";
import { TripModuleManualEntryCard } from "./trip-module-manual-entry-card";
import {
	getCompactRelatedLabel,
	getRelatedEntityKey,
	getRelatedEntityMutationFields,
	getTripRelatedEntityLabel,
	getTripRelatedEntityLabelByKey,
	getTripRelatedEntityOptions,
	type TripRelatedEntityOption,
} from "./trip-related-entities";
import { useTripIdParam } from "./use-trip-id-param";

interface NoteForm {
	body: string;
	category: string;
	relatedEntityKey: string;
	title: string;
}

const initialNoteForm: NoteForm = {
	body: "",
	category: "general",
	relatedEntityKey: "",
	title: "",
};

const noteCategoryOptions = [
	"general",
	"food",
	"safety",
	"work",
	"budget",
	"booking",
	"document",
	"group",
	"reminder",
] as const;

const actionNoteCategories = new Set([
	"booking",
	"document",
	"reminder",
	"safety",
]);

const formatNoteCategoryLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

const getNoteRelatedLabel = (
	note: Doc<"tripNotes">,
	relatedEntityLabelByKey: Map<string, string>
) =>
	getTripRelatedEntityLabel(
		{
			relatedEntityId: note.relatedEntityId,
			relatedEntityType: note.relatedEntityType,
		},
		relatedEntityLabelByKey
	);

const getNoteRelatedHref = ({
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

function NoteCategoryPicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<ChoiceChips label="Category">
			{noteCategoryOptions.map((category) => (
				<Chip
					key={category}
					label={formatNoteCategoryLabel(category)}
					onPress={() => onChange(category)}
					selected={value === category}
				/>
			))}
		</ChoiceChips>
	);
}

function NoteRelatedEntityPicker({
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
			<ChoiceChips label="Link to trip item">
				<Chip label="None" onPress={() => onChange("")} selected={!value} />
				{visibleOptions.map((option) => (
					<Chip
						key={option.key}
						label={getCompactRelatedLabel(option.label)}
						onPress={() => onChange(option.key)}
						selected={value === option.key}
					/>
				))}
			</ChoiceChips>
			{options.length > visibleOptions.length ? (
				<AppText tone="tertiary" variant="footnote">
					Showing the most relevant {visibleOptions.length} trip items.
				</AppText>
			) : null}
		</View>
	);
}

function NoteSheet({
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
	form: NoteForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof NoteForm, value: string) => void;
	relatedEntityOptions: TripRelatedEntityOption[];
}) {
	return (
		<FormSheet
			description="Save decisions, constraints, reminders, and shared context."
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			saveLabel={mode === "edit" ? "Save note" : "Add note"}
			snapPoint="76%"
			title={mode === "edit" ? "Edit trip note" : "Add trip note"}
		>
			<SheetField
				label="Title"
				onChangeText={(value) => onUpdateForm("title", value)}
				placeholder="Visa reminder"
				value={form.title}
			/>
			<NoteCategoryPicker
				onChange={(value) => onUpdateForm("category", value)}
				value={form.category}
			/>
			<NoteRelatedEntityPicker
				onChange={(value) => onUpdateForm("relatedEntityKey", value)}
				options={relatedEntityOptions}
				value={form.relatedEntityKey}
			/>
			<SheetTextArea
				label="Note"
				onChangeText={(value) => onUpdateForm("body", value)}
				placeholder="What should the group remember?"
				value={form.body}
			/>
		</FormSheet>
	);
}

function NoteCard({
	isPending,
	note,
	onDelete,
	onEdit,
	relatedEntityHref,
	relatedEntityLabel,
}: {
	isPending: boolean;
	note: Doc<"tripNotes">;
	onDelete: () => void;
	onEdit: () => void;
	relatedEntityHref: Href | null;
	relatedEntityLabel: string | null;
}) {
	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			style={{ opacity: isPending ? 0.6 : 1 }}
		>
			<Card padding="md">
				<View
					style={{
						alignItems: "flex-start",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<View style={{ flex: 1, gap: spacing.sm, minWidth: 0 }}>
						<TagRow
							labels={[
								formatNoteCategoryLabel(note.category),
								...(relatedEntityLabel ? [relatedEntityLabel] : []),
							]}
						/>
						<AppText variant="headline">{note.title}</AppText>
						<AppText tone="secondary" variant="subhead">
							{note.body}
						</AppText>
						{relatedEntityHref ? (
							<Link asChild href={relatedEntityHref}>
								<SecondaryButton
									fullWidth={false}
									icon="open-outline"
									label="Open linked item"
									onPress={() => undefined}
									variant="plain"
								/>
							</Link>
						) : null}
					</View>
					<Menu>
						<Menu.Trigger asChild={true}>
							<MenuTrigger label="Note options" />
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Overlay />
							<Menu.Content
								align="end"
								className={menuContentClassName}
								offset={8}
								placement="bottom"
								presentation="popover"
								width={200}
							>
								<Menu.Item
									accessibilityLabel="Edit note"
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									onPress={onEdit}
								>
									<MenuIcon name="create-outline" />
									<Menu.ItemTitle className="text-base">
										Edit note
									</Menu.ItemTitle>
								</Menu.Item>
								<MenuDivider />
								<Menu.Item
									accessibilityLabel="Delete note"
									className={menuItemClassName}
									isAnimatedStyleActive={false}
									isDisabled={isPending}
									onPress={onDelete}
								>
									<MenuIcon destructive={true} name="trash-outline" />
									<Menu.ItemTitle className="text-base text-danger">
										Delete note
									</Menu.ItemTitle>
								</Menu.Item>
							</Menu.Content>
						</Menu.Portal>
					</Menu>
				</View>
			</Card>
		</Animated.View>
	);
}

export function TripNotesScreen() {
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const createTripNote = useMutation(api.notes.createTripNote);
	const updateTripNote = useMutation(api.notes.updateTripNote);
	const deleteTripNote = useMutation(api.notes.deleteTripNote);
	const { confirm } = useFeedback();
	const [form, setForm] = useState<NoteForm>(initialNoteForm);
	const [editingNoteId, setEditingNoteId] = useState<Id<"tripNotes"> | null>(
		null
	);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [pendingNoteId, setPendingNoteId] = useState<Id<"tripNotes"> | null>(
		null
	);
	const [noteErrorMessage, setNoteErrorMessage] = useState<string | null>(null);

	const updateForm = (key: keyof NoteForm, value: string) => {
		setNoteErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setNoteErrorMessage(null);
		setEditingNoteId(null);
		setForm(initialNoteForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (note: Doc<"tripNotes">) => {
		setNoteErrorMessage(null);
		setEditingNoteId(note._id);
		setForm({
			body: note.body,
			category: note.category,
			relatedEntityKey: getRelatedEntityKey({
				id: note.relatedEntityId,
				type: note.relatedEntityType,
			}),
			title: note.title,
		});
		setIsSheetOpen(true);
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before adding notes."
					icon="document-text-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const handleSaveNote = async () => {
		const title = form.title.trim();
		const body = form.body.trim();

		if (!(title && body)) {
			setNoteErrorMessage("Add a note title and body.");
			return;
		}

		setNoteErrorMessage(null);
		setIsSaving(true);
		try {
			const notePatch: {
				body: string;
				category: string;
				relatedEntityId?: string;
				relatedEntityType?: string;
				title: string;
			} = {
				body,
				category: form.category.trim() || "general",
				title,
			};
			const relatedEntityFields = getRelatedEntityMutationFields({
				relatedEntityKey: form.relatedEntityKey,
				shouldClear: Boolean(editingNoteId),
			});

			if (editingNoteId) {
				await updateTripNote({
					...notePatch,
					...relatedEntityFields,
					noteId: editingNoteId,
				});
			} else {
				await createTripNote({
					...notePatch,
					...relatedEntityFields,
					tripId,
				});
			}
			setEditingNoteId(null);
			setForm(initialNoteForm);
			setIsSheetOpen(false);
		} catch {
			setNoteErrorMessage("Could not save note.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteNote = async (noteId: Id<"tripNotes">) => {
		setPendingNoteId(noteId);
		try {
			await deleteTripNote({ noteId });
		} catch {
			setNoteErrorMessage("Could not delete note.");
		} finally {
			setPendingNoteId(null);
		}
	};

	if (workspace === null) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="This trip was deleted or is no longer available."
					icon="document-text-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined) {
		return <LoadingState title="Loading notes" />;
	}

	const notes = workspace.notes;
	const relatedEntityOptions = getTripRelatedEntityOptions(workspace, {
		expenseLimit: 6,
		itineraryItemLimit: 8,
		vaultItemLimit: 6,
	});
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(workspace);
	const latestNote = notes.at(0) ?? null;
	const categoryCount = new Set(notes.map((note) => note.category)).size;
	const actionNoteCount = notes.filter((note) =>
		actionNoteCategories.has(note.category)
	).length;
	const linkedNoteCount = notes.filter(
		(note) => note.relatedEntityId && note.relatedEntityType
	).length;
	const latestNoteRelatedLabel = latestNote
		? getNoteRelatedLabel(latestNote, relatedEntityLabelByKey)
		: null;
	const latestNoteRelatedHref = latestNote
		? getNoteRelatedHref({
				relatedEntityType: latestNote.relatedEntityType,
				tripId,
			})
		: null;

	const confirmDeleteNote = async (note: Doc<"tripNotes">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete",
			destructive: true,
			message: "This note will be removed from the trip.",
			title: `Delete ${note.title}?`,
		});
		if (confirmed) {
			await handleDeleteNote(note._id);
		}
	};

	return (
		<TripModuleScreenFrame
			activeTab="notes"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add trip note"
					icon="add"
					onPress={openCreateSheet}
				/>
			}
			tripId={tripId}
		>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
					<TripModuleManualEntryCard
						description="Write decisions, constraints, reminders, and group context directly into the trip workspace."
						moduleLabel="notes"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="document-text-outline"
						primaryActionLabel="Add note"
					/>

					<Card>
						<View style={{ gap: spacing.lg }}>
							<SectionHeader eyebrow="Decision notebook" title="Trip context" />
							<AppText tone="secondary" variant="subhead">
								Keep decisions, constraints, and reminders close to planning.
							</AppText>
							<TagRow
								labels={[
									`${notes.length} notes`,
									`${categoryCount} categories`,
									`${actionNoteCount} action notes`,
									`${linkedNoteCount} linked`,
								]}
							/>
							<LatestNoteSummary
								latestNote={latestNote}
								latestNoteRelatedHref={latestNoteRelatedHref}
								latestNoteRelatedLabel={latestNoteRelatedLabel}
								onCreate={openCreateSheet}
								onReview={() => {
									if (latestNote) {
										openEditSheet(latestNote);
									}
								}}
							/>
						</View>
					</Card>

					{notes.length === 0 ? (
						<EmptyState
							action={{
								label: "Add note",
								onPress: openCreateSheet,
							}}
							description="Save group decisions, dietary notes, meeting details, or constraints."
							icon="document-text-outline"
							title="No notes yet"
						/>
					) : (
						<View style={{ gap: spacing.md }}>
							{notes.map((note) => (
								<NoteCard
									isPending={pendingNoteId === note._id}
									key={note._id}
									note={note}
									onDelete={() => {
										confirmDeleteNote(note).catch(() => undefined);
									}}
									onEdit={() => openEditSheet(note)}
									relatedEntityHref={getNoteRelatedHref({
										relatedEntityType: note.relatedEntityType,
										tripId,
									})}
									relatedEntityLabel={getNoteRelatedLabel(
										note,
										relatedEntityLabelByKey
									)}
								/>
							))}
						</View>
					)}
				</View>
				<NoteSheet
					errorMessage={noteErrorMessage}
					form={form}
					isOpen={isSheetOpen}
					isSaving={isSaving}
					mode={editingNoteId ? "edit" : "create"}
					onOpenChange={(isOpen) => {
						setIsSheetOpen(isOpen);
						if (!isOpen) {
							setEditingNoteId(null);
							setNoteErrorMessage(null);
							setForm(initialNoteForm);
						}
					}}
					onSubmit={() => {
						handleSaveNote().catch(() => undefined);
					}}
					onUpdateForm={updateForm}
					relatedEntityOptions={relatedEntityOptions}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}

function LatestNoteSummary({
	latestNote,
	latestNoteRelatedHref,
	latestNoteRelatedLabel,
	onCreate,
	onReview,
}: {
	latestNote: Doc<"tripNotes"> | null;
	latestNoteRelatedHref: Href | null;
	latestNoteRelatedLabel: string | null;
	onCreate: () => void;
	onReview: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.group,
				gap: spacing.md,
				padding: spacing.lg,
			}}
		>
			<View style={{ gap: 2 }}>
				<AppText tone="secondary" variant="eyebrow">
					Latest context
				</AppText>
				<AppText numberOfLines={1} variant="headline">
					{latestNote?.title ?? "No context captured yet"}
				</AppText>
			</View>
			<AppText tone="secondary" variant="subhead">
				{latestNote
					? latestNote.body
					: "Add the first trip note to preserve group decisions, constraints, or reminders."}
			</AppText>
			{latestNote ? (
				<View style={{ gap: spacing.md }}>
					<TagRow
						labels={[
							formatNoteCategoryLabel(latestNote.category),
							...(latestNoteRelatedLabel ? [latestNoteRelatedLabel] : []),
						]}
					/>
					<SecondaryButton
						icon="create-outline"
						label="Review latest"
						onPress={onReview}
					/>
					{latestNoteRelatedHref ? (
						<Link asChild href={latestNoteRelatedHref}>
							<SecondaryButton
								icon="open-outline"
								label="Open latest link"
								onPress={() => undefined}
								variant="plain"
							/>
						</Link>
					) : null}
				</View>
			) : (
				<PrimaryButton
					fullWidth={false}
					icon="add-outline"
					label="Add first note"
					onPress={onCreate}
				/>
			)}
		</View>
	);
}
