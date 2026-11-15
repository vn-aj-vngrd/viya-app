import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "heroui-native";
import { type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import type { DateData } from "react-native-calendars";
import { Calendar } from "react-native-calendars";
import type { MarkedDates, Theme } from "react-native-calendars/src/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	AppText,
	metrics,
	type Palette,
	PressableScale,
	PrimaryButton,
	radius,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateNumberFormatter = new Intl.NumberFormat("en", {
	minimumIntegerDigits: 2,
	useGrouping: false,
});
const dateDisplayFormats = ["short", "medium", "long", "full"] as const;
const FIELD_HEIGHT = 50;

type DateDisplayFormat = (typeof dateDisplayFormats)[number];

const getDateFormatter = (
	dateDisplayFormat: DateDisplayFormat,
	locale?: string
) => new Intl.DateTimeFormat(locale, { dateStyle: dateDisplayFormat });

const getCalendarTheme = (palette: Palette): Theme => ({
	arrowColor: palette.accent,
	backgroundColor: "transparent",
	calendarBackground: "transparent",
	dayTextColor: palette.ink,
	monthTextColor: palette.ink,
	selectedDayBackgroundColor: palette.accent,
	selectedDayTextColor: "#FFFFFF",
	textDayFontSize: 18,
	textDayHeaderFontSize: 13,
	textDayHeaderFontWeight: "600",
	textDisabledColor: palette.inkTertiary,
	textMonthFontSize: 17,
	textMonthFontWeight: "700",
	textSectionTitleColor: palette.inkSecondary,
	todayTextColor: palette.accent,
});

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

const getSingleMarkedDate = (value: string, palette: Palette): MarkedDates =>
	isIsoDate(value)
		? {
				[value]: {
					selected: true,
					selectedColor: palette.accent,
					selectedTextColor: "#FFFFFF",
				},
			}
		: {};

const getRangeMarkedDates = (
	range: DateRangeValue,
	palette: Palette
): MarkedDates => {
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
			color: isStart || isEnd ? palette.accent : palette.fill,
			endingDay: isEnd,
			startingDay: isStart,
			textColor: isStart || isEnd ? "#FFFFFF" : palette.ink,
		};
	}

	return markedDates;
};

function CalendarArrow({ direction }: { direction: "left" | "right" }) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: 36,
				justifyContent: "center",
				width: 36,
			}}
		>
			<Ionicons
				color={palette.accent}
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
			<AppText tone="danger" variant="footnote">
				{errorText}
			</AppText>
		);
	}

	if (!helperText) {
		return null;
	}

	return (
		<AppText tone="secondary" variant="footnote">
			{helperText}
		</AppText>
	);
}

function FieldLabel({
	isRequired,
	label,
}: {
	isRequired?: boolean;
	label: string;
}) {
	return (
		<AppText tone="secondary" variant="footnote">
			{label}
			{isRequired ? (
				<AppText tone="danger" variant="footnote">
					{" "}
					*
				</AppText>
			) : null}
		</AppText>
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
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole="button"
			disabled={isDisabled}
			haptic="selection"
			onPress={onOpen}
			scaleTo={0.99}
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderColor: isInvalid ? palette.danger : "transparent",
				borderRadius: radius.field,
				borderWidth: isInvalid ? 1 : 0,
				flexDirection: "row",
				gap: spacing.sm,
				height: FIELD_HEIGHT,
				opacity: isDisabled ? 0.5 : 1,
				paddingHorizontal: spacing.lg,
			}}
		>
			<AppText
				numberOfLines={1}
				style={{ flex: 1 }}
				tone={valueLabel ? "ink" : "tertiary"}
			>
				{valueLabel ?? placeholder}
			</AppText>
			<Ionicons
				color={palette.inkSecondary}
				name="calendar-outline"
				size={18}
			/>
		</PressableScale>
	);
}

function DateRangeButtonTrigger({
	className,
	iconColor,
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
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole="button"
			className={className}
			disabled={isDisabled}
			haptic="selection"
			onPress={onOpen}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				alignSelf: "flex-start",
				backgroundColor: palette.surface,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: spacing.sm,
				height: metrics.minTarget,
				opacity: isDisabled ? 0.5 : 1,
				paddingHorizontal: spacing.md,
			}}
		>
			<Ionicons
				color={iconColor ?? palette.accent}
				name="calendar-outline"
				size={17}
			/>
			<AppText bold={true} numberOfLines={1} variant="subhead">
				{valueLabel ?? placeholder}
			</AppText>
			<Ionicons color={palette.inkTertiary} name="chevron-down" size={14} />
		</PressableScale>
	);
}

