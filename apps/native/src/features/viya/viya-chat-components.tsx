import { useSmoothText } from "@convex-dev/agent/react";
import { Feather, Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	BottomSheet,
	Menu,
	type MenuKey,
	Surface,
	Text,
	useThemeColor,
} from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
	Easing,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
	ChatHistoryItem,
	ChatModeId,
	ChatModeOption,
	ChatQuestionPrompt,
	PromptSuggestion,
	SlashCommandOption,
	SuggestionIconName,
	ThreadIdsByContext,
	TripBlueprint,
	TripBlueprintAction,
	TripBlueprintSection,
	UiChatMessages,
} from "./viya-chat-types";
import {
	extractTripBlueprint,
	getChatModeOption,
	getSingleQuestionDisplayText,
	getThreadContextKey,
	getTripBlueprintActionPrompt,
	getUiMessageText,
	getUserBubbleStyle,
	isChatModeId,
} from "./viya-chat-utils";

const formatHistoryTimestamp = (timestamp: number) =>
	new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		month: "short",
	}).format(new Date(timestamp));

const dateQuestionPattern =
	/\b(arrival|date|dates|departure|end|leave|leaving|return|schedule|start|when)\b/i;

const dateNumberFormatter = new Intl.NumberFormat("en", {
	minimumIntegerDigits: 2,
	useGrouping: false,
});

const readableDateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

const getStartOfToday = () => {
	const now = new Date();

	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const formatDateAnswer = (date: Date) => {
	const year = date.getFullYear();
	const month = dateNumberFormatter.format(date.getMonth() + 1);
	const day = dateNumberFormatter.format(date.getDate());

	return `${year}-${month}-${day}`;
};

const formatReadableDate = (date: Date) => readableDateFormatter.format(date);

const isTravelDateQuestion = (question: string) =>
	dateQuestionPattern.test(question);

const blueprintSnapshotSectionIds = [
	"destination",
	"dates",
	"budget",
	"itineraryStyle",
] as const;

const blueprintActionItems = [
	{
		action: "refineBudget",
		icon: "wallet-outline",
		label: "Refine budget",
	},
	{
		action: "adjustItinerary",
		icon: "map-outline",
		label: "Adjust itinerary",
	},
	{
		action: "reviewRisks",
		icon: "shield-checkmark-outline",
		label: "Review risks",
	},
] as const satisfies readonly {
	action: TripBlueprintAction;
	icon: SuggestionIconName;
	label: string;
}[];

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
	currentThreadId,
	currentTripId,
	onAddToTripPress,
	onHistoryPress,
	onNewChatPress,
	threadIdsByContext,
}: {
	currentThreadId: string | null;
	currentTripId: Id<"trips"> | null;
	onAddToTripPress: () => void;
	onHistoryPress: () => void;
	onNewChatPress: () => void;
	threadIdsByContext: ThreadIdsByContext;
}) {
	const tripContextKey = currentTripId
		? getThreadContextKey("trip", currentTripId)
		: null;
	const isCurrentThreadInTrip = Boolean(
		currentThreadId &&
			tripContextKey &&
			threadIdsByContext[tripContextKey] === currentThreadId
	);
	const isAddToTripDisabled = Boolean(
		!(currentTripId && currentThreadId) || isCurrentThreadInTrip
	);
	const addToTripDescription = (() => {
		if (!currentTripId) {
			return "Create a trip before linking chat context.";
		}

		if (!currentThreadId) {
			return "Send a message before linking chat context.";
		}

		if (isCurrentThreadInTrip) {
			return "This chat is already linked to your trip.";
		}

		return "Use this chat as the active trip thread.";
	})();

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
						width={280}
					>
						<Menu.Item
							accessibilityLabel="Open chat history"
							className="flex-row items-center gap-3 rounded-[22px] p-3"
							isAnimatedStyleActive={false}
							onPress={onHistoryPress}
						>
							<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
								<Ionicons color="#0A84FF" name="time-outline" size={18} />
							</View>
							<View className="flex-1">
								<Menu.ItemTitle className="font-semibold text-sm">
									History
								</Menu.ItemTitle>
								<Menu.ItemDescription className="text-xs">
									Review previous conversations.
								</Menu.ItemDescription>
							</View>
						</Menu.Item>
						<Menu.Item
							accessibilityLabel="Add current chat to trip"
							className="flex-row items-center gap-3 rounded-[22px] p-3"
							isAnimatedStyleActive={false}
							isDisabled={isAddToTripDisabled}
							onPress={onAddToTripPress}
							style={{ opacity: isAddToTripDisabled ? 0.5 : 1 }}
						>
							<View className="h-9 w-9 items-center justify-center rounded-full bg-warning/10">
								<Ionicons color="#FF9F0A" name="briefcase-outline" size={18} />
							</View>
							<View className="flex-1">
								<Menu.ItemTitle className="font-semibold text-sm">
									Add to trip
								</Menu.ItemTitle>
								<Menu.ItemDescription className="text-xs">
									{addToTripDescription}
								</Menu.ItemDescription>
							</View>
						</Menu.Item>
					</Menu.Content>
				</Menu.Portal>
			</Menu>
		</Surface>
	);
}

