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
	UiChatMessages,
} from "./viya-chat-types";

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
