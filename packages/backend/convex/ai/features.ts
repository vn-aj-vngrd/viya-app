import {
	budgetSuggestionSchema,
	type VaultExtraction,
	vaultExtractionSchema,
} from "@viya-app/domain";
import { type FilePart, generateObject, type ImagePart } from "ai";
import { ConvexError, v } from "convex/values";
import { getSingaporeDemoVaultExtraction } from "../../src/ai/singapore-demo-fixtures";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type ActionCtx, action, internalQuery } from "../_generated/server";
import { fallbackVaultExtraction } from "./fallbacks";
import {
	buildBudgetSuggestionPrompt,
	buildVaultExtractionPrompt,
} from "./prompts";

import { getLanguageModel, hasConfiguredAiProvider } from "./provider";

const maxVaultTextChars = 20_000;
const maxVaultBinaryBytes = 8 * 1024 * 1024;
const textMimePattern = /^(text\/|application\/(json|xml|csv))/;

export type VaultExtractionSource = "ai" | "demo" | "fallback";
export type VaultExtractionResult = VaultExtraction & {
	/** Whether Viya read this file ("ai"), used a demo fixture, or a template. */
	source: VaultExtractionSource;
};
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
	handler: async (ctx, args) => {
		if (!(await ctx.auth.getUserIdentity())) {
			throw new ConvexError("AUTH_REQUIRED");
		}

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

export const getExtractionTrip = internalQuery({
	args: { ownerId: v.string(), tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== args.ownerId) {
			throw new ConvexError("TRIP_NOT_FOUND");
		}

		return {
			destination: trip.destination,
			endDate: trip.endDate,
			isDemo: trip.isDemo,
			startDate: trip.startDate,
			title: trip.title,
		};
	},
});

const readStoredFile = async (
	ctx: ActionCtx,
	storageId: Id<"_storage">,
	fallbackMimeType: string
): Promise<{
	content: (ImagePart | FilePart)[];
	text?: string;
} | null> => {
	const blob = await ctx.storage.get(storageId);

	if (!blob) {
		return null;
	}

	const mimeType = blob.type || fallbackMimeType;

	if (textMimePattern.test(mimeType)) {
		return {
			content: [],
			text: (await blob.text()).slice(0, maxVaultTextChars),
		};
	}

	if (blob.size > maxVaultBinaryBytes) {
		return null;
	}

	const data = new Uint8Array(await blob.arrayBuffer());

	if (mimeType.startsWith("image/")) {
		return { content: [{ image: data, mediaType: mimeType, type: "image" }] };
	}

	if (mimeType === "application/pdf") {
		return { content: [{ data, mediaType: mimeType, type: "file" }] };
	}

	return null;
};

const templateExtraction = (): VaultExtractionResult => ({
	...fallbackVaultExtraction,
	source: "fallback",
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
	handler: async (ctx, args): Promise<VaultExtractionResult> => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new ConvexError("AUTH_REQUIRED");
		}

		const trip = args.tripId
			? await ctx.runQuery(internal.ai.features.getExtractionTrip, {
					ownerId: identity.subject,
					tripId: args.tripId,
				})
			: null;

		// Fixture files are only honoured inside an explicit demo trip.
		const fixtureExtraction = trip?.isDemo
			? getSingaporeDemoVaultExtraction(args.fileName)
			: null;

		if (fixtureExtraction) {
			return { ...fixtureExtraction, source: "demo" };
		}

		if (args.useFallback || !hasConfiguredAiProvider()) {
			return templateExtraction();
		}

		const pastedText = args.pastedText?.trim().slice(0, maxVaultTextChars);
		const stored = args.storageId
			? await readStoredFile(ctx, args.storageId, args.mimeType)
			: null;
		const readFile = Boolean(stored);
		const content: (ImagePart | FilePart)[] = stored?.content ?? [];
		const fileText = stored?.text;

		if (!(readFile || pastedText)) {
			return templateExtraction();
		}

		const vaultContext = JSON.stringify({
			fileName: args.fileName,
			fileSize: args.fileSize,
			fileText,
			kind: args.kind,
			mimeType: args.mimeType,
			pastedText,
			title: args.title,
			trip,
		});

		try {
			const result = await generateObject({
				messages: [
					{
						content: [
							{
								text: buildVaultExtractionPrompt(vaultContext),
								type: "text",
							},
							...content,
						],
						role: "user",
					},
				],
				model: getLanguageModel("vault"),
				schema: vaultExtractionSchema,
				schemaName: "VaultExtraction",
			});

			return { ...result.object, source: "ai" };
		} catch (error) {
			console.error("Vault extraction failed", error);

			return templateExtraction();
		}
	},
});
