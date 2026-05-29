import { ConvexError, v } from "convex/values";
import {
	fetchGeoapifyLocationSuggestions,
	minimumLocationSuggestionQueryLength,
} from "../src/location-suggestions";
import { action } from "./_generated/server";

const locationSuggestionLimit = 5;
const locationSuggestionValidator = v.object({
	countryCode: v.optional(v.string()),
	details: v.optional(v.string()),
	id: v.string(),
	label: v.string(),
	value: v.string(),
});

export const searchLocationSuggestions = action({
	args: {
		text: v.string(),
	},
	returns: v.array(locationSuggestionValidator),
	handler: async (_ctx, args) => {
		const trimmedText = args.text.trim();

		if (trimmedText.length < minimumLocationSuggestionQueryLength) {
			return [];
		}

		const apiKey = process.env.GEOAPIFY_API_KEY?.trim();

		if (!apiKey) {
			throw new ConvexError("GEOAPIFY_API_KEY is not configured.");
		}

		return await fetchGeoapifyLocationSuggestions({
			apiKey,
			limit: locationSuggestionLimit,
			text: trimmedText,
		});
	},
});
