import { describe, expect, it } from "bun:test";

import { getDecoratedRouterHref } from "./auth-routing";

describe("auth routing", () => {
	it("preserves Expo Router groups from native decorated urls", () => {
		expect(
			getDecoratedRouterHref(
				() => "viya-app://(app)/(tabs)?__clerk_status=verified",
				"/(app)/(tabs)"
			)
		).toBe("/(app)/(tabs)?__clerk_status=verified");
	});

	it("strips Expo development url prefixes", () => {
		expect(
			getDecoratedRouterHref(
				() => "exp://127.0.0.1:8081/--/(app)/(tabs)?source=oauth",
				"/(app)/(tabs)"
			)
		).toBe("/(app)/(tabs)?source=oauth");
	});
});
