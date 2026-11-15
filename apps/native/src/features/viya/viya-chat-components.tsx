import { useSmoothText } from "@convex-dev/agent/react";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { Menu } from "heroui-native";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	DateRangePickerField,
	type DateRangeValue,
	formatIsoDate,
	getStartOfToday,
} from "@/src/components/date/date-picker-field";
import {
	AppSheet,
	AppText,
	Chip,
	fadeIn,
	Icon,
	type IconName,
	inputThemeProps,
	ListGroup,
	ListRow,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { formatTripRange } from "@/src/lib/format";

import { MarkdownContent } from "./viya-chat-markdown";
import type {
	ChatHistoryItem,
	ChatModeId,
	ChatQuestionPrompt,
	ChatTripContextItem,
	PromptSuggestion,
	SlashCommandOption,
	TripBlueprint,
	TripBlueprintAction,
	UiChatMessages,
} from "./viya-chat-types";
import {
	extractTripBlueprint,
	getPendingPromptInsertionIndex,
	getSingleQuestionDisplayText,
	getTripBlueprintActionPrompt,
	getUiMessageText,
} from "./viya-chat-utils";

const SHEET_LIST_MAX_HEIGHT = 440;
const HISTORY_SEARCH_THRESHOLD = 7;
const MAX_SLASH_COMMANDS = 5;
const DAY_MS = 86_400_000;
const FOUR_DAYS = 4;

const dateQuestionPattern =
	/\b(arrival|date|dates|departure|end|leave|leaving|return|schedule|start|when)\b/i;
const exactDateOptionPattern =
	/\b(?:exact|specific)\b.*\bdate|\bdate\b.*\bapp\b/i;

const isTravelDateQuestion = (question: string) =>
	dateQuestionPattern.test(question);

const addCalendarDays = (date: Date, days: number) => {
	const nextDate = new Date(date);
	nextDate.setDate(nextDate.getDate() + days);

	return nextDate;
};

const getDefaultTravelDateRange = (): DateRangeValue => {
	const startDate = getStartOfToday();

	return {
		end: formatIsoDate(addCalendarDays(startDate, FOUR_DAYS)),
		start: formatIsoDate(startDate),
	};
};

const blueprintActionItems = [
	{ action: "refineBudget", label: "Refine budget" },
	{ action: "adjustItinerary", label: "Adjust itinerary" },
	{ action: "reviewRisks", label: "Review risks" },
] as const satisfies readonly {
	action: TripBlueprintAction;
	label: string;
}[];

const menuContentClassName = "rounded-[20px] bg-surface p-2";
const menuItemClassName = "flex-row items-center gap-3 rounded-[14px] p-3";

/** Quiet centred line for empty and loading states inside sheets. */
function SheetMessage({
	isLoading = false,
	text,
}: {
	isLoading?: boolean;
	text: string;
}) {
	return (
		<View
			accessibilityLiveRegion="polite"
			style={{
				alignItems: "center",
				gap: spacing.md,
				paddingHorizontal: spacing.screen,
				paddingVertical: spacing["3xl"],
			}}
		>
			{isLoading ? <ActivityIndicator /> : null}
			<AppText
				style={{ textAlign: "center" }}
				tone="secondary"
				variant="subhead"
			>
				{text}
			</AppText>
		</View>
	);
}

function SheetScroll({ children }: { children: ReactNode }) {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			contentContainerStyle={{
				gap: spacing.section,
				paddingBottom: Math.max(insets.bottom, spacing.lg),
				paddingHorizontal: spacing.screen,
				paddingTop: spacing.sm,
			}}
			keyboardShouldPersistTaps="handled"
			showsVerticalScrollIndicator={false}
			style={{ maxHeight: SHEET_LIST_MAX_HEIGHT }}
		>
			{children}
		</ScrollView>
	);
}

const getHistoryGroupLabel = (timestamp: number, now: number) => {
	const startOfToday = new Date(now).setHours(0, 0, 0, 0);

	if (timestamp >= startOfToday) {
		return "Today";
	}

	if (timestamp >= startOfToday - DAY_MS) {
		return "Yesterday";
	}

	return "Earlier";
};

const formatHistoryTimestamp = (timestamp: number) =>
	new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		month: "short",
	}).format(new Date(timestamp));

