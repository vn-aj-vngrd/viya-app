import type { useUIMessages } from "@convex-dev/agent/react";
import type { Ionicons } from "@expo/vector-icons";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { ComponentProps } from "react";

export type SuggestionIconName = ComponentProps<typeof Ionicons>["name"];
export type ChatModeId = "plan" | "trip";
export type ThreadIdsByContext = Record<string, string>;
export type UiChatMessages = NonNullable<
	ReturnType<typeof useUIMessages>["results"]
>;
export type ReturnTabName = "index" | "trips";

export interface PromptSuggestion {
	accent: string;
	icon: SuggestionIconName;
	prompt: string;
	soft: string;
	summary?: string;
	title: string;
}

export interface ChatModeOption {
	accent: string;
	description: string;
	emptyDescription: string;
	emptyTitle: string;
	icon: SuggestionIconName;
	id: ChatModeId;
	label: string;
	placeholder: string;
	requiresTrip?: boolean;
	soft: string;
}

export interface ChatHistoryItem {
	_id: Id<"chatThreads">;
	createdAt: number;
	messageCount: number;
	mode: ChatModeId;
	preview: string | null;
	threadId: string;
	title: string;
	tripDestination: string | null;
	tripId: Id<"trips"> | null;
	tripTitle: string | null;
	updatedAt: number;
}

export interface ChatTripContextItem {
	_id: Id<"trips">;
	destination: string;
	endDate: string;
	isDemo: boolean;
	readinessScore: number;
	startDate: string;
	status: string;
	title: string;
}

export interface ChatQuestionOption {
	id: string;
	label: string;
	value: string;
}

export interface ChatQuestionPrompt {
	_id: Id<"chatQuestionPrompts">;
	assistantMessageId: string;
	createdAt: number;
	mode: ChatModeId;
	options: ChatQuestionOption[];
	question: string;
	stepLabel: string | null;
	threadId: string;
	updatedAt: number;
}

export interface ActiveSlashCommand {
	endIndex: number;
	query: string;
	startIndex: number;
}

export interface SlashCommandOption {
	accent: string;
	action?: "newChat";
	description: string;
	icon: SuggestionIconName;
	id: string;
	keywords: readonly string[];
	label: string;
	mode?: ChatModeId;
	prompt?: string;
	requiresTrip?: boolean;
}

export type TripBlueprintSectionId =
	| "destination"
	| "route"
	| "dates"
	| "budget"
	| "itineraryStyle"
	| "bookingTargets"
	| "requirements"
	| "risks"
	| "nextActions";

export interface TripBlueprintSection {
	id: TripBlueprintSectionId;
	items: string[];
	label: string;
}

export interface TripBlueprint {
	sections: TripBlueprintSection[];
	summary: string | null;
	title: string;
}

export interface TripBlueprintCreateInput {
	bookingTargets: string[];
	budgetAllocation: string[];
	dates: string[];
	destination: string;
	itineraryStyle: string[];
	nextActions: string[];
	requirements: string[];
	risks: string[];
	route: string[];
	title: string;
}

export type TripBlueprintAction =
	| "refineBudget"
	| "adjustItinerary"
	| "reviewRisks";

export type MarkdownBlock =
	| {
			id: string;
			level: number;
			text: string;
			type: "heading";
	  }
	| {
			id: string;
			text: string;
			type: "paragraph";
	  }
	| {
			id: string;
			items: string[];
			type: "bulletList" | "numberedList";
	  }
	| {
			id: string;
			type: "rule";
	  }
	| {
			headers: string[];
			id: string;
			rows: string[][];
			type: "table";
	  };

export interface InlineMarkdownPart {
	code?: boolean;
	emphasis?: boolean;
	id: string;
	strong?: boolean;
	text: string;
}

export interface ParsedMarkdownBlock {
	block: MarkdownBlock;
	nextIndex: number;
}
