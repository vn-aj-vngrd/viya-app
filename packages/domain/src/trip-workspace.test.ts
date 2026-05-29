import { describe, expect, it } from "vitest";

import { getLifecycleStageSummary } from "./trip-workspace";

describe("trip workspace selectors", () => {
	it("marks booking as next when booking targets remain", () => {
		const summary = getLifecycleStageSummary({
			bookings: [{ status: "target" }],
			readinessScore: 0,
			vaultItems: [],
		});

		expect(summary.nextStage).toBe("booking");
		expect(summary.primaryActionLabel).toBe("Review booking targets");
	});

	it("marks readiness as next after synced files exist", () => {
		const summary = getLifecycleStageSummary({
			bookings: [{ status: "confirmed" }],
			readinessScore: 72,
			vaultItems: [{ status: "ready" }],
		});

		expect(summary.nextStage).toBe("preparing");
		expect(summary.primaryActionLabel).toBe("Fix readiness gaps");
	});
});
