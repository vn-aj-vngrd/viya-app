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
import { Link } from "expo-router";
import {
	Accordion,
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
import { type ComponentProps, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import { getDateRangeDurationDays } from "@/src/components/date/date-format-utils";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
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

const initialDayForm: ItineraryDayForm = {
	date: "",
	estimatedCost: "0",
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

const itineraryPaceOptions = ["light", "balanced", "packed"] as const;
const itineraryItemCategories = new Set<string>(itineraryItemCategoryOptions);
const itineraryPaces = new Set<string>(itineraryPaceOptions);
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
const itineraryItemPriorities = new Set<string>(itineraryItemPriorityOptions);
const itineraryItemStatuses = new Set<string>(itineraryItemStatusOptions);

const getItineraryItemCategory = (value: string): ItineraryItemCategory => {
	const category = value.trim();

	return itineraryItemCategories.has(category)
		? (category as ItineraryItemCategory)
		: "activity";
};

const getItineraryPace = (value: string): ItineraryPace => {
	const pace = value.trim();

	return itineraryPaces.has(pace) ? (pace as ItineraryPace) : "balanced";
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

const formatChoiceLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

function SheetChoiceGroup({
	label,
	onChange,
	options,
	value,
}: {
	label: string;
	onChange: (value: string) => void;
	options: readonly string[];
	value: string;
}) {
	return (
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				{label.toUpperCase()}
			</Text>
			<View className="flex-row flex-wrap gap-2">
				{options.map((option) => (
					<Button
						key={option}
						onPress={() => onChange(option)}
						size="sm"
						variant={value === option ? "primary" : "secondary"}
					>
						<Button.Label>{formatChoiceLabel(option)}</Button.Label>
					</Button>
				))}
			</View>
		</View>
	);
}

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
		<View className="gap-2">
			<Text color="muted" type="body-xs" weight="semibold">
				LINKED BOOKING
			</Text>
			<View className="flex-row flex-wrap gap-2">
				<Button
					onPress={() => onChange("")}
					size="sm"
					variant={value ? "secondary" : "primary"}
				>
					<Button.Label>None</Button.Label>
				</Button>
				{visibleBookings.map((booking) => (
					<Button
						key={booking._id}
						onPress={() => onChange(booking._id)}
						size="sm"
						variant={value === booking._id ? "primary" : "secondary"}
					>
						<Button.Label>
							{getCompactLabel(getBookingLabel(booking))}
						</Button.Label>
					</Button>
				))}
			</View>
			{bookings.length > visibleBookings.length ? (
				<Text color="muted" type="body-xs">
					Showing the most relevant {visibleBookings.length} booking targets.
				</Text>
			) : null}
		</View>
	);
}

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const ITINERARY_CATEGORY_ICON: Record<string, IoniconName> = {
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

const getCategoryIcon = (category: string): IoniconName =>
	ITINERARY_CATEGORY_ICON[category] ?? "ellipse-outline";

const ITINERARY_STATUS_META: Record<string, { color: string; label: string }> =
	{
		completed: { color: "#34C759", label: "Completed" },
		confirmed: { color: "#0A84FF", label: "Confirmed" },
		planned: { color: "#8E8E93", label: "Planned" },
		skipped: { color: "#FF9F0A", label: "Skipped" },
	};

function ItineraryStatusChip({ status }: { status: string }) {
	const meta = ITINERARY_STATUS_META[status] ?? ITINERARY_STATUS_META.planned;

	return (
		<View className="flex-row items-center gap-1.5 self-start rounded-full border border-border/50 bg-background px-2.5 py-1">
			<View
				className="h-2 w-2 rounded-full"
				style={{ backgroundColor: meta.color }}
			/>
			<Text type="body-xs" weight="semibold">
				{meta.label}
			</Text>
		</View>
	);
}

function ItineraryIconButton({
	color = "#0A84FF",
	icon,
	isDisabled,
	label,
	onPress,
	variant = "secondary",
}: {
	color?: string;
	icon: IoniconName;
	isDisabled?: boolean;
	label: string;
	onPress: () => void;
	variant?: "secondary" | "tertiary";
}) {
	return (
		<Button
			accessibilityLabel={label}
			isDisabled={isDisabled}
			onPress={onPress}
			size="sm"
			variant={variant}
		>
			<Ionicons color={color} name={icon} size={17} />
		</Button>
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
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["86%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>
									{mode === "edit"
										? "Edit itinerary item"
										: "Add itinerary item"}
								</BottomSheet.Title>
								<BottomSheet.Description>
									{day ? `Day ${day.dayNumber} · ${day.date}` : "Select a day"}
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close itinerary item form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 520 }}
						>
							<SheetField
								label="Title"
								onChangeText={(value) => onUpdateForm("title", value)}
								placeholder="Museum visit"
								value={form.title}
							/>
							<SheetField
								label="Location"
								onChangeText={(value) => onUpdateForm("locationName", value)}
								placeholder="Place or neighborhood"
								value={form.locationName}
							/>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Start"
										onChangeText={(value) => onUpdateForm("startTime", value)}
										placeholder="09:00"
										value={form.startTime}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="End"
										onChangeText={(value) => onUpdateForm("endTime", value)}
										placeholder="10:00"
										value={form.endTime}
									/>
								</View>
							</View>
							<SheetChoiceGroup
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
							<SheetField
								label="Cost"
								onChangeText={(value) => onUpdateForm("estimatedCost", value)}
								placeholder="0"
								value={form.estimatedCost}
							/>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("description", value)}
								placeholder="Why it matters, tickets, buffers, or reminders"
								value={form.description}
							/>
						</ScrollView>

						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving || !day} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>
								{mode === "edit" ? "Save item" : "Add item"}
							</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
								<BottomSheet.Title>Edit itinerary day</BottomSheet.Title>
								<BottomSheet.Description>
									Update the day title, date, pace, and planning notes.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close itinerary day form"
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
								placeholder="Day 1"
								value={form.title}
							/>
							<SheetField
								label="Date"
								onChangeText={(value) => onUpdateForm("date", value)}
								placeholder="2026-07-10"
								value={form.date}
							/>
							<SheetChoiceGroup
								label="Pace"
								onChange={(value) => onUpdateForm("pace", value)}
								options={itineraryPaceOptions}
								value={form.pace}
							/>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Theme"
										onChangeText={(value) => onUpdateForm("theme", value)}
										placeholder="Arrival"
										value={form.theme}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Cost"
										onChangeText={(value) =>
											onUpdateForm("estimatedCost", value)
										}
										placeholder="0"
										value={form.estimatedCost}
									/>
								</View>
							</View>
							<SheetTextArea
								label="Summary"
								onChangeText={(value) => onUpdateForm("summary", value)}
								placeholder="What should this day accomplish?"
								value={form.summary}
							/>
							<SheetTextArea
								label="Weather note"
								onChangeText={(value) => onUpdateForm("weatherNote", value)}
								placeholder="Backup or weather-sensitive notes"
								value={form.weatherNote}
							/>
						</ScrollView>

						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Save day</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function ItineraryErrorNotice({ message }: { message: string | null }) {
	if (!message) {
		return null;
	}

	return (
		<Text className="text-danger" type="body-sm">
			{message}
		</Text>
	);
}

function LinkedBookingAction({
	bookingId,
	isDisabled,
	label = "Open booking",
	tripId,
}: {
	bookingId?: string;
	isDisabled: boolean;
	label?: string;
	tripId: Id<"trips">;
}) {
	if (!bookingId) {
		return null;
	}

	return (
		<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
			<Button isDisabled={isDisabled} size="sm" variant="secondary">
				<Ionicons color="#0A84FF" name="ticket-outline" size={16} />
				<Button.Label>{label}</Button.Label>
			</Button>
		</Link>
	);
}

function ItineraryItemCard({
	bookingLabel,
	isPending,
	item,
	onDelete,
	onEdit,
	onOpenMaps,
	onSkip,
	onToggleComplete,
	tripId,
}: {
	bookingLabel: string | null;
	isPending: boolean;
	item: Doc<"itineraryItems">;
	onDelete: () => void;
	onEdit: () => void;
	onOpenMaps: () => void;
	onSkip: () => void;
	onToggleComplete: () => void;
	tripId: Id<"trips">;
}) {
	const isCompleted = item.status === "completed";
	const hasMapTarget = hasTripMapSearchTarget({
		address: item.address,
		latitude: item.latitude,
		locationName: item.locationName,
		longitude: item.longitude,
	});
	const hasNotes =
		Boolean(item.description) && item.description !== "Planned trip item.";

	return (
		<Surface className="gap-3 rounded-[24px] border border-border/70 bg-background p-4">
			<View className="flex-row items-start gap-3">
				<View className="items-center gap-1">
					<View className="items-center rounded-2xl bg-primary/10 px-2.5 py-1.5">
						<Text style={{ color: "#0A84FF" }} type="body-xs" weight="bold">
							{item.startTime}
						</Text>
					</View>
					<Text color="muted" type="body-xs">
						{item.endTime}
					</Text>
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<View className="flex-row items-center gap-2">
						<Ionicons
							color="#0A84FF"
							name={getCategoryIcon(item.category)}
							size={16}
						/>
						<Text
							className="flex-1"
							numberOfLines={2}
							type="body-sm"
							weight="bold"
						>
							{item.title}
						</Text>
					</View>
					{item.locationName ? (
						<Text color="muted" numberOfLines={1} type="body-xs">
							{item.locationName}
						</Text>
					) : null}
				</View>
				<ItineraryStatusChip status={item.status} />
			</View>
			{hasNotes ? (
				<Text.Paragraph color="muted" type="body-sm">
					{item.description}
				</Text.Paragraph>
			) : null}
			<View className="flex-row flex-wrap gap-2">
				<Chip size="sm" variant="secondary">
					<Chip.Label>{formatChoiceLabel(item.category)}</Chip.Label>
				</Chip>
				{item.estimatedCost > 0 ? (
					<Chip size="sm" variant="secondary">
						<Chip.Label>{formatCost(item.estimatedCost)}</Chip.Label>
					</Chip>
				) : null}
				{bookingLabel ? (
					<Chip size="sm" variant="secondary">
						<Chip.Label>{getCompactLabel(bookingLabel)}</Chip.Label>
					</Chip>
				) : null}
			</View>
			<View className="flex-row flex-wrap items-center gap-2 border-border border-t pt-3">
				<Button
					className="flex-1"
					isDisabled={isPending}
					onPress={onToggleComplete}
					size="sm"
					variant={isCompleted ? "secondary" : "primary"}
				>
					<Ionicons
						color={isCompleted ? "#0A84FF" : "#FFFFFF"}
						name={isCompleted ? "refresh-outline" : "checkmark-outline"}
						size={16}
					/>
					<Button.Label>
						{isCompleted ? "Mark planned" : "Complete"}
					</Button.Label>
				</Button>
				{hasMapTarget ? (
					<ItineraryIconButton
						icon="map-outline"
						isDisabled={isPending}
						label="Open in Maps"
						onPress={onOpenMaps}
					/>
				) : null}
				{item.bookingId ? (
					<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
						<Button
							accessibilityLabel="Open booking"
							isDisabled={isPending}
							size="sm"
							variant="secondary"
						>
							<Ionicons color="#0A84FF" name="ticket-outline" size={17} />
						</Button>
					</Link>
				) : null}
				<ItineraryIconButton
					icon="create-outline"
					isDisabled={isPending}
					label="Edit item"
					onPress={onEdit}
				/>
				<ItineraryIconButton
					icon="remove-circle-outline"
					isDisabled={isPending}
					label="Skip item"
					onPress={onSkip}
				/>
				<ItineraryIconButton
					color="#FF3B30"
					icon="trash-outline"
					isDisabled={isPending}
					label="Delete item"
					onPress={onDelete}
					variant="tertiary"
				/>
			</View>
		</Surface>
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This screen coordinates mutations, sheets, and timeline rendering in one module.
export function TripItineraryScreen() {
	const tripId = useTripIdParam();
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
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
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
	const [expandedCalendarDayNumber, setExpandedCalendarDayNumber] = useState<
		number | null
	>(null);
	const [isDayMenuOpen, setIsDayMenuOpen] = useState(false);
	const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);
	const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
	const [isSavingDay, setIsSavingDay] = useState(false);
	const [isSavingItem, setIsSavingItem] = useState(false);
	const [pendingDayId, setPendingDayId] = useState<Id<"itineraryDays"> | null>(
		null
	);
	const [pendingItemId, setPendingItemId] =
		useState<Id<"itineraryItems"> | null>(null);
	const [dayErrorMessage, setDayErrorMessage] = useState<string | null>(null);
	const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
	const [tripDateErrorMessage, setTripDateErrorMessage] = useState<
		string | null
	>(null);
	const [tripDateRange, setTripDateRange] = useState<DateRangeValue>({
		end: "",
		start: "",
	});
	const [isSavingTripDates, setIsSavingTripDates] = useState(false);
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
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before viewing its itinerary."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined) {
		return <ScreenLoadingState />;
	}

	const { bookings, itineraryDays, itineraryItems, savedPlaces, trip } =
		workspace;
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
	const assignedSavedPlacesByDayId = (() => {
		const placeMap = new Map<Id<"itineraryDays">, Doc<"savedPlaces">[]>();

		for (const place of savedPlaces) {
			if (!place.assignedDayId) {
				continue;
			}

			const dayPlaces = placeMap.get(place.assignedDayId);
			if (dayPlaces) {
				dayPlaces.push(place);
				continue;
			}

			placeMap.set(place.assignedDayId, [place]);
		}

		return placeMap;
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
	const fallbackDay = itineraryDays[0] ?? null;
	const selectedDayById =
		itineraryDays.find((day) => day._id === selectedDayId) ?? null;
	const activeCalendarDayNumber =
		selectedCalendarDayNumber ??
		selectedDayById?.dayNumber ??
		fallbackDay?.dayNumber ??
		1;
	const selectedDay =
		selectedCalendarDayNumber === null
			? (selectedDayById ?? fallbackDay)
			: (itineraryDayByNumber.get(activeCalendarDayNumber) ?? null);
	const editingDay =
		itineraryDays.find((day) => day._id === editingDayId) ?? null;
	const editingItem =
		itineraryItems.find((item) => item._id === editingItemId) ?? null;
	const selectedSheetDay = selectedDayById ?? selectedDay ?? fallbackDay;
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
			const placeCount = existingDay
				? (assignedSavedPlacesByDayId.get(existingDay._id)?.length ?? 0)
				: 0;

			return {
				existingDay,
				dayNumber,
				dayDate,
				label: dayDate
					? getDayTabLabel(dayDate, dayNumber)
					: `Day ${dayNumber}`,
				stopCount: itemCount + placeCount,
			};
		}
	);
	const activeDayChip =
		previewDayChips.find(
			(chip) => chip.dayNumber === activeCalendarDayNumber
		) ?? previewDayChips[0];
	const effectiveTripDateRange =
		tripDateRange.start && tripDateRange.end
			? tripDateRange
			: {
					end: trip.endDate,
					start: trip.startDate,
				};
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
				summary: "Add places, meals, transfers, and buffers for this day.",
				theme: "Open planning",
				title: `Day ${dayNumber}`,
				tripId,
				weatherNote: "Check forecast closer to travel.",
			});
			if (createdDay) {
				setSelectedCalendarDayNumber(createdDay.dayNumber);
				setExpandedCalendarDayNumber(createdDay.dayNumber);
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
	const selectCalendarDay = (dayNumber: number) => {
		const chip = previewDayChips.find((day) => day.dayNumber === dayNumber);

		setSelectedCalendarDayNumber(dayNumber);
		setExpandedCalendarDayNumber(dayNumber);
		if (chip?.existingDay) {
			setSelectedDayId(chip.existingDay._id);
		}
	};
	const openItemSheetForCalendarDay = async (dayNumber: number) => {
		const chip = previewDayChips.find((day) => day.dayNumber === dayNumber);
		selectCalendarDay(dayNumber);

		if (chip?.existingDay) {
			openItemSheet(chip.existingDay._id);
			return;
		}

		const createdDay = await handleAddDay(dayNumber);
		if (createdDay) {
			openItemSheet(createdDay._id);
		}
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
			setIsItemSheetOpen(false);
			setEditingItemId(null);
			setItemForm(initialItemForm);
		} catch {
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
		} catch {
			setItineraryErrorMessage("Could not update itinerary item.");
		} finally {
			setPendingItemId(null);
		}
	};
	const handleDeleteDay = async (dayId: Id<"itineraryDays">) => {
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
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<ItineraryErrorNotice message={itineraryErrorMessage} />
					<ItineraryErrorNotice message={mapErrorMessage} />
					<View className="flex-row items-center gap-2">
						<DateRangePickerField
							className="min-w-0 flex-1"
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
							triggerClassName="h-11 min-w-0 flex-1 flex-row items-center gap-2 rounded-full border border-border/70 bg-white px-3"
							triggerIconColor="#71717A"
							triggerVariant="button"
							value={effectiveTripDateRange}
						/>
						<Pressable
							accessibilityLabel="Choose itinerary day"
							accessibilityRole="button"
							className="h-11 min-w-[132px] flex-[0.9] flex-row items-center gap-2 rounded-full border border-border/70 bg-white px-3"
							onPress={() => {
								setIsDayMenuOpen(true);
							}}
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.98 : 1 }],
							})}
						>
							<Ionicons color="#71717A" name="list-outline" size={16} />
							<Text
								className="min-w-0 flex-1"
								numberOfLines={1}
								type="body-sm"
								weight="semibold"
							>
								{activeDayChip ? activeDayChip.label : "Choose day"}
							</Text>
							<Ionicons color="#71717A" name="chevron-down" size={14} />
						</Pressable>
					</View>

					<View className="gap-3">
						<Text color="muted" type="body-xs" weight="semibold">
							DAYS ITINERARY
						</Text>
						<Accordion
							className="gap-3"
							hideSeparator={true}
							onValueChange={(value) => {
								if (typeof value === "string") {
									selectCalendarDay(Number(value));
									return;
								}

								setExpandedCalendarDayNumber(null);
							}}
							selectionMode="single"
							value={expandedCalendarDayNumber?.toString()}
						>
							{/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Each accordion branch preserves existing day/item/place actions inline. */}
							{previewDayChips.map((calendarDay) => {
								const day = calendarDay.existingDay;
								const dayItems = day
									? (itineraryItemsByDayId.get(day._id) ?? [])
									: [];
								const daySavedPlaces = day
									? (assignedSavedPlacesByDayId.get(day._id) ?? [])
									: [];
								const linkedBookingId =
									dayItems.find((item) => item.bookingId)?.bookingId ?? "";

								return (
									<Accordion.Item
										className="overflow-hidden rounded-[18px] border border-border/70 bg-white"
										key={calendarDay.dayNumber}
										value={calendarDay.dayNumber.toString()}
									>
										<Accordion.Trigger
											accessibilityLabel={`Open ${calendarDay.label}`}
											className="flex-row items-center gap-3 px-4 py-4"
										>
											<View className="min-w-0 flex-1 gap-1">
												<Text type="body" weight="bold">
													{calendarDay.label}
												</Text>
												<Text color="muted" numberOfLines={1} type="body-sm">
													{day?.title ?? `Day ${calendarDay.dayNumber}`}
												</Text>
											</View>
											<Accordion.Indicator
												iconProps={{ color: "#71717A", size: 18 }}
											/>
										</Accordion.Trigger>

										<Accordion.Content className="gap-3 border-border/70 border-t px-4 py-4">
											{day ? (
												<>
													<View className="flex-row flex-wrap gap-2">
														<Chip
															className="border border-border/70 bg-white"
															size="sm"
															variant="secondary"
														>
															<Chip.Label>{day.theme}</Chip.Label>
														</Chip>
														<Chip
															className="border border-border/70 bg-white"
															size="sm"
															variant="secondary"
														>
															<Chip.Label>
																{formatChoiceLabel(day.pace)}
															</Chip.Label>
														</Chip>
														{day.estimatedCost > 0 ? (
															<Chip
																className="border border-border/70 bg-white"
																size="sm"
																variant="secondary"
															>
																<Chip.Label>
																	{formatCost(day.estimatedCost)}
																</Chip.Label>
															</Chip>
														) : null}
													</View>
													{day.summary ? (
														<Text.Paragraph color="muted" type="body-sm">
															{day.summary}
														</Text.Paragraph>
													) : null}
													<View className="flex-row flex-wrap items-center gap-2">
														<Button
															className="min-w-[132px] flex-1"
															onPress={() => openItemSheet(day._id)}
															size="sm"
															variant="secondary"
														>
															<Ionicons
																color="#0A84FF"
																name="location-outline"
																size={16}
															/>
															<Button.Label>Add stop</Button.Label>
														</Button>
														<ItineraryIconButton
															icon="create-outline"
															label="Edit day"
															onPress={() => openEditDaySheet(day)}
														/>
														<ItineraryIconButton
															color="#FF3B30"
															icon="trash-outline"
															isDisabled={pendingDayId === day._id}
															label="Delete day"
															onPress={() => {
																handleDeleteDay(day._id).catch(() => undefined);
															}}
															variant="tertiary"
														/>
														<LinkedBookingAction
															bookingId={linkedBookingId}
															isDisabled={false}
															label="Open booking"
															tripId={tripId}
														/>
													</View>

													{dayItems.length === 0 &&
													daySavedPlaces.length === 0 ? (
														<View className="items-center gap-2 rounded-[16px] border border-border/70 border-dashed bg-background px-4 py-6">
															<Ionicons
																color="#8E8E93"
																name="time-outline"
																size={22}
															/>
															<Text
																color="muted"
																type="body-sm"
																weight="semibold"
															>
																No scheduled items yet
															</Text>
															<Button
																onPress={() => openItemSheet(day._id)}
																size="sm"
																variant="secondary"
															>
																<Ionicons
																	color="#0A84FF"
																	name="add-circle-outline"
																	size={16}
																/>
																<Button.Label>Add timed stop</Button.Label>
															</Button>
														</View>
													) : (
														<View className="gap-3">
															{dayItems.map((item) => (
																<ItineraryItemCard
																	bookingLabel={
																		item.bookingId
																			? (bookingLabelById.get(item.bookingId) ??
																				"Booking linked")
																			: null
																	}
																	isPending={pendingItemId === item._id}
																	item={item}
																	key={item._id}
																	onDelete={() => {
																		handleDeleteItem(item._id).catch(
																			() => undefined
																		);
																	}}
																	onEdit={() => openEditItemSheet(item)}
																	onOpenMaps={() => {
																		handleOpenMaps({
																			address: item.address,
																			latitude: item.latitude,
																			locationName: item.locationName,
																			longitude: item.longitude,
																			title: item.title,
																		}).catch(() => undefined);
																	}}
																	onSkip={() => {
																		updateItemStatus(item._id, "skipped").catch(
																			() => undefined
																		);
																	}}
																	onToggleComplete={() => {
																		updateItemStatus(
																			item._id,
																			item.status === "completed"
																				? "planned"
																				: "completed"
																		).catch(() => undefined);
																	}}
																	tripId={tripId}
																/>
															))}
														</View>
													)}

													{daySavedPlaces.length > 0 ? (
														<View className="gap-3">
															<View className="flex-row items-center justify-between gap-3">
																<Text
																	color="muted"
																	type="body-xs"
																	weight="semibold"
																>
																	SAVED PLACES
																</Text>
																<Chip
																	className="border border-border/70 bg-white"
																	size="sm"
																	variant="secondary"
																>
																	<Chip.Label>
																		{daySavedPlaces.length} route stops
																	</Chip.Label>
																</Chip>
															</View>
															{daySavedPlaces.map((place) => (
																<View
																	className="gap-2 rounded-[16px] border border-border/70 bg-background p-4"
																	key={place._id}
																>
																	<View className="flex-row items-start gap-3">
																		<View
																			className="h-9 w-9 items-center justify-center rounded-full"
																			style={{
																				backgroundColor:
																					"rgba(52, 199, 89, 0.14)",
																			}}
																		>
																			<Ionicons
																				color="#34C759"
																				name="location-outline"
																				size={17}
																			/>
																		</View>
																		<View className="min-w-0 flex-1 gap-1">
																			<View className="flex-row flex-wrap gap-2">
																				<Chip
																					className="border border-border/70 bg-white"
																					size="sm"
																					variant="secondary"
																				>
																					<Chip.Label>
																						{formatChoiceLabel(place.category)}
																					</Chip.Label>
																				</Chip>
																				<Chip
																					className="border border-border/70 bg-white"
																					size="sm"
																					variant="secondary"
																				>
																					<Chip.Label>Saved place</Chip.Label>
																				</Chip>
																			</View>
																			<Text type="body-sm" weight="bold">
																				{place.title}
																			</Text>
																			<Text
																				color="muted"
																				numberOfLines={2}
																				type="body-xs"
																			>
																				{place.locationName}
																			</Text>
																		</View>
																	</View>
																	{place.description ? (
																		<Text.Paragraph
																			color="muted"
																			type="body-sm"
																		>
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
																</View>
															))}
														</View>
													) : null}
												</>
											) : (
												<View className="items-center gap-2 rounded-[16px] border border-border/70 border-dashed bg-background px-4 py-6">
													<Ionicons
														color="#8E8E93"
														name="calendar-outline"
														size={22}
													/>
													<Text color="muted" type="body-sm" weight="semibold">
														No stops planned for this day
													</Text>
													<Button
														isDisabled={isSavingDay}
														onPress={() => {
															openItemSheetForCalendarDay(
																calendarDay.dayNumber
															).catch(() => undefined);
														}}
														size="sm"
														variant="secondary"
													>
														<Ionicons
															color="#0A84FF"
															name="add-circle-outline"
															size={16}
														/>
														<Button.Label>Add stop</Button.Label>
													</Button>
												</View>
											)}
										</Accordion.Content>
									</Accordion.Item>
								);
							})}
						</Accordion>
					</View>
				</View>
				<BottomSheet isOpen={isDayMenuOpen} onOpenChange={setIsDayMenuOpen}>
					<BottomSheet.Portal>
						<BottomSheet.Overlay />
						<BottomSheet.Content
							backgroundClassName="rounded-t-[36px] bg-background"
							enablePanDownToClose={true}
							snapPoints={["56%"]}
						>
							<View className="gap-3 px-5 pt-2 pb-6">
								<BottomSheet.Title>Jump to day</BottomSheet.Title>
								<ScrollView
									contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
									showsVerticalScrollIndicator={false}
									style={{ maxHeight: 360 }}
								>
									{previewDayChips.map((day) => (
										<Button
											key={day.dayNumber}
											onPress={() => {
												selectCalendarDay(day.dayNumber);
												setIsDayMenuOpen(false);
											}}
											size="sm"
											variant={
												activeCalendarDayNumber === day.dayNumber
													? "primary"
													: "secondary"
											}
										>
											<Button.Label>
												{`${day.label} · ${day.stopCount} stops`}
											</Button.Label>
										</Button>
									))}
								</ScrollView>
							</View>
						</BottomSheet.Content>
					</BottomSheet.Portal>
				</BottomSheet>
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
			</Container>
		</TripModuleScreenFrame>
	);
}
