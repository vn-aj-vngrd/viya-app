import { useSmoothText, useUIMessages } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { getPreferenceSuggestions } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import {
	Button,
	Input,
	Surface,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	type StyleProp,
	View,
	type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { ViyaMark } from "@/src/components/viya-mark";
import { VIYA_ROUTES } from "@/src/constants/routes";

type SuggestionIconName = ComponentProps<typeof Ionicons>["name"];
type ReturnTabName = "index" | "trips";

interface PromptSuggestion {
	accent: string;
	icon: SuggestionIconName;
	prompt: string;
	soft: string;
	title: string;
}

const returnTabRoutes = {
	index: VIYA_ROUTES.home,
	trips: VIYA_ROUTES.trips,
} as const satisfies Record<ReturnTabName, Href>;

const userBubbleStyle = {
	backgroundColor: "#0A84FF",
	borderBottomRightRadius: 8,
	borderRadius: 24,
	boxShadow: "0 12px 28px rgba(10, 132, 255, 0.22)",
} satisfies StyleProp<ViewStyle>;

const assistantBubbleStyle = {
	backgroundColor: "#FFFFFF",
	borderBottomLeftRadius: 8,
	borderColor: "rgba(24, 24, 27, 0.08)",
	borderRadius: 24,
	borderWidth: 1,
	boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
} satisfies StyleProp<ViewStyle>;

function ViyaAvatar() {
	return (
		<View className="mt-1 h-8 w-8 items-center justify-center overflow-hidden rounded-xl">
			<ViyaMark size={32} />
		</View>
	);
}

function TypingBubble() {
	return (
		<View className="flex-row gap-2">
			<ViyaAvatar />
			<View
				className="flex-row items-center gap-1 px-4 py-3"
				style={assistantBubbleStyle}
			>
				{["dot-1", "dot-2", "dot-3"].map((dot) => (
					<View
						className="h-2 w-2 rounded-full bg-muted"
						key={dot}
						style={{ opacity: dot === "dot-2" ? 0.65 : 0.35 }}
					/>
				))}
			</View>
		</View>
	);
}

function MessageContent({
	isStreaming,
	isUser,
	text,
}: {
	isStreaming: boolean;
	isUser: boolean;
	text: string;
}) {
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});

	return (
		<Text.Paragraph
			className="leading-relaxed"
			style={{ color: isUser ? "#FFFFFF" : "#18181B" }}
			type="body-sm"
			weight="medium"
		>
			{visibleText}
		</Text.Paragraph>
	);
}

