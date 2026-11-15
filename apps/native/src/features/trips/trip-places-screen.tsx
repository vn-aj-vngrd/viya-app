import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Menu } from "heroui-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import {
	ActionPill,
	ChoiceChips,
	FormField,
	FormSheet,
	FormTextArea,
	GroupLabel,
	IconAction,
	IconBadge,
	InlineError,
	MenuAction,
	MenuDivider,
	MenuItemContent,
	MenuPanel,
	MetaTag,
	ModuleLoading,
	ModuleMissing,
	ModuleScroll,
	OverflowTrigger,
	Reveal,
} from "@/src/components/itinerary/trip-module-ui";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import {
	AppText,
	Card,
	EmptyState,
	haptic,
	ListGroup,
	ListRow,
	radius,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import { useTripIdParam } from "./use-trip-id-param";

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

const formatPlaceCategoryLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

interface RoutePreviewPlace {
	address?: string;
	category: string;
	id: string;
	latitude?: number;
	locationName: string;
	longitude?: number;
	sourceLabel: string;
	title: string;
}

function PlaceSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	errorMessage: string | null;
	form: PlaceForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof PlaceForm, value: string) => void;
}) {
	return (
		<FormSheet
			closeLabel="Close place form"
			errorMessage={errorMessage}
			isOpen={isOpen}
			isPending={isSaving}
			maxHeight={480}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			snapPoint="82%"
			submitLabel={mode === "edit" ? "Save place" : "Add place"}
			subtitle="Save a stop before assigning it to a day."
			title={mode === "edit" ? "Edit place" : "Add place"}
		>
			<FormField
				label="Name"
				onChangeText={(value) => onUpdateForm("title", value)}
				placeholder="Coffee stop"
				value={form.title}
			/>
			<FormField
				label="Location"
				onChangeText={(value) => onUpdateForm("locationName", value)}
				placeholder="Place, area, or landmark"
				value={form.locationName}
			/>
			<ChoiceChips
				formatLabel={formatPlaceCategoryLabel}
				label="Category"
				onChange={(value) => onUpdateForm("category", value)}
				options={placeCategoryOptions}
				value={form.category}
			/>
			<FormField
				label="Address"
				onChangeText={(value) => onUpdateForm("address", value)}
				placeholder="Optional"
				value={form.address}
			/>
			<FormTextArea
				label="Notes"
				onChangeText={(value) => onUpdateForm("description", value)}
				placeholder="Why save this place?"
				value={form.description}
			/>
		</FormSheet>
	);
}

function getDayAssignmentLabel(
	days: Doc<"itineraryDays">[],
	dayId?: Id<"itineraryDays">
) {
	const day = days.find((itineraryDay) => itineraryDay._id === dayId);

	if (!day) {
		return "Unassigned";
	}

	return `Day ${day.dayNumber}`;
}

function PlaceAssignmentSheet({
	days,
	errorMessage,
	isOpen,
	isSaving,
	itineraryHref,
	onAssignDay,
	onOpenChange,
	place,
}: {
	days: Doc<"itineraryDays">[];
	errorMessage: string | null;
	isOpen: boolean;
	isSaving: boolean;
	itineraryHref: Href;
	onAssignDay: (dayId?: Id<"itineraryDays">) => void;
	onOpenChange: (isOpen: boolean) => void;
	place: Doc<"savedPlaces"> | null;
}) {
	const { palette } = useUITheme();
	const assignedDayLabel = place
		? getDayAssignmentLabel(days, place.assignedDayId)
		: "Unassigned";

	return (
		<FormSheet
			closeLabel="Close day assignment"
			errorMessage={errorMessage}
			isOpen={isOpen}
			maxHeight={360}
			onOpenChange={onOpenChange}
			snapPoint="64%"
			subtitle={
				place
					? `${place.title} is currently ${assignedDayLabel.toLowerCase()}.`
					: "Choose a saved place before assigning a day."
			}
			title="Assign to day"
		>
			{days.length > 0 ? (
				<ListGroup>
					{days.map((day) => {
						const isSelected = place?.assignedDayId === day._id;

						return (
							<ListRow
								accessibilityLabel={`Day ${day.dayNumber} · ${day.title}`}
								key={day._id}
								leading={
									<Ionicons
										color={isSelected ? palette.success : palette.inkTertiary}
										name={isSelected ? "checkmark-circle" : "calendar-outline"}
										size={22}
									/>
								}
								onPress={isSaving ? undefined : () => onAssignDay(day._id)}
								showChevron={false}
								subtitle={day.title}
								title={`Day ${day.dayNumber}`}
							/>
						);
					})}
				</ListGroup>
			) : (
				<Card padding="md">
					<View style={{ alignItems: "flex-start", gap: spacing.sm }}>
						<IconBadge icon="calendar-outline" tone="success" />
						<AppText variant="headline">Add itinerary days first</AppText>
						<AppText tone="secondary" variant="subhead">
							Places can be assigned once the itinerary has at least one day.
						</AppText>
						<Link asChild href={itineraryHref}>
							<ActionPill icon="calendar-outline" label="Plan itinerary days" />
						</Link>
					</View>
				</Card>
			)}
			{place?.assignedDayId ? (
				<ActionPill
					icon="remove-circle-outline"
					isPending={isSaving}
					label="Remove day"
					onPress={() => onAssignDay()}
				/>
			) : null}
		</FormSheet>
	);
}

