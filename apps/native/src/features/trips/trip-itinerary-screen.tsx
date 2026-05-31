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
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Menu,
	Spinner,
	Text,
	TextArea,
	TextField,
	useToast,
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

const ITINERARY_ACCENT_COLOR = "#0A84FF";
const ITINERARY_DANGER_COLOR = "#FF3B30";
const ITINERARY_MUTED_COLOR = "#71717A";
const ITINERARY_SUBTLE_COLOR = "#8E8E93";
const ITINERARY_WARNING_COLOR = "#FF9F0A";

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

function ItineraryQuietActionButton({
	icon,
	isDisabled,
	label,
	onPress,
}: {
	icon: IoniconName;
	isDisabled?: boolean;
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ disabled: Boolean(isDisabled) }}
			className="min-h-10 min-w-[132px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-surface-secondary px-4 py-2.5"
			disabled={isDisabled}
			onPress={onPress}
			style={({ pressed }) => ({
				opacity: isDisabled ? 0.5 : 1,
				transform: [{ scale: pressed ? 0.98 : 1 }],
			})}
		>
			<View
				className="h-6 w-6 items-center justify-center rounded-full"
				style={{ backgroundColor: "rgba(10, 132, 255, 0.1)" }}
			>
				<Ionicons color={ITINERARY_ACCENT_COLOR} name={icon} size={14} />
			</View>
			<Text type="body-sm" weight="semibold">
				{label}
			</Text>
		</Pressable>
	);
}

function ItineraryMetaPill({
	icon,
	label,
	tone = "neutral",
}: {
	icon: IoniconName;
	label: string;
	tone?: "accent" | "neutral" | "warning";
}) {
	const toneColors = {
		accent: ITINERARY_ACCENT_COLOR,
		neutral: ITINERARY_MUTED_COLOR,
		warning: ITINERARY_WARNING_COLOR,
	} as const;
	const color = toneColors[tone];

	return (
		<View className="flex-row items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1.5">
			<Ionicons color={color} name={icon} size={13} />
			<Text
				numberOfLines={1}
				style={{ color }}
				type="body-xs"
				weight="semibold"
			>
				{label}
			</Text>
		</View>
	);
}

function ItineraryMenuItem({
	icon,
	label,
	onPress,
	tone = "default",
}: {
	icon: IoniconName;
	label: string;
	onPress: () => void;
	tone?: "default" | "danger";
}) {
	const isDanger = tone === "danger";

	return (
		<Menu.Item
			accessibilityLabel={label}
			className="flex-row items-center gap-3 rounded-[18px] p-2.5"
			isAnimatedStyleActive={false}
			onPress={onPress}
		>
			<View
				className="h-8 w-8 items-center justify-center rounded-full"
				style={{
					backgroundColor: isDanger
						? "rgba(255, 59, 48, 0.1)"
						: "rgba(10, 132, 255, 0.1)",
				}}
			>
				<Ionicons
					color={isDanger ? ITINERARY_DANGER_COLOR : ITINERARY_ACCENT_COLOR}
					name={icon}
					size={16}
				/>
			</View>
			<Menu.ItemTitle
				className={
					isDanger
						? "font-semibold text-danger text-sm"
						: "font-semibold text-sm"
				}
			>
				{label}
			</Menu.ItemTitle>
		</Menu.Item>
	);
}

