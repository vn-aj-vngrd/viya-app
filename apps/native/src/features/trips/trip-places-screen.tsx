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

function PlaceSheet({
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
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
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Category"
										onChangeText={(value) => onUpdateForm("category", value)}
										placeholder="food"
										value={form.category}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Address"
										onChangeText={(value) => onUpdateForm("address", value)}
										placeholder="Optional"
										value={form.address}
									/>
								</View>
							</View>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("description", value)}
								placeholder="Why save this place?"
								value={form.description}
							/>
						</ScrollView>

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

export function TripPlacesScreen() {
	const tripId = useTripIdParam();
	const places = useQuery(
		api.places.listTripPlaces,
		tripId ? { tripId } : "skip"
	);
	const createSavedPlace = useMutation(api.places.createSavedPlace);
	const deleteSavedPlace = useMutation(api.places.deleteSavedPlace);
	const updateSavedPlace = useMutation(api.places.updateSavedPlace);
	const [form, setForm] = useState<PlaceForm>(initialPlaceForm);
	const [editingPlaceId, setEditingPlaceId] =
		useState<Id<"savedPlaces"> | null>(null);
	const [isPlaceSheetOpen, setIsPlaceSheetOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [deletingPlaceId, setDeletingPlaceId] =
		useState<Id<"savedPlaces"> | null>(null);

	const updateForm = (key: keyof PlaceForm, value: string) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setEditingPlaceId(null);
		setForm(initialPlaceForm);
		setIsPlaceSheetOpen(true);
	};
	const openEditSheet = (place: Doc<"savedPlaces">) => {
		setEditingPlaceId(place._id);
		setForm({
			address: place.address ?? "",
			category: place.category,
			description: place.description ?? "",
			locationName: place.locationName,
			title: place.title,
		});
		setIsPlaceSheetOpen(true);
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
			return;
		}

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
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeletePlace = async (placeId: Id<"savedPlaces">) => {
		setDeletingPlaceId(placeId);
		try {
			await deleteSavedPlace({ placeId });
		} finally {
			setDeletingPlaceId(null);
		}
	};

	if (places === undefined) {
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
					eyebrow="Map"
					icon="map-outline"
					subtitle="Saved places, itinerary stops, and route context for the trip."
					title="Places"
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="h-44 items-center justify-center rounded-[26px] bg-surface-secondary">
						<Ionicons color="#0A84FF" name="map-outline" size={28} />
						<Text color="muted" type="body-sm">
							Map view
						</Text>
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>{places.routeStats.placeCount} places</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{places.routeStats.savedPlaceCount} saved</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{places.routeStats.geocodedPlaceCount} geocoded
							</Chip.Label>
						</Chip>
					</View>
					<Button onPress={openCreateSheet}>
						<Button.Label>Add place</Button.Label>
					</Button>
				</Surface>

				{places.savedPlaces.length === 0 &&
				places.itineraryPlaces.length === 0 ? (
					<EmptyState
						description="Add saved places or itinerary items to build trip map context."
						icon="map-outline"
						title="No places yet"
					/>
				) : (
					<View className="gap-4">
						{places.savedPlaces.length > 0 ? (
							<PlaceSection
								deletingPlaceId={deletingPlaceId}
								onDeletePlace={(placeId) => {
									handleDeletePlace(placeId).catch(() => undefined);
								}}
								onEditPlace={openEditSheet}
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
									</Surface>
								))}
							</View>
						) : null}
					</View>
				)}
			</View>
			<PlaceSheet
				form={form}
				isOpen={isPlaceSheetOpen}
				isSaving={isSaving}
				mode={editingPlaceId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsPlaceSheetOpen(isOpen);
					if (!isOpen) {
						setEditingPlaceId(null);
						setForm(initialPlaceForm);
					}
				}}
				onSubmit={handleSavePlace}
				onUpdateForm={updateForm}
			/>
		</Container>
	);
}

function PlaceSection({
	deletingPlaceId,
	onDeletePlace,
	onEditPlace,
	places,
	title,
}: {
	deletingPlaceId: Id<"savedPlaces"> | null;
	onDeletePlace: (placeId: Id<"savedPlaces">) => void;
	onEditPlace: (place: Doc<"savedPlaces">) => void;
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
						<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<Ionicons color="#0A84FF" name="location-outline" size={18} />
						</View>
						<View className="min-w-0 flex-1 gap-1">
							<Text numberOfLines={1} type="body-sm" weight="bold">
								{place.title}
							</Text>
							<Text color="muted" numberOfLines={2} type="body-xs">
								{place.locationName} · {place.category}
							</Text>
							{place.description ? (
								<Text.Paragraph color="muted" type="body-sm">
									{place.description}
								</Text.Paragraph>
							) : null}
						</View>
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Button
							className="flex-1"
							onPress={() => onEditPlace(place)}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Edit</Button.Label>
						</Button>
						<Button
							className="flex-1"
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
