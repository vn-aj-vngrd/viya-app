import { describe, expect, test } from "bun:test";

import {
	parseInlineMarkdown,
	parseMarkdownBlocks,
} from "./viya-chat-markdown-parser";

describe("parseMarkdownBlocks", () => {
	test("splits compact inline numbered choices into a paragraph and list", () => {
		const blocks = parseMarkdownBlocks(
			"Which style sounds most appealing? 1. Beach & island hopping (e.g., Palawan, Siargao) 2. City culture & food scene (e.g., Manila, Cebu) 3. Nature & adventure (e.g., Banaue, Davao)"
		);

		expect(blocks).toMatchObject([
			{
				text: "Which style sounds most appealing?",
				type: "paragraph",
			},
			{
				items: [
					"Beach & island hopping (e.g., Palawan, Siargao)",
					"City culture & food scene (e.g., Manila, Cebu)",
					"Nature & adventure (e.g., Banaue, Davao)",
				],
				type: "numberedList",
			},
		]);
	});

	test("recognizes keycap and parenthesized numbered choices", () => {
		const blocks = parseMarkdownBlocks(
			"Pick one: 1️⃣ Beaches (2) Food 3) Adventure"
		);

		expect(blocks).toMatchObject([
			{
				text: "Pick one:",
				type: "paragraph",
			},
			{
				items: ["Beaches", "Food", "Adventure"],
				type: "numberedList",
			},
		]);
	});

	test("keeps wrapped list item text with the previous marker", () => {
		const blocks = parseMarkdownBlocks(
			"1. Beach & island hopping\nwith ferry timing notes\n2. City culture"
		);

		expect(blocks).toMatchObject([
			{
				items: [
					"Beach & island hopping with ferry timing notes",
					"City culture",
				],
				type: "numberedList",
			},
		]);
	});

	test("recognizes common bullet markers", () => {
		const blocks = parseMarkdownBlocks("+ Flexible dates\n• Local food");

		expect(blocks).toMatchObject([
			{
				items: ["Flexible dates", "Local food"],
				type: "bulletList",
			},
		]);
	});

	test("parses underscore and asterisk inline emphasis", () => {
		const parts = parseInlineMarkdown(
			"Try __high confidence__, **booking-safe**, _slow_, and *local*."
		);

		expect(parts).toMatchObject([
			{ text: "Try " },
			{ strong: true, text: "high confidence" },
			{ text: ", " },
			{ strong: true, text: "booking-safe" },
			{ text: ", " },
			{ emphasis: true, text: "slow" },
			{ text: ", and " },
			{ emphasis: true, text: "local" },
			{ text: "." },
		]);
	});
});
