import { useSmoothText } from "@convex-dev/agent/react";
import { Feather, Ionicons } from "@expo/vector-icons";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	Menu,
	type MenuKey,
	Surface,
	Text,
	useThemeColor,
} from "heroui-native";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	Easing,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";

import { EmptyState } from "@/src/components/empty-state";

import {
	CHAT_MODE_OPTIONS,
	composerStyle,
	thinkingMessage,
	thinkingMessageLetters,
	thinkingShimmerDurationMs,
	thinkingShimmerTailLength,
} from "./viya-chat-constants";
import { MarkdownContent } from "./viya-chat-markdown";
import type {
	ChatModeId,
	ChatModeOption,
	PromptSuggestion,
	SlashCommandOption,
	ThreadIdsByContext,
	UiChatMessages,
} from "./viya-chat-types";
import {
	getChatModeOption,
	getThreadContextKey,
	getUiMessageText,
	getUserBubbleStyle,
	isChatModeId,
} from "./viya-chat-utils";

function ThinkingShimmerLetter({
	character,
	index,
	mutedColor,
	progress,
}: {
	character: string;
	index: number;
	mutedColor: string;
	progress: SharedValue<number>;
}) {
	const letterStyle = useAnimatedStyle(() => {
		const shimmerPosition = interpolate(
			progress.value,
			[0, 1],
			[-thinkingShimmerTailLength, thinkingMessage.length]
		);
		const distance = Math.abs(index - shimmerPosition);
		const opacity = interpolate(
			distance,
			[0, thinkingShimmerTailLength],
			[1, 0.36],
			"clamp"
		);

		return { opacity };
	});

	return (
		<Animated.Text
			style={[
				{
					color: mutedColor,
					fontSize: 14,
					fontWeight: "500",
				},
				letterStyle,
			]}
		>
			{character}
		</Animated.Text>
	);
}

function TypingBubble() {
	const mutedColor = useThemeColor("muted");
	const shimmerProgress = useSharedValue(0);

	useEffect(() => {
		shimmerProgress.value = withRepeat(
			withTiming(1, {
				duration: thinkingShimmerDurationMs,
				easing: Easing.linear,
			}),
			-1,
			false
		);
	}, [shimmerProgress]);

	return (
		<View className="w-full flex-row items-center px-1 py-2">
			{thinkingMessageLetters.map(({ character, key }, index) => (
				<ThinkingShimmerLetter
					character={character}
					index={index}
					key={key}
					mutedColor={mutedColor}
					progress={shimmerProgress}
				/>
			))}
		</View>
	);
}