export function ChatHistorySheet({
	chatMode,
	currentThreadId,
	currentTripId,
	history,
	isOpen,
	onOpenChange,
	onSelect,
}: {
	chatMode: ChatModeId;
	currentThreadId: string | null;
	currentTripId: Id<"trips"> | null;
	history: readonly ChatHistoryItem[] | undefined;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSelect: (item: ChatHistoryItem) => void;
}) {
	const { palette } = useUITheme();
	const [query, setQuery] = useState("");
	const hasLoaded = history !== undefined;
	const isTripScopedHistory = chatMode === "trip" && Boolean(currentTripId);
	const normalizedQuery = query.trim().toLowerCase();

	const groups = useMemo(() => {
		const now = Date.now();
		const filtered = (history ?? []).filter(
			(item) =>
				!normalizedQuery || item.title.toLowerCase().includes(normalizedQuery)
		);
		const byLabel = new Map<string, ChatHistoryItem[]>();

		for (const item of filtered) {
			const label = getHistoryGroupLabel(item.updatedAt, now);
			byLabel.set(label, [...(byLabel.get(label) ?? []), item]);
		}

		return ["Today", "Yesterday", "Earlier"]
			.map((label) => ({ items: byLabel.get(label) ?? [], label }))
			.filter((group) => group.items.length > 0);
	}, [history, normalizedQuery]);

	let emptyText = "No conversations yet.";

	if (!hasLoaded) {
		emptyText = "Loading conversations";
	} else if (normalizedQuery) {
		emptyText = "No matches.";
	} else if (isTripScopedHistory) {
		emptyText = "No conversations for this trip yet.";
	}

	return (
		<AppSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<SheetHeader onClose={() => onOpenChange(false)} title="Conversations" />
			<SheetScroll>
				{(history?.length ?? 0) >= HISTORY_SEARCH_THRESHOLD ? (
					<TextInput
						accessibilityLabel="Search conversations"
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						onChangeText={setQuery}
						placeholder="Search"
						{...inputThemeProps(palette)}
						returnKeyType="search"
						style={{
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							color: palette.ink,
							fontSize: 17,
							height: 40,
							paddingHorizontal: spacing.lg,
						}}
						value={query}
					/>
				) : null}
				{groups.length === 0 ? (
					<SheetMessage isLoading={!hasLoaded} text={emptyText} />
				) : (
					groups.map((group) => (
						<ListGroup header={group.label} key={group.label}>
							{group.items.map((item) => {
								const isCurrentThread = item.threadId === currentThreadId;
								const isUnavailableTrip =
									item.mode === "trip" &&
									Boolean(item.tripId && item.tripId !== currentTripId);
								const context =
									item.mode === "trip"
										? (item.tripTitle ?? item.tripDestination ?? "Trip")
										: null;
								const time = formatHistoryTimestamp(item.updatedAt);

								return (
									<ListRow
										accessibilityLabel={`Open ${item.title}`}
										key={item._id}
										onPress={
											isUnavailableTrip ? undefined : () => onSelect(item)
										}
										showChevron={false}
										subtitle={context ? `${context}, ${time}` : time}
										title={item.title}
										trailing={
											isCurrentThread ? (
												<Icon
													name="checkmark"
													size={18}
													tone="accent"
													weight="semibold"
												/>
											) : null
										}
									/>
								);
							})}
						</ListGroup>
					))
				)}
			</SheetScroll>
		</AppSheet>
	);
}

export function TripContextSheet({
	isOpen,
	onOpenChange,
	onSelect,
	selectedTripId,
	trips,
}: {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSelect: (tripId: Id<"trips">) => void;
	selectedTripId: Id<"trips"> | null;
	trips: readonly ChatTripContextItem[];
}) {
	return (
		<AppSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<SheetHeader
				onClose={() => onOpenChange(false)}
				subtitle="Viya reads this trip's itinerary, bookings, budget and Vault."
				title="Trip context"
			/>
			<SheetScroll>
				{trips.length > 0 ? (
					<ListGroup>
						{trips.map((trip) => (
							<ListRow
								accessibilityLabel={`Use ${trip.title} as trip context`}
								key={trip._id}
								onPress={() => onSelect(trip._id)}
								showChevron={false}
								subtitle={`${trip.destination} · ${formatTripRange(trip.startDate, trip.endDate)}`}
								title={trip.title}
								trailing={
									trip._id === selectedTripId ? (
										<Icon
											name="checkmark"
											size={18}
											tone="accent"
											weight="semibold"
										/>
									) : null
								}
							/>
						))}
					</ListGroup>
				) : (
					<SheetMessage text="No trips yet. Create one and Viya can plan around it." />
				)}
			</SheetScroll>
		</AppSheet>
	);
}

