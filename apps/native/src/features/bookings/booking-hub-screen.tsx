import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBookingProgress, groupBookingsByType } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
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
} from "@/src/features/trips/trip-map-link-utils";
import { TripModuleScreenFrame } from "@/src/features/trips/trip-module-floating-bar";
import { TripModuleManualEntryCard } from "@/src/features/trips/trip-module-manual-entry-card";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

import { BookingTargetCard } from "./booking-target-card";

type BookingType =
	| "flight"
	| "hotel"
	| "activity"
	| "transport"
	| "restaurant"
	| "insurance"
	| "other";

interface BookingForm {
	cost: string;
	locationName: string;
	notes: string;
	provider: string;
	startDateTime: string;
	title: string;
	type: string;
}

const initialBookingForm: BookingForm = {
	cost: "",
	locationName: "",
	notes: "",
	provider: "",
	startDateTime: "",
	title: "",
	type: "hotel",
};

const bookingTypeOptions = [
	"flight",
	"hotel",
	"activity",
	"transport",
	"restaurant",
	"insurance",
	"other",
] as const;

const bookingTypes = new Set<string>(bookingTypeOptions);

const getBookingType = (value: string): BookingType => {
	const type = value.trim();

	return bookingTypes.has(type) ? (type as BookingType) : "other";
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

function BookingTypePicker({
	onChange,
	value,
}: {
	onChange: (value: string) => void;
	value: string;
}) {
	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				TYPE
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{bookingTypeOptions.map((type) => (
					<Button
						key={type}
						onPress={() => onChange(type)}
						size="sm"
						variant={value === type ? "primary" : "secondary"}
					>
						<Button.Label>{getBookingTypeLabel(type)}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

function BookingMetric({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[47%] flex-1 gap-1 rounded-[20px] bg-surface p-3">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<Text numberOfLines={1} type="body-sm" weight="bold">
				{value}
			</Text>
		</View>
	);
}

const getBookingTypeLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

function BookingTargetSheet({
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
	form: BookingForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof BookingForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["84%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit"
										? "Edit booking target"
										: "Add booking target"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									Track what still needs to be reserved externally.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close booking target form"
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
								placeholder="Hotel in Shinjuku"
								value={form.title}
							/>
							<BookingTypePicker
								onChange={(value) => onUpdateForm("type", value)}
								value={form.type}
							/>
							<SheetField
								label="Cost"
								onChangeText={(value) => onUpdateForm("cost", value)}
								placeholder="0"
								value={form.cost}
							/>
							<SheetField
								label="Provider"
								onChangeText={(value) => onUpdateForm("provider", value)}
								placeholder="Airline, hotel, app, or operator"
								value={form.provider}
							/>
							<SheetField
								label="Date / time"
								onChangeText={(value) => onUpdateForm("startDateTime", value)}
								placeholder="2026-06-01 or 2026-06-01 09:00"
								value={form.startDateTime}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Airport, hotel area, or meeting point"
								value={form.locationName}
							/>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("notes", value)}
								placeholder="What needs to be checked before booking?"
								value={form.notes}
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
								{mode === "edit" ? "Save target" : "Add target"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

type BookingProofVaultItem = Pick<
	Doc<"vaultItems">,
	"_id" | "fileName" | "linkedEntityId" | "linkedEntityType" | "title"
> & {
	url?: string | null;
};

const getVaultItemLabel = (vaultItem: BookingProofVaultItem) =>
	vaultItem.title || vaultItem.fileName;

interface BookingProofMeta {
	label: string;
	url?: string | null;
}

function NextBookingTargetSummary({
	booking,
	hasItinerary,
	onCreateNextTarget,
	onOpenItinerary,
	onOpenMaps,
	onOpenProof,
	onReview,
	proofMeta,
}: {
	booking: Doc<"bookings"> | null;
	hasItinerary: boolean;
	onCreateNextTarget: () => void;
	onOpenItinerary: () => void;
	onOpenMaps: () => void;
	onOpenProof: () => void;
	onReview: () => void;
	proofMeta?: BookingProofMeta;
}) {
	const canOpenMaps = booking
		? hasTripMapSearchTarget({
				address: booking.address,
				label: booking.title,
				locationName: booking.locationName,
			})
		: false;

	return (
		<View className="gap-3 rounded-[24px] bg-surface p-4">
			<View className="flex-row items-center gap-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
					<Ionicons color="#0A84FF" name="flag-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						NEXT TARGET
					</Text>
					<Text numberOfLines={1} type="body-sm" weight="bold">
						{booking?.title ?? "No open booking target"}
					</Text>
				</View>
			</View>
			<Text color="muted" numberOfLines={2} type="body-sm">
				{booking
					? `${getBookingTypeLabel(booking.type)} · ${
							booking.provider ?? "Provider TBD"
						} · ${booking.startDateTime ?? "Date TBD"}`
					: "Add booking targets for flights, stays, activities, transport, and reservations."}
			</Text>
			{booking ? (
				<View className="flex-row flex-wrap gap-2">
					<Button className="flex-1" onPress={onReview} size="sm">
						<Ionicons color="#FFFFFF" name="create-outline" size={16} />
						<Button.Label>Review next target</Button.Label>
					</Button>
					{canOpenMaps ? (
						<Button
							className="flex-1"
							onPress={onOpenMaps}
							size="sm"
							variant="secondary"
						>
							<Ionicons color="#FF9F0A" name="map-outline" size={16} />
							<Button.Label>Open next Maps</Button.Label>
						</Button>
					) : null}
					{hasItinerary ? (
						<Button
							className="flex-1"
							onPress={onOpenItinerary}
							size="sm"
							variant="secondary"
						>
							<Ionicons color="#0A84FF" name="calendar-outline" size={16} />
							<Button.Label>Open next itinerary</Button.Label>
						</Button>
					) : null}
					{proofMeta?.url ? (
						<Button
							className="flex-1"
							onPress={onOpenProof}
							size="sm"
							variant="secondary"
						>
							<Ionicons
								color="#0A84FF"
								name="document-attach-outline"
								size={16}
							/>
							<Button.Label>Open next proof</Button.Label>
						</Button>
					) : null}
				</View>
			) : (
				<Button onPress={onCreateNextTarget} size="sm" variant="secondary">
					<Ionicons color="#0A84FF" name="add-circle-outline" size={16} />
					<Button.Label>Add next target</Button.Label>
				</Button>
			)}
		</View>
	);
}

const getBookingProofMetaById = ({
	bookings,
	vaultItems,
}: {
	bookings: Doc<"bookings">[];
	vaultItems: BookingProofVaultItem[];
}) => {
	const proofMetaById = new Map<string, BookingProofMeta>();

	for (const vaultItem of vaultItems) {
		if (vaultItem.linkedEntityType === "booking" && vaultItem.linkedEntityId) {
			proofMetaById.set(vaultItem.linkedEntityId, {
				label: getVaultItemLabel(vaultItem),
				url: vaultItem.url,
			});
		}
	}

	for (const booking of bookings) {
		if (!booking.vaultItemId || proofMetaById.has(booking._id)) {
			continue;
		}

		const vaultItem = vaultItems.find(
			(candidate) => candidate._id === booking.vaultItemId
		);
		if (vaultItem) {
			proofMetaById.set(booking._id, {
				label: getVaultItemLabel(vaultItem),
				url: vaultItem.url,
			});
		}
	}

	return proofMetaById;
};

const getNeedsProofCount = ({
	bookings,
	proofMetaById,
}: {
	bookings: Doc<"bookings">[];
	proofMetaById: Map<string, BookingProofMeta>;
}) =>
	bookings.filter(
		(booking) => booking.status !== "target" && !proofMetaById.has(booking._id)
	).length;

const getBookingItineraryLabelById = ({
	itineraryDays,
	itineraryItems,
}: {
	itineraryDays: Doc<"itineraryDays">[];
	itineraryItems: Doc<"itineraryItems">[];
}) => {
	const dayById = new Map(itineraryDays.map((day) => [day._id, day]));
	const labelByBookingId = new Map<string, string>();

	for (const item of itineraryItems) {
		if (!item.bookingId) {
			continue;
		}

		const day = dayById.get(item.dayId);
		const dayLabel = day ? `Day ${day.dayNumber}` : "Itinerary";
		const currentLabel = labelByBookingId.get(item.bookingId);
		const itemLabel = `${dayLabel} · ${item.startTime} · ${item.title}`;

		labelByBookingId.set(
			item.bookingId,
			currentLabel ? `${currentLabel}; ${itemLabel}` : itemLabel
		);
	}

	return labelByBookingId;
};

export function BookingHubScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const bookings = useQuery(
		api.bookings.listTripBookings,
		tripId ? { tripId } : "skip"
	);
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const createBookingTarget = useMutation(api.bookings.createBookingTarget);
	const deleteBooking = useMutation(api.bookings.deleteBooking);
	const updateBooking = useMutation(api.bookings.updateBooking);
	const updateBookingStatus = useMutation(api.bookings.updateBookingStatus);
	const [bookingForm, setBookingForm] =
		useState<BookingForm>(initialBookingForm);
	const [editingBookingId, setEditingBookingId] =
		useState<Id<"bookings"> | null>(null);
	const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
	const [isCreatingBooking, setIsCreatingBooking] = useState(false);
	const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(
		null
	);
	const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(
		null
	);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before reviewing booking targets."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (bookings === undefined) {
		return <ScreenLoadingState />;
	}

	const progress = getBookingProgress(bookings);
	const groupedBookings = groupBookingsByType(bookings);
	const bookedExternallyCount = bookings.filter(
		(booking) => booking.status === "bookedExternally"
	).length;
	const draftCount = bookings.filter(
		(booking) => booking.status === "target"
	).length;
	const nextBooking =
		bookings
			.filter((booking) => booking.status !== "confirmed")
			.sort((left, right) =>
				(left.startDateTime ?? "").localeCompare(right.startDateTime ?? "")
			)
			.at(0) ?? null;
	const vaultItems: BookingProofVaultItem[] = workspace?.vaultItems ?? [];
	const bookingProofMetaById = getBookingProofMetaById({
		bookings,
		vaultItems,
	});
	const proofLinkedCount = bookings.filter((booking) =>
		bookingProofMetaById.has(booking._id)
	).length;
	const needsProofCount = getNeedsProofCount({
		bookings,
		proofMetaById: bookingProofMetaById,
	});
	const bookingItineraryLabelById = getBookingItineraryLabelById({
		itineraryDays: workspace?.itineraryDays ?? [],
		itineraryItems: workspace?.itineraryItems ?? [],
	});
	const routeLinkedCount = bookings.filter((booking) =>
		bookingItineraryLabelById.has(booking._id)
	).length;
	const nextBookingProofMeta = nextBooking
		? bookingProofMetaById.get(nextBooking._id)
		: undefined;
	const nextBookingHasItinerary = nextBooking
		? bookingItineraryLabelById.has(nextBooking._id)
		: false;
	const updateBookingForm = (key: keyof BookingForm, value: string) => {
		setBookingErrorMessage(null);
		setBookingForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const openCreateSheet = () => {
		setBookingErrorMessage(null);
		setEditingBookingId(null);
		setBookingForm(initialBookingForm);
		setIsBookingSheetOpen(true);
	};
	const openEditSheet = (booking: Doc<"bookings">) => {
		setBookingErrorMessage(null);
		setEditingBookingId(booking._id);
		setBookingForm({
			cost: booking.cost?.toString() ?? "",
			locationName: booking.locationName ?? "",
			notes: booking.notes ?? "",
			provider: booking.provider ?? "",
			startDateTime: booking.startDateTime ?? "",
			title: booking.title,
			type: booking.type,
		});
		setIsBookingSheetOpen(true);
	};
	const openNextBookingMaps = async (booking: Doc<"bookings">) => {
		setBookingErrorMessage(null);
		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					address: booking.address,
					label: booking.title,
					locationName: booking.locationName,
				})
			);
		} catch {
			setBookingErrorMessage("Could not open Maps for this booking.");
		}
	};
	const openNextBookingProof = async (url?: string | null) => {
		if (!url) {
			setBookingErrorMessage("Confirmation file is not available yet.");
			return;
		}

		setBookingErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setBookingErrorMessage("Could not open this confirmation.");
		}
	};
	const saveTarget = async () => {
		if (!tripId) {
			return;
		}

		const title = bookingForm.title.trim();
		if (!title) {
			setBookingErrorMessage("Add a booking title.");
			return;
		}

		const cost = Number(bookingForm.cost.replaceAll(",", ""));
		setBookingErrorMessage(null);
		setIsCreatingBooking(true);
		try {
			const bookingPatch = {
				cost: Number.isFinite(cost) && cost > 0 ? cost : undefined,
				currency: "PHP",
				locationName: bookingForm.locationName.trim() || undefined,
				notes: bookingForm.notes.trim() || undefined,
				provider: bookingForm.provider.trim() || undefined,
				startDateTime: bookingForm.startDateTime.trim() || undefined,
				title,
				type: getBookingType(bookingForm.type),
			};

			if (editingBookingId) {
				await updateBooking({
					...bookingPatch,
					bookingId: editingBookingId,
				});
			} else {
				await createBookingTarget({
					...bookingPatch,
					tripId,
				});
			}
			setBookingForm(initialBookingForm);
			setEditingBookingId(null);
			setIsBookingSheetOpen(false);
		} catch {
			setBookingErrorMessage("Could not save booking target.");
		} finally {
			setIsCreatingBooking(false);
		}
	};

	const updateStatus = async (
		booking: Doc<"bookings">,
		status: "bookedExternally" | "confirmed"
	) => {
		setUpdatingBookingId(booking._id);
		try {
			await updateBookingStatus({ bookingId: booking._id, status });
		} catch {
			setBookingErrorMessage("Could not update booking status.");
		} finally {
			setUpdatingBookingId(null);
		}
	};
	const removeBooking = async (bookingId: Id<"bookings">) => {
		setUpdatingBookingId(bookingId);
		try {
			await deleteBooking({ bookingId });
		} catch {
			setBookingErrorMessage("Could not delete booking target.");
		} finally {
			setUpdatingBookingId(null);
		}
	};
	const bookingsContent = (() => {
		if (bookings.length === 0) {
			return (
				<View className="gap-3">
					<EmptyState
						action={{
							label: "Add booking target",
							onPress: openCreateSheet,
						}}
						description="Add flights, stays, activities, transport, or reservations you still need to book externally."
						icon="ticket-outline"
						title="No booking targets"
					/>
				</View>
			);
		}

		return (
			<View className="gap-5">
				{groupedBookings.map((group) => (
					<View className="gap-3" key={group.type}>
						<Text color="muted" type="body-xs" weight="semibold">
							{group.type.toUpperCase()}
						</Text>
						{group.items.map((booking) => (
							<BookingTargetCard
								booking={booking}
								isUpdating={updatingBookingId === booking._id}
								itineraryHref={
									bookingItineraryLabelById.has(booking._id)
										? VIYA_ROUTES.tripItinerary(tripId)
										: null
								}
								itineraryUsageLabel={bookingItineraryLabelById.get(booking._id)}
								key={booking._id}
								linkedVaultItemLabel={
									bookingProofMetaById.get(booking._id)?.label
								}
								onDelete={(item) => {
									removeBooking(item._id).catch(() => undefined);
								}}
								onEdit={openEditSheet}
								onMarkBooked={(item) => {
									updateStatus(item, "bookedExternally").catch(() => undefined);
								}}
								onMarkConfirmed={(item) => {
									updateStatus(item, "confirmed").catch(() => undefined);
								}}
								onUploadConfirmation={() =>
									router.push(VIYA_ROUTES.tripVault(tripId))
								}
								proofUrl={bookingProofMetaById.get(booking._id)?.url}
							/>
						))}
					</View>
				))}
			</View>
		);
	})();

	return (
		<TripModuleScreenFrame activeTab="bookings" tripId={tripId}>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Add reservation targets manually, mark them booked or confirmed, then upload confirmations."
						moduleLabel="bookings"
						onPrimaryPress={openCreateSheet}
						primaryActionIcon="ticket-outline"
						primaryActionLabel="Add booking target"
					/>
					{bookingErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{bookingErrorMessage}
						</Text>
					) : null}

					<Surface className="gap-3 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-1">
								<Text.Heading type="h5" weight="semibold">
									Reservation board
								</Text.Heading>
								<Text color="muted" type="body-sm">
									Track targets from idea to booking to confirmed proof.
								</Text>
							</View>
							<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
								<Ionicons color="#0A84FF" name="ticket-outline" size={20} />
							</View>
						</View>
						<View className="flex-row flex-wrap gap-2">
							<Chip size="sm" variant="secondary">
								<Chip.Label>
									{progress.confirmed}/{progress.total} confirmed
								</Chip.Label>
							</Chip>
							<Chip size="sm" variant="secondary">
								<Chip.Label>{progress.remaining} remaining</Chip.Label>
							</Chip>
						</View>
						<View className="flex-row flex-wrap gap-3">
							<BookingMetric label="Targets" value={`${progress.total}`} />
							<BookingMetric
								label="Booked"
								value={`${bookedExternallyCount} need proof`}
							/>
							<BookingMetric label="Drafts" value={`${draftCount} pending`} />
							<BookingMetric
								label="Confirmed"
								value={`${progress.confirmed}/${progress.total}`}
							/>
							<BookingMetric
								label="Proof"
								value={`${proofLinkedCount}/${progress.total} linked`}
							/>
							<BookingMetric
								label="Route"
								value={`${routeLinkedCount}/${progress.total} scheduled`}
							/>
						</View>
						<NextBookingTargetSummary
							booking={nextBooking}
							hasItinerary={nextBookingHasItinerary}
							onCreateNextTarget={openCreateSheet}
							onOpenItinerary={() =>
								router.push(VIYA_ROUTES.tripItinerary(tripId))
							}
							onOpenMaps={() => {
								if (nextBooking) {
									openNextBookingMaps(nextBooking).catch(() => undefined);
								}
							}}
							onOpenProof={() => {
								openNextBookingProof(nextBookingProofMeta?.url).catch(
									() => undefined
								);
							}}
							onReview={() => {
								if (nextBooking) {
									openEditSheet(nextBooking);
								}
							}}
							proofMeta={nextBookingProofMeta}
						/>
						<Button
							onPress={() => router.push(VIYA_ROUTES.tripVault(tripId))}
							size="sm"
							variant="secondary"
						>
							<Ionicons color="#0A84FF" name="cloud-upload-outline" size={16} />
							<Button.Label>
								{needsProofCount > 0
									? `Upload ${needsProofCount} confirmations`
									: "Manage confirmations"}
							</Button.Label>
						</Button>
					</Surface>

					{bookingsContent}
				</View>
				<BookingTargetSheet
					errorMessage={bookingErrorMessage}
					form={bookingForm}
					isOpen={isBookingSheetOpen}
					isSaving={isCreatingBooking}
					mode={editingBookingId ? "edit" : "create"}
					onOpenChange={(isOpen) => {
						setIsBookingSheetOpen(isOpen);
						if (!isOpen) {
							setEditingBookingId(null);
							setBookingErrorMessage(null);
							setBookingForm(initialBookingForm);
						}
					}}
					onSubmit={saveTarget}
					onUpdateForm={updateBookingForm}
				/>
			</Container>
		</TripModuleScreenFrame>
	);
}
