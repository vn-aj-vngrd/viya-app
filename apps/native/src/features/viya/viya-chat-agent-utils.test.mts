import { describe, expect, test } from "bun:test";

import {
	getAssistantActivityLabel,
	getDraftReadyCount,
	getReviewDraftsNavigation,
	getToolActivityLabel,
} from "./viya-chat-utils";

const savedDraft = (draftId: string) => ({
	output: { draftId, ok: true },
	state: "output-available",
	type: "tool-proposeItineraryChanges",
});

describe("draft ready count", () => {
	test("counts each saved draft once and ignores rejected or running calls", () => {
		expect(
			getDraftReadyCount({
				parts: [
					savedDraft("d1"),
					savedDraft("d1"),
					savedDraft("d2"),
					{
						output: { errors: ["overlap"], ok: false },
						state: "output-available",
						type: "tool-proposeBudget",
					},
					{ state: "input-available", type: "tool-proposeRisks" },
					{
						output: { draftId: "x" },
						state: "output-available",
						type: "tool-getItinerary",
					},
				],
			})
		).toBe(2);
	});
});

describe("assistant activity row", () => {
	test("names the tool Viya is running", () => {
		expect(getToolActivityLabel("tool-getItinerary")).toBe(
			"Checking your itinerary"
		);
		expect(getToolActivityLabel("tool-proposeTripProfileChanges")).toBe(
			"Drafting changes"
		);
		expect(getToolActivityLabel("tool-somethingNew")).toBe("Thinking");
	});

	test("shows the tool label even after earlier text in the same reply", () => {
		expect(
			getAssistantActivityLabel({
				isAwaitingReply: false,
				messages: [
					{ role: "user" },
					{
						parts: [
							{ type: "text", text: "Let me check." },
							{ state: "input-available", type: "tool-getBudgetSummary" },
						],
						role: "assistant",
						status: "streaming",
					},
				],
			})
		).toBe("Checking your budget");
	});

	test("shows Thinking while waiting and nothing once text streams or the reply ends", () => {
		expect(
			getAssistantActivityLabel({ isAwaitingReply: true, messages: [] })
		).toBe("Thinking");
		expect(
			getAssistantActivityLabel({
				isAwaitingReply: false,
				messages: [
					{
						parts: [{ type: "text", text: "Here is" }],
						role: "assistant",
						status: "streaming",
					},
				],
			})
		).toBeNull();
		expect(
			getAssistantActivityLabel({
				isAwaitingReply: false,
				messages: [
					{
						parts: [{ state: "output-available", type: "tool-getRisks" }],
						role: "assistant",
						status: "success",
					},
				],
			})
		).toBeNull();
	});
});

describe("review drafts navigation", () => {
	test("goes back to the trip dashboard the chat was opened from", () => {
		expect(
			getReviewDraftsNavigation({
				canGoBack: true,
				returnTo: "/(app)/trips/trip_1",
				tripId: "trip_1",
			})
		).toBe("dismissTo");
	});

	test("pushes the dashboard when the chat came from elsewhere", () => {
		expect(
			getReviewDraftsNavigation({
				canGoBack: true,
				returnTo: "/(app)/trips/trip_1/itinerary",
				tripId: "trip_1",
			})
		).toBe("push");
		expect(
			getReviewDraftsNavigation({
				canGoBack: false,
				returnTo: "/(app)/trips/trip_1",
				tripId: "trip_1",
			})
		).toBe("push");
	});
});