function PickerSheet({
	children,
	isOpen,
	label,
	onOpenChange,
	snapPoint,
	subtitle,
}: {
	children: ReactNode;
	isOpen: boolean;
	label: string;
	onOpenChange: (isOpen: boolean) => void;
	snapPoint: string;
	subtitle: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="bg-background"
					enablePanDownToClose={true}
					snapPoints={[snapPoint]}
				>
					<SheetHeader
						onClose={() => onOpenChange(false)}
						subtitle={subtitle}
						title={label}
					/>
					<ScrollView
						contentContainerStyle={{
							gap: spacing.lg,
							padding: spacing.lg,
							paddingBottom: Math.max(insets.bottom + spacing.lg, 36),
						}}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						{children}
						<PrimaryButton label="Done" onPress={() => onOpenChange(false)} />
					</ScrollView>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function CalendarCard({ children }: { children: ReactNode }) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.surface,
				borderRadius: radius.card,
				overflow: "hidden",
				paddingHorizontal: spacing.sm,
				paddingVertical: spacing.md,
			}}
		>
			{children}
		</View>
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
	const { palette, scheme } = useUITheme();
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
		<View style={{ gap: spacing.sm }}>
			<FieldLabel isRequired={isRequired} label={label} />
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

			<PickerSheet
				isOpen={isOpen}
				label={label}
				onOpenChange={updateOpen}
				snapPoint="76%"
				subtitle="Select a date for this field."
			>
				<CalendarCard>
					<Calendar
						current={formatIsoDate(selectedDate)}
						enableSwipeMonths={true}
						hideExtraDays={true}
						key={scheme}
						markedDates={getSingleMarkedDate(value, palette)}
						maxDate={maximumDate ? formatIsoDate(maximumDate) : undefined}
						minDate={minimumDate ? formatIsoDate(minimumDate) : undefined}
						monthFormat="MMMM yyyy"
						onDayPress={(day: DateData) => onChangeText(day.dateString)}
						renderArrow={(direction) => <CalendarArrow direction={direction} />}
						style={{ backgroundColor: "transparent" }}
						theme={getCalendarTheme(palette)}
					/>
				</CalendarCard>
			</PickerSheet>
		</View>
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
	const { palette, scheme } = useUITheme();
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
		<View className={className} style={{ gap: spacing.sm }}>
			{triggerVariant === "field" ? (
				<>
					<FieldLabel isRequired={isRequired} label={label} />
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

			<PickerSheet
				isOpen={isOpen}
				label={label}
				onOpenChange={updateOpen}
				snapPoint="92%"
				subtitle="Select a start date, then an end date."
			>
				<View
					style={{
						backgroundColor: palette.fill,
						borderRadius: radius.group,
						flexDirection: "row",
						gap: spacing.xs,
						padding: spacing.xs,
					}}
				>
					{(["start", "end"] as const).map((slot) => {
						const slotDate = slot === "start" ? startDate : endDate;
						const isSelected = activeSlot === slot;

						return (
							<PressableScale
								accessibilityLabel={`${slot === "start" ? "Start" : "End"} date`}
								accessibilityRole="button"
								accessibilityState={{ selected: isSelected }}
								haptic="selection"
								key={slot}
								onPress={() => setActiveSlot(slot)}
								scaleTo={0.98}
								style={{
									alignItems: "center",
									backgroundColor: isSelected ? palette.surface : "transparent",
									borderRadius: radius.tile,
									flex: 1,
									justifyContent: "center",
									minHeight: metrics.minTarget,
									paddingHorizontal: spacing.sm,
								}}
							>
								<AppText
									bold={isSelected}
									numberOfLines={1}
									tone={isSelected ? "ink" : "secondary"}
									variant="subhead"
								>
									{slot === "start" ? "Start" : "End"} ·{" "}
									{formatReadableDate(slotDate, dateDisplayFormat, locale)}
								</AppText>
							</PressableScale>
						);
					})}
				</View>

				<CalendarCard>
					<Calendar
						current={formatIsoDate(startDate)}
						enableSwipeMonths={true}
						hideExtraDays={true}
						key={scheme}
						markedDates={getRangeMarkedDates(orderedValue, palette)}
						markingType="period"
						maxDate={maximumDate ? formatIsoDate(maximumDate) : undefined}
						minDate={minimumDate ? formatIsoDate(minimumDate) : undefined}
						monthFormat="MMMM yyyy"
						onDayPress={(day: DateData) =>
							updateRange(activeSlot, day.dateString)
						}
						renderArrow={(direction) => <CalendarArrow direction={direction} />}
						style={{ backgroundColor: "transparent" }}
						theme={getCalendarTheme(palette)}
					/>
				</CalendarCard>
			</PickerSheet>
		</View>
	);
}
