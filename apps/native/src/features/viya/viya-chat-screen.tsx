import { useUIMessages } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getPreferenceSuggestions } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	ScrollShadow,
	Spinner,
	Surface,
	Text,
	useThemeColor,
} from "heroui-native";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	type ScrollView as NativeScrollView,
	Text as NativeText,
	Platform,
	Pressable,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import { TripSyncReviewSheet } from "@/src/features/vault/tripsync-review-sheet";
import type { PendingTripSyncReview } from "@/src/features/vault/tripsync-types";
import { useVaultUpload } from "@/src/features/vault/use-vault-upload";

import {
	ChatHistorySheet,
	ChatModeSelector,
	DraftBlueprintShortcut,
	HeaderActionGroup,
	QuestionOptionsDock,
	SlashCommandMenu,
	TripContextSheet,
	ViyaChatEmptyContent,
	ViyaMessageList,
	ViyaPromptSuggestionsCard,
} from "./viya-chat-components";
import { getComposerInputLayout } from "./viya-chat-composer";
import {
	chatInputMaxLength,
	chatInputMaxLines,
	chatInputWarningThreshold,
	composerInputMaxHeight,
	composerInputMinHeight,
	composerStyle,
	expandedComposerInputMinHeight,
} from "./viya-chat-constants";
import type {
	ChatHistoryItem,
	ChatModeId,
	PromptSuggestion,
	SlashCommandOption,
	SuggestionIconName,
	ThreadIdsByContext,
	TripBlueprint,
	TripBlueprintCreateInput,
} from "./viya-chat-types";
import {
	applySlashCommandSelection,
	getActiveSlashCommand,
	getChatInputLineCount,
	getChatModeOption,
	getDraftTripBlueprintPrompt,
	getMessageQueryArgs,
	getNormalizedChatInput,
	getPromptSuggestions,
	getSelectableTripContexts,
	getSelectedTripContext,
	getStoredThreadIdsByContext,
	getThreadContextKey,
	getTripBlueprintCreateInput,
	getUiMessageText,
	getVisibleSlashCommands,
	getViyaBackRoute,
	hasAssistantMessageAfter,
	hasPersistedUserMessage,
	isCurrentChatRequest,
	persistStoredThreadIdsByContext,
	removeStoredThreadIdsByContext,
	runAsyncTask,
	shouldPopViyaBackRoute,
} from "./viya-chat-utils";

const getThreadIdsAfterTripCreate = ({
	threadContextKey,
	threadId,
	threadIdsByContext,
	tripId,
}: {
	threadContextKey: string;
	threadId: string | null;
	threadIdsByContext: ThreadIdsByContext;
	tripId: Id<"trips">;
}) => {
	if (!threadId) {
		return threadIdsByContext;
	}

	const tripContextKey = getThreadContextKey("trip", tripId);
	const nextThreadIds = {
		...threadIdsByContext,
		[tripContextKey]: threadId,
	};
	delete nextThreadIds[threadContextKey];

	return nextThreadIds;
};

const composerInputLineHeight = 21;
const composerInputPaddingBottom = 9;
const composerInputPaddingTop = 11;
const expandedComposerChromeReserve = 260;
const chatScrollContentBottomPadding = 18;
const chatScrollShadowBottomBleed = 12;
const chatScrollShadowTopBleed = 20;

const getSearchParamValue = (value?: string | string[]) =>
	Array.isArray(value) ? value[0] : value;

const getInitialChatMode = ({
	requestedMode,
	routeTripId,
}: {
	requestedMode?: string;
	routeTripId?: Id<"trips">;
}): ChatModeId => {
	if (requestedMode === "trip" || routeTripId) {
		return "trip";
	}

	if (requestedMode === "plan") {
		return "plan";
	}

	return "chat";
};

const getChatInputError = ({
	chatMode,
	currentTripId,
	isAwaitingViya,
	rawValue,
	value,
}: {
	chatMode: ChatModeId;
	currentTripId: Id<"trips"> | null;
	isAwaitingViya: boolean;
	rawValue: string;
	value: string;
}) => {
	if (!value) {
		return "empty";
	}

	if (isAwaitingViya) {
		return "Wait for Viya to finish this response before sending another message.";
	}

	if (value.length > chatInputMaxLength) {
		return `Keep messages under ${chatInputMaxLength.toLocaleString()} characters.`;
	}

	if (getChatInputLineCount(rawValue) > chatInputMaxLines) {
		return `Keep pasted messages to ${chatInputMaxLines} lines or fewer.`;
	}

	if (chatMode === "trip" && !currentTripId) {
		return "Create a trip first to use Trip mode.";
	}

	return null;
};

interface BlueprintTripCreatorOptions {
	createTripFromBlueprint: (
		input: TripBlueprintCreateInput
	) => Promise<{ tripId: Id<"trips"> }>;
	linkThreadToTrip: (args: {
		threadId: string;
		tripId: Id<"trips">;
	}) => Promise<unknown>;
	onAwaitingAssistantMessageCountChange: (messageCount: number | null) => void;
	onChatModeChange: (mode: ChatModeId) => void;
	onCreatedTripIdChange: (tripId: Id<"trips">) => void;
	onCreatingChange: (isCreating: boolean) => void;
	onErrorMessageChange: (message: string | null) => void;
	onNoticeMessageChange: (message: string | null) => void;
	onThreadIdsChange: (threadIds: ThreadIdsByContext) => void;
	threadContextKey: string;
	threadId: string | null;
	threadIdsByContext: ThreadIdsByContext;
}

