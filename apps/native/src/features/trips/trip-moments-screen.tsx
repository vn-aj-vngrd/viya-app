import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Linking } from "react-native";
import {
	EmptyState,
	Icon,
	ListGroup,
	ListRow,
	radius,
	ScreenShell,
	useFeedback,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	FormError,
	RecordSheet,
	StatusLabel,
	SwipeRow,
} from "@/src/features/bookings/module-kit";
import { useVaultUpload } from "@/src/features/vault/use-vault-upload";
import { formatDay, formatRelativeDay } from "@/src/lib/format";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { useTripIdParam } from "./use-trip-id-param";

interface MomentForm {
	caption: string;
	dayId: string;
	locationName: string;
	note: string;
	photoUrl: string;
	title: string;
}

const initialMomentForm: MomentForm = {
	caption: "",
	dayId: "",
	locationName: "",
	note: "",
	photoUrl: "",
	title: "",
};

const THUMBNAIL_SIZE = 44;

function MomentSheet({
	days,
	errorMessage,
	form,
	isOpen,
	isSaving,
	hasItinerary,
	mode,
	onDelete,
	onOpenChange,
	onOpenItinerary,
	onOpenMaps,
	onPickPhoto,
	isUploadingPhoto,
	onSubmit,
	onUpdateForm,
}: {
	days: Doc<"itineraryDays">[];
	errorMessage: string | null;
	form: MomentForm;
	isOpen: boolean;
	isSaving: boolean;
	hasItinerary: boolean;
	mode: "create" | "edit";
	onDelete: (() => void) | null;
	onOpenChange: (isOpen: boolean) => void;
	onOpenItinerary: () => void;
	onOpenMaps: (() => void) | null;
	onPickPhoto: () => void;
	isUploadingPhoto: boolean;
	onSubmit: () => void;
	onUpdateForm: (key: keyof MomentForm, value: string) => void;
}) {
	const dayLabels = new Map(
		days.map((day) => [
			day._id as string,
			[`Day ${day.dayNumber}`, day.date ? formatDay(day.date) : null]
				.filter(Boolean)
				.join(" · "),
		])
	);

	return (
		<RecordSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSave={onSubmit}
			title={mode === "edit" ? "Edit moment" : "New moment"}
		>
			<FieldGroup>
				<FieldRow
					label="Title"
					onChangeText={(value) => onUpdateForm("title", value)}
					placeholder="Sunset dinner"
					value={form.title}
				/>
				<FieldRow
					label="Place"
					onChangeText={(value) => onUpdateForm("locationName", value)}
					placeholder="Optional"
					value={form.locationName}
				/>
				<FieldRow
					label="Caption"
					onChangeText={(value) => onUpdateForm("caption", value)}
					placeholder="Optional"
					value={form.caption}
				/>
				<FieldRow
					label="Notes"
					multiline={true}
					onChangeText={(value) => onUpdateForm("note", value)}
					placeholder="What happened?"
					value={form.note}
				/>
				{days.length > 0 ? (
					<ChoiceRow
						format={(value) => dayLabels.get(value) ?? "No day"}
						label="Day"
						onChange={(value) => onUpdateForm("dayId", value)}
						options={["", ...days.map((day) => day._id as string)]}
						value={form.dayId}
					/>
				) : null}
			</FieldGroup>
			<ListGroup>
				<ListRow
					leading={
						form.photoUrl ? (
							<Image
								accessibilityIgnoresInvertColors={true}
								source={{ uri: form.photoUrl }}
								style={{
									borderRadius: radius.tile,
									height: THUMBNAIL_SIZE,
									width: THUMBNAIL_SIZE,
								}}
							/>
						) : (
							<Icon name="image-outline" size={20} tone="secondary" />
						)
					}
					onPress={isUploadingPhoto ? undefined : onPickPhoto}
					subtitle={isUploadingPhoto ? "Uploading photo" : undefined}
					title={form.photoUrl ? "Change photo" : "Add photo"}
				/>
			</ListGroup>
			{mode === "edit" ? (
				<ListGroup>
					{onOpenMaps ? (
						<ListRow
							leading={<Icon name="map-outline" size={20} tone="secondary" />}
							onPress={onOpenMaps}
							title="Open Maps"
						/>
					) : null}
					{hasItinerary ? (
						<ListRow
							leading={
								<Icon name="calendar-outline" size={20} tone="secondary" />
							}
							onPress={onOpenItinerary}
							title="Open itinerary"
						/>
					) : null}
					{onDelete ? (
						<ListRow
							destructive={true}
							onPress={onDelete}
							title="Delete moment"
						/>
					) : null}
				</ListGroup>
			) : null}
		</RecordSheet>
	);
}

