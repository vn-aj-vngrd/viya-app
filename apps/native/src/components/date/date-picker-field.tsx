import { Ionicons } from "@expo/vector-icons";
import {
	BottomSheet,
	Button,
	Input,
	Label,
	Text,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { DateData } from "react-native-calendars";
import { Calendar } from "react-native-calendars";
import type { MarkedDates, Theme } from "react-native-calendars/src/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateNumberFormatter = new Intl.NumberFormat("en", {
	minimumIntegerDigits: 2,
	useGrouping: false,
});
const dateDisplayFormats = ["short", "medium", "long", "full"] as const;
const selectedDateColor = "#0A84FF";
const rangeFillColor = "#EAF2FF";

type DateDisplayFormat = (typeof dateDisplayFormats)[number];

const getDateFormatter = (
	dateDisplayFormat: DateDisplayFormat,
	locale?: string
) => new Intl.DateTimeFormat(locale, { dateStyle: dateDisplayFormat });

const calendarTheme = {
	arrowColor: selectedDateColor,
	backgroundColor: "transparent",
	calendarBackground: "transparent",
	dayTextColor: "#18181B",
	monthTextColor: "#18181B",
	selectedDayBackgroundColor: selectedDateColor,
	selectedDayTextColor: "#FFFFFF",
	textDayFontSize: 18,
	textDayHeaderFontSize: 13,
	textDayHeaderFontWeight: "600",
	textDisabledColor: "#D4D4D8",
	textMonthFontSize: 17,
	textMonthFontWeight: "700",
	textSectionTitleColor: "#A1A1AA",
	todayTextColor: selectedDateColor,
} as const satisfies Theme;

export interface DateRangeValue {
	end: string;
	start: string;
}

type Presentation = "bottom-sheet" | "dialog" | "popover";

export const getStartOfToday = () => {
	const now = new Date();

	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const formatIsoDate = (date: Date) => {
	const year = date.getFullYear();
	const month = dateNumberFormatter.format(date.getMonth() + 1);
	const day = dateNumberFormatter.format(date.getDate());

	return `${year}-${month}-${day}`;
};

export const formatReadableDate = (
	date: Date,
	dateDisplayFormat: DateDisplayFormat = "medium",
	locale?: string
) => getDateFormatter(dateDisplayFormat, locale).format(date);

export const parseIsoDate = (
	value: string,
	fallbackDate = getStartOfToday()
) => {
	if (!isoDatePattern.test(value)) {
		return fallbackDate;
	}

	const [year, month, day] = value.split("-").map(Number);
	const parsedDate = new Date(year, month - 1, day);

	return Number.isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate;
};

export const isIsoDate = (value: string) => isoDatePattern.test(value);

const addDays = (date: Date, days: number) => {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);

	return nextDate;
};

const getOrderedDateRange = (range: DateRangeValue): DateRangeValue => {
	if (!(isIsoDate(range.start) && isIsoDate(range.end))) {
		return range;
	}

	const startDate = parseIsoDate(range.start);
	const endDate = parseIsoDate(range.end, startDate);

	if (endDate.getTime() < startDate.getTime()) {
		return {
			end: range.start,
			start: range.end,
		};
	}

	return range;
};

const formatRangeLabel = ({
	dateDisplayFormat = "medium",
	formatDateRange,
	locale,
	range,
	rangeSeparator = "–",
}: {
	dateDisplayFormat?: DateDisplayFormat;
	formatDateRange?: (start: Date, end: Date) => string;
	locale?: string;
	range: DateRangeValue;
	rangeSeparator?: string;
}) => {
	if (!(isIsoDate(range.start) && isIsoDate(range.end))) {
		return null;
	}

	const orderedRange = getOrderedDateRange(range);
	const startDate = parseIsoDate(orderedRange.start);
	const endDate = parseIsoDate(orderedRange.end, startDate);

	if (formatDateRange) {
		return formatDateRange(startDate, endDate);
	}

	const formatter = getDateFormatter(dateDisplayFormat, locale);
	const startLabel = formatter.format(startDate);
	const endLabel = formatter.format(endDate);

	if (orderedRange.start === orderedRange.end) {
		return startLabel;
	}

	return `${startLabel} ${rangeSeparator} ${endLabel}`;
};

const getSingleMarkedDate = (value: string): MarkedDates =>
	isIsoDate(value)
		? {
				[value]: {
					selected: true,
					selectedColor: selectedDateColor,
					selectedTextColor: "#FFFFFF",
				},
			}
		: {};

