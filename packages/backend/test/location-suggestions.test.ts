import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
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
						place_id: "tokyo-place",
					},
				},
				{
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
				value: "Tokyo, Japan",
			},
			{
				countryCode: undefined,
				details: "Tokyo, Japan",
				id: "tokyo-station",
				label: "Tokyo Station",
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
});
