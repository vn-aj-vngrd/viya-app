import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import type {
	ItineraryItemCategory,
	ItineraryItemPriority,
	ItineraryItemStatus,
	ItineraryPace,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Menu } from "heroui-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import { getDateRangeDurationDays } from "@/src/components/date/date-format-utils";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import {
	ActionPill,
	ChoiceChips,
	FormField,
	FormSheet,
	FormTextArea,
	IconBadge,
	InlineError,
	MenuAction,
	MenuDivider,
	MenuPanel,
	MetaTag,
	ModuleLoading,
	ModuleMissing,
	ModuleScroll,
	OverflowTrigger,
	Reveal,
} from "@/src/components/itinerary/trip-module-ui";
import {
	AppText,
	Card,
	GlassIconButton,
	haptic,
	type IconName,
	PressableScale,
	PrimaryButton,
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

const formatCost = (amount: number, currency = "PHP") =>
	new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	}).format(amount);

const dayTabLabelFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "numeric",
	timeZone: "UTC",
	weekday: "short",
});
const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
});
const compactDateWithYearFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
	year: "numeric",
});
const compactMonthFormatter = new Intl.DateTimeFormat("en-US", {
	month: "short",
});
const yearFormatter = new Intl.DateTimeFormat("en-US", {
	year: "numeric",
});

const formatCompactTripDateRange = (startDate: Date, endDate: Date) => {
	const startYear = startDate.getFullYear();
	const endYear = endDate.getFullYear();
	const startMonth = startDate.getMonth();
	const endMonth = endDate.getMonth();

	if (startYear === endYear && startMonth === endMonth) {
		return `${compactMonthFormatter.format(startDate)} ${startDate.getDate()}-${endDate.getDate()}, ${yearFormatter.format(endDate)}`;
	}

	if (startYear === endYear) {
		return `${compactDateFormatter.format(startDate)} - ${compactDateWithYearFormatter.format(endDate)}`;
	}

	return `${compactDateWithYearFormatter.format(startDate)} - ${compactDateWithYearFormatter.format(endDate)}`;
};

const getItineraryDateValue = (date: string) => {
	const parsedDate = new Date(`${date}T12:00:00.000Z`);

	return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const getDayTabLabel = (date: string, dayNumber: number) => {
	const parsedDate = getItineraryDateValue(date);

	return parsedDate
		? dayTabLabelFormatter.format(parsedDate)
		: `Day ${dayNumber}`;
};

const addDays = (date: string, days: number) => {
	const value = new Date(`${date}T00:00:00.000Z`);
	value.setUTCDate(value.getUTCDate() + days);

	return value.toISOString().slice(0, 10);
};

const getDurationMinutes = (startTime: string, endTime: string) => {
	const [startHour = "0", startMinute = "0"] = startTime.split(":");
	const [endHour = "0", endMinute = "0"] = endTime.split(":");
	const startTotal = Number(startHour) * 60 + Number(startMinute);
	const endTotal = Number(endHour) * 60 + Number(endMinute);
	const duration = endTotal - startTotal;

	return Number.isFinite(duration) && duration > 0 ? duration : 60;
};

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
	date: string;
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
	estimatedCost: "0",
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
		? `${booking.title} · ${detail.join(" · ")}`
		: booking.title;
};

const defaultItineraryDaySummary =
	"Add places, meals, transfers, and buffers for this day.";
const defaultItineraryDayWeatherNote = "Check forecast closer to travel.";

