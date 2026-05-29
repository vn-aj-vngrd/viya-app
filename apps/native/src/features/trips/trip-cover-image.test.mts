import { afterEach, describe, expect, test } from "bun:test";

import {
	fetchDestinationImageUrl,
	getDestinationImageSearchTitles,
	isDecorativeDestinationImageUrl,
} from "./trip-cover-image";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const mockWikipediaSummaries = (
	summaries: Record<string, { imageUrl?: string; ok?: boolean }>
) => {
	const requestedTitles: string[] = [];

	globalThis.fetch = ((input: RequestInfo | URL) => {
		const url = new URL(input.toString());
		const title = decodeURIComponent(url.pathname.split("/").pop() ?? "");
		requestedTitles.push(title);

		const summary = summaries[title];
		if (!summary || summary.ok === false) {
			return Promise.resolve(new Response("Not found", { status: 404 }));
		}

		return Promise.resolve(
			Response.json({
				thumbnail: summary.imageUrl ? { source: summary.imageUrl } : undefined,
			})
		);
	}) as typeof fetch;

	return requestedTitles;
};

describe("trip cover image resolution", () => {
	test("rejects Wikipedia flag thumbnails and falls through to a travel image", async () => {
		const flagUrl =
			"https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Flag_of_Japan.svg/330px-Flag_of_Japan.svg.png";
		const photoUrl =
			"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Kiyomizu.jpg/330px-Kiyomizu.jpg";
		const requestedTitles = mockWikipediaSummaries({
			Japan: { imageUrl: flagUrl },
			Tourism_in_Japan: { imageUrl: photoUrl },
		});

		await expect(fetchDestinationImageUrl("Japan")).resolves.toBe(photoUrl);
		expect(requestedTitles).toEqual(["Japan", "Tourism_in_Japan"]);
		expect(isDecorativeDestinationImageUrl(flagUrl)).toBe(true);
	});

	test("uses city and US state titles before country-level fallbacks", async () => {
		expect(
			getDestinationImageSearchTitles("Cuba, AL, United States of America")
		).toContain("Cuba,_Alabama");

		const photoUrl =
			"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/CubaAlabama.JPG/330px-CubaAlabama.JPG";
		const requestedTitles = mockWikipediaSummaries({
			"Cuba,_Alabama": { imageUrl: photoUrl },
			Cuba: {
				imageUrl:
					"https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Flag_of_Cuba.svg/330px-Flag_of_Cuba.svg.png",
			},
		});

		await expect(
			fetchDestinationImageUrl("Cuba, AL, United States of America")
		).resolves.toBe(photoUrl);
		expect(requestedTitles).toEqual(["Cuba,_Alabama"]);
	});
});
