import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	addDaysToKey,
	getTripDayCount,
	type ItineraryItemCategory,
	type ItineraryItemPriority,
	type ItineraryItemStatus,
	type ItineraryPace,
	isBookingSecured,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import {
	ChoiceChips,
	EmptyPrimary,
	FieldRow,
	FormGroup,
	FormSheet,
	InlineError,
	NotesRow,
	SwipeRow,
	showRowMenu,
} from "@/src/components/itinerary/trip-module-ui";
import {
	AppText,
	haptic,
	Icon,
	ListGroup,
	ListRow,
	PressableScale,
	PrimaryButton,
	ScreenShell,
	Segmented,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	formatCount,
	formatDay,
	formatDuration,
	formatEnumLabel,
	formatMoney,
	formatTime,
	formatTimeRange,
	formatTripRange,
	getMinutesBetween,
	toLocalDateKey,
} from "@/src/lib/format";
import {
	getTripMapSearchUrl,
	hasTripMapSearchTarget,
} from "./trip-map-link-utils";
import {
	PlacesContent,
	PlacesSheets,
	usePlacesController,
} from "./trip-places-screen";
import { useTripIdParam } from "./use-trip-id-param";

/** "Fri 21 Nov", or "Day 3" when the trip has no dates. */
const getDayLabel = (date: string, dayNumber: number) =>
	formatDay(date) || `Day ${dayNumber}`;

const formatPickerTripRange = (startDate: Date, endDate: Date) =>
	formatTripRange(toLocalDateKey(startDate), toLocalDateKey(endDate), {
		year: "auto",
	});

const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;

interface ItineraryItemForm {
	bookingId: string;
	category: string;
	description: string;
	endTime: string;
	estimatedCost: string;
	locationName: string;
	startTime: string;
	title: string;
}

interface ItineraryDayForm {
	estimatedCost: string;
	pace: string;
	summary: string;
	theme: string;
	title: string;
	weatherNote: string;
}

const initialItemForm: ItineraryItemForm = {
	bookingId: "",
	category: "activity",
	description: "",
	endTime: "10:00",
	estimatedCost: "",
	locationName: "",
	startTime: "09:00",
	title: "",
};

const getCompactLabel = (label: string) => {
	const maxLabelLength = 28;

	if (label.length <= maxLabelLength) {
		return label;
	}

	return `${label.slice(0, maxLabelLength - 3).trimEnd()}...`;
};

const getBookingLabel = (booking: Doc<"bookings">) => {
	const detail = [booking.provider, booking.startDateTime].filter(Boolean);

	return detail.length > 0
		? `${booking.title}, ${detail.join(", ")}`
		: booking.title;
};

const defaultItineraryDaySummary =
	"Add places, meals, transfers, and buffers for this day.";
const defaultItineraryDayWeatherNote = "Check forecast closer to travel.";

const initialDayForm: ItineraryDayForm = {
	estimatedCost: "",
	pace: "balanced",
	summary: "",
	theme: "",
	title: "",
	weatherNote: "",
};

const itineraryItemCategoryOptions = [
	"activity",
	"food",
	"transport",
	"hotel",
	"rest",
	"shopping",
	"note",
	"flight",
	"emergency",
] as const;

const itineraryItemCategories = new Set<string>(itineraryItemCategoryOptions);
const itineraryItemPriorities = new Set<string>([
	"required",
	"recommended",
	"optional",
]);
const itineraryItemStatuses = new Set<string>([
	"planned",
	"confirmed",
	"skipped",
	"completed",
]);
const itineraryPaceOptions = ["light", "balanced", "packed"] as const;
const itineraryPaces = new Set<string>(itineraryPaceOptions);

const getItineraryItemCategory = (value: string): ItineraryItemCategory => {
	const category = value.trim();

	return itineraryItemCategories.has(category)
		? (category as ItineraryItemCategory)
		: "activity";
};

const getItineraryItemPriority = (value?: string): ItineraryItemPriority => {
	const priority = value?.trim() ?? "";

	return itineraryItemPriorities.has(priority)
		? (priority as ItineraryItemPriority)
		: "recommended";
};

const getItineraryItemStatus = (value?: string): ItineraryItemStatus => {
	const status = value?.trim() ?? "";

	return itineraryItemStatuses.has(status)
		? (status as ItineraryItemStatus)
		: "planned";
};

const getItineraryPace = (value: string): ItineraryPace => {
	const pace = value.trim();

	return itineraryPaces.has(pace) ? (pace as ItineraryPace) : "balanced";
};

const byStartTime = (
	left: Doc<"itineraryItems">,
	right: Doc<"itineraryItems">
) => left.startTime.localeCompare(right.startTime);

const MAX_PREVIEW_STOPS = 4;

const parseDayNumber = (value?: string) => {
	const parsed = Number(value ?? "1");

	return Number.isFinite(parsed) ? parsed : 1;
};

const validateItemForm = (form: ItineraryItemForm): string | null => {
	if (!(form.title.trim() && form.locationName.trim())) {
		return "Add a title and a location.";
	}

	if (
		!(
			timePattern.test(form.startTime.trim()) &&
			timePattern.test(form.endTime.trim())
		)
	) {
		return "Use 24-hour times, for example 09:00.";
	}

	return null;
};

const toggledStatus = (
	item: Doc<"itineraryItems">,
	status: "completed" | "skipped"
) => (item.status === status ? "planned" : status);

