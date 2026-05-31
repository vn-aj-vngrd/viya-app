import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getComposerInputLayout } from "./viya-chat-composer";
import {
	CHAT_MODE_OPTIONS,
	SLASH_COMMAND_OPTIONS,
} from "./viya-chat-constants";
import {
	extractTripBlueprint,
	getPromptSuggestions,
	getSelectableTripContexts,
	getSelectedTripContext,
	getTripBlueprintCreateInput,
	getVisibleSlashCommands,
} from "./viya-chat-utils";

const readFeatureFile = (path: string) =>
	readFileSync(new URL(path, import.meta.url), "utf8");

describe("getComposerInputLayout", () => {
	test("clamps input height and enables scrolling when content overflows", () => {
		const layout = getComposerInputLayout({
			contentHeight: 180,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(132);
		expect(layout.isScrollable).toBe(true);
		expect(layout.shouldShowExpand).toBe(true);
	});

	test("hides the expand affordance for drafts below max height", () => {
		const layout = getComposerInputLayout({
			contentHeight: 80,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(80);
		expect(layout.isScrollable).toBe(false);
		expect(layout.shouldShowExpand).toBe(false);
	});

	test("shows the expand affordance when the composer reaches max height", () => {
		const layout = getComposerInputLayout({
			contentHeight: 132,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(132);
		expect(layout.isScrollable).toBe(false);
		expect(layout.shouldShowExpand).toBe(true);
	});

	test("hides the expand affordance for an empty non-overflowing composer", () => {
		const layout = getComposerInputLayout({
			contentHeight: 44,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(44);
		expect(layout.isScrollable).toBe(false);
		expect(layout.shouldShowExpand).toBe(false);
	});
});

describe("Viya chat modes", () => {
	test("exposes only general chat in the general mode selector", () => {
		expect(CHAT_MODE_OPTIONS.map((option) => option.id)).toEqual(["chat"]);
		expect(SLASH_COMMAND_OPTIONS.map((option) => option.id)).toContain("chat");
		expect(SLASH_COMMAND_OPTIONS.map((option) => option.id)).not.toContain(
			"plan"
		);
	});

	test("hides planning slash commands when trip mode is locked", () => {
		const commands = getVisibleSlashCommands(
			{ endIndex: 1, query: "", startIndex: 0 },
			"trip"
		);

		expect(commands.map((command) => command.id)).toContain("vault");
		expect(commands.map((command) => command.id)).toContain("budget");
		expect(commands.map((command) => command.id)).toContain("new");
		expect(commands.map((command) => command.id)).not.toContain("chat");
		expect(commands.map((command) => command.id)).not.toContain("plan");
		expect(commands.map((command) => command.id)).not.toContain("ask");
	});

	test("prioritizes trip-scoped suggestions for the active workspace module", () => {
		const suggestions = getPromptSuggestions("trip", [], {
			destination: "Japan",
			title: "Japan Trip",
			workspaceTab: "budget",
		});

		expect(suggestions[0]?.title).toBe("Sync budget");
		expect(suggestions[0]?.prompt).toContain("Japan Trip");
		expect(suggestions[0]?.prompt).toContain("booked costs");
	});

	test("puts Generate itinerary first for itinerary workspace suggestions", () => {
		const suggestions = getPromptSuggestions("trip", [], {
			destination: "Japan",
			title: "Japan Trip",
			workspaceTab: "itinerary",
		});

		expect(suggestions[0]?.title).toBe("Generate itinerary");
		expect(suggestions[0]?.prompt).toContain(
			"one natural whole-day plan for each trip date"
		);
		expect(suggestions.map((suggestion) => suggestion.title)).not.toContain(
			"Build itinerary"
		);
	});

	test("maps readiness workspace suggestions from the legacy checklist tab", () => {
		const suggestions = getPromptSuggestions("trip", [], {
			destination: "Japan",
			title: "Japan Trip",
			workspaceTab: "checklist",
		});

		expect(suggestions[0]?.title).toBe("Complete readiness");
		expect(suggestions[0]?.prompt).toContain("Japan Trip");
		expect(suggestions[0]?.prompt).toContain("open checklist items");
	});

	test("keeps module AI generation in trip chat actions", () => {
		const source = readFeatureFile("./viya-chat-screen.tsx");

		expect(source).toContain("generateTripAgentDraft");
		expect(source).toContain("applyTripAgentDraft");
		expect(source).toContain("Generate itinerary");
		expect(source).toContain("5 to 6 timed stops on full days");
		expect(source).toContain("Sync budget");
		expect(source).toContain("Complete readiness");
		expect(source).toContain("Upload files");
		expect(source).toContain("actionSuggestion");
		expect(source).not.toContain("Create trip");
	});
});

describe("Trip context selection", () => {
	const trips = [
		{ _id: "demo-trip", destination: "Demo", isDemo: true },
		{ _id: "palawan-trip", destination: "Palawan", isDemo: false },
		{ _id: "tokyo-trip", destination: "Tokyo", isDemo: false },
	];

	test("filters demo trips from selectable trip contexts", () => {
		expect(getSelectableTripContexts(trips).map((trip) => trip._id)).toEqual([
			"palawan-trip",
			"tokyo-trip",
		]);
	});

	test("uses the selected trip context when it is selectable", () => {
		expect(getSelectedTripContext(trips, "tokyo-trip")?._id).toBe("tokyo-trip");
	});

	test("falls back to the first selectable trip context", () => {
		expect(getSelectedTripContext(trips, "missing-trip")?._id).toBe(
			"palawan-trip"
		);
	});
});

test("extracts the lifecycle Trip Blueprint sections", () => {
	const blueprint = extractTripBlueprint(`
## Trip Blueprint
### Destination
- El Nido
### Route
- Manila -> Puerto Princesa -> El Nido
### Dates
- 2026-07-10 to 2026-07-14
### Travelers
- Couple, 2 travelers
### Budget allocation
- PHP 25000 total
### Pace
- Balanced
### Itinerary style
- Balanced beach trip
### Booking targets
- Book flight externally
### Requirements
- Valid ID
### Risks
- Rainy season buffer
### Next actions
- Compare flight apps
`);

	expect(blueprint?.sections.map((section) => section.id)).toEqual([
		"destination",
		"route",
		"dates",
		"travelers",
		"budget",
		"pace",
		"itineraryStyle",
		"bookingTargets",
		"requirements",
		"risks",
		"nextActions",
	]);
	if (!blueprint) {
		throw new Error("Expected Trip Blueprint to parse.");
	}
	const input = getTripBlueprintCreateInput(blueprint);

	expect(input.destination).toBe("El Nido");
	expect(input.travelers).toEqual(["Couple, 2 travelers"]);
	expect(input.pace).toEqual(["Balanced"]);
});
