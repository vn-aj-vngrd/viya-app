import { useSmoothText, useUIMessages } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
	Button,
	Input,
	Separator,
	Spinner,
	Surface,
	TextField,
	useThemeColor,
} from "heroui-native";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";

import { Container } from "@/components/container";

function MessageContent({
	isStreaming,
	text,
}: {
	isStreaming: boolean;
	text: string;
}) {
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});

	return (
		<Text className="text-foreground text-sm leading-relaxed">
			{visibleText}
		</Text>
	);
}

export function ViyaChatScreen() {
	const [input, setInput] = useState("");
	const [threadId, setThreadId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const scrollViewRef = useRef<ScrollView>(null);
	const mutedColor = useThemeColor("muted");
	const foregroundColor = useThemeColor("foreground");

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

	const handleSubmit = async () => {
		const value = input.trim();

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

	return (
		<Container isScrollable={false}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<View className="flex-1 px-4 py-4">
					<View className="mb-4 py-4">
						<Text className="font-semibold text-3xl text-foreground">
							Viya AI
						</Text>
						<Text className="mt-1 text-muted text-sm">
							Ask about itinerary gaps, readiness, risk, or what to do next.
						</Text>
					</View>

					<ScrollView
						className="mb-4 flex-1"
						contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
						keyboardShouldPersistTaps="handled"
						ref={scrollViewRef}
						showsVerticalScrollIndicator={false}
					>
						{!messages || messages.length === 0 ? (
							<Surface
								className="flex-1 items-center justify-center rounded-lg py-8"
								variant="secondary"
							>
								<Ionicons color={mutedColor} name="sparkles" size={32} />
								<Text className="mt-3 text-muted text-sm">
									Start with a travel planning question.
								</Text>
							</Surface>
						) : (
							<View className="gap-3">
								{messages.map((message) => (
									<Surface
										className={`rounded-lg p-3 ${message.role === "user" ? "ml-8" : "mr-8"}`}
										key={message.key}
										variant={message.role === "user" ? "tertiary" : "secondary"}
									>
										<Text className="mb-1 font-medium text-muted text-xs">
											{message.role === "user" ? "You" : "Viya"}
										</Text>
										<MessageContent
											isStreaming={message.status === "streaming"}
											text={(message.parts ?? [])
												.map((part) => (part.type === "text" ? part.text : ""))
												.join("")}
										/>
									</Surface>
								))}
								{isLoading && !hasStreamingMessage ? (
									<Surface className="mr-10 rounded-lg p-3" variant="secondary">
										<Text className="mb-1 font-medium text-muted text-xs">
											Viya
										</Text>
										<View className="flex-row items-center gap-2">
											<Spinner size="sm" />
											<Text className="text-muted text-sm">Thinking...</Text>
										</View>
									</Surface>
								) : null}
							</View>
						)}
					</ScrollView>

					{errorMessage ? (
						<Text className="mb-3 text-danger text-sm">{errorMessage}</Text>
					) : null}
					<Separator className="mb-3" />

					<View className="flex-row items-center gap-2">
						<View className="flex-1">
							<TextField>
								<Input
									editable={!isLoading}
									onChangeText={setInput}
									onSubmitEditing={handleSubmit}
									placeholder="Ask Viya..."
									returnKeyType="send"
									value={input}
								/>
							</TextField>
						</View>
						<Button
							isDisabled={!input.trim() || isLoading}
							isIconOnly={true}
							onPress={handleSubmit}
							size="sm"
							variant={input.trim() && !isLoading ? "primary" : "secondary"}
						>
							<Ionicons
								color={
									input.trim() && !isLoading ? foregroundColor : mutedColor
								}
								name="arrow-up"
								size={18}
							/>
						</Button>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Container>
	);
}
