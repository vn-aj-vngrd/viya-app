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
	limit: number;
	text: string;
}

interface FetchGeoapifyLocationSuggestionsOptions
	extends GeoapifyAutocompleteUrlOptions {
	fetcher?: typeof fetch;
}

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

export const getGeoapifyAutocompleteUrl = ({
	apiKey,
	limit,
	text,
}: GeoapifyAutocompleteUrlOptions) => {
	const searchParams = new URLSearchParams();
	searchParams.append("text", text.trim());
	searchParams.append("limit", String(limit));
	searchParams.append("lang", "en");
	searchParams.append("apiKey", apiKey);

	return `${geoapifyAutocompleteBaseUrl}?${searchParams.toString()}`;
};

export const fetchGeoapifyLocationSuggestions = async ({
	apiKey,
	fetcher = fetch,
	limit,
	text,
}: FetchGeoapifyLocationSuggestionsOptions) => {
	const trimmedText = text.trim();

	if (
		!apiKey.trim() ||
		trimmedText.length < minimumLocationSuggestionQueryLength
	) {
		return [];
	}

	const response = await fetcher(
		getGeoapifyAutocompleteUrl({ apiKey, limit, text: trimmedText }),
		{
			headers: { Accept: "application/json" },
		}
	);

	if (!response.ok) {
		throw new Error(
			`Geoapify autocomplete request failed with status ${response.status}.`
		);
	}

	return parseGeoapifyAutocompleteResponse(await response.json());
};
