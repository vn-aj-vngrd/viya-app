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

interface MomentForm {
	caption: string;
	locationName: string;
	note: string;
	title: string;
}

const initialMomentForm: MomentForm = {
	caption: "",
	locationName: "",
	note: "",
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

function MomentSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	form: MomentForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof MomentForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();

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
									{mode === "edit" ? "Edit moment" : "Add moment"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Capture highlights that power the recap.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close moment form"
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
								placeholder="Sunset dinner"
								value={form.title}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Place or area"
								value={form.locationName}
							/>
							<SheetField
								label="Caption"
								onChangeText={(value) => onUpdateForm("caption", value)}
								placeholder="Short recap caption"
								value={form.caption}
							/>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("note", value)}
								placeholder="What happened?"
								value={form.note}
							/>
						</ScrollView>
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Save moment</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function TripMomentsScreen() {
	const tripId = useTripIdParam();
	const moments = useQuery(
		api.moments.listTripMoments,
		tripId ? { tripId } : "skip"
	);
	const createMoment = useMutation(api.moments.createMoment);
	const deleteMoment = useMutation(api.moments.deleteMoment);
	const toggleMomentHighlight = useMutation(api.moments.toggleMomentHighlight);
	const updateMoment = useMutation(api.moments.updateMoment);
	const [form, setForm] = useState<MomentForm>(initialMomentForm);
	const [editingMomentId, setEditingMomentId] = useState<Id<"moments"> | null>(
		null
	);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [pendingMomentId, setPendingMomentId] = useState<Id<"moments"> | null>(
		null
	);

	const updateForm = (key: keyof MomentForm, value: string) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingMomentId(null);
		setForm(initialMomentForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (moment: Doc<"moments">) => {
		setEditingMomentId(moment._id);
		setForm({
			caption: moment.caption,
			locationName: moment.locationName,
			note: moment.note,
			title: moment.title,
		});
		setIsSheetOpen(true);
	};

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before saving moments."
					icon="images-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const handleSaveMoment = async () => {
		const title = form.title.trim();
		if (!title) {
			return;
		}

		setIsSaving(true);
		try {
			const momentPatch = {
				caption: form.caption.trim() || title,
				locationName: form.locationName.trim(),
				note: form.note.trim(),
				title,
			};

			if (editingMomentId) {
				await updateMoment({
					...momentPatch,
					momentId: editingMomentId,
				});
			} else {
				await createMoment({
					...momentPatch,
					tripId,
				});
			}
			setForm(initialMomentForm);
			setEditingMomentId(null);
			setIsSheetOpen(false);
		} finally {
			setIsSaving(false);
		}
	};

	const runMomentAction = async (
		momentId: Id<"moments">,
		action: () => Promise<unknown>
	) => {
		setPendingMomentId(momentId);
		try {
			await action();
		} finally {
			setPendingMomentId(null);
		}
	};

	if (moments === undefined) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const highlightCount = moments.filter((moment) => moment.isHighlight).length;

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Remember"
					icon="images-outline"
					subtitle="Save trip moments, highlights, and recap source notes."
					title="Moments"
				/>
				<TripModuleViyaAssistCard
					description="Ask Viya to shape moments into highlights, captions, or recap ideas."
					moduleLabel="moments"
					tripId={tripId}
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
							<Ionicons color="#0A84FF" name="images-outline" size={20} />
						</View>
						<View className="flex-1 gap-1">
							<Text type="body" weight="bold">
								{moments.length} moments
							</Text>
							<Text color="muted" type="body-sm">
								{highlightCount} highlights for the recap.
							</Text>
						</View>
					</View>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add moment</Button.Label>
					</Button>
				</Surface>

				{moments.length === 0 ? (
					<EmptyState
						description="Add notes and highlights during or after the trip."
						icon="images-outline"
						title="No moments yet"
					/>
				) : (
					<View className="gap-3">
						{moments.map((moment) => (
							<MomentCard
								isPending={pendingMomentId === moment._id}
								key={moment._id}
								moment={moment}
								onDelete={() => {
									runMomentAction(moment._id, () =>
										deleteMoment({ momentId: moment._id })
									).catch(() => undefined);
								}}
								onEdit={() => openEditSheet(moment)}
								onToggleHighlight={() => {
									runMomentAction(moment._id, () =>
										toggleMomentHighlight({ momentId: moment._id })
									).catch(() => undefined);
								}}
							/>
						))}
					</View>
				)}
			</View>
			<MomentSheet
				form={form}
				isOpen={isSheetOpen}
				isSaving={isSaving}
				mode={editingMomentId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsSheetOpen(isOpen);
					if (!isOpen) {
						setEditingMomentId(null);
						setForm(initialMomentForm);
					}
				}}
				onSubmit={handleSaveMoment}
				onUpdateForm={updateForm}
			/>
		</Container>
	);
}

function MomentCard({
	isPending,
	moment,
	onDelete,
	onEdit,
	onToggleHighlight,
}: {
	isPending: boolean;
	moment: Doc<"moments">;
	onDelete: () => void;
	onEdit: () => void;
	onToggleHighlight: () => void;
}) {
	return (
		<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-5">
			<View className="flex-row items-start gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="image-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-2">
					<View className="flex-row flex-wrap gap-2">
						{moment.isHighlight ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>Highlight</Chip.Label>
							</Chip>
						) : null}
						{moment.locationName ? (
							<Chip size="sm" variant="secondary">
								<Chip.Label>{moment.locationName}</Chip.Label>
							</Chip>
						) : null}
					</View>
					<Text type="body" weight="bold">
						{moment.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{moment.note || moment.caption}
					</Text.Paragraph>
				</View>
			</View>
			<View className="flex-row flex-wrap gap-2">
				<Button
					className="flex-1"
					isDisabled={isPending}
					onPress={onToggleHighlight}
					size="sm"
					variant="secondary"
				>
					<Button.Label>
						{moment.isHighlight ? "Unhighlight" : "Highlight"}
					</Button.Label>
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
