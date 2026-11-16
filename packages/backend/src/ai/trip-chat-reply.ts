/**
 * Guards for the trip chat loop so a reply always ends in text the user can
 * read, even when the model spends every step on tools or a tool fails.
 */

/** On the last allowed step tools are switched off so the model must answer. */
export const getFinalStepSettings = (stepNumber: number, maxSteps: number) =>
	stepNumber >= maxSteps - 1 ? { toolChoice: "none" as const } : undefined;

interface StepLike {
	text: string;
	toolResults: readonly { output?: unknown; toolName: string }[];
}

const hasSavedDraft = (
	output: unknown
): output is { draftId: string; ok: true } =>
	typeof output === "object" &&
	output !== null &&
	"ok" in output &&
	output.ok === true &&
	"draftId" in output &&
	typeof output.draftId === "string";

const hasFailedDraft = (output: unknown) =>
	typeof output === "object" &&
	output !== null &&
	"ok" in output &&
	output.ok === false;

/**
 * Text to save when the model finished without writing anything. Null when
 * the reply already has text.
 */
export const buildMissingReplyText = (
	steps: readonly StepLike[]
): string | null => {
	if (steps.some((step) => step.text.trim())) {
		return null;
	}

	const results = steps.flatMap((step) => step.toolResults);
	const savedDrafts = new Set(
		results
			.map((result) => result.output)
			.filter(hasSavedDraft)
			.map((output) => output.draftId)
	).size;

	if (savedDrafts > 0) {
		return savedDrafts === 1
			? "I saved a draft for you to review. Nothing changes in your trip until you apply it in Drafts."
			: `I saved ${savedDrafts} drafts for you to review. Nothing changes in your trip until you apply them in Drafts.`;
	}

	if (results.some((result) => hasFailedDraft(result.output))) {
		return "I couldn't put together a valid draft for that yet, so nothing was saved or changed. Could you tell me which day or detail matters most, and I'll try again?";
	}

	return "I checked your trip but couldn't finish an answer this time. Nothing was changed. Please ask again, or narrow it down to one day or one part of the trip.";
};
