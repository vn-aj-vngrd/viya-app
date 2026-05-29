import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
	BottomSheet,
	Button,
	Input,
	Label,
	Spinner,
	Text,
	TextField,
} from "heroui-native";
import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateNumberFormatter = new Intl.NumberFormat("en", {
	minimumIntegerDigits: 2,
	useGrouping: false,
});
const dateDisplayFormats = ["short", "medium", "long", "full"] as const;
const inlineDatePickerHeight = 360;

type DateDisplayFormat = (typeof dateDisplayFormats)[number];

const getDateFormatter = (
	dateDisplayFormat: DateDisplayFormat,
	locale?: string
) => new Intl.DateTimeFormat(locale, { dateStyle: dateDisplayFormat });

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

function WebDateInput({
	label,
	onChangeText,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	value: string;
}) {
	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				autoCapitalize="none"
				className="h-12 rounded-[18px] border border-border bg-surface px-4"
				onChangeText={onChangeText}
				placeholder="YYYY-MM-DD"
				value={value}
				variant="secondary"
			/>
		</TextField>
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
	accentColor,
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
							<View
								className="items-center justify-center rounded-[24px] bg-surface-secondary p-2"
								style={{
									minHeight:
										Platform.OS === "ios" ? inlineDatePickerHeight : 160,
								}}
							>
								{Platform.OS === "web" ? (
									<WebDateInput
										label={label}
										onChangeText={onChangeText}
										value={value}
									/>
								) : (
									<DateTimePicker
										accentColor={accentColor}
										display={Platform.OS === "ios" ? "inline" : "default"}
										maximumDate={maximumDate}
										minimumDate={minimumDate}
										mode="date"
										onChange={(_event, nextDate) => {
											if (nextDate) {
												onChangeText(formatIsoDate(nextDate));
												if (Platform.OS !== "ios") {
													updateOpen(false);
												}
											}
										}}
										value={selectedDate}
									/>
								)}
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
	value: DateRangeValue;
}

export function DateRangePickerField({
	accentColor,
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
	const pickerDate = activeSlot === "start" ? startDate : endDate;
	const activeMinimumDate =
		activeSlot === "end" && isIsoDate(orderedValue.start)
			? startDate
			: minimumDate;

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

	const updateRange = (slot: keyof DateRangeValue, nextDate: Date) => {
		const nextRange = getOrderedDateRange({
			...orderedValue,
			[slot]: formatIsoDate(nextDate),
		});
		onValueChange(nextRange);
	};
	const renderRangePickerControl = () => {
		if (Platform.OS === "web") {
			return (
				<View className="w-full gap-3">
					<WebDateInput
						label="Start date"
						onChangeText={(start) => onValueChange({ ...value, start })}
						value={value.start}
					/>
					<WebDateInput
						label="End date"
						onChangeText={(end) => onValueChange({ ...value, end })}
						value={value.end}
					/>
				</View>
			);
		}

		if (pickerDate) {
			return (
				<DateTimePicker
					accentColor={accentColor}
					display={Platform.OS === "ios" ? "inline" : "default"}
					maximumDate={maximumDate}
					minimumDate={activeMinimumDate}
					mode="date"
					onChange={(_event, nextDate) => {
						if (!nextDate) {
							return;
						}

						updateRange(activeSlot, nextDate);

						if (activeSlot === "start") {
							setActiveSlot("end");
						}
					}}
					value={pickerDate}
				/>
			);
		}

		return <Spinner />;
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
				valueLabel={valueLabel}
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

							<View
								className="items-center justify-center rounded-[24px] bg-surface-secondary p-2"
								style={{
									minHeight:
										Platform.OS === "ios" ? inlineDatePickerHeight : 160,
								}}
							>
								{renderRangePickerControl()}
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
