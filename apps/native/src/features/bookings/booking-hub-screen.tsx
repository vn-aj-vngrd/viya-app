import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	BOOKING_STATUS_OPTIONS,
	type BookingStatusValue,
	getBookingCounts,
	getBookingInputError,
	isBookingSecured,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import {
	DatePickerField,
	formatIsoDate,
} from "@/src/components/date/date-picker-field";
import {
	AppText,
	EmptyState,
	haptic,
	ListGroup,
	ListRow,
	ScreenShell,
	SecondaryButton,
	Segmented,
	spacing,
	useFeedback,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "@/src/features/trips/trip-map-link-utils";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";
import {
	formatCount,
	formatDay,
	formatEnumLabel,
	formatMoney,
	formatTime,
} from "@/src/lib/format";

import {
	ChoiceRow,
	FieldGroup,
	FieldRow,
	LinkRow,
	RecordSheet,
	StatusLabel,
	SwipeRow,
} from "./module-kit";

type BookingType =
	| "flight"
	| "hotel"
	| "activity"
	| "transport"
	| "restaurant"
	| "insurance"
	| "other";

type BookingStatus = Doc<"bookings">["status"];
type BookingFilter = "all" | "booked" | "needs";

interface BookingForm {
	confirmationCode: string;
	cost: string;
	date: string;
	endDate: string;
	endTime: string;
	externalUrl: string;
	locationName: string;
	notes: string;
	provider: string;
	status: BookingStatus;
	time: string;
	title: string;
	type: string;
}

const initialBookingForm: BookingForm = {
	confirmationCode: "",
	cost: "",
	date: "",
	endDate: "",
	endTime: "",
	externalUrl: "",
	locationName: "",
	notes: "",
	provider: "",
	status: "target",
	time: "",
	title: "",
	type: "hotel",
};

const bookingStatusLabels = Object.fromEntries(
	BOOKING_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<BookingStatus, string>;
const bookingStatusValues = BOOKING_STATUS_OPTIONS.map(
	(option) => option.value
) as readonly BookingStatus[];
const BOOKING_ERROR_COPY: Record<string, string> = {
	BOOKING_END_BEFORE_START: "The end must be after the start.",
	INVALID_BOOKING_COST: "Cost cannot be negative.",
	INVALID_BOOKING_TITLE: "Add a title.",
	INVALID_BOOKING_URL: "Use a full link that starts with http or https.",
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

const filterOptions = [
	{ label: "All", value: "all" },
	{ label: "To book", value: "needs" },
	{ label: "Booked", value: "booked" },
] as const;

const typeSectionLabels: Record<BookingType, string> = {
	activity: "Activities",
	flight: "Flights",
	hotel: "Stays",
	insurance: "Insurance",
	other: "Other",
	restaurant: "Restaurants",
	transport: "Transport",
};
const sectionOrder: readonly BookingType[] = [
	"flight",
	"hotel",
	"transport",
	"activity",
	"restaurant",
	"insurance",
	"other",
];
const TIME_ERROR = "Use 24-hour time, for example 08:40.";
const getEmptyMessage = (filter: BookingFilter, toBook: number) => {
	if (filter === "needs") {
		return "Everything is booked.";
	}

	return toBook > 0
		? `Nothing is booked yet. ${formatCount(toBook, "item")} to book.`
		: "Nothing is booked yet.";
};
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

const getBookingType = (value: string): BookingType => {
	const type = value.trim();

	return bookingTypes.has(type) ? (type as BookingType) : "other";
};

const dateTimeSeparator = /[ T]/;

const splitDateTime = (value?: string | null) => {
	const [date = "", time = ""] = (value ?? "").trim().split(dateTimeSeparator);

	return { date, time: time.slice(0, 5) };
};

const joinDateTime = (date: string, time: string) => {
	const trimmedDate = date.trim();
	const trimmedTime = time.trim();

	if (!trimmedDate) {
		return;
	}

	return trimmedTime ? `${trimmedDate} ${trimmedTime}` : trimmedDate;
};

type ParsedBookingForm =
	| { message: string; ok: false }
	| {
			cost: number;
			endDateTime: string | undefined;
			externalUrl: string;
			hasCost: boolean;
			ok: true;
			startDateTime: string | undefined;
			title: string;
	  };

/** Validates the booking form and derives the values that get saved. */
const parseBookingForm = (form: BookingForm): ParsedBookingForm => {
	const title = form.title.trim();

	if (!title) {
		return { message: "Add a title.", ok: false };
	}

	const time = form.time.trim();
	const endTime = form.endTime.trim();

	if (
		(time && !TIME_PATTERN.test(time)) ||
		(endTime && !TIME_PATTERN.test(endTime))
	) {
		return { message: TIME_ERROR, ok: false };
	}

	const cost = Number(form.cost.replaceAll(",", ""));
	const hasCost = Number.isFinite(cost) && cost > 0;
	const startDateTime = joinDateTime(form.date, form.time);
	const endDateTime =
		form.endDate || form.endTime
			? joinDateTime(form.endDate || form.date, form.endTime)
			: undefined;
	const externalUrl = form.externalUrl.trim();
	const inputError = getBookingInputError({
		cost: hasCost ? cost : undefined,
		endDateTime,
		externalUrl,
		startDateTime,
		title,
	});

	if (inputError) {
		return {
			message: BOOKING_ERROR_COPY[inputError] ?? "Check the booking details.",
			ok: false,
		};
	}

	return {
		cost,
		endDateTime: endDateTime ?? undefined,
		externalUrl,
		hasCost,
		ok: true,
		startDateTime: startDateTime ?? undefined,
		title,
	};
};

const omitNulls = <T extends object>(
	value: T
): { [K in keyof T]: Exclude<T[K], null> } =>
	Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== null)
	) as { [K in keyof T]: Exclude<T[K], null> };

/** `null` clears a stored value on update; create drops it with omitNulls. */
const buildBookingPatch = (
	form: BookingForm,
	parsed: Extract<ParsedBookingForm, { ok: true }>,
	isEditing: boolean
) => {
	const empty = isEditing ? null : undefined;

	return {
		confirmationCode: form.confirmationCode.trim() || empty,
		cost: parsed.hasCost ? parsed.cost : empty,
		currency: "PHP",
		endDateTime: parsed.endDateTime ?? empty,
		externalUrl: parsed.externalUrl || empty,
		locationName: form.locationName.trim() || empty,
		notes: form.notes.trim() || empty,
		provider: form.provider.trim() || empty,
		startDateTime: parsed.startDateTime ?? empty,
		status: form.status as BookingStatusValue,
		title: parsed.title,
		type: getBookingType(form.type),
	};
};

const getStatusPresentation = (status: BookingStatus) => {
	switch (status) {
		case "confirmed":
			return {
				icon: "checkmark-circle-outline",
				label: "Confirmed",
				tone: "success",
			} as const;
		case "bookedExternally":
			return {
				icon: "checkmark-circle-outline",
				label: "Booked",
				tone: "success",
			} as const;
		case "missing":
		case "cancelled":
			return {
				icon: "warning-outline",
				label: status === "missing" ? "Missing" : "Cancelled",
				tone: "danger",
			} as const;
		default:
			return {
				icon: "ellipse-outline",
				label: "Not booked",
				tone: "secondary",
			} as const;
	}
};

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
		const itemLabel = `${dayLabel}, ${item.startTime}, ${item.title}`;

		labelByBookingId.set(
			item.bookingId,
			currentLabel ? `${currentLabel}; ${itemLabel}` : itemLabel
		);
	}

	return labelByBookingId;
};

