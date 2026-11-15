import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip itinerary next stop actions contract", () => {
	it("keeps the next stop summary actionable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-itinerary-screen.tsx"
		);

		expect(source).toContain("showStopActionMenu");
		expect(source).toContain("Edit stop");
		expect(source).toContain("Open Maps");
		expect(source).toContain("Open booking");
		expect(source).toContain("onEdit: () => openEditItem(item)");
	});
});