function RouteBoardActions({
	itineraryHref,
	onAddPlace,
}: {
	itineraryHref: Href;
	onAddPlace: () => void;
}) {
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
			<ActionPill
				icon="add-circle-outline"
				label="Add route place"
				onPress={onAddPlace}
				variant="primary"
			/>
			<Link asChild href={itineraryHref}>
				<ActionPill icon="calendar-outline" label="Open route itinerary" />
			</Link>
		</View>
	);
}

function RouteBoard({
	itineraryHref,
	onAddPlace,
	onOpenMaps,
	places,
	routeStats,
}: {
	itineraryHref: Href;
	onAddPlace: () => void;
	onOpenMaps: (place: RoutePreviewPlace) => void;
	places: RoutePreviewPlace[];
	routeStats: {
		geocodedPlaceCount: number;
		placeCount: number;
		savedPlaceCount: number;
	};
}) {
	const { palette } = useUITheme();

	return (
		<Card>
			<View style={{ gap: spacing.lg }}>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<IconBadge icon="navigate-outline" tone="success" />
					<View style={{ flex: 1, gap: 2 }}>
						<AppText accessibilityRole="header" variant="headline">
							Route board
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							Saved and planned stops
						</AppText>
					</View>
					<MetaTag label={`${routeStats.placeCount} total`} />
				</View>

				{places.length > 0 ? (
					<View style={{ gap: spacing.xs }}>
						{places.map((place, index) => (
							<View
								key={`${place.sourceLabel}-${place.id}`}
								style={{
									alignItems: "center",
									flexDirection: "row",
									gap: spacing.md,
									minHeight: 52,
								}}
							>
								<View
									style={{
										alignItems: "center",
										backgroundColor: palette.fill,
										borderRadius: radius.pill,
										height: 28,
										justifyContent: "center",
										width: 28,
									}}
								>
									<AppText bold={true} tone="success" variant="footnote">
										{index + 1}
									</AppText>
								</View>
								<View style={{ flex: 1, gap: 1, minWidth: 0 }}>
									<AppText numberOfLines={1} variant="callout">
										{place.title}
									</AppText>
									<AppText
										numberOfLines={1}
										tone="secondary"
										variant="footnote"
									>
										{place.locationName} ·{" "}
										{formatPlaceCategoryLabel(place.category)} ·{" "}
										{place.sourceLabel}
									</AppText>
								</View>
								{hasTripMapSearchTarget({
									address: place.address,
									latitude: place.latitude,
									locationName: place.locationName,
									longitude: place.longitude,
								}) ? (
									<IconAction
										icon="map-outline"
										label={`Open ${place.title} in Maps`}
										onPress={() => onOpenMaps(place)}
									/>
								) : null}
							</View>
						))}
					</View>
				) : (
					<View
						style={{
							alignItems: "center",
							gap: spacing.sm,
							paddingVertical: 20,
						}}
					>
						<Ionicons
							color={palette.inkTertiary}
							name="location-outline"
							size={28}
						/>
						<AppText tone="secondary" variant="subhead">
							Add places to build route context.
						</AppText>
					</View>
				)}

				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}
				>
					<MetaTag label={`${routeStats.placeCount} places`} />
					<MetaTag label={`${routeStats.savedPlaceCount} saved`} />
					<MetaTag label={`${routeStats.geocodedPlaceCount} geocoded`} />
				</View>
				<RouteBoardActions
					itineraryHref={itineraryHref}
					onAddPlace={onAddPlace}
				/>
			</View>
		</Card>
	);
}