export function ChatModeSelector({
	currentTripId,
	isOpen,
	onOpenChange,
	onSelect,
	selectedMode,
	threadIdsByContext,
}: {
	currentTripId: Id<"trips"> | null;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSelect: (mode: ChatModeId) => void;
	selectedMode: ChatModeId;
	threadIdsByContext: ThreadIdsByContext;
}) {
	const selectedOption = getChatModeOption(selectedMode);
	const selectedModeKeys = new Set<MenuKey>([selectedMode]);

	const handleSelectionChange = (keys: Set<MenuKey>) => {
		const [nextMode] = keys;

		if (nextMode && isChatModeId(nextMode)) {
			if (nextMode === "trip" && !currentTripId) {
				return;
			}

			onSelect(nextMode);
		}
	};

	return (
		<Menu isOpen={isOpen} onOpenChange={onOpenChange}>
			<Menu.Trigger asChild={true}>
				<Pressable
					accessibilityLabel="Choose chat mode"
					accessibilityRole="button"
					className="h-12 flex-row items-center gap-2 rounded-full border border-border bg-surface px-4"
				>
					<Ionicons
						color={selectedOption.accent}
						name={selectedOption.icon}
						size={17}
					/>
					<Text
						style={{ color: selectedOption.accent }}
						type="body-sm"
						weight="bold"
					>
						{selectedOption.label}
					</Text>
					<Ionicons
						color={selectedOption.accent}
						name="chevron-down"
						size={14}
					/>
				</Pressable>
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Overlay />
				<Menu.Content
					align="start"
					className="rounded-[28px] border border-border bg-surface p-2"
					offset={10}
					placement="bottom"
					presentation="popover"
					width={280}
				>
					<Menu.Group
						onSelectionChange={handleSelectionChange}
						selectedKeys={selectedModeKeys}
						selectionMode="single"
					>
						{CHAT_MODE_OPTIONS.map((option) => {
							const isSelected = option.id === selectedMode;
							const threadContextKey = getThreadContextKey(
								option.id,
								currentTripId
							);
							const hasActiveThread = Boolean(
								threadIdsByContext[threadContextKey]
							);
							const isDisabled = Boolean(
								"requiresTrip" in option &&
									option.requiresTrip &&
									!currentTripId
							);

							return (
								<Menu.Item
									accessibilityLabel={`Use ${option.label} mode`}
									className="flex-row items-center gap-3 rounded-[22px] p-3"
									id={option.id}
									isAnimatedStyleActive={false}
									isDisabled={isDisabled}
									key={option.id}
									style={{
										backgroundColor: isSelected ? option.soft : "transparent",
										opacity: isDisabled ? 0.5 : 1,
									}}
								>
									<View
										className="h-9 w-9 items-center justify-center rounded-full"
										style={{ backgroundColor: option.soft }}
									>
										<Ionicons
											color={option.accent}
											name={option.icon}
											size={18}
										/>
									</View>
									<View className="flex-1 gap-0.5">
										<Menu.ItemTitle className="font-semibold text-sm">
											{option.label}
										</Menu.ItemTitle>
										<Menu.ItemDescription className="text-xs">
											{isDisabled
												? "Create a trip first to unlock trip context."
												: option.description}
										</Menu.ItemDescription>
									</View>
									{hasActiveThread ? (
										<View
											className="h-2 w-2 rounded-full"
											style={{ backgroundColor: option.accent }}
										/>
									) : null}
									<Menu.ItemIndicator
										iconProps={{ color: "#18181B", size: 20 }}
									/>
								</Menu.Item>
							);
						})}
					</Menu.Group>
				</Menu.Content>
			</Menu.Portal>
		</Menu>
	);
}

export function HeaderActionGroup({
	currentTripId,
	onModeSelect,
	onNewChatPress,
	selectedMode,
}: {
	currentTripId: Id<"trips"> | null;
	onModeSelect: (mode: ChatModeId) => void;
	onNewChatPress: () => void;
	selectedMode: ChatModeId;
}) {
	return (
		<Surface className="h-12 flex-row items-center gap-1 rounded-full border border-border bg-surface px-1">
			<Pressable
				accessibilityLabel="Start a new chat"
				accessibilityRole="button"
				className="h-10 w-11 items-center justify-center rounded-full"
				onPress={onNewChatPress}
			>
				<Feather color="#18181B" name="edit" size={22} />
			</Pressable>
			<Menu>
				<Menu.Trigger asChild={true}>
					<Pressable
						accessibilityLabel="Open chat options"
						accessibilityRole="button"
						className="h-10 w-11 items-center justify-center rounded-full"
					>
						<Ionicons color="#18181B" name="ellipsis-horizontal" size={22} />
					</Pressable>
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Overlay />
					<Menu.Content
						align="end"
						className="rounded-[28px] border border-border bg-surface p-2"
						offset={10}
						placement="bottom"
						presentation="popover"
						width={260}
					>
						<Menu.Label className="px-3 pt-2 pb-1 font-semibold text-xs">
							CHAT OPTIONS
						</Menu.Label>
						<Menu.Item
							accessibilityLabel="Start a new chat"
							className="flex-row items-center gap-3 rounded-[22px] p-3"
							isAnimatedStyleActive={false}
							onPress={onNewChatPress}
						>
							<View className="h-9 w-9 items-center justify-center rounded-full bg-default">
								<Feather color="#18181B" name="edit" size={19} />
							</View>
							<View className="flex-1">
								<Menu.ItemTitle className="font-semibold text-sm">
									New chat
								</Menu.ItemTitle>
								<Menu.ItemDescription className="text-xs">
									Start fresh in the current mode.
								</Menu.ItemDescription>
							</View>
						</Menu.Item>
						<View className="my-1 h-px bg-border" />
						{CHAT_MODE_OPTIONS.map((option) => {
							const isSelected = option.id === selectedMode;
							const isDisabled = Boolean(
								"requiresTrip" in option &&
									option.requiresTrip &&
									!currentTripId
							);

							return (
								<Menu.Item
									accessibilityLabel={`Switch to ${option.label} mode`}
									className="flex-row items-center gap-3 rounded-[22px] p-3"
									isAnimatedStyleActive={false}
									isDisabled={isDisabled}
									key={option.id}
									onPress={() => onModeSelect(option.id)}
									style={{
										backgroundColor: isSelected ? option.soft : "transparent",
										opacity: isDisabled ? 0.5 : 1,
									}}
								>
									<View
										className="h-9 w-9 items-center justify-center rounded-full"
										style={{ backgroundColor: option.soft }}
									>
										<Ionicons
											color={option.accent}
											name={option.icon}
											size={18}
										/>
									</View>
									<View className="flex-1">
										<Menu.ItemTitle className="font-semibold text-sm">
											{option.label}
										</Menu.ItemTitle>
										<Menu.ItemDescription className="text-xs">
											{isDisabled
												? "Create a trip first to unlock trip context."
												: option.description}
										</Menu.ItemDescription>
									</View>
									{isSelected ? (
										<Ionicons color="#18181B" name="checkmark" size={18} />
									) : null}
								</Menu.Item>
							);
						})}
					</Menu.Content>
				</Menu.Portal>
			</Menu>
		</Surface>
	);
}

