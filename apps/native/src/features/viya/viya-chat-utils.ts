import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import type { MenuKey } from "heroui-native";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

import {
	activeThreadsStorageKey,
	CHAT_MODE_OPTIONS,
	planPromptSuggestions,
	rgbColorPattern,
	SLASH_COMMAND_OPTIONS,
	slashCommandTokenPattern,
	tripPromptSuggestions,
} from "./viya-chat-constants";
import type {
	ActiveSlashCommand,
	ChatModeId,
	PromptSuggestion,
	SlashCommandOption,
	ThreadIdsByContext,
	TripBlueprint,
	TripBlueprintAction,
	TripBlueprintCreateInput,
	TripBlueprintSection,
	TripBlueprintSectionId,
	UiChatMessages,
} from "./viya-chat-types";

const tripBlueprintHeadingPattern =
	/^\s*#{1,3}\s+(?:trip\s+)?blueprint\b[:\s-]*/i;
const markdownHeadingPattern = /^\s*#{1,4}\s+(.+?)\s*$/;
const markdownListPrefixPattern = /^\s*(?:[-*]\s+|\d+[.)]\s+)(.+?)\s*$/;
const markdownControlCharacterPattern = /[*_`]/g;
const planningQuestionMarkerPattern =
	/(^|\n)\s*(?:#{1,4}\s+)?\**Question\s+\d+\s*\/\s*\d+\**\b/gim;
const trailingColonPattern = /:$/;
const lineBreakPattern = /\r\n|\r|\n/g;
const whitespacePattern = /\s+/g;

const tripBlueprintSectionOrder = [
	"destination",
	"route",
	"dates",
	"budget",
	"itineraryStyle",
	"bookingTargets",
	"requirements",
	"risks",
	"nextActions",
] as const satisfies readonly TripBlueprintSectionId[];

const tripBlueprintSectionLabels = {
	bookingTargets: "Booking targets",
	budget: "Budget allocation",
	dates: "Dates",
	destination: "Destination",
	itineraryStyle: "Itinerary style",
	nextActions: "Next actions",
	requirements: "Requirements",
	risks: "Risks",
	route: "Route",
} as const satisfies Record<TripBlueprintSectionId, string>;

const tripBlueprintSectionAliases = new Map<string, TripBlueprintSectionId>([
	["booking target", "bookingTargets"],
	["booking targets", "bookingTargets"],
	["bookings", "bookingTargets"],
	["budget", "budget"],
	["budget allocation", "budget"],
	["costs", "budget"],
	["dates", "dates"],
	["destination", "destination"],
	["destinations", "destination"],
	["itinerary", "itineraryStyle"],
	["itinerary style", "itineraryStyle"],
	["next action", "nextActions"],
	["next actions", "nextActions"],
	["requirements", "requirements"],
	["route", "route"],
	["risks", "risks"],
	["style", "itineraryStyle"],
]);

const fallbackTripDestination = "Planned trip";

export const getColorWithOpacity = (color: string, opacity: number) => {
	if (color.startsWith("#") && color.length === 7) {
		const alpha = Math.round(opacity * 255)
			.toString(16)
			.padStart(2, "0");

		return `${color}${alpha}`;
	}

	const rgbMatch = rgbColorPattern.exec(color);

	if (rgbMatch) {
		const [, red, green, blue] = rgbMatch;

		return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
	}

	return color;
};

export const getUserBubbleStyle = (primaryColor: string) =>
	({
		backgroundColor: getColorWithOpacity(primaryColor, 0.12),
		borderBottomRightRadius: 8,
		borderRadius: 24,
	}) satisfies StyleProp<ViewStyle>;

export const getChatModeOption = (mode: ChatModeId) =>
	CHAT_MODE_OPTIONS.find((option) => option.id === mode) ??
	CHAT_MODE_OPTIONS[0];

export const isChatModeId = (value: MenuKey): value is ChatModeId =>
	CHAT_MODE_OPTIONS.some((option) => option.id === value);

export const getThreadContextKey = (
	mode: ChatModeId,
	tripId: Id<"trips"> | null
) => {
	if (mode === "trip" && tripId) {
		return `trip:${tripId}`;
	}

	return mode;
};

export const getActiveSlashCommand = (
	value: string
): ActiveSlashCommand | null => {
	const match = value.match(slashCommandTokenPattern);

	if (!match) {
		return null;
	}

	const startIndex = (match.index ?? 0) + match[1].length;

	return {
		endIndex: value.length,
		query: match[2].toLowerCase(),
		startIndex,
	};
};

const replaceSlashCommandToken = (
	value: string,
	activeSlashCommand: ActiveSlashCommand,
	replacement: string
) =>
	`${value.slice(0, activeSlashCommand.startIndex)}${replacement}${value.slice(activeSlashCommand.endIndex)}`;

const getSlashCommandMatches = (query: string) => {
	const normalizedQuery = query.toLowerCase();

	if (!normalizedQuery) {
		return SLASH_COMMAND_OPTIONS;
	}

	return SLASH_COMMAND_OPTIONS.filter((command) =>
		[command.label.slice(1), command.description, ...command.keywords].some(
			(value) => value.toLowerCase().includes(normalizedQuery)
		)
	);
};

export const getVisibleSlashCommands = (
	activeSlashCommand: ActiveSlashCommand | null
) =>
	activeSlashCommand
		? getSlashCommandMatches(activeSlashCommand.query).slice(0, 7)
		: [];

export const getMessageQueryArgs = (threadId: string | null) =>
	threadId ? { threadId } : "skip";

export const getUiMessageText = (message: {
	parts?: Array<{ text?: string; type: string }>;
}) =>
	(message.parts ?? [])
		.map((part) => (part.type === "text" ? (part.text ?? "") : ""))
		.join("")
		.trim();

export const getNormalizedChatInput = (value: string) =>
	value.replace(whitespacePattern, " ").trim();

export const getChatInputLineCount = (value: string) =>
	value ? value.split(lineBreakPattern).length : 0;

export const getSingleQuestionDisplayText = (text: string) => {
	const questionMatches = Array.from(
		text.matchAll(planningQuestionMarkerPattern)
	);

	if (questionMatches.length <= 1) {
		return text;
	}

	const secondQuestionIndex = questionMatches[1].index ?? text.length;

	return text.slice(0, secondQuestionIndex).trim();
};

const cleanBlueprintLine = (value: string) => {
	const listMatch = markdownListPrefixPattern.exec(value);
	const cleanedValue = listMatch?.[1] ?? value;

	return cleanedValue
		.replace(markdownControlCharacterPattern, "")
		.replace(/\s+/g, " ")
		.trim();
};

const normalizeBlueprintSectionHeading = (
	value: string
): TripBlueprintSectionId | null => {
	const headingMatch = markdownHeadingPattern.exec(value);
	const headingText = (headingMatch?.[1] ?? value)
		.replace(markdownControlCharacterPattern, "")
		.replace(trailingColonPattern, "")
		.trim()
		.toLowerCase();

	return tripBlueprintSectionAliases.get(headingText) ?? null;
};

export const extractTripBlueprint = (text: string): TripBlueprint | null => {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	const blueprintHeadingIndex = lines.findIndex((line) =>
		tripBlueprintHeadingPattern.test(line)
	);

	if (blueprintHeadingIndex < 0) {
		return null;
	}

	const sectionItems = new Map<TripBlueprintSectionId, string[]>();
	const summaryLines: string[] = [];
	let currentSectionId: TripBlueprintSectionId | null = null;

	for (const line of lines.slice(blueprintHeadingIndex + 1)) {
		const trimmedLine = line.trim();

		if (!trimmedLine) {
			continue;
		}

		const nextSectionId = normalizeBlueprintSectionHeading(trimmedLine);

		if (nextSectionId) {
			currentSectionId = nextSectionId;
			continue;
		}

		const cleanedLine = cleanBlueprintLine(trimmedLine);

		if (!cleanedLine) {
			continue;
		}

		if (!currentSectionId) {
			summaryLines.push(cleanedLine);
			continue;
		}

		const items = sectionItems.get(currentSectionId) ?? [];
		items.push(cleanedLine);
		sectionItems.set(currentSectionId, items);
	}

	const sections: TripBlueprintSection[] = tripBlueprintSectionOrder
		.map((sectionId) => ({
			id: sectionId,
			items: sectionItems.get(sectionId) ?? [],
			label: tripBlueprintSectionLabels[sectionId],
		}))
		.filter((section) => section.items.length > 0);

	if (sections.length < 3) {
		return null;
	}

	return {
		sections,
		summary: summaryLines.slice(0, 2).join(" ") || null,
		title: "Trip Blueprint",
	};
};

export const getTripBlueprintActionPrompt = (
	action: TripBlueprintAction,
	blueprint: TripBlueprint
) => {
	const blueprintSummary = blueprint.sections
		.map((section) => `${section.label}: ${section.items.join("; ")}`)
		.join("\n");

	const actionInstructions = {
		adjustItinerary:
			"Refine this Trip Blueprint with a clearer route and itinerary style. Keep timing, rest, and transfers realistic.",
		refineBudget:
			"Refine this Trip Blueprint with a clearer budget allocation and trade-offs. Keep the same destination and dates unless I say otherwise.",
		reviewRisks:
			"Pressure-test this Trip Blueprint. Tighten the requirements, risks, backup moves, and next actions.",
	} as const satisfies Record<TripBlueprintAction, string>;

	return `${actionInstructions[action]}\n\nCurrent blueprint:\n${blueprintSummary}`;
};

const getBlueprintSectionItems = (
	blueprint: TripBlueprint,
	sectionId: TripBlueprintSectionId
) =>
	blueprint.sections.find((section) => section.id === sectionId)?.items ?? [];

export const getTripBlueprintCreateInput = (
	blueprint: TripBlueprint
): TripBlueprintCreateInput => {
	const destination =
		getBlueprintSectionItems(blueprint, "destination")[0] ??
		fallbackTripDestination;

	return {
		bookingTargets: getBlueprintSectionItems(blueprint, "bookingTargets"),
		budgetAllocation: getBlueprintSectionItems(blueprint, "budget"),
		dates: getBlueprintSectionItems(blueprint, "dates"),
		destination,
		itineraryStyle: getBlueprintSectionItems(blueprint, "itineraryStyle"),
		nextActions: getBlueprintSectionItems(blueprint, "nextActions"),
		requirements: getBlueprintSectionItems(blueprint, "requirements"),
		risks: getBlueprintSectionItems(blueprint, "risks"),
		route: getBlueprintSectionItems(blueprint, "route"),
		title: `${destination} Trip`,
	};
};

export const hasPersistedUserMessage = (
	messages: UiChatMessages | undefined,
	pendingPrompt: string | null
) =>
	Boolean(
		pendingPrompt &&
			messages?.some(
				(message) =>
					message.role === "user" && getUiMessageText(message) === pendingPrompt
			)
	);

export const hasAssistantMessageAfter = (
	messages: UiChatMessages | undefined,
	messageCount: number | null
) =>
	messageCount !== null &&
	(messages ?? [])
		.slice(messageCount)
		.some((message) => message.role !== "user");

export const applySlashCommandSelection = ({
	activeSlashCommand,
	command,
	input,
	onInputChange,
	onModeSelect,
	onNewChat,
}: {
	activeSlashCommand: ActiveSlashCommand | null;
	command: SlashCommandOption;
	input: string;
	onInputChange: (value: string) => void;
	onModeSelect: (mode: ChatModeId) => void;
	onNewChat: () => void;
}) => {
	if (command.action === "newChat") {
		onNewChat();
		return;
	}

	if (command.mode) {
		onModeSelect(command.mode);
	}

	if (!activeSlashCommand) {
		return;
	}

	onInputChange(
		replaceSlashCommandToken(input, activeSlashCommand, command.prompt ?? "")
	);
};

export const getPromptSuggestions = (
	mode: ChatModeId,
	preferenceSuggestions: PromptSuggestion[]
) => {
	if (mode === "plan") {
		return planPromptSuggestions;
	}

	if (mode === "trip") {
		return tripPromptSuggestions;
	}

	return preferenceSuggestions;
};

const isThreadIdsByContext = (value: unknown): value is ThreadIdsByContext => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const threadIds = value as Record<string, unknown>;

	return Object.values(threadIds).every(
		(threadId) => typeof threadId === "string"
	);
};

export const getStoredThreadIdsByContext =
	async (): Promise<ThreadIdsByContext> => {
		try {
			const storedValue =
				Platform.OS === "web"
					? globalThis.localStorage?.getItem(activeThreadsStorageKey)
					: await getItemAsync(activeThreadsStorageKey);

			if (!storedValue) {
				return {};
			}

			const parsedValue: unknown = JSON.parse(storedValue);
			return isThreadIdsByContext(parsedValue) ? parsedValue : {};
		} catch {
			return {};
		}
	};

export const persistStoredThreadIdsByContext = async (
	threadIds: ThreadIdsByContext
) => {
	try {
		const storedValue = JSON.stringify(threadIds);

		if (Platform.OS === "web") {
			globalThis.localStorage?.setItem(activeThreadsStorageKey, storedValue);
			return;
		}

		await setItemAsync(activeThreadsStorageKey, storedValue);
	} catch {
		return;
	}
};

export const removeStoredThreadIdsByContext = async () => {
	try {
		if (Platform.OS === "web") {
			globalThis.localStorage?.removeItem(activeThreadsStorageKey);
			return;
		}

		await deleteItemAsync(activeThreadsStorageKey);
	} catch {
		return;
	}
};

export const runAsyncTask = (task: Promise<unknown>) => {
	task.then(() => undefined);
};