interface ItineraryDayPreview {
	dayDate: string;
	dayNumber: number;
	existingDay: Doc<"itineraryDays"> | undefined;
}

/** One stop: time column, title, location. Used in the overview and the day. */
function StopRow({
	costLabel,
	isBooked,
	item,
	onLongPress,
	onPress,
}: {
	costLabel?: string | null;
	isBooked?: boolean;
	item: Doc<"itineraryItems">;
	onLongPress?: () => void;
	onPress: () => void;
}) {
	const { palette } = useUITheme();
	const isCompleted = item.status === "completed";
	const isSkipped = item.status === "skipped";
	const duration = formatDuration(
		getMinutesBetween(item.startTime, item.endTime)
	);
	const subtitle = [
		item.locationName,
		formatEnumLabel(item.category),
		isBooked ? "Booked" : null,
	]
		.filter(Boolean)
		.join(" · ");
	let statusLabel = "";
	if (isCompleted) {
		statusLabel = ", done";
	} else if (isSkipped) {
		statusLabel = ", skipped";
	}

	return (
		<PressableScale
			accessibilityLabel={`${formatTime(item.startTime)}, ${item.title}${statusLabel}`}
			haptic="selection"
			onLongPress={onLongPress}
			onPress={onPress}
			scaleTo={0.985}
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: 54,
				opacity: isSkipped ? 0.55 : 1,
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing.md,
			}}
		>
			<View style={{ width: 48 }}>
				<AppText bold={true} variant="subhead">
					{formatTime(item.startTime)}
				</AppText>
				{duration ? (
					<AppText tone="secondary" variant="footnote">
						{duration}
					</AppText>
				) : null}
			</View>
			<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
				<AppText
					numberOfLines={2}
					style={isSkipped ? { textDecorationLine: "line-through" } : undefined}
					tone={isCompleted ? "secondary" : "ink"}
				>
					{item.title}
				</AppText>
				{subtitle ? (
					<AppText numberOfLines={1} tone="secondary" variant="subhead">
						{subtitle}
					</AppText>
				) : null}
			</View>
			{costLabel ? (
				<AppText numberOfLines={1} tone="secondary" variant="subhead">
					{costLabel}
				</AppText>
			) : null}
			{isCompleted ? (
				<Icon color={palette.success} name="checkmark-circle" size={20} />
			) : null}
		</PressableScale>
	);
}

function DaySectionHeader({
	dayNumber,
	onPress,
	subhead,
}: {
	dayNumber: number;
	onPress: () => void;
	subhead: string;
}) {
	return (
		<PressableScale
			accessibilityLabel={`Open day ${dayNumber}, ${subhead}`}
			haptic="selection"
			onPress={onPress}
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.sm,
				minHeight: 44,
				paddingHorizontal: spacing.lg,
			}}
		>
			<AppText
				accessibilityRole="header"
				style={{ flex: 1 }}
				variant="headline"
			>
				Day {dayNumber}
			</AppText>
			{subhead ? (
				<AppText tone="secondary" variant="subhead">
					{subhead}
				</AppText>
			) : null}
			<Icon
				name="chevron-forward"
				size={14}
				tone="tertiary"
				weight="semibold"
			/>
		</PressableScale>
	);
}

function DaySection({
	bookedIds,
	items,
	onOpenDay,
	preview,
}: {
	bookedIds: Set<string>;
	items: Doc<"itineraryItems">[];
	onOpenDay: () => void;
	preview: ItineraryDayPreview;
}) {
	const shown = items.slice(0, MAX_PREVIEW_STOPS);
	const hidden = items.length - shown.length;
	const dayCost = items.reduce(
		(sum, item) => sum + Math.max(0, item.estimatedCost),
		0
	);
	const subhead = [
		preview.dayDate ? formatDay(preview.dayDate) : null,
		items.length > 0 ? formatCount(items.length, "stop") : null,
		dayCost > 0 ? formatMoney(dayCost) : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<View>
			<DaySectionHeader
				dayNumber={preview.dayNumber}
				onPress={onOpenDay}
				subhead={subhead}
			/>
			<ListGroup>
				{items.length === 0 ? (
					<ListRow
						onPress={onOpenDay}
						subtitle="Tap to add the first stop"
						title="Nothing planned"
					/>
				) : null}
				{shown.map((item) => (
					<StopRow
						isBooked={Boolean(item.bookingId && bookedIds.has(item.bookingId))}
						item={item}
						key={item._id}
						onPress={onOpenDay}
					/>
				))}
				{hidden > 0 ? (
					<ListRow
						onPress={onOpenDay}
						title={hidden === 1 ? "1 more stop" : `${hidden} more stops`}
					/>
				) : null}
			</ListGroup>
		</View>
	);
}

type PlanSegment = "days" | "places";

const planSegments = [
	{ label: "Days", value: "days" },
	{ label: "Places", value: "places" },
] as const;