function PlaceSection({
	deletingPlaceId,
	itineraryHref,
	itineraryDays,
	onAssignPlace,
	onDeletePlace,
	onEditPlace,
	onOpenMaps,
	places,
	title,
}: {
	deletingPlaceId: Id<"savedPlaces"> | null;
	itineraryHref: Href;
	itineraryDays: Doc<"itineraryDays">[];
	onAssignPlace: (place: Doc<"savedPlaces">) => void;
	onDeletePlace: (placeId: Id<"savedPlaces">) => void;
	onEditPlace: (place: Doc<"savedPlaces">) => void;
	onOpenMaps: (place: Doc<"savedPlaces">) => void;
	places: Doc<"savedPlaces">[];
	title: string;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			<GroupLabel>{title.toUpperCase()}</GroupLabel>
			{places.map((place, index) => (
				<Reveal index={index} key={place._id}>
					<Card padding="md">
						<View
							style={{
								alignItems: "flex-start",
								flexDirection: "row",
								gap: spacing.md,
							}}
						>
							<IconBadge icon="location-outline" tone="success" />
							<View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
								<AppText numberOfLines={1} variant="headline">
									{place.title}
								</AppText>
								<AppText numberOfLines={2} tone="secondary" variant="subhead">
									{place.locationName} ·{" "}
									{formatPlaceCategoryLabel(place.category)}
								</AppText>
								<MetaTag
									icon="calendar-outline"
									label={getDayAssignmentLabel(
										itineraryDays,
										place.assignedDayId
									)}
									tone={place.assignedDayId ? "accent" : "neutral"}
								/>
								{place.description ? (
									<AppText tone="secondary" variant="footnote">
										{place.description}
									</AppText>
								) : null}
								<View style={{ paddingTop: spacing.xs }}>
									<ActionPill
										label={place.assignedDayId ? "Move day" : "Add to day"}
										onPress={() => onAssignPlace(place)}
										variant="primary"
									/>
								</View>
							</View>
							<Menu>
								<OverflowTrigger
									disabled={deletingPlaceId === place._id}
									label="Place options"
								/>
								<MenuPanel width={220}>
									{hasTripMapSearchTarget({
										address: place.address,
										latitude: place.latitude,
										locationName: place.locationName,
										longitude: place.longitude,
									}) ? (
										<MenuAction
											icon="map-outline"
											label="Open in Maps"
											onPress={() => onOpenMaps(place)}
										/>
									) : null}
									{place.assignedDayId ? (
										<Link asChild href={itineraryHref}>
											<Menu.Item
												accessibilityLabel="Open itinerary"
												className="rounded-[14px] px-2.5"
												isAnimatedStyleActive={false}
											>
												<MenuItemContent
													icon="calendar-outline"
													label="Open itinerary"
												/>
											</Menu.Item>
										</Link>
									) : null}
									<MenuAction
										icon="create-outline"
										label="Edit place"
										onPress={() => onEditPlace(place)}
									/>
									<MenuDivider />
									<MenuAction
										danger={true}
										disabled={deletingPlaceId === place._id}
										icon="trash-outline"
										label="Delete place"
										onPress={() => onDeletePlace(place._id)}
									/>
								</MenuPanel>
							</Menu>
						</View>
					</Card>
				</Reveal>
			))}
		</View>
	);
}

