import { google } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type AiProviderName = "openrouter" | "google";
export type AiModelPurpose =
	| "chat"
	| "itinerary"
	| "readiness"
	| "risk"
	| "travelMode"
	| "moments"
	| "wrapped"
	| "vault";

const getProviderName = (): AiProviderName => {
	const provider = process.env.AI_PROVIDER;

	if (provider === "google") {
		return "google";
	}

	return "openrouter";
};

const getModelId = (purpose: AiModelPurpose): string => {
	const purposeKey = `AI_MODEL_${purpose.toUpperCase()}`;
	const purposeModel = process.env[purposeKey];

	if (purposeModel) {
		return purposeModel;
	}

	return (
		process.env.AI_MODEL ??
		process.env.OPENROUTER_MODEL ??
		"google/gemini-2.5-flash"
	);
};

export const getLanguageModel = (purpose: AiModelPurpose): LanguageModel => {
	const provider = getProviderName();
	const modelId = getModelId(purpose);

	if (provider === "google") {
		return google(process.env.GOOGLE_GENERATIVE_AI_MODEL ?? "gemini-2.5-flash");
	}

	const openrouter = createOpenAICompatible({
		apiKey: process.env.OPENROUTER_API_KEY,
		baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
		includeUsage: true,
		name: "openrouter",
	});

	return openrouter(modelId);
};