interface ModeSelectHandlerOptions {
	currentTripId: Id<"trips"> | null;
	onAwaitingAssistantMessageCountChange: (messageCount: number | null) => void;
	onChatModeChange: (mode: ChatModeId) => void;
	onErrorMessageChange: (message: string | null) => void;
	onModeMenuOpenChange: (isOpen: boolean) => void;
	onNoticeMessageChange: (message: string | null) => void;
}

const createModeSelectHandler =
	({
		currentTripId,
		onAwaitingAssistantMessageCountChange,
		onChatModeChange,
		onErrorMessageChange,
		onModeMenuOpenChange,
		onNoticeMessageChange,
	}: ModeSelectHandlerOptions) =>
	(mode: ChatModeId) => {
		if (mode === "trip" && !currentTripId) {
			onErrorMessageChange("Create a trip first to use Trip mode.");
			onModeMenuOpenChange(false);
			return;
		}

		onChatModeChange(mode);
		onModeMenuOpenChange(false);
		onErrorMessageChange(null);
		onNoticeMessageChange(null);
		onAwaitingAssistantMessageCountChange(null);
	};

const createBlueprintTripHandler =
	({
		createTripFromBlueprint,
		linkThreadToTrip,
		onAwaitingAssistantMessageCountChange,
		onChatModeChange,
		onCreatedTripIdChange,
		onCreatingChange,
		onErrorMessageChange,
		onNoticeMessageChange,
		onThreadIdsChange,
		threadContextKey,
		threadId,
		threadIdsByContext,
	}: BlueprintTripCreatorOptions) =>
	async (blueprint: TripBlueprint) => {
		onCreatingChange(true);
		onErrorMessageChange(null);
		onNoticeMessageChange(null);

		try {
			const result = await createTripFromBlueprint(
				getTripBlueprintCreateInput(blueprint)
			);
			const nextThreadIds = getThreadIdsAfterTripCreate({
				threadContextKey,
				threadId,
				threadIdsByContext,
				tripId: result.tripId,
			});

			if (threadId) {
				await linkThreadToTrip({ threadId, tripId: result.tripId });
			}

			onCreatedTripIdChange(result.tripId);
			onThreadIdsChange(nextThreadIds);
			onChatModeChange("trip");
			onAwaitingAssistantMessageCountChange(null);
			onNoticeMessageChange(
				"Trip created from AI setup. Booking targets were saved as external booking placeholders."
			);
			runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
		} catch (error) {
			onErrorMessageChange(
				error instanceof Error
					? error.message
					: "Viya could not create this trip."
			);
		} finally {
			onCreatingChange(false);
		}
	};

