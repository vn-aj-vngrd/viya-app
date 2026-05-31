import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

describe("OTA update contract", () => {
	it("pins EAS updates to the native app version runtime", () => {
		const appConfig = JSON.parse(readWorkspaceFile("apps/native/app.json"));

		expect(appConfig.expo.runtimeVersion).toEqual({
			policy: "appVersion",
		});
		expect(appConfig.expo.updates.url).toBe(
			"https://u.expo.dev/a886cc8e-2ed1-4bff-b4ca-652939f4b2cf"
		);
	});

	it("keeps update checks from blocking app launch or development builds", () => {
		const source = readWorkspaceFile(
			"apps/native/shared/components/common/ota-update-banner.tsx"
		);

		expect(source).toContain('process.env.NODE_ENV === "development"');
		expect(source).toContain("if (isDevelopment || isChecking.current)");
		expect(source).toContain("isChecking.current = true");
		expect(source).toContain("checkForUpdate().catch");
		expect(source).not.toContain('setStatus("checking")');
	});
});