function ItineraryOverflowTrigger({
	isDisabled,
	label,
}: {
	isDisabled?: boolean;
	label: string;
}) {
	return (
		<Menu.Trigger asChild={true}>
			<Pressable
				accessibilityLabel={label}
				accessibilityRole="button"
				accessibilityState={{ disabled: Boolean(isDisabled) }}
				className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
				disabled={isDisabled}
				style={({ pressed }) => ({
					opacity: isDisabled ? 0.5 : 1,
					transform: [{ scale: pressed ? 0.94 : 1 }],
				})}
			>
				<Ionicons
					color={ITINERARY_MUTED_COLOR}
					name="ellipsis-horizontal"
					size={18}
				/>
			</Pressable>
		</Menu.Trigger>
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
			<ItineraryOverflowTrigger isDisabled={isPending} label="Stop options" />
			<Menu.Portal>
				<Menu.Overlay />
				<Menu.Content
					align="end"
					className="rounded-[24px] border border-border bg-surface p-2"
					offset={8}
					placement="bottom"
					presentation="popover"
					width={236}
				>
					<ItineraryMenuItem
						icon="create-outline"
						label="Edit stop"
						onPress={onEdit}
					/>
					{hasMapTarget ? (
						<ItineraryMenuItem
							icon="map-outline"
							label="Open in Maps"
							onPress={onOpenMaps}
						/>
					) : null}
					{hasBooking ? (
						<ItineraryMenuItem
							icon="ticket-outline"
							label="View booking"
							onPress={onOpenBooking}
						/>
					) : null}
					<ItineraryMenuItem
						icon={isSkipped ? "refresh-outline" : "remove-circle-outline"}
						label={isSkipped ? "Restore stop" : "Skip stop"}
						onPress={onToggleSkip}
					/>
					<View className="mx-2 my-1 h-px bg-border" />
					<ItineraryMenuItem
						icon="trash-outline"
						label="Delete stop"
						onPress={onDelete}
						tone="danger"
					/>
				</Menu.Content>
			</Menu.Portal>
		</Menu>
	);
}

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
	const getNodeAppearance = () => {
		if (isCompleted) {
			return {
				backgroundColor: "#34C759",
				iconColor: "#FFFFFF",
				iconName: "checkmark" as IoniconName,
			};
		}

		if (isSkipped) {
			return {
				backgroundColor: "rgba(142, 142, 147, 0.16)",
				iconColor: ITINERARY_SUBTLE_COLOR,
				iconName: getCategoryIcon(category),
			};
		}

		return {
			backgroundColor: undefined,
			iconColor: ITINERARY_ACCENT_COLOR,
			iconName: getCategoryIcon(category),
		};
	};

	const appearance = getNodeAppearance();

	return (
		<View className="items-center self-stretch">
			<Pressable
				accessibilityLabel={
					isCompleted ? "Mark stop as planned" : "Mark stop completed"
				}
				accessibilityRole="button"
				accessibilityState={{ checked: isCompleted, disabled: isPending }}
				className={`h-9 w-9 items-center justify-center rounded-full ${appearance.backgroundColor === undefined ? "bg-surface-secondary" : ""}`}
				disabled={isPending}
				onPress={onToggleComplete}
				style={({ pressed }) => ({
					backgroundColor: appearance.backgroundColor,
					opacity: isPending ? 0.6 : 1,
					transform: [{ scale: pressed ? 0.9 : 1 }],
				})}
			>
				<Ionicons
					color={appearance.iconColor}
					name={appearance.iconName}
					size={17}
				/>
			</Pressable>
			{isConnected ? (
				<View className="mt-1.5 w-0.5 flex-1 rounded-full bg-border" />
			) : null}
		</View>
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
			className={`flex-row gap-3 ${isLast ? "" : "border-border border-b pb-2"}`}
		>
			<View className="w-11 items-end pt-1">
				<Text
					style={{ color: ITINERARY_ACCENT_COLOR }}
					type="body-xs"
					weight="bold"
				>
					{item.startTime}
				</Text>
				<Text color="muted" type="body-xs">
					{item.endTime}
				</Text>
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
				className={`min-w-0 flex-1 gap-1.5 ${isLast ? "pb-1" : "pb-4"}`}
				style={{ opacity: isSkipped ? 0.55 : 1 }}
			>
				<View className="flex-row items-start justify-between gap-2">
					<View className="min-w-0 flex-1 gap-0.5">
						<Text
							numberOfLines={2}
							style={
								isCompleted
									? {
											color: ITINERARY_SUBTLE_COLOR,
											textDecorationLine: "line-through",
										}
									: undefined
							}
							type="body-sm"
							weight="bold"
						>
							{item.title}
						</Text>
						{item.locationName ? (
							<Text color="muted" numberOfLines={1} type="body-xs">
								{item.locationName}
							</Text>
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
				{metadata.length > 0 ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{metadata.join(" · ")}
					</Text>
				) : null}
				{hasNotes ? (
					<Text.Paragraph color="muted" type="body-sm">
						{item.description}
					</Text.Paragraph>
				) : null}
			</View>
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
	const day = calendarDay.existingDay;
	const stopLabel =
		calendarDay.stopCount === 1 ? "1 stop" : `${calendarDay.stopCount} stops`;

	return (
		<Pressable
			accessibilityLabel={`Open itinerary day ${calendarDay.dayNumber}`}
			accessibilityRole="button"
			className="rounded-[28px] border border-border bg-white p-4"
			onPress={onPress}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<View className="flex-row items-center gap-3">
				<View className="h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
					<Text
						style={{ color: ITINERARY_ACCENT_COLOR }}
						type="body"
						weight="bold"
					>
						{calendarDay.dayNumber}
					</Text>
				</View>
				<View className="min-w-0 flex-1 gap-1.5">
					<Text numberOfLines={1} type="body" weight="bold">
						{day?.title ?? `Day ${calendarDay.dayNumber}`}
					</Text>
					<Text color="muted" numberOfLines={1} type="body-sm">
						{calendarDay.label}
						{day?.theme ? ` · ${day.theme}` : ""}
					</Text>
					<View className="flex-row flex-wrap gap-1.5">
						<ItineraryMetaPill
							icon="location-outline"
							label={stopLabel}
							tone={calendarDay.stopCount > 0 ? "accent" : "neutral"}
						/>
						{day ? (
							<ItineraryMetaPill
								icon="speedometer-outline"
								label={formatChoiceLabel(day.pace)}
								tone={day.pace === "packed" ? "warning" : "neutral"}
							/>
						) : (
							<ItineraryMetaPill
								icon="add-circle-outline"
								label="Ready to add"
							/>
						)}
					</View>
				</View>
				<Ionicons
					color={ITINERARY_MUTED_COLOR}
					name="chevron-forward"
					size={18}
				/>
			</View>
		</Pressable>
	);
}

function EmptyPlannedDayContent({ onAddStop }: { onAddStop: () => void }) {
	return (
		<View className="items-center gap-3 py-6">
			<View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
				<Ionicons
					color={ITINERARY_ACCENT_COLOR}
					name="time-outline"
					size={21}
				/>
			</View>
			<View className="items-center gap-1">
				<Text color="muted" type="body-sm" weight="semibold">
					No stops yet
				</Text>
				<Text color="muted" numberOfLines={2} type="body-xs">
					Add the first stop when the timing is ready.
				</Text>
			</View>
			<ItineraryQuietActionButton
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
		<View className="items-center gap-3 rounded-[28px] border border-border bg-white px-5 py-8">
			<View
				className="h-12 w-12 items-center justify-center rounded-full"
				style={{ backgroundColor: "rgba(10, 132, 255, 0.1)" }}
			>
				<Ionicons
					color={ITINERARY_ACCENT_COLOR}
					name="calendar-outline"
					size={23}
				/>
			</View>
			<View className="items-center gap-1">
				<Text type="body" weight="bold">
					Start this day
				</Text>
				<Text
					color="muted"
					numberOfLines={2}
					style={{ textAlign: "center" }}
					type="body-sm"
				>
					Add the first stop to turn this date into an itinerary day.
				</Text>
			</View>
			<Button isDisabled={isSavingDay} onPress={onAddStop} size="lg">
				{isSavingDay ? <Spinner size="sm" /> : null}
				<Button.Label>Add itinerary</Button.Label>
			</Button>
		</View>
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
		<View className="gap-4">
			<View className="gap-3">
				<View className="flex-row items-center justify-between gap-3">
					<View className="min-w-0 flex-1 gap-1.5">
						<Text type="h4" weight="bold">
							{day.title || `Day ${day.dayNumber}`}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-sm">
							{getDayTabLabel(day.date, day.dayNumber)}
							{day.theme ? ` · ${day.theme}` : ""}
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<Menu>
							<Menu.Trigger asChild={true}>
								<Pressable
									accessibilityLabel="Day options"
									accessibilityRole="button"
									className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
									style={({ pressed }) => ({
										transform: [{ scale: pressed ? 0.94 : 1 }],
									})}
								>
									<Ionicons
										color={ITINERARY_MUTED_COLOR}
										name="ellipsis-horizontal"
										size={18}
									/>
								</Pressable>
							</Menu.Trigger>
							<Menu.Portal>
								<Menu.Overlay />
								<Menu.Content
									align="end"
									className="rounded-[24px] border border-border bg-surface p-2"
									offset={8}
									placement="bottom"
									presentation="popover"
									width={200}
								>
									<ItineraryMenuItem
										icon="create-outline"
										label="Edit day"
										onPress={() => onEditDay(day)}
									/>
									<View className="mx-2 my-1 h-px bg-border" />
									<ItineraryMenuItem
										icon="trash-outline"
										label="Delete day"
										onPress={() => onDeleteDay(day._id)}
										tone="danger"
									/>
								</Menu.Content>
							</Menu.Portal>
						</Menu>
						<Pressable
							accessibilityLabel="Add itinerary stop"
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full bg-accent"
							onPress={onAddStop}
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.94 : 1 }],
							})}
						>
							<Ionicons color="#FFFFFF" name="add" size={21} />
						</Pressable>
					</View>
				</View>
				{day.summary && day.summary !== defaultItineraryDaySummary ? (
					<Text.Paragraph color="muted" type="body-sm">
						{day.summary}
					</Text.Paragraph>
				) : null}
				<View className="flex-row flex-wrap gap-1.5">
					<ItineraryMetaPill
						icon="location-outline"
						label={stopCount === 1 ? "1 stop" : `${stopCount} stops`}
						tone={stopCount > 0 ? "accent" : "neutral"}
					/>
					<ItineraryMetaPill
						icon="speedometer-outline"
						label={formatChoiceLabel(day.pace)}
						tone={day.pace === "packed" ? "warning" : "neutral"}
					/>
					{day.estimatedCost > 0 ? (
						<ItineraryMetaPill
							icon="wallet-outline"
							label={formatCost(day.estimatedCost)}
						/>
					) : null}
					{day.weatherNote &&
					day.weatherNote !== defaultItineraryDayWeatherNote ? (
						<ItineraryMetaPill
							icon="partly-sunny-outline"
							label={getCompactLabel(day.weatherNote)}
						/>
					) : null}
				</View>
			</View>

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
		</View>
	);
}

