import type { Href } from "expo-router";
import type { StyleProp, ViewStyle } from "react-native";

import { VIYA_ROUTES } from "@/src/constants/routes";

import type {
	ChatModeOption,
	PromptSuggestion,
	ReturnTabName,
	SlashCommandOption,
} from "./viya-chat-types";

export const returnTabRoutes = {
	index: VIYA_ROUTES.home,
	trips: VIYA_ROUTES.trips,
} as const satisfies Record<ReturnTabName, Href>;

export const activeThreadsStorageKey = "viya.ai.activeThreadIds";
export const bulletLinePattern = /^[-*+•]\s+(.+)$/;
export const headingLinePattern = /^(#{1,4})\s+(.+)$/;
export const inlineMarkdownTokenPattern =
	/(`[^`]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
export const numberedLinePattern =
	/^(?:\d+[.)]|\(\d+\)|\d+\uFE0F?\u20E3)\s+(.+)$/u;
export const pipeEndPattern = /\|$/;
export const pipeStartPattern = /^\|/;
export const rgbColorPattern =
	/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/;
export const ruleLinePattern = /^-{3,}$/;
export const slashCommandTokenPattern = /(^|\s)\/([^\s/]*)$/;
export const tableSeparatorPattern =
	/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;
export const thinkingMessage = "Viya is thinking";
export const thinkingMessageLetters = Array.from(
	thinkingMessage,
	(character, index) => ({
		character,
		key: `${index}-${character}`,
	})
);
export const thinkingShimmerDurationMs = 1400;
export const thinkingShimmerTailLength = 4;
export const chatInputMaxLength = 1200;
export const chatInputMaxLines = 12;
export const chatInputWarningThreshold = 1000;
export const composerInputMaxHeight = 132;
export const composerInputMinHeight = 36;
export const expandedComposerInputMaxHeight = 360;
export const expandedComposerInputMinHeight = 220;

export const CHAT_MODE_OPTIONS = [
	{
		accent: "#0A84FF",
		description: "General travel help, files, decisions, and follow-ups.",
		emptyDescription:
			"Ask travel questions, upload files for text extraction, compare options, or turn loose notes into next steps.",
		emptyTitle: "Ask Viya anything travel",
		icon: "sparkles-outline",
		id: "chat",
		label: "Chat",
		placeholder: "Ask Viya",
		soft: "rgba(10, 132, 255, 0.12)",
	},
] as const satisfies readonly ChatModeOption[];

export const TRIP_CONTEXT_MODE_OPTION = {
	accent: "#FF9F0A",
	description: "Agent help for itinerary, budget, vault, and readiness.",
	emptyDescription:
		"Ask Viya to file uploads, find passports or confirmations, generate itinerary drafts, centralize budget, and check trip status.",
	emptyTitle: "Let Viya work on this trip",
	icon: "briefcase-outline",
	id: "trip",
	label: "Trip",
	placeholder: "Ask Viya to update this trip",
	requiresTrip: true,
	soft: "rgba(255, 159, 10, 0.14)",
} as const satisfies ChatModeOption;

export const ALL_CHAT_MODE_OPTIONS = [
	...CHAT_MODE_OPTIONS,
	{
		...TRIP_CONTEXT_MODE_OPTION,
	},
] as const satisfies readonly ChatModeOption[];

export const chatPromptSuggestions = [
	{
		accent: "#0A84FF",
		icon: "sparkles-outline",
		prompt: "Help me understand this travel question and suggest next steps.",
		soft: "rgba(10, 132, 255, 0.12)",
		summary: "Get a concise travel answer.",
		title: "Ask a travel question",
	},
	{
		accent: "#30D158",
		icon: "document-attach-outline",
		prompt:
			"I uploaded a file. Extract the useful travel details and tell me what to do next.",
		soft: "rgba(48, 209, 88, 0.12)",
		summary: "Use extracted file context.",
		title: "Work from a file",
	},
	{
		accent: "#FF9F0A",
		icon: "wallet-outline",
		prompt: "Help me estimate costs and trade-offs for this travel decision.",
		soft: "rgba(255, 159, 10, 0.14)",
		summary: "Compare budget impact.",
		title: "Estimate costs",
	},
	{
		accent: "#BF5AF2",
		icon: "git-compare-outline",
		prompt: "Compare these travel options and recommend the practical choice.",
		soft: "rgba(191, 90, 242, 0.12)",
		summary: "Pick the best option.",
		title: "Compare options",
	},
] as const satisfies readonly PromptSuggestion[];

export const planPromptSuggestions = [
	{
		accent: "#BF5AF2",
		icon: "map-outline",
		prompt:
			"Help me start planning a trip. Ask me one question at a time before drafting it.",
		soft: "rgba(191, 90, 242, 0.12)",
		summary: "Start with the first decision.",
		title: "Plan the first night",
	},
	{
		accent: "#0A84FF",
		icon: "git-compare-outline",
		prompt: "Help me plan a trip. Start with the most important question.",
		soft: "rgba(10, 132, 255, 0.12)",
		summary: "Answer one question at a time.",
		title: "Start a guided plan",
	},
	{
		accent: "#30D158",
		icon: "checkmark-done-outline",
		prompt:
			"Walk me through the planning decisions for a beach trip, one question at a time.",
		soft: "rgba(48, 209, 88, 0.12)",
		summary: "Check weak spots before booking.",
		title: "Pressure-test the plan",
	},
	{
		accent: "#FF9F0A",
		icon: "umbrella-outline",
		prompt:
			"Help me plan a rain-ready itinerary. Ask only the next question you need.",
		soft: "rgba(255, 159, 10, 0.14)",
		summary: "Build a lower-risk fallback.",
		title: "Add a backup plan",
	},
] as const satisfies readonly PromptSuggestion[];

