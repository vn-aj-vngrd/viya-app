import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Linking } from "react-native";
import {
	ChoiceChips,
	EmptyPrimary,
	FieldRow,
	FormGroup,
	FormSheet,
	InlineError,
	NotesRow,
	SwipeRow,
} from "@/src/components/itinerary/trip-module-ui";
import {
	haptic,
	Icon,
	ListGroup,
	ListRow,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { formatEnumLabel, formatShortDate } from "@/src/lib/format";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";

interface PlaceForm {
	address: string;
	category: string;
	description: string;
	locationName: string;
	title: string;
}

const initialPlaceForm: PlaceForm = {
	address: "",
	category: "place",
	description: "",
	locationName: "",
	title: "",
};

const placeCategoryOptions = [
	"place",
	"food",
	"coffee",
	"activity",
	"hotel",
	"transport",
	"shopping",
	"nightlife",
	"backup",
] as const;

const getDayAssignmentLabel = (
	days: Doc<"itineraryDays">[],
	dayId?: Id<"itineraryDays">
) => {
	const day = days.find((itineraryDay) => itineraryDay._id === dayId);

	if (!day) {
		return "Not on a day yet";
	}

	return day.date
		? `Day ${day.dayNumber} · ${formatShortDate(day.date)}`
		: `Day ${day.dayNumber}`;
};

const hasMapTarget = (place: {
	address?: string;
	latitude?: number;
	locationName?: string;
	longitude?: number;
}) =>
	hasTripMapSearchTarget({
		address: place.address,
		latitude: place.latitude,
		locationName: place.locationName,
		longitude: place.longitude,
	});

/** All state and mutations for saved places; screens render it with the pieces below. */
export function usePlacesController(tripId: Id<"trips"> | null) {
	const { confirm } = useFeedback();
	const places = useQuery(
		api.places.listTripPlaces,
		tripId ? { tripId } : "skip"
	);
	const itinerary = useQuery(
		api.itinerary.listTripItinerary,
		tripId ? { tripId } : "skip"
	);
	const assignPlaceToDay = useMutation(api.places.assignPlaceToDay);
	const addPlaceToItinerary = useMutation(api.itinerary.addPlaceToItinerary);
	const createSavedPlace = useMutation(api.places.createSavedPlace);
	const deleteSavedPlace = useMutation(api.places.deleteSavedPlace);
	const updateSavedPlace = useMutation(api.places.updateSavedPlace);
	const [form, setForm] = useState<PlaceForm>(initialPlaceForm);
	const [editingPlaceId, setEditingPlaceId] =
		useState<Id<"savedPlaces"> | null>(null);
	const [detailPlaceId, setDetailPlaceId] = useState<Id<"savedPlaces"> | null>(
		null
	);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);

	const savedPlaces = places?.savedPlaces ?? [];
	const days = itinerary?.days ?? [];
	const detailPlace =
		savedPlaces.find((place) => place._id === detailPlaceId) ?? null;

	const updateForm = (key: keyof PlaceForm, value: string) => {
		setErrorMessage(null);
		setForm((current) => ({ ...current, [key]: value }));
	};
	const openCreate = () => {
		setEditingPlaceId(null);
		setErrorMessage(null);
		setForm(initialPlaceForm);
		setIsFormOpen(true);
	};
	const openEdit = (place: Doc<"savedPlaces">) => {
		setEditingPlaceId(place._id);
		setErrorMessage(null);
		setForm({
			address: place.address ?? "",
			category: place.category,
			description: place.description ?? "",
			locationName: place.locationName,
			title: place.title,
		});
		setIsDetailOpen(false);
		setIsFormOpen(true);
	};
	const openDetail = (place: Doc<"savedPlaces">) => {
		setDetailPlaceId(place._id);
		setErrorMessage(null);
		setIsDetailOpen(true);
	};
	const closeForm = (isOpen: boolean) => {
		setIsFormOpen(isOpen);
		if (!isOpen) {
			setEditingPlaceId(null);
			setErrorMessage(null);
			setForm(initialPlaceForm);
		}
	};
	const closeDetail = (isOpen: boolean) => {
		setIsDetailOpen(isOpen);
		if (!isOpen) {
			setErrorMessage(null);
		}
	};

	const save = async () => {
		const title = form.title.trim();
		const locationName = form.locationName.trim();

		if (!(tripId && title && locationName)) {
			setErrorMessage("Add a name and a location.");
			return;
		}

		setErrorMessage(null);
		setIsSaving(true);
		try {
			const patch = {
				address: form.address.trim() || undefined,
				category: form.category.trim() || "place",
				description: form.description.trim() || undefined,
				locationName,
				title,
			};

			if (editingPlaceId) {
				await updateSavedPlace({ ...patch, placeId: editingPlaceId });
			} else {
				await createSavedPlace({ ...patch, tripId });
			}
			haptic("success");
			closeForm(false);
		} catch (error) {
			haptic("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Could not save the place."
			);
		} finally {
			setIsSaving(false);
		}
	};

	const remove = async (place: Doc<"savedPlaces">) => {
		setIsDetailOpen(false);
		const confirmed = await confirm({
			confirmLabel: "Delete place",
			destructive: true,
			message: `${place.title} will be removed from this trip.`,
			title: "Delete place?",
		});
		if (!confirmed) {
			return;
		}
		try {
			await deleteSavedPlace({ placeId: place._id });
			haptic("warning");
		} catch (error) {
			setMapErrorMessage(
				error instanceof Error ? error.message : "Could not delete the place."
			);
		}
	};

	const assign = async (
		place: Doc<"savedPlaces">,
		dayId?: Id<"itineraryDays">
	) => {
		setErrorMessage(null);
		try {
			await assignPlaceToDay(
				dayId
					? { assignedDayId: dayId, placeId: place._id }
					: { placeId: place._id }
			);
			haptic("success");
			setIsDetailOpen(false);
		} catch (error) {
			haptic("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Could not update the day."
			);
		}
	};

	const addToItinerary = async (
		place: Doc<"savedPlaces">,
		dayId: Id<"itineraryDays">
	) => {
		setErrorMessage(null);
		try {
			await addPlaceToItinerary({ dayId, placeId: place._id });
			haptic("success");
			setIsDetailOpen(false);
		} catch {
			haptic("error");
			setErrorMessage("Could not add this place to the itinerary.");
		}
	};

	const openMaps = async (target: {
		address?: string;
		latitude?: number;
		locationName?: string;
		longitude?: number;
		title: string;
	}) => {
		setMapErrorMessage(null);
		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					address: target.address,
					label: target.title,
					latitude: target.latitude,
					locationName: target.locationName,
					longitude: target.longitude,
				})
			);
		} catch {
			setMapErrorMessage("Could not open Maps.");
		}
	};

	return {
		addToItinerary,
		assign,
		closeDetail,
		closeForm,
		days,
		detailPlace,
		editingPlaceId,
		errorMessage,
		form,
		isDetailOpen,
		isFormOpen,
		isLoading: places === undefined || itinerary === undefined,
		isSaving,
		itineraryPlaces: places?.itineraryPlaces ?? [],
		mapErrorMessage,
		openCreate,
		openDetail,
		openEdit,
		openMaps,
		remove,
		save,
		savedPlaces,
		updateForm,
	};
}

