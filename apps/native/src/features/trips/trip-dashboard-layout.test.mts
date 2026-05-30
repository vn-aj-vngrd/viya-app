import { describe, expect, test } from "bun:test";

import {
	getTripModulesSheetListMaxHeight,
	shouldShowTripDashboardFocusSections,
} from "./trip-dashboard-layout";

describe("trip dashboard layout", () => {
	test("bounds trip module launcher list inside its bottom sheet", () => {
		expect(
			getTripModulesSheetListMaxHeight({
				bottomInset: 34,
				windowHeight: 844,
			})
		).toBe(487);
	});

	test("keeps a usable scroll area on shorter screens", () => {
		expect(
			getTripModulesSheetListMaxHeight({
				bottomInset: 0,
				windowHeight: 568,
			})
		).toBeGreaterThanOrEqual(280);
	});

	test("shows dashboard focus sections on the primary trip dashboard", () => {
		expect(shouldShowTripDashboardFocusSections()).toBe(true);
	});
});