const getRangeMarkedDates = (range: DateRangeValue): MarkedDates => {
	if (!(isIsoDate(range.start) && isIsoDate(range.end))) {
		return {};
	}

	const orderedRange = getOrderedDateRange(range);
	const startDate = parseIsoDate(orderedRange.start);
	const endDate = parseIsoDate(orderedRange.end, startDate);
	const markedDates: MarkedDates = {};

	for (
		let date = startDate;
		date.getTime() <= endDate.getTime();
		date = addDays(date, 1)
	) {
		const isoDate = formatIsoDate(date);
		const isStart = isoDate === orderedRange.start;
		const isEnd = isoDate === orderedRange.end;

		markedDates[isoDate] = {
			color: isStart || isEnd ? selectedDateColor : rangeFillColor,
			endingDay: isEnd,
			startingDay: isStart,
			textColor: isStart || isEnd ? "#FFFFFF" : "#18181B",
		};
	}

	return markedDates;
};

function CalendarArrow({ direction }: { direction: "left" | "right" }) {
	return (
		<View className="h-9 w-9 items-center justify-center rounded-full bg-surface">
			<Ionicons
				color={selectedDateColor}
				name={direction === "left" ? "chevron-back" : "chevron-forward"}
				size={22}
			/>
		</View>
	);
}

function FieldHelperText({
	errorText,
	helperText,
	isInvalid,
}: {
	errorText?: string;
	helperText?: string;
	isInvalid?: boolean;
}) {
	if (isInvalid && errorText) {
		return (
			<Text className="text-danger" type="body-xs">
				{errorText}
			</Text>
		);
	}

	if (!helperText) {
		return null;
	}

	return (
		<Text color="muted" type="body-xs">
			{helperText}
		</Text>
	);
}

function RequiredLabelText({
	isRequired,
	label,
}: {
	isRequired?: boolean;
	label: string;
}) {
	return (
		<Label.Text>
			{label}
			{isRequired ? <Text className="text-danger"> *</Text> : null}
		</Label.Text>
	);
}

function DateTriggerField({
	isDisabled,
	isInvalid,
	label,
	onOpen,
	placeholder,
	valueLabel,
}: {
	isDisabled?: boolean;
	isInvalid?: boolean;
	label: string;
	onOpen: () => void;
	placeholder: string;
	valueLabel: string | null;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();
	const inputClassName = isInvalid
		? "h-12 border border-danger bg-surface px-4 pr-11"
		: "h-12 border border-border bg-surface px-4 pr-11";

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className="relative"
			disabled={isDisabled}
			onPress={onOpen}
			style={({ pressed }) => ({
				opacity: isDisabled ? 0.5 : 1,
				transform: [{ scale: pressed && !isDisabled ? 0.995 : 1 }],
			})}
		>
			<Input
				className={inputClassName}
				editable={false}
				onBlur={onBlur}
				onFocus={onFocus}
				placeholder={placeholder}
				pointerEvents="none"
				value={valueLabel ?? ""}
				variant="secondary"
			/>
			<View className="pointer-events-none absolute top-3.5 right-4">
				<Ionicons color="#71717A" name="calendar-outline" size={18} />
			</View>
		</Pressable>
	);
}

function DateRangeButtonTrigger({
	className,
	iconColor = selectedDateColor,
	isDisabled,
	label,
	onOpen,
	placeholder,
	valueLabel,
}: {
	className?: string;
	iconColor?: string;
	isDisabled?: boolean;
	label: string;
	onOpen: () => void;
	placeholder: string;
	valueLabel: string | null;
}) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className={
				className ??
				"h-11 flex-row items-center gap-2 self-start rounded-full border border-border/70 bg-white px-3"
			}
			disabled={isDisabled}
			onPress={onOpen}
			style={({ pressed }) => ({
				opacity: isDisabled ? 0.5 : 1,
				transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
			})}
		>
			<Ionicons color={iconColor} name="calendar-outline" size={17} />
			<Text
				className="min-w-0 flex-1"
				numberOfLines={1}
				type="body-sm"
				weight="semibold"
			>
				{valueLabel ?? placeholder}
			</Text>
			<Ionicons color="#71717A" name="chevron-down" size={14} />
		</Pressable>
	);
}

