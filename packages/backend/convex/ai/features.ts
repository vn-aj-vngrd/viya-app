import {
	detectedRisksSchema,
	generatedItinerarySchema,
	readinessAiOutputSchema,
	vaultExtractionSchema,
	wrappedSummarySchema,
} from "@viya-app/domain";
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";
import { v } from "convex/values";

import { action } from "../_generated/server";
import {
	fallbackItinerary,
	fallbackReadiness,
	fallbackRisks,
	fallbackVaultExtraction,
	fallbackWrapped,
} from "./fallbacks";
import {
	buildItineraryPrompt,
	buildReadinessPrompt,
	buildRiskPrompt,
	buildVaultExtractionPrompt,
	buildWrappedPrompt,
} from "./prompts";
import { getLanguageModel } from "./provider";
import { generateStructuredObject } from "./structured";

const getDemoTripContext = () => JSON.stringify(palawanDemoTrip);

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
