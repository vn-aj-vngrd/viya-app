import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");
const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip places actions contract", () => {
	it("keeps the empty places state actionable and rows assignable", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-places-screen.tsx"
		);

		expect(source).toContain('actionLabel="Add place"');
		expect(source).toContain("onPress={controller.openCreate}");
		expect(source).toContain("Assign to day");
		expect(source).toContain("Unplanned");
	});
});