function ComposerTextInput({
	height,
	isEditable,
	isScrollable,
	maxHeight,
	minHeight,
	onChangeText,
	onMeasuredHeightChange,
	onSubmit,
	placeholder,
	placeholderTextColor,
	rightPadding = 0,
	textColor = "#18181B",
	value,
}: {
	height: number;
	isEditable: boolean;
	isScrollable: boolean;
	maxHeight: number;
	minHeight: number;
	onChangeText: (value: string) => void;
	onMeasuredHeightChange: (height: number) => void;
	onSubmit: () => void;
	placeholder: string;
	placeholderTextColor: string;
	rightPadding?: number;
	textColor?: string;
	value: string;
}) {
	const textInputStyle = {
		backgroundColor: "transparent",
		color: textColor,
		fontSize: 15,
		fontWeight: "500" as const,
		height,
		lineHeight: composerInputLineHeight,
		maxHeight,
		minHeight,
		paddingHorizontal: 0,
		paddingRight: rightPadding,
		paddingTop: composerInputPaddingTop,
		paddingBottom: composerInputPaddingBottom,
		textAlignVertical: "top" as const,
		width: "100%" as const,
	};
	const measurementValue = value || " ";

	return (
		<View style={{ height, width: "100%" }}>
			<NativeText
				onLayout={(event) =>
					onMeasuredHeightChange(event.nativeEvent.layout.height)
				}
				pointerEvents="none"
				style={[
					textInputStyle,
					{
						height: undefined,
						maxHeight: undefined,
						minHeight: undefined,
						opacity: 0,
						position: "absolute",
						zIndex: -1,
					},
				]}
			>
				{measurementValue}
			</NativeText>
			<TextInput
				editable={isEditable}
				maxLength={chatInputMaxLength}
				multiline={true}
				onChangeText={onChangeText}
				onContentSizeChange={(event) =>
					onMeasuredHeightChange(event.nativeEvent.contentSize.height)
				}
				onSubmitEditing={onSubmit}
				placeholder={placeholder}
				placeholderTextColor={placeholderTextColor}
				returnKeyType="send"
				scrollEnabled={isScrollable}
				style={textInputStyle}
				submitBehavior="submit"
				value={value}
			/>
		</View>
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Chat screen coordinates streaming, modes, question docks, and blueprint creation until the flow is split into containers.
export function ViyaChatScreen() {
	const router = useRouter();
	const { fromTab, mode, prompt, returnTo, tripId } = useLocalSearchParams<{
		fromTab?: string | string[];
		mode?: string | string[];
		prompt?: string | string[];
		returnTo?: string | string[];
		tripId?: string | string[];
	}>();
	const requestedMode = getSearchParamValue(mode);
	const routePrompt = getSearchParamValue(prompt) ?? "";
	const routeTripId = getSearchParamValue(tripId) as Id<"trips"> | undefined;
	const isTripModeLocked = Boolean(routeTripId);
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const [input, setInput] = useState(routePrompt);
	const [composerContentHeight, setComposerContentHeight] = useState(
		composerInputMinHeight
	);
	const [expandedComposerContentHeight, setExpandedComposerContentHeight] =
		useState(expandedComposerInputMinHeight);
	const [threadIdsByContext, setThreadIdsByContext] =
		useState<ThreadIdsByContext>({});
	const initialMode = getInitialChatMode({ requestedMode, routeTripId });
	const [chatMode, setChatMode] = useState<ChatModeId>(initialMode);
	const [createdTripId, setCreatedTripId] = useState<Id<"trips"> | null>(null);
	const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
	const [isComposerSheetOpen, setIsComposerSheetOpen] = useState(false);
	const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
	const [isTripContextSheetOpen, setIsTripContextSheetOpen] = useState(false);
	const [isCreatingTripFromBlueprint, setIsCreatingTripFromBlueprint] =
		useState(false);
	const [selectedTripId, setSelectedTripId] = useState<Id<"trips"> | null>(
		routeTripId ?? null
	);
	const [isLoading, setIsLoading] = useState(false);
	const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
	const [pendingPromptMessageIndex, setPendingPromptMessageIndex] = useState<
		number | null
	>(null);
	const [awaitingAssistantMessageCount, setAwaitingAssistantMessageCount] =
		useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
	const [pendingVaultReview, setPendingVaultReview] =
		useState<PendingTripSyncReview | null>(null);
	const [isConfirmingVaultUpload, setIsConfirmingVaultUpload] = useState(false);
	const scrollViewRef = useRef<NativeScrollView>(null);
	const chatSessionIdRef = useRef(0);
	const mutedColor = useThemeColor("muted");
	const trips = useQuery(api.trips.listTrips);
	const selectableTripContexts = getSelectableTripContexts(trips);
	const currentTrip = getSelectedTripContext(trips, selectedTripId);
	const currentTripId = currentTrip?._id ?? createdTripId;
	const selectedModeOption = getChatModeOption(chatMode);
	const threadContextKey = getThreadContextKey(chatMode, currentTripId);
	const threadId = threadIdsByContext[threadContextKey] ?? null;
	const preferences = useQuery(api.preferences.getCurrentPreferences);
	const preferencePromptSuggestions = getPreferenceSuggestions(
		preferences ?? {}
	).prompts.map((suggestion) => ({
		...suggestion,
		icon: suggestion.icon as SuggestionIconName,
	})) satisfies PromptSuggestion[];
	const promptSuggestions = getPromptSuggestions(
		chatMode,
		preferencePromptSuggestions
	);
	const activeSlashCommand = getActiveSlashCommand(input);
	const visibleSlashCommands = getVisibleSlashCommands(
		activeSlashCommand,
		isTripModeLocked ? "trip" : undefined
	);
	const backgroundColor = useThemeColor("background");

	const createThread = useMutation(api.chat.createNewThread);
	const createTripFromBlueprint = useMutation(
		api.trips.createTripFromBlueprint
	);
	const dismissPendingQuestion = useMutation(api.chat.dismissPendingQuestion);
	const linkThreadToTrip = useMutation(api.chat.linkThreadToTrip);
	const sendMessage = useMutation(api.chat.sendMessage);
	const confirmTripSyncReview = useMutation(api.vault.confirmTripSyncReview);
	const {
		errorMessage: vaultUploadErrorMessage,
		isUploading: isUploadingVaultFile,
		pickDocument,
	} = useVaultUpload();
	const chatHistoryArgs =
		chatMode === "trip" && currentTripId
			? ({
					limit: 50,
					mode: "trip",
					tripId: currentTripId,
				} as const)
			: ({ limit: 50 } as const);
	const chatHistory = useQuery(api.chat.listHistory, chatHistoryArgs);
	const pendingQuestion = useQuery(api.chat.getPendingQuestion, { threadId });

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		getMessageQueryArgs(threadId),
		{ initialNumItems: 50, stream: true }
	);
	const displayedMessages = threadId ? (messages ?? []) : [];

	const hasStreamingMessage = displayedMessages.some(
		(message) => message.status === "streaming"
	);
	const hasPersistedPendingPrompt = hasPersistedUserMessage(
		displayedMessages,
		pendingPrompt
	);
	const persistedPendingPromptMessageIndex = pendingPrompt
		? displayedMessages.findIndex(
				(message) =>
					message.role === "user" && getUiMessageText(message) === pendingPrompt
			)
		: -1;
	const hasMisorderedPersistedPendingPrompt = Boolean(
		pendingPrompt &&
			pendingPromptMessageIndex !== null &&
			persistedPendingPromptMessageIndex > pendingPromptMessageIndex
	);
	const hasAssistantMessageAfterAwaitStart = hasAssistantMessageAfter(
		displayedMessages,
		awaitingAssistantMessageCount
	);
	const shouldShowThinking = Boolean(
		awaitingAssistantMessageCount !== null &&
			!hasAssistantMessageAfterAwaitStart
	);
	const shouldShowMessages = Boolean(
		displayedMessages.length || pendingPrompt || isLoading || shouldShowThinking
	);
	const isAwaitingViya = Boolean(
		isLoading || shouldShowThinking || hasStreamingMessage
	);
	const shouldShowSlashCommandMenu = Boolean(
		activeSlashCommand && !isAwaitingViya
	);
	const shouldShowEmptySuggestions = Boolean(
		!(shouldShowMessages || input.trim() || shouldShowSlashCommandMenu)
	);
	const shouldShowQuestionCard = Boolean(
		pendingQuestion && !shouldShowSlashCommandMenu
	);
	const hasPlanUserInput = displayedMessages.some(
		(message) => message.role === "user" && getUiMessageText(message)
	);
	const shouldShowDraftBlueprintShortcut = Boolean(
		chatMode === "plan" &&
			hasPlanUserInput &&
			!isAwaitingViya &&
			!shouldShowSlashCommandMenu
	);
	const hasBottomOverlayPanel = Boolean(
		shouldShowSlashCommandMenu ||
			shouldShowEmptySuggestions ||
			shouldShowDraftBlueprintShortcut ||
			shouldShowQuestionCard
	);
	const composerInputLayout = getComposerInputLayout({
		contentHeight: composerContentHeight,
		maxHeight: composerInputMaxHeight,
		minHeight: composerInputMinHeight,
	});
	const expandedComposerEditorMaxHeight = Math.max(
		expandedComposerInputMinHeight,
		windowHeight -
			insets.top -
			Math.max(insets.bottom, 18) -
			expandedComposerChromeReserve
	);
	const expandedComposerEditorLayout = getComposerInputLayout({
		contentHeight: expandedComposerContentHeight,
		maxHeight: expandedComposerEditorMaxHeight,
		minHeight: expandedComposerInputMinHeight,
	});
	const remainingInputCharacters = chatInputMaxLength - input.length;
	const shouldShowInputLimit = input.length >= chatInputWarningThreshold;
	const messageCount = displayedMessages.length;
	const canSendMessage = Boolean(input.trim() && !isAwaitingViya);

	useEffect(() => {
		let isMounted = true;

		const loadStoredThreadIds = async () => {
			const storedThreadIds = await getStoredThreadIdsByContext();

			if (isMounted) {
				setThreadIdsByContext(storedThreadIds);
			}
		};

		runAsyncTask(loadStoredThreadIds());

		return () => {
			isMounted = false;
		};
	}, []);

	useEffect(() => {
		if (isTripModeLocked) {
			if (chatMode !== "trip") {
				setChatMode("trip");
			}
			setErrorMessage(null);
			return;
		}

		if (chatMode === "trip" && trips !== undefined && !currentTripId) {
			setChatMode("chat");
			setErrorMessage("Create a trip first to use Trip mode.");
		}
	}, [chatMode, currentTripId, isTripModeLocked, trips]);

	useEffect(() => {
		if (hasPersistedPendingPrompt && !hasMisorderedPersistedPendingPrompt) {
			setPendingPrompt(null);
			setPendingPromptMessageIndex(null);
		}
	}, [hasMisorderedPersistedPendingPrompt, hasPersistedPendingPrompt]);

	useEffect(() => {
		if (hasAssistantMessageAfterAwaitStart) {
			setAwaitingAssistantMessageCount(null);
		}
	}, [hasAssistantMessageAfterAwaitStart]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: message state changes should scroll the chat to the latest response.
	useEffect(() => {
		scrollViewRef.current?.scrollToEnd({ animated: true });
	}, [messageCount, hasStreamingMessage, pendingPrompt]);

	const isActiveChatSession = (requestSessionId: number) =>
		isCurrentChatRequest({
			activeSessionId: chatSessionIdRef.current,
			requestSessionId,
		});

	const createActiveThreadForSubmit = async (requestSessionId: number) => {
		const createdThreadId = await createThread();

		if (!isActiveChatSession(requestSessionId)) {
			return null;
		}

		const nextThreadIds = {
			...threadIdsByContext,
			[threadContextKey]: createdThreadId,
		};
		setThreadIdsByContext(nextThreadIds);
		runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));

		return createdThreadId;
	};

	const sendChatPrompt = async ({
		requestSessionId,
		value,
	}: {
		requestSessionId: number;
		value: string;
	}) => {
		try {
			let currentThreadId = threadId;

			if (!currentThreadId) {
				const createdThreadId =
					await createActiveThreadForSubmit(requestSessionId);

				if (!createdThreadId) {
					return false;
				}

				currentThreadId = createdThreadId;
			}

			await sendMessage({
				mode: chatMode,
				prompt: value,
				threadId: currentThreadId,
				tripId:
					chatMode === "trip" && currentTripId ? currentTripId : undefined,
			});

			return isActiveChatSession(requestSessionId);
		} catch (error) {
			if (!isActiveChatSession(requestSessionId)) {
				return false;
			}

			setInput(value);
			setPendingPrompt(null);
			setPendingPromptMessageIndex(null);
			setAwaitingAssistantMessageCount(null);
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not send this message."
			);
		} finally {
			if (isActiveChatSession(requestSessionId)) {
				setIsLoading(false);
			}
		}

		return false;
	};

	const handleSubmit = async (prompt?: string) => {
		const requestSessionId = chatSessionIdRef.current;
		const rawValue = prompt ?? input;
		const value = getNormalizedChatInput(rawValue);
		const inputError = getChatInputError({
			chatMode,
			currentTripId,
			isAwaitingViya,
			rawValue,
			value,
		});

		if (inputError) {
			if (inputError !== "empty") {
				setErrorMessage(inputError);
			}
			return false;
		}

		setErrorMessage(null);
		setNoticeMessage(null);
		setIsLoading(true);
		setIsModeMenuOpen(false);
		setAwaitingAssistantMessageCount(messageCount);
		setPendingPromptMessageIndex(messageCount);
		setPendingPrompt(value);
		setInput("");
		setComposerContentHeight(composerInputMinHeight);
		setExpandedComposerContentHeight(expandedComposerInputMinHeight);

		return await sendChatPrompt({ requestSessionId, value });
	};

	const handleExpandedComposerSubmit = async () => {
		const didSend = await handleSubmit();

		if (didSend) {
			setIsComposerSheetOpen(false);
		}
	};

	const handleBackPress = () => {
		if (
			shouldPopViyaBackRoute({
				canGoBack: router.canGoBack(),
				returnTo,
			})
		) {
			router.back();
			return;
		}

		router.replace(getViyaBackRoute({ fromTab, returnTo }));
	};

	const handleModeSelect = createModeSelectHandler({
		currentTripId,
		onAwaitingAssistantMessageCountChange: setAwaitingAssistantMessageCount,
		onChatModeChange: (nextMode) => {
			if (isTripModeLocked && nextMode !== "trip") {
				return;
			}

			setChatMode(nextMode);
		},
		onErrorMessageChange: setErrorMessage,
		onModeMenuOpenChange: setIsModeMenuOpen,
		onNoticeMessageChange: setNoticeMessage,
	});

	const handleNewChatPress = () => {
		chatSessionIdRef.current += 1;
		const nextThreadIds = { ...threadIdsByContext };
		delete nextThreadIds[threadContextKey];
		if (pendingQuestion) {
			runAsyncTask(dismissPendingQuestion({ questionId: pendingQuestion._id }));
		}
		setThreadIdsByContext(nextThreadIds);
		setInput("");
		setComposerContentHeight(composerInputMinHeight);
		setExpandedComposerContentHeight(expandedComposerInputMinHeight);
		setIsLoading(false);
		setPendingPrompt(null);
		setPendingPromptMessageIndex(null);
		setAwaitingAssistantMessageCount(null);
		setErrorMessage(null);
		setNoticeMessage(null);
		setIsModeMenuOpen(false);

		if (Object.keys(nextThreadIds).length === 0) {
			runAsyncTask(removeStoredThreadIdsByContext());
			return;
		}

		runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
	};

	const handleAddToTripPress = async () => {
		if (!currentTripId) {
			setErrorMessage("Create a trip before linking chat context.");
			return;
		}

		if (!threadId) {
			setErrorMessage("Send a message before linking chat context.");
			return;
		}

		const tripContextKey = getThreadContextKey("trip", currentTripId);
		const nextThreadIds = {
			...threadIdsByContext,
			[tripContextKey]: threadId,
		};
		delete nextThreadIds[threadContextKey];

		try {
			await linkThreadToTrip({ threadId, tripId: currentTripId });
			setThreadIdsByContext(nextThreadIds);
			setChatMode("trip");
			setErrorMessage(null);
			setNoticeMessage(null);
			setAwaitingAssistantMessageCount(null);
			setPendingPromptMessageIndex(null);
			setIsModeMenuOpen(false);
			runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not link this chat to your trip."
			);
		}
	};

	const handleHistorySelect = (item: ChatHistoryItem) => {
		if (isTripModeLocked && item.mode !== "trip") {
			setErrorMessage("Trip AI stays in Trip mode for this workspace.");
			setIsHistorySheetOpen(false);
			return;
		}

		const historyTripId =
			item.mode === "trip" ? (item.tripId ?? currentTripId) : currentTripId;

		if (item.mode === "trip" && !historyTripId) {
			setErrorMessage("Choose a trip before opening this trip chat.");
			setIsHistorySheetOpen(false);
			return;
		}

		if (item.mode === "trip" && historyTripId) {
			setSelectedTripId(historyTripId);
		}

		const nextContextKey = getThreadContextKey(item.mode, historyTripId);
		const nextThreadIds = {
			...threadIdsByContext,
			[nextContextKey]: item.threadId,
		};

		setThreadIdsByContext(nextThreadIds);
		setChatMode(item.mode);
		setErrorMessage(null);
		setNoticeMessage(null);
		setPendingPrompt(null);
		setPendingPromptMessageIndex(null);
		setAwaitingAssistantMessageCount(null);
		setIsHistorySheetOpen(false);
		setIsModeMenuOpen(false);
		runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
	};

	const handleTripContextSelect = (tripId: Id<"trips">) => {
		setSelectedTripId(tripId);
		setChatMode("trip");
		setErrorMessage(null);
		setNoticeMessage(null);
		setAwaitingAssistantMessageCount(null);
		setPendingPromptMessageIndex(null);
		setIsTripContextSheetOpen(false);
	};

	const handleQuestionOptionSelect = (value: string) => {
		runAsyncTask(handleSubmit(value));
	};

	const handleDraftBlueprintPress = () => {
		runAsyncTask(handleSubmit(getDraftTripBlueprintPrompt()));
	};

	const handleFileUploadPress = async () => {
		setErrorMessage(null);
		setNoticeMessage(null);

		try {
			const review = await pickDocument({
				kind: "document",
				tripId: chatMode === "trip" ? currentTripId : undefined,
			});

			if (!review) {
				return;
			}

			if (chatMode === "trip" && currentTripId) {
				setPendingVaultReview(review);
				return;
			}

			const fileContext = [
				`Uploaded file: ${review.upload.fileName}`,
				`Extracted title: ${review.extraction.extractedTitle}`,
				`Summary: ${review.extraction.summary}`,
				`Document type: ${review.extraction.documentType}`,
				review.extraction.booking
					? `Booking: ${review.extraction.booking.title}`
					: null,
			]
				.filter(Boolean)
				.join("\n");
			const nextInput = input.trim()
				? `${input.trim()}\n\n${fileContext}`
				: `Use this uploaded file context:\n\n${fileContext}`;

			setInput(nextInput);
			setNoticeMessage(
				"File extracted. Viya can use the text summary in this chat."
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not upload this file."
			);
		}
	};

	const handleConfirmVaultUpload = async () => {
		if (!(pendingVaultReview && currentTripId)) {
			return;
		}

		setIsConfirmingVaultUpload(true);
		setErrorMessage(null);
		setNoticeMessage(null);

		try {
			await confirmTripSyncReview({
				extraction: pendingVaultReview.extraction,
				fileName: pendingVaultReview.upload.fileName,
				fileSize: pendingVaultReview.upload.fileSize,
				kind: pendingVaultReview.upload.kind,
				mimeType: pendingVaultReview.upload.mimeType,
				storageId: pendingVaultReview.upload.storageId,
				tripId: currentTripId,
			});
			setPendingVaultReview(null);
			setNoticeMessage(
				"Saved to Vault. Viya extracted the details for trip context."
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not save this file to Vault."
			);
		} finally {
			setIsConfirmingVaultUpload(false);
		}
	};

	const handleComposerTextChange = (value: string) => {
		setInput(value);

		if (!value) {
			setComposerContentHeight(composerInputMinHeight);
			setExpandedComposerContentHeight(expandedComposerInputMinHeight);
		}
	};

	const handleCustomQuestionAnswer = (value: string) => {
		setErrorMessage(null);
		setNoticeMessage(null);
		runAsyncTask(handleSubmit(value));
	};

	const handleSlashCommandSelect = (command: SlashCommandOption) => {
		if (isTripModeLocked && command.mode && command.mode !== "trip") {
			setErrorMessage("Trip AI stays in Trip mode for this workspace.");
			return;
		}

		setErrorMessage(null);
		setNoticeMessage(null);
		setIsModeMenuOpen(false);
		applySlashCommandSelection({
			activeSlashCommand,
			command,
			input,
			onInputChange: setInput,
			onModeSelect: setChatMode,
			onNewChat: handleNewChatPress,
		});
	};

	const handleCreateTripFromBlueprint = createBlueprintTripHandler({
		createTripFromBlueprint,
		linkThreadToTrip,
		onAwaitingAssistantMessageCountChange: setAwaitingAssistantMessageCount,
		onChatModeChange: setChatMode,
		onCreatedTripIdChange: (tripId) => {
			setCreatedTripId(tripId);
			setSelectedTripId(tripId);
		},
		onCreatingChange: setIsCreatingTripFromBlueprint,
		onErrorMessageChange: setErrorMessage,
		onNoticeMessageChange: setNoticeMessage,
		onThreadIdsChange: setThreadIdsByContext,
		threadContextKey,
		threadId,
		threadIdsByContext,
	});
	const currentTripChip =
		chatMode === "trip" && currentTrip ? (
			<Pressable
				accessibilityLabel={`Current trip context is ${currentTrip.title}`}
				accessibilityRole="button"
				className="min-w-0 flex-row items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-2"
				onPress={() => setIsTripContextSheetOpen(true)}
			>
				<Ionicons color="#FF9F0A" name="briefcase-outline" size={14} />
				<Text
					adjustsFontSizeToFit={true}
					numberOfLines={1}
					style={{ color: "#9A5A00", maxWidth: 120 }}
					type="body-sm"
					weight="bold"
				>
					{currentTrip.title}
				</Text>
			</Pressable>
		) : null;

	return (
		<Container isScrollable={false}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<View
					className="flex-1 overflow-hidden px-4 pb-4"
					style={{ backgroundColor, paddingTop: insets.top + 10 }}
				>
					<View
						className="mb-5 flex-row items-center justify-between"
						style={{ zIndex: 30 }}
					>
						<View className="flex-row items-center gap-3">
							<NavigationBackButton
								accessibilityLabel="Back to previous tab"
								onPress={handleBackPress}
							/>
							{currentTripChip ?? (
								<ChatModeSelector
									currentTripId={currentTripId}
									isLocked={isTripModeLocked}
									isOpen={isModeMenuOpen}
									onOpenChange={setIsModeMenuOpen}
									onSelect={handleModeSelect}
									selectedMode={chatMode}
									threadIdsByContext={threadIdsByContext}
								/>
							)}
						</View>
						<HeaderActionGroup
							currentThreadId={threadId}
							currentTripId={currentTripId}
							onAddToTripPress={handleAddToTripPress}
							onHistoryPress={() => setIsHistorySheetOpen(true)}
							onNewChatPress={handleNewChatPress}
							threadIdsByContext={threadIdsByContext}
						/>
					</View>

					<ScrollShadow
						className="flex-1"
						color={backgroundColor}
						LinearGradientComponent={LinearGradient}
						size={36}
						style={{
							marginBottom: hasBottomOverlayPanel
								? 0
								: -chatScrollShadowBottomBleed,
							marginTop: -chatScrollShadowTopBleed,
						}}
					>
						<Animated.ScrollView
							className="flex-1"
							contentContainerStyle={{
								flexGrow: 1,
								justifyContent: shouldShowMessages ? undefined : "center",
								paddingBottom:
									chatScrollContentBottomPadding +
									(hasBottomOverlayPanel ? 0 : chatScrollShadowBottomBleed),
								paddingTop: chatScrollShadowTopBleed,
							}}
							key={`${threadContextKey}:${threadId ?? "new"}`}
							keyboardShouldPersistTaps="handled"
							ref={scrollViewRef}
							showsVerticalScrollIndicator={false}
						>
							{shouldShowMessages ? (
								<ViyaMessageList
									hasPersistedPendingPrompt={hasPersistedPendingPrompt}
									isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
									messages={displayedMessages}
									onCreateTripFromBlueprint={handleCreateTripFromBlueprint}
									onSubmitBlueprintAction={handleSubmit}
									pendingPrompt={pendingPrompt}
									pendingPromptMessageIndex={pendingPromptMessageIndex}
									shouldShowThinking={shouldShowThinking}
								/>
							) : (
								<ViyaChatEmptyContent selectedModeOption={selectedModeOption} />
							)}
						</Animated.ScrollView>
					</ScrollShadow>

					{errorMessage ? (
						<Text className="mb-3 text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}

					{noticeMessage ? (
						<Text className="mb-3 text-success" type="body-sm">
							{noticeMessage}
						</Text>
					) : null}

					{shouldShowSlashCommandMenu ? (
						<SlashCommandMenu
							currentTripId={currentTripId}
							onSelect={handleSlashCommandSelect}
							visibleCommands={visibleSlashCommands}
						/>
					) : null}

					{shouldShowEmptySuggestions ? (
						<View>
							<ViyaPromptSuggestionsCard
								onSubmitSuggestion={handleSubmit}
								promptSuggestions={promptSuggestions}
							/>
						</View>
					) : null}

					{shouldShowDraftBlueprintShortcut || shouldShowQuestionCard ? (
						<View className="gap-2">
							{shouldShowDraftBlueprintShortcut ? (
								<DraftBlueprintShortcut
									isDisabled={isAwaitingViya}
									onPress={handleDraftBlueprintPress}
								/>
							) : null}
							{shouldShowQuestionCard ? (
								<QuestionOptionsDock
									isLoading={isAwaitingViya}
									onSelectOption={handleQuestionOptionSelect}
									onUseCustomAnswer={handleCustomQuestionAnswer}
									pendingQuestion={pendingQuestion}
								/>
							) : null}
						</View>
					) : null}

					<View className="mt-2 gap-1">
						{vaultUploadErrorMessage ? (
							<Text className="px-4 text-danger" type="body-xs">
								{vaultUploadErrorMessage}
							</Text>
						) : null}
						<Surface
							className="relative flex-row items-center gap-2 rounded-[28px] border border-border bg-surface px-3 py-2"
							style={composerStyle}
						>
							<Pressable
								accessibilityLabel={
									chatMode === "trip"
										? "Upload a file to this trip Vault"
										: "Upload a file for Viya"
								}
								accessibilityRole="button"
								accessibilityState={{
									disabled: Boolean(
										isUploadingVaultFile || isConfirmingVaultUpload
									),
								}}
								className="h-9 w-9 items-center justify-center rounded-full border"
								disabled={isUploadingVaultFile || isConfirmingVaultUpload}
								onPress={() => {
									runAsyncTask(handleFileUploadPress());
								}}
								style={{ backgroundColor: "#FFFFFF", borderColor: "#D4D4D8" }}
							>
								{isUploadingVaultFile ? (
									<Spinner size="sm" />
								) : (
									<Ionicons color="#18181B" name="add" size={22} />
								)}
							</Pressable>
							<View
								className="relative flex-1"
								style={{ height: composerInputLayout.height }}
							>
								<ComposerTextInput
									height={composerInputLayout.height}
									isEditable={!isAwaitingViya}
									isScrollable={composerInputLayout.isScrollable}
									maxHeight={composerInputMaxHeight}
									minHeight={composerInputMinHeight}
									onChangeText={handleComposerTextChange}
									onMeasuredHeightChange={setComposerContentHeight}
									onSubmit={() => {
										runAsyncTask(handleSubmit());
									}}
									placeholder={selectedModeOption.placeholder}
									placeholderTextColor={mutedColor}
									value={input}
								/>
							</View>
							<View
								className="items-center justify-end"
								style={{ height: composerInputLayout.height, width: 38 }}
							>
								{composerInputLayout.shouldShowExpand ? (
									<Pressable
										accessibilityLabel="Expand message editor"
										accessibilityRole="button"
										className="absolute top-0 h-9 w-9 items-center justify-center rounded-full bg-surface"
										onPress={() => setIsComposerSheetOpen(true)}
									>
										<Ionicons
											color={mutedColor}
											name="expand-outline"
											size={18}
										/>
									</Pressable>
								) : null}
								{canSendMessage ? (
									<Button
										isIconOnly={true}
										onPress={() => handleSubmit()}
										size="sm"
										style={{ height: 38, width: 38 }}
										variant="primary"
									>
										<Ionicons color="#FFFFFF" name="arrow-up" size={18} />
									</Button>
								) : (
									<Pressable
										accessibilityLabel="Send message"
										accessibilityRole="button"
										accessibilityState={{ disabled: true }}
										className="h-[38px] w-[38px] items-center justify-center rounded-full"
										disabled={true}
									>
										<Ionicons color="#A1A1AA" name="arrow-up" size={18} />
									</Pressable>
								)}
							</View>
						</Surface>
					</View>
					{shouldShowInputLimit ? (
						<Text className="mt-1 px-4" color="muted" type="body-xs">
							{remainingInputCharacters.toLocaleString()} characters left
						</Text>
					) : null}
				</View>
			</KeyboardAvoidingView>
			<BottomSheet
				isOpen={isComposerSheetOpen}
				onOpenChange={setIsComposerSheetOpen}
			>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[36px] bg-background"
						enablePanDownToClose={true}
					>
						<View
							className="gap-4 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							<View className="items-end">
								<Pressable
									accessibilityLabel="Close message editor"
									accessibilityRole="button"
									className="h-10 w-10 items-center justify-center rounded-full bg-surface"
									onPress={() => setIsComposerSheetOpen(false)}
								>
									<Ionicons color="#18181B" name="close" size={19} />
								</Pressable>
							</View>

							<Surface className="rounded-[28px] border border-border bg-surface p-4">
								<View style={{ height: expandedComposerEditorLayout.height }}>
									<ComposerTextInput
										height={expandedComposerEditorLayout.height}
										isEditable={!isAwaitingViya}
										isScrollable={expandedComposerEditorLayout.isScrollable}
										maxHeight={expandedComposerEditorMaxHeight}
										minHeight={expandedComposerInputMinHeight}
										onChangeText={handleComposerTextChange}
										onMeasuredHeightChange={setExpandedComposerContentHeight}
										onSubmit={() => {
											runAsyncTask(handleExpandedComposerSubmit());
										}}
										placeholder={selectedModeOption.placeholder}
										placeholderTextColor={mutedColor}
										value={input}
									/>
								</View>
							</Surface>

							<View className="flex-row items-center justify-between gap-3">
								<Text color="muted" type="body-xs">
									{remainingInputCharacters.toLocaleString()} characters left
								</Text>
								<Button
									isDisabled={!input.trim() || isAwaitingViya}
									onPress={handleExpandedComposerSubmit}
									size="sm"
									variant={
										input.trim() && !isAwaitingViya ? "primary" : "secondary"
									}
								>
									<Button.Label>Send</Button.Label>
									<Ionicons
										color={
											input.trim() && !isAwaitingViya ? "#FFFFFF" : mutedColor
										}
										name="arrow-up"
										size={16}
									/>
								</Button>
							</View>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
			<ChatHistorySheet
				chatMode={chatMode}
				currentThreadId={threadId}
				currentTripId={currentTripId}
				history={chatHistory}
				isOpen={isHistorySheetOpen}
				onOpenChange={setIsHistorySheetOpen}
				onSelect={handleHistorySelect}
			/>
			<TripSyncReviewSheet
				isConfirming={isConfirmingVaultUpload}
				isOpen={Boolean(pendingVaultReview)}
				onConfirm={() => {
					runAsyncTask(handleConfirmVaultUpload());
				}}
				onDiscard={() => setPendingVaultReview(null)}
				onOpenChange={(isOpen) => {
					if (!(isOpen || isConfirmingVaultUpload)) {
						setPendingVaultReview(null);
					}
				}}
				review={pendingVaultReview}
			/>
			<TripContextSheet
				isOpen={isTripContextSheetOpen}
				onOpenChange={setIsTripContextSheetOpen}
				onSelect={handleTripContextSelect}
				selectedTripId={currentTripId}
				trips={selectableTripContexts}
			/>
		</Container>
	);
}
