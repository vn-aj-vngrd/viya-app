import { ConvexError, v } from "convex/values";
import {
	fetchGeoapifyLocationSuggestions,
	minimumLocationSuggestionQueryLength,
} from "../src/location-suggestions";
import { action } from "./_generated/server";

const locationSuggestionLimit = 5;
const maximumLocationQueryLength = 80;
const preferredCountryCode = "ph";
const locationSuggestionValidator = v.object({
	countryCode: v.optional(v.string()),
	details: v.optional(v.string()),
	id: v.string(),
	label: v.string(),
	latitude: v.optional(v.number()),
	longitude: v.optional(v.number()),
	value: v.string(),
});

export const searchLocationSuggestions = action({
	args: {
		text: v.string(),
	},
	returns: v.array(locationSuggestionValidator),
	handler: async (ctx, args) => {
		// Only signed-in travellers can spend the shared Geoapify quota.
		if (!(await ctx.auth.getUserIdentity())) {
			throw new ConvexError("AUTH_REQUIRED");
		}

		const trimmedText = args.text.trim().slice(0, maximumLocationQueryLength);

		if (trimmedText.length < minimumLocationSuggestionQueryLength) {
			return [];
		}

		const apiKey = process.env.GEOAPIFY_API_KEY?.trim() ?? "";

		// A missing key is a setup fault, so fail loudly and let the app show
		// its "suggestions unavailable" state instead of a silent empty list.
		if (!apiKey) {
			throw new ConvexError("LOCATION_SEARCH_NOT_CONFIGURED");
		}

		return await fetchGeoapifyLocationSuggestions({
			apiKey,
			limit: locationSuggestionLimit,
			preferredCountryCode,
			text: trimmedText,
		});
	},
});
