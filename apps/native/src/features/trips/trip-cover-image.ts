const wikipediaSummaryBaseUrl =
	"https://en.wikipedia.org/api/rest_v1/page/summary/";
const coverImageRequestTimeoutMs = 1800;
const whitespacePattern = /\s+/g;

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

const getDestinationSearchTitle = (destination: string) =>
	destination.split(",")[0]?.trim().replace(whitespacePattern, "_") ?? "";

export const fetchTripCoverImageUrl = async (
	destination: string
): Promise<string | undefined> => {
	const searchTitle = getDestinationSearchTitle(destination);

	if (!searchTitle) {
		return;
	}

	const abortController = new AbortController();
	const timeoutId = setTimeout(() => {
		abortController.abort();
	}, coverImageRequestTimeoutMs);

	try {
		const response = await fetch(
			`${wikipediaSummaryBaseUrl}${encodeURIComponent(searchTitle)}`,
			{ signal: abortController.signal }
		);

		if (!response.ok) {
			return;
		}

		const data = (await response.json()) as WikipediaSummaryResponse;
		const coverImageUrl = data.thumbnail?.source ?? data.originalimage?.source;

		return isHttpsUrl(coverImageUrl) ? coverImageUrl : undefined;
	} catch {
		return;
	} finally {
		clearTimeout(timeoutId);
	}
};
