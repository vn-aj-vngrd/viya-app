import type { useUIMessages } from "@convex-dev/agent/react";
import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type SuggestionIconName = ComponentProps<typeof Ionicons>["name"];
export type ChatModeId = "chat" | "plan" | "trip";
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