export function TripItineraryScreen() {
	const tripId = useTripIdParam();
	const router = useRouter();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
	const { toast } = useToast();
	const [tripDateErrorMessage, setTripDateErrorMessage] = useState<
		string | null
	>(null);
	const [tripDateRange, setTripDateRange] = useState<DateRangeValue>({
		end: "",
		start: "",
	});
	const [isSavingTripDates, setIsSavingTripDates] = useState(false);

	const showItinerarySuccessToast = (message: string) => {
		toast.show({
			description: message,
			duration: 3600,
			label: "Itinerary updated",
			variant: "success",
		});
	};

	const showItineraryErrorToast = (message: string) => {
		toast.show({
			description: message,
			duration: 4200,
			label: "Itinerary needs attention",
			variant: "danger",
		});
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

	if (workspace === null) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="This trip was deleted or is no longer available."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined) {
		return <ScreenLoadingState />;
	}

	const { itineraryDays, itineraryItems, trip } = workspace;
	const tripDayCountFromDates =
		trip.startDate && trip.endDate
			? (getDateRangeDurationDays(trip.startDate, trip.endDate) ?? 1)
			: 1;
	const calendarDayCount = Math.max(
		1,
		tripDayCountFromDates,
		itineraryDays.length
	);
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
			showItinerarySuccessToast("Trip dates updated.");
		} catch {
			const message = "Could not update trip dates.";
			setTripDateErrorMessage(message);
			showItineraryErrorToast(message);
		} finally {
			setIsSavingTripDates(false);
		}
	};

	return (
		<TripModuleScreenFrame activeTab="itinerary" tripId={tripId}>
			<Container includeBottomInset={false} isScrollable={false}>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						gap: 16,
						paddingBottom: 112,
						paddingHorizontal: 16,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<ItineraryErrorNotice message={tripDateErrorMessage} />
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
						triggerClassName="h-14 w-full flex-row items-center gap-2 rounded-[24px] border border-border/70 bg-white px-4"
						triggerIconColor="#71717A"
						triggerVariant="button"
						value={effectiveTripDateRange}
					/>

					<View className="flex-row flex-wrap gap-1.5">
						<ItineraryMetaPill
							icon="calendar-outline"
							label={`${calendarDayCount} ${calendarDayCount === 1 ? "day" : "days"}`}
							tone="accent"
						/>
						<ItineraryMetaPill
							icon="checkmark-circle-outline"
							label={`${plannedDayCount} planned`}
						/>
						<ItineraryMetaPill
							icon="location-outline"
							label={`${totalStopCount} ${totalStopCount === 1 ? "stop" : "stops"}`}
						/>
					</View>

					<View className="gap-3">
						{previewDays.map((calendarDay) => (
							<ItineraryDaySurface
								calendarDay={calendarDay}
								key={calendarDay.dayNumber}
								onPress={() => {
									router.push(
										VIYA_ROUTES.tripItineraryDay(tripId, calendarDay.dayNumber)
									);
								}}
							/>
						))}
					</View>
				</ScrollView>
			</Container>
		</TripModuleScreenFrame>
	);
}