function BookingSheet({
	booking,
	errorMessage,
	form,
	isOpen,
	isSaving,
	itineraryHref,
	onAddToItinerary,
	onDelete,
	onOpenChange,
	onOpenMaps,
	onOpenProof,
	onOpenVault,
	onSubmit,
	onUpdateForm,
	proofMeta,
}: {
	booking: Doc<"bookings"> | null;
	errorMessage: string | null;
	form: BookingForm;
	isOpen: boolean;
	isSaving: boolean;
	itineraryHref: ReturnType<typeof VIYA_ROUTES.tripItinerary> | null;
	onAddToItinerary: () => void;
	onDelete: () => void;
	onOpenChange: (isOpen: boolean) => void;
	onOpenMaps: () => void;
	onOpenProof: () => void;
	onOpenVault: () => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof BookingForm, value: string) => void;
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
		<RecordSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isSaving={isSaving}
			onOpenChange={onOpenChange}
			onSave={onSubmit}
			saveLabel={booking ? "Save" : "Add"}
			title={booking ? "Booking" : "Add booking"}
		>
			<FieldGroup>
				<ChoiceRow
					format={(value: BookingStatus) => bookingStatusLabels[value]}
					label="Status"
					onChange={(value) => onUpdateForm("status", value)}
					options={bookingStatusValues}
					value={form.status}
				/>
				<FieldRow
					label="Title"
					onChangeText={(value) => onUpdateForm("title", value)}
					placeholder="Hotel in Cebu City"
					value={form.title}
				/>
				<ChoiceRow
					format={formatEnumLabel}
					label="Type"
					onChange={(value) => onUpdateForm("type", value)}
					options={bookingTypeOptions}
					value={form.type}
				/>
				<FieldRow
					label="Provider"
					onChangeText={(value) => onUpdateForm("provider", value)}
					placeholder="Airline, hotel or operator"
					value={form.provider}
				/>
				<DatePickerField
					formatDate={(date) => formatDay(formatIsoDate(date))}
					label="Date"
					onChangeText={(value) => onUpdateForm("date", value)}
					value={form.date}
				/>
				<FieldRow
					autoCapitalize="none"
					keyboardType="numbers-and-punctuation"
					label="Time"
					onChangeText={(value) => onUpdateForm("time", value)}
					placeholder="HH:MM"
					value={form.time}
				/>
				<DatePickerField
					formatDate={(date) => formatDay(formatIsoDate(date))}
					label="End date"
					onChangeText={(value) => onUpdateForm("endDate", value)}
					value={form.endDate}
				/>
				<FieldRow
					autoCapitalize="none"
					keyboardType="numbers-and-punctuation"
					label="End time"
					onChangeText={(value) => onUpdateForm("endTime", value)}
					placeholder="HH:MM"
					value={form.endTime}
				/>
				<FieldRow
					label="Confirmation code"
					onChangeText={(value) => onUpdateForm("confirmationCode", value)}
					placeholder="Optional"
					value={form.confirmationCode}
				/>
				<FieldRow
					autoCapitalize="none"
					label="Booking link"
					onChangeText={(value) => onUpdateForm("externalUrl", value)}
					placeholder="https://"
					value={form.externalUrl}
				/>
				<FieldRow
					keyboardType="decimal-pad"
					label="Cost (₱)"
					onChangeText={(value) => onUpdateForm("cost", value)}
					placeholder="0"
					value={form.cost}
				/>
				<FieldRow
					label="Location"
					onChangeText={(value) => onUpdateForm("locationName", value)}
					placeholder="Airport or meeting point"
					value={form.locationName}
				/>
				<FieldRow
					label="Notes"
					multiline={true}
					onChangeText={(value) => onUpdateForm("notes", value)}
					placeholder="Optional"
					value={form.notes}
				/>
			</FieldGroup>

			{booking ? (
				<ListGroup>
					{proofMeta?.url ? (
						<LinkRow
							icon="document-attach-outline"
							label="Open proof"
							onPress={onOpenProof}
						/>
					) : (
						<LinkRow
							icon="cloud-upload-outline"
							label="Add confirmation in Vault"
							onPress={onOpenVault}
						/>
					)}
					{canOpenMaps ? (
						<LinkRow
							icon="map-outline"
							label="Open in Maps"
							onPress={onOpenMaps}
						/>
					) : null}
					{itineraryHref ? (
						<Link asChild href={itineraryHref}>
							<LinkRow icon="calendar-outline" label="Open itinerary" />
						</Link>
					) : (
						<LinkRow
							icon="add-circle-outline"
							label="Add to itinerary"
							onPress={onAddToItinerary}
						/>
					)}
				</ListGroup>
			) : null}

			{booking ? (
				<ListGroup>
					<ListRow
						destructive={true}
						onPress={onDelete}
						showChevron={false}
						title="Delete booking"
					/>
				</ListGroup>
			) : null}
		</RecordSheet>
	);
}

