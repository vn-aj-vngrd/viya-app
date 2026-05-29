const wikipediaSummaryBaseUrl =
	"https://en.wikipedia.org/api/rest_v1/page/summary/";
const destinationImageRequestTimeoutMs = 1800;
const whitespacePattern = /\s+/g;
const commaSpacingPattern = /\s*,\s*/g;
const encodedSeparatorPattern = /_/g;

const usStateNamesByAbbreviation: Record<string, string> = {
	AK: "Alaska",
	AL: "Alabama",
	AR: "Arkansas",
	AZ: "Arizona",
	CA: "California",
	CO: "Colorado",
	CT: "Connecticut",
	DC: "District of Columbia",
	DE: "Delaware",
	FL: "Florida",
	GA: "Georgia",
	HI: "Hawaii",
	IA: "Iowa",
	ID: "Idaho",
	IL: "Illinois",
	IN: "Indiana",
	KS: "Kansas",
	KY: "Kentucky",
	LA: "Louisiana",
	MA: "Massachusetts",
	MD: "Maryland",
	ME: "Maine",
	MI: "Michigan",
	MN: "Minnesota",
	MO: "Missouri",
	MS: "Mississippi",
	MT: "Montana",
	NC: "North Carolina",
	ND: "North Dakota",
	NE: "Nebraska",
	NH: "New Hampshire",
	NJ: "New Jersey",
	NM: "New Mexico",
	NV: "Nevada",
	NY: "New York",
	OH: "Ohio",
	OK: "Oklahoma",
	OR: "Oregon",
	PA: "Pennsylvania",
	RI: "Rhode Island",
	SC: "South Carolina",
	SD: "South Dakota",
	TN: "Tennessee",
	TX: "Texas",
	UT: "Utah",
	VA: "Virginia",
	VT: "Vermont",
	WA: "Washington",
	WI: "Wisconsin",
	WV: "West Virginia",
	WY: "Wyoming",
};

interface WikipediaSummaryResponse {
	originalimage?: {
		source?: unknown;
	};
	thumbnail?: {
		source?: unknown;
	};
}

const isHttpsUrl = (value: unknown): value is string =>
	typeof value === "string" && value.startsWith("https://");

const toWikipediaTitle = (value: string) =>
	value
		.trim()
		.replace(commaSpacingPattern, ",_")
		.replace(whitespacePattern, "_");

const addUniqueTitle = (titles: string[], title: string) => {
	if (title && !titles.includes(title)) {
		titles.push(title);
	}
};

const getUsStateName = (value: string) => {
	const normalizedValue = value.trim();
	const upperValue = normalizedValue.toUpperCase();

	return usStateNamesByAbbreviation[upperValue] ?? normalizedValue;
};

const safelyDecodeUrl = (url: string) => {
	try {
		return decodeURIComponent(url);
	} catch {
		return url;
	}
};

export const getDestinationImageSearchTitles = (destination: string) => {
	const cleanedDestination = destination.replace(whitespacePattern, " ").trim();
	const titles: string[] = [];

	if (!cleanedDestination) {
		return titles;
	}

	const parts = cleanedDestination
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const [primaryPlace, region] = parts;

	if (primaryPlace && region) {
		const regionName = getUsStateName(region);
		addUniqueTitle(titles, toWikipediaTitle(`${primaryPlace}, ${regionName}`));
		addUniqueTitle(titles, toWikipediaTitle(cleanedDestination));
		addUniqueTitle(titles, toWikipediaTitle(primaryPlace));
	} else {
		addUniqueTitle(titles, toWikipediaTitle(cleanedDestination));
	}

	if (primaryPlace) {
		addUniqueTitle(titles, `Tourism_in_${toWikipediaTitle(primaryPlace)}`);
		addUniqueTitle(titles, `Geography_of_${toWikipediaTitle(primaryPlace)}`);
	}

	return titles;
};

export const isDecorativeDestinationImageUrl = (url: string | undefined) => {
	if (!url) {
		return false;
	}

	const normalizedUrl = safelyDecodeUrl(url)
		.toLowerCase()
		.replace(encodedSeparatorPattern, " ");

	return (
		normalizedUrl.includes("flag of ") ||
		normalizedUrl.includes("coat of arms") ||
		normalizedUrl.includes("seal of ")
	);
};

/**
 * Resolve a representative photo for a destination (country, city, place)
 * from the Wikipedia REST summary API. Returns undefined on miss, timeout, or
 * network error so callers can fall back gracefully.
 */
export const fetchDestinationImageUrl = async (
	destination: string
): Promise<string | undefined> => {
	const searchTitles = getDestinationImageSearchTitles(destination);

	if (searchTitles.length === 0) {
		return;
	}

	const abortController = new AbortController();
	const timeoutId = setTimeout(() => {
		abortController.abort();
	}, destinationImageRequestTimeoutMs);

	try {
		for (const searchTitle of searchTitles) {
			const response = await fetch(
				`${wikipediaSummaryBaseUrl}${encodeURIComponent(searchTitle)}`,
				{ signal: abortController.signal }
			);

			if (!response.ok) {
				continue;
			}

			const data = (await response.json()) as WikipediaSummaryResponse;
			const imageUrl = data.thumbnail?.source ?? data.originalimage?.source;

			if (isHttpsUrl(imageUrl) && !isDecorativeDestinationImageUrl(imageUrl)) {
				return imageUrl;
			}
		}
	} catch {
		return;
	} finally {
		clearTimeout(timeoutId);
	}
};

/**
 * Backwards-compatible alias used by the trip creation flows.
 * @see fetchDestinationImageUrl
 */
export const fetchTripCoverImageUrl = fetchDestinationImageUrl;
