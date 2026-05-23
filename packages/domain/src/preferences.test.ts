import { describe, expect, it } from "vitest";

import {
	defaultUserPreferences,
	formatPreferenceContext,
	getPreferenceSuggestions,
} from "./preferences";
import type { UserPreferences } from "./types";

describe("getPreferenceSuggestions", () => {
	it("creates slower beach suggestions for relaxed beach travelers", () => {
		const suggestions = getPreferenceSuggestions({
			...defaultUserPreferences,
			interests: ["beaches"],
			pacePreference: "slow",
			travelStyle: "relaxed",
		});
		const [primaryPrompt] = suggestions.prompts;

		expect(suggestions.home.title).toBe("Plan a slower beach escape");
		expect(suggestions.home.subtitle).toContain("room for rest");
		expect(primaryPrompt?.prompt).toContain("slow beach trip");
	});

	it("creates denser discovery suggestions for fast food and hidden-gem travelers", () => {
		const suggestions = getPreferenceSuggestions({
			...defaultUserPreferences,
			foodPreference: "localEats",
			interests: ["food", "hiddenGems"],
			pacePreference: "fast",
			travelStyle: "adventure",
		});
		const [primaryPrompt] = suggestions.prompts;

		expect(suggestions.home.title).toBe("Build a fast local discovery plan");
		expect(suggestions.home.subtitle).toContain("food stops");
		expect(primaryPrompt?.prompt).toContain("hidden gems");
	});

	it("changes wording for risk-focused planning style", () => {
		const suggestions = getPreferenceSuggestions({
			...defaultUserPreferences,
			planningStyle: "flagRisks",
		});
		const [primaryPrompt] = suggestions.prompts;

		expect(suggestions.home.title).toBe("Check the smartest next risk");
		expect(primaryPrompt?.prompt).toContain("readiness risks");
	});

	it("falls back to balanced defaults for incomplete preference records", () => {
		const suggestions = getPreferenceSuggestions({
			travelStyle: "balanced",
		} as Partial<UserPreferences>);

		expect(suggestions.home.title).toBe("Shape a balanced trip plan");
		expect(suggestions.prompts).toHaveLength(4);
	});
});

describe("formatPreferenceContext", () => {
	it("formats preference context without treating it as confirmed trip data", () => {
		const context = formatPreferenceContext({
			...defaultUserPreferences,
			interests: ["beaches", "food"],
			specialNeeds: ["restBreaks"],
			travelStyle: "relaxed",
		});

		expect(context).toContain("Travel style: relaxed");
		expect(context).toContain("Interests: beaches, food");
		expect(context).toContain("Use these as defaults");
		expect(context).toContain("do not invent actual bookings");
	});
});
