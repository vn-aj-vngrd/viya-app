import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const readDemoFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");
const soloSingaporeRewardPattern =
	/solo Singapore business-conference reward trip/i;
const completeThisTripPattern = /Complete this trip/;
const openingPromptPattern = /Viya, plan my solo Singapore/i;
const techWeekPattern = /Tech Week/i;
const iosSimulatorPattern = /iOS Simulator/i;
const openViyaPattern = /Open Viya for this trip/;
const itineraryFourDaysPattern = /Itinerary: 4 days/i;
const firstRunJourneyPatterns = [
	/Open Viya/i,
	/Log in/i,
	/onboarding questions/i,
	/Home/i,
	/Trips screen/i,
	/Create trip/i,
	/Trip creation questions/i,
] as const;
const aiCollaborationPatterns = [
	/Ask Mode/i,
	/Agent Mode/i,
	/questions to Viya/i,
	/generate, adjust, and act/i,
] as const;
const readinessModulePatterns = [
	/Itinerary/i,
	/Vault/i,
	/Bookings/i,
	/Budget/i,
	/Readiness/i,
	/Risks/i,
	/Travel Mode/i,
] as const;
const preparednessPattern = /100% travel preparedness/i;
const tripAgnosticPattern = /trip-agnostic/i;

describe("Singapore demo local documentation", () => {
	it("stores the presenter script, prompts, validation checklist, and fixtures", () => {
		const paths = [
			"docs/demo/ai-workspace-happy-path.md",
			"docs/demo/prompts.md",
			"docs/demo/validation-checklist.md",
			"docs/demo/fixtures/singapore-flight-confirmation.txt",
			"docs/demo/fixtures/singapore-hotel-voucher.txt",
			"docs/demo/fixtures/singapore-tech-week-pass.txt",
			"docs/demo/fixtures/singapore-expense-receipt.txt",
			"docs/demo/fixtures/singapore-readiness-note.txt",
		];

		for (const path of paths) {
			assert.equal(existsSync(resolve(rootPath, path)), true, path);
		}
	});

	it("documents the simulator validation path and exact Singapore prompt", () => {
		const script = readDemoFile("docs/demo/ai-workspace-happy-path.md");
		const prompts = readDemoFile("docs/demo/prompts.md");
		const validation = readDemoFile("docs/demo/validation-checklist.md");

		assert.match(script, soloSingaporeRewardPattern);
		assert.match(script, completeThisTripPattern);
		assert.match(prompts, openingPromptPattern);
		assert.match(prompts, techWeekPattern);
		assert.match(validation, iosSimulatorPattern);
		assert.match(validation, openViyaPattern);
		assert.match(validation, itineraryFourDaysPattern);
	});

	it("documents the full first-run AI workspace journey without hardcoding Singapore as product behavior", () => {
		const script = readDemoFile("docs/demo/ai-workspace-happy-path.md");
		const prompts = readDemoFile("docs/demo/prompts.md");
		const validation = readDemoFile("docs/demo/validation-checklist.md");
		const combinedDocs = `${script}\n${prompts}\n${validation}`;

		for (const pattern of firstRunJourneyPatterns) {
			assert.match(script, pattern);
		}

		for (const pattern of aiCollaborationPatterns) {
			assert.match(combinedDocs, pattern);
		}

		for (const pattern of readinessModulePatterns) {
			assert.match(combinedDocs, pattern);
		}

		assert.match(combinedDocs, preparednessPattern);
		assert.match(combinedDocs, tripAgnosticPattern);
	});
});
