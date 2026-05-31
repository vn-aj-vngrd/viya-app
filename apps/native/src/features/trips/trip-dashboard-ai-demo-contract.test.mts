import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

describe("trip dashboard AI demo entry contract", () => {
	it("opens module-scoped Viya chat instead of overview autopilot", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-components.tsx"
		);

		expect(source).toContain("TripFloatingViyaButton");
		expect(source).toContain('mode: "trip"');
		expect(source).toContain('newThread: "1"');
		expect(source).toContain("returnTo:");
		expect(source).toContain("workspaceTab: activeTab");
		expect(source).not.toContain("WorkspaceAutopilotCard");
		expect(source).not.toContain("VIYA AUTOPILOT");
		expect(source).not.toContain("Complete this trip");
		expect(source).not.toContain("buildWorkspaceAutopilotPrompt");
		expect(source).not.toContain("useFallback: true");
		expect(source).not.toContain("Singapore business-conference reward trip");
		expect(source).not.toContain("heading to Tech Week");
	});
});