export function TripPlacesScreen() {
	const { confirm } = useFeedback();
	const tripId = useTripIdParam();
	const places = useQuery(
		api.places.listTripPlaces,
		tripId ? { tripId } : "skip"
	);
	const itinerary = useQuery(
		api.itinerary.listTripItinerary,
		tripId ? { tripId } : "skip"
	);
	const assignPlaceToDay = useMutation(api.places.assignPlaceToDay);
	const createSavedPlace = useMutation(api.places.createSavedPlace);
	const deleteSavedPlace = useMutation(api.places.deleteSavedPlace);
	const updateSavedPlace = useMutation(api.places.updateSavedPlace);
	const [form, setForm] = useState<PlaceForm>(initialPlaceForm);
	const [editingPlaceId, setEditingPlaceId] =
		useState<Id<"savedPlaces"> | null>(null);
	const [assigningPlaceId, setAssigningPlaceId] =
		useState<Id<"savedPlaces"> | null>(null);
	const [isPlaceSheetOpen, setIsPlaceSheetOpen] = useState(false);
	const [isAssignmentSheetOpen, setIsAssignmentSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isAssigningDay, setIsAssigningDay] = useState(false);
	const [deletingPlaceId, setDeletingPlaceId] =
		useState<Id<"savedPlaces"> | null>(null);
	const [placeErrorMessage, setPlaceErrorMessage] = useState<string | null>(
		null
	);
	const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);

	const updateForm = (key: keyof PlaceForm, value: string) => {
		setPlaceErrorMessage(null);
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingPlaceId(null);
		setPlaceErrorMessage(null);
		setForm(initialPlaceForm);
		setIsPlaceSheetOpen(true);
	};
	const openEditSheet = (place: Doc<"savedPlaces">) => {
		setEditingPlaceId(place._id);
		setPlaceErrorMessage(null);
		setForm({
			address: place.address ?? "",
			category: place.category,
			description: place.description ?? "",
			locationName: place.locationName,
			title: place.title,
		});
		setIsPlaceSheetOpen(true);
	};
	const openAssignmentSheet = (place: Doc<"savedPlaces">) => {
		setAssigningPlaceId(place._id);
		setPlaceErrorMessage(null);
		setIsAssignmentSheetOpen(true);
	};

	if (!tripId) {
		return (
			<ModuleMissing
				description="Open a saved trip before managing places."
				icon="map-outline"
			/>
		);
	}

	const handleSavePlace = async () => {
		const title = form.title.trim();
		const locationName = form.locationName.trim();

		if (!(title && locationName)) {
			setPlaceErrorMessage("Add a place name and location.");
			return;
		}

		setPlaceErrorMessage(null);
		setIsSaving(true);
		try {
			const placePatch = {
				address: form.address.trim() || undefined,
				category: form.category.trim() || "place",
				description: form.description.trim() || undefined,
				locationName,
				title,
			};

			if (editingPlaceId) {
				await updateSavedPlace({
					...placePatch,
					placeId: editingPlaceId,
				});
			} else {
				await createSavedPlace({
					...placePatch,
					tripId,
				});
			}
			haptic("success");
			setForm(initialPlaceForm);
			setEditingPlaceId(null);
			setIsPlaceSheetOpen(false);
		} catch (error) {
			haptic("error");
			setPlaceErrorMessage(
				error instanceof Error ? error.message : "Could not save place."
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeletePlace = async (placeId: Id<"savedPlaces">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete place",
			destructive: true,
			message: "This saved place will be removed from the trip.",
			title: "Delete this place?",
		});
		if (!confirmed) {
			return;
		}
		setDeletingPlaceId(placeId);
		try {
			await deleteSavedPlace({ placeId });
		} catch (error) {
			setPlaceErrorMessage(
				error instanceof Error ? error.message : "Could not delete place."
			);
		} finally {
			setDeletingPlaceId(null);
		}
	};
	const handleAssignPlaceToDay = async (dayId?: Id<"itineraryDays">) => {
		if (!assigningPlaceId) {
			setPlaceErrorMessage("Choose a place before assigning a day.");
			return;
		}

		setPlaceErrorMessage(null);
		setIsAssigningDay(true);
		try {
			await assignPlaceToDay(
				dayId
					? { assignedDayId: dayId, placeId: assigningPlaceId }
					: { placeId: assigningPlaceId }
			);
			setIsAssignmentSheetOpen(false);
			setAssigningPlaceId(null);
		} catch (error) {
			setPlaceErrorMessage(
				error instanceof Error
					? error.message
					: "Could not assign place to day."
			);
		} finally {
			setIsAssigningDay(false);
		}
	};
	const handleOpenMaps = async ({
		address,
		latitude,
		locationName,
		longitude,
		title,
	}: {
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
					address,
					label: title,
					latitude,
					locationName,
					longitude,
				})
			);
		} catch {
			setMapErrorMessage("Could not open Maps for this place.");
		}
	};

	if (places === undefined || itinerary === undefined) {
		return <ModuleLoading title="Loading places" />;
	}

	const assigningPlace =
		places.savedPlaces.find((place) => place._id === assigningPlaceId) ?? null;
	const routePreviewPlaces: RoutePreviewPlace[] = [
		...places.savedPlaces.map((place) => ({
			address: place.address,
			category: place.category,
			id: place._id,
			latitude: place.latitude,
			locationName: place.locationName,
			longitude: place.longitude,
			sourceLabel: "Saved",
			title: place.title,
		})),
		...places.itineraryPlaces.map((place) => ({
			address: place.address,
			category: place.category,
			id: place.id,
			latitude: place.latitude,
			locationName: place.locationName,
			longitude: place.longitude,
			sourceLabel: "Plan",
			title: place.title,
		})),
	].slice(0, 4);
	const hasNoPlaces =
		places.savedPlaces.length === 0 && places.itineraryPlaces.length === 0;

	return (
		<TripModuleScreenFrame
			activeTab="places"
			headerAction={
				<NavigationIconButton
					accessibilityLabel="Add place"
					icon="add"
					onPress={openCreateSheet}
				/>
			}
			tripId={tripId}
		>
			<ModuleScroll>
				<RouteBoard
					itineraryHref={VIYA_ROUTES.tripItinerary(tripId)}
					onAddPlace={openCreateSheet}
					onOpenMaps={(place) => {
						handleOpenMaps(place).catch(() => undefined);
					}}
					places={routePreviewPlaces}
					routeStats={places.routeStats}
				/>
				<InlineError message={mapErrorMessage} />

				{hasNoPlaces ? (
					<EmptyState
						action={{
							label: "Add place",
							onPress: openCreateSheet,
						}}
						description="Add saved places or itinerary items to build trip map context."
						icon="map-outline"
						title="No places yet"
					/>
				) : (
					<View style={{ gap: spacing.xl }}>
						{places.savedPlaces.length > 0 ? (
							<PlaceSection
								deletingPlaceId={deletingPlaceId}
								itineraryDays={itinerary.days}
								itineraryHref={VIYA_ROUTES.tripItinerary(tripId)}
								onAssignPlace={openAssignmentSheet}
								onDeletePlace={(placeId) => {
									handleDeletePlace(placeId).catch(() => undefined);
								}}
								onEditPlace={openEditSheet}
								onOpenMaps={(place) => {
									handleOpenMaps({
										address: place.address,
										latitude: place.latitude,
										locationName: place.locationName,
										longitude: place.longitude,
										title: place.title,
									}).catch(() => undefined);
								}}
								places={places.savedPlaces}
								title="Saved places"
							/>
						) : null}

						{places.itineraryPlaces.length > 0 ? (
							<View style={{ gap: spacing.sm }}>
								<GroupLabel>ITINERARY STOPS</GroupLabel>
								{places.itineraryPlaces.map((place, index) => (
									<Reveal index={index} key={place.id}>
										<Card padding="md">
											<View style={{ gap: spacing.sm }}>
												<View style={{ gap: 2 }}>
													<AppText variant="headline">{place.title}</AppText>
													<AppText tone="secondary" variant="subhead">
														{place.locationName} ·{" "}
														{formatPlaceCategoryLabel(place.category)}
													</AppText>
												</View>
												{place.description ? (
													<AppText tone="secondary" variant="footnote">
														{place.description}
													</AppText>
												) : null}
												<View
													style={{
														flexDirection: "row",
														flexWrap: "wrap",
														gap: spacing.sm,
													}}
												>
													{hasTripMapSearchTarget({
														address: place.address,
														latitude: place.latitude,
														locationName: place.locationName,
														longitude: place.longitude,
													}) ? (
														<ActionPill
															accessibilityLabel={`Open ${place.title} in Maps`}
															icon="map-outline"
															label="Open Maps"
															onPress={() => {
																handleOpenMaps({
																	address: place.address,
																	latitude: place.latitude,
																	locationName: place.locationName,
																	longitude: place.longitude,
																	title: place.title,
																}).catch(() => undefined);
															}}
														/>
													) : null}
													<Link
														asChild
														href={VIYA_ROUTES.tripItinerary(tripId)}
													>
														<ActionPill
															icon="calendar-outline"
															label="Open itinerary"
														/>
													</Link>
												</View>
											</View>
										</Card>
									</Reveal>
								))}
							</View>
						) : null}
					</View>
				)}
			</ModuleScroll>
			<PlaceSheet
				errorMessage={placeErrorMessage}
				form={form}
				isOpen={isPlaceSheetOpen}
				isSaving={isSaving}
				mode={editingPlaceId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsPlaceSheetOpen(isOpen);
					if (!isOpen) {
						setEditingPlaceId(null);
						setPlaceErrorMessage(null);
						setForm(initialPlaceForm);
					}
				}}
				onSubmit={handleSavePlace}
				onUpdateForm={updateForm}
			/>
			<PlaceAssignmentSheet
				days={itinerary.days}
				errorMessage={placeErrorMessage}
				isOpen={isAssignmentSheetOpen}
				isSaving={isAssigningDay}
				itineraryHref={VIYA_ROUTES.tripItinerary(tripId)}
				onAssignDay={(dayId) => {
					handleAssignPlaceToDay(dayId).catch(() => undefined);
				}}
				onOpenChange={(isOpen) => {
					setIsAssignmentSheetOpen(isOpen);
					if (!isOpen) {
						setAssigningPlaceId(null);
						setPlaceErrorMessage(null);
					}
				}}
				place={assigningPlace}
			/>
		</TripModuleScreenFrame>
	);
}
