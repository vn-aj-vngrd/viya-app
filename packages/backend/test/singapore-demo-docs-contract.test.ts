import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const rootPath = resolve(import.meta.dirname, "../../..");
const readDemoFile = (path: string) =>
	readFileSync(resolve(rootPath, path), "utf8");
const singaporeRewardPattern =
	/Singapore group business-conference reward trip/i;
const manualTripPattern = /manual trip/i;
const generateItineraryPattern = /Generate itinerary/i;
const techWeekPattern = /Tech Week/i;
const iosSimulatorPattern = /iOS Simulator/i;
const openViyaPattern = /Open Viya for this trip/;
const itineraryFourDaysPattern = /Itinerary: 4 days/i;
const readinessOneHundredPattern = /100%/;
const fixtureCategoryPatterns = [
	/singapore-flight-confirmation\.txt`: booking proof \/ flight ticket/i,
	/singapore-hotel-voucher\.txt`: booking proof \/ hotel voucher/i,
	/singapore-tech-week-pass\.txt`: event proof \/ permit/i,
	/singapore-expense-receipt\.txt`: receipt \/ budget evidence/i,
	/singapore-readiness-note\.txt`: readiness note \/ checklist evidence/i,
] as const;
const finalChatQuestionPatterns = [
	/what evidence are you using from the workspace/i,
	/what should I watch on travel day/i,
] as const;
const firstRunJourneyPatterns = [
	/Open Viya/i,
	/Log in/i,
	/onboarding questions/i,
	/Home/i,
	/Trips screen/i,
	/Create trip/i,
	/manual trip form/i,
] as const;
const aiCollaborationPatterns = [
	/Ask Mode/i,
	/Agent Mode/i,
	/two questions/i,
	/generate, adjust, and act/i,
] as const;
const readinessModulePatterns = [
	/Itinerary/i,
	/Vault/i,
	/Bookings/i,
	/Budget/i,
	/Readiness/i,
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

	it("documents the simulator validation path and module-led Singapore flow", () => {
		const script = readDemoFile("docs/demo/ai-workspace-happy-path.md");
		const prompts = readDemoFile("docs/demo/prompts.md");
		const validation = readDemoFile("docs/demo/validation-checklist.md");
		const recordingPlan = readDemoFile(
			"docs/demo/recording-guide/viya-singapore-demo-recording-plan.md"
		);
		const combinedDocs = `${script}\n${prompts}\n${validation}\n${recordingPlan}`;

		assert.match(script, singaporeRewardPattern);
		assert.match(script, manualTripPattern);
		assert.match(prompts, generateItineraryPattern);
		assert.match(prompts, techWeekPattern);
		assert.match(validation, iosSimulatorPattern);
		assert.match(validation, openViyaPattern);
		assert.match(validation, itineraryFourDaysPattern);
		assert.match(combinedDocs, readinessOneHundredPattern);
		for (const pattern of fixtureCategoryPatterns) {
			assert.match(combinedDocs, pattern);
		}
		for (const pattern of finalChatQuestionPatterns) {
			assert.match(combinedDocs, pattern);
		}
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
