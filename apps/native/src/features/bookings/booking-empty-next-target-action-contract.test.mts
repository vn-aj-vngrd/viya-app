import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("booking empty next target action contract", () => {
	it("keeps the empty next booking target summary connected to capture", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/bookings/booking-hub-screen.tsx"
		);

		expect(source).toContain("No bookings yet");
		expect(source).toContain("Import from Vault");
		expect(source).toContain("Add booking");
		expect(source).toContain("openCreateSheet");
	});
});
