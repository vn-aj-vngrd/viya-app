const wikipediaSummaryBaseUrl =
	"https://en.wikipedia.org/api/rest_v1/page/summary/";
const destinationImageRequestTimeoutMs = 1800;
const whitespacePattern = /\s+/g;
const commaSpacingPattern = /\s*,\s*/g;
const encodedSeparatorPattern = /_/g;

const destinationImageUrlOverrides: Record<string, string> = {
	baguio:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Baguio_city_proper_overlooking_Burnham-Harrison_side_%28Baguio_city%3B_12-04-2022%29.jpg/330px-Baguio_city_proper_overlooking_Burnham-Harrison_side_%28Baguio_city%3B_12-04-2022%29.jpg",
	batanes:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Sabtang_Batanes.jpg/330px-Sabtang_Batanes.jpg",
	bohol:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Chocolate_Hills_Bohol_Philippines.jpg/330px-Chocolate_Hills_Bohol_Philippines.jpg",
	boracay:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Boracay_White_Beach.png/330px-Boracay_White_Beach.png",
	cebu: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Osme%C3%B1a_Peak%2C_Cebu%2C_Philippines.jpg/330px-Osme%C3%B1a_Peak%2C_Cebu%2C_Philippines.jpg",
	indonesia:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Pura_Taman_Ayun%2C_Bali%2C_Indonesia.jpg/330px-Pura_Taman_Ayun%2C_Bali%2C_Indonesia.jpg",
	japan:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Kiyomizu.jpg/330px-Kiyomizu.jpg",
	"new zealand":
		"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Milford_Sound_%28New_Zealand%29.jpg/330px-Milford_Sound_%28New_Zealand%29.jpg",
	palawan:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kayangan_Lake%2C_Coron_-_Palawan.jpg/330px-Kayangan_Lake%2C_Coron_-_Palawan.jpg",
	siargao:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Siargao_Island%2C_PH%2C_Sentinel-2.jpg/330px-Siargao_Island%2C_PH%2C_Sentinel-2.jpg",
	singapore:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Raffles_Hotel_Singapore_-_panoramio.jpg/330px-Raffles_Hotel_Singapore_-_panoramio.jpg",
	"south korea":
		"https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/%EA%B0%80%EC%9D%84%EC%98%B7%EC%9D%84_%EC%9E%85%EC%9D%80_%ED%96%A5%EC%9B%90%EC%A0%95.jpg/330px-%EA%B0%80%EC%9D%84%EC%98%B7%EC%9D%84_%EC%9E%85%EC%9D%80_%ED%96%A5%EC%9B%90%EC%A0%95.jpg",
	taiwan:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/%2720210501_Taipei_Night_Skyline.jpg/330px-%2720210501_Taipei_Night_Skyline.jpg",
	thailand:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/0000140_-_Wat_Arun_Ratchawararam_005.jpg/330px-0000140_-_Wat_Arun_Ratchawararam_005.jpg",
	vigan:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Allan_Jay_Quesada_-_Vigan_Cathedral_001.jpg/330px-Allan_Jay_Quesada_-_Vigan_Cathedral_001.jpg",
	vietnam:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Halong_bay_vietnam.JPG/330px-Halong_bay_vietnam.JPG",
};

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

const toDestinationImageOverrideKey = (value: string) =>
	value.trim().replace(whitespacePattern, " ").toLowerCase();

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
	const overrideImageUrl =
		destinationImageUrlOverrides[toDestinationImageOverrideKey(destination)];

	if (overrideImageUrl) {
		return overrideImageUrl;
	}

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