interface DatePickerFieldProps {
	accentColor?: string;
	dateDisplayFormat?: DateDisplayFormat;
	errorText?: string;
	formatDate?: (date: Date) => string;
	helperText?: string;
	isDisabled?: boolean;
	isInvalid?: boolean;
	isRequired?: boolean;
	label: string;
	locale?: string;
	maximumDate?: Date;
	minimumDate?: Date;
	onChangeText: (value: string) => void;
	onOpenChange?: (isOpen: boolean) => void;
	placeholder?: string;
	presentation?: Presentation;
	value: string;
}

export function DatePickerField({
	dateDisplayFormat = "medium",
	errorText,
	formatDate,
	helperText,
	isDisabled,
	isInvalid,
	isRequired,
	label,
	locale,
	maximumDate,
	minimumDate,
	onChangeText,
	onOpenChange,
	placeholder = "Choose a date",
	value,
}: DatePickerFieldProps) {
	const insets = useSafeAreaInsets();
	const [isOpen, setIsOpen] = useState(false);
	const fallbackDate = minimumDate ?? getStartOfToday();
	const selectedDate = parseIsoDate(value, fallbackDate);
	const selectedDateLabel = isIsoDate(value)
		? (formatDate?.(selectedDate) ??
			formatReadableDate(selectedDate, dateDisplayFormat, locale))
		: null;

	const updateOpen = (nextIsOpen: boolean) => {
		setIsOpen(nextIsOpen);
		onOpenChange?.(nextIsOpen);
	};

	return (
		<TextField className="gap-2">
			<Label>
				<RequiredLabelText isRequired={isRequired} label={label} />
			</Label>
			<DateTriggerField
				isDisabled={isDisabled}
				isInvalid={isInvalid}
				label={label}
				onOpen={() => updateOpen(true)}
				placeholder={placeholder}
				valueLabel={selectedDateLabel}
			/>
			<FieldHelperText
				errorText={errorText}
				helperText={helperText}
				isInvalid={isInvalid}
			/>

			<BottomSheet isOpen={isOpen} onOpenChange={updateOpen}>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[32px] bg-background"
						enablePanDownToClose={true}
						snapPoints={["76%"]}
					>
						<ScrollView
							contentContainerClassName="gap-5 px-5 pt-2"
							contentContainerStyle={{
								paddingBottom: Math.max(insets.bottom + 18, 36),
							}}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<View className="gap-1">
								<BottomSheet.Title>{label}</BottomSheet.Title>
								<BottomSheet.Description>
									Select a date for this field.
								</BottomSheet.Description>
							</View>
							<View className="overflow-hidden rounded-[28px] bg-surface-secondary px-2 py-3">
								<Calendar
									current={formatIsoDate(selectedDate)}
									enableSwipeMonths={true}
									hideExtraDays={true}
									markedDates={getSingleMarkedDate(value)}
									maxDate={maximumDate ? formatIsoDate(maximumDate) : undefined}
									minDate={minimumDate ? formatIsoDate(minimumDate) : undefined}
									monthFormat="MMMM yyyy"
									onDayPress={(day: DateData) => onChangeText(day.dateString)}
									renderArrow={(direction) => (
										<CalendarArrow direction={direction} />
									)}
									style={{ backgroundColor: "transparent" }}
									theme={calendarTheme}
								/>
							</View>
							<Button onPress={() => updateOpen(false)}>
								<Button.Label>Done</Button.Label>
							</Button>
						</ScrollView>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</TextField>
	);
}

interface DateRangePickerFieldProps {
	accentColor?: string;
	className?: string;
	dateDisplayFormat?: DateDisplayFormat;
	errorText?: string;
	formatDateRange?: (start: Date, end: Date) => string;
	helperText?: string;
	isDisabled?: boolean;
	isInvalid?: boolean;
	isRequired?: boolean;
	label: string;
	locale?: string;
	maximumDate?: Date;
	minimumDate?: Date;
	onOpenChange?: (isOpen: boolean) => void;
	onValueChange: (value: DateRangeValue) => void;
	placeholder?: string;
	presentation?: Presentation;
	rangeSeparator?: string;
	triggerClassName?: string;
	triggerIconColor?: string;
	triggerVariant?: "button" | "field";
	value: DateRangeValue;
}

