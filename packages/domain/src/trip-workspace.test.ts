import { describe, expect, it } from "vitest";

import { getTripWorkspaceNextAction } from "./trip-workspace";

const baseInput = {
	bookings: [],
	budgetAmount: 50_000,
	itineraryItemCount: 3,
	readinessScore: 95,
	risks: [],
	vaultItems: [{ status: "ready" }],
};

describe("trip workspace selectors", () => {
	it("prioritizes open risks before other module gaps", () => {
		const summary = getTripWorkspaceNextAction({
			...baseInput,
			bookings: [{ status: "target" }],
			risks: [{ status: "open" }],
		});

		expect(summary.target).toBe("risks");
		expect(summary.label).toBe("Review open risks");
	});

	it("marks bookings as next when booking targets remain", () => {
		const summary = getTripWorkspaceNextAction({
			...baseInput,
			bookings: [{ status: "target" }],
		});

		expect(summary.target).toBe("bookings");
		expect(summary.label).toBe("Review booking targets");
	});

	it("marks readiness as next after required planning modules exist", () => {
		const summary = getTripWorkspaceNextAction({
			...baseInput,
			readinessScore: 72,
		});

		expect(summary.target).toBe("readiness");
		expect(summary.label).toBe("Fix readiness gaps");
	});
});