export function BookingHubScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const { confirm } = useFeedback();
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
	const addBookingToItinerary = useMutation(
		api.itinerary.addBookingToItinerary
	);
	const [filter, setFilter] = useState<BookingFilter>("all");
	const [bookingForm, setBookingForm] =
		useState<BookingForm>(initialBookingForm);
	const [editingBookingId, setEditingBookingId] =
		useState<Id<"bookings"> | null>(null);
	const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
	const [isCreatingBooking, setIsCreatingBooking] = useState(false);
	const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(
		null
	);
	const [screenErrorMessage, setScreenErrorMessage] = useState<string | null>(
		null
	);

	if (!tripId) {
		return (
			<ScreenShell
				state={{
					description: "Open a saved trip to see its bookings.",
					icon: "ticket-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Bookings"
			/>
		);
	}

	if (bookings === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading bookings" }}
				title="Bookings"
			/>
		);
	}

	const counts = getBookingCounts(bookings, "PHP");
	const vaultItems: BookingProofVaultItem[] = workspace?.vaultItems ?? [];
	const bookingProofMetaById = getBookingProofMetaById({
		bookings,
		vaultItems,
	});
	const bookingItineraryLabelById = getBookingItineraryLabelById({
		itineraryDays: workspace?.itineraryDays ?? [],
		itineraryItems: workspace?.itineraryItems ?? [],
	});
	const editingBooking =
		bookings.find((booking) => booking._id === editingBookingId) ?? null;

	const visibleBookings = bookings.filter((booking) => {
		if (filter === "needs") {
			return !isBookingSecured(booking.status);
		}
		return filter === "booked" ? isBookingSecured(booking.status) : true;
	});
	const sections = sectionOrder
		.map((type) => ({
			items: visibleBookings
				.filter((booking) => getBookingType(booking.type) === type)
				.sort((left, right) =>
					(left.startDateTime ?? "9999").localeCompare(
						right.startDateTime ?? "9999"
					)
				),
			label: typeSectionLabels[type],
		}))
		.filter((section) => section.items.length > 0);

	const updateBookingForm = (key: keyof BookingForm, value: string) => {
		setBookingErrorMessage(null);
		setBookingForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const closeSheet = () => {
		setIsBookingSheetOpen(false);
		setEditingBookingId(null);
		setBookingErrorMessage(null);
		setBookingForm(initialBookingForm);
	};
	const openCreateSheet = () => {
		setBookingErrorMessage(null);
		setEditingBookingId(null);
		setBookingForm(initialBookingForm);
		setIsBookingSheetOpen(true);
	};
	const openEditSheet = (booking: Doc<"bookings">) => {
		const { date, time } = splitDateTime(booking.startDateTime);
		const end = splitDateTime(booking.endDateTime);

		setBookingErrorMessage(null);
		setEditingBookingId(booking._id);
		setBookingForm({
			confirmationCode: booking.confirmationCode ?? "",
			cost: booking.cost?.toString() ?? "",
			date,
			endDate: end.date,
			endTime: end.time,
			externalUrl: booking.externalUrl ?? "",
			status: booking.status,
			locationName: booking.locationName ?? "",
			notes: booking.notes ?? "",
			provider: booking.provider ?? "",
			time,
			title: booking.title,
			type: booking.type,
		});
		setIsBookingSheetOpen(true);
	};
	const openMaps = async (booking: Doc<"bookings">) => {
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
	const openProof = async (url?: string | null) => {
		if (!url) {
			setBookingErrorMessage("This confirmation is not available yet.");
			return;
		}

		setBookingErrorMessage(null);
		try {
			await Linking.openURL(url);
		} catch {
			setBookingErrorMessage("Could not open this confirmation.");
		}
	};
	const saveBooking = async () => {
		const parsed = parseBookingForm(bookingForm);

		if (!parsed.ok) {
			setBookingErrorMessage(parsed.message);
			return;
		}

		setBookingErrorMessage(null);
		setIsCreatingBooking(true);
		try {
			// null clears a stored value on update; create simply omits it.
			const bookingPatch = buildBookingPatch(
				bookingForm,
				parsed,
				Boolean(editingBookingId)
			);

			if (editingBookingId) {
				await updateBooking({ ...bookingPatch, bookingId: editingBookingId });
			} else {
				await createBookingTarget({ ...omitNulls(bookingPatch), tripId });
			}
			haptic("success");
			closeSheet();
		} catch {
			setBookingErrorMessage("Could not save this booking. Try again.");
		} finally {
			setIsCreatingBooking(false);
		}
	};
	const addToItinerary = async (booking: Doc<"bookings">) => {
		setBookingErrorMessage(null);
		try {
			await addBookingToItinerary({ bookingId: booking._id });
			haptic("success");
			closeSheet();
		} catch {
			setBookingErrorMessage(
				"Could not add this to the itinerary. Give it a date inside the trip, and plan that day first."
			);
		}
	};
	const setStatus = async (
		booking: Doc<"bookings">,
		status: "bookedExternally" | "target"
	) => {
		setScreenErrorMessage(null);
		try {
			await updateBookingStatus({ bookingId: booking._id, status });
			haptic("success");
		} catch {
			setScreenErrorMessage("Could not update this booking. Try again.");
		}
	};
	const removeBooking = async (booking: Doc<"bookings">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete booking",
			destructive: true,
			message: `${booking.title} will be removed from this trip.`,
			title: "Delete booking",
		});
		if (!confirmed) {
			return;
		}

		try {
			await deleteBooking({ bookingId: booking._id });
			haptic("warning");
			if (editingBookingId === booking._id) {
				closeSheet();
			}
		} catch {
			setScreenErrorMessage("Could not delete this booking. Try again.");
		}
	};

	const emptyMessage = getEmptyMessage(filter, counts.toBook);
	let listContent: React.ReactNode;
	if (bookings.length === 0) {
		listContent = (
			<View style={{ gap: spacing.sm }}>
				<EmptyState
					action={{ label: "Add booking", onPress: openCreateSheet }}
					description="Add flights, stays and tours. Mark each one booked once you have paid."
					icon="ticket-outline"
					title="No bookings yet"
				/>
				<SecondaryButton
					label="Import from Vault"
					onPress={() => router.push(VIYA_ROUTES.tripVault(tripId))}
					variant="plain"
				/>
			</View>
		);
	} else if (sections.length === 0) {
		listContent = (
			<AppText style={{ textAlign: "center" }} tone="secondary">
				{emptyMessage}
			</AppText>
		);
	} else {
		listContent = sections.map((section) => (
			<ListGroup header={section.label} key={section.label}>
				{section.items.map((booking) => {
					const status = getStatusPresentation(booking.status);
					const { date: bookingDate, time: bookingTime } = splitDateTime(
						booking.startDateTime
					);
					const day = bookingDate ? formatDay(bookingDate) : "";
					const when = [day, bookingTime ? formatTime(bookingTime) : null]
						.filter(Boolean)
						.join(", ");
					const canMarkBooked = !isBookingSecured(booking.status);

					return (
						<SwipeRow
							key={booking._id}
							leading={
								canMarkBooked
									? {
											icon: "checkmark-circle-outline",
											label: "Booked",
											onPress: () => {
												setStatus(booking, "bookedExternally").catch(
													() => undefined
												);
											},
											tone: "success",
										}
									: undefined
							}
							trailing={{
								icon: "trash-outline",
								label: "Delete",
								onPress: () => {
									removeBooking(booking).catch(() => undefined);
								},
								tone: "danger",
							}}
						>
							<ListRow
								accessibilityLabel={`${booking.title}, ${status.label}. Open`}
								onPress={() => openEditSheet(booking)}
								showChevron={false}
								subtitle={
									[
										when || null,
										booking.provider,
										booking.cost
											? formatMoney(booking.cost, booking.currency)
											: null,
									]
										.filter(Boolean)
										.join(" · ") || undefined
								}
								title={booking.title}
								trailing={
									<StatusLabel
										icon={status.icon}
										label={status.label}
										tone={status.tone}
									/>
								}
							/>
						</SwipeRow>
					);
				})}
			</ListGroup>
		));
	}

	return (
		<>
			<ScreenShell
				actions={
					bookings.length > 0
						? [
								{
									icon: "add",
									key: "add",
									label: "Add booking",
									onPress: openCreateSheet,
									type: "button",
								},
							]
						: []
				}
				title="Bookings"
			>
				{counts.total > 0 ? (
					<AppText tone="secondary" variant="callout">
						{`${counts.booked} of ${counts.total} booked · ${formatMoney(counts.bookedCost)}${counts.toBook > 0 ? ` · ${counts.toBook} to book` : ""}`}
					</AppText>
				) : null}
				{bookings.length > 0 ? (
					<Segmented
						accessibilityLabel="Filter bookings"
						onChange={setFilter}
						options={filterOptions}
						value={filter}
					/>
				) : null}
				{screenErrorMessage ? (
					<AppText accessibilityRole="alert" tone="danger" variant="subhead">
						{screenErrorMessage}
					</AppText>
				) : null}
				{listContent}
			</ScreenShell>

			<BookingSheet
				booking={editingBooking}
				errorMessage={bookingErrorMessage}
				form={bookingForm}
				isOpen={isBookingSheetOpen}
				isSaving={isCreatingBooking}
				itineraryHref={
					editingBooking && bookingItineraryLabelById.has(editingBooking._id)
						? VIYA_ROUTES.tripItinerary(tripId)
						: null
				}
				onAddToItinerary={() => {
					if (editingBooking) {
						addToItinerary(editingBooking).catch(() => undefined);
					}
				}}
				onDelete={() => {
					if (editingBooking) {
						removeBooking(editingBooking).catch(() => undefined);
					}
				}}
				onOpenChange={(isOpen) => {
					if (isOpen) {
						setIsBookingSheetOpen(true);
						return;
					}

					closeSheet();
				}}
				onOpenMaps={() => {
					if (editingBooking) {
						openMaps(editingBooking).catch(() => undefined);
					}
				}}
				onOpenProof={() => {
					openProof(
						editingBooking
							? bookingProofMetaById.get(editingBooking._id)?.url
							: undefined
					).catch(() => undefined);
				}}
				onOpenVault={() => {
					closeSheet();
					router.push(VIYA_ROUTES.tripVault(tripId));
				}}
				onSubmit={() => {
					saveBooking().catch(() => undefined);
				}}
				onUpdateForm={updateBookingForm}
				proofMeta={
					editingBooking
						? bookingProofMetaById.get(editingBooking._id)
						: undefined
				}
			/>
		</>
	);
}