export type PlacesController = ReturnType<typeof usePlacesController>;

function PlaceRow({
	controller,
	place,
}: {
	controller: PlacesController;
	place: Doc<"savedPlaces">;
}) {
	return (
		<SwipeRow
			trailing={{
				icon: "trash-outline",
				label: "Delete",
				onPress: () => {
					controller.remove(place).catch(() => undefined);
				},
				tone: "danger",
			}}
		>
			<ListRow
				accessibilityLabel={`${place.title}, ${getDayAssignmentLabel(controller.days, place.assignedDayId)}`}
				onPress={() => controller.openDetail(place)}
				subtitle={`${place.locationName} · ${formatEnumLabel(place.category)}`}
				title={place.title}
				value={
					place.assignedDayId
						? getDayAssignmentLabel(controller.days, place.assignedDayId)
						: undefined
				}
			/>
		</SwipeRow>
	);
}

/** Unplanned first, then planned, then stops that already live in the itinerary. */
export function PlacesContent({
	controller,
}: {
	controller: PlacesController;
}) {
	const unplanned = controller.savedPlaces.filter(
		(place) => !place.assignedDayId
	);
	const planned = controller.savedPlaces.filter((place) => place.assignedDayId);

	if (
		controller.savedPlaces.length === 0 &&
		controller.itineraryPlaces.length === 0
	) {
		return (
			<EmptyPrimary
				actionLabel="Add place"
				description="Save places you want to visit, then assign them to a day."
				onPress={controller.openCreate}
				title="No places yet"
			/>
		);
	}

	return (
		<>
			<InlineError message={controller.mapErrorMessage} />
			{unplanned.length > 0 ? (
				<ListGroup
					footer="Assign each to a day to add it to your plan."
					header="Not on a day yet"
				>
					{unplanned.map((place) => (
						<PlaceRow controller={controller} key={place._id} place={place} />
					))}
				</ListGroup>
			) : null}
			{planned.length > 0 ? (
				<ListGroup header="On a day">
					{planned.map((place) => (
						<PlaceRow controller={controller} key={place._id} place={place} />
					))}
				</ListGroup>
			) : null}
			{controller.itineraryPlaces.length > 0 ? (
				<ListGroup header="Stops with a location">
					{controller.itineraryPlaces.map((place) => (
						<ListRow
							accessibilityLabel={
								hasMapTarget(place)
									? `Open ${place.title} in Maps`
									: place.title
							}
							key={place.id}
							onPress={
								hasMapTarget(place)
									? () => {
											controller.openMaps(place).catch(() => undefined);
										}
									: undefined
							}
							showChevron={false}
							subtitle={[
								place.locationName,
								controller.days.find((day) => day._id === place.assignedDayId)
									? `Day ${controller.days.find((day) => day._id === place.assignedDayId)?.dayNumber}`
									: null,
							]
								.filter(Boolean)
								.join(" · ")}
							title={place.title}
							trailing={
								hasMapTarget(place) ? (
									<Icon name="map-outline" size={18} tone="secondary" />
								) : undefined
							}
						/>
					))}
				</ListGroup>
			) : null}
		</>
	);
}

