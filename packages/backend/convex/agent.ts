import { Agent } from "@convex-dev/agent";

import { components } from "./_generated/api";
import { VIYA_SYSTEM_PROMPT } from "./ai/prompts";
import { getLanguageModel } from "./ai/provider";

export const chatAgent = new Agent(components.agent, {
	name: "Viya",
	languageModel: getLanguageModel("chat"),
	instructions: VIYA_SYSTEM_PROMPT,
});
