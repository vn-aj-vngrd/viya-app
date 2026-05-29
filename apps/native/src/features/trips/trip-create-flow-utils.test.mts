import { describe, expect, test } from "bun:test";

import {
	createInitialTripCreateFlowState,
	getCreateTripPayload,
	getCreateTripReviewRows,
	getStepError,
	getTripCreateSummary,
	parseBudgetAmount,
	type TripStyle,
} from "./trip-create-flow-utils";

describe("trip create flow validation", () => {
	test("requires destination before continuing", () => {
		const state = createInitialTripCreateFlowState();

		expect(getStepError(state, "destination")).toBe("Choose a destination.");
	});

	test("requires either dates or a duration preference", () => {
		const state = {
			...createInitialTripCreateFlowState(),
			destination: "Tokyo",
		};

		expect(getStepError(state, "dates")).toBe("Choose dates or a trip length.");
	});

	test("keeps solo trips to one traveler", () => {
		const state = {
			...createInitialTripCreateFlowState(),
			travelerCount: "2",
			travelerType: "solo" as const,
		};

		expect(getStepError(state, "travelers")).toBe(
			"Solo trips are set to 1 traveler."
		);
	});

	test("keeps couple trips to two travelers", () => {
		const state = {
			...createInitialTripCreateFlowState(),
			travelerCount: "3",
			travelerType: "couple" as const,
		};

		expect(getStepError(state, "travelers")).toBe(
			"Couple trips are set to 2 travelers."
		);
	});

	test("requires a budget greater than zero", () => {
		const state = createInitialTripCreateFlowState();

		expect(state.budgetAmount).toBe("0");
		expect(getStepError(state, "budget")).toBe(
			"Enter a budget greater than 0."
		);
	});
});

describe("trip create flow payload", () => {
	test("parses comma-separated budget values", () => {
		expect(parseBudgetAmount("60,000")).toBe(60_000);
		expect(parseBudgetAmount("abc")).toBeUndefined();
	});

	test("maps Viya answers into createTrip payload", () => {
		const state = {
			...createInitialTripCreateFlowState(),
			budgetAmount: "60,000",
			budgetScope: "total" as const,
			budgetStrictness: "moderate" as const,
			destination: "Hong Kong",
			endDate: "2026-06-15",
			mustHaves: "Disneyland, Mong Kok shopping",
			pace: "balanced" as const,
			startDate: "2026-06-10",
			styles: ["food", "shopping", "themeParks"] as TripStyle[],
			travelerCount: "2",
			travelerType: "couple" as const,
		};

		expect(getCreateTripPayload(state)).toMatchObject({
			budgetAmount: 60_000,
			budgetCurrency: "PHP",
			destination: "Hong Kong",
			endDate: "2026-06-15",
			groupType: "couple",
			startDate: "2026-06-10",
			title: "Hong Kong Trip",
			travelStyle: "food, shopping, theme parks",
		});
	});

	test("summarizes selected context for Viya", () => {
		const state = {
			...createInitialTripCreateFlowState(),
			budgetAmount: "60000",
			budgetStrictness: "strict" as const,
			destination: "Hong Kong",
			durationPreference: "5-7-days" as const,
			mustHaves: "Disneyland",
			pastedBookingText: "Hotel near Mong Kok",
			styles: ["food", "shopping"] as TripStyle[],
			travelerCount: "2",
			travelerType: "friends" as const,
		};

		expect(getTripCreateSummary(state)).toContain("Mode: Guided trip setup.");
		expect(getTripCreateSummary(state)).toContain("Destination: Hong Kong.");
		expect(getTripCreateSummary(state)).toContain("Trip length: 5-7 days.");
		expect(getTripCreateSummary(state)).toContain("Budget: PHP 60,000");
		expect(getTripCreateSummary(state)).toContain(
			"Booking context: Hotel near Mong Kok."
		);
	});

	test("builds concise review rows", () => {
		const state = {
			...createInitialTripCreateFlowState(),
			destination: "Seoul",
			endDate: "2026-07-05",
			startDate: "2026-07-01",
			styles: ["culture", "nature"] as TripStyle[],
			travelerCount: "3",
			travelerType: "family" as const,
		};

		expect(getCreateTripReviewRows(state)).toEqual(
			expect.arrayContaining([
				{ label: "Destination", value: "Seoul" },
				{ label: "Travelers", value: "Family · 3 travelers" },
				{ label: "Style", value: "Culture, Nature" },
			])
		);
	});
});