const initialDayForm: ItineraryDayForm = {
	date: "",
	estimatedCost: "0",
	pace: "balanced",
	summary: defaultItineraryDaySummary,
	theme: "",
	title: "",
	weatherNote: defaultItineraryDayWeatherNote,
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
const itineraryItemPriorityOptions = [
	"required",
	"recommended",
	"optional",
] as const;
const itineraryItemStatusOptions = [
	"planned",
	"confirmed",
	"skipped",
	"completed",
] as const;
const itineraryPaceOptions = ["light", "balanced", "packed"] as const;
const itineraryItemPriorities = new Set<string>(itineraryItemPriorityOptions);
const itineraryItemStatuses = new Set<string>(itineraryItemStatusOptions);
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

const formatChoiceLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

function BookingPicker({
	bookings,
	onChange,
	value,
}: {
	bookings: Doc<"bookings">[];
	onChange: (value: string) => void;
	value: string;
}) {
	const visibleBookings = bookings.slice(0, 12);

	return (
		<View style={{ gap: spacing.sm }}>
			<ChoiceChips
				extraOption={{ label: "None", value: "" }}
				label="Linked booking"
				onChange={onChange}
				options={visibleBookings.map((booking) => ({
					label: getCompactLabel(getBookingLabel(booking)),
					value: booking._id,
				}))}
				value={value}
			/>
			{bookings.length > visibleBookings.length ? (
				<AppText tone="secondary" variant="footnote">
					Showing the most relevant {visibleBookings.length} booking targets.
				</AppText>
			) : null}
		</View>
	);
}

const ITINERARY_CATEGORY_ICON: Record<string, IconName> = {
	activity: "sparkles-outline",
	emergency: "medkit-outline",
	flight: "airplane-outline",
	food: "restaurant-outline",
	hotel: "bed-outline",
	note: "document-text-outline",
	rest: "cafe-outline",
	shopping: "bag-handle-outline",
	transport: "car-outline",
};

const getCategoryIcon = (category: string): IconName =>
	ITINERARY_CATEGORY_ICON[category] ?? "ellipse-outline";

function ItineraryTimelineNode({
	category,
	isCompleted,
	isConnected,
	isPending,
	isSkipped,
	onToggleComplete,
}: {
	category: string;
	isCompleted: boolean;
	isConnected: boolean;
	isPending: boolean;
	isSkipped: boolean;
	onToggleComplete: () => void;
}) {
	const { palette } = useUITheme();
	let background = palette.fill;
	let iconColor = palette.accent;
	let iconName: IconName = getCategoryIcon(category);

	if (isCompleted) {
		background = palette.success;
		iconColor = palette.onPrimary;
		iconName = "checkmark";
	} else if (isSkipped) {
		iconColor = palette.inkTertiary;
	}

	return (
		<View style={{ alignItems: "center", alignSelf: "stretch" }}>
			<PressableScale
				accessibilityLabel={
					isCompleted ? "Mark stop as planned" : "Mark stop completed"
				}
				accessibilityRole="checkbox"
				accessibilityState={{ checked: isCompleted, disabled: isPending }}
				disabled={isPending}
				haptic="none"
				hitSlop={4}
				onPress={onToggleComplete}
				style={{
					alignItems: "center",
					backgroundColor: background,
					borderRadius: radius.pill,
					height: 36,
					justifyContent: "center",
					opacity: isPending ? 0.6 : 1,
					width: 36,
				}}
			>
				<Ionicons color={iconColor} name={iconName} size={17} />
			</PressableScale>
			{isConnected ? (
				<View
					style={{
						backgroundColor: palette.separator,
						borderRadius: radius.pill,
						flex: 1,
						marginTop: 6,
						width: 2,
					}}
				/>
			) : null}
		</View>
	);
}

function ItineraryItemActionsMenu({
	hasBooking,
	hasMapTarget,
	isPending,
	isSkipped,
	onDelete,
	onEdit,
	onOpenBooking,
	onOpenMaps,
	onToggleSkip,
}: {
	hasBooking: boolean;
	hasMapTarget: boolean;
	isPending: boolean;
	isSkipped: boolean;
	onDelete: () => void;
	onEdit: () => void;
	onOpenBooking: () => void;
	onOpenMaps: () => void;
	onToggleSkip: () => void;
}) {
	return (
		<Menu>
			<OverflowTrigger disabled={isPending} label="Stop options" />
			<MenuPanel>
				<MenuAction icon="create-outline" label="Edit stop" onPress={onEdit} />
				{hasMapTarget ? (
					<MenuAction
						icon="map-outline"
						label="Open in Maps"
						onPress={onOpenMaps}
					/>
				) : null}
				{hasBooking ? (
					<MenuAction
						icon="ticket-outline"
						label="View booking"
						onPress={onOpenBooking}
					/>
				) : null}
				<MenuAction
					icon={isSkipped ? "refresh-outline" : "remove-circle-outline"}
					label={isSkipped ? "Restore stop" : "Skip stop"}
					onPress={onToggleSkip}
				/>
				<MenuDivider />
				<MenuAction
					danger={true}
					icon="trash-outline"
					label="Delete stop"
					onPress={onDelete}
				/>
			</MenuPanel>
		</Menu>
	);
}

function ItineraryItemSheet({
	bookings,
	day,
	errorMessage,
	form,
	isOpen,
	isSaving,
	mode,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	bookings: Doc<"bookings">[];
	day: Doc<"itineraryDays"> | null;
	errorMessage: string | null;
	form: ItineraryItemForm;
	isOpen: boolean;
	isSaving: boolean;
	mode: "create" | "edit";
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof ItineraryItemForm, value: string) => void;
}) {
	return (
		<FormSheet
			closeLabel="Close itinerary item form"
			errorMessage={errorMessage}
			isDisabled={!day}
			isOpen={isOpen}
			isPending={isSaving}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			snapPoint="86%"
			submitLabel={mode === "edit" ? "Save item" : "Add item"}
			subtitle={day ? `Day ${day.dayNumber} · ${day.date}` : "Select a day"}
			title={mode === "edit" ? "Edit itinerary item" : "Add itinerary item"}
		>
			<FormField
				label="Title"
				onChangeText={(value) => onUpdateForm("title", value)}
				placeholder="Museum visit"
				value={form.title}
			/>
			<FormField
				label="Location"
				onChangeText={(value) => onUpdateForm("locationName", value)}
				placeholder="Place or neighborhood"
				value={form.locationName}
			/>
			<View style={{ flexDirection: "row", gap: spacing.md }}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<FormField
						label="Start"
						onChangeText={(value) => onUpdateForm("startTime", value)}
						placeholder="09:00"
						value={form.startTime}
					/>
				</View>
				<View style={{ flex: 1, minWidth: 0 }}>
					<FormField
						label="End"
						onChangeText={(value) => onUpdateForm("endTime", value)}
						placeholder="10:00"
						value={form.endTime}
					/>
				</View>
			</View>
			<ChoiceChips
				formatLabel={formatChoiceLabel}
				label="Category"
				onChange={(value) => onUpdateForm("category", value)}
				options={itineraryItemCategoryOptions}
				value={form.category}
			/>
			<BookingPicker
				bookings={bookings}
				onChange={(value) => onUpdateForm("bookingId", value)}
				value={form.bookingId}
			/>
			<FormField
				keyboardType="numeric"
				label="Cost"
				onChangeText={(value) => onUpdateForm("estimatedCost", value)}
				placeholder="0"
				value={form.estimatedCost}
			/>
			<FormTextArea
				label="Notes"
				onChangeText={(value) => onUpdateForm("description", value)}
				placeholder="Why it matters, tickets, buffers, or reminders"
				value={form.description}
			/>
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
			closeLabel="Close itinerary day form"
			errorMessage={errorMessage}
			isOpen={isOpen}
			isPending={isSaving}
			maxHeight={500}
			onOpenChange={onOpenChange}
			onSubmit={onSubmit}
			snapPoint="82%"
			submitLabel="Save day"
			subtitle="Update the day title, date, pace, and planning notes."
			title="Edit itinerary day"
		>
			<FormField
				label="Title"
				onChangeText={(value) => onUpdateForm("title", value)}
				placeholder="Day 1"
				value={form.title}
			/>
			<FormField
				label="Date"
				onChangeText={(value) => onUpdateForm("date", value)}
				placeholder="2026-07-10"
				value={form.date}
			/>
			<ChoiceChips
				formatLabel={formatChoiceLabel}
				label="Pace"
				onChange={(value) => onUpdateForm("pace", value)}
				options={itineraryPaceOptions}
				value={form.pace}
			/>
			<View style={{ flexDirection: "row", gap: spacing.md }}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<FormField
						label="Theme"
						onChangeText={(value) => onUpdateForm("theme", value)}
						placeholder="Arrival"
						value={form.theme}
					/>
				</View>
				<View style={{ flex: 1, minWidth: 0 }}>
					<FormField
						keyboardType="numeric"
						label="Cost"
						onChangeText={(value) => onUpdateForm("estimatedCost", value)}
						placeholder="0"
						value={form.estimatedCost}
					/>
				</View>
			</View>
			<FormTextArea
				label="Summary"
				onChangeText={(value) => onUpdateForm("summary", value)}
				placeholder="What should this day accomplish?"
				value={form.summary}
			/>
			<FormTextArea
				label="Weather note"
				onChangeText={(value) => onUpdateForm("weatherNote", value)}
				placeholder="Backup or weather-sensitive notes"
				value={form.weatherNote}
			/>
		</FormSheet>
	);
}