/** Composer "+" menu: attach a file, choose trip context, start a trip. */
export function ComposerMenu({
	accessibilityLabel,
	canChooseTrip,
	currentTripTitle,
	isBusy,
	onAddFile,
	onChooseTrip,
	onCreateTrip,
}: {
	accessibilityLabel: string;
	canChooseTrip: boolean;
	currentTripTitle: string | null;
	isBusy: boolean;
	onAddFile: () => void;
	onChooseTrip: () => void;
	onCreateTrip: () => void;
}) {
	const { palette } = useUITheme();
	const items: {
		disabled?: boolean;
		icon: IconName;
		id: string;
		label: string;
		onPress: () => void;
	}[] = [
		{
			disabled: isBusy,
			icon: "document-attach-outline",
			id: "file",
			label: "Add file",
			onPress: onAddFile,
		},
		...(canChooseTrip
			? [
					{
						icon: "briefcase-outline" as const,
						id: "trip",
						label: currentTripTitle
							? `Trip context: ${currentTripTitle}`
							: "Trip context",
						onPress: onChooseTrip,
					},
				]
			: []),
		{
			icon: "map-outline",
			id: "create",
			label: "Create trip",
			onPress: onCreateTrip,
		},
	];

	return (
		<Menu>
			<Menu.Trigger asChild={true}>
				<PressableScale
					accessibilityLabel={accessibilityLabel}
					accessibilityState={{ busy: isBusy }}
					style={{
						alignItems: "center",
						height: 44,
						justifyContent: "center",
						width: 44,
					}}
				>
					{isBusy ? (
						<ActivityIndicator color={palette.ink} size="small" />
					) : (
						<Icon name="add" size={24} weight="medium" />
					)}
				</PressableScale>
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Overlay />
				<Menu.Content
					align="start"
					className={menuContentClassName}
					offset={10}
					placement="top"
					presentation="popover"
					width={260}
				>
					{items.map((item) => (
						<Menu.Item
							accessibilityLabel={item.label}
							className={menuItemClassName}
							isAnimatedStyleActive={false}
							isDisabled={item.disabled}
							key={item.id}
							onPress={item.onPress}
						>
							<Icon name={item.icon} size={20} />
							<Menu.ItemTitle className="flex-1 text-base">
								{item.label}
							</Menu.ItemTitle>
						</Menu.Item>
					))}
				</Menu.Content>
			</Menu.Portal>
		</Menu>
	);
}

/** Quiet context row inside the composer; tap to change, x to unbind. */
export function TripContextChip({
	currentTrip,
	isClearable,
	onClear,
	onPress,
}: {
	currentTrip: ChatTripContextItem;
	isClearable: boolean;
	onClear: () => void;
	onPress: () => void;
}) {
	return (
		<Animated.View
			entering={fadeIn}
			style={{
				alignItems: "center",
				flexDirection: "row",
				minHeight: 36,
				paddingLeft: spacing.lg,
			}}
		>
			<PressableScale
				accessibilityLabel={`Change trip context from ${currentTrip.title}`}
				haptic="selection"
				onPress={onPress}
				style={{
					alignItems: "center",
					flexDirection: "row",
					flexShrink: 1,
					gap: spacing.xs + 2,
					minHeight: 36,
				}}
			>
				<Icon name="briefcase-outline" size={14} tone="secondary" />
				<AppText
					numberOfLines={1}
					style={{ flexShrink: 1 }}
					tone="secondary"
					variant="footnote"
				>
					{currentTrip.title}
				</AppText>
			</PressableScale>
			{isClearable ? (
				<PressableScale
					accessibilityLabel="Clear trip context"
					onPress={onClear}
					style={{
						alignItems: "center",
						height: 36,
						justifyContent: "center",
						width: 36,
					}}
				>
					<Icon name="close" size={12} tone="secondary" weight="semibold" />
				</PressableScale>
			) : null}
		</Animated.View>
	);
}

