import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, TextInput } from "react-native";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	Chip,
	EmptyState,
	Icon,
	inputThemeProps,
	ListGroup,
	ListRow,
	metrics,
	ScreenShell,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	FormError,
	RecordSheet,
	SwipeRow,
} from "@/src/features/bookings/module-kit";
import {
	formatCount,
	formatEnumLabel,
	formatRelativeDay,
} from "@/src/lib/format";
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

const BODY_MIN_HEIGHT = 160;
const BODY_FONT_SIZE = 17;

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

const getFirstLine = (body: string) =>
	body
		.split("\n")
		.map((line) => line.trim())
		.find(Boolean);

function NoteBodyField({
	onChangeText,
	value,
}: {
	onChangeText: (value: string) => void;
	value: string;
}) {
	const { palette } = useUITheme();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextInput
			accessibilityLabel="Note"
			multiline={true}
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder="What should the group remember?"
			{...inputThemeProps(palette)}
			style={{
				color: palette.ink,
				fontSize: BODY_FONT_SIZE,
				minHeight: BODY_MIN_HEIGHT,
				paddingHorizontal: spacing.lg,
				paddingTop: spacing.md,
				textAlignVertical: "top",
			}}
			value={value}
		/>
	);
}

function NoteSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onDelete,
	onOpenChange,
	onOpenLinked,
	onSubmit,
	onUpdateForm,
	relatedEntityOptions,
}: {
	errorMessage: string | null;
	form: NoteForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onDelete: (() => void) | null;
	onOpenChange: (isOpen: boolean) => void;
	onOpenLinked: (() => void) | null;
	onSubmit: () => void;
	onUpdateForm: (key: keyof NoteForm, value: string) => void;
	relatedEntityOptions: TripRelatedEntityOption[];
}) {
	const visibleOptions = relatedEntityOptions.slice(0, 12);
	const linkLabels = new Map(
		visibleOptions.map((option) => [
			option.key,
			getCompactRelatedLabel(option.label),
		])
	);

	return (
		<RecordSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSave={onSubmit}
			title={mode === "edit" ? "Edit note" : "New note"}
		>
			<FieldGroup>
				<FieldRow
					label="Title"
					onChangeText={(value) => onUpdateForm("title", value)}
					placeholder="Visa reminder"
					value={form.title}
				/>
				<NoteBodyField
					onChangeText={(value) => onUpdateForm("body", value)}
					value={form.body}
				/>
			</FieldGroup>
			<FieldGroup>
				<ChoiceRow
					format={formatEnumLabel}
					label="Category"
					onChange={(value) => onUpdateForm("category", value)}
					options={noteCategoryOptions}
					value={form.category}
				/>
				{visibleOptions.length > 0 ? (
					<ChoiceRow
						format={(value) => linkLabels.get(value) ?? "None"}
						label="Linked to"
						onChange={(value) => onUpdateForm("relatedEntityKey", value)}
						options={["", ...visibleOptions.map((option) => option.key)]}
						value={form.relatedEntityKey}
					/>
				) : null}
			</FieldGroup>
			{onOpenLinked || onDelete ? (
				<ListGroup>
					{onOpenLinked ? (
						<ListRow
							leading={<Icon name="link-outline" size={20} tone="secondary" />}
							onPress={onOpenLinked}
							title="Open linked item"
						/>
					) : null}
					{onDelete ? (
						<ListRow
							destructive={true}
							onPress={onDelete}
							title="Delete note"
						/>
					) : null}
				</ListGroup>
			) : null}
		</RecordSheet>
	);
}