/** Itinerary overview: Days and Places under one title. Both routes land here. */
export function TripItineraryScreen({
	initialSegment = "days",
}: {
	initialSegment?: PlanSegment;
}) {
	const tripId = useTripIdParam();
	const router = useRouter();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const places = usePlacesController(tripId);
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
	const [segment, setSegment] = useState<PlanSegment>(initialSegment);
	const [tripDateErrorMessage, setTripDateErrorMessage] = useState<
		string | null
	>(null);
	const [tripDateRange, setTripDateRange] = useState<DateRangeValue>({
		end: "",
		start: "",
	});
	const [isSavingTripDates, setIsSavingTripDates] = useState(false);

	if (!tripId) {
		return (
			<ScreenShell
				state={{
					description: "Open a saved trip before viewing its itinerary.",
					icon: "calendar-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Itinerary"
			/>
		);
	}

	if (workspace === null) {
		return (
			<ScreenShell
				state={{
					description: "This trip was deleted or is no longer available.",
					icon: "calendar-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Itinerary"
			/>
		);
	}

	if (workspace === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading itinerary" }}
				title="Itinerary"
			/>
		);
	}

	const { bookings, itineraryDays, itineraryItems, trip } = workspace;
	const bookedIds = new Set<string>(
		bookings.filter((b) => isBookingSecured(b.status)).map((b) => b._id)
	);
	const calendarDayCount = getTripDayCount(trip.startDate, trip.endDate) ?? 1;
	const itemsByDayId = new Map<Id<"itineraryDays">, Doc<"itineraryItems">[]>();
	const dayByNumber = new Map<number, Doc<"itineraryDays">>();
	const dayByDate = new Map<string, Doc<"itineraryDays">>();

	for (const day of itineraryDays) {
		dayByNumber.set(day.dayNumber, day);
		dayByDate.set(day.date, day);
		itemsByDayId.set(day._id, []);
	}
	for (const item of itineraryItems) {
		itemsByDayId.get(item.dayId)?.push(item);
	}

	const previewDays: ItineraryDayPreview[] = Array.from(
		{ length: calendarDayCount },
		(_, index) => {
			const dayNumber = index + 1;
			const dayDate = trip.startDate ? addDaysToKey(trip.startDate, index) : "";

			return {
				dayDate,
				dayNumber,
				existingDay: dayByNumber.get(dayNumber) ?? dayByDate.get(dayDate),
			};
		}
	);
	const unplannedPlaces = places.savedPlaces.filter(
		(place) => !place.assignedDayId
	);
	const effectiveTripDateRange =
		tripDateRange.start && tripDateRange.end
			? tripDateRange
			: { end: trip.endDate, start: trip.startDate };

	const handleSaveTripDateRange = async () => {
		const startDate = effectiveTripDateRange.start.trim();
		const endDate = effectiveTripDateRange.end.trim();

		if (
			!(startDate && endDate) ||
			(startDate === trip.startDate && endDate === trip.endDate)
		) {
			return;
		}

		setTripDateErrorMessage(null);
		setIsSavingTripDates(true);
		try {
			await updateTripProfile({
				budgetAmount: trip.budgetAmount ?? undefined,
				budgetCurrency: trip.budgetCurrency ?? "PHP",
				destination: trip.destination,
				endDate,
				groupType: trip.groupType ?? "solo",
				pace: trip.pace ?? "balanced",
				startDate,
				summary: trip.summary,
				title: trip.title,
				travelStyle: trip.travelStyle ?? "balanced",
				tripId,
			});
			haptic("success");
		} catch {
			haptic("error");
			setTripDateErrorMessage("Could not update the trip dates.");
		} finally {
			setIsSavingTripDates(false);
		}
	};

	const hasPlaces =
		places.savedPlaces.length > 0 || places.itineraryPlaces.length > 0;

	return (
		<>
			<ScreenShell
				actions={
					segment === "places" && hasPlaces
						? [
								{
									icon: "add",
									key: "add",
									label: "Add place",
									onPress: places.openCreate,
									type: "button",
								},
							]
						: []
				}
				title="Itinerary"
			>
				<Segmented
					accessibilityLabel="Itinerary view"
					onChange={setSegment}
					options={planSegments}
					value={segment}
				/>
				{segment === "days" ? (
					<>
						<InlineError message={tripDateErrorMessage} />
						<DateRangePickerField
							errorText={tripDateErrorMessage ?? undefined}
							formatDateRange={formatPickerTripRange}
							isDisabled={isSavingTripDates}
							label="Trip dates"
							onOpenChange={(isOpen) => {
								if (!isOpen) {
									handleSaveTripDateRange().catch(() => undefined);
								}
							}}
							onValueChange={(value) => {
								setTripDateErrorMessage(null);
								setTripDateRange(value);
							}}
							triggerClassName="min-h-[54px] w-full flex-row items-center gap-2 rounded-[20px] bg-surface px-4"
							triggerVariant="button"
							value={effectiveTripDateRange}
						/>
						{previewDays.map((preview) => (
							<DaySection
								bookedIds={bookedIds}
								items={
									preview.existingDay
										? [
												...(itemsByDayId.get(preview.existingDay._id) ?? []),
											].sort(byStartTime)
										: []
								}
								key={preview.dayNumber}
								onOpenDay={() =>
									router.push(
										VIYA_ROUTES.tripItineraryDay(tripId, preview.dayNumber)
									)
								}
								preview={preview}
							/>
						))}
						{unplannedPlaces.length > 0 ? (
							<ListGroup
								footer="Assign each to a day to add it to your plan."
								header="Not on a day yet"
							>
								{unplannedPlaces.map((place) => (
									<ListRow
										key={place._id}
										onPress={() => places.openDetail(place)}
										subtitle={place.locationName}
										title={place.title}
										value="Assign"
									/>
								))}
							</ListGroup>
						) : null}
					</>
				) : (
					<PlacesContent controller={places} />
				)}
			</ScreenShell>
			<PlacesSheets controller={places} />
		</>
	);
}

function ItineraryItemSheet({
	bookings,
	dayLabel,
	errorMessage,
	form,
	isOpen,
	isSaving,
	item,
	onDelete,
	onOpenBooking,
	onOpenChange,
	onOpenMaps,
	onSubmit,
	onToggleSkip,
	onUpdateForm,
}: {
	bookings: Doc<"bookings">[];
	dayLabel: string;
	errorMessage: string | null;
	form: ItineraryItemForm;
	isOpen: boolean;
	isSaving: boolean;
	item: Doc<"itineraryItems"> | null;
	onDelete: () => void;
	onOpenBooking: () => void;
	onOpenChange: (isOpen: boolean) => void;
	onOpenMaps: () => void;
	onSubmit: () => void;
	onToggleSkip: () => void;
	onUpdateForm: (key: keyof ItineraryItemForm, value: string) => void;
}) {
	const [showMore, setShowMore] = useState(false);
	const visibleBookings = bookings.slice(0, 12);
	const canOpenMaps = item
		? hasTripMapSearchTarget({
				address: item.address,
				latitude: item.latitude,
				locationName: item.locationName,
				longitude: item.longitude,
			})
		: false;

	return (
		<FormSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isPending={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			submitLabel="Save"
			subtitle={dayLabel}
			title={item ? "Edit stop" : "Add stop"}
		>
			<FormGroup>
				<FieldRow
					label="Title"
					onChangeText={(value) => onUpdateForm("title", value)}
					placeholder="Museum visit"
					value={form.title}
				/>
				<FieldRow
					label="Location"
					onChangeText={(value) => onUpdateForm("locationName", value)}
					placeholder="Place or neighborhood"
					value={form.locationName}
				/>
			</FormGroup>
			<FormGroup footer="Use 24-hour times, for example 14:30.">
				<FieldRow
					keyboardType="numbers-and-punctuation"
					label="Starts"
					onChangeText={(value) => onUpdateForm("startTime", value)}
					placeholder="09:00"
					value={form.startTime}
				/>
				<FieldRow
					keyboardType="numbers-and-punctuation"
					label="Ends"
					onChangeText={(value) => onUpdateForm("endTime", value)}
					placeholder="10:00"
					value={form.endTime}
				/>
			</FormGroup>
			<ListGroup>
				<ListRow
					onPress={() => setShowMore((current) => !current)}
					showChevron={false}
					title={showMore ? "Fewer options" : "More options"}
					trailing={
						<Icon
							name={showMore ? "chevron-up" : "chevron-down"}
							size={14}
							tone="tertiary"
							weight="semibold"
						/>
					}
				/>
			</ListGroup>
			{showMore ? (
				<>
					<ChoiceChips
						formatLabel={formatEnumLabel}
						label="Category"
						onChange={(value) => onUpdateForm("category", value)}
						options={itineraryItemCategoryOptions}
						value={form.category}
					/>
					{visibleBookings.length > 0 ? (
						<ChoiceChips
							extraOption={{ label: "None", value: "" }}
							label="Linked booking"
							onChange={(value) => onUpdateForm("bookingId", value)}
							options={visibleBookings.map((booking) => ({
								label: getCompactLabel(getBookingLabel(booking)),
								value: booking._id,
							}))}
							value={form.bookingId}
						/>
					) : null}
					<FormGroup>
						<FieldRow
							keyboardType="numeric"
							label="Cost"
							onChangeText={(value) => onUpdateForm("estimatedCost", value)}
							placeholder="0"
							value={form.estimatedCost}
						/>
						<NotesRow
							label="Notes"
							onChangeText={(value) => onUpdateForm("description", value)}
							placeholder="Tickets, buffers, reminders"
							value={form.description}
						/>
					</FormGroup>
				</>
			) : null}
			{item ? (
				<ListGroup>
					{canOpenMaps ? (
						<ListRow
							leading={<Icon name="map-outline" size={20} />}
							onPress={onOpenMaps}
							showChevron={false}
							title="Open Maps"
						/>
					) : null}
					{item.bookingId ? (
						<ListRow
							leading={<Icon name="ticket-outline" size={20} />}
							onPress={onOpenBooking}
							showChevron={false}
							title="Open booking"
						/>
					) : null}
					<ListRow
						leading={<Icon name="remove-circle-outline" size={20} />}
						onPress={onToggleSkip}
						showChevron={false}
						title={item.status === "skipped" ? "Restore stop" : "Skip stop"}
					/>
					<ListRow
						destructive={true}
						leading={<Icon name="trash-outline" size={20} tone="danger" />}
						onPress={onDelete}
						showChevron={false}
						title="Delete stop"
					/>
				</ListGroup>
			) : null}
		</FormSheet>
	);
}

function ItineraryDaySheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	errorMessage: string | null;
	form: ItineraryDayForm;
	isOpen: boolean;
	isSaving: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof ItineraryDayForm, value: string) => void;
}) {
	return (
		<FormSheet
			errorMessage={errorMessage}
			isOpen={isOpen}
			isPending={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			submitLabel="Save"
			title="Edit day"
		>
			<FormGroup>
				<FieldRow
					label="Title"
					onChangeText={(value) => onUpdateForm("title", value)}
					placeholder="Day 1"
					value={form.title}
				/>
				<FieldRow
					label="Theme"
					onChangeText={(value) => onUpdateForm("theme", value)}
					placeholder="Arrival"
					value={form.theme}
				/>
				<FieldRow
					keyboardType="numeric"
					label="Day budget (₱)"
					onChangeText={(value) => onUpdateForm("estimatedCost", value)}
					placeholder="0"
					value={form.estimatedCost}
				/>
			</FormGroup>
			<ChoiceChips
				formatLabel={formatEnumLabel}
				label="Pace"
				onChange={(value) => onUpdateForm("pace", value)}
				options={itineraryPaceOptions}
				value={form.pace}
			/>
			<FormGroup header="Summary">
				<NotesRow
					label="Summary"
					onChangeText={(value) => onUpdateForm("summary", value)}
					placeholder="What should this day accomplish?"
					value={form.summary}
				/>
			</FormGroup>
			<FormGroup header="Weather">
				<NotesRow
					label="Weather note"
					onChangeText={(value) => onUpdateForm("weatherNote", value)}
					placeholder="Backup plans for rain"
					value={form.weatherNote}
				/>
			</FormGroup>
		</FormSheet>
	);
}

function PlannedDayContent({
	bookedIds,
	dayCost,
	dayItems,
	onDeleteDay,
	onDeleteItem,
	onEditDay,
	onEditItem,
	onShowMenu,
	onToggleComplete,
	selectedDay,
}: {
	bookedIds: Set<string>;
	dayCost: number;
	dayItems: Doc<"itineraryItems">[];
	onDeleteDay: () => void;
	onDeleteItem: (item: Doc<"itineraryItems">) => void;
	onEditDay: () => void;
	onEditItem: (item: Doc<"itineraryItems">) => void;
	onShowMenu: (item: Doc<"itineraryItems">) => void;
	onToggleComplete: (item: Doc<"itineraryItems">) => void;
	selectedDay: Doc<"itineraryDays">;
}) {
	const hasSummary =
		selectedDay.summary && selectedDay.summary !== defaultItineraryDaySummary;
	const hasWeather =
		selectedDay.weatherNote &&
		selectedDay.weatherNote !== defaultItineraryDayWeatherNote;

	return (
		<>
			{hasSummary ? (
				<AppText tone="secondary">{selectedDay.summary}</AppText>
			) : null}
			{dayItems.length === 0 ? (
				<EmptyPrimary
					description="Add a stop with a start time and a place."
					title="No stops on this day yet"
				/>
			) : (
				<ListGroup
					footer="Swipe a stop to mark it done or delete it."
					header="Stops"
				>
					{dayItems.map((item) => (
						<SwipeRow
							key={item._id}
							leading={{
								icon: "checkmark-circle-outline",
								label: item.status === "completed" ? "Undo" : "Done",
								onPress: () => onToggleComplete(item),
								tone: "success",
							}}
							trailing={{
								icon: "trash-outline",
								label: "Delete",
								onPress: () => {
									onDeleteItem(item);
								},
								tone: "danger",
							}}
						>
							<StopRow
								costLabel={
									item.estimatedCost > 0
										? formatMoney(item.estimatedCost)
										: null
								}
								isBooked={Boolean(
									item.bookingId && bookedIds.has(item.bookingId)
								)}
								item={item}
								onLongPress={() => onShowMenu(item)}
								onPress={() => onEditItem(item)}
							/>
						</SwipeRow>
					))}
				</ListGroup>
			)}
			<ListGroup header="Day">
				<ListRow
					onPress={onEditDay}
					title="Pace"
					value={formatEnumLabel(selectedDay.pace)}
				/>
				{dayCost > 0 || selectedDay.estimatedCost > 0 ? (
					<ListRow
						onPress={onEditDay}
						title="Planned cost"
						value={
							selectedDay.estimatedCost > 0
								? `${formatMoney(dayCost)} of ${formatMoney(selectedDay.estimatedCost)}`
								: formatMoney(dayCost)
						}
					/>
				) : null}
				{hasWeather ? (
					<ListRow
						onPress={onEditDay}
						title="Weather"
						value={getCompactLabel(selectedDay.weatherNote)}
					/>
				) : null}
				<ListRow onPress={onEditDay} title="Edit day" />
			</ListGroup>
			<ListGroup>
				<ListRow
					destructive={true}
					onPress={() => {
						onDeleteDay();
					}}
					showChevron={false}
					title="Delete day"
				/>
			</ListGroup>
		</>
	);
}

function showStopActionMenu(
	item: Doc<"itineraryItems">,
	handlers: {
		onDelete: () => void;
		onEdit: () => void;
		onOpenBooking: () => void;
		onOpenMaps: () => void;
	}
) {
	const canOpenMaps = hasTripMapSearchTarget({
		address: item.address,
		latitude: item.latitude,
		locationName: item.locationName,
		longitude: item.longitude,
	});

	showRowMenu(item.title, [
		{ label: "Edit stop", onPress: handlers.onEdit },
		...(canOpenMaps
			? [{ label: "Open Maps", onPress: handlers.onOpenMaps }]
			: []),
		...(item.bookingId
			? [{ label: "Open booking", onPress: handlers.onOpenBooking }]
			: []),
		{ destructive: true, label: "Delete stop", onPress: handlers.onDelete },
	]);
}

const getDayCost = (items: Doc<"itineraryItems">[]) =>
	items.reduce((sum, item) => sum + Math.max(0, item.estimatedCost), 0);

const getSecuredBookingIds = (bookings: Doc<"bookings">[]) =>
	new Set<string>(
		bookings.filter((b) => isBookingSecured(b.status)).map((b) => b._id)
	);

const isDayOutsideTrip = (
	dayNumber: number,
	tripDays: number | null,
	selectedDay: Doc<"itineraryDays"> | null
) =>
	dayNumber < 1 || (tripDays !== null && dayNumber > tripDays && !selectedDay);

const getDaySummary = (
	dayLabel: string,
	theme: string | undefined,
	items: Doc<"itineraryItems">[]
) => {
	const first = items.at(0);
	const latestEnd = items.reduce(
		(latest, item) => (item.endTime > latest ? item.endTime : latest),
		""
	);

	return [
		dayLabel,
		theme && theme !== "Open planning" ? theme : null,
		items.length > 0 ? formatCount(items.length, "stop") : null,
		first ? formatTimeRange(first.startTime, latestEnd) : null,
	]
		.filter(Boolean)
		.join(" · ");
};

export function TripItineraryDayScreen() {
	const { confirm } = useFeedback();
	const tripId = useTripIdParam();
	const router = useRouter();
	const { dayNumber: dayNumberParam } = useLocalSearchParams<{
		dayNumber?: string;
	}>();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const createItineraryDay = useMutation(api.itinerary.createItineraryDay);
	const createItineraryItem = useMutation(api.itinerary.createItineraryItem);
	const deleteItineraryDay = useMutation(api.itinerary.deleteItineraryDay);
	const deleteItineraryItem = useMutation(api.itinerary.deleteItineraryItem);
	const updateItineraryDay = useMutation(api.itinerary.updateItineraryDay);
	const updateItineraryItem = useMutation(api.itinerary.updateItineraryItem);
	const [itemForm, setItemForm] = useState<ItineraryItemForm>(initialItemForm);
	const [dayForm, setDayForm] = useState<ItineraryDayForm>(initialDayForm);
	const [editingItemId, setEditingItemId] =
		useState<Id<"itineraryItems"> | null>(null);
	const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
	const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
	const [isSavingDay, setIsSavingDay] = useState(false);
	const [isSavingItem, setIsSavingItem] = useState(false);
	const [dayErrorMessage, setDayErrorMessage] = useState<string | null>(null);
	const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
	const [itineraryErrorMessage, setItineraryErrorMessage] = useState<
		string | null
	>(null);
	const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);

	const updateItemForm = (key: keyof ItineraryItemForm, value: string) => {
		setItemErrorMessage(null);
		setItemForm((currentForm) => ({ ...currentForm, [key]: value }));
	};
	const updateDayForm = (key: keyof ItineraryDayForm, value: string) => {
		setDayErrorMessage(null);
		setDayForm((currentForm) => ({ ...currentForm, [key]: value }));
	};

	if (!tripId) {
		return (
			<ScreenShell
				state={{
					description: "Open a saved trip before viewing its itinerary.",
					icon: "calendar-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Day"
			/>
		);
	}

	if (workspace === null) {
		return (
			<ScreenShell
				state={{
					description: "This trip was deleted or is no longer available.",
					icon: "calendar-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Day"
			/>
		);
	}

	if (workspace === undefined) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading itinerary" }}
				title="Day"
			/>
		);
	}

	const { bookings, itineraryDays, itineraryItems, trip } = workspace;
	const itemsByDayId = new Map<Id<"itineraryDays">, Doc<"itineraryItems">[]>();
	const dayByNumber = new Map<number, Doc<"itineraryDays">>();
	const dayByDate = new Map<string, Doc<"itineraryDays">>();

	for (const day of itineraryDays) {
		dayByNumber.set(day.dayNumber, day);
		dayByDate.set(day.date, day);
		itemsByDayId.set(day._id, []);
	}
	for (const item of itineraryItems) {
		itemsByDayId.get(item.dayId)?.push(item);
	}

	const dayNumber = parseDayNumber(dayNumberParam);
	const selectedDay = dayByNumber.get(dayNumber) ?? null;
	const editingItem =
		itineraryItems.find((item) => item._id === editingItemId) ?? null;
	const calendarDate = trip.startDate
		? addDaysToKey(trip.startDate, dayNumber - 1)
		: "";
	const dayLabel = getDayLabel(selectedDay?.date ?? calendarDate, dayNumber);
	const dayItems = selectedDay
		? [...(itemsByDayId.get(selectedDay._id) ?? [])].sort(byStartTime)
		: [];

	const handleAddDay = async () => {
		if (isSavingDay) {
			return null;
		}

		setItineraryErrorMessage(null);
		const date =
			calendarDate ||
			(trip.startDate
				? addDaysToKey(trip.startDate, itineraryDays.length)
				: "");
		setIsSavingDay(true);
		try {
			const createdDay = await createItineraryDay({
				date,
				dayNumber,
				estimatedCost: 0,
				pace: "balanced",
				summary: defaultItineraryDaySummary,
				theme: "Open planning",
				title: `Day ${dayNumber}`,
				tripId,
				weatherNote: defaultItineraryDayWeatherNote,
			});
			haptic("success");
			return createdDay ?? null;
		} catch {
			haptic("error");
			setItineraryErrorMessage("Could not start this day.");
			return null;
		} finally {
			setIsSavingDay(false);
		}
	};
	const openCreateItem = () => {
		setItemErrorMessage(null);
		setItineraryErrorMessage(null);
		setEditingItemId(null);
		setItemForm(initialItemForm);
		setIsItemSheetOpen(true);
	};
	const openEditItem = (item: Doc<"itineraryItems">) => {
		setItemErrorMessage(null);
		setItineraryErrorMessage(null);
		setEditingItemId(item._id);
		setItemForm({
			bookingId: item.bookingId ?? "",
			category: item.category,
			description:
				item.description === "Planned trip item." ? "" : item.description,
			endTime: item.endTime,
			estimatedCost:
				item.estimatedCost > 0 ? item.estimatedCost.toString() : "",
			locationName: item.locationName,
			startTime: item.startTime,
			title: item.title,
		});
		setIsItemSheetOpen(true);
	};
	const openEditDay = (day: Doc<"itineraryDays">) => {
		setDayErrorMessage(null);
		setItineraryErrorMessage(null);
		setDayForm({
			estimatedCost: day.estimatedCost > 0 ? day.estimatedCost.toString() : "",
			pace: day.pace,
			summary: day.summary === defaultItineraryDaySummary ? "" : day.summary,
			theme: day.theme,
			title: day.title,
			weatherNote:
				day.weatherNote === defaultItineraryDayWeatherNote
					? ""
					: day.weatherNote,
		});
		setIsDaySheetOpen(true);
	};
	const handleSaveDay = async () => {
		if (!selectedDay) {
			setDayErrorMessage("Choose a day to edit.");
			return;
		}

		const estimatedCost = Number(dayForm.estimatedCost.replaceAll(",", ""));
		setDayErrorMessage(null);
		setIsSavingDay(true);
		try {
			await updateItineraryDay({
				date: selectedDay.date,
				dayId: selectedDay._id,
				estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
				pace: getItineraryPace(dayForm.pace),
				summary: dayForm.summary.trim() || defaultItineraryDaySummary,
				theme: dayForm.theme.trim() || selectedDay.theme,
				title: dayForm.title.trim() || selectedDay.title,
				weatherNote: dayForm.weatherNote.trim(),
			});
			haptic("success");
			setIsDaySheetOpen(false);
			setDayForm(initialDayForm);
		} catch {
			haptic("error");
			setDayErrorMessage("Could not save the day.");
		} finally {
			setIsSavingDay(false);
		}
	};
	const handleSaveItem = async () => {
		if (!selectedDay) {
			setItemErrorMessage("Start this day before adding a stop.");
			return;
		}

		const validationError = validateItemForm(itemForm);
		if (validationError) {
			setItemErrorMessage(validationError);
			return;
		}

		const title = itemForm.title.trim();
		const locationName = itemForm.locationName.trim();
		const startTime = itemForm.startTime.trim();
		const endTime = itemForm.endTime.trim();
		const estimatedCost = Number(itemForm.estimatedCost.replaceAll(",", ""));
		const bookingId = itemForm.bookingId.trim();
		setItemErrorMessage(null);
		setIsSavingItem(true);
		try {
			const itemPatch = {
				address: locationName,
				aiReason:
					editingItem?.aiReason ?? "Added manually in the itinerary module.",
				bookingId: bookingId || (editingItemId ? "" : undefined),
				category: getItineraryItemCategory(itemForm.category),
				dayId: selectedDay._id,
				description: itemForm.description.trim() || "Planned trip item.",
				durationMinutes: getMinutesBetween(startTime, endTime),
				endTime,
				estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
				locationName,
				priority: getItineraryItemPriority(editingItem?.priority),
				startTime,
				status: getItineraryItemStatus(editingItem?.status),
				title,
			} as const;

			if (editingItemId) {
				await updateItineraryItem({ ...itemPatch, itemId: editingItemId });
			} else {
				await createItineraryItem({ ...itemPatch, tripId });
			}
			haptic("success");
			setIsItemSheetOpen(false);
			setEditingItemId(null);
			setItemForm(initialItemForm);
		} catch {
			haptic("error");
			setItemErrorMessage("Could not save the stop.");
		} finally {
			setIsSavingItem(false);
		}
	};
	const updateItemStatus = async (
		itemId: Id<"itineraryItems">,
		status: "planned" | "confirmed" | "skipped" | "completed"
	) => {
		try {
			await updateItineraryItem({ itemId, status });
			haptic(status === "completed" ? "success" : "selection");
		} catch {
			haptic("error");
			setItineraryErrorMessage("Could not update the stop.");
		}
	};
	const handleDeleteDay = async (dayId: Id<"itineraryDays">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete day",
			destructive: true,
			message: "This day and its stops will be removed from the itinerary.",
			title: "Delete this day?",
		});
		if (!confirmed) {
			return;
		}
		try {
			await deleteItineraryDay({ dayId });
			haptic("warning");
			router.back();
		} catch {
			setItineraryErrorMessage("Could not delete the day.");
		}
	};
	const handleDeleteItem = async (itemId: Id<"itineraryItems">) => {
		setIsItemSheetOpen(false);
		const confirmed = await confirm({
			confirmLabel: "Delete stop",
			destructive: true,
			message: "This stop will be removed from the day.",
			title: "Delete this stop?",
		});
		if (!confirmed) {
			return;
		}
		try {
			await deleteItineraryItem({ itemId });
			haptic("warning");
		} catch {
			setItineraryErrorMessage("Could not delete the stop.");
		}
	};
	const handleOpenMaps = async (item: Doc<"itineraryItems">) => {
		setMapErrorMessage(null);
		try {
			await Linking.openURL(
				getTripMapSearchUrl({
					address: item.address,
					label: item.title,
					latitude: item.latitude,
					locationName: item.locationName,
					longitude: item.longitude,
				})
			);
		} catch {
			setMapErrorMessage("Could not open Maps for this stop.");
		}
	};
	const openBooking = () => {
		setIsItemSheetOpen(false);
		router.push(VIYA_ROUTES.tripBookings(tripId));
	};
	const toggleSkip = (item: Doc<"itineraryItems">) => {
		setIsItemSheetOpen(false);
		updateItemStatus(item._id, toggledStatus(item, "skipped")).catch(
			() => undefined
		);
	};
	const toggleComplete = (item: Doc<"itineraryItems">) => {
		updateItemStatus(item._id, toggledStatus(item, "completed")).catch(
			() => undefined
		);
	};
	const showStopMenu = (item: Doc<"itineraryItems">) =>
		showStopActionMenu(item, {
			onDelete: () => {
				handleDeleteItem(item._id).catch(() => undefined);
			},
			onEdit: () => openEditItem(item),
			onOpenBooking: () => router.push(VIYA_ROUTES.tripBookings(tripId)),
			onOpenMaps: () => {
				handleOpenMaps(item).catch(() => undefined);
			},
		});

	const isPlanned = Boolean(selectedDay);
	const tripDays = getTripDayCount(trip.startDate, trip.endDate);
	if (isDayOutsideTrip(dayNumber, tripDays, selectedDay)) {
		return (
			<ScreenShell
				state={{
					action: {
						label: "Back to itinerary",
						onPress: () => router.back(),
					},
					description: `This trip has ${formatCount(tripDays ?? 1, "day")}.`,
					icon: "calendar-outline",
					kind: "empty",
					title: "This day is not in the trip",
				}}
				title="Day"
			/>
		);
	}
	const dayCost = getDayCost(dayItems);
	const bookedIds = getSecuredBookingIds(bookings);
	const summary = getDaySummary(dayLabel, selectedDay?.theme, dayItems);

	return (
		<>
			<ScreenShell
				footer={
					<PrimaryButton
						icon="add"
						isPending={isSavingDay}
						label={isPlanned ? "Add stop" : "Plan this day"}
						onPress={() => {
							if (isPlanned) {
								openCreateItem();
								return;
							}
							handleAddDay().catch(() => undefined);
						}}
					/>
				}
				summary={summary}
				title={`Day ${dayNumber}`}
			>
				<InlineError message={itineraryErrorMessage} />
				<InlineError message={mapErrorMessage} />
				{selectedDay ? (
					<PlannedDayContent
						bookedIds={bookedIds}
						dayCost={dayCost}
						dayItems={dayItems}
						onDeleteDay={() => {
							handleDeleteDay(selectedDay._id).catch(() => undefined);
						}}
						onDeleteItem={(item) => {
							handleDeleteItem(item._id).catch(() => undefined);
						}}
						onEditDay={() => openEditDay(selectedDay)}
						onEditItem={openEditItem}
						onShowMenu={showStopMenu}
						onToggleComplete={toggleComplete}
						selectedDay={selectedDay}
					/>
				) : (
					<EmptyPrimary
						description="Plan this day to add stops with times and places."
						title={
							dayLabel.startsWith("Day ")
								? "Nothing planned for this day"
								: `Nothing planned for ${dayLabel}`
						}
					/>
				)}
			</ScreenShell>
			<ItineraryItemSheet
				bookings={bookings}
				dayLabel={dayLabel}
				errorMessage={itemErrorMessage}
				form={itemForm}
				isOpen={isItemSheetOpen}
				isSaving={isSavingItem}
				item={editingItem}
				onDelete={() => {
					if (editingItem) {
						handleDeleteItem(editingItem._id).catch(() => undefined);
					}
				}}
				onOpenBooking={openBooking}
				onOpenChange={(isOpen) => {
					setIsItemSheetOpen(isOpen);
					if (!isOpen) {
						setEditingItemId(null);
						setItemErrorMessage(null);
						setItemForm(initialItemForm);
					}
				}}
				onOpenMaps={() => {
					if (editingItem) {
						handleOpenMaps(editingItem).catch(() => undefined);
					}
				}}
				onSubmit={handleSaveItem}
				onToggleSkip={() => {
					if (editingItem) {
						toggleSkip(editingItem);
					}
				}}
				onUpdateForm={updateItemForm}
			/>
			<ItineraryDaySheet
				errorMessage={dayErrorMessage}
				form={dayForm}
				isOpen={isDaySheetOpen}
				isSaving={isSavingDay}
				onOpenChange={(isOpen) => {
					setIsDaySheetOpen(isOpen);
					if (!isOpen) {
						setDayErrorMessage(null);
						setDayForm(initialDayForm);
					}
				}}
				onSubmit={handleSaveDay}
				onUpdateForm={updateDayForm}
			/>
		</>
	);
}