export function ViyaChatScreen() {
	const router = useRouter();
	const { fromTab } = useLocalSearchParams<{ fromTab?: string }>();
	const insets = useSafeAreaInsets();
	const [input, setInput] = useState("");
	const [threadId, setThreadId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const scrollViewRef = useRef<ScrollView>(null);
	const mutedColor = useThemeColor("muted");
	const preferences = useQuery(api.preferences.getCurrentPreferences);
	const promptSuggestions = getPreferenceSuggestions(
		preferences ?? {}
	).prompts.map((suggestion) => ({
		...suggestion,
		icon: suggestion.icon as SuggestionIconName,
	})) satisfies PromptSuggestion[];

	const createThread = useMutation(api.chat.createNewThread);
	const sendMessage = useMutation(api.chat.sendMessage);

	const { results: messages } = useUIMessages(
		api.chat.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true }
	);

	const hasStreamingMessage = messages?.some(
		(message) => message.status === "streaming"
	);
	const messageCount = messages?.length ?? 0;

	// biome-ignore lint/correctness/useExhaustiveDependencies: message state changes should scroll the chat to the latest response.
	useEffect(() => {
		scrollViewRef.current?.scrollToEnd({ animated: true });
	}, [messageCount, hasStreamingMessage]);

	const handleSubmit = async (prompt?: string) => {
		const value = (prompt ?? input).trim();

		if (!value || isLoading) {
			return;
		}

		setErrorMessage(null);
		setIsLoading(true);
		setInput("");

		try {
			let currentThreadId = threadId;

			if (!currentThreadId) {
				currentThreadId = await createThread();
				setThreadId(currentThreadId);
			}

			await sendMessage({ prompt: value, threadId: currentThreadId });
		} catch (error) {
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

	return (
		<Container isScrollable={false}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<View
					className="flex-1 px-5 pb-4"
					style={{ paddingTop: insets.top + 10 }}
				>
					<View className="mb-5 flex-row items-center">
						<Pressable
							accessibilityLabel="Back to previous tab"
							accessibilityRole="button"
							className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
							onPress={handleBackPress}
						>
							<Ionicons color="#18181B" name="chevron-back" size={20} />
						</Pressable>
					</View>

					<ScrollView
						className="flex-1"
						contentContainerStyle={{ flexGrow: 1, paddingBottom: 18 }}
						keyboardShouldPersistTaps="handled"
						ref={scrollViewRef}
						showsVerticalScrollIndicator={false}
					>
						{!messages || messages.length === 0 ? (
							<View className="gap-5">
								<EmptyState
									className="flex-none py-4"
									description="Ask Viya to dream, plan, prepare, track, or turn your trip into a story."
									title="Where should we go next?"
									visual={<ViyaMark size={56} />}
								/>

								<View className="gap-3">
									<Text color="muted" type="body-xs" weight="semibold">
										TRY ASKING
									</Text>
									<View className="flex-row flex-wrap gap-3">
										{promptSuggestions.map((suggestion) => (
											<Pressable
												className="w-[48%]"
												key={suggestion.title}
												onPress={() => handleSubmit(suggestion.prompt)}
											>
												<Surface className="gap-4 rounded-3xl border border-border bg-surface p-4">
													<View
														className="h-10 w-10 items-center justify-center rounded-full"
														style={{ backgroundColor: suggestion.soft }}
													>
														<Ionicons
															color={suggestion.accent}
															name={suggestion.icon}
															size={19}
														/>
													</View>
													<View className="gap-1">
														<Text type="body-sm" weight="semibold">
															{suggestion.title}
														</Text>
														<Text.Paragraph color="muted" type="body-xs">
															{suggestion.prompt}
														</Text.Paragraph>
													</View>
												</Surface>
											</Pressable>
										))}
									</View>
								</View>
							</View>
						) : (
							<View className="gap-4">
								{messages.map((message) => {
									const isUser = message.role === "user";
									const messageText = (message.parts ?? [])
										.map((part) => (part.type === "text" ? part.text : ""))
										.join("")
										.trim();

									if (!(isUser || messageText)) {
										return <TypingBubble key={message.key} />;
									}

									return (
										<View
											className={`flex-row gap-2 ${isUser ? "justify-end" : "justify-start"}`}
											key={message.key}
										>
											{isUser ? null : <ViyaAvatar />}
											<View
												className="max-w-[82%] px-4 py-3"
												style={isUser ? userBubbleStyle : assistantBubbleStyle}
											>
												<MessageContent
													isStreaming={message.status === "streaming"}
													isUser={isUser}
													text={messageText}
												/>
											</View>
										</View>
									);
								})}
								{isLoading && !hasStreamingMessage ? <TypingBubble /> : null}
							</View>
						)}
					</ScrollView>

					{errorMessage ? (
						<Text className="mb-3 text-danger" type="body-sm">
							{errorMessage}
						</Text>
					) : null}

					<Surface className="mt-3 flex-row items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
						<View className="flex-1">
							<TextField>
								<Input
									editable={!isLoading}
									onChangeText={setInput}
									onSubmitEditing={() => handleSubmit()}
									placeholder="Message Viya"
									returnKeyType="send"
									style={{
										backgroundColor: "transparent",
										borderColor: "transparent",
										borderWidth: 0,
										minHeight: 42,
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