export const tripPromptSuggestions = [
	{
		accent: "#0A84FF",
		icon: "calendar-outline",
		prompt:
			"Generate a detailed multi-day itinerary for this trip. Create one natural whole-day plan for each trip date, with timed stops, places, meals, transfers, buffers, estimated costs, and practical notes.",
		soft: "rgba(10, 132, 255, 0.12)",
		summary: "Create full days and timed stops.",
		title: "Generate itinerary",
	},
	{
		accent: "#FF9F0A",
		icon: "folder-open-outline",
		prompt:
			"Find passport, booking, ticket, and document gaps in this trip. Tell me what is already in the vault and what still needs to be uploaded or linked.",
		soft: "rgba(255, 159, 10, 0.14)",
		summary: "Audit saved files and missing proof.",
		title: "Organize vault",
	},
	{
		accent: "#30D158",
		icon: "wallet-outline",
		prompt:
			"Centralize the budget for this trip. Show booked costs, manual expenses, remaining spend, daily safe spend, and what needs a receipt or confirmation.",
		soft: "rgba(48, 209, 88, 0.12)",
		summary: "Review spend in one place.",
		title: "Sync budget",
	},
	{
		accent: "#BF5AF2",
		icon: "shield-checkmark-outline",
		prompt:
			"Based on the current trip status, what is the readiness state and what should Viya fix first?",
		soft: "rgba(191, 90, 242, 0.12)",
		summary: "Use current status to pick the next action.",
		title: "Complete readiness",
	},
] as const satisfies readonly PromptSuggestion[];

export const SLASH_COMMAND_OPTIONS = [
	{
		accent: "#0A84FF",
		description: "Switch to general travel chat.",
		icon: "sparkles-outline",
		id: "chat",
		keywords: ["general", "ask", "question", "help"],
		label: "/chat",
		mode: "chat",
	},
	{
		action: "newChat",
		accent: "#71717A",
		description: "Start fresh in the current mode.",
		icon: "create-outline",
		id: "new",
		keywords: ["clear", "reset", "fresh"],
		label: "/new",
	},
	{
		accent: "#FF9F0A",
		description: "Audit bookings and documents in the vault.",
		icon: "folder-open-outline",
		id: "vault",
		keywords: ["passport", "files", "documents", "booking", "uploads"],
		label: "/vault",
		mode: "trip",
		prompt:
			"Audit the vault for this trip. Identify saved bookings, documents, passport or ID coverage, missing links, and the next upload or link Viya should handle.",
		requiresTrip: true,
	},
	{
		accent: "#0A84FF",
		description: "Generate or refine the trip itinerary.",
		icon: "calendar-outline",
		id: "itinerary",
		keywords: ["wanderlog", "route", "days", "stops", "replan"],
		label: "/itinerary",
		mode: "trip",
		prompt:
			"Generate a simple Wanderlog-style itinerary draft for this trip with days, time blocks, places, meals, transfers, and realistic pacing.",
		requiresTrip: true,
	},
	{
		accent: "#30D158",
		description: "Review centralized trip spend.",
		icon: "wallet-outline",
		id: "budget",
		keywords: ["spend", "cost", "receipt", "money", "expenses"],
		label: "/budget",
		mode: "trip",
		prompt:
			"Centralize the budget for this trip. Show booked costs, manual expenses, remaining spend, daily safe spend, and what needs a receipt or confirmation.",
		requiresTrip: true,
	},
	{
		accent: "#BF5AF2",
		description: "Check status-based readiness.",
		icon: "shield-checkmark-outline",
		id: "readiness",
		keywords: ["checklist", "gaps", "status", "ready"],
		label: "/readiness",
		mode: "trip",
		prompt:
			"Based on the current trip status, what is the readiness state and what should Viya fix first?",
		requiresTrip: true,
	},
	{
		accent: "#0A84FF",
		description: "Let Viya help create a trip.",
		icon: "help-circle-outline",
		id: "ask",
		keywords: ["questions", "guided", "intake", "create", "trip"],
		label: "/create-trip",
		mode: "chat",
		prompt:
			"Help me create a trip. Ask me one setup question at a time, then draft a Trip Blueprint when you have enough details.",
	},
] as const satisfies readonly SlashCommandOption[];

export const composerStyle = {
	elevation: 2,
	shadowColor: "#0B1220",
	shadowOffset: { height: 4, width: 0 },
	shadowOpacity: 0.08,
	shadowRadius: 12,
} satisfies StyleProp<ViewStyle>;

export const questionCardStyle = {
	borderCurve: "continuous",
} satisfies StyleProp<ViewStyle>;
