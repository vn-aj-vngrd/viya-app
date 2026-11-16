const geoapifyAutocompleteBaseUrl =
	"https://api.geoapify.com/v1/geocode/autocomplete";

export const minimumLocationSuggestionQueryLength = 2;

export interface LocationSuggestion {
	countryCode?: string;
	details?: string;
	id: string;
	label: string;
	latitude?: number;
	longitude?: number;
	value: string;
}

interface GeoapifyAutocompleteUrlOptions {
	apiKey: string;
	/** Restrict results to one country (ISO alpha-2), for example "ph". */
	countryFilter?: string;
	limit: number;
	text: string;
}

interface FetchGeoapifyLocationSuggestionsOptions
	extends Omit<GeoapifyAutocompleteUrlOptions, "countryFilter"> {
	fetcher?: typeof fetch;
	/**
	 * Search this country first and fall back to a global search when it
	 * returns nothing. Results from this country always sort first.
	 */
	preferredCountryCode?: string;
}

/** Lower is better: towns and cities lead, street-level and POI results trail. */
const resultTypeRank: Record<string, number> = {
	city: 0,
	county: 2,
	district: 1,
	locality: 0,
	state: 2,
	suburb: 1,
};
const OTHER_RESULT_TYPE_RANK = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getString = (record: Record<string, unknown>, key: string) => {
	const value = record[key];

	return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getNumber = (record: Record<string, unknown>, key: string) => {
	const value = record[key];

	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
};

const getGeometryCoordinate = (
	feature: Record<string, unknown>,
	index: number
) => {
	if (
		!(isRecord(feature.geometry) && Array.isArray(feature.geometry.coordinates))
	) {
		return;
	}

	const value = feature.geometry.coordinates[index];

	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
};

const getSuggestionDetails = (properties: Record<string, unknown>) => {
	const addressLine2 = getString(properties, "address_line2");

	if (addressLine2) {
		return addressLine2;
	}

	const label = getString(properties, "address_line1");
	const detailParts = [
		getString(properties, "city"),
		getString(properties, "state"),
		getString(properties, "country"),
	].filter((part) => part && part !== label);

	return detailParts.length ? detailParts.join(", ") : undefined;
};

const parseGeoapifyFeature = (
	feature: unknown
): LocationSuggestion | undefined => {
	if (!(isRecord(feature) && isRecord(feature.properties))) {
		return;
	}

	const formatted = getString(feature.properties, "formatted");

	if (!formatted) {
		return;
	}

	const label =
		getString(feature.properties, "address_line1") ??
		getString(feature.properties, "city") ??
		getString(feature.properties, "name") ??
		formatted;
	const countryCode = getString(
		feature.properties,
		"country_code"
	)?.toUpperCase();
	const longitude =
		getNumber(feature.properties, "lon") ?? getGeometryCoordinate(feature, 0);
	const latitude =
		getNumber(feature.properties, "lat") ?? getGeometryCoordinate(feature, 1);

	return {
		countryCode,
		details: getSuggestionDetails(feature.properties),
		id: getString(feature.properties, "place_id") ?? formatted,
		label,
		...(latitude === undefined ? {} : { latitude }),
		...(longitude === undefined ? {} : { longitude }),
		value: formatted,
	};
};

export const parseGeoapifyAutocompleteResponse = (
	response: unknown
): LocationSuggestion[] => {
	if (!(isRecord(response) && Array.isArray(response.features))) {
		return [];
	}

	return response.features
		.map(parseGeoapifyFeature)
		.filter((suggestion): suggestion is LocationSuggestion =>
			Boolean(suggestion)
		);
};

const getResultTypeRank = (feature: unknown) => {
	if (!(isRecord(feature) && isRecord(feature.properties))) {
		return OTHER_RESULT_TYPE_RANK;
	}

	const resultType = getString(feature.properties, "result_type");

	return (
		(resultType ? resultTypeRank[resultType] : undefined) ??
		OTHER_RESULT_TYPE_RANK
	);
};

/**
 * Parse and order autocomplete results: preferred country first, then
 * cities and localities ahead of streets and venues. Keeps API order otherwise.
 */
export const parseRankedGeoapifyResponse = (
	response: unknown,
	preferredCountryCode?: string
): LocationSuggestion[] => {
	if (!(isRecord(response) && Array.isArray(response.features))) {
		return [];
	}

	const preferred = preferredCountryCode?.toUpperCase();
	const ranked: {
		index: number;
		rank: number;
		suggestion: LocationSuggestion;
	}[] = [];

	for (const [index, feature] of response.features.entries()) {
		const suggestion = parseGeoapifyFeature(feature);

		if (suggestion) {
			const countryRank =
				preferred && suggestion.countryCode !== preferred ? 10 : 0;
			ranked.push({
				index,
				rank: countryRank + getResultTypeRank(feature),
				suggestion,
			});
		}
	}

	return ranked
		.sort(
			(first, second) => first.rank - second.rank || first.index - second.index
		)
		.map(({ suggestion }) => suggestion);
};

export const getGeoapifyAutocompleteUrl = ({
	apiKey,
	countryFilter,
	limit,
	text,
}: GeoapifyAutocompleteUrlOptions) => {
	const searchParams = new URLSearchParams();
	searchParams.append("text", text.trim());
	searchParams.append("limit", String(limit));
	searchParams.append("lang", "en");
	if (countryFilter) {
		const code = countryFilter.toLowerCase();
		searchParams.append("filter", `countrycode:${code}`);
		searchParams.append("bias", `countrycode:${code}`);
	}
	searchParams.append("apiKey", apiKey);

	return `${geoapifyAutocompleteBaseUrl}?${searchParams.toString()}`;
};

const requestGeoapify = async (
	fetcher: typeof fetch,
	options: GeoapifyAutocompleteUrlOptions
) => {
	const response = await fetcher(getGeoapifyAutocompleteUrl(options), {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error(
			`Geoapify autocomplete request failed with status ${response.status}.`
		);
	}

	return await response.json();
};

export const fetchGeoapifyLocationSuggestions = async ({
	apiKey,
	fetcher = fetch,
	limit,
	preferredCountryCode,
	text,
}: FetchGeoapifyLocationSuggestionsOptions) => {
	const trimmedText = text.trim();

	if (
		!apiKey.trim() ||
		trimmedText.length < minimumLocationSuggestionQueryLength
	) {
		return [];
	}

	if (preferredCountryCode) {
		const local = parseRankedGeoapifyResponse(
			await requestGeoapify(fetcher, {
				apiKey,
				countryFilter: preferredCountryCode,
				limit,
				text: trimmedText,
			}),
			preferredCountryCode
		);

		if (local.length > 0) {
			return local;
		}
	}

	return parseRankedGeoapifyResponse(
		await requestGeoapify(fetcher, { apiKey, limit, text: trimmedText }),
		preferredCountryCode
	);
};