function MomentRow({
	isLinkedToDay,
	moment,
	onDelete,
	onEdit,
	onToggleHighlight,
}: {
	isLinkedToDay: boolean;
	moment: Doc<"moments">;
	onDelete: () => void;
	onEdit: () => void;
	onToggleHighlight: () => void;
}) {
	const subtitle =
		[
			isLinkedToDay ? null : formatRelativeDay(moment.createdAt),
			moment.locationName,
			moment.note || moment.caption,
		]
			.filter(Boolean)
			.join(" · ") || undefined;

	return (
		<SwipeRow
			leading={{
				icon: "star-outline",
				label: moment.isHighlight ? "Unstar" : "Highlight",
				onPress: onToggleHighlight,
				tone: "accent",
			}}
			trailing={{
				icon: "trash-outline",
				label: "Delete",
				onPress: onDelete,
				tone: "danger",
			}}
		>
			<ListRow
				accessibilityLabel={`${moment.title}${moment.isHighlight ? ", highlight" : ""}. Edit`}
				leading={
					moment.photoUrl ? (
						<Image
							accessibilityIgnoresInvertColors={true}
							source={{ uri: moment.photoUrl }}
							style={{
								borderRadius: radius.tile,
								height: THUMBNAIL_SIZE,
								width: THUMBNAIL_SIZE,
							}}
						/>
					) : undefined
				}
				onPress={onEdit}
				showChevron={false}
				subtitle={subtitle}
				title={moment.title}
				trailing={
					moment.isHighlight ? (
						<StatusLabel icon="star-outline" label="Highlight" />
					) : undefined
				}
			/>
		</SwipeRow>
	);
}

