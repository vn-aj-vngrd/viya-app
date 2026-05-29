import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	fetchGeoapifyLocationSuggestions,
	getGeoapifyAutocompleteUrl,
	parseGeoapifyAutocompleteResponse,
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
});
