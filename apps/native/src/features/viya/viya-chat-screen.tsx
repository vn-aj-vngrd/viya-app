import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getPreferenceSuggestions, getTripCountdown } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	type NativeScrollEvent,
	type ScrollView as NativeScrollView,
	type NativeSyntheticEvent,
	Platform,
	TextInput,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import {
	AppText,
	fadeIn,
	fadeOut,
	GlassIconButton,
	GlassSurface,
	Icon,
	inputThemeProps,
	PressableScale,
	radius,
	ShellHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { TripSyncReviewSheet } from "@/src/features/vault/tripsync-review-sheet";
import type { PendingTripSyncReview } from "@/src/features/vault/tripsync-types";
import { useVaultUpload } from "@/src/features/vault/use-vault-upload";
import {
	formatCount,
	formatTripCountdown,
	formatTripRange,
	toLocalDateKey,
} from "@/src/lib/format";

import {
	ChatHistorySheet,
	ComposerMenu,
	QuestionOptionsDock,
	SlashCommandMenu,
	TripContextChip,
	TripContextSheet,
	ViyaChatEmptyContent,
	ViyaMessageList,
	ViyaSuggestionChips,
} from "./viya-chat-components";
import { getComposerInputLayout } from "./viya-chat-composer";
import {
	chatInputMaxLength,
	chatInputMaxLines,
	chatInputWarningThreshold,
	composerInputMaxHeight,
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
	getMessageQueryArgs,
	getNextTrip,
	getNormalizedChatInput,
	getPromptSuggestions,
	getReviewDraftsNavigation,
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

const composerInputLineHeight = 22;
const composerRowHeight = 44;
const composerInputInset = (composerRowHeight - composerInputLineHeight) / 2;
const sendButtonSize = 36;
const chatScrollContentBottomPadding = 24;
const chatComposerGap = 12;
const nearBottomThreshold = 80;
const createTripPrompt =
	"Help me create a trip. Ask me one setup question at a time, then draft a Trip Blueprint when you have enough details.";

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
	const [input, setInput] = useState(routePrompt);
	const [composerContentHeight, setComposerContentHeight] = useState(
		composerInputLineHeight
	);
	const [isNearBottom, setIsNearBottom] = useState(true);
	const isNearBottomRef = useRef(true);
	const [threadIdsByContext, setThreadIdsByContext] =
		useState<ThreadIdsByContext>({});
	const initialMode = getInitialChatMode({ requestedMode, routeTripId });
	const [chatMode, setChatMode] = useState<ChatModeId>(initialMode);
	const [createdTripId, setCreatedTripId] = useState<Id<"trips"> | null>(null);
	const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
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
	const todayKey = toLocalDateKey();
	const nextTrip = getNextTrip(selectableTripContexts, todayKey);
	let emptyTitle = "What do you want to plan?";
	let emptySubtitle = "Name a place, dates or a budget to start.";

	if (chatMode === "trip" && currentTrip) {
		emptyTitle = currentTrip.title;
		emptySubtitle = currentTrip.startDate
			? `${formatTripRange(currentTrip.startDate, currentTrip.endDate)} · ${formatTripCountdown(getTripCountdown(currentTrip, todayKey))}`
			: "No dates yet";
	} else if (nextTrip) {
		emptySubtitle = `Next trip: ${nextTrip.title} · ${formatTripRange(nextTrip.startDate, nextTrip.endDate)}`;
	}
	const shouldShowQuestionCard = Boolean(
		pendingQuestion && !shouldShowSlashCommandMenu
	);
	const composerInputLayout = getComposerInputLayout({
		contentHeight: composerContentHeight,
		maxHeight: composerInputMaxHeight,
		minHeight: composerInputLineHeight,
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
		if (isNearBottom) {
			scrollViewRef.current?.scrollToEnd({ animated: true });
		}
	}, [messageCount, hasStreamingMessage, pendingPrompt, pendingQuestion?._id]);

	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		const nearBottom =
			contentSize.height - (contentOffset.y + layoutMeasurement.height) <
			nearBottomThreshold;

		isNearBottomRef.current = nearBottom;
		setIsNearBottom(nearBottom);
	};

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
		setComposerContentHeight(composerInputLineHeight);

		return await sendChatPrompt({ requestSessionId, value });
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
		setComposerContentHeight(composerInputLineHeight);
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

	const handleReviewDrafts = () => {
		if (!currentTripId) {
			return;
		}

		const href = {
			params: { openDrafts: String(Date.now()), tripId: currentTripId },
			pathname: "/(app)/trips/[tripId]",
		} as Href;

		if (
			getReviewDraftsNavigation({
				canGoBack: router.canGoBack(),
				returnTo,
				tripId: currentTripId,
			}) === "dismissTo"
		) {
			router.dismissTo(href);
			return;
		}

		router.push(href);
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
		setChatMode("chat");
		runAsyncTask(handleSubmit(createTripPrompt));
	};

	const handleFileUploadPress = async () => {
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
			setComposerContentHeight(composerInputLineHeight);
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
	const isBusyWithFile = Boolean(
		isUploadingVaultFile || isConfirmingVaultUpload
	);
	const uploadLabel =
		chatMode === "trip"
			? "Upload a file to this trip Vault"
			: "Upload a file for Viya";

	return (
		<Container includeBottomInset={false} isScrollable={false}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<View
					style={{
						backgroundColor: palette.canvas,
						flex: 1,
					}}
				>
					<ShellHeader
						actions={[
							{
								icon: "time-outline",
								key: "history",
								label: "Conversations",
								onPress: () => setIsHistorySheetOpen(true),
								type: "button",
							},
							{
								icon: "create-outline",
								key: "new",
								label: "New conversation",
								onPress: handleNewChatPress,
								type: "button",
							},
						]}
						leading={{
							icon: "close",
							label: "Close",
							onPress: handleBackPress,
						}}
						title=""
					/>

					<View style={{ flex: 1 }}>
						<Animated.ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								gap: spacing.section,
								justifyContent: shouldShowMessages ? undefined : "center",
								paddingBottom: chatScrollContentBottomPadding,
								paddingHorizontal: spacing.screen,
								paddingTop: spacing.sm,
							}}
							contentInsetAdjustmentBehavior="automatic"
							key={`${threadContextKey}:${threadId ?? "new"}`}
							keyboardDismissMode="interactive"
							keyboardShouldPersistTaps="handled"
							onContentSizeChange={() => {
								// Streamed text grows the content between scroll events; follow
								// it right away so the view stays pinned instead of jumping.
								if (isNearBottomRef.current) {
									scrollViewRef.current?.scrollToEnd({ animated: false });
								}
							}}
							onScroll={handleScroll}
							ref={scrollViewRef}
							scrollEventThrottle={64}
							showsVerticalScrollIndicator={false}
						>
							{shouldShowMessages ? (
								<ViyaMessageList
									hasPersistedPendingPrompt={hasPersistedPendingPrompt}
									isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
									messages={displayedMessages}
									onCreateTripFromBlueprint={handleCreateTripFromBlueprint}
									onReviewDrafts={
										currentTripId ? handleReviewDrafts : undefined
									}
									onSubmitBlueprintAction={handleSubmit}
									pendingPrompt={pendingPrompt}
									pendingPromptMessageIndex={pendingPromptMessageIndex}
									shouldShowThinking={shouldShowThinking}
								/>
							) : (
								<ViyaChatEmptyContent
									subtitle={emptySubtitle}
									title={emptyTitle}
								/>
							)}

							{shouldShowQuestionCard ? (
								<QuestionOptionsDock
									isLoading={isAwaitingViya}
									onSelectOption={handleQuestionOptionSelect}
									onUseCustomAnswer={handleCustomQuestionAnswer}
									pendingQuestion={pendingQuestion}
								/>
							) : null}

							{errorMessage ? (
								<Animated.View entering={fadeIn} exiting={fadeOut}>
									<AppText
										accessibilityLiveRegion="polite"
										tone="danger"
										variant="subhead"
									>
										{errorMessage}
									</AppText>
								</Animated.View>
							) : null}

							{noticeMessage ? (
								<Animated.View entering={fadeIn} exiting={fadeOut}>
									<AppText
										accessibilityLiveRegion="polite"
										tone="secondary"
										variant="subhead"
									>
										{noticeMessage}
									</AppText>
								</Animated.View>
							) : null}
						</Animated.ScrollView>

						{isNearBottom || !shouldShowMessages ? null : (
							<Animated.View
								entering={fadeIn}
								exiting={fadeOut}
								style={{
									alignSelf: "center",
									bottom: spacing.sm,
									position: "absolute",
								}}
							>
								<GlassIconButton
									accessibilityLabel="Jump to latest"
									icon="chevron-down"
									onPress={() =>
										scrollViewRef.current?.scrollToEnd({ animated: true })
									}
								/>
							</Animated.View>
						)}
					</View>

					{shouldShowSlashCommandMenu ? (
						<SlashCommandMenu
							currentTripId={currentTripId}
							onSelect={handleSlashCommandSelect}
							visibleCommands={visibleSlashCommands}
						/>
					) : null}

					{shouldShowEmptySuggestions ? (
						<ViyaSuggestionChips
							onSubmitSuggestion={handleSubmit}
							promptSuggestions={promptSuggestions}
						/>
					) : null}

					<View
						style={{
							gap: spacing.xs,
							marginTop: chatComposerGap,
							paddingBottom: Math.max(insets.bottom, spacing.sm),
							paddingHorizontal: spacing.screen,
						}}
					>
						{vaultUploadErrorMessage ? (
							<AppText
								style={{ paddingHorizontal: spacing.md }}
								tone="danger"
								variant="footnote"
							>
								{vaultUploadErrorMessage}
							</AppText>
						) : null}
						<GlassSurface
							radius={radius.card + spacing.sm}
							style={{ minWidth: 0 }}
						>
							{chatMode === "trip" && currentTrip ? (
								<TripContextChip
									currentTrip={currentTrip}
									isClearable={!isTripModeLocked}
									onClear={handleTripContextClear}
									onPress={() => setIsTripContextSheetOpen(true)}
								/>
							) : null}
							<View
								style={{
									alignItems: "flex-end",
									flexDirection: "row",
									gap: spacing.xs,
									paddingRight: spacing.sm,
								}}
							>
								<ComposerMenu
									accessibilityLabel={uploadLabel}
									canChooseTrip={!isTripModeLocked}
									currentTripTitle={currentTrip?.title ?? null}
									isBusy={isBusyWithFile}
									onAddFile={() => {
										runAsyncTask(handleFileUploadPress());
									}}
									onChooseTrip={handleTripContextPickerPress}
									onCreateTrip={handleCreateTripWithAiPress}
								/>
								<TextInput
									accessibilityLabel="Message Viya"
									maxLength={chatInputMaxLength}
									multiline={true}
									onChangeText={handleComposerTextChange}
									onContentSizeChange={(event) =>
										setComposerContentHeight(
											event.nativeEvent.contentSize.height
										)
									}
									onSubmitEditing={() => {
										runAsyncTask(handleSubmit());
									}}
									placeholder="Ask Viya"
									{...inputThemeProps(palette)}
									returnKeyType="send"
									scrollEnabled={composerInputLayout.isScrollable}
									style={{
										color: palette.ink,
										flex: 1,
										fontSize: 17,
										height: composerInputLayout.height,
										lineHeight: composerInputLineHeight,
										marginBottom: composerInputInset,
										marginTop: composerInputInset,
										paddingBottom: 0,
										paddingHorizontal: 0,
										paddingTop: 0,
										textAlignVertical: "top",
									}}
									submitBehavior="submit"
									value={input}
								/>
								<PressableScale
									accessibilityLabel="Send message"
									disabled={!canSendMessage}
									haptic="medium"
									onPress={() => handleSubmit()}
									style={{
										alignItems: "center",
										height: composerRowHeight,
										justifyContent: "center",
										width: composerRowHeight,
									}}
								>
									<View
										style={{
											alignItems: "center",
											backgroundColor: canSendMessage
												? palette.accent
												: palette.fill,
											borderRadius: radius.pill,
											height: sendButtonSize,
											justifyContent: "center",
											width: sendButtonSize,
										}}
									>
										<Icon
											name="arrow-up"
											size={18}
											tone={canSendMessage ? "onPrimary" : "tertiary"}
											weight="bold"
										/>
									</View>
								</PressableScale>
							</View>
						</GlassSurface>
						{shouldShowInputLimit ? (
							<AppText
								style={{ paddingHorizontal: spacing.md }}
								tone="secondary"
								variant="footnote"
							>
								{formatCount(remainingInputCharacters, "character")} left
							</AppText>
						) : null}
					</View>
				</View>
			</KeyboardAvoidingView>
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
