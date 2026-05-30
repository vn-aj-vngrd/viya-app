import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../../../..");

const readWorkspaceFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");

describe("trip companions contact contract", () => {
	it("keeps saved companion contact details actionable from the companions module", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-companions-screen.tsx"
		);

		expect(source).toContain("Linking.openURL");
		expect(source).toContain('getPhoneContactUrl("tel"');
		expect(source).toContain('getPhoneContactUrl("sms"');
		expect(source).toContain("mailto:");
		expect(source).toContain("Call");
		expect(source).toContain("Message");
		expect(source).toContain("Email");
	});
});
