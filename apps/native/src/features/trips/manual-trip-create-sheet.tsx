import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Spinner,
	TagGroup,
	Text,
	TextArea,
	TextField,
	useBottomSheetAwareHandlers,
	useThemeColor,
} from "heroui-native";
import type { ComponentProps } from "react";
import { useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";

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
	custom: "sparkles-outline",
	relaxed: "cafe-outline",
};

const groupTypeIcons: Record<GroupType, IoniconName> = {
	couple: "heart-outline",
	custom: "people-circle-outline",
	family: "home-outline",
	friends: "people-outline",
	solo: "person-outline",
};

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
	onPlanWithViya: () => void;
}

const initialFormState: ManualTripFormState = {
	budgetAmount: "",
	customGroupType: "",
	customTravelStyle: "",
	destination: "",
	endDate: "",
	groupType: "",
	interests: "",
	notes: "",
	origin: "",
	requirements: "",
	startDate: "",
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
	const { onBlur, onFocus } = useBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>
					{label}
					{isRequired ? <Text className="text-danger"> *</Text> : null}
				</Label.Text>
			</Label>
			<Input
				autoCapitalize={autoCapitalize}
				className="h-12 border border-border bg-surface px-4"
				keyboardType={keyboardType}
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
	const { onBlur, onFocus } = useBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>
					{label}
					{isRequired ? <Text className="text-danger"> *</Text> : null}
				</Label.Text>
			</Label>
			<TextArea
				className="min-h-16 rounded-[18px] border border-border bg-surface px-4 py-3"
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
		"Manual trip draft.",
		form.origin ? `Departing from: ${form.origin}.` : null,
		form.travelerCount ? `Travelers: ${form.travelerCount}.` : null,
		groupType ? `Group: ${groupType}.` : null,
		travelStyle ? `Vibe: ${travelStyle}.` : null,
		form.interests ? `Interests: ${form.interests}.` : null,
		form.requirements ? `Requirements: ${form.requirements}.` : null,
		form.notes ? `Notes: ${form.notes}.` : null,
		"Viya can use this context to enrich bookings, readiness, and itinerary later.",
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
	const selectedKeys = value ? new Set([value]) : new Set<string>();
	const [accentSoftForegroundColor, fieldForegroundColor] = useThemeColor([
		"accent-soft-foreground",
		"field-foreground",
	]);

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<TagGroup
				onSelectionChange={(keys) => {
					const nextValue = Array.from(keys)[0];

					if (options.includes(nextValue as Value)) {
						onChange(nextValue as Value);
					}
				}}
				selectedKeys={selectedKeys}
				selectionMode="single"
				size="lg"
				variant="surface"
			>
				<TagGroup.List className="flex-row flex-wrap gap-2">
					{options.map((option) => (
						<TagGroup.Item id={option} key={option}>
							{({ isSelected }) => (
								<>
									<Ionicons
										color={
											isSelected
												? accentSoftForegroundColor
												: fieldForegroundColor
										}
										name={icons[option]}
										size={16}
									/>
									<TagGroup.ItemLabel>
										{getOptionLabel(option)}
									</TagGroup.ItemLabel>
								</>
							)}
						</TagGroup.Item>
					))}
				</TagGroup.List>
			</TagGroup>
		</TextField>
	);
}

export function ManualTripCreateSheet({
	isOpen,
	onCreated,
	onOpenChange,
	onPlanWithViya,
}: ManualTripCreateSheetProps) {
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const foregroundColor = useThemeColor("foreground");
	const createTrip = useMutation(api.trips.createTrip);
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
			setErrorMessage(formError);
			return;
		}

		setIsCreating(true);
		setErrorMessage(null);
		try {
			const result = await createTrip({
				budgetAmount,
				budgetCurrency: "PHP",
				destination: trimmedForm.destination,
				endDate: trimmedForm.endDate,
				groupType: resolvedGroupType,
				startDate: trimmedForm.startDate,
				summary: getManualTripSummary(trimmedForm),
				title: tripTitle,
				travelStyle: resolvedTravelStyle,
			});
			setForm(initialFormState);
			onOpenChange(false);
			onCreated(result.tripId);
		} catch (error) {
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
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["88%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Create trip</BottomSheet.Title>
								<BottomSheet.Description ellipsizeMode="tail" numberOfLines={1}>
									Add basics now. Viya can refine later.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close create trip"
								className="h-10 w-10 rounded-full bg-surface"
								iconProps={{ color: foregroundColor, size: 22 }}
								onPress={() => onOpenChange(false)}
							/>
						</View>

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
							<SheetField
								autoCapitalize="words"
								isRequired={true}
								label="Destination"
								onChangeText={(value) => updateForm("destination", value)}
								placeholder="City, country, or region"
								value={form.destination}
							/>
							<SheetField
								autoCapitalize="words"
								label="Departing from"
								onChangeText={(value) => updateForm("origin", value)}
								placeholder="Home city or airport"
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
								placeholder="Anything else Viya should remember"
								value={form.notes}
							/>
						</ScrollView>

						<View className="gap-2">
							{errorMessage ? (
								<Text className="text-danger" type="body-sm">
									{errorMessage}
								</Text>
							) : null}
							<Button isDisabled={isCreating} onPress={handleCreate} size="lg">
								{isCreating ? <Spinner size="sm" /> : null}
								<Button.Label>Create trip</Button.Label>
							</Button>
							<Button
								isDisabled={isCreating}
								onPress={onPlanWithViya}
								size="lg"
								variant="secondary"
							>
								<Button.Label>Plan with Viya AI</Button.Label>
							</Button>
						</View>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