function ItineraryItemCard({
	bookingLabel,
	isLast,
	isPending,
	item,
	onDelete,
	onEdit,
	onOpenBooking,
	onOpenMaps,
	onToggleComplete,
	onToggleSkip,
}: {
	bookingLabel: string | null;
	isLast: boolean;
	isPending: boolean;
	item: Doc<"itineraryItems">;
	onDelete: () => void;
	onEdit: () => void;
	onOpenBooking: () => void;
	onOpenMaps: () => void;
	onToggleComplete: () => void;
	onToggleSkip: () => void;
}) {
	const { palette } = useUITheme();
	const isCompleted = item.status === "completed";
	const isSkipped = item.status === "skipped";
	const hasMapTarget = hasTripMapSearchTarget({
		address: item.address,
		latitude: item.latitude,
		locationName: item.locationName,
		longitude: item.longitude,
	});
	const hasNotes =
		Boolean(item.description) && item.description !== "Planned trip item.";
	const metadata = [
		formatChoiceLabel(item.category),
		item.estimatedCost > 0 ? formatCost(item.estimatedCost) : null,
		bookingLabel ? getCompactLabel(bookingLabel) : null,
	].filter(Boolean);

	return (
		<View
			style={{
				flexDirection: "row",
				gap: spacing.md,
				paddingBottom: isLast ? 0 : spacing.md,
			}}
		>
			<View style={{ alignItems: "flex-end", paddingTop: 2, width: 44 }}>
				<AppText bold={true} tone="accent" variant="footnote">
					{item.startTime}
				</AppText>
				<AppText tone="tertiary" variant="footnote">
					{item.endTime}
				</AppText>
			</View>
			<ItineraryTimelineNode
				category={item.category}
				isCompleted={isCompleted}
				isConnected={!isLast}
				isPending={isPending}
				isSkipped={isSkipped}
				onToggleComplete={onToggleComplete}
			/>
			<View
				style={{
					flex: 1,
					gap: 2,
					minWidth: 0,
					opacity: isSkipped ? 0.55 : 1,
					paddingTop: 2,
				}}
			>
				<AppText
					numberOfLines={2}
					style={
						isCompleted
							? {
									color: palette.inkTertiary,
									textDecorationLine: "line-through",
								}
							: undefined
					}
					variant="headline"
				>
					{item.title}
				</AppText>
				{item.locationName ? (
					<AppText numberOfLines={1} tone="secondary" variant="subhead">
						{item.locationName}
					</AppText>
				) : null}
				{metadata.length > 0 ? (
					<AppText numberOfLines={1} tone="tertiary" variant="footnote">
						{metadata.join(" · ")}
					</AppText>
				) : null}
				{hasNotes ? (
					<AppText tone="secondary" variant="footnote">
						{item.description}
					</AppText>
				) : null}
			</View>
			<ItineraryItemActionsMenu
				hasBooking={Boolean(item.bookingId)}
				hasMapTarget={hasMapTarget}
				isPending={isPending}
				isSkipped={isSkipped}
				onDelete={onDelete}
				onEdit={onEdit}
				onOpenBooking={onOpenBooking}
				onOpenMaps={onOpenMaps}
				onToggleSkip={onToggleSkip}
			/>
		</View>
	);
}

