import {
	budgetSuggestionSchema,
	detectedRisksSchema,
	generatedItinerarySchema,
	readinessAiOutputSchema,
	vaultExtractionSchema,
	wrappedSummarySchema,
} from "@viya-app/domain";
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";
import { generateObject } from "ai";
import { v } from "convex/values";
import { getSingaporeDemoVaultExtraction } from "../../src/ai/singapore-demo-fixtures";
import { action } from "../_generated/server";
import {
	fallbackItinerary,
	fallbackReadiness,
	fallbackRisks,
	fallbackVaultExtraction,
	fallbackWrapped,
} from "./fallbacks";
import {
	buildBudgetSuggestionPrompt,
	buildItineraryPrompt,
	buildReadinessPrompt,
	buildRiskPrompt,
	buildVaultExtractionPrompt,
	buildWrappedPrompt,
} from "./prompts";

import { getLanguageModel, hasConfiguredAiProvider } from "./provider";
import { generateStructuredObject } from "./structured";

const getDemoTripContext = () => JSON.stringify(palawanDemoTrip);
const budgetRoundingIncrement = 1000;
const minimumBudgetSuggestion = 3000;

const normalizeBudgetSuggestionAmount = (
	amount: number,
	fallbackAmount: number
) => {
	if (!(Number.isFinite(amount) && amount > 0)) {
		return fallbackAmount;
	}

	const roundedAmount =
		Math.round(amount / budgetRoundingIncrement) * budgetRoundingIncrement;

	return Math.max(minimumBudgetSuggestion, roundedAmount);
};

export const generateBudgetSuggestion = action({
	args: {
		budgetScope: v.string(),
		budgetStrictness: v.string(),
		destination: v.string(),
		durationPreference: v.optional(v.string()),
		endDate: v.string(),
		heuristicAmount: v.number(),
		pace: v.string(),
		startDate: v.string(),
		styles: v.array(v.string()),
		travelerCount: v.string(),
		travelerType: v.string(),
	},
	handler: async (_ctx, args) => {
		const fallbackSuggestion = {
			amount: normalizeBudgetSuggestionAmount(
				args.heuristicAmount,
				args.heuristicAmount
			),
			rationale: "Estimated from your previous answers.",
			source: "fallback" as const,
		};

		if (!hasConfiguredAiProvider()) {
			return fallbackSuggestion;
		}

		try {
			const tripContext = JSON.stringify({
				budgetScope: args.budgetScope,
				budgetStrictness: args.budgetStrictness,
				destination: args.destination,
				durationPreference: args.durationPreference,
				endDate: args.endDate,
				pace: args.pace,
				startDate: args.startDate,
				styles: args.styles,
				travelerCount: args.travelerCount,
				travelerType: args.travelerType,
			});
			const result = await generateObject({
				model: getLanguageModel("itinerary"),
				prompt: buildBudgetSuggestionPrompt(tripContext, args.heuristicAmount),
				schema: budgetSuggestionSchema,
				schemaName: "BudgetSuggestion",
			});

			return {
				amount: normalizeBudgetSuggestionAmount(
					result.object.amount,
					fallbackSuggestion.amount
				),
				rationale: result.object.rationale,
				source: "ai" as const,
			};
		} catch {
			return fallbackSuggestion;
		}
	},
});

export const generateItineraryDraft = action({
	args: {
		tripId: v.string(),
		useFallback: v.optional(v.boolean()),
	},
	handler: async (_ctx, args) => {
		if (args.useFallback) {
			return fallbackItinerary;
		}

		return await generateStructuredObject({
			fallback: fallbackItinerary,
			model: getLanguageModel("itinerary"),
			prompt: buildItineraryPrompt(getDemoTripContext()),
			schema: generatedItinerarySchema,
			schemaName: "GeneratedItinerary",
		});
	},
});

export const analyzeReadinessDraft = action({
	args: {
		tripId: v.string(),
		useFallback: v.optional(v.boolean()),
	},
	handler: async (_ctx, args) => {
		if (args.useFallback) {
			return fallbackReadiness;
		}

		return await generateStructuredObject({
			fallback: fallbackReadiness,
			model: getLanguageModel("readiness"),
			prompt: buildReadinessPrompt(getDemoTripContext()),
			schema: readinessAiOutputSchema,
			schemaName: "ReadinessAnalysis",
		});
	},
});

export const detectRisksDraft = action({
	args: {
		tripId: v.string(),
		useFallback: v.optional(v.boolean()),
	},
	handler: async (_ctx, args) => {
		if (args.useFallback) {
			return fallbackRisks;
		}

		return await generateStructuredObject({
			fallback: fallbackRisks,
			model: getLanguageModel("risk"),
			prompt: buildRiskPrompt(getDemoTripContext()),
			schema: detectedRisksSchema,
			schemaName: "DetectedRisks",
		});
	},
});

export const generateWrappedDraft = action({
	args: {
		tripId: v.string(),
		useFallback: v.optional(v.boolean()),
	},
	handler: async (_ctx, args) => {
		if (args.useFallback) {
			return fallbackWrapped;
		}

		return await generateStructuredObject({
			fallback: fallbackWrapped,
			model: getLanguageModel("wrapped"),
			prompt: buildWrappedPrompt(getDemoTripContext()),
			schema: wrappedSummarySchema,
			schemaName: "WrappedSummary",
		});
	},
});

export const extractVaultItemDraft = action({
	args: {
		fileName: v.string(),
		fileSize: v.optional(v.number()),
		kind: v.optional(v.string()),
		mimeType: v.string(),
		pastedText: v.optional(v.string()),
		storageId: v.optional(v.id("_storage")),
		title: v.string(),
		tripId: v.optional(v.id("trips")),
		useFallback: v.optional(v.boolean()),
	},
	handler: async (_ctx, args) => {
		const fixtureExtraction = getSingaporeDemoVaultExtraction(args.fileName);

		if (fixtureExtraction) {
			return fixtureExtraction;
		}

		if (args.useFallback) {
			return fallbackVaultExtraction;
		}

		const vaultContext = JSON.stringify({
			fileName: args.fileName,
			fileSize: args.fileSize,
			kind: args.kind,
			mimeType: args.mimeType,
			pastedText: args.pastedText,
			storageId: args.storageId,
			title: args.title,
			tripId: args.tripId,
		});

		return await generateStructuredObject({
			fallback: fallbackVaultExtraction,
			model: getLanguageModel("vault"),
			prompt: buildVaultExtractionPrompt(vaultContext),
			schema: vaultExtractionSchema,
			schemaName: "VaultExtraction",
		});
	},
});
