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

import { TripModuleViyaAssistCard } from "./trip-module-viya-assist-card";
import { useTripIdParam } from "./use-trip-id-param";

interface NoteForm {
	body: string;
	category: string;
	title: string;
}

const initialNoteForm: NoteForm = {
	body: "",
	category: "general",
	title: "",
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

function NoteSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: NoteForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof NoteForm, value: string) => void;
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
							<SheetField
								label="Category"
								onChangeText={(value) => onUpdateForm("category", value)}
								placeholder="general, food, safety, work"
								value={form.category}
							/>
							<SheetTextArea
								label="Note"
								onChangeText={(value) => onUpdateForm("body", value)}
								placeholder="What should the group remember?"
								value={form.body}
							/>
						</ScrollView>
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

export function TripNotesScreen() {
	const tripId = useTripIdParam();
	const notes = useQuery(api.notes.listTripNotes, tripId ? { tripId } : "skip");
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

	const updateForm = (key: keyof NoteForm, value: string) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingNoteId(null);
		setForm(initialNoteForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (note: Doc<"tripNotes">) => {
		setEditingNoteId(note._id);
		setForm({
			body: note.body,
			category: note.category,
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
			return;
		}

		setIsSaving(true);
		try {
			const notePatch = {
				body,
				category: form.category.trim() || "general",
				title,
			};

			if (editingNoteId) {
				await updateTripNote({
					...notePatch,
					noteId: editingNoteId,
				});
			} else {
				await createTripNote({
					...notePatch,
					tripId,
				});
			}
			setEditingNoteId(null);
			setForm(initialNoteForm);
			setIsSheetOpen(false);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteNote = async (noteId: Id<"tripNotes">) => {
		setPendingNoteId(noteId);
		try {
			await deleteTripNote({ noteId });
		} finally {
			setPendingNoteId(null);
		}
	};

	if (notes === undefined) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Remember"
					icon="document-text-outline"
					subtitle="Trip decisions, constraints, group reminders, and context."
					title="Notes"
				/>
				<TripModuleViyaAssistCard
					description="Ask Viya to turn notes into planning tasks, reminders, or itinerary context."
					moduleLabel="notes"
					tripId={tripId}
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
							<Ionicons
								color="#0A84FF"
								name="document-text-outline"
								size={20}
							/>
						</View>
						<View className="flex-1 gap-1">
							<Text type="body" weight="bold">
								{notes.length} notes
							</Text>
							<Text color="muted" type="body-sm">
								Keep shared decisions close to the trip workspace.
							</Text>
						</View>
					</View>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add note</Button.Label>
					</Button>
				</Surface>

				{notes.length === 0 ? (
					<EmptyState
						description="Save group decisions, dietary notes, meeting details, or constraints."
						icon="document-text-outline"
						title="No notes yet"
					/>
				) : (
					<View className="gap-3">
						{notes.map((note) => (
							<Surface
								className="gap-3 rounded-[28px] border border-border bg-surface p-5"
								key={note._id}
							>
								<View className="flex-row flex-wrap gap-2">
									<Chip size="sm" variant="secondary">
										<Chip.Label>{note.category}</Chip.Label>
									</Chip>
								</View>
								<Text type="body" weight="bold">
									{note.title}
								</Text>
								<Text.Paragraph color="muted" type="body-sm">
									{note.body}
								</Text.Paragraph>
								<View className="flex-row flex-wrap gap-2">
									<Button
										className="flex-1"
										onPress={() => openEditSheet(note)}
										size="sm"
										variant="secondary"
									>
										<Button.Label>Edit</Button.Label>
									</Button>
									<Button
										className="flex-1"
										isDisabled={pendingNoteId === note._id}
										onPress={() => {
											handleDeleteNote(note._id).catch(() => undefined);
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
			<NoteSheet
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingNoteId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsSheetOpen(isOpen);
					if (!isOpen) {
						setEditingNoteId(null);
						setForm(initialNoteForm);
					}
				}}
				onSubmit={() => {
					handleSaveNote().catch(() => undefined);
				}}
				onUpdateForm={updateForm}
			/>
		</Container>
	);
}
