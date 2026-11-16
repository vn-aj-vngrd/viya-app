import { describe, expect, test } from "bun:test";

import { getDraftActionErrorMessage } from "./trip-dashboard-utils";

describe("draft action errors", () => {
	test("explains known server codes in plain words", () => {
		expect(
			getDraftActionErrorMessage(
				new Error(
					"[CONVEX M(ai/tripAgent:applyTripAgentDraft)] TRIP_AGENT_DRAFT_ALREADY_REVIEWED"
				),
				"apply"
			)
		).toBe("This draft was already applied or dismissed.");
		expect(
			getDraftActionErrorMessage(new Error("INVALID_TRIP_DATE_RANGE"), "apply")
		).toContain("trip dates changed");
	});

	test("never shows raw errors and says nothing changed", () => {
		expect(getDraftActionErrorMessage(new Error("boom"), "apply")).toBe(
			"Couldn't apply the draft. Nothing in the trip changed. Try again."
		);
		expect(getDraftActionErrorMessage("x", "dismiss")).toBe(
			"Couldn't dismiss the draft. Try again."
		);
	});
});
