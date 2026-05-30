import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip recap share contract", () => {
	it("keeps the recap screen connected to the native share sheet", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-recap-screen.tsx"
		);

		expect(source).toContain("buildTripRecapShareMessage");
		expect(source).toContain("Share.share");
		expect(source).toContain("Share recap");
	});
});
