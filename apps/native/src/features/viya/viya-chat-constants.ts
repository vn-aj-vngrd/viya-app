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
export const bulletLinePattern = /^[-*]\s+(.+)$/;
export const headingLinePattern = /^(#{1,4})\s+(.+)$/;
export const inlineMarkdownTokenPattern =
	/(`[^`]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
export const numberedLinePattern = /^\d+\.\s+(.+)$/;
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
export const composerInputMinHeight = 44;
export const expandedComposerInputMaxHeight = 360;
export const expandedComposerInputMinHeight = 220;
export const responseAnchorEstimatedContentHeight = 150;
export const responseAnchorMinimumSpacerHeight = 180;

export const CHAT_MODE_OPTIONS = [
	{
		accent: "#0A84FF",
		description: "General answers for ideas, questions, and prep checks.",
		emptyDescription:
			"Ask Viya to dream, plan, prepare, track, or turn your trip into a story.",
		emptyTitle: "Where should we go next?",
		icon: "chatbubble-ellipses-outline",
		id: "chat",
		label: "Chat",
		placeholder: "Message Viya",
		soft: "rgba(10, 132, 255, 0.12)",
	},
	{
		accent: "#BF5AF2",
		description: "Guided trip planning, one decision at a time.",
		emptyDescription:
			"Build routes, compare options, shape budgets, and pressure-test timing before you book.",
		emptyTitle: "Let's shape the plan",
		icon: "map-outline",
		id: "plan",
		label: "Plan",
		placeholder: "Ask Viya to plan",
		soft: "rgba(191, 90, 242, 0.12)",
	},
	{
		accent: "#FF9F0A",
		description: "Chat with an existing trip, readiness, vault, and itinerary.",
		emptyDescription:
			"Use Trip mode for readiness gaps, bookings, documents, routes, delays, risks, and day-of decisions.",
		emptyTitle: "Ask about your active trip",
		icon: "briefcase-outline",
		id: "trip",
		label: "Trip",
		placeholder: "Ask about this trip",
		requiresTrip: true,
		soft: "rgba(255, 159, 10, 0.14)",
	},
] as const satisfies readonly ChatModeOption[];

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
		accent: "#FF9F0A",
		icon: "shield-checkmark-outline",
		prompt:
			"What are the biggest readiness gaps for this trip, and what should I fix first?",
		soft: "rgba(255, 159, 10, 0.14)",
		summary: "Find what needs attention first.",
		title: "Check readiness",
	},
	{
		accent: "#0A84FF",
		icon: "time-outline",
		prompt:
			"If we get delayed, what parts of this trip are most sensitive to timing?",
		soft: "rgba(10, 132, 255, 0.12)",
		summary: "Spot brittle timing assumptions.",
		title: "Stress-test timing",
	},
	{
		accent: "#30D158",
		icon: "bag-check-outline",
		prompt: "What should I have ready before leaving for this trip?",
		soft: "rgba(48, 209, 88, 0.12)",
		summary: "Prepare the essentials.",
		title: "Pre-trip check",
	},
	{
		accent: "#BF5AF2",
		icon: "navigate-outline",
		prompt:
			"What should I do next on this trip if I want the lowest-friction option?",
		soft: "rgba(191, 90, 242, 0.12)",
		summary: "Choose the easiest next move.",
		title: "Next best move",
	},
] as const satisfies readonly PromptSuggestion[];

export const SLASH_COMMAND_OPTIONS = [
	{
		accent: "#0A84FF",
		description: "Switch to general chat.",
		icon: "chatbubble-ellipses-outline",
		id: "chat",
		keywords: ["general", "ask", "question"],
		label: "/chat",
		mode: "chat",
	},
	{
		accent: "#BF5AF2",
		description: "Switch to guided planning.",
		icon: "map-outline",
		id: "plan",
		keywords: ["planning", "intake", "itinerary"],
		label: "/plan",
		mode: "plan",
	},
	{
		accent: "#FF9F0A",
		description: "Switch to the active trip workspace.",
		icon: "briefcase-outline",
		id: "trip",
		keywords: ["travel", "current", "context"],
		label: "/trip",
		mode: "trip",
		requiresTrip: true,
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
		description: "Ask what needs fixing before departure.",
		icon: "shield-checkmark-outline",
		id: "readiness",
		keywords: ["checklist", "gaps", "documents", "booking"],
		label: "/readiness",
		mode: "trip",
		prompt:
			"What are the biggest readiness gaps for this trip, and what should I fix first?",
		requiresTrip: true,
	},
	{
		accent: "#0A84FF",
		description: "Find timing risks and backup moves.",
		icon: "time-outline",
		id: "delay",
		keywords: ["late", "timing", "backup", "replan"],
		label: "/delay",
		mode: "trip",
		prompt:
			"If we get delayed, what parts of this trip are most sensitive to timing?",
		requiresTrip: true,
	},
	{
		accent: "#30D158",
		description: "Prepare a practical departure checklist.",
		icon: "bag-check-outline",
		id: "packing",
		keywords: ["pack", "bag", "before leaving", "departure"],
		label: "/packing",
		mode: "trip",
		prompt: "What should I have ready before leaving for this trip?",
		requiresTrip: true,
	},
	{
		accent: "#BF5AF2",
		description: "Start planning with one question at a time.",
		icon: "help-circle-outline",
		id: "ask",
		keywords: ["questions", "guided", "intake"],
		label: "/ask",
		mode: "plan",
		prompt:
			"Help me plan a trip. Ask me one question at a time before drafting it.",
	},
] as const satisfies readonly SlashCommandOption[];

export const composerStyle = {
	boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
} satisfies StyleProp<ViewStyle>;
