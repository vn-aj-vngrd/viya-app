import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { BottomSheet } from "heroui-native";
import type { ComponentProps } from "react";
import { useCallback, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

import {
	DateRangePickerField,
	type DateRangeValue,
	formatIsoDate,
	getStartOfToday,
} from "@/src/components/date/date-picker-field";

import {
	AppText,
	haptic,
	PressableScale,
	PrimaryButton,
	radius,
	SheetHeader,
	useUITheme,
} from "@/src/components/ui";
import { LocationSuggestionField } from "./location-suggestion-field";
import { fetchTripCoverImageUrl } from "./trip-cover-image";
import { TripTextField } from "./trip-text-field";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const travelStyleOptions = [
	"balanced",
	"relaxed",
	"adventure",
	"budget",
	"custom",
] as const;
const groupTypeOptions = [
	"solo",
	"couple",
	"family",
	"friends",
	"custom",
] as const;

type TravelStyle = (typeof travelStyleOptions)[number];
type GroupType = (typeof groupTypeOptions)[number];
type TravelStyleSelection = TravelStyle | "";
type GroupTypeSelection = GroupType | "";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

const travelStyleIcons: Record<TravelStyle, IoniconName> = {
	adventure: "compass-outline",
	balanced: "scale-outline",
	budget: "wallet-outline",
	custom: "options-outline",
	relaxed: "cafe-outline",
};

const groupTypeIcons: Record<GroupType, IoniconName> = {
	couple: "heart-outline",
	custom: "people-circle-outline",
	family: "home-outline",
	friends: "people-outline",
	solo: "person-outline",
};
const defaultTripDate = formatIsoDate(getStartOfToday());

interface ManualTripFormState {
	budgetAmount: string;
	customGroupType: string;
	customTravelStyle: string;
	destination: string;
	endDate: string;
	groupType: GroupTypeSelection;
	interests: string;
	notes: string;
	origin: string;
	requirements: string;
	startDate: string;
	title: string;
	travelerCount: string;
	travelStyle: TravelStyleSelection;
}

interface ManualTripCreateSheetProps {
	isOpen: boolean;
	onCreated: (tripId: Id<"trips">) => void;
	onOpenChange: (isOpen: boolean) => void;
}

const initialFormState: ManualTripFormState = {
	budgetAmount: "",
	customGroupType: "",
	customTravelStyle: "",
	destination: "",
	endDate: defaultTripDate,
	groupType: "",
	interests: "",
	notes: "",
	origin: "",
	requirements: "",
	startDate: defaultTripDate,
	title: "",
	travelerCount: "",
	travelStyle: "",
};

const getTrimmedForm = (form: ManualTripFormState) => ({
	...form,
	budgetAmount: form.budgetAmount.trim(),
	customGroupType: form.customGroupType.trim(),
	customTravelStyle: form.customTravelStyle.trim(),
	destination: form.destination.trim(),
	endDate: form.endDate.trim(),
	interests: form.interests.trim(),
	notes: form.notes.trim(),
	origin: form.origin.trim(),
	requirements: form.requirements.trim(),
	startDate: form.startDate.trim(),
	title: form.title.trim(),
	travelerCount: form.travelerCount.trim(),
});

const getFormError = (form: ManualTripFormState) => {
	const trimmedForm = getTrimmedForm(form);

	if (!trimmedForm.title) {
		return "Add a trip name.";
	}

	if (!trimmedForm.destination) {
		return "Add a destination.";
	}

	if (!datePattern.test(trimmedForm.startDate)) {
		return "Use YYYY-MM-DD for the start date.";
	}

	if (!datePattern.test(trimmedForm.endDate)) {
		return "Use YYYY-MM-DD for the end date.";
	}

	if (
		new Date(`${trimmedForm.endDate}T00:00:00.000Z`).getTime() <
		new Date(`${trimmedForm.startDate}T00:00:00.000Z`).getTime()
	) {
		return "End date must be after the start date.";
	}

	if (trimmedForm.budgetAmount) {
		const amount = Number(trimmedForm.budgetAmount.replaceAll(",", ""));
		if (!(Number.isFinite(amount) && amount > 0)) {
			return "Budget must be a positive number.";
		}
	}

	if (trimmedForm.travelerCount) {
		const travelerCount = Number(trimmedForm.travelerCount);
		if (!(Number.isInteger(travelerCount) && travelerCount > 0)) {
			return "Travelers must be a whole number.";
		}
	}

	if (trimmedForm.travelStyle === "custom" && !trimmedForm.customTravelStyle) {
		return "Describe the custom vibe.";
	}

	if (trimmedForm.groupType === "custom" && !trimmedForm.customGroupType) {
		return "Describe the custom group.";
	}

	return null;
};

function SheetField({
	autoCapitalize,
	isRequired,
	keyboardType,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	isRequired?: boolean;
	keyboardType?: "default" | "numeric";
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TripTextField
			autoCapitalize={autoCapitalize}
			isRequired={isRequired}
			keyboardType={keyboardType}
			label={label}
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder={placeholder}
			value={value}
		/>
	);
}

function SheetTextAreaField({
	isRequired,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	isRequired?: boolean;
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TripTextField
			isRequired={isRequired}
			label={label}
			multiline
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder={placeholder}
			value={value}
		/>
	);
}

const getResolvedTravelStyle = (form: ReturnType<typeof getTrimmedForm>) => {
	if (!form.travelStyle) {
		return;
	}

	if (form.travelStyle === "custom") {
		return form.customTravelStyle;
	}

	return form.travelStyle;
};

const getResolvedGroupType = (form: ReturnType<typeof getTrimmedForm>) => {
	if (!form.groupType) {
		return;
	}

	if (form.groupType === "custom") {
		return form.customGroupType;
	}

	return form.groupType;
};

const getResolvedTravelStyleLabel = (
	form: ReturnType<typeof getTrimmedForm>
) =>
	form.travelStyle === "custom" ? form.customTravelStyle : form.travelStyle;

const getResolvedGroupTypeLabel = (form: ReturnType<typeof getTrimmedForm>) =>
	form.groupType === "custom" ? form.customGroupType : form.groupType;

const getManualTripSummary = (form: ReturnType<typeof getTrimmedForm>) => {
	const groupType = getResolvedGroupTypeLabel(form);
	const travelStyle = getResolvedTravelStyleLabel(form);
	const details = [
		"Manual trip planning started.",
		form.origin ? `Departing from: ${form.origin}.` : null,
		form.travelerCount ? `Travelers: ${form.travelerCount}.` : null,
		groupType ? `Group: ${groupType}.` : null,
		travelStyle ? `Vibe: ${travelStyle}.` : null,
		form.interests ? `Interests: ${form.interests}.` : null,
		form.requirements ? `Requirements: ${form.requirements}.` : null,
		form.notes ? `Notes: ${form.notes}.` : null,
		"Use this context to enrich bookings, readiness, and itinerary later.",
	].filter(Boolean);

	return details.join(" ");
};

const getOptionLabel = (option: string) =>
	`${option.charAt(0).toUpperCase()}${option.slice(1)}`;

function OptionRow<Value extends string>({
	icons,
	label,
	onChange,
	options,
	value,
}: {
	icons: Record<Value, IoniconName>;
	label: string;
	onChange: (value: Value) => void;
	options: readonly Value[];
	value: Value | "";
}) {
	const { palette } = useUITheme();

	return (
		<View style={{ gap: 8 }}>
			<AppText bold variant="subhead">
				{label}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{options.map((option) => {
					const isSelected = option === value;
					const foreground = isSelected ? palette.onPrimary : palette.ink;

					return (
						<PressableScale
							accessibilityLabel={getOptionLabel(option)}
							accessibilityRole="button"
							accessibilityState={{ selected: isSelected }}
							haptic="selection"
							hitSlop={{ bottom: 5, top: 5 }}
							key={option}
							onPress={() => onChange(option)}
							scaleTo={0.97}
							style={{
								alignItems: "center",
								backgroundColor: isSelected ? palette.ink : palette.surface,
								borderRadius: radius.pill,
								flexDirection: "row",
								gap: 6,
								height: 34,
								paddingHorizontal: 12,
							}}
						>
							<Ionicons color={foreground} name={icons[option]} size={15} />
							<AppText
								style={{ color: foreground, fontWeight: "500" }}
								variant="subhead"
							>
								{getOptionLabel(option)}
							</AppText>
						</PressableScale>
					);
				})}
			</View>
		</View>
	);
}

export function ManualTripCreateSheet({
	isOpen,
	onCreated,
	onOpenChange,
}: ManualTripCreateSheetProps) {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const { palette } = useUITheme();
	const createTrip = useMutation(api.trips.createTrip);
	const runLocationSuggestionSearch = useAction(
		api.locations.searchLocationSuggestions
	);
	const searchLocationSuggestions = useCallback(
		(text: string) => runLocationSuggestionSearch({ text }),
		[runLocationSuggestionSearch]
	);
	const [form, setForm] = useState<ManualTripFormState>(initialFormState);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const trimmedForm = getTrimmedForm(form);
	const budgetAmount = trimmedForm.budgetAmount
		? Number(trimmedForm.budgetAmount.replaceAll(",", ""))
		: undefined;
	const tripTitle = trimmedForm.title;
	const resolvedGroupType = getResolvedGroupType(trimmedForm);
	const resolvedTravelStyle = getResolvedTravelStyle(trimmedForm);
	const formMaxHeight = Math.max(360, height * 0.56);
	const tripDateRange: DateRangeValue = {
		end: form.endDate,
		start: form.startDate,
	};

	const updateForm = <Key extends keyof ManualTripFormState>(
		key: Key,
		value: ManualTripFormState[Key]
	) => {
		setForm((currentForm) => ({ ...currentForm, [key]: value }));
		setErrorMessage(null);
	};

	const handleCreate = async () => {
		const formError = getFormError(form);

		if (formError) {
			haptic("warning");
			setErrorMessage(formError);
			return;
		}

		setIsCreating(true);
		setErrorMessage(null);
		try {
			const coverImageUrl = await fetchTripCoverImageUrl(
				trimmedForm.destination
			);
			const result = await createTrip({
				budgetAmount,
				budgetCurrency: "PHP",
				coverImageUrl,
				destination: trimmedForm.destination,
				endDate: trimmedForm.endDate,
				groupType: resolvedGroupType,
				startDate: trimmedForm.startDate,
				summary: getManualTripSummary(trimmedForm),
				title: tripTitle,
				travelStyle: resolvedTravelStyle,
			});
			haptic("success");
			setForm(initialFormState);
			onOpenChange(false);
			onCreated(result.tripId);
		} catch (error) {
			haptic("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Could not create this trip."
			);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["88%"]}
				>
					<View
						style={{
							backgroundColor: palette.canvas,
							gap: 16,
							paddingBottom: Math.max(insets.bottom, 18),
							paddingHorizontal: 20,
							paddingTop: 0,
						}}
					>
						<SheetHeader
							onClose={() => onOpenChange(false)}
							subtitle="Add the trip basics manually."
							title="Create trip"
						/>

						<ScrollView
							contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: formMaxHeight }}
						>
							<SheetField
								autoCapitalize="words"
								isRequired={true}
								label="Trip name"
								onChangeText={(value) => updateForm("title", value)}
								placeholder="Summer getaway"
								value={form.title}
							/>
							<LocationSuggestionField
								isRequired={true}
								label="Destination"
								onChangeText={(value) => updateForm("destination", value)}
								placeholder="City, country, or region"
								searchLocationSuggestions={searchLocationSuggestions}
								value={form.destination}
							/>
							<LocationSuggestionField
								label="Departing from"
								onChangeText={(value) => updateForm("origin", value)}
								placeholder="Home city or airport"
								searchLocationSuggestions={searchLocationSuggestions}
								value={form.origin}
							/>
							<DateRangePickerField
								helperText="Select the trip start and end dates."
								isRequired={true}
								label="Trip dates"
								onValueChange={(value) => {
									updateForm("startDate", value.start);
									updateForm("endDate", value.end);
								}}
								value={tripDateRange}
							/>
							<SheetField
								keyboardType="numeric"
								label="Budget"
								onChangeText={(value) => updateForm("budgetAmount", value)}
								placeholder="Optional amount"
								value={form.budgetAmount}
							/>
							<SheetField
								keyboardType="numeric"
								label="Travelers"
								onChangeText={(value) => updateForm("travelerCount", value)}
								placeholder="Number of people"
								value={form.travelerCount}
							/>
							<OptionRow
								icons={travelStyleIcons}
								label="Vibe"
								onChange={(value) => updateForm("travelStyle", value)}
								options={travelStyleOptions}
								value={form.travelStyle}
							/>
							{form.travelStyle === "custom" ? (
								<SheetField
									autoCapitalize="sentences"
									isRequired={true}
									label="Custom vibe"
									onChangeText={(value) =>
										updateForm("customTravelStyle", value)
									}
									placeholder="Slow food trip, wellness reset, nightlife"
									value={form.customTravelStyle}
								/>
							) : null}
							<OptionRow
								icons={groupTypeIcons}
								label="Group"
								onChange={(value) => updateForm("groupType", value)}
								options={groupTypeOptions}
								value={form.groupType}
							/>
							{form.groupType === "custom" ? (
								<SheetField
									autoCapitalize="sentences"
									isRequired={true}
									label="Custom group"
									onChangeText={(value) => updateForm("customGroupType", value)}
									placeholder="Family with kids, team offsite, mixed ages"
									value={form.customGroupType}
								/>
							) : null}
							<SheetTextAreaField
								label="Interests"
								onChangeText={(value) => updateForm("interests", value)}
								placeholder="Food, beaches, museums, shopping, nightlife"
								value={form.interests}
							/>
							<SheetTextAreaField
								label="Requirements"
								onChangeText={(value) => updateForm("requirements", value)}
								placeholder="Accessibility, visas, dietary needs, work meetings"
								value={form.requirements}
							/>
							<SheetTextAreaField
								label="Extra notes"
								onChangeText={(value) => updateForm("notes", value)}
								placeholder="Anything else to keep with this trip"
								value={form.notes}
							/>
						</ScrollView>

						<View style={{ gap: 8 }}>
							{errorMessage ? (
								<AppText
									accessibilityLiveRegion="polite"
									tone="danger"
									variant="subhead"
								>
									{errorMessage}
								</AppText>
							) : null}
							<PrimaryButton
								disabled={isCreating}
								isPending={isCreating}
								label="Create trip"
								onPress={handleCreate}
							/>
						</View>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