export function SlashCommandMenu({
	currentTripId,
	onSelect,
	visibleCommands,
}: {
	currentTripId: Id<"trips"> | null;
	onSelect: (command: SlashCommandOption) => void;
	visibleCommands: readonly SlashCommandOption[];
}) {
	return (
		<Surface
			className="mb-2 overflow-hidden rounded-[28px] border border-border bg-surface p-2"
			style={composerStyle}
		>
			<View className="px-3 pt-1 pb-2">
				<Text color="muted" type="body-xs" weight="semibold">
					COMMANDS
				</Text>
			</View>
			{visibleCommands.length === 0 ? (
				<View className="px-3 py-3">
					<Text color="muted" type="body-sm" weight="medium">
						No commands found
					</Text>
				</View>
			) : (
				<View className="gap-1">
					{visibleCommands.map((command) => {
						const isDisabled = Boolean(command.requiresTrip && !currentTripId);

						return (
							<Pressable
								accessibilityLabel={`Use ${command.label} command`}
								accessibilityRole="button"
								className="min-h-18 flex-row items-center gap-3 rounded-[22px] px-3 py-2.5"
								disabled={isDisabled}
								key={command.id}
								onPress={() => onSelect(command)}
								style={({ pressed }) => ({
									backgroundColor:
										pressed && !isDisabled
											? "rgba(24, 24, 27, 0.06)"
											: "transparent",
									opacity: isDisabled ? 0.45 : 1,
								})}
							>
								<View
									className="h-9 w-9 items-center justify-center rounded-full"
									style={{ backgroundColor: `${command.accent}1F` }}
								>
									<Ionicons
										color={command.accent}
										name={command.icon}
										size={18}
									/>
								</View>
								<View className="flex-1 gap-0.5">
									<View className="flex-row items-center gap-2">
										<Text type="body-sm" weight="bold">
											{command.label}
										</Text>
										{command.mode ? (
											<Text color="muted" type="body-xs" weight="medium">
												{getChatModeOption(command.mode).label}
											</Text>
										) : null}
									</View>
									<Text.Paragraph color="muted" type="body-xs">
										{isDisabled
											? "Create a trip first to use this command."
											: command.description}
									</Text.Paragraph>
								</View>
								<Ionicons
									color={isDisabled ? "#D4D4D8" : "#A1A1AA"}
									name="return-down-forward"
									size={16}
								/>
							</Pressable>
						);
					})}
				</View>
			)}
		</Surface>
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
	const primaryColor = useThemeColor("accent");
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});

	if (!isUser) {
		return <MarkdownContent text={visibleText} />;
	}

	return (
		<Text.Paragraph
			className="leading-relaxed"
			style={{ color: primaryColor }}
			type="body-sm"
			weight="semibold"
		>
			{visibleText}
		</Text.Paragraph>
	);
}