/** Inline answer for Viya's pending question. Lives in the conversation. */
export function QuestionOptionsDock({
	isLoading,
	onSelectOption,
	onUseCustomAnswer,
	pendingQuestion,
}: {
	isLoading: boolean;
	onSelectOption: (value: string) => void;
	onUseCustomAnswer: (value: string) => void;
	pendingQuestion: ChatQuestionPrompt | null | undefined;
}) {
	const { palette } = useUITheme();
	const today = useMemo(() => getStartOfToday(), []);
	const [selectedDateRange, setSelectedDateRange] = useState<DateRangeValue>(
		getDefaultTravelDateRange
	);
	const [customAnswer, setCustomAnswer] = useState("");
	const [isCustomAnswerVisible, setIsCustomAnswerVisible] = useState(false);
	const pendingQuestionId = pendingQuestion?._id;

	useEffect(() => {
		if (!pendingQuestionId) {
			return;
		}

		setCustomAnswer("");
		setIsCustomAnswerVisible(false);
	}, [pendingQuestionId]);

	if (!pendingQuestion) {
		return null;
	}

	const shouldShowDatePicker = isTravelDateQuestion(pendingQuestion.question);
	const visibleQuestionOptions = shouldShowDatePicker
		? pendingQuestion.options.filter(
				(questionOption) => !exactDateOptionPattern.test(questionOption.label)
			)
		: pendingQuestion.options;
	const selectedDateAnswer = `${selectedDateRange.start} to ${selectedDateRange.end}`;
	const selectedDateLabel = formatTripRange(
		selectedDateRange.start,
		selectedDateRange.end,
		{ year: "always" }
	);
	const trimmedCustomAnswer = customAnswer.trim();

	return (
		<Animated.View entering={fadeIn} style={{ gap: spacing.md }}>
			<View style={{ gap: spacing.xs }}>
				{pendingQuestion.stepLabel ? (
					<AppText tone="secondary" variant="eyebrow">
						{pendingQuestion.stepLabel}
					</AppText>
				) : null}
				<AppText accessibilityRole="header" variant="headline">
					{pendingQuestion.question}
				</AppText>
			</View>

			{shouldShowDatePicker ? (
				<View style={{ gap: spacing.md }}>
					<DateRangePickerField
						accentColor={palette.accent}
						helperText="Select your departure and return dates."
						label="Travel dates"
						minimumDate={today}
						onValueChange={setSelectedDateRange}
						value={selectedDateRange}
					/>
					<PrimaryButton
						accessibilityLabel={`Use ${selectedDateLabel}`}
						disabled={isLoading}
						label={`Use ${selectedDateLabel}`}
						onPress={() => onSelectOption(selectedDateAnswer)}
					/>
				</View>
			) : null}

			<ListGroup>
				{[
					...visibleQuestionOptions.map((questionOption) => (
						<ListRow
							accessibilityLabel={`Choose ${questionOption.label}`}
							key={questionOption.id}
							onPress={
								isLoading
									? undefined
									: () => onSelectOption(questionOption.value)
							}
							showChevron={false}
							title={questionOption.label}
						/>
					)),
					<ListRow
						accessibilityLabel="Answer with something else"
						key="other"
						onPress={() => setIsCustomAnswerVisible(true)}
						showChevron={false}
						title="Other"
					/>,
				]}
			</ListGroup>

			{isCustomAnswerVisible ? (
				<Animated.View
					entering={fadeIn}
					style={{
						backgroundColor: palette.surface,
						borderRadius: radius.card,
						gap: spacing.sm,
						padding: spacing.md,
					}}
				>
					<TextInput
						accessibilityLabel="Custom question answer"
						autoFocus={true}
						editable={!isLoading}
						multiline={true}
						onChangeText={setCustomAnswer}
						placeholder="Type your answer"
						{...inputThemeProps(palette)}
						style={{
							color: palette.ink,
							fontSize: 17,
							lineHeight: 22,
							minHeight: 66,
							textAlignVertical: "top",
						}}
						value={customAnswer}
					/>
					<View
						style={{
							flexDirection: "row",
							gap: spacing.sm,
							justifyContent: "flex-end",
						}}
					>
						<SecondaryButton
							fullWidth={false}
							label="Cancel"
							onPress={() => {
								setCustomAnswer("");
								setIsCustomAnswerVisible(false);
							}}
							variant="plain"
						/>
						<PrimaryButton
							disabled={!trimmedCustomAnswer}
							fullWidth={false}
							isPending={isLoading}
							label="Send"
							onPress={() => onUseCustomAnswer(trimmedCustomAnswer)}
						/>
					</View>
				</Animated.View>
			) : null}
		</Animated.View>
	);
}

