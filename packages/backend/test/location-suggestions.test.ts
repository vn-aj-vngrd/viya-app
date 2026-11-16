import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	fetchGeoapifyLocationSuggestions,
	getGeoapifyAutocompleteUrl,
	parseGeoapifyAutocompleteResponse,
	parseRankedGeoapifyResponse,
} from "../src/location-suggestions";

describe("Geoapify location suggestions", () => {
	it("parses GeoJSON autocomplete features into display suggestions", () => {
		const response = {
			features: [
				{
					properties: {
						address_line1: "Tokyo",
						address_line2: "Japan",
						country_code: "jp",
						formatted: "Tokyo, Japan",
						lat: 35.6764,
						lon: 139.65,
						place_id: "tokyo-place",
					},
				},
				{
					geometry: {
						coordinates: [139.7671, 35.6812],
					},
					properties: {
						address_line1: "Tokyo Station",
						city: "Tokyo",
						country: "Japan",
						formatted: "Tokyo Station, Marunouchi, Tokyo, Japan",
						place_id: "tokyo-station",
					},
				},
			],
		};

		assert.deepEqual(parseGeoapifyAutocompleteResponse(response), [
			{
				countryCode: "JP",
				details: "Japan",
				id: "tokyo-place",
				label: "Tokyo",
				latitude: 35.6764,
				longitude: 139.65,
				value: "Tokyo, Japan",
			},
			{
				countryCode: undefined,
				details: "Tokyo, Japan",
				id: "tokyo-station",
				label: "Tokyo Station",
				latitude: 35.6812,
				longitude: 139.7671,
				value: "Tokyo Station, Marunouchi, Tokyo, Japan",
			},
		]);
	});

	it("ignores malformed autocomplete features", () => {
		const response = {
			features: [
				{ properties: { formatted: "" } },
				{
					properties: { address_line1: "Cebu", formatted: "Cebu, Philippines" },
				},
				null,
			],
		};

		assert.deepEqual(parseGeoapifyAutocompleteResponse(response), [
			{
				countryCode: undefined,
				details: undefined,
				id: "Cebu, Philippines",
				label: "Cebu",
				value: "Cebu, Philippines",
			},
		]);
	});

	it("builds a free-tier autocomplete URL with trimmed query text", () => {
		const url = getGeoapifyAutocompleteUrl({
			apiKey: "geo-key",
			limit: 5,
			text: "  Manila  ",
		});

		assert.equal(
			url,
			"https://api.geoapify.com/v1/geocode/autocomplete?text=Manila&limit=5&lang=en&apiKey=geo-key"
		);
	});

	it("returns no suggestions when the Geoapify key is missing", async () => {
		let wasFetcherCalled = false;

		const suggestions = await fetchGeoapifyLocationSuggestions({
			apiKey: " ",
			fetcher: (() => {
				wasFetcherCalled = true;
				return Promise.reject(
					new Error("Fetcher should not run without an API key.")
				);
			}) as typeof fetch,
			limit: 5,
			text: "Manila",
		});

		assert.deepEqual(suggestions, []);
		assert.equal(wasFetcherCalled, false);
	});

	it("adds a country filter and bias when asked", () => {
		const url = getGeoapifyAutocompleteUrl({
			apiKey: "k",
			countryFilter: "PH",
			limit: 5,
			text: "Cebu",
		});

		assert.ok(url.includes("filter=countrycode%3Aph"));
		assert.ok(url.includes("bias=countrycode%3Aph"));
	});

	it("sorts Philippine cities ahead of streets and foreign results", () => {
		const response = {
			features: [
				{
					properties: {
						country_code: "us",
						formatted: "Cebu St, US",
						result_type: "street",
					},
				},
				{
					properties: {
						country_code: "ph",
						formatted: "Cebu Rd, Cebu",
						result_type: "street",
					},
				},
				{
					properties: {
						country_code: "ph",
						formatted: "Cebu City, Philippines",
						result_type: "city",
					},
				},
			],
		};

		assert.deepEqual(
			parseRankedGeoapifyResponse(response, "ph").map((item) => item.value),
			["Cebu City, Philippines", "Cebu Rd, Cebu", "Cebu St, US"]
		);
	});

	it("falls back to a global search when the Philippines has no match", async () => {
		const urls: string[] = [];
		const fetcher = ((url: string) => {
			urls.push(url);
			const features = url.includes("filter=")
				? []
				: [{ properties: { country_code: "jp", formatted: "Osaka, Japan" } }];

			return Promise.resolve({
				json: () => Promise.resolve({ features }),
				ok: true,
			});
		}) as unknown as typeof fetch;

		const suggestions = await fetchGeoapifyLocationSuggestions({
			apiKey: "k",
			fetcher,
			limit: 5,
			preferredCountryCode: "ph",
			text: "Osaka",
		});

		assert.equal(urls.length, 2);
		assert.equal(suggestions[0]?.value, "Osaka, Japan");
	});
});