export function ChatHistorySheet({
	currentThreadId,
	currentTripId,
	history,
	isOpen,
	onOpenChange,
	onSelect,
}: {
	currentThreadId: string | null;
	currentTripId: Id<"trips"> | null;
	history: readonly ChatHistoryItem[] | undefined;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSelect: (item: ChatHistoryItem) => void;
}) {
	const insets = useSafeAreaInsets();
	const hasLoaded = history !== undefined;
	const hasHistory = Boolean(history?.length);

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
				>
					<View
						className="gap-5 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="gap-1">
							<BottomSheet.Title>Chat history</BottomSheet.Title>
							<BottomSheet.Description>
								Reopen a previous Viya conversation.
							</BottomSheet.Description>
						</View>

						{hasHistory ? (
							<ScrollView
								className="max-h-[420px]"
								showsVerticalScrollIndicator={false}
							>
								<View className="gap-2 pb-1">
									{history?.map((item) => {
										const option = getChatModeOption(item.mode);
										const isCurrentThread = item.threadId === currentThreadId;
										const isUnavailableTrip =
											item.mode === "trip" &&
											Boolean(item.tripId && item.tripId !== currentTripId);
										const subtitle =
											item.mode === "trip"
												? (item.tripTitle ??
													item.tripDestination ??
													"Trip chat")
												: option.label;

										return (
											<Pressable
												accessibilityLabel={`Open ${item.title}`}
												accessibilityRole="button"
												className="min-h-14 flex-row items-center gap-3 rounded-[18px] border border-border bg-surface px-3 py-2.5"
												disabled={isUnavailableTrip}
												key={item._id}
												onPress={() => onSelect(item)}
												style={({ pressed }) => ({
													opacity: isUnavailableTrip ? 0.45 : 1,
													transform: [
														{ scale: pressed && !isUnavailableTrip ? 0.99 : 1 },
													],
												})}
											>
												<View
													className="h-8 w-8 items-center justify-center rounded-full"
													style={{ backgroundColor: option.soft }}
												>
													<Ionicons
														color={option.accent}
														name={option.icon}
														size={16}
													/>
												</View>
												<View className="flex-1 gap-0.5">
													<View className="flex-row items-center gap-2">
														<Text
															className="flex-1"
															numberOfLines={1}
															type="body-sm"
															weight="bold"
														>
															{item.title}
														</Text>
														{isCurrentThread ? (
															<Ionicons
																color="#18181B"
																name="checkmark"
																size={17}
															/>
														) : null}
													</View>
													<Text color="muted" numberOfLines={1} type="body-xs">
														{subtitle} -{" "}
														{formatHistoryTimestamp(item.updatedAt)}
													</Text>
												</View>
											</Pressable>
										);
									})}
								</View>
							</ScrollView>
						) : (
							<View className="items-center gap-2 rounded-[24px] border border-border bg-surface px-4 py-8">
								<View className="h-11 w-11 items-center justify-center rounded-full bg-default">
									<Ionicons color="#71717A" name="time-outline" size={20} />
								</View>
								<Text type="body-sm" weight="bold">
									{hasLoaded ? "No history yet" : "Loading history"}
								</Text>
								<Text align="center" color="muted" type="body-xs">
									{hasLoaded
										? "Your conversations will appear here after you send a message."
										: "Fetching your saved conversations."}
								</Text>
							</View>
						)}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function QuestionOptionsDock({
	isLoading,
	onDismiss,
	onSelectOption,
	onUseCustomAnswer,
	pendingQuestion,
}: {
	isLoading: boolean;
	onDismiss: (question: ChatQuestionPrompt) => void;
	onSelectOption: (value: string) => void;
	onUseCustomAnswer: () => void;
	pendingQuestion: ChatQuestionPrompt | null | undefined;
}) {
	const today = useMemo(() => getStartOfToday(), []);
	const [selectedDate, setSelectedDate] = useState(today);

	if (!pendingQuestion) {
		return null;
	}

	const option = getChatModeOption(pendingQuestion.mode);
	const shouldShowDatePicker = isTravelDateQuestion(pendingQuestion.question);
	const selectedDateAnswer = formatDateAnswer(selectedDate);
	const selectedDateLabel = formatReadableDate(selectedDate);

	return (
		<Surface
			className="mb-2 overflow-hidden rounded-[24px] border border-border bg-surface p-2"
			style={composerStyle}
		>
			<View className="gap-2">
				<View className="flex-row items-start gap-3 px-1 pt-1">
					<View
						className="mt-0.5 h-8 w-8 items-center justify-center rounded-full"
						style={{ backgroundColor: option.soft }}
					>
						<Ionicons color={option.accent} name={option.icon} size={16} />
					</View>
					<View className="flex-1 gap-0.5">
						<Text color="muted" type="body-xs" weight="semibold">
							{pendingQuestion.stepLabel ?? `${option.label} question`}
						</Text>
						<Text type="body-sm" weight="bold">
							{pendingQuestion.question}
						</Text>
					</View>
					<Pressable
						accessibilityLabel="Dismiss question options"
						accessibilityRole="button"
						className="h-8 w-8 items-center justify-center rounded-full"
						onPress={() => onDismiss(pendingQuestion)}
					>
						<Ionicons color="#71717A" name="close" size={17} />
					</Pressable>
				</View>

				{shouldShowDatePicker ? (
					<View
						className="gap-3 rounded-[20px] border border-border bg-default/40 p-3"
						style={{ borderCurve: "continuous" }}
					>
						<View className="flex-row items-center gap-3">
							<View
								className="h-9 w-9 items-center justify-center rounded-full bg-surface"
								style={{ borderCurve: "continuous" }}
							>
								<Ionicons
									color={option.accent}
									name="calendar-outline"
									size={17}
								/>
							</View>
							<View className="flex-1 gap-0.5">
								<Text type="body-sm" weight="bold">
									Pick a date
								</Text>
								<Text color="muted" type="body-xs">
									Only today or future dates are available.
								</Text>
							</View>
						</View>
						<View className="flex-row items-center justify-between gap-3">
							<View className="min-h-12 flex-1 justify-center rounded-[16px] bg-surface px-3">
								<Text color="muted" type="body-xs" weight="medium">
									Selected
								</Text>
								<Text type="body-sm" weight="bold">
									{selectedDateLabel}
								</Text>
							</View>
							<DateTimePicker
								accentColor={option.accent}
								minimumDate={today}
								mode="date"
								onChange={(_event, nextDate) => {
									if (nextDate) {
										setSelectedDate(nextDate);
									}
								}}
								value={selectedDate}
							/>
						</View>
						<Pressable
							accessibilityLabel={`Use ${selectedDateLabel}`}
							accessibilityRole="button"
							className="min-h-11 flex-row items-center justify-center gap-2 rounded-[16px] px-3 py-2.5"
							disabled={isLoading}
							onPress={() => onSelectOption(selectedDateAnswer)}
							style={({ pressed }) => ({
								backgroundColor: option.accent,
								opacity: isLoading ? 0.5 : 1,
								transform: [{ scale: pressed && !isLoading ? 0.99 : 1 }],
							})}
						>
							<Ionicons color="#FFFFFF" name="checkmark" size={16} />
							<Text className="text-white" type="body-sm" weight="bold">
								Use {selectedDateLabel}
							</Text>
						</Pressable>
					</View>
				) : null}

				<View className="gap-1">
					{pendingQuestion.options.map((questionOption, index) => (
						<Pressable
							accessibilityLabel={`Choose ${questionOption.label}`}
							accessibilityRole="button"
							className="min-h-10 flex-row items-center gap-3 rounded-[16px] px-2 py-2"
							disabled={isLoading}
							key={questionOption.id}
							onPress={() => onSelectOption(questionOption.value)}
							style={({ pressed }) => ({
								backgroundColor:
									pressed && !isLoading
										? "rgba(24, 24, 27, 0.06)"
										: "transparent",
								opacity: isLoading ? 0.5 : 1,
							})}
						>
							<View className="h-6 w-6 items-center justify-center rounded-full bg-default">
								<Text type="body-xs" weight="bold">
									{index + 1}
								</Text>
							</View>
							<Text className="flex-1" numberOfLines={2} type="body-sm">
								{questionOption.label}
							</Text>
						</Pressable>
					))}
					<Pressable
						accessibilityLabel="Answer with something else"
						accessibilityRole="button"
						className="min-h-10 flex-row items-center gap-3 rounded-[16px] px-2 py-2"
						onPress={onUseCustomAnswer}
					>
						<View className="h-6 w-6 items-center justify-center rounded-full bg-default">
							<Ionicons color="#18181B" name="pencil-outline" size={13} />
						</View>
						<Text className="flex-1" color="muted" type="body-sm">
							Something else
						</Text>
					</Pressable>
				</View>
			</View>
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

function getBlueprintSection(
	blueprint: TripBlueprint,
	sectionId: TripBlueprintSection["id"]
) {
	return blueprint.sections.find((section) => section.id === sectionId) ?? null;
}

const isBlueprintSnapshotSection = (sectionId: TripBlueprintSection["id"]) =>
	blueprintSnapshotSectionIds.some((snapshotId) => snapshotId === sectionId);

function TripBlueprintSnapshot({ blueprint }: { blueprint: TripBlueprint }) {
	const snapshotSections = blueprintSnapshotSectionIds
		.map((sectionId) => getBlueprintSection(blueprint, sectionId))
		.filter((section) => section !== null);

	return (
		<View className="flex-row flex-wrap gap-2">
			{snapshotSections.map((section) => (
				<View
					className="min-h-16 w-[48%] gap-1 rounded-[18px] bg-default/50 p-3"
					key={section.id}
					style={{ borderCurve: "continuous" }}
				>
					<Text color="muted" type="body-xs" weight="semibold">
						{section.label}
					</Text>
					<Text numberOfLines={3} type="body-sm" weight="bold">
						{section.items[0]}
					</Text>
				</View>
			))}
		</View>
	);
}

function TripBlueprintSectionList({
	sections,
}: {
	sections: readonly TripBlueprintSection[];
}) {
	return (
		<View className="gap-3">
			{sections.map((section) => (
				<View className="gap-2" key={section.id}>
					<Text type="body-sm" weight="bold">
						{section.label}
					</Text>
					<View className="gap-1.5">
						{section.items.slice(0, 3).map((item) => (
							<View className="flex-row gap-2" key={`${section.id}-${item}`}>
								<Text color="muted" type="body-sm" weight="bold">
									-
								</Text>
								<Text.Paragraph
									className="flex-1 leading-5"
									color="muted"
									type="body-sm"
								>
									{item}
								</Text.Paragraph>
							</View>
						))}
						{section.items.length > 3 ? (
							<Text color="muted" type="body-xs" weight="medium">
								+{section.items.length - 3} more
							</Text>
						) : null}
					</View>
				</View>
			))}
		</View>
	);
}

function TripBlueprintReviewCard({
	blueprint,
	isCreatingTripFromBlueprint = false,
	onCreateTripFromBlueprint,
	onSubmitBlueprintAction,
}: {
	blueprint: TripBlueprint;
	isCreatingTripFromBlueprint?: boolean;
	onCreateTripFromBlueprint?: (blueprint: TripBlueprint) => void;
	onSubmitBlueprintAction?: (prompt: string) => void;
}) {
	const primaryColor = useThemeColor("accent");
	const detailSections = blueprint.sections.filter(
		(section) => !isBlueprintSnapshotSection(section.id)
	);

	return (
		<Surface className="mt-4 gap-4 rounded-[28px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(191, 90, 242, 0.12)" }}
				>
					<Ionicons color="#BF5AF2" name="map-outline" size={19} />
				</View>
				<View className="flex-1 gap-1">
					<Text
						style={{ color: primaryColor }}
						type="body-xs"
						weight="semibold"
					>
						PLANNING OUTPUT
					</Text>
					<Text type="body" weight="bold">
						{blueprint.title}
					</Text>
					{blueprint.summary ? (
						<Text.Paragraph color="muted" type="body-sm">
							{blueprint.summary}
						</Text.Paragraph>
					) : null}
				</View>
			</View>

			<TripBlueprintSnapshot blueprint={blueprint} />

			{detailSections.length > 0 ? (
				<TripBlueprintSectionList sections={detailSections} />
			) : null}

			<Pressable
				accessibilityLabel="Create trip from blueprint"
				accessibilityRole="button"
				className="min-h-12 flex-row items-center justify-center gap-2 rounded-full px-4 py-3"
				disabled={isCreatingTripFromBlueprint}
				onPress={() => onCreateTripFromBlueprint?.(blueprint)}
				style={({ pressed }) => ({
					backgroundColor: primaryColor,
					opacity: isCreatingTripFromBlueprint ? 0.55 : 1,
					transform: [
						{ scale: pressed && !isCreatingTripFromBlueprint ? 0.99 : 1 },
					],
				})}
			>
				<Ionicons color="#FFFFFF" name="checkmark-circle-outline" size={17} />
				<Text className="text-white" type="body-sm" weight="bold">
					{isCreatingTripFromBlueprint ? "Creating trip" : "Create trip"}
				</Text>
			</Pressable>

			<View className="flex-row flex-wrap gap-2 border-border border-t pt-3">
				{blueprintActionItems.map((item) => (
					<Pressable
						accessibilityLabel={item.label}
						accessibilityRole="button"
						className="min-h-10 flex-row items-center gap-2 rounded-full border border-border px-3 py-2"
						key={item.action}
						onPress={() =>
							onSubmitBlueprintAction?.(
								getTripBlueprintActionPrompt(item.action, blueprint)
							)
						}
						style={({ pressed }) => ({
							backgroundColor: pressed
								? "rgba(24, 24, 27, 0.06)"
								: "transparent",
						})}
					>
						<Ionicons color={primaryColor} name={item.icon} size={15} />
						<Text type="body-xs" weight="bold">
							{item.label}
						</Text>
					</Pressable>
				))}
			</View>
		</Surface>
	);
}

function MessageContent({
	isCreatingTripFromBlueprint,
	isStreaming,
	isUser,
	onCreateTripFromBlueprint,
	onSubmitBlueprintAction,
	text,
}: {
	isCreatingTripFromBlueprint?: boolean;
	isStreaming: boolean;
	isUser: boolean;
	onCreateTripFromBlueprint?: (blueprint: TripBlueprint) => void;
	onSubmitBlueprintAction?: (prompt: string) => void;
	text: string;
}) {
	const primaryColor = useThemeColor("accent");
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});
	const displayText = isUser
		? visibleText
		: getSingleQuestionDisplayText(visibleText);
	const blueprint = isUser ? null : extractTripBlueprint(displayText);

	if (!isUser) {
		return (
			<View>
				<MarkdownContent text={displayText} />
				{blueprint ? (
					<TripBlueprintReviewCard
						blueprint={blueprint}
						isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
						onCreateTripFromBlueprint={onCreateTripFromBlueprint}
						onSubmitBlueprintAction={onSubmitBlueprintAction}
					/>
				) : null}
			</View>
		);
	}

	return (
		<Text.Paragraph
			className="leading-relaxed"
			style={{ color: primaryColor }}
			type="body-sm"
			weight="semibold"
		>
			{displayText}
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
	bottomSpacerHeight,
	hasPersistedPendingPrompt,
	isCreatingTripFromBlueprint,
	messages,
	onCreateTripFromBlueprint,
	onSubmitBlueprintAction,
	pendingPrompt,
	shouldShowThinking,
}: {
	bottomSpacerHeight: number;
	hasPersistedPendingPrompt: boolean;
	isCreatingTripFromBlueprint: boolean;
	messages: UiChatMessages;
	onCreateTripFromBlueprint: (blueprint: TripBlueprint) => void;
	onSubmitBlueprintAction: (prompt: string) => void;
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
								isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
								isStreaming={message.status === "streaming"}
								isUser={isUser}
								onCreateTripFromBlueprint={onCreateTripFromBlueprint}
								onSubmitBlueprintAction={onSubmitBlueprintAction}
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
			{bottomSpacerHeight > 0 ? (
				<View
					accessibilityElementsHidden={true}
					importantForAccessibility="no-hide-descendants"
					style={{ height: bottomSpacerHeight }}
				/>
			) : null}
		</View>
	);
}
