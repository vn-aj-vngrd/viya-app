export const minimumLocationSuggestionQueryLength = 2;

export type LocationSuggestionStatus = "idle" | "loading" | "error";
export type LocationSuggestionPanelMessage = "empty" | "error" | "loading";

export interface LocationSuggestionPanelState {
	canSearch: boolean;
	message: LocationSuggestionPanelMessage | null;
	shouldShowPanel: boolean;
	trimmedValue: string;
}

export const getLocationSuggestionPanelState = ({
	hasSearched,
	isFocused,
	selectedSuggestionValue,
	status,
	suggestionCount,
	value,
}: {
	hasSearched: boolean;
	isFocused: boolean;
	selectedSuggestionValue: string | null;
	status: LocationSuggestionStatus;
	suggestionCount: number;
	value: string;
}): LocationSuggestionPanelState => {
	const trimmedValue = value.trim();
	const canSearch =
		trimmedValue.length >= minimumLocationSuggestionQueryLength &&
		trimmedValue !== selectedSuggestionValue;
	const hasSuggestions = suggestionCount > 0;
	const shouldShowPanel =
		isFocused &&
		canSearch &&
		(hasSuggestions ||
			status === "loading" ||
			status === "error" ||
			hasSearched);
	let message: LocationSuggestionPanelMessage | null = null;

	if (status === "loading") {
		message = "loading";
	} else if (status === "error") {
		message = "error";
	} else if (hasSearched && !hasSuggestions) {
		message = "empty";
	}

	return {
		canSearch,
		message,
		shouldShowPanel,
		trimmedValue,
	};
};