export function TripNotesScreen() {
	const router = useRouter();
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
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [screenErrorMessage, setScreenErrorMessage] = useState<string | null>(
		null
	);
	const [sheetErrorMessage, setSheetErrorMessage] = useState<string | null>(
		null
	);

	const updateForm = (key: keyof NoteForm, value: string) => {
		setSheetErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setSheetErrorMessage(null);
		setEditingNoteId(null);
		setForm(initialNoteForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (note: Doc<"tripNotes">) => {
		setSheetErrorMessage(null);
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
	const closeSheet = () => {
		setIsSheetOpen(false);
		setEditingNoteId(null);
		setSheetErrorMessage(null);
		setForm(initialNoteForm);
	};

	if (!tripId || workspace === null) {
		return (
			<ScreenShell
				state={{
					description: "This trip was deleted or is no longer available.",
					icon: "document-text-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Notes"
			/>
		);
	}

	if (workspace === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading notes" }}
				title="Notes"
			/>
		);
	}

	const handleSaveNote = async () => {
		const title = form.title.trim();
		const body = form.body.trim();

		if (!(title && body)) {
			setSheetErrorMessage("Add a title and some text.");
			return;
		}

		setSheetErrorMessage(null);
		setIsSaving(true);
		try {
			const notePatch = {
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
				await createTripNote({ ...notePatch, ...relatedEntityFields, tripId });
			}
			closeSheet();
		} catch {
			setSheetErrorMessage("Could not save this note. Try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteNote = async (noteId: Id<"tripNotes">) => {
		setScreenErrorMessage(null);
		try {
			await deleteTripNote({ noteId });
		} catch {
			setScreenErrorMessage("Could not delete this note. Try again.");
		}
	};

	const confirmDeleteNote = async (note: Doc<"tripNotes">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete note",
			destructive: true,
			message: `${note.title} will be removed from this trip.`,
			title: "Delete note?",
		});
		if (confirmed) {
			closeSheet();
			await handleDeleteNote(note._id);
		}
	};

	const notes = workspace.notes;
	const relatedEntityOptions = getTripRelatedEntityOptions(workspace, {
		expenseLimit: 6,
		itineraryItemLimit: 8,
		vaultItemLimit: 6,
	});
	const relatedEntityLabelByKey = getTripRelatedEntityLabelByKey(workspace);
	const categories = noteCategoryOptions.filter((category) =>
		notes.some((note) => note.category === category)
	);
	const activeCategory = categories.some(
		(category) => category === selectedCategory
	)
		? selectedCategory
		: "all";
	const visibleNotes = notes.filter(
		(note) => activeCategory === "all" || note.category === activeCategory
	);
	const editingNote = notes.find((note) => note._id === editingNoteId) ?? null;
	const editingHref = editingNote
		? getNoteRelatedHref({
				relatedEntityType: editingNote.relatedEntityType,
				tripId,
			})
		: null;

	const summary =
		notes.length > 0
			? `${formatCount(notes.length, "note")}${categories.length > 1 ? ` in ${categories.length} categories` : ""}`
			: undefined;

	return (
		<>
			<ScreenShell
				actions={
					notes.length > 0
						? [
								{
									icon: "add",
									key: "add",
									label: "Add trip note",
									onPress: openCreateSheet,
									type: "button",
								},
							]
						: []
				}
				summary={summary}
				title="Notes"
			>
				{categories.length > 1 ? (
					<ScrollView
						contentContainerStyle={{ gap: spacing.sm }}
						horizontal={true}
						showsHorizontalScrollIndicator={false}
						style={{ minHeight: metrics.minTarget }}
					>
						<Chip
							label="All"
							onPress={() => setSelectedCategory("all")}
							selected={activeCategory === "all"}
						/>
						{categories.map((category) => (
							<Chip
								key={category}
								label={formatEnumLabel(category)}
								onPress={() => setSelectedCategory(category)}
								selected={activeCategory === category}
							/>
						))}
					</ScrollView>
				) : null}
				<FormError message={screenErrorMessage} />
				{notes.length === 0 ? (
					<EmptyState
						action={{ label: "Add note", onPress: openCreateSheet }}
						description="Save decisions, reminders and anything the group should remember."
						icon="document-text-outline"
						title="No notes yet"
					/>
				) : (
					<ListGroup>
						{visibleNotes.map((note) => {
							const relatedLabel = getNoteRelatedLabel(
								note,
								relatedEntityLabelByKey
							);

							return (
								<SwipeRow
									key={note._id}
									trailing={{
										icon: "trash-outline",
										label: "Delete",
										onPress: () => {
											confirmDeleteNote(note).catch(() => undefined);
										},
										tone: "danger",
									}}
								>
									<ListRow
										accessibilityLabel={`${note.title}. Edit`}
										onPress={() => openEditSheet(note)}
										showChevron={false}
										subtitle={
											[getFirstLine(note.body), relatedLabel]
												.filter(Boolean)
												.join(" · ") || undefined
										}
										title={note.title}
										value={formatRelativeDay(note.updatedAt)}
									/>
								</SwipeRow>
							);
						})}
					</ListGroup>
				)}
			</ScreenShell>
			<NoteSheet
				errorMessage={sheetErrorMessage}
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingNoteId ? "edit" : "create"}
				onDelete={
					editingNote
						? () => {
								confirmDeleteNote(editingNote).catch(() => undefined);
							}
						: null
				}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						closeSheet();
					}
				}}
				onOpenLinked={
					editingHref
						? () => {
								closeSheet();
								router.push(editingHref);
							}
						: null
				}
				onSubmit={() => {
					handleSaveNote().catch(() => undefined);
				}}
				onUpdateForm={updateForm}
				relatedEntityOptions={relatedEntityOptions}
			/>
		</>
	);
}
