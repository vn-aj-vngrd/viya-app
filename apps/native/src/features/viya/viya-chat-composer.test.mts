import { describe, expect, test } from "bun:test";

import { getComposerInputLayout } from "./viya-chat-composer";

describe("getComposerInputLayout", () => {
	test("clamps input height and enables scrolling when content overflows", () => {
		const layout = getComposerInputLayout({
			contentHeight: 180,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(132);
		expect(layout.isScrollable).toBe(true);
		expect(layout.shouldShowExpand).toBe(true);
	});

	test("hides the expand affordance for drafts below max height", () => {
		const layout = getComposerInputLayout({
			contentHeight: 80,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(80);
		expect(layout.isScrollable).toBe(false);
		expect(layout.shouldShowExpand).toBe(false);
	});

	test("shows the expand affordance when the composer reaches max height", () => {
		const layout = getComposerInputLayout({
			contentHeight: 132,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(132);
		expect(layout.isScrollable).toBe(false);
		expect(layout.shouldShowExpand).toBe(true);
	});

	test("hides the expand affordance for an empty non-overflowing composer", () => {
		const layout = getComposerInputLayout({
			contentHeight: 44,
			maxHeight: 132,
			minHeight: 44,
		});

		expect(layout.height).toBe(44);
		expect(layout.isScrollable).toBe(false);
		expect(layout.shouldShowExpand).toBe(false);
	});
});