interface ItineraryDayPreview {
	dayDate: string;
	dayNumber: number;
	existingDay: Doc<"itineraryDays"> | undefined;
	label: string;
	stopCount: number;
}

function ItineraryDaySurface({
	calendarDay,
	onPress,
}: {
	calendarDay: ItineraryDayPreview;
	onPress: () => void;
}) {
	const { palette } = useUITheme();
	const day = calendarDay.existingDay;
	const stopLabel =
		calendarDay.stopCount === 1 ? "1 stop" : `${calendarDay.stopCount} stops`;

	return (
		<Card
			accessibilityLabel={`Open itinerary day ${calendarDay.dayNumber}`}
			onPress={onPress}
			padding="md"
		>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.md,
				}}
			>
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.fill,
						borderRadius: radius.pill,
						height: 48,
						justifyContent: "center",
						width: 48,
					}}
				>
					<AppText bold={true} tone="accent" variant="headline">
						{calendarDay.dayNumber}
					</AppText>
				</View>
				<View style={{ flex: 1, gap: 6, minWidth: 0 }}>
					<View style={{ gap: 2 }}>
						<AppText numberOfLines={1} variant="headline">
							{day?.title ?? `Day ${calendarDay.dayNumber}`}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="subhead">
							{calendarDay.label}
							{day?.theme ? ` · ${day.theme}` : ""}
						</AppText>
					</View>
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}
					>
						<MetaTag
							icon="location-outline"
							label={stopLabel}
							tone={calendarDay.stopCount > 0 ? "accent" : "neutral"}
						/>
						{day ? (
							<MetaTag
								icon="speedometer-outline"
								label={formatChoiceLabel(day.pace)}
								tone={day.pace === "packed" ? "warning" : "neutral"}
							/>
						) : (
							<MetaTag icon="add-circle-outline" label="Ready to add" />
						)}
					</View>
				</View>
				<Ionicons
					color={palette.inkTertiary}
					name="chevron-forward"
					size={18}
				/>
			</View>
		</Card>
	);
}

function EmptyPlannedDayContent({ onAddStop }: { onAddStop: () => void }) {
	return (
		<View
			style={{ alignItems: "center", gap: spacing.md, paddingVertical: 28 }}
		>
			<IconBadge icon="time-outline" size={44} />
			<View style={{ alignItems: "center", gap: 2 }}>
				<AppText bold={true} variant="headline">
					No stops yet
				</AppText>
				<AppText
					style={{ textAlign: "center" }}
					tone="secondary"
					variant="subhead"
				>
					Add the first stop when the timing is ready.
				</AppText>
			</View>
			<ActionPill
				icon="add-circle-outline"
				label="Add stop"
				onPress={onAddStop}
			/>
		</View>
	);
}

function UnplannedDayPlaceholder({
	isSavingDay,
	onAddStop,
}: {
	isSavingDay: boolean;
	onAddStop: () => void;
}) {
	return (
		<Card>
			<View
				style={{ alignItems: "center", gap: spacing.md, paddingVertical: 12 }}
			>
				<IconBadge icon="calendar-outline" size={48} />
				<View style={{ alignItems: "center", gap: 2 }}>
					<AppText variant="headline">Start this day</AppText>
					<AppText
						style={{ textAlign: "center" }}
						tone="secondary"
						variant="subhead"
					>
						Add the first stop to turn this date into an itinerary day.
					</AppText>
				</View>
				<PrimaryButton
					fullWidth={false}
					isPending={isSavingDay}
					label="Add itinerary"
					onPress={onAddStop}
				/>
			</View>
		</Card>
	);
}