export function TripItineraryDayScreen() {
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
	const { toast } = useToast();
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

	const showItinerarySuccessToast = (message: string) => {
		toast.show({
			description: message,
			duration: 3600,
			label: "Itinerary updated",
			variant: "success",
		});
	};

	const showItineraryErrorToast = (message: string) => {
		toast.show({
			description: message,
			duration: 4200,
			label: "Itinerary needs attention",
			variant: "danger",
		});
	};

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

	if (workspace === null) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="This trip was deleted or is no longer available."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined) {
		return <ScreenLoadingState />;
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
	const calendarDayCount = Math.max(
		1,
		tripDayCountFromDates,
		itineraryDays.length
	);
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
				showItinerarySuccessToast("Itinerary day added.");
			}
			return createdDay ?? null;
		} catch {
			const message = "Could not add itinerary day.";
			setItineraryErrorMessage(message);
			showItineraryErrorToast(message);
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
			showItinerarySuccessToast("Itinerary day saved.");
		} catch {
			const message = "Could not save itinerary day.";
			setDayErrorMessage(message);
			showItineraryErrorToast(message);
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
			showItinerarySuccessToast(
				editingItemId ? "Itinerary stop saved." : "Itinerary stop added."
			);
		} catch {
			const message = "Could not save itinerary item.";
			setItemErrorMessage(message);
			showItineraryErrorToast(message);
		} finally {
			setIsSavingItem(false);
		}
	};
	const updateItemStatus = async (
		itemId: Id<"itineraryItems">,
		status: "planned" | "confirmed" | "skipped" | "completed"
	) => {
		setItineraryErrorMessage(null);
		setPendingItemId(itemId);
		try {
			await updateItineraryItem({ itemId, status });
		} catch {
			const message = "Could not update itinerary item.";
			setItineraryErrorMessage(message);
			showItineraryErrorToast(message);
		} finally {
			setPendingItemId(null);
		}
	};
	const handleDeleteDay = async (dayId: Id<"itineraryDays">) => {
		setItineraryErrorMessage(null);
		setPendingDayId(dayId);
		try {
			await deleteItineraryDay({ dayId });
			showItinerarySuccessToast("Itinerary day deleted.");
		} catch {
			const message = "Could not delete itinerary day.";
			setItineraryErrorMessage(message);
			showItineraryErrorToast(message);
		} finally {
			setPendingDayId(null);
		}
	};
	const handleDeleteItem = async (itemId: Id<"itineraryItems">) => {
		setItineraryErrorMessage(null);
		setPendingItemId(itemId);
		try {
			await deleteItineraryItem({ itemId });
			showItinerarySuccessToast("Itinerary stop deleted.");
		} catch {
			const message = "Could not delete itinerary item.";
			setItineraryErrorMessage(message);
			showItineraryErrorToast(message);
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
			showItineraryErrorToast("Could not open Maps for this itinerary stop.");
		}
	};
	return (
		<TripModuleScreenFrame activeTab="itinerary" tripId={tripId}>
			<Container includeBottomInset={false} isScrollable={false}>
				<ScrollView
					contentContainerStyle={{
						flexGrow: 1,
						gap: 16,
						paddingBottom: 112,
						paddingHorizontal: 16,
					}}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<ItineraryErrorNotice message={itineraryErrorMessage} />
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
				</ScrollView>
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
