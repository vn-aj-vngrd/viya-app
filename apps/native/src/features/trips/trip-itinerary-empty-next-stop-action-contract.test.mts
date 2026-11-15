import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip itinerary empty next stop action contract", () => {
	it("keeps the timeline board empty next stop connected to capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-itinerary-screen.tsx"
		);

		expect(source).toContain("Nothing planned");
		expect(source).toContain("Plan this day");
		expect(source).toContain("handleAddDay");
		expect(source).toContain("Plan this day to add stops");
		expect(source).toContain("openCreateItem");
	});
});
