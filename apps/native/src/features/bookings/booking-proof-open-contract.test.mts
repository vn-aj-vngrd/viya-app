import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("booking proof open contract", () => {
	it("keeps linked Vault booking confirmations openable from Booking Hub", () => {
		const hubSource = readWorkspaceFile(
			"apps/native/src/features/bookings/booking-hub-screen.tsx"
		);

		expect(hubSource).toContain("getBookingProofMetaById");
		expect(hubSource).toContain("vaultItem.url");
		expect(hubSource).toContain("Linking.openURL");
		expect(hubSource).toContain("onOpenProof");
		expect(hubSource).toContain("Open proof");
	});
});
