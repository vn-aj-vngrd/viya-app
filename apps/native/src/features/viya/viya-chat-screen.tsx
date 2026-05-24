import { useUIMessages } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { getPreferenceSuggestions } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
	Button,
	Input,
	ScrollShadow,
	Surface,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	type ScrollView,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";

import {
	ChatModeSelector,
	HeaderActionGroup,
	SlashCommandMenu,
	ViyaChatEmptyContent,
	ViyaMessageList,
} from "./viya-chat-components";
import { composerStyle, returnTabRoutes } from "./viya-chat-constants";
import type {
	ChatModeId,
	PromptSuggestion,
	ReturnTabName,
	SlashCommandOption,
	SuggestionIconName,
	ThreadIdsByContext,
} from "./viya-chat-types";
import {
	applySlashCommandSelection,
	getActiveSlashCommand,
	getChatModeOption,
	getMessageQueryArgs,
	getPromptSuggestions,
	getStoredThreadIdsByContext,
	getThreadContextKey,
	getVisibleSlashCommands,
	hasAssistantMessageAfter,
	hasPersistedUserMessage,
	persistStoredThreadIdsByContext,
	removeStoredThreadIdsByContext,
	runAsyncTask,
} from "./viya-chat-utils";

export function ViyaChatScreen() {
	const router = useRouter();
	const { fromTab } = useLocalSearchParams<{ fromTab?: string }>();
	const insets = useSafeAreaInsets();
	const [input, setInput] = useState("");
	const [threadIdsByContext, setThreadIdsByContext] =
		useState<ThreadIdsByContext>({});
	const [chatMode, setChatMode] = useState<ChatModeId>("chat");
	const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
	const [awaitingAssistantMessageCount, setAwaitingAssistantMessageCount] =
		useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const scrollViewRef = useRef<ScrollView>(null);
	const mutedColor = useThemeColor("muted");
	const trips = useQuery(api.trips.listTrips);
	const currentTrip = trips?.find((trip) => !trip.isDemo) ?? null;
	const currentTripId = currentTrip?._id ?? null;
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
	const visibleSlashCommands = getVisibleSlashCommands(activeSlashCommand);
	const shouldShowSlashCommandMenu = Boolean(activeSlashCommand && !isLoading);
	const backgroundColor = useThemeColor("background");

	const createThread = useMutation(api.chat.createNewThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		getMessageQueryArgs(threadId),
		{ initialNumItems: 50, stream: true }
	);

	const hasStreamingMessage = messages?.some(
		(message) => message.status === "streaming"
	);
	const hasPersistedPendingPrompt = hasPersistedUserMessage(
		messages,
		pendingPrompt
	);
	const hasAssistantMessageAfterAwaitStart = hasAssistantMessageAfter(
		messages,
		awaitingAssistantMessageCount
	);
	const shouldShowThinking = Boolean(
		awaitingAssistantMessageCount !== null &&
			!hasAssistantMessageAfterAwaitStart
	);
	const shouldShowMessages = Boolean(
		messages?.length || pendingPrompt || isLoading || shouldShowThinking
	);
	const messageCount = messages?.length ?? 0;

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
		if (chatMode === "trip" && trips !== undefined && !currentTripId) {
			setChatMode("chat");
			setErrorMessage("Create a trip first to use Trip mode.");
		}
	}, [chatMode, currentTripId, trips]);

	useEffect(() => {
		if (hasPersistedPendingPrompt) {
			setPendingPrompt(null);
		}
	}, [hasPersistedPendingPrompt]);

	useEffect(() => {
		if (hasAssistantMessageAfterAwaitStart) {
			setAwaitingAssistantMessageCount(null);
		}
	}, [hasAssistantMessageAfterAwaitStart]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: message state changes should scroll the chat to the latest response.
	useEffect(() => {
		scrollViewRef.current?.scrollToEnd({ animated: true });
	}, [messageCount, hasStreamingMessage, pendingPrompt]);

	const handleSubmit = async (prompt?: string) => {
		const value = (prompt ?? input).trim();

		if (!value || isLoading) {
			return;
		}

		if (chatMode === "trip" && !currentTripId) {
			setErrorMessage("Create a trip first to use Trip mode.");
			return;
		}

		setErrorMessage(null);
		setIsLoading(true);
		setIsModeMenuOpen(false);
		setAwaitingAssistantMessageCount(messageCount);
		setPendingPrompt(value);
		setInput("");

		try {
			let currentThreadId = threadId;

			if (!currentThreadId) {
				currentThreadId = await createThread();
				const nextThreadIds = {
					...threadIdsByContext,
					[threadContextKey]: currentThreadId,
				};
				setThreadIdsByContext(nextThreadIds);
				runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
			}

			await sendMessage({
				mode: chatMode,
				prompt: value,
				threadId: currentThreadId,
				tripId:
					chatMode === "trip" && currentTripId ? currentTripId : undefined,
			});
		} catch (error) {
			setInput(value);
			setPendingPrompt(null);
			setAwaitingAssistantMessageCount(null);
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not send this message."
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackPress = () => {
		const targetRoute =
			fromTab && fromTab in returnTabRoutes
				? returnTabRoutes[fromTab as ReturnTabName]
				: VIYA_ROUTES.home;

		router.replace(targetRoute);
	};

	const handleModeSelect = (mode: ChatModeId) => {
		if (mode === "trip" && !currentTripId) {
			setErrorMessage("Create a trip first to use Trip mode.");
			setIsModeMenuOpen(false);
			return;
		}

		setChatMode(mode);
		setIsModeMenuOpen(false);
		setErrorMessage(null);
		setAwaitingAssistantMessageCount(null);
	};

	const handleNewChatPress = () => {
		const nextThreadIds = { ...threadIdsByContext };
		delete nextThreadIds[threadContextKey];
		setThreadIdsByContext(nextThreadIds);
		setInput("");
		setPendingPrompt(null);
		setAwaitingAssistantMessageCount(null);
		setErrorMessage(null);
		setIsModeMenuOpen(false);

		if (Object.keys(nextThreadIds).length === 0) {
			runAsyncTask(removeStoredThreadIdsByContext());
			return;
		}

		runAsyncTask(persistStoredThreadIdsByContext(nextThreadIds));
	};

	const handleSlashCommandSelect = (command: SlashCommandOption) => {
		setErrorMessage(null);
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

	return (
		<Container isScrollable={false}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<View
					className="flex-1 px-4 pb-4"
					style={{ paddingTop: insets.top + 10 }}
				>
					<View
						className="mb-5 flex-row items-center justify-between"
						style={{ zIndex: 30 }}
					>
						<View className="flex-row items-center gap-3">
							<Pressable
								accessibilityLabel="Back to previous tab"
								accessibilityRole="button"
								className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
								onPress={handleBackPress}
							>
								<Ionicons color="#18181B" name="chevron-back" size={20} />
							</Pressable>
							<ChatModeSelector
								currentTripId={currentTripId}
								isOpen={isModeMenuOpen}
								onOpenChange={setIsModeMenuOpen}
								onSelect={handleModeSelect}
								selectedMode={chatMode}
								threadIdsByContext={threadIdsByContext}
							/>
						</View>
						<HeaderActionGroup
							currentTripId={currentTripId}
							onModeSelect={handleModeSelect}
							onNewChatPress={handleNewChatPress}
							selectedMode={chatMode}
						/>
					</View>

					<ScrollShadow
						className="flex-1"
						color={backgroundColor}
						LinearGradientComponent={LinearGradient}
						size={36}
					>
						<Animated.ScrollView
							className="flex-1"
							contentContainerStyle={{ flexGrow: 1, paddingBottom: 18 }}
							keyboardShouldPersistTaps="handled"
							ref={scrollViewRef}
							showsVerticalScrollIndicator={false}
						>
							{shouldShowMessages ? (
								<ViyaMessageList
									hasPersistedPendingPrompt={hasPersistedPendingPrompt}
									messages={messages ?? []}
									pendingPrompt={pendingPrompt}
									shouldShowThinking={shouldShowThinking}
								/>
							) : (
								<ViyaChatEmptyContent
									onSubmitSuggestion={handleSubmit}
									promptSuggestions={promptSuggestions}
									selectedModeOption={selectedModeOption}
								/>
							)}
						</Animated.ScrollView>
					</ScrollShadow>

					{errorMessage ? (
						<Text className="mb-3 text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}

					{shouldShowSlashCommandMenu ? (
						<SlashCommandMenu
							currentTripId={currentTripId}
							onSelect={handleSlashCommandSelect}
							visibleCommands={visibleSlashCommands}
						/>
					) : null}

					<Surface
						className="mt-3 flex-row items-center gap-2 rounded-full border border-border bg-surface px-3 py-2"
						style={composerStyle}
					>
						<View className="flex-1">
							<TextField>
								<Input
									editable={!isLoading}
									onChangeText={setInput}
									onSubmitEditing={() => handleSubmit()}
									placeholder={selectedModeOption.placeholder}
									returnKeyType="send"
									style={{
										backgroundColor: "transparent",
										borderColor: "transparent",
										borderWidth: 0,
										minHeight: 44,
									}}
									value={input}
								/>
							</TextField>
						</View>
						<Button
							isDisabled={!input.trim() || isLoading}
							isIconOnly={true}
							onPress={() => handleSubmit()}
							size="sm"
							style={{ height: 38, width: 38 }}
							variant={input.trim() && !isLoading ? "primary" : "secondary"}
						>
							<Ionicons
								color={input.trim() && !isLoading ? "#FFFFFF" : mutedColor}
								name="arrow-up"
								size={18}
							/>
						</Button>
					</Surface>
				</View>
			</KeyboardAvoidingView>
		</Container>
	);
}