export function TripMomentsScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const moments = useQuery(
		api.moments.listTripMoments,
		tripId ? { tripId } : "skip"
	);
	const itinerary = useQuery(
		api.itinerary.listTripItinerary,
		tripId ? { tripId } : "skip"
	);
	const createMoment = useMutation(api.moments.createMoment);
	const deleteMoment = useMutation(api.moments.deleteMoment);
	const toggleMomentHighlight = useMutation(api.moments.toggleMomentHighlight);
	const updateMoment = useMutation(api.moments.updateMoment);
	const { confirm } = useFeedback();
	const { isUploading: isUploadingPhoto, pickMomentPhoto } = useVaultUpload();
	const [form, setForm] = useState<MomentForm>(initialMomentForm);
	const [editingMomentId, setEditingMomentId] = useState<Id<"moments"> | null>(
		null
	);
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [screenErrorMessage, setScreenErrorMessage] = useState<string | null>(
		null
	);
	const [sheetErrorMessage, setSheetErrorMessage] = useState<string | null>(
		null
	);

	const updateForm = (key: keyof MomentForm, value: string) => {
		setSheetErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setSheetErrorMessage(null);
		setEditingMomentId(null);
		setForm(initialMomentForm);
		setIsSheetOpen(true);
	};
	const openEditSheet = (moment: Doc<"moments">) => {
		setSheetErrorMessage(null);
		setEditingMomentId(moment._id);
		setForm({
			caption: moment.caption,
			dayId: moment.dayId ?? "",
			locationName: moment.locationName,
			note: moment.note,
			photoUrl: moment.photoUrl ?? "",
			title: moment.title,
		});
		setIsSheetOpen(true);
	};
	const closeSheet = () => {
		setIsSheetOpen(false);
		setEditingMomentId(null);
		setSheetErrorMessage(null);
		setForm(initialMomentForm);
	};

	if (!tripId) {
		return (
			<ScreenShell
				state={{
					description: "Open a saved trip to see its moments.",
					icon: "images-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Moments"
			/>
		);
	}

	if (moments === undefined || itinerary === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading moments" }}
				title="Moments"
			/>
		);
	}

	const handleSaveMoment = async () => {
		const title = form.title.trim();
		if (!title) {
			setSheetErrorMessage("Add a title for this moment.");
			return;
		}

		setSheetErrorMessage(null);
		setIsSaving(true);
		try {
			const momentPatch = {
				caption: form.caption.trim() || title,
				dayId: form.dayId.trim() || undefined,
				locationName: form.locationName.trim(),
				note: form.note.trim(),
				photoUrl: form.photoUrl || undefined,
				title,
			};

			if (editingMomentId) {
				await updateMoment({ ...momentPatch, momentId: editingMomentId });
			} else {
				await createMoment({ ...momentPatch, tripId });
			}
			closeSheet();
		} catch {
			setSheetErrorMessage("Could not save this moment. Try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleOpenMaps = async (moment: Doc<"moments">) => {
		if (
			!hasTripMapSearchTarget({
				label: moment.title,
				locationName: moment.locationName,
			})
		) {
			setSheetErrorMessage("Add a place to open it in Maps.");
			return;
		}

		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					label: moment.title,
					locationName: moment.locationName,
				})
			);
		} catch {
			setSheetErrorMessage("Could not open Maps.");
		}
	};

	const handlePickPhoto = async () => {
		if (!tripId) {
			return;
		}

		setSheetErrorMessage(null);
		try {
			const photo = await pickMomentPhoto({ tripId });
			if (photo) {
				updateForm("photoUrl", photo.url);
			}
		} catch {
			setSheetErrorMessage("Could not add this photo. Try again.");
		}
	};

	const runMomentAction = async (action: () => Promise<unknown>) => {
		setScreenErrorMessage(null);
		try {
			await action();
		} catch {
			setScreenErrorMessage("Could not update this moment. Try again.");
		}
	};

	const confirmDeleteMoment = async (moment: Doc<"moments">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete moment",
			destructive: true,
			message: `${moment.title} will be removed from your recap.`,
			title: "Delete moment?",
		});
		if (confirmed) {
			closeSheet();
			await runMomentAction(() => deleteMoment({ momentId: moment._id }));
		}
	};

	const editingMoment =
		moments.find((moment) => moment._id === editingMomentId) ?? null;
	const itineraryHref = editingMoment?.dayId
		? VIYA_ROUTES.tripItinerary(tripId)
		: null;
	const highlightCount = moments.filter((moment) => moment.isHighlight).length;
	const dayGroups = [
		...[...itinerary.days]
			.sort((a, b) => a.dayNumber - b.dayNumber)
			.map((day) => ({
				header: [`Day ${day.dayNumber}`, day.date ? formatDay(day.date) : null]
					.filter(Boolean)
					.join(" · "),
				items: moments.filter((moment) => moment.dayId === day._id),
				key: day._id as string,
			})),
		{
			header: "Not linked to a day",
			items: moments.filter(
				(moment) =>
					!(
						moment.dayId &&
						itinerary.days.some((day) => day._id === moment.dayId)
					)
			),
			key: "none",
		},
	].filter((group) => group.items.length > 0);

	const summaryParts = [
		`${moments.length} ${moments.length === 1 ? "moment" : "moments"}`,
		highlightCount > 0 ? `${highlightCount} highlighted` : null,
	].filter(Boolean);

	return (
		<ScreenShell
			actions={
				moments.length > 0
					? [
							{
								icon: "add",
								key: "add",
								label: "Add moment",
								onPress: openCreateSheet,
								type: "button",
							},
						]
					: []
			}
			sheets={
				<MomentSheet
					days={itinerary.days}
					errorMessage={sheetErrorMessage}
					form={form}
					hasItinerary={Boolean(itineraryHref)}
					isOpen={isSheetOpen}
					isSaving={isSaving}
					isUploadingPhoto={isUploadingPhoto}
					mode={editingMomentId ? "edit" : "create"}
					onDelete={
						editingMoment
							? () => {
									confirmDeleteMoment(editingMoment).catch(() => undefined);
								}
							: null
					}
					onOpenChange={(isOpen) => {
						if (!isOpen) {
							closeSheet();
						}
					}}
					onOpenItinerary={() => {
						if (itineraryHref) {
							closeSheet();
							router.push(VIYA_ROUTES.tripItinerary(tripId));
						}
					}}
					onOpenMaps={
						editingMoment &&
						hasTripMapSearchTarget({
							label: editingMoment.title,
							locationName: editingMoment.locationName,
						})
							? () => {
									handleOpenMaps(editingMoment).catch(() => undefined);
								}
							: null
					}
					onPickPhoto={() => {
						handlePickPhoto().catch(() => undefined);
					}}
					onSubmit={() => {
						handleSaveMoment().catch(() => undefined);
					}}
					onUpdateForm={updateForm}
				/>
			}
			summary={moments.length > 0 ? summaryParts.join(", ") : undefined}
			title="Moments"
		>
			<FormError message={screenErrorMessage} />
			{moments.length === 0 ? (
				<EmptyState
					action={{ label: "Add moment", onPress: openCreateSheet }}
					description="Save a photo, a place or a line about what happened. Highlights go into the recap."
					icon="images-outline"
					title="No moments yet"
				/>
			) : (
				dayGroups.map((group) => (
					<ListGroup header={group.header} key={group.key}>
						{group.items.map((moment) => (
							<MomentRow
								isLinkedToDay={itinerary.days.some(
									(day) => day._id === moment.dayId
								)}
								key={moment._id}
								moment={moment}
								onDelete={() => {
									confirmDeleteMoment(moment).catch(() => undefined);
								}}
								onEdit={() => openEditSheet(moment)}
								onToggleHighlight={() => {
									runMomentAction(() =>
										toggleMomentHighlight({ momentId: moment._id })
									).catch(() => undefined);
								}}
							/>
						))}
					</ListGroup>
				))
			)}
		</ScreenShell>
	);
}
