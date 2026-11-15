import type {
	BudgetPreference,
	FoodPreference,
	PacePreference,
	PlanningStyle,
	SpecialNeed,
	TravelInterest,
	TravelStyle,
	UserGroupPreference,
	UserPreferences,
} from "@viya-app/domain";
import {
	budgetPreferenceOptions,
	defaultUserPreferences,
	foodPreferenceOptions,
	groupPreferenceOptions,
	pacePreferenceOptions,
	planningStyleOptions,
	specialNeedOptions,
	travelInterestOptions,
	travelStyleOptions,
} from "@viya-app/domain";

export interface TravelPreferenceState {
	budgetPreference: BudgetPreference;
	foodPreference: FoodPreference;
	groupPreference: UserGroupPreference;
	interests: TravelInterest[];
	pacePreference: PacePreference;
	planningStyle: PlanningStyle;
	specialNeeds: SpecialNeed[];
	specialNeedsNote: string;
	travelStyle: TravelStyle;
}

export type SingleTravelPreferenceKey = Exclude<
	keyof TravelPreferenceState,
	"interests" | "specialNeeds" | "specialNeedsNote"
>;
export type MultiTravelPreferenceKey = "interests" | "specialNeeds";
export type TravelPreferenceKey =
	| SingleTravelPreferenceKey
	| MultiTravelPreferenceKey;

export interface TravelPreferenceOption {
	description: string;
	label: string;
	value: string;
}

export interface TravelPreferenceGroup {
	category: "Experience" | "Logistics" | "Planning";
	key: TravelPreferenceKey;
	mode: "multi" | "single";
	options: readonly TravelPreferenceOption[];
	title: string;
}

export const travelPreferenceGroups = [
	{
		category: "Experience",
		key: "travelStyle",
		mode: "single",
		options: travelStyleOptions,
		title: "Trip vibe",
	},
	{
		category: "Experience",
		key: "pacePreference",
		mode: "single",
		options: pacePreferenceOptions,
		title: "Daily pace",
	},
	{
		category: "Logistics",
		key: "budgetPreference",
		mode: "single",
		options: budgetPreferenceOptions,
		title: "Budget",
	},
	{
		category: "Experience",
		key: "interests",
		mode: "multi",
		options: travelInterestOptions,
		title: "Interests",
	},
	{
		category: "Experience",
		key: "foodPreference",
		mode: "single",
		options: foodPreferenceOptions,
		title: "Food",
	},
	{
		category: "Logistics",
		key: "groupPreference",
		mode: "single",
		options: groupPreferenceOptions,
		title: "Group",
	},
	{
		category: "Planning",
		key: "planningStyle",
		mode: "single",
		options: planningStyleOptions,
		title: "Planning style",
	},
	{
		category: "Planning",
		key: "specialNeeds",
		mode: "multi",
		options: specialNeedOptions,
		title: "Special needs",
	},
] as const satisfies readonly TravelPreferenceGroup[];

export const travelPreferenceCategories = [
	"Experience",
	"Logistics",
	"Planning",
] as const satisfies readonly TravelPreferenceGroup["category"][];

export function getOptionLabel(
	options: readonly { label: string; value: string }[],
	value: string
) {
	return options.find((option) => option.value === value)?.label ?? value;
}

export function getTravelPreferenceState(
	preferences?: Partial<UserPreferences> | null
): TravelPreferenceState {
	const interests =
		preferences?.interests && preferences.interests.length > 0
			? preferences.interests
			: defaultUserPreferences.interests;
	const specialNeeds =
		preferences?.specialNeeds && preferences.specialNeeds.length > 0
			? preferences.specialNeeds
			: defaultUserPreferences.specialNeeds;

	return {
		budgetPreference:
			preferences?.budgetPreference ?? defaultUserPreferences.budgetPreference,
		foodPreference:
			preferences?.foodPreference ?? defaultUserPreferences.foodPreference,
		groupPreference:
			preferences?.groupPreference ?? defaultUserPreferences.groupPreference,
		interests: [...interests],
		pacePreference:
			preferences?.pacePreference ?? defaultUserPreferences.pacePreference,
		planningStyle:
			preferences?.planningStyle ?? defaultUserPreferences.planningStyle,
		specialNeeds: [...specialNeeds],
		specialNeedsNote: preferences?.specialNeedsNote ?? "",
		travelStyle: preferences?.travelStyle ?? defaultUserPreferences.travelStyle,
	};
}

export function getNextMultiPreferenceValues(
	key: MultiTravelPreferenceKey,
	currentValues: readonly string[],
	value: string
) {
	const nextValues = currentValues.includes(value)
		? currentValues.filter((item) => item !== value)
		: [...currentValues, value];

	if (key === "specialNeeds") {
		if (value === "none") {
			return ["none"];
		}

		return nextValues.filter((item) => item !== "none");
	}

	return nextValues;
}

export function getTravelPreferenceDisplayValue({
	group,
	preferences,
}: {
	group: TravelPreferenceGroup;
	preferences: TravelPreferenceState;
}) {
	const selectedValue = preferences[group.key];

	if (Array.isArray(selectedValue)) {
		const labels = selectedValue.map((value) =>
			getOptionLabel(group.options, value)
		);

		if (labels.length === 0) {
			return "None";
		}

		if (labels.length > 2) {
			return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
		}

		return labels.join(", ");
	}

	return getOptionLabel(group.options, selectedValue);
}
