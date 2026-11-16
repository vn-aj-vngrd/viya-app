import { Agent } from "@convex-dev/agent";

import { components } from "./_generated/api";
import { VIYA_SYSTEM_PROMPT } from "./ai/prompts";
import { getLanguageModel } from "./ai/provider";

/**
 * Built per call so a missing or invalid AI key fails the request that needs it
 * instead of crashing module load for every Convex function.
 */
export const getChatAgent = () =>
	new Agent(components.agent, {
		instructions: VIYA_SYSTEM_PROMPT,
		languageModel: getLanguageModel("chat"),
		name: "Viya",
	});