export function DateRangePickerField({
	className,
	dateDisplayFormat = "medium",
	errorText,
	formatDateRange,
	helperText,
	isDisabled,
	isInvalid,
	isRequired,
	label,
	locale,
	maximumDate,
	minimumDate,
	onOpenChange,
	onValueChange,
	placeholder = "Choose a date range",
	rangeSeparator = "–",
	triggerClassName,
	triggerIconColor,
	triggerVariant = "field",
	value,
}: DateRangePickerFieldProps) {
	const insets = useSafeAreaInsets();
	const fallbackDate = minimumDate ?? getStartOfToday();
	const [isOpen, setIsOpen] = useState(false);
	const [activeSlot, setActiveSlot] = useState<keyof DateRangeValue>("start");
	const orderedValue = getOrderedDateRange(value);
	const startDate = parseIsoDate(orderedValue.start, fallbackDate);
	const endDate = parseIsoDate(orderedValue.end, startDate);
	const valueLabel = formatRangeLabel({
		dateDisplayFormat,
		formatDateRange,
		locale,
		range: orderedValue,
		rangeSeparator,
	});

	const updateOpen = (nextIsOpen: boolean) => {
		if (
			nextIsOpen &&
			!(isIsoDate(orderedValue.start) && isIsoDate(orderedValue.end))
		) {
			const fallbackIsoDate = formatIsoDate(fallbackDate);
			onValueChange({
				end: fallbackIsoDate,
				start: fallbackIsoDate,
			});
		}

		setIsOpen(nextIsOpen);
		onOpenChange?.(nextIsOpen);
	};

	const updateRange = (slot: keyof DateRangeValue, nextDateString: string) => {
		const nextRange = getOrderedDateRange({
			...orderedValue,
			[slot]: nextDateString,
		});
		onValueChange(nextRange);

		if (slot === "start") {
			setActiveSlot("end");
		}
	};

	return (
		<TextField className={className ?? "gap-2"}>
			{triggerVariant === "field" ? (
				<>
					<Label>
						<RequiredLabelText isRequired={isRequired} label={label} />
					</Label>
					<DateTriggerField
						isDisabled={isDisabled}
						isInvalid={isInvalid}
						label={label}
						onOpen={() => updateOpen(true)}
						placeholder={placeholder}
						valueLabel={valueLabel}
					/>
					<FieldHelperText
						errorText={errorText}
						helperText={helperText}
						isInvalid={isInvalid}
					/>
				</>
			) : (
				<DateRangeButtonTrigger
					className={triggerClassName}
					iconColor={triggerIconColor}
					isDisabled={isDisabled}
					label={label}
					onOpen={() => updateOpen(true)}
					placeholder={placeholder}
					valueLabel={valueLabel}
				/>
			)}

			<BottomSheet isOpen={isOpen} onOpenChange={updateOpen}>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[32px] bg-background"
						enablePanDownToClose={true}
						snapPoints={["92%"]}
					>
						<ScrollView
							contentContainerClassName="gap-5 px-5 pt-2"
							contentContainerStyle={{
								paddingBottom: Math.max(insets.bottom + 18, 36),
							}}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<View className="gap-1">
								<BottomSheet.Title>{label}</BottomSheet.Title>
								<BottomSheet.Description>
									Select a start date, then an end date.
								</BottomSheet.Description>
							</View>

							<View className="flex-row gap-2 rounded-[18px] bg-surface-secondary p-1">
								{(["start", "end"] as const).map((slot) => {
									const slotDate = slot === "start" ? startDate : endDate;
									const isSelected = activeSlot === slot;

									return (
										<Button
											className="flex-1"
											key={slot}
											onPress={() => setActiveSlot(slot)}
											size="sm"
											variant={isSelected ? "primary" : "secondary"}
										>
											<Button.Label>
												{slot === "start" ? "Start" : "End"} ·{" "}
												{formatReadableDate(
													slotDate,
													dateDisplayFormat,
													locale
												)}
											</Button.Label>
										</Button>
									);
								})}
							</View>

							<View className="overflow-hidden rounded-[28px] bg-surface-secondary px-2 py-3">
								<Calendar
									current={formatIsoDate(startDate)}
									enableSwipeMonths={true}
									hideExtraDays={true}
									markedDates={getRangeMarkedDates(orderedValue)}
									markingType="period"
									maxDate={maximumDate ? formatIsoDate(maximumDate) : undefined}
									minDate={minimumDate ? formatIsoDate(minimumDate) : undefined}
									monthFormat="MMMM yyyy"
									onDayPress={(day: DateData) =>
										updateRange(activeSlot, day.dateString)
									}
									renderArrow={(direction) => (
										<CalendarArrow direction={direction} />
									)}
									style={{ backgroundColor: "transparent" }}
									theme={calendarTheme}
								/>
							</View>

							<Button onPress={() => updateOpen(false)}>
								<Button.Label>Done</Button.Label>
							</Button>
						</ScrollView>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</TextField>
	);
}
