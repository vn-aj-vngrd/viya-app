import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap focus actions contract", () => {
	it("keeps wrap-up focus gaps connected to their source modules", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain("actionHref: VIYA_ROUTES.tripMoments(tripId)");
		expect(source).toContain("actionHref: VIYA_ROUTES.tripItinerary(tripId)");
		expect(source).toContain("actionHref: VIYA_ROUTES.tripBookings(tripId)");
		expect(source).toContain("actionHref: VIYA_ROUTES.tripVault(tripId)");
		expect(source).toContain('actionLabel: "Open moments"');
		expect(source).toContain('actionLabel: "Open itinerary"');
		expect(source).toContain('actionLabel: "Open bookings"');
		expect(source).toContain('actionLabel: "Open files"');
		expect(source).toContain("<StoryFocus");
		expect(source).toContain("actionHref={storyFocus.actionHref}");
		expect(source).toContain("actionLabel={storyFocus.actionLabel}");
	});
});