/** Opaque command list above the composer. Monochrome icons, five at most. */
export function SlashCommandMenu({
	currentTripId,
	onSelect,
	visibleCommands,
}: {
	currentTripId: Id<"trips"> | null;
	onSelect: (command: SlashCommandOption) => void;
	visibleCommands: readonly SlashCommandOption[];
}) {
	const commands = visibleCommands.slice(0, MAX_SLASH_COMMANDS);

	return (
		<Animated.View
			entering={fadeIn}
			style={{ paddingHorizontal: spacing.screen - spacing.sm }}
		>
			{commands.length === 0 ? (
				<AppText
					style={{ paddingVertical: spacing.md, textAlign: "center" }}
					tone="secondary"
					variant="subhead"
				>
					No commands found
				</AppText>
			) : (
				<ListGroup>
					{commands.map((command) => {
						const isDisabled = Boolean(command.requiresTrip && !currentTripId);

						return (
							<ListRow
								accessibilityLabel={`Use ${command.label} command`}
								key={command.id}
								leading={
									<Icon name={command.icon} size={20} tone="secondary" />
								}
								onPress={isDisabled ? undefined : () => onSelect(command)}
								showChevron={false}
								subtitle={
									isDisabled
										? "Create a trip first to use this command."
										: command.description
								}
								title={command.label}
							/>
						);
					})}
				</ListGroup>
			)}
		</Animated.View>
	);
}

/** Suggested prompts: three titles, sent on tap. Only while the thread is empty. */
export function ViyaSuggestionChips({
	onSubmitSuggestion,
	promptSuggestions,
}: {
	onSubmitSuggestion: (prompt: string) => void;
	promptSuggestions: readonly PromptSuggestion[];
}) {
	return (
		<Animated.View entering={fadeIn}>
			<ScrollView
				contentContainerStyle={{
					gap: spacing.sm,
					paddingHorizontal: spacing.lg,
				}}
				horizontal={true}
				keyboardShouldPersistTaps="handled"
				showsHorizontalScrollIndicator={false}
			>
				{promptSuggestions.slice(0, 3).map((suggestion) => (
					<Chip
						key={suggestion.title}
						label={suggestion.title}
						onPress={() => onSubmitSuggestion(suggestion.prompt)}
					/>
				))}
			</ScrollView>
		</Animated.View>
	);
}

export function ViyaChatEmptyContent({
	subtitle,
	title,
}: {
	subtitle: string;
	title: string;
}) {
	return (
		<Animated.View
			entering={fadeIn}
			style={{
				alignItems: "center",
				gap: spacing.sm,
				paddingHorizontal: spacing.screen,
			}}
		>
			<AppText
				accessibilityRole="header"
				style={{ textAlign: "center" }}
				variant="title"
			>
				{title}
			</AppText>
			<AppText
				style={{ textAlign: "center" }}
				tone="secondary"
				variant="subhead"
			>
				{subtitle}
			</AppText>
		</Animated.View>
	);
}

function ThinkingRow() {
	return (
		<Animated.View
			accessibilityLabel="Viya is thinking"
			accessibilityLiveRegion="polite"
			entering={fadeIn}
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.sm,
				minHeight: 28,
			}}
		>
			<ActivityIndicator size="small" />
			<AppText tone="secondary" variant="subhead">
				Thinking
			</AppText>
		</Animated.View>
	);
}

