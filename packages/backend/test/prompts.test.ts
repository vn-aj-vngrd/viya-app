import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildBudgetSuggestionPrompt,
	buildChatModeSystemPrompt,
	VIYA_SYSTEM_PROMPT,
} from "../convex/ai/prompts";

const travelGuidePattern = /travel guide/i;
const travelOnlyPattern = /travel-only/i;
const declinePattern = /decline/i;
const offTopicPattern = /off-topic/i;
const filipinoPattern = /Filipino/i;
const philippinePassportPattern = /Philippine passport/i;
const pesoPattern = /peso/i;
const taglishPattern = /Taglish/i;
const currentDatePattern = /Current date: 2026-05-26/i;
const noPastDatesPattern = /Do not suggest past dates/i;
const userPicksDatesPattern = /let the user pick or type dates/i;
const tripBlueprintPattern = /## Trip Blueprint/i;
const budgetAllocationPattern = /### Budget allocation/i;
const bookingTargetsPattern = /### Booking targets/i;
const nextActionsPattern = /### Next actions/i;
const blueprintNowPattern = /Generate a Trip Blueprint now/i;
const assumptionPattern = /assumptions/i;
const needsConfirmationPattern = /needs confirmation/i;
const oneQuestionPattern = /Ask at most one direct question/i;
const noSelfAnswerPattern = /do not answer the question yourself/i;
const noLaterIntakeQuestionPattern = /Never include Question N\+1/i;
const preferenceContext = [
	"Traveler preference context:",
	"- Travel style: relaxed",
	"- Pace: slow",
	"- Budget comfort: budget",
].join("\n");
const preferenceContextPattern = /Traveler preference context:/i;
const relaxedStylePattern = /Travel style: relaxed/i;
const tripContext = "Current trip: Palawan family beach trip.";
const tripContextPattern = /Current trip: Palawan family beach trip/i;
const budgetSuggestionModePattern = /Mode: Budget suggestion/i;
const budgetSuggestionAmountPattern = /Heuristic budget estimate: PHP 19000/i;
const budgetSuggestionCurrencyPattern = /Return one PHP budget amount/i;

describe("Viya prompt guardrails", () => {
	it("keeps the base agent focused on travel only", () => {
		assert.match(VIYA_SYSTEM_PROMPT, travelGuidePattern);
		assert.match(VIYA_SYSTEM_PROMPT, travelOnlyPattern);
		assert.match(VIYA_SYSTEM_PROMPT, declinePattern);
		assert.match(VIYA_SYSTEM_PROMPT, offTopicPattern);
	});

	it("caters responses to Filipino travelers", () => {
		assert.match(VIYA_SYSTEM_PROMPT, filipinoPattern);
		assert.match(VIYA_SYSTEM_PROMPT, philippinePassportPattern);
		assert.match(VIYA_SYSTEM_PROMPT, pesoPattern);
		assert.match(VIYA_SYSTEM_PROMPT, taglishPattern);
	});

	it("preserves travel-only guardrails in plan mode prompts", () => {
		const prompt = buildChatModeSystemPrompt("plan");

		assert.match(prompt, travelOnlyPattern);
		assert.match(prompt, offTopicPattern);
	});

	it("limits every assistant response to one question", () => {
		const prompt = buildChatModeSystemPrompt("trip");

		assert.match(prompt, oneQuestionPattern);
		assert.match(prompt, noSelfAnswerPattern);
	});

	it("adds runtime date context and prevents stale date suggestions", () => {
		const prompt = buildChatModeSystemPrompt("plan", undefined, {
			now: new Date("2026-05-26T08:00:00.000Z"),
		});

		assert.match(prompt, currentDatePattern);
		assert.match(prompt, noPastDatesPattern);
		assert.match(prompt, userPicksDatesPattern);
	});

	it("instructs plan mode to generate a reviewable trip blueprint", () => {
		const prompt = buildChatModeSystemPrompt("plan");

		assert.match(prompt, tripBlueprintPattern);
		assert.match(prompt, budgetAllocationPattern);
		assert.match(prompt, bookingTargetsPattern);
		assert.match(prompt, nextActionsPattern);
		assert.match(prompt, noLaterIntakeQuestionPattern);
	});

	it("allows users to request a blueprint before intake is complete", () => {
		const prompt = buildChatModeSystemPrompt("plan");

		assert.match(prompt, blueprintNowPattern);
		assert.match(prompt, assumptionPattern);
		assert.match(prompt, needsConfirmationPattern);
	});

	it("includes preference context in plan mode prompts", () => {
		const prompt = buildChatModeSystemPrompt("plan", undefined, undefined, {
			preferenceContext,
		});

		assert.match(prompt, preferenceContextPattern);
		assert.match(prompt, relaxedStylePattern);
	});

	it("keeps preference context separate from trip context in trip mode", () => {
		const prompt = buildChatModeSystemPrompt("trip", tripContext, undefined, {
			preferenceContext,
		});

		assert.match(prompt, preferenceContextPattern);
		assert.match(prompt, relaxedStylePattern);
		assert.match(prompt, tripContextPattern);
		assert.ok(prompt.indexOf(preferenceContext) < prompt.indexOf(tripContext));
	});

	it("builds a constrained AI prompt for budget suggestions", () => {
		const prompt = buildBudgetSuggestionPrompt(
			JSON.stringify({ destination: "Boracay", travelerCount: 2 }),
			19_000
		);

		assert.match(prompt, budgetSuggestionModePattern);
		assert.match(prompt, budgetSuggestionAmountPattern);
		assert.match(prompt, budgetSuggestionCurrencyPattern);
	});
});
