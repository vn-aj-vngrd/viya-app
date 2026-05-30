import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { Href } from "expo-router";
import { Link } from "expo-router";
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
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import { TripModuleManualEntryCard } from "./trip-module-manual-entry-card";
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

function PlaceCategoryPicker({
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
				{placeCategoryOptions.map((category) => (
					<Button
						key={category}
						onPress={() => onChange(category)}
						size="sm"
						variant={value === category ? "primary" : "secondary"}
					>
						<Button.Label>{formatPlaceCategoryLabel(category)}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
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
									{mode === "edit" ? "Edit place" : "Add place"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Save a stop before assigning it to a day.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close place form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 480 }}
						>
							<SheetField
								label="Name"
								onChangeText={(value) => onUpdateForm("title", value)}
								placeholder="Coffee stop"
								value={form.title}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Place, area, or landmark"
								value={form.locationName}
							/>
							<PlaceCategoryPicker
								onChange={(value) => onUpdateForm("category", value)}
								value={form.category}
							/>
							<SheetField
								label="Address"
								onChangeText={(value) => onUpdateForm("address", value)}
								placeholder="Optional"
								value={form.address}
							/>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("description", value)}
								placeholder="Why save this place?"
								value={form.description}
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
								{mode === "edit" ? "Save place" : "Add place"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
	const insets = useSafeAreaInsets();
	const assignedDayLabel = place
		? getDayAssignmentLabel(days, place.assignedDayId)
		: "Unassigned";

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["64%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="min-w-0 flex-1 gap-1">
								<BottomSheet.Title>Assign to day</BottomSheet.Title>
								<BottomSheet.Description numberOfLines={2}>
									{place
										? `${place.title} is currently ${assignedDayLabel.toLowerCase()}.`
										: "Choose a saved place before assigning a day."}
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close day assignment"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>

						{days.length > 0 ? (
							<ScrollView
								contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
								showsVerticalScrollIndicator={false}
								style={{ maxHeight: 360 }}
							>
								{days.map((day) => {
									const isSelected = place?.assignedDayId === day._id;

									return (
										<Button
											className="justify-start rounded-[22px] border border-border bg-surface px-4 py-3"
											isDisabled={isSaving}
											key={day._id}
											onPress={() => onAssignDay(day._id)}
											size="lg"
											variant={isSelected ? "primary" : "secondary"}
										>
											<Ionicons
												color={isSelected ? "#FFFFFF" : "#34C759"}
												name={
													isSelected ? "checkmark-circle" : "calendar-outline"
												}
												size={18}
											/>
											<Button.Label>
												{`Day ${day.dayNumber} · ${day.title}`}
											</Button.Label>
										</Button>
									);
								})}
							</ScrollView>
						) : (
							<Surface className="gap-2 rounded-[24px] bg-surface-secondary p-4">
								<View
									className="h-10 w-10 items-center justify-center rounded-full"
									style={{ backgroundColor: "rgba(52, 199, 89, 0.14)" }}
								>
									<Ionicons color="#34C759" name="calendar-outline" size={18} />
								</View>
								<Text type="body-sm" weight="bold">
									Add itinerary days first
								</Text>
								<Text color="muted" type="body-sm">
									Places can be assigned once the itinerary has at least one
									day.
								</Text>
								<Link asChild href={itineraryHref}>
									<Button size="sm" variant="secondary">
										<Ionicons
											color="#0A84FF"
											name="calendar-outline"
											size={16}
										/>
										<Button.Label>Plan itinerary days</Button.Label>
									</Button>
								</Link>
							</Surface>
						)}

						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}

						<Button
							isDisabled={isSaving || !place?.assignedDayId}
							onPress={() => onAssignDay()}
							size="lg"
							variant="tertiary"
						>
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Remove day</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
		<View className="flex-row flex-wrap gap-2">
			<Button className="flex-1" onPress={onAddPlace} size="sm">
				<Ionicons color="#FFFFFF" name="add-circle-outline" size={16} />
				<Button.Label>Add route place</Button.Label>
			</Button>
			<Link asChild href={itineraryHref}>
				<Button className="flex-1" size="sm" variant="secondary">
					<Ionicons color="#0A84FF" name="calendar-outline" size={16} />
					<Button.Label>Open route itinerary</Button.Label>
				</Button>
			</Link>
		</View>
	);
}

export function TripPlacesScreen() {
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
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before managing places."
					icon="map-outline"
					title="Trip not found"
				/>
			</Container>
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
			setForm(initialPlaceForm);
			setEditingPlaceId(null);
			setIsPlaceSheetOpen(false);
		} catch (error) {
			setPlaceErrorMessage(
				error instanceof Error ? error.message : "Could not save place."
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeletePlace = async (placeId: Id<"savedPlaces">) => {
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
		return <ScreenLoadingState />;
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

	return (
		<TripModuleScreenFrame activeTab="places" tripId={tripId}>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Save places, neighborhoods, addresses, and notes before assigning them to itinerary days."
						moduleLabel="places"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="map-outline"
						primaryActionLabel="Add place"
					/>

					<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="min-h-44 gap-4">
							<View className="flex-row items-start justify-between gap-3">
								<View className="min-w-0 flex-1 flex-row items-center gap-3">
									<View
										className="h-10 w-10 items-center justify-center rounded-full"
										style={{ backgroundColor: "rgba(52, 199, 89, 0.14)" }}
									>
										<Ionicons
											color="#34C759"
											name="navigate-outline"
											size={20}
										/>
									</View>
									<View className="min-w-0 flex-1 gap-1">
										<Text type="body-sm" weight="bold">
											Route board
										</Text>
										<Text color="muted" numberOfLines={1} type="body-xs">
											Saved and planned stops
										</Text>
									</View>
								</View>
								<Chip size="sm" variant="secondary">
									<Chip.Label>{places.routeStats.placeCount} total</Chip.Label>
								</Chip>
							</View>

							{routePreviewPlaces.length > 0 ? (
								<View className="gap-2">
									{routePreviewPlaces.map((place, index) => (
										<View
											className="flex-row items-center gap-3 rounded-[18px] bg-surface px-3 py-2"
											key={`${place.sourceLabel}-${place.id}`}
										>
											<View
												className="h-7 w-7 items-center justify-center rounded-full"
												style={{
													backgroundColor: "rgba(52, 199, 89, 0.12)",
												}}
											>
												<Text
													style={{ color: "#34C759" }}
													type="body-xs"
													weight="bold"
												>
													{index + 1}
												</Text>
											</View>
											<View className="min-w-0 flex-1 gap-0.5">
												<Text numberOfLines={1} type="body-xs" weight="bold">
													{place.title}
												</Text>
												<Text color="muted" numberOfLines={1} type="body-xs">
													{place.locationName} ·{" "}
													{formatPlaceCategoryLabel(place.category)}
												</Text>
											</View>
											<Chip size="sm" variant="secondary">
												<Chip.Label>{place.sourceLabel}</Chip.Label>
											</Chip>
											{hasTripMapSearchTarget({
												address: place.address,
												latitude: place.latitude,
												locationName: place.locationName,
												longitude: place.longitude,
											}) ? (
												<Button
													accessibilityLabel={`Open ${place.title} in Maps`}
													onPress={() => {
														handleOpenMaps(place).catch(() => undefined);
													}}
													size="sm"
													variant="secondary"
												>
													<Ionicons
														color="#34C759"
														name="map-outline"
														size={14}
													/>
												</Button>
											) : null}
										</View>
									))}
								</View>
							) : (
								<View className="flex-1 items-center justify-center gap-2 py-6">
									<Ionicons color="#34C759" name="location-outline" size={26} />
									<Text color="muted" type="body-sm">
										Add places to build route context.
									</Text>
								</View>
							)}
						</View>
						<View className="flex-row flex-wrap gap-2">
							<Chip size="sm" variant="secondary">
								<Chip.Label>{places.routeStats.placeCount} places</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>
									{places.routeStats.savedPlaceCount} saved
								</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>
									{places.routeStats.geocodedPlaceCount} geocoded
								</Chip.Label>
							</Chip>
						</View>
						<RouteBoardActions
							itineraryHref={VIYA_ROUTES.tripItinerary(tripId)}
							onAddPlace={openCreateSheet}
						/>
					</Surface>
					{mapErrorMessage ? (
						<Text className="px-1 text-danger" type="body-sm">
							{mapErrorMessage}
						</Text>
					) : null}

					{places.savedPlaces.length === 0 &&
					places.itineraryPlaces.length === 0 ? (
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
						<View className="gap-4">
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
								<View className="gap-3">
									<Text color="muted" type="body-xs" weight="semibold">
										ITINERARY STOPS
									</Text>
									{places.itineraryPlaces.map((place) => (
										<Surface
											className="gap-2 rounded-[24px] bg-surface-secondary p-4"
											key={place.id}
										>
											<Text type="body-sm" weight="bold">
												{place.title}
											</Text>
											<Text color="muted" type="body-xs">
												{place.locationName} · {place.category}
											</Text>
											{place.description ? (
												<Text.Paragraph color="muted" type="body-sm">
													{place.description}
												</Text.Paragraph>
											) : null}
											{hasTripMapSearchTarget({
												address: place.address,
												latitude: place.latitude,
												locationName: place.locationName,
												longitude: place.longitude,
											}) ? (
												<Button
													accessibilityLabel={`Open ${place.title} in Maps`}
													onPress={() => {
														handleOpenMaps({
															address: place.address,
															latitude: place.latitude,
															locationName: place.locationName,
															longitude: place.longitude,
															title: place.title,
														}).catch(() => undefined);
													}}
													size="sm"
													variant="secondary"
												>
													<Ionicons
														color="#34C759"
														name="map-outline"
														size={16}
													/>
													<Button.Label>Open Maps</Button.Label>
												</Button>
											) : null}
											<Link asChild href={VIYA_ROUTES.tripItinerary(tripId)}>
												<Button size="sm" variant="secondary">
													<Ionicons
														color="#0A84FF"
														name="calendar-outline"
														size={16}
													/>
													<Button.Label>Open itinerary</Button.Label>
												</Button>
											</Link>
										</Surface>
									))}
								</View>
							) : null}
						</View>
					)}
				</View>
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
			</Container>
		</TripModuleScreenFrame>
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
		<View className="gap-3">
			<Text color="muted" type="body-xs" weight="semibold">
				{title.toUpperCase()}
			</Text>
			{places.map((place) => (
				<Surface
					className="gap-3 rounded-[24px] border border-border bg-surface p-4"
					key={place._id}
				>
					<View className="flex-row items-start gap-3">
						<View
							className="h-10 w-10 items-center justify-center rounded-full"
							style={{ backgroundColor: "rgba(52, 199, 89, 0.12)" }}
						>
							<Ionicons color="#34C759" name="location-outline" size={18} />
						</View>
						<View className="min-w-0 flex-1 gap-1">
							<Text numberOfLines={1} type="body-sm" weight="bold">
								{place.title}
							</Text>
							<Text color="muted" numberOfLines={2} type="body-xs">
								{place.locationName} · {place.category}
							</Text>
							<View className="flex-row flex-wrap gap-2 pt-1">
								<Chip size="sm" variant="secondary">
									<Chip.Label>
										{getDayAssignmentLabel(itineraryDays, place.assignedDayId)}
									</Chip.Label>
								</Chip>
							</View>
							{place.description ? (
								<Text.Paragraph color="muted" type="body-sm">
									{place.description}
								</Text.Paragraph>
							) : null}
						</View>
					</View>
					<View className="flex-row flex-wrap gap-2">
						{hasTripMapSearchTarget({
							address: place.address,
							latitude: place.latitude,
							locationName: place.locationName,
							longitude: place.longitude,
						}) ? (
							<Button
								className="min-w-[30%] flex-1"
								onPress={() => onOpenMaps(place)}
								size="sm"
								variant="secondary"
							>
								<Ionicons color="#34C759" name="map-outline" size={16} />
								<Button.Label>Maps</Button.Label>
							</Button>
						) : null}
						<Button
							className="min-w-[30%] flex-1"
							onPress={() => onAssignPlace(place)}
							size="sm"
							variant="primary"
						>
							<Button.Label>
								{place.assignedDayId ? "Move day" : "Add to day"}
							</Button.Label>
						</Button>
						{place.assignedDayId ? (
							<Link asChild href={itineraryHref}>
								<Button
									className="min-w-[30%] flex-1"
									size="sm"
									variant="secondary"
								>
									<Ionicons color="#0A84FF" name="calendar-outline" size={16} />
									<Button.Label>Open itinerary</Button.Label>
								</Button>
							</Link>
						) : null}
						<Button
							className="min-w-[30%] flex-1"
							onPress={() => onEditPlace(place)}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Edit</Button.Label>
						</Button>
						<Button
							className="min-w-[30%] flex-1"
							isDisabled={deletingPlaceId === place._id}
							onPress={() => onDeletePlace(place._id)}
							size="sm"
							variant="tertiary"
						>
							<Button.Label>Delete</Button.Label>
						</Button>
					</View>
				</Surface>
			))}
		</View>
	);
}
