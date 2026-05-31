import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const nativeEnvSource = readFileSync(
	new URL("./native.ts", import.meta.url),
	"utf8"
);

describe("native env contract", () => {
	it("uses static Expo public env accesses for native bundles", () => {
		expect(nativeEnvSource).toContain(
			"process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
		);
		expect(nativeEnvSource).toContain("process.env.EXPO_PUBLIC_CONVEX_URL");
		expect(nativeEnvSource).not.toContain("runtimeEnv: process.env");
	});
});
