import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
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
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
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
				className="min-h-28 rounded-[18px] border border-border bg-surface px-4 py-3"
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

function NoteCategoryPicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				CATEGORY
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{noteCategoryOptions.map((category) => (
					<Button
						key={category}
						onPress={() => onChange(category)}
						size="sm"
						variant={value === category ? "primary" : "secondary"}
					>
						<Button.Label>{formatNoteCategoryLabel(category)}</Button.Label>
					</Button>
				))}
			</View>
		</View>
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
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["76%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit" ? "Edit trip note" : "Add trip note"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Save decisions, constraints, reminders, and shared context.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close trip note form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 460 }}
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
						</ScrollView>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save note" : "Add note"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
		<Surface className="gap-3 rounded-[28px] border border-border bg-surface p-5">
			<View className="flex-row flex-wrap gap-2">
				<Chip size="sm" variant="secondary">
					<Chip.Label>{formatNoteCategoryLabel(note.category)}</Chip.Label>
				</Chip>
				{relatedEntityLabel ? (
					<Chip size="sm" variant="secondary">
						<Chip.Label>{relatedEntityLabel}</Chip.Label>
					</Chip>
				) : null}
			</View>
			<Text type="body" weight="bold">
				{note.title}
			</Text>
			<Text.Paragraph color="muted" type="body-sm">
				{note.body}
			</Text.Paragraph>
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
					onPress={onEdit}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Edit</Button.Label>
				</Button>
				<Button
					className="flex-1"
					isDisabled={isPending}
					onPress={onDelete}
					size="sm"
					variant="tertiary"
				>
					<Button.Label>Delete</Button.Label>
				</Button>
			</View>
		</Surface>
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

	if (workspace === undefined) {
		return <ScreenLoadingState />;
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

	return (
		<TripModuleScreenFrame activeTab="notes" tripId={tripId}>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Write decisions, constraints, reminders, and group context directly into the trip workspace."
						moduleLabel="notes"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="document-text-outline"
						primaryActionLabel="Add note"
					/>

					<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Decision notebook
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Keep decisions, constraints, and reminders close to planning.
								</Text>
							</View>
							<View
								className="h-11 w-11 items-center justify-center rounded-full"
								style={{ backgroundColor: "rgba(255, 149, 0, 0.12)" }}
							>
								<Ionicons
									color="#FF9500"
									name="document-text-outline"
									size={20}
								/>
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<Chip size="sm" variant="secondary">
								<Chip.Label>{notes.length} notes</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{categoryCount} categories</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{actionNoteCount} action notes</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{linkedNoteCount} linked</Chip.Label>
							</Chip>
						</View>
						<View className="gap-3 rounded-[24px] bg-surface p-4">
							<View className="flex-row items-center gap-3">
								<View
									className="h-9 w-9 items-center justify-center rounded-full"
									style={{ backgroundColor: "rgba(255, 149, 0, 0.14)" }}
								>
									<Ionicons color="#FF9500" name="bookmark-outline" size={18} />
								</View>
								<View className="min-w-0 flex-1 gap-1">
									<Text color="muted" type="body-xs" weight="semibold">
										LATEST CONTEXT
									</Text>
									<Text numberOfLines={1} type="body-sm" weight="bold">
										{latestNote?.title ?? "No context captured yet"}
									</Text>
								</View>
							</View>
							<Text.Paragraph color="muted" type="body-sm">
								{latestNote
									? latestNote.body
									: "Add the first trip note to preserve group decisions, constraints, or reminders."}
							</Text.Paragraph>
							{latestNote ? (
								<View className="gap-3">
									<View className="flex-row flex-wrap gap-2">
										<Chip size="sm" variant="secondary">
											<Chip.Label>
												{formatNoteCategoryLabel(latestNote.category)}
											</Chip.Label>
										</Chip>
										{latestNoteRelatedLabel ? (
											<Chip size="sm" variant="secondary">
												<Chip.Label>{latestNoteRelatedLabel}</Chip.Label>
											</Chip>
										) : null}
									</View>
									<View className="flex-row flex-wrap gap-2">
										<Button
											className="flex-1"
											onPress={() => openEditSheet(latestNote)}
											size="sm"
											variant="secondary"
										>
											<Ionicons
												color="#0A84FF"
												name="create-outline"
												size={15}
											/>
											<Button.Label>Review latest</Button.Label>
										</Button>
										{latestNoteRelatedHref ? (
											<Link asChild href={latestNoteRelatedHref}>
												<Button
													className="flex-1"
													size="sm"
													variant="secondary"
												>
													<Ionicons
														color="#0A84FF"
														name="open-outline"
														size={15}
													/>
													<Button.Label>Open latest link</Button.Label>
												</Button>
											</Link>
										) : null}
									</View>
								</View>
							) : (
								<Button
									className="self-start"
									onPress={openCreateSheet}
									size="sm"
									variant="secondary"
								>
									<Ionicons color="#0A84FF" name="add-outline" size={15} />
									<Button.Label>Add first note</Button.Label>
								</Button>
							)}
						</View>
					</Surface>

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
						<View className="gap-3">
							{notes.map((note) => (
								<NoteCard
									isPending={pendingNoteId === note._id}
									key={note._id}
									note={note}
									onDelete={() => {
										handleDeleteNote(note._id).catch(() => undefined);
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