function ItineraryPlannedDayContent({
	bookingLabelById,
	day,
	dayItems,
	onAddStop,
	onDeleteDay,
	onDeleteItem,
	onEditDay,
	onEditItem,
	onOpenBooking,
	onOpenMaps,
	onToggleComplete,
	onToggleSkip,
	pendingItemId,
}: {
	bookingLabelById: Map<string, string>;
	day: Doc<"itineraryDays">;
	dayItems: Doc<"itineraryItems">[];
	onAddStop: () => void;
	onDeleteDay: (dayId: Id<"itineraryDays">) => void;
	onDeleteItem: (itemId: Id<"itineraryItems">) => void;
	onEditDay: (day: Doc<"itineraryDays">) => void;
	onEditItem: (item: Doc<"itineraryItems">) => void;
	onOpenBooking: () => void;
	onOpenMaps: (item: Doc<"itineraryItems">) => void;
	onToggleComplete: (item: Doc<"itineraryItems">) => void;
	onToggleSkip: (item: Doc<"itineraryItems">) => void;
	pendingItemId: Id<"itineraryItems"> | null;
}) {
	const stopCount = dayItems.length;

	return (
		<View style={{ gap: spacing.lg }}>
			<View style={{ gap: spacing.md }}>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						gap: spacing.md,
					}}
				>
					<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
						<AppText accessibilityRole="header" variant="heading">
							{day.title || `Day ${day.dayNumber}`}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="subhead">
							{getDayTabLabel(day.date, day.dayNumber)}
							{day.theme ? ` · ${day.theme}` : ""}
						</AppText>
					</View>
					<Menu>
						<OverflowTrigger label="Day options" />
						<MenuPanel width={200}>
							<MenuAction
								icon="create-outline"
								label="Edit day"
								onPress={() => onEditDay(day)}
							/>
							<MenuDivider />
							<MenuAction
								danger={true}
								icon="trash-outline"
								label="Delete day"
								onPress={() => onDeleteDay(day._id)}
							/>
						</MenuPanel>
					</Menu>
					<GlassIconButton
						accessibilityLabel="Add itinerary stop"
						icon="add"
						onPress={onAddStop}
					/>
				</View>
				{day.summary && day.summary !== defaultItineraryDaySummary ? (
					<AppText tone="secondary" variant="subhead">
						{day.summary}
					</AppText>
				) : null}
				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}
				>
					<MetaTag
						icon="location-outline"
						label={stopCount === 1 ? "1 stop" : `${stopCount} stops`}
						tone={stopCount > 0 ? "accent" : "neutral"}
					/>
					<MetaTag
						icon="speedometer-outline"
						label={formatChoiceLabel(day.pace)}
						tone={day.pace === "packed" ? "warning" : "neutral"}
					/>
					{day.estimatedCost > 0 ? (
						<MetaTag
							icon="wallet-outline"
							label={formatCost(day.estimatedCost)}
						/>
					) : null}
					{day.weatherNote &&
					day.weatherNote !== defaultItineraryDayWeatherNote ? (
						<MetaTag
							icon="partly-sunny-outline"
							label={getCompactLabel(day.weatherNote)}
						/>
					) : null}
				</View>
			</View>

			<Card>
				{dayItems.length === 0 ? (
					<EmptyPlannedDayContent onAddStop={onAddStop} />
				) : (
					<View>
						{dayItems.map((item, index) => (
							<ItineraryItemCard
								bookingLabel={
									item.bookingId
										? (bookingLabelById.get(item.bookingId) ?? "Booking linked")
										: null
								}
								isLast={index === dayItems.length - 1}
								isPending={pendingItemId === item._id}
								item={item}
								key={item._id}
								onDelete={() => onDeleteItem(item._id)}
								onEdit={() => onEditItem(item)}
								onOpenBooking={onOpenBooking}
								onOpenMaps={() => onOpenMaps(item)}
								onToggleComplete={() => onToggleComplete(item)}
								onToggleSkip={() => onToggleSkip(item)}
							/>
						))}
					</View>
				)}
			</Card>
		</View>
	);
}

