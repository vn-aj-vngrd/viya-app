import { useUIMessages } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getPreferenceSuggestions } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BottomSheet } from "heroui-native";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	type ScrollView as NativeScrollView,
	Text as NativeText,
	Platform,
	TextInput,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import {
	AppText,
	GlassSurface,
	PressableScale,
	PrimaryButton,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { TripSyncReviewSheet } from "@/src/features/vault/tripsync-review-sheet";
import type { PendingTripSyncReview } from "@/src/features/vault/tripsync-types";
import { useVaultUpload } from "@/src/features/vault/use-vault-upload";

import {
	ChatHistorySheet,
	HeaderActionGroup,
	QuestionOptionsDock,
	SlashCommandMenu,
	TripContextActionRow,
	TripContextChip,
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
const composerInputPaddingBottom = 0;
const composerInputPaddingTop = 0;
const composerControlSize = 52;
const expandedComposerChromeReserve = 260;
const chatScrollContentBottomPadding = 24;
const chatComposerGap = 12;

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

function ActionRow({
	accessibilityLabel,
	detail,
	disabled,
	icon,
	iconColor,
	isPending,
	onPress,
	title,
}: {
	accessibilityLabel: string;
	detail: string;
	disabled?: boolean;
	icon: ComponentProps<typeof Ionicons>["name"];
	iconColor: string;
	isPending?: boolean;
	onPress: () => void;
	title: string;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			onPress={onPress}
			scaleTo={0.98}
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderRadius: radius.card,
				flexDirection: "row",
				gap: spacing.md,
				minHeight: 64,
				opacity: disabled ? 0.55 : 1,
				padding: spacing.md,
			}}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: 40,
					justifyContent: "center",
					width: 40,
				}}
			>
				{isPending ? (
					<ActivityIndicator color={palette.ink} size="small" />
				) : (
					<Ionicons color={iconColor} name={icon} size={20} />
				)}
			</View>
			<View className="min-w-0 flex-1" style={{ gap: 2 }}>
				<AppText variant="headline">{title}</AppText>
				<AppText numberOfLines={2} tone="secondary" variant="footnote">
					{detail}
				</AppText>
			</View>
			<Ionicons color={palette.inkTertiary} name="chevron-forward" size={18} />
		</PressableScale>
	);
}

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
	textColor,
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
	textColor: string;
	value: string;
}) {
	const isSingleLineHeight = height <= minHeight;
	const visibleInputHeight = isSingleLineHeight
		? composerInputLineHeight + 2
		: height;
	const textInputStyle = {
		backgroundColor: "transparent",
		color: textColor,
		fontSize: 17,
		fontWeight: "400" as const,
		height: visibleInputHeight,
		lineHeight: composerInputLineHeight,
		maxHeight: isSingleLineHeight ? visibleInputHeight : maxHeight,
		minHeight: isSingleLineHeight ? visibleInputHeight : minHeight,
		paddingHorizontal: 0,
		paddingRight: rightPadding,
		paddingTop: composerInputPaddingTop,
		paddingBottom: composerInputPaddingBottom,
		textAlignVertical: "top" as const,
		width: "100%" as const,
	};
	const measurementValue = value || " ";

	return (
		<View
			style={{
				height,
				justifyContent: isSingleLineHeight ? "center" : "flex-start",
				width: "100%",
			}}
		>
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
	const { fromTab, mode, newThread, prompt, returnTo, tripId, workspaceTab } =
		useLocalSearchParams<{
			fromTab?: string | string[];
			mode?: string | string[];
			newThread?: string | string[];
			prompt?: string | string[];
			returnTo?: string | string[];
			tripId?: string | string[];
			workspaceTab?: string | string[];
		}>();
	const requestedMode = getSearchParamValue(mode);
	const shouldStartNewThread = getSearchParamValue(newThread) === "1";
	const routePrompt = getSearchParamValue(prompt) ?? "";
	const routeTripId = getSearchParamValue(tripId) as Id<"trips"> | undefined;
	const routeWorkspaceTab = getSearchParamValue(workspaceTab);
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
	const [isComposerActionsOpen, setIsComposerActionsOpen] = useState(false);
	const [isComposerSheetOpen, setIsComposerSheetOpen] = useState(false);
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
	const hasAppliedRouteThreadResetRef = useRef(false);
	const { palette } = useUITheme();
	const mutedColor = palette.inkSecondary;
	const trips = useQuery(api.trips.listTrips);
	const selectableTripContexts = getSelectableTripContexts(trips);
	const currentTrip = selectedTripId
		? getSelectedTripContext(trips, selectedTripId)
		: null;
	const currentTripId =
		currentTrip?._id ??
		(trips === undefined || selectedTripId === createdTripId
			? selectedTripId
			: null) ??
		(chatMode === "trip" ? createdTripId : null);
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
		preferencePromptSuggestions,
		chatMode === "trip" && currentTrip
			? {
					destination: currentTrip.destination,
					title: currentTrip.title,
					workspaceTab: routeWorkspaceTab,
				}
			: undefined
	);
	const activeSlashCommand = getActiveSlashCommand(input);
	const visibleSlashCommands = getVisibleSlashCommands(
		activeSlashCommand,
		isTripModeLocked ? "trip" : undefined
	);
	const backgroundColor = palette.canvas;

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
			: ({ limit: 50, mode: chatMode } as const);
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
			const nextThreadIds = { ...storedThreadIds };

			if (shouldStartNewThread) {
				delete nextThreadIds[threadContextKey];
			}

			if (isMounted) {
				setThreadIdsByContext(nextThreadIds);
			}
		};

		runAsyncTask(loadStoredThreadIds());

		return () => {
			isMounted = false;
		};
	}, [shouldStartNewThread, threadContextKey]);

	useEffect(() => {
		if (!(shouldStartNewThread && !hasAppliedRouteThreadResetRef.current)) {
			return;
		}

		hasAppliedRouteThreadResetRef.current = true;
		const nextThreadIds = { ...threadIdsByContext };
		delete nextThreadIds[threadContextKey];
		setThreadIdsByContext(nextThreadIds);

		if (Object.keys(nextThreadIds).length === 0) {
			runAsyncTask(removeStoredThreadIdsByContext());
			return;
		}

		runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
	}, [shouldStartNewThread, threadContextKey, threadIdsByContext]);

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

		if (Object.keys(nextThreadIds).length === 0) {
			runAsyncTask(removeStoredThreadIdsByContext());
			return;
		}

		runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
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

	const handleTripContextPickerPress = () => {
		setIsComposerActionsOpen(false);
		setIsTripContextSheetOpen(true);
	};

	const handleTripContextClear = () => {
		if (isTripModeLocked) {
			return;
		}

		setSelectedTripId(null);
		setChatMode("chat");
		setErrorMessage(null);
		setNoticeMessage(null);
		setAwaitingAssistantMessageCount(null);
		setPendingPromptMessageIndex(null);
	};

	const handleQuestionOptionSelect = (value: string) => {
		runAsyncTask(handleSubmit(value));
	};

	const handleCreateTripWithAiPress = () => {
		setIsComposerActionsOpen(false);
		setChatMode("chat");
		runAsyncTask(
			handleSubmit(
				"Help me create a trip. Ask me one setup question at a time, then draft a Trip Blueprint when you have enough details."
			)
		);
	};

	const handleFileUploadPress = async () => {
		setIsComposerActionsOpen(false);
		setErrorMessage(null);
		setNoticeMessage(null);

		try {
			const review = await pickDocument({
				kind: "document",
				tripId:
					chatMode === "trip" && currentTripId ? currentTripId : undefined,
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
	return (
		<Container isScrollable={false}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<View
					className="flex-1 overflow-hidden px-4"
					style={{
						backgroundColor,
						paddingBottom: Math.max(insets.bottom, 16),
						paddingTop: insets.top + 10,
					}}
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
							<View className="flex-row items-center gap-2">
								<Ionicons color={palette.accent} name="sparkles" size={18} />
								<AppText tone="ink" variant="headline">
									Chat
								</AppText>
							</View>
						</View>
						<HeaderActionGroup
							onHistoryPress={() => setIsHistorySheetOpen(true)}
							onNewChatPress={handleNewChatPress}
						/>
					</View>

					<View className="flex-1" style={{ marginBottom: 0 }}>
						<Animated.ScrollView
							className="flex-1"
							contentContainerStyle={{
								flexGrow: 1,
								justifyContent: shouldShowMessages ? undefined : "center",
								paddingBottom: chatScrollContentBottomPadding,
								paddingTop: spacing.sm,
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
					</View>

					{errorMessage ? (
						<Animated.View entering={FadeIn} exiting={FadeOut}>
							<AppText
								accessibilityLiveRegion="polite"
								style={{ marginBottom: spacing.sm }}
								tone="danger"
								variant="subhead"
							>
								{errorMessage}
							</AppText>
						</Animated.View>
					) : null}

					{noticeMessage ? (
						<Animated.View entering={FadeIn} exiting={FadeOut}>
							<AppText
								accessibilityLiveRegion="polite"
								style={{ marginBottom: spacing.sm }}
								tone="success"
								variant="subhead"
							>
								{noticeMessage}
							</AppText>
						</Animated.View>
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

					{shouldShowQuestionCard ? (
						<View className="gap-2">
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

					<View className="gap-1" style={{ marginTop: chatComposerGap }}>
						{vaultUploadErrorMessage ? (
							<AppText
								style={{ paddingHorizontal: spacing.lg }}
								tone="danger"
								variant="footnote"
							>
								{vaultUploadErrorMessage}
							</AppText>
						) : null}
						{chatMode === "trip" && currentTrip ? (
							<TripContextChip
								currentTrip={currentTrip}
								isClearable={!isTripModeLocked}
								onClear={handleTripContextClear}
								onPress={() => setIsTripContextSheetOpen(true)}
							/>
						) : null}
						<View className="flex-row items-end gap-2">
							<PressableScale
								accessibilityLabel={
									chatMode === "trip"
										? "Upload a file to this trip Vault"
										: "Upload a file for Viya"
								}
								accessibilityState={{
									disabled: Boolean(
										isUploadingVaultFile || isConfirmingVaultUpload
									),
								}}
								disabled={isUploadingVaultFile || isConfirmingVaultUpload}
								onPress={() => setIsComposerActionsOpen(true)}
							>
								<GlassSurface
									shape="circle"
									style={{
										alignItems: "center",
										height: composerControlSize,
										justifyContent: "center",
										width: composerControlSize,
									}}
								>
									{isUploadingVaultFile ? (
										<ActivityIndicator color={palette.ink} size="small" />
									) : (
										<Ionicons color={palette.ink} name="add" size={24} />
									)}
								</GlassSurface>
							</PressableScale>
							<GlassSurface
								radius={composerControlSize / 2}
								style={{
									alignItems: "center",
									flex: 1,
									flexDirection: "row",
									gap: spacing.sm,
									minHeight: composerControlSize,
									minWidth: 0,
									paddingLeft: spacing.screen,
									paddingRight: spacing.sm,
									paddingVertical: spacing.sm,
								}}
							>
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
										rightPadding={4}
										textColor={palette.ink}
										value={input}
									/>
								</View>
								<View
									className="items-center justify-end"
									style={{
										height: Math.max(
											composerInputLayout.height,
											composerControlSize - 16
										),
										width: 44,
									}}
								>
									{composerInputLayout.shouldShowExpand ? (
										<PressableScale
											accessibilityLabel="Expand message editor"
											onPress={() => setIsComposerSheetOpen(true)}
											style={{
												alignItems: "center",
												height: 44,
												justifyContent: "center",
												position: "absolute",
												top: -6,
												width: 44,
											}}
										>
											<Ionicons
												color={mutedColor}
												name="expand-outline"
												size={18}
											/>
										</PressableScale>
									) : null}
									{canSendMessage ? (
										<Animated.View entering={ZoomIn.springify().damping(20)}>
											<PressableScale
												accessibilityLabel="Send message"
												haptic="medium"
												onPress={() => handleSubmit()}
												style={{
													alignItems: "center",
													backgroundColor: palette.ink,
													borderRadius: radius.pill,
													height: 36,
													justifyContent: "center",
													width: 36,
												}}
											>
												<Ionicons
													color={palette.onPrimary}
													name="arrow-up"
													size={20}
												/>
											</PressableScale>
										</Animated.View>
									) : (
										<View
											accessibilityLabel="Send message"
											accessibilityRole="button"
											accessibilityState={{ disabled: true }}
											style={{
												alignItems: "center",
												backgroundColor: palette.fill,
												borderRadius: radius.pill,
												height: 36,
												justifyContent: "center",
												width: 36,
											}}
										>
											<Ionicons
												color={palette.inkTertiary}
												name="arrow-up"
												size={20}
											/>
										</View>
									)}
								</View>
							</GlassSurface>
						</View>
					</View>
					{shouldShowInputLimit ? (
						<AppText
							style={{ marginTop: spacing.xs, paddingHorizontal: spacing.lg }}
							tone="secondary"
							variant="footnote"
						>
							{remainingInputCharacters.toLocaleString()} characters left
						</AppText>
					) : null}
				</View>
			</KeyboardAvoidingView>
			<BottomSheet
				isOpen={isComposerActionsOpen}
				onOpenChange={setIsComposerActionsOpen}
			>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[32px] bg-background"
						enablePanDownToClose={true}
					>
						<View
							className="gap-3 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							<View className="gap-1 px-1">
								<BottomSheet.Title>Viya actions</BottomSheet.Title>
								<BottomSheet.Description>
									Choose trip context, start a trip, or add files.
								</BottomSheet.Description>
							</View>
							{isTripModeLocked ? null : (
								<TripContextActionRow
									currentTrip={currentTrip}
									hasTrips={selectableTripContexts.length > 0}
									onPress={handleTripContextPickerPress}
								/>
							)}
							<ActionRow
								accessibilityLabel="Create a trip with Viya"
								detail="Viya asks the setup questions and drafts the trip."
								icon="map-outline"
								iconColor={palette.accent}
								onPress={handleCreateTripWithAiPress}
								title="Create trip"
							/>
							<ActionRow
								accessibilityLabel="Add files for Viya"
								detail="Upload documents, bookings, receipts, or notes."
								disabled={Boolean(
									isUploadingVaultFile || isConfirmingVaultUpload
								)}
								icon="document-attach-outline"
								iconColor={palette.ink}
								isPending={Boolean(isUploadingVaultFile)}
								onPress={() => {
									runAsyncTask(handleFileUploadPress());
								}}
								title="Add files"
							/>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
			<BottomSheet
				isOpen={isComposerSheetOpen}
				onOpenChange={setIsComposerSheetOpen}
			>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[32px] bg-background"
						enablePanDownToClose={true}
					>
						<View
							className="gap-4 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							<View className="items-end">
								<PressableScale
									accessibilityLabel="Close message editor"
									onPress={() => setIsComposerSheetOpen(false)}
									style={{
										alignItems: "center",
										backgroundColor: palette.fill,
										borderRadius: radius.pill,
										height: 44,
										justifyContent: "center",
										width: 44,
									}}
								>
									<Ionicons color={palette.ink} name="close" size={20} />
								</PressableScale>
							</View>

							<View
								style={{
									backgroundColor: palette.surface,
									borderRadius: radius.card,
									padding: spacing.lg,
								}}
							>
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
										textColor={palette.ink}
										value={input}
									/>
								</View>
							</View>

							<View className="flex-row items-center justify-between gap-3">
								<AppText tone="secondary" variant="footnote">
									{remainingInputCharacters.toLocaleString()} characters left
								</AppText>
								<View style={{ minWidth: 120 }}>
									<PrimaryButton
										disabled={!input.trim() || isAwaitingViya}
										fullWidth={false}
										icon="arrow-up"
										label="Send"
										onPress={() => {
											runAsyncTask(handleExpandedComposerSubmit());
										}}
									/>
								</View>
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
				selectedTripId={currentTripId ?? null}
				trips={selectableTripContexts}
			/>
		</Container>
	);
}