function TripBlueprintActions({
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
	return (
		<View style={{ gap: spacing.md, marginTop: spacing.md }}>
			<PrimaryButton
				accessibilityLabel="Create trip from AI setup"
				isPending={isCreatingTripFromBlueprint}
				label="Create trip"
				onPress={() => onCreateTripFromBlueprint?.(blueprint)}
			/>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{blueprintActionItems.map((item) => (
					<Chip
						key={item.action}
						label={item.label}
						onPress={() =>
							onSubmitBlueprintAction?.(
								getTripBlueprintActionPrompt(item.action, blueprint)
							)
						}
					/>
				))}
			</View>
		</View>
	);
}

function AssistantMessage({
	isCreatingTripFromBlueprint,
	isStreaming,
	onCreateTripFromBlueprint,
	onSubmitBlueprintAction,
	text,
}: {
	isCreatingTripFromBlueprint: boolean;
	isStreaming: boolean;
	onCreateTripFromBlueprint: (blueprint: TripBlueprint) => void;
	onSubmitBlueprintAction: (prompt: string) => void;
	text: string;
}) {
	const [visibleText] = useSmoothText(text, { startStreaming: isStreaming });
	const displayText = getSingleQuestionDisplayText(visibleText);
	const blueprint = extractTripBlueprint(displayText);

	return (
		<View>
			<MarkdownContent text={displayText} />
			{blueprint ? (
				<TripBlueprintActions
					blueprint={blueprint}
					isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
					onCreateTripFromBlueprint={onCreateTripFromBlueprint}
					onSubmitBlueprintAction={onSubmitBlueprintAction}
				/>
			) : null}
		</View>
	);
}

/** Outgoing message: quiet filled bubble, right aligned. */
function UserMessage({ text }: { text: string }) {
	const { palette } = useUITheme();

	return (
		<Animated.View entering={fadeIn} style={{ alignItems: "flex-end" }}>
			<View
				style={{
					backgroundColor: palette.fill,
					borderRadius: radius.card,
					maxWidth: "85%",
					paddingHorizontal: spacing.lg,
					paddingVertical: spacing.md - 2,
				}}
			>
				<AppText selectable={true} variant="body">
					{text}
				</AppText>
			</View>
		</Animated.View>
	);
}

export function ViyaMessageList({
	hasPersistedPendingPrompt,
	isCreatingTripFromBlueprint,
	messages,
	onCreateTripFromBlueprint,
	onSubmitBlueprintAction,
	pendingPrompt,
	pendingPromptMessageIndex,
	shouldShowThinking,
}: {
	hasPersistedPendingPrompt: boolean;
	isCreatingTripFromBlueprint: boolean;
	messages: UiChatMessages;
	onCreateTripFromBlueprint: (blueprint: TripBlueprint) => void;
	onSubmitBlueprintAction: (prompt: string) => void;
	pendingPrompt: string | null;
	pendingPromptMessageIndex?: number | null;
	shouldShowThinking: boolean;
}) {
	const persistedPendingPromptMessageIndex = pendingPrompt
		? messages.findIndex(
				(message) =>
					message.role === "user" && getUiMessageText(message) === pendingPrompt
			)
		: -1;
	const pendingPromptInsertionIndex = getPendingPromptInsertionIndex({
		hasPersistedPendingPrompt,
		messageCount: messages.length,
		pendingPrompt,
		pendingPromptMessageIndex: pendingPromptMessageIndex ?? null,
		persistedPromptMessageIndex:
			persistedPendingPromptMessageIndex < 0
				? null
				: persistedPendingPromptMessageIndex,
	});

	return (
		<View style={{ gap: spacing.section }}>
			{messages.map((message, messageIndex) => {
				const isUser = message.role === "user";
				const messageText = getUiMessageText(message);
				const shouldInsertPendingPrompt =
					pendingPromptInsertionIndex === messageIndex;
				const shouldSkipMisorderedPendingPrompt = Boolean(
					pendingPromptInsertionIndex !== null &&
						isUser &&
						pendingPrompt &&
						messageText === pendingPrompt
				);

				if (shouldSkipMisorderedPendingPrompt) {
					return null;
				}

				let body: ReactNode = null;

				if (isUser) {
					body = <UserMessage text={messageText} />;
				} else if (messageText) {
					body = (
						<AssistantMessage
							isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
							isStreaming={message.status === "streaming"}
							onCreateTripFromBlueprint={onCreateTripFromBlueprint}
							onSubmitBlueprintAction={onSubmitBlueprintAction}
							text={messageText}
						/>
					);
				} else {
					body = <ThinkingRow />;
				}

				return (
					<View key={message.key} style={{ gap: spacing.section }}>
						{shouldInsertPendingPrompt && pendingPrompt ? (
							<UserMessage text={pendingPrompt} />
						) : null}
						{body}
					</View>
				);
			})}
			{pendingPromptInsertionIndex === messages.length && pendingPrompt ? (
				<UserMessage text={pendingPrompt} />
			) : null}
			{shouldShowThinking ? <ThinkingRow /> : null}
		</View>
	);
}