function DayCheck({ isSelected }: { isSelected: boolean }) {
	const { palette } = useUITheme();

	return isSelected ? (
		<Icon color={palette.accent} name="checkmark" size={18} weight="semibold" />
	) : null;
}

/** Add/edit form and the place detail sheet (assign to day, maps, edit, delete). */
export function PlacesSheets({ controller }: { controller: PlacesController }) {
	const place = controller.detailPlace;

	return (
		<>
			<FormSheet
				errorMessage={controller.errorMessage}
				isOpen={controller.isFormOpen}
				isPending={controller.isSaving}
				onOpenChange={controller.closeForm}
				onSubmit={() => {
					controller.save().catch(() => undefined);
				}}
				submitLabel="Save"
				title={controller.editingPlaceId ? "Edit place" : "Add place"}
			>
				<FormGroup>
					<FieldRow
						label="Name"
						onChangeText={(value) => controller.updateForm("title", value)}
						placeholder="Coffee stop"
						value={controller.form.title}
					/>
					<FieldRow
						label="Location"
						onChangeText={(value) =>
							controller.updateForm("locationName", value)
						}
						placeholder="Area or landmark"
						value={controller.form.locationName}
					/>
					<FieldRow
						label="Address"
						onChangeText={(value) => controller.updateForm("address", value)}
						placeholder="Optional"
						value={controller.form.address}
					/>
				</FormGroup>
				<ChoiceChips
					formatLabel={formatEnumLabel}
					label="Category"
					onChange={(value) => controller.updateForm("category", value)}
					options={placeCategoryOptions}
					value={controller.form.category}
				/>
				<FormGroup header="Notes">
					<NotesRow
						label="Notes"
						onChangeText={(value) =>
							controller.updateForm("description", value)
						}
						placeholder="Why save this place?"
						value={controller.form.description}
					/>
				</FormGroup>
			</FormSheet>

			<FormSheet
				errorMessage={controller.errorMessage}
				isOpen={controller.isDetailOpen && Boolean(place)}
				onOpenChange={controller.closeDetail}
				subtitle={place?.locationName}
				title={place?.title ?? "Place"}
			>
				{place ? (
					<>
						{controller.days.length > 0 ? (
							<ListGroup header="Assign to day">
								{controller.days.map((day) => (
									<ListRow
										accessibilityLabel={`Day ${day.dayNumber}, ${day.title}`}
										key={day._id}
										onPress={() => {
											controller.assign(place, day._id).catch(() => undefined);
										}}
										showChevron={false}
										subtitle={day.title}
										title={
											day.date
												? `Day ${day.dayNumber} · ${formatShortDate(day.date)}`
												: `Day ${day.dayNumber}`
										}
										trailing={
											<DayCheck isSelected={place.assignedDayId === day._id} />
										}
									/>
								))}
							</ListGroup>
						) : (
							<ListGroup
								footer="Plan a day in Itinerary, then assign places to it."
								header="Assign to day"
							>
								<ListRow showChevron={false} title="No itinerary days yet" />
							</ListGroup>
						)}
						{controller.days.length > 0 ? (
							<ListGroup
								footer="Adds a one-hour stop in the next free slot."
								header="Add to itinerary"
							>
								{controller.days.map((day) => (
									<ListRow
										accessibilityLabel={`Add ${place.title} to day ${day.dayNumber}`}
										key={day._id}
										leading={<Icon name="add-circle-outline" size={20} />}
										onPress={() => {
											controller
												.addToItinerary(place, day._id)
												.catch(() => undefined);
										}}
										showChevron={false}
										title={
											day.date
												? `Day ${day.dayNumber} · ${formatShortDate(day.date)}`
												: `Day ${day.dayNumber}`
										}
									/>
								))}
							</ListGroup>
						) : null}
						<ListGroup>
							{hasMapTarget(place) ? (
								<ListRow
									leading={<Icon name="map-outline" size={20} />}
									onPress={() => {
										controller.openMaps(place).catch(() => undefined);
									}}
									showChevron={false}
									title="Open Maps"
								/>
							) : null}
							<ListRow
								leading={<Icon name="create-outline" size={20} />}
								onPress={() => controller.openEdit(place)}
								showChevron={false}
								title="Edit place"
							/>
							{place.assignedDayId ? (
								<ListRow
									leading={<Icon name="remove-circle-outline" size={20} />}
									onPress={() => {
										controller.assign(place).catch(() => undefined);
									}}
									showChevron={false}
									title="Remove from day"
								/>
							) : null}
							<ListRow
								destructive={true}
								leading={<Icon name="trash-outline" size={20} tone="danger" />}
								onPress={() => {
									controller.remove(place).catch(() => undefined);
								}}
								showChevron={false}
								title="Delete place"
							/>
						</ListGroup>
					</>
				) : null}
			</FormSheet>
		</>
	);
}