export function TripItineraryScreen() {
	const { palette } = useUITheme();
	const tripId = useTripIdParam();
	const router = useRouter();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
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
			<ModuleMissing
				description="Open a saved trip before viewing its itinerary."
				icon="calendar-outline"
			/>
		);
	}

	if (workspace === null) {
		return (
			<ModuleMissing
				description="This trip was deleted or is no longer available."
				icon="calendar-outline"
			/>
		);
	}

	if (workspace === undefined) {
		return <ModuleLoading title="Loading itinerary" />;
	}

	const { itineraryDays, itineraryItems, trip } = workspace;
	const tripDayCountFromDates =
		trip.startDate && trip.endDate
			? (getDateRangeDurationDays(trip.startDate, trip.endDate) ?? 1)
			: 1;
	const calendarDayCount = Math.max(1, tripDayCountFromDates);
	const itineraryItemsByDayId = new Map<
		Id<"itineraryDays">,
		Doc<"itineraryItems">[]
	>();
	const itineraryDayByNumber = new Map<number, Doc<"itineraryDays">>();
	const itineraryDayByDate = new Map<string, Doc<"itineraryDays">>();

	for (const day of itineraryDays) {
		itineraryDayByNumber.set(day.dayNumber, day);
		itineraryDayByDate.set(day.date, day);
		itineraryItemsByDayId.set(day._id, []);
	}

	for (const item of itineraryItems) {
		const dayItems = itineraryItemsByDayId.get(item.dayId);
		if (dayItems) {
			dayItems.push(item);
		}
	}

	const previewDays: ItineraryDayPreview[] = Array.from(
		{ length: calendarDayCount },
		(_, index) => {
			const dayNumber = index + 1;
			const dayDate = trip.startDate ? addDays(trip.startDate, index) : "";
			const existingDay =
				itineraryDayByNumber.get(dayNumber) ?? itineraryDayByDate.get(dayDate);
			const stopCount = existingDay
				? (itineraryItemsByDayId.get(existingDay._id)?.length ?? 0)
				: 0;

			return {
				dayDate,
				dayNumber,
				existingDay,
				label: dayDate
					? getDayTabLabel(dayDate, dayNumber)
					: `Day ${dayNumber}`,
				stopCount,
			};
		}
	);
	const plannedDayCount = previewDays.filter((day) => day.existingDay).length;
	const totalStopCount = itineraryItems.length;
	const effectiveTripDateRange =
		tripDateRange.start && tripDateRange.end
			? tripDateRange
			: {
					end: trip.endDate,
					start: trip.startDate,
				};
	const handleSaveTripDateRange = async () => {
		const startDate = effectiveTripDateRange.start.trim();
		const endDate = effectiveTripDateRange.end.trim();

		if (!(startDate && endDate)) {
			return;
		}

		if (startDate === trip.startDate && endDate === trip.endDate) {
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
				pace: trip.pace ?? "moderate",
				startDate,
				summary: trip.summary,
				title: trip.title,
				travelStyle: trip.travelStyle ?? "balanced",
				tripId,
			});
		} catch {
			setTripDateErrorMessage("Could not update trip dates.");
		} finally {
			setIsSavingTripDates(false);
		}
	};

	return (
		<TripModuleScreenFrame activeTab="itinerary" tripId={tripId}>
			<ModuleScroll>
				<InlineError message={tripDateErrorMessage} />
				<DateRangePickerField
					errorText={tripDateErrorMessage ?? undefined}
					formatDateRange={formatCompactTripDateRange}
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
					triggerClassName="h-14 w-full flex-row items-center gap-2 rounded-[16px] bg-surface px-4"
					triggerIconColor={palette.inkSecondary}
					triggerVariant="button"
					value={effectiveTripDateRange}
				/>

				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}
				>
					<MetaTag
						icon="calendar-outline"
						label={`${calendarDayCount} ${calendarDayCount === 1 ? "day" : "days"}`}
						tone="accent"
					/>
					<MetaTag
						icon="checkmark-circle-outline"
						label={`${plannedDayCount} planned`}
					/>
					<MetaTag
						icon="location-outline"
						label={`${totalStopCount} ${totalStopCount === 1 ? "stop" : "stops"}`}
					/>
				</View>

				<View style={{ gap: spacing.md }}>
					{previewDays.map((calendarDay, index) => (
						<Reveal index={index} key={calendarDay.dayNumber}>
							<ItineraryDaySurface
								calendarDay={calendarDay}
								onPress={() => {
									router.push(
										VIYA_ROUTES.tripItineraryDay(tripId, calendarDay.dayNumber)
									);
								}}
							/>
						</Reveal>
					))}
				</View>
			</ModuleScroll>
		</TripModuleScreenFrame>
	);
}

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
	const [editingDayId, setEditingDayId] = useState<Id<"itineraryDays"> | null>(
		null
	);
	const [editingItemId, setEditingItemId] =
		useState<Id<"itineraryItems"> | null>(null);
	const [selectedDayId, setSelectedDayId] =
		useState<Id<"itineraryDays"> | null>(null);
	const [selectedCalendarDayNumber, setSelectedCalendarDayNumber] = useState<
		number | null
	>(null);
	const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
	const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
	const [isSavingDay, setIsSavingDay] = useState(false);
	const [isSavingItem, setIsSavingItem] = useState(false);
	const [_pendingDayId, setPendingDayId] = useState<Id<"itineraryDays"> | null>(
		null
	);
	const [pendingItemId, setPendingItemId] =
		useState<Id<"itineraryItems"> | null>(null);
	const [dayErrorMessage, setDayErrorMessage] = useState<string | null>(null);
	const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
	const [itineraryErrorMessage, setItineraryErrorMessage] = useState<
		string | null
	>(null);
	const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);

	const updateItemForm = (key: keyof ItineraryItemForm, value: string) => {
		setItemErrorMessage(null);
		setItemForm((currentForm) => ({
			...currentForm,
			[key]: value,
		}));
	};
	const updateDayForm = (key: keyof ItineraryDayForm, value: string) => {
		setDayErrorMessage(null);
		setDayForm((currentForm) => ({
			...currentForm,
			[key]: value,
		}));
	};

	if (!tripId) {
		return (
			<ModuleMissing
				description="Open a saved trip before viewing its itinerary."
				icon="calendar-outline"
			/>
		);
	}

	if (workspace === null) {
		return (
			<ModuleMissing
				description="This trip was deleted or is no longer available."
				icon="calendar-outline"
			/>
		);
	}

	if (workspace === undefined) {
		return <ModuleLoading title="Loading itinerary" />;
	}

	const { bookings, itineraryDays, itineraryItems, trip } = workspace;
	const bookingLabelById = new Map<string, string>(
		bookings.map((booking) => [booking._id, getBookingLabel(booking)])
	);
	const itineraryItemsByDayId = (() => {
		const itemMap = new Map<Id<"itineraryDays">, Doc<"itineraryItems">[]>();

		for (const day of itineraryDays) {
			itemMap.set(day._id, []);
		}

		for (const item of itineraryItems) {
			const dayItems = itemMap.get(item.dayId);
			if (dayItems) {
				dayItems.push(item);
				continue;
			}

			itemMap.set(item.dayId, [item]);
		}

		return itemMap;
	})();
	const tripDayCountFromDates =
		trip.startDate && trip.endDate
			? (getDateRangeDurationDays(trip.startDate, trip.endDate) ?? 1)
			: 1;
	const calendarDayCount = Math.max(1, tripDayCountFromDates);
	const itineraryDayByNumber = new Map<number, Doc<"itineraryDays">>();
	const itineraryDayByDate = new Map<string, Doc<"itineraryDays">>();
	for (const day of itineraryDays) {
		itineraryDayByNumber.set(day.dayNumber, day);
		itineraryDayByDate.set(day.date, day);
	}
	const parsedRouteDayNumber = Number(dayNumberParam ?? "1");
	const routeDayNumber = Number.isFinite(parsedRouteDayNumber)
		? parsedRouteDayNumber
		: 1;
	const selectedDayById =
		itineraryDays.find((day) => day._id === selectedDayId) ?? null;
	const activeCalendarDayNumber =
		selectedCalendarDayNumber ?? selectedDayById?.dayNumber ?? routeDayNumber;
	const selectedDay = itineraryDayByNumber.get(activeCalendarDayNumber) ?? null;
	const editingDay =
		itineraryDays.find((day) => day._id === editingDayId) ?? null;
	const editingItem =
		itineraryItems.find((item) => item._id === editingItemId) ?? null;
	const selectedSheetDay = selectedDayById ?? selectedDay;
	const previewDayChips = Array.from(
		{ length: calendarDayCount },
		(_, index) => {
			const dayNumber = index + 1;
			const dayDate = trip.startDate ? addDays(trip.startDate, index) : "";
			const existingDay =
				itineraryDayByNumber.get(dayNumber) ?? itineraryDayByDate.get(dayDate);
			const itemCount = existingDay
				? (itineraryItemsByDayId.get(existingDay._id)?.length ?? 0)
				: 0;

			return {
				existingDay,
				dayNumber,
				dayDate,
				label: dayDate
					? getDayTabLabel(dayDate, dayNumber)
					: `Day ${dayNumber}`,
				stopCount: itemCount,
			};
		}
	);
	const handleAddDay = async (targetDayNumber = activeCalendarDayNumber) => {
		if (!tripId || isSavingDay) {
			return null;
		}

		setItineraryErrorMessage(null);
		const selectedMissingDay = previewDayChips.find(
			(chip) => chip.dayNumber === targetDayNumber && !chip.existingDay
		);
		const nextMissingDay =
			selectedMissingDay ?? previewDayChips.find((chip) => !chip.existingDay);
		const dayNumber = nextMissingDay?.dayNumber ?? itineraryDays.length + 1;
		const date =
			nextMissingDay?.dayDate ??
			(trip.startDate ? addDays(trip.startDate, itineraryDays.length) : "");
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
			if (createdDay) {
				setSelectedCalendarDayNumber(createdDay.dayNumber);
				setSelectedDayId(createdDay._id);
			}
			return createdDay ?? null;
		} catch {
			setItineraryErrorMessage("Could not add itinerary day.");
			return null;
		} finally {
			setIsSavingDay(false);
		}
	};
	const openItemSheet = (dayId: Id<"itineraryDays">) => {
		setItemErrorMessage(null);
		setItineraryErrorMessage(null);
		setSelectedDayId(dayId);
		const day = itineraryDays.find(
			(itineraryDay) => itineraryDay._id === dayId
		);
		if (day) {
			setSelectedCalendarDayNumber(day.dayNumber);
		}
		setEditingItemId(null);
		setItemForm(initialItemForm);
		setIsItemSheetOpen(true);
	};
	const openEditDaySheet = (day: Doc<"itineraryDays">) => {
		setDayErrorMessage(null);
		setItineraryErrorMessage(null);
		setEditingDayId(day._id);
		setDayForm({
			date: day.date,
			estimatedCost: day.estimatedCost.toString(),
			pace: day.pace,
			summary: day.summary,
			theme: day.theme,
			title: day.title,
			weatherNote: day.weatherNote,
		});
		setIsDaySheetOpen(true);
	};
	const openEditItemSheet = (item: Doc<"itineraryItems">) => {
		setItemErrorMessage(null);
		setItineraryErrorMessage(null);
		setSelectedDayId(item.dayId);
		const day = itineraryDays.find(
			(itineraryDay) => itineraryDay._id === item.dayId
		);
		if (day) {
			setSelectedCalendarDayNumber(day.dayNumber);
		}
		setEditingItemId(item._id);
		setItemForm({
			bookingId: item.bookingId ?? "",
			category: item.category,
			description: item.description,
			endTime: item.endTime,
			estimatedCost: item.estimatedCost.toString(),
			locationName: item.locationName,
			startTime: item.startTime,
			title: item.title,
		});
		setIsItemSheetOpen(true);
	};
	const handleSaveDay = async () => {
		if (!editingDay) {
			setDayErrorMessage("Choose a day to edit.");
			return;
		}

		const estimatedCost = Number(dayForm.estimatedCost.replaceAll(",", ""));
		setDayErrorMessage(null);
		setIsSavingDay(true);
		try {
			await updateItineraryDay({
				date: dayForm.date.trim(),
				dayId: editingDay._id,
				estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
				pace: getItineraryPace(dayForm.pace),
				summary: dayForm.summary.trim() || editingDay.summary,
				theme: dayForm.theme.trim() || editingDay.theme,
				title: dayForm.title.trim() || editingDay.title,
				weatherNote: dayForm.weatherNote.trim(),
			});
			setIsDaySheetOpen(false);
			setEditingDayId(null);
			setDayForm(initialDayForm);
		} catch {
			setDayErrorMessage("Could not save itinerary day.");
		} finally {
			setIsSavingDay(false);
		}
	};
	const handleSaveItem = async () => {
		if (!(tripId && selectedDay)) {
			setItemErrorMessage("Choose a day before adding an item.");
			return;
		}

		const title = itemForm.title.trim();
		const locationName = itemForm.locationName.trim();
		if (!(title && locationName)) {
			setItemErrorMessage("Add an item title and location.");
			return;
		}

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
				durationMinutes: getDurationMinutes(
					itemForm.startTime,
					itemForm.endTime
				),
				endTime: itemForm.endTime,
				estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : 0,
				locationName,
				priority: getItineraryItemPriority(editingItem?.priority),
				startTime: itemForm.startTime,
				status: getItineraryItemStatus(editingItem?.status),
				title,
			} as const;

			if (editingItemId) {
				await updateItineraryItem({
					...itemPatch,
					itemId: editingItemId,
				});
			} else {
				await createItineraryItem({
					...itemPatch,
					tripId,
				});
			}
			haptic("success");
			setIsItemSheetOpen(false);
			setEditingItemId(null);
			setItemForm(initialItemForm);
		} catch {
			haptic("error");
			setItemErrorMessage("Could not save itinerary item.");
		} finally {
			setIsSavingItem(false);
		}
	};
	const updateItemStatus = async (
		itemId: Id<"itineraryItems">,
		status: "planned" | "confirmed" | "skipped" | "completed"
	) => {
		setPendingItemId(itemId);
		try {
			await updateItineraryItem({ itemId, status });
			haptic(status === "completed" ? "success" : "selection");
		} catch {
			haptic("error");
			setItineraryErrorMessage("Could not update itinerary item.");
		} finally {
			setPendingItemId(null);
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
		setPendingDayId(dayId);
		try {
			await deleteItineraryDay({ dayId });
		} catch {
			setItineraryErrorMessage("Could not delete itinerary day.");
		} finally {
			setPendingDayId(null);
		}
	};
	const handleDeleteItem = async (itemId: Id<"itineraryItems">) => {
		const confirmed = await confirm({
			confirmLabel: "Delete stop",
			destructive: true,
			message: "This stop will be removed from the day.",
			title: "Delete this stop?",
		});
		if (!confirmed) {
			return;
		}
		setPendingItemId(itemId);
		try {
			await deleteItineraryItem({ itemId });
		} catch {
			setItineraryErrorMessage("Could not delete itinerary item.");
		} finally {
			setPendingItemId(null);
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
			setMapErrorMessage("Could not open Maps for this itinerary stop.");
		}
	};
	return (
		<TripModuleScreenFrame activeTab="itinerary" tripId={tripId}>
			<ModuleScroll>
				<InlineError message={itineraryErrorMessage} />
				<InlineError message={mapErrorMessage} />
				{selectedDay ? (
					<ItineraryPlannedDayContent
						bookingLabelById={bookingLabelById}
						day={selectedDay}
						dayItems={itineraryItemsByDayId.get(selectedDay._id) ?? []}
						onAddStop={() => openItemSheet(selectedDay._id)}
						onDeleteDay={(dayId) => {
							handleDeleteDay(dayId).catch(() => undefined);
						}}
						onDeleteItem={(itemId) => {
							handleDeleteItem(itemId).catch(() => undefined);
						}}
						onEditDay={openEditDaySheet}
						onEditItem={openEditItemSheet}
						onOpenBooking={() => {
							router.push(VIYA_ROUTES.tripBookings(tripId));
						}}
						onOpenMaps={(item) => {
							handleOpenMaps({
								address: item.address,
								latitude: item.latitude,
								locationName: item.locationName,
								longitude: item.longitude,
								title: item.title,
							}).catch(() => undefined);
						}}
						onToggleComplete={(item) => {
							updateItemStatus(
								item._id,
								item.status === "completed" ? "planned" : "completed"
							).catch(() => undefined);
						}}
						onToggleSkip={(item) => {
							updateItemStatus(
								item._id,
								item.status === "skipped" ? "planned" : "skipped"
							).catch(() => undefined);
						}}
						pendingItemId={pendingItemId}
					/>
				) : (
					<UnplannedDayPlaceholder
						isSavingDay={isSavingDay}
						onAddStop={() => {
							handleAddDay(activeCalendarDayNumber).catch(() => undefined);
						}}
					/>
				)}
			</ModuleScroll>
			<ItineraryItemSheet
				bookings={bookings}
				day={selectedSheetDay}
				errorMessage={itemErrorMessage}
				form={itemForm}
				isOpen={isItemSheetOpen}
				isSaving={isSavingItem}
				mode={editingItemId ? "edit" : "create"}
				onOpenChange={(isOpen) => {
					setIsItemSheetOpen(isOpen);
					if (!isOpen) {
						setEditingItemId(null);
						setItemErrorMessage(null);
						setItemForm(initialItemForm);
					}
				}}
				onSubmit={handleSaveItem}
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
						setEditingDayId(null);
						setDayErrorMessage(null);
						setDayForm(initialDayForm);
					}
				}}
				onSubmit={handleSaveDay}
				onUpdateForm={updateDayForm}
			/>
		</TripModuleScreenFrame>
	);
}
