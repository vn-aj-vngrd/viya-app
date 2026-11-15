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
		description: "Questions, files and ideas not tied to a trip.",
		emptyDescription:
			"Ask travel questions, upload files for text extraction, compare options, or turn loose notes into next steps.",
		emptyTitle: "Ask Viya anything travel",
		icon: "sparkles-outline",
		id: "chat",
		label: "Chat",
		placeholder: "Ask Viya",
	},
] as const satisfies readonly ChatModeOption[];

export const TRIP_CONTEXT_MODE_OPTION = {
	description:
		"Questions about one trip: itinerary, budget, Vault and readiness.",
	emptyDescription:
		"Ask Viya to file uploads, find passports or confirmations, generate itinerary drafts, centralize budget, and check trip status.",
	emptyTitle: "Let Viya work on this trip",
	icon: "briefcase-outline",
	id: "trip",
	label: "Trip",
	placeholder: "Ask Viya to update this trip",
	requiresTrip: true,
} as const satisfies ChatModeOption;

export const ALL_CHAT_MODE_OPTIONS = [
	...CHAT_MODE_OPTIONS,
	{
		...TRIP_CONTEXT_MODE_OPTION,
	},
] as const satisfies readonly ChatModeOption[];

export const chatPromptSuggestions = [
	{
		icon: "sparkles-outline",
		prompt: "Help me understand this travel question and suggest next steps.",
		summary: "Short, practical answer.",
		title: "Ask a travel question",
	},
	{
		icon: "document-attach-outline",
		prompt:
			"I uploaded a file. Extract the useful travel details and tell me what to do next.",
		summary: "Read a ticket or receipt.",
		title: "Work from a file",
	},
	{
		icon: "wallet-outline",
		prompt: "Help me estimate costs and trade-offs for this travel decision.",
		summary: "Rough costs in PHP.",
		title: "Estimate costs",
	},
	{
		icon: "git-compare-outline",
		prompt: "Compare these travel options and recommend the practical choice.",
		summary: "Pick one and say why.",
		title: "Compare options",
	},
] as const satisfies readonly PromptSuggestion[];

export const planPromptSuggestions = [
	{
		icon: "map-outline",
		prompt: "Help me plan a trip. Start with the most important question.",
		summary: "One question at a time.",
		title: "Plan a new trip",
	},
	{
		icon: "sunny-outline",
		prompt:
			"Help me plan a beach trip in the Philippines. Ask me one question at a time before drafting it.",
		summary: "Islands, beaches and slow days.",
		title: "Plan a beach trip",
	},
	{
		icon: "umbrella-outline",
		prompt:
			"Help me plan a rain-ready itinerary. Ask only the next question you need.",
		summary: "Indoor options and backups.",
		title: "Plan around rain",
	},
	{
		icon: "wallet-outline",
		prompt:
			"Help me plan a trip on a fixed budget in PHP. Ask for the total first.",
		summary: "Set a total and keep to it.",
		title: "Plan on a budget",
	},
] as const satisfies readonly PromptSuggestion[];

export const tripPromptSuggestions = [
	{
		icon: "folder-open-outline",
		prompt:
			"Find passport, booking, ticket, and document gaps in this trip. Tell me what is already in the vault and what still needs to be uploaded or linked.",
		summary: "Tickets, IDs and confirmations.",
		title: "Find missing documents",
	},
	{
		icon: "calendar-outline",
		prompt:
			"Generate a simple itinerary draft for this trip with days, time blocks, places, meals, transfers, and realistic pacing.",
		summary: "Days, times and places.",
		title: "Draft the itinerary",
	},
	{
		icon: "wallet-outline",
		prompt:
			"Centralize the budget for this trip. Show booked costs, manual expenses, remaining spend, daily safe spend, and what needs a receipt or confirmation.",
		summary: "Spent, left and per day.",
		title: "Check the budget",
	},
	{
		icon: "shield-checkmark-outline",
		prompt:
			"Based on the current trip status, what is the readiness state and what should Viya fix first?",
		summary: "The most urgent open item.",
		title: "What to do next",
	},
] as const satisfies readonly PromptSuggestion[];

export const SLASH_COMMAND_OPTIONS = [
	{
		description: "Questions not tied to one trip.",
		icon: "sparkles-outline",
		id: "chat",
		keywords: ["general", "ask", "question", "help"],
		label: "/chat",
		mode: "chat",
	},
	{
		action: "newChat",
		description: "Start a new conversation.",
		icon: "create-outline",
		id: "new",
		keywords: ["clear", "reset", "fresh"],
		label: "/new",
	},
	{
		description: "Find missing tickets, IDs and confirmations.",
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
		description: "Draft or change the day-by-day plan.",
		icon: "calendar-outline",
		id: "itinerary",
		keywords: ["wanderlog", "route", "days", "stops", "replan"],
		label: "/itinerary",
		mode: "trip",
		prompt:
			"Generate a simple itinerary draft for this trip with days, time blocks, places, meals, transfers, and realistic pacing.",
		requiresTrip: true,
	},
	{
		description: "Show spent, left and the daily amount.",
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
		description: "List what is still to do before the trip.",
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
		description: "Draft a new trip from this chat.",
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
	shadowColor: "#000000",
	shadowOffset: { height: 4, width: 0 },
	shadowOpacity: 0.08,
	shadowRadius: 12,
} satisfies StyleProp<ViewStyle>;

export const questionCardStyle = {
	borderCurve: "continuous",
} satisfies StyleProp<ViewStyle>;