function UserMessageBubble({ text }: { text: string }) {
	const primaryColor = useThemeColor("accent");
	const userMessageBubbleStyle = getUserBubbleStyle(primaryColor);

	return (
		<View className="w-full flex-row items-start justify-end">
			<View className="max-w-[88%] px-4 py-3" style={userMessageBubbleStyle}>
				<MessageContent isStreaming={false} isUser={true} text={text} />
			</View>
		</View>
	);
}

export function ViyaChatEmptyContent({
	onSubmitSuggestion,
	promptSuggestions,
	selectedModeOption,
}: {
	onSubmitSuggestion: (prompt: string) => void;
	promptSuggestions: readonly PromptSuggestion[];
	selectedModeOption: ChatModeOption;
}) {
	return (
		<View className="gap-5">
			<EmptyState
				className="flex-none py-4"
				description={selectedModeOption.emptyDescription}
				title={selectedModeOption.emptyTitle}
				visual={
					<View
						className="h-16 w-16 items-center justify-center rounded-full"
						style={{ backgroundColor: selectedModeOption.soft }}
					>
						<Ionicons
							color={selectedModeOption.accent}
							name={selectedModeOption.icon}
							size={30}
						/>
					</View>
				}
			/>

			<View className="gap-3">
				<Text color="muted" type="body-xs" weight="semibold">
					TRY ASKING
				</Text>
				<Surface className="gap-1 rounded-[28px] border border-border bg-surface p-1">
					{promptSuggestions.map((suggestion) => (
						<Pressable
							className="min-h-16 flex-row items-center gap-3 rounded-3xl px-3 py-2.5"
							key={suggestion.title}
							onPress={() => onSubmitSuggestion(suggestion.prompt)}
						>
							<View
								className="h-9 w-9 items-center justify-center rounded-full"
								style={{ backgroundColor: suggestion.soft }}
							>
								<Ionicons
									color={suggestion.accent}
									name={suggestion.icon}
									size={17}
								/>
							</View>
							<View className="flex-1 gap-0.5">
								<Text type="body-sm" weight="semibold">
									{suggestion.title}
								</Text>
								<Text.Paragraph color="muted" type="body-xs">
									{suggestion.summary ?? suggestion.prompt}
								</Text.Paragraph>
							</View>
							<Ionicons color="#A1A1AA" name="arrow-forward" size={15} />
						</Pressable>
					))}
				</Surface>
			</View>
		</View>
	);
}

export function ViyaMessageList({
	hasPersistedPendingPrompt,
	messages,
	pendingPrompt,
	shouldShowThinking,
}: {
	hasPersistedPendingPrompt: boolean;
	messages: UiChatMessages;
	pendingPrompt: string | null;
	shouldShowThinking: boolean;
}) {
	const primaryColor = useThemeColor("accent");
	const userMessageBubbleStyle = getUserBubbleStyle(primaryColor);

	return (
		<View className="gap-6">
			{messages.map((message) => {
				const isUser = message.role === "user";
				const messageText = getUiMessageText(message);

				if (!(isUser || messageText)) {
					return <TypingBubble key={message.key} />;
				}

				return (
					<View
						className={`w-full flex-row items-start ${isUser ? "justify-end" : "justify-start"}`}
						key={message.key}
					>
						<View
							className={isUser ? "max-w-[88%] px-4 py-3" : "w-full px-1 py-1"}
							style={isUser ? userMessageBubbleStyle : undefined}
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
			{pendingPrompt && !hasPersistedPendingPrompt ? (
				<UserMessageBubble text={pendingPrompt} />
			) : null}
			{shouldShowThinking ? <TypingBubble /> : null}
		</View>
	);
}
