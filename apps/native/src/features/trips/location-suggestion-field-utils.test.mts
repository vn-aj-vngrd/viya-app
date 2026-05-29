import { describe, expect, test } from "bun:test";

import { getLocationSuggestionPanelState } from "./location-suggestion-field-utils";

describe("location suggestion panel state", () => {
	test("keeps the panel visible for an empty searched result", () => {
		expect(
			getLocationSuggestionPanelState({
				hasSearched: true,
				isFocused: true,
				selectedSuggestionValue: null,
				status: "idle",
				suggestionCount: 0,
				value: "Cuba",
			})
		).toMatchObject({
			canSearch: true,
			message: "empty",
			shouldShowPanel: true,
			trimmedValue: "Cuba",
		});
	});

	test("does not search when the input still matches the selected suggestion", () => {
		expect(
			getLocationSuggestionPanelState({
				hasSearched: true,
				isFocused: true,
				selectedSuggestionValue: "Cuba",
				status: "idle",
				suggestionCount: 0,
				value: "Cuba",
			})
		).toMatchObject({
			canSearch: false,
			shouldShowPanel: false,
		});
	});
});
