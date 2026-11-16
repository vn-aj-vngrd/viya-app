import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const readWorkspaceFile = (path: string) =>
	readFileSync(new URL(`../../../../../${path}`, import.meta.url), "utf8");

describe("trip dashboard AI demo entry contract", () => {
	it("surfaces a generic workspace autopilot entry from overview", () => {
		const source = readWorkspaceFile(
			"apps/native/src/features/trips/trip-dashboard-components.tsx"
		);

		expect(source).toContain("Complete this trip");
		expect(source).toContain("Trip is ready");
		expect(source).toContain("visibleDrafts");
		// Chat drafts must stay reviewable even when every section is filled.
		expect(source).toContain("const visibleDrafts = pendingDrafts;");
		expect(source).not.toContain("isWorkspaceReady ? [] : pendingDrafts");
		expect(source).toContain("draft.previewLines");
		expect(source).toContain("buildWorkspaceAutopilotPrompt");
		expect(source).toContain("api.ai.tripAgent.generateTripAgentDraft");
		expect(source).toContain("api.ai.tripAgent.applyTripAgentDraft");
		expect(source).toContain("api.ai.tripAgent.dismissTripAgentDraft");
		expect(source).not.toContain("useFallback");
		expect(source).toContain('newThread: "1"');
		expect(source).toContain("workspace.agentDrafts");
		expect(source).toContain("vaultCoverageCount");
		expect(source).toContain("Math.max(");
		expect(source).toContain('workspaceTab: "overview"');
		expect(source).toContain("prompt: buildWorkspaceAutopilotPrompt(model)");
		expect(source).not.toContain("Singapore business-conference reward trip");
		expect(source).not.toContain("heading to Tech Week");
	});
});
