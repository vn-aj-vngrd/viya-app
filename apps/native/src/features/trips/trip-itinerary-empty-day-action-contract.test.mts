import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip itinerary empty day action contract", () => {
	it("keeps empty day cards connected to item capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-itinerary-screen.tsx"
		);

		expect(source).toContain("No scheduled items yet");
		expect(source).toContain("Add timed stop");
		expect(source).toContain("openItemSheet(day._id)");
		expect(source).toContain('icon="add-circle-outline"');
	});
});
