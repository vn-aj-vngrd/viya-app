import { useSmoothText } from "@convex-dev/agent/react";
import { Ionicons } from "@expo/vector-icons";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { BottomSheet, Menu, type MenuKey } from "heroui-native";
import {
	type ComponentProps,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ScrollView, TextInput, View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeInDown,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatReadableTripDateRange } from "@/src/components/date/date-format-utils";
import {
	DateRangePickerField,
	type DateRangeValue,
	formatIsoDate,
	getStartOfToday,
} from "@/src/components/date/date-picker-field";
import {
	AppText,
	EmptyState,
	GlassSurface,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";

import {
	ALL_CHAT_MODE_OPTIONS,
	questionCardStyle,
	thinkingMessage,
	thinkingMessageLetters,
	thinkingShimmerDurationMs,
	thinkingShimmerTailLength,
} from "./viya-chat-constants";
import { MarkdownContent } from "./viya-chat-markdown";
import { getQuestionPromptOnlyDisplayText } from "./viya-chat-question-utils";
import type {
	ChatHistoryItem,
	ChatModeId,
	ChatModeOption,
	ChatQuestionPrompt,
	ChatTripContextItem,
	PromptSuggestion,
	SlashCommandOption,
	SuggestionIconName,
	ThreadIdsByContext,
	TripBlueprint,
	TripBlueprintAction,
	UiChatMessages,
} from "./viya-chat-types";
import {
	extractTripBlueprint,
	getChatModeOption,
	getPendingPromptInsertionIndex,
	getSingleQuestionDisplayText,
	getThreadContextKey,
	getTripBlueprintActionPrompt,
	getUiMessageText,
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
		end: formatIsoDate(addCalendarDays(startDate, 4)),
		start: formatIsoDate(startDate),
	};
};

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
					fontSize: 15,
					fontWeight: "500",
				},
				letterStyle,
			]}
		>
			{character}
		</Animated.Text>
	);
}

type IconName = ComponentProps<typeof Ionicons>["name"];

const menuContentClassName = "rounded-[20px] bg-surface p-2";
const menuItemClassName = "flex-row items-center gap-3 rounded-[14px] p-3";

function IconBadge({
	background,
	color,
	icon,
	size = 36,
}: {
	background: string;
	color: string;
	icon: IconName;
	size?: number;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: background,
				borderRadius: radius.pill,
				height: size,
				justifyContent: "center",
				width: size,
			}}
		>
			<Ionicons color={color} name={icon} size={Math.round(size * 0.5)} />
		</View>
	);
}

/** Opaque, flat tappable row used by every list in the chat sheets and docks. */
function SurfaceRow({
	accessibilityLabel,
	children,
	disabled,
	haptic,
	minHeight = 56,
	onPress,
}: {
	accessibilityLabel: string;
	children: ReactNode;
	disabled?: boolean;
	haptic?: "light" | "selection";
	minHeight?: number;
	onPress: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			haptic={haptic}
			onPress={onPress}
			scaleTo={0.98}
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderRadius: radius.field,
				flexDirection: "row",
				gap: spacing.md,
				minHeight,
				opacity: disabled ? 0.45 : 1,
				paddingHorizontal: spacing.md,
				paddingVertical: spacing.sm,
			}}
		>
			{children}
		</PressableScale>
	);
}

function SheetEmpty({
	description,
	icon,
	isLoading = false,
	title,
}: {
	description: string;
	icon: IconName;
	isLoading?: boolean;
	title: string;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderRadius: radius.card,
				gap: spacing.sm,
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing["2xl"],
			}}
		>
			{isLoading ? (
				<LoadingDots />
			) : (
				<Ionicons color={palette.inkTertiary} name={icon} size={30} />
			)}
			<AppText accessibilityRole="header" variant="headline">
				{title}
			</AppText>
			<AppText
				style={{ textAlign: "center" }}
				tone="secondary"
				variant="subhead"
			>
				{description}
			</AppText>
		</View>
	);
}

function LoadingDots() {
	const { palette } = useUITheme();
	const progress = useSharedValue(0.3);

	useEffect(() => {
		progress.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
	}, [progress]);

	const style = useAnimatedStyle(() => ({ opacity: progress.value }));

	return (
		<Animated.View
			accessibilityLabel="Loading"
			style={[
				{
					backgroundColor: palette.inkTertiary,
					borderRadius: radius.pill,
					height: 10,
					width: 10,
				},
				style,
			]}
		/>
	);
}

function SheetBody({
	children,
	description,
	title,
}: {
	children: ReactNode;
	description: string;
	title: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="gap-5 px-5 pt-2"
			style={{ paddingBottom: Math.max(insets.bottom, 18) }}
		>
			<View className="gap-1">
				<BottomSheet.Title>{title}</BottomSheet.Title>
				<BottomSheet.Description>{description}</BottomSheet.Description>
			</View>
			{children}
		</View>
	);
}

function TypingBubble() {
	const { palette } = useUITheme();
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
		<Animated.View
			accessibilityLabel="Viya is thinking"
			accessibilityLiveRegion="polite"
			className="w-full flex-row items-center px-1 py-2"
			entering={FadeIn}
		>
			{thinkingMessageLetters.map(({ character, key }, index) => (
				<ThinkingShimmerLetter
					character={character}
					index={index}
					key={key}
					mutedColor={palette.inkSecondary}
					progress={shimmerProgress}
				/>
			))}
		</Animated.View>
	);
}

export function ChatModeSelector({
	currentTripId,
	includeTripMode = false,
	isOpen,
	isLocked = false,
	onOpenChange,
	onSelect,
	selectedMode,
	threadIdsByContext,
}: {
	currentTripId: Id<"trips"> | null;
	includeTripMode?: boolean;
	isOpen: boolean;
	isLocked?: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSelect: (mode: ChatModeId) => void;
	selectedMode: ChatModeId;
	threadIdsByContext: ThreadIdsByContext;
}) {
	const { palette } = useUITheme();
	const selectedOption = getChatModeOption(selectedMode);
	const selectedModeKeys = new Set<MenuKey>([selectedMode]);
	const modeOptions = includeTripMode
		? ALL_CHAT_MODE_OPTIONS
		: ALL_CHAT_MODE_OPTIONS.filter((option) => option.id !== "trip");

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
		<Menu
			isOpen={isLocked ? false : isOpen}
			onOpenChange={(nextIsOpen) => {
				if (!isLocked) {
					onOpenChange(nextIsOpen);
				}
			}}
		>
			<Menu.Trigger asChild={true}>
				<PressableScale
					accessibilityLabel="Choose chat mode"
					accessibilityState={{ disabled: isLocked }}
					disabled={isLocked}
					haptic="selection"
					style={{
						alignItems: "center",
						backgroundColor: palette.fill,
						borderRadius: radius.pill,
						flexDirection: "row",
						gap: spacing.sm,
						height: 44,
						paddingHorizontal: spacing.lg,
					}}
				>
					<Ionicons
						color={selectedOption.accent}
						name={selectedOption.icon}
						size={17}
					/>
					<AppText variant="headline">{selectedOption.label}</AppText>
					{isLocked ? null : (
						<Ionicons
							color={palette.inkSecondary}
							name="chevron-down"
							size={14}
						/>
					)}
				</PressableScale>
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Overlay />
				<Menu.Content
					align="start"
					className={menuContentClassName}
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
						{modeOptions.map((option) => {
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
									className={menuItemClassName}
									id={option.id}
									isAnimatedStyleActive={false}
									isDisabled={isDisabled}
									key={option.id}
									style={{
										backgroundColor: isSelected ? palette.fill : "transparent",
										opacity: isDisabled ? 0.5 : 1,
									}}
								>
									<IconBadge
										background={option.soft}
										color={option.accent}
										icon={option.icon}
									/>
									<View className="flex-1 gap-0.5">
										<Menu.ItemTitle className="font-semibold text-base">
											{option.label}
										</Menu.ItemTitle>
										<Menu.ItemDescription className="text-[13px]">
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
										iconProps={{ color: palette.inkSecondary, size: 20 }}
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
	onHistoryPress,
	onNewChatPress,
}: {
	onHistoryPress: () => void;
	onNewChatPress: () => void;
}) {
	const { palette } = useUITheme();
	const buttonStyle = {
		alignItems: "center",
		height: 44,
		justifyContent: "center",
		width: 44,
	} as const;

	return (
		<GlassSurface
			shape="pill"
			style={{ alignItems: "center", flexDirection: "row", height: 44 }}
		>
			<PressableScale
				accessibilityLabel="Start a new chat"
				onPress={onNewChatPress}
				style={buttonStyle}
			>
				<Ionicons color={palette.ink} name="create-outline" size={22} />
			</PressableScale>
			<Menu>
				<Menu.Trigger asChild={true}>
					<PressableScale
						accessibilityLabel="Open chat options"
						style={buttonStyle}
					>
						<Ionicons
							color={palette.ink}
							name="ellipsis-horizontal"
							size={22}
						/>
					</PressableScale>
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Overlay />
					<Menu.Content
						align="end"
						className={menuContentClassName}
						offset={10}
						placement="bottom"
						presentation="popover"
						width={280}
					>
						<Menu.Item
							accessibilityLabel="Open chat history"
							className={menuItemClassName}
							isAnimatedStyleActive={false}
							onPress={onHistoryPress}
						>
							<IconBadge
								background={palette.fill}
								color={palette.accent}
								icon="time-outline"
							/>
							<View className="flex-1">
								<Menu.ItemTitle className="font-semibold text-base">
									History
								</Menu.ItemTitle>
								<Menu.ItemDescription className="text-[13px]">
									Review previous conversations.
								</Menu.ItemDescription>
							</View>
						</Menu.Item>
					</Menu.Content>
				</Menu.Portal>
			</Menu>
		</GlassSurface>
	);
}

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
	const hasLoaded = history !== undefined;
	const hasHistory = Boolean(history?.length);
	const isTripScopedHistory = chatMode === "trip" && Boolean(currentTripId);
	const historyDescription = isTripScopedHistory
		? "Reopen a previous Viya conversation for this trip."
		: "Reopen a previous Viya conversation.";
	const emptyHistoryDescription = hasLoaded
		? "Your conversations will appear here after you send a message."
		: "Fetching your saved conversations.";
	const tripScopedEmptyHistoryDescription = hasLoaded
		? "Trip conversations will appear here after you send a message in this trip."
		: "Fetching your saved conversations.";

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={true}
				>
					<SheetBody description={historyDescription} title="Chat history">
						{hasHistory ? (
							<ScrollView
								className="max-h-105"
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
											<SurfaceRow
												accessibilityLabel={`Open ${item.title}`}
												disabled={isUnavailableTrip}
												key={item._id}
												onPress={() => onSelect(item)}
											>
												<IconBadge
													background={option.soft}
													color={option.accent}
													icon={option.icon}
												/>
												<View className="min-w-0 flex-1 gap-0.5">
													<AppText numberOfLines={1} variant="headline">
														{item.title}
													</AppText>
													<AppText
														numberOfLines={1}
														tone="secondary"
														variant="footnote"
													>
														{subtitle} -{" "}
														{formatHistoryTimestamp(item.updatedAt)}
													</AppText>
												</View>
												{isCurrentThread ? (
													<Ionicons
														color={palette.accent}
														name="checkmark"
														size={20}
													/>
												) : null}
											</SurfaceRow>
										);
									})}
								</View>
							</ScrollView>
						) : (
							<SheetEmpty
								description={
									isTripScopedHistory
										? tripScopedEmptyHistoryDescription
										: emptyHistoryDescription
								}
								icon="time-outline"
								isLoading={!hasLoaded}
								title={hasLoaded ? "No history yet" : "Loading history"}
							/>
						)}
					</SheetBody>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
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
	const { palette } = useUITheme();
	const hasTrips = trips.length > 0;

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={true}
				>
					<SheetBody
						description="Viya will use this trip's itinerary, vault, readiness, bookings, risks, and budget."
						title="Choose trip context"
					>
						{hasTrips ? (
							<ScrollView
								className="max-h-105"
								showsVerticalScrollIndicator={false}
							>
								<View className="gap-2 pb-1">
									{trips.map((trip) => {
										const isSelected = trip._id === selectedTripId;
										const dateRange = formatReadableTripDateRange({
											endDate: trip.endDate,
											startDate: trip.startDate,
										});

										return (
											<SurfaceRow
												accessibilityLabel={`Use ${trip.title} as trip context`}
												key={trip._id}
												minHeight={64}
												onPress={() => onSelect(trip._id)}
											>
												<IconBadge
													background={palette.fill}
													color={palette.warning}
													icon="briefcase-outline"
												/>
												<View className="min-w-0 flex-1 gap-0.5">
													<AppText numberOfLines={1} variant="headline">
														{trip.title}
													</AppText>
													<AppText
														numberOfLines={1}
														tone="secondary"
														variant="footnote"
													>
														{trip.destination} - {dateRange}
													</AppText>
												</View>
												{isSelected ? (
													<Ionicons
														color={palette.accent}
														name="checkmark"
														size={20}
													/>
												) : null}
											</SurfaceRow>
										);
									})}
								</View>
							</ScrollView>
						) : (
							<SheetEmpty
								description="Create a trip before using Trip mode context."
								icon="briefcase-outline"
								title="No trips yet"
							/>
						)}
					</SheetBody>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function TripContextActionRow({
	currentTrip,
	hasTrips,
	onPress,
}: {
	currentTrip: ChatTripContextItem | null;
	hasTrips: boolean;
	onPress: () => void;
}) {
	const { palette } = useUITheme();
	const dateRange = currentTrip
		? formatReadableTripDateRange({
				endDate: currentTrip.endDate,
				startDate: currentTrip.startDate,
			})
		: null;
	const title = currentTrip?.title ?? "Choose trip context";
	let description = "Create a trip first to give Viya trip context.";

	if (currentTrip) {
		description = `${currentTrip.destination} - ${dateRange}`;
	} else if (hasTrips) {
		description =
			"Use a saved trip for itinerary, vault, budget, and readiness.";
	}

	return (
		<SurfaceRow
			accessibilityLabel={
				currentTrip
					? `Change trip context from ${currentTrip.title}`
					: "Choose trip context"
			}
			minHeight={64}
			onPress={onPress}
		>
			<IconBadge
				background={palette.fill}
				color={palette.warning}
				icon="briefcase-outline"
				size={40}
			/>
			<View className="min-w-0 flex-1 gap-0.5">
				<AppText numberOfLines={1} variant="headline">
					{title}
				</AppText>
				<AppText numberOfLines={2} tone="secondary" variant="footnote">
					{description}
				</AppText>
			</View>
			<Ionicons color={palette.inkTertiary} name="chevron-forward" size={18} />
		</SurfaceRow>
	);
}

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
	const { palette } = useUITheme();

	return (
		<Animated.View className="flex-row px-1 pb-1" entering={FadeIn}>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					flexDirection: "row",
					maxWidth: "100%",
					minHeight: 36,
					paddingLeft: spacing.md,
				}}
			>
				<PressableScale
					accessibilityLabel={`Change trip context from ${currentTrip.title}`}
					haptic="selection"
					hitSlop={{ bottom: 4, top: 4 }}
					onPress={onPress}
					style={{
						alignItems: "center",
						flexDirection: "row",
						flexShrink: 1,
						gap: 6,
						minWidth: 0,
						paddingRight: isClearable ? 4 : spacing.md,
					}}
				>
					<Ionicons color={palette.warning} name="briefcase" size={14} />
					<AppText
						numberOfLines={1}
						style={{ flexShrink: 1 }}
						variant="subhead"
					>
						{currentTrip.title}
					</AppText>
				</PressableScale>
				{isClearable ? (
					<PressableScale
						accessibilityLabel="Clear trip context"
						hitSlop={{ bottom: 4, top: 4 }}
						onPress={onClear}
						style={{
							alignItems: "center",
							height: 36,
							justifyContent: "center",
							width: 36,
						}}
					>
						<Ionicons color={palette.inkSecondary} name="close" size={16} />
					</PressableScale>
				) : null}
			</View>
		</Animated.View>
	);
}

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

	const option = getChatModeOption(pendingQuestion.mode);
	const shouldShowDatePicker = isTravelDateQuestion(pendingQuestion.question);
	const visibleQuestionOptions = shouldShowDatePicker
		? pendingQuestion.options.filter(
				(questionOption) => !exactDateOptionPattern.test(questionOption.label)
			)
		: pendingQuestion.options;
	const selectedDateAnswer = `${selectedDateRange.start} to ${selectedDateRange.end}`;
	const selectedDateLabel = formatReadableTripDateRange({
		endDate: selectedDateRange.end,
		includeYear: true,
		startDate: selectedDateRange.start,
	});
	const trimmedCustomAnswer = customAnswer.trim();

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(20)}
			style={[
				{
					backgroundColor: palette.surface,
					borderRadius: radius.card,
					overflow: "hidden",
					padding: spacing.sm,
				},
				questionCardStyle,
			]}
		>
			<View className="gap-2">
				<View className="gap-0.5 px-2 pt-1">
					<AppText tone="secondary" variant="eyebrow">
						{pendingQuestion.stepLabel ?? `${option.label} question`}
					</AppText>
					<AppText variant="headline">{pendingQuestion.question}</AppText>
				</View>

				{shouldShowDatePicker ? (
					<View className="gap-2 px-1 pt-1">
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
							icon="checkmark"
							label={`Use ${selectedDateLabel}`}
							onPress={() => onSelectOption(selectedDateAnswer)}
						/>
					</View>
				) : null}

				<View className={shouldShowDatePicker ? "gap-2 pt-2" : "gap-2"}>
					{visibleQuestionOptions.map((questionOption, index) => (
						<QuestionOptionRow
							accessibilityLabel={`Choose ${questionOption.label}`}
							disabled={isLoading}
							key={questionOption.id}
							label={questionOption.label}
							leading={
								<AppText bold tone="secondary" variant="footnote">
									{index + 1}
								</AppText>
							}
							onPress={() => onSelectOption(questionOption.value)}
						/>
					))}
					<QuestionOptionRow
						accessibilityLabel="Answer with something else"
						label="Something else"
						leading={
							<Ionicons
								color={palette.inkSecondary}
								name="pencil-outline"
								size={14}
							/>
						}
						onPress={() => setIsCustomAnswerVisible(true)}
					/>
					{isCustomAnswerVisible ? (
						<Animated.View
							entering={FadeIn}
							style={{
								backgroundColor: palette.fill,
								borderRadius: radius.field,
								gap: spacing.sm,
								padding: spacing.sm,
							}}
						>
							<TextInput
								accessibilityLabel="Custom question answer"
								autoFocus={true}
								editable={!isLoading}
								multiline={true}
								onChangeText={setCustomAnswer}
								onSubmitEditing={() => {
									if (trimmedCustomAnswer) {
										onUseCustomAnswer(trimmedCustomAnswer);
									}
								}}
								placeholder="Type your answer"
								placeholderTextColor={palette.inkSecondary}
								returnKeyType="send"
								style={{
									color: palette.ink,
									fontSize: 17,
									lineHeight: 22,
									minHeight: 72,
									paddingHorizontal: 10,
									paddingVertical: 10,
									textAlignVertical: "top",
								}}
								submitBehavior="submit"
								value={customAnswer}
							/>
							<View className="flex-row justify-end gap-2">
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
				</View>
			</View>
		</Animated.View>
	);
}

function QuestionOptionRow({
	accessibilityLabel,
	disabled,
	label,
	leading,
	onPress,
}: {
	accessibilityLabel: string;
	disabled?: boolean;
	label: string;
	leading: ReactNode;
	onPress: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			haptic="selection"
			onPress={onPress}
			scaleTo={0.98}
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.field,
				flexDirection: "row",
				gap: spacing.md,
				minHeight: 48,
				opacity: disabled ? 0.5 : 1,
				paddingHorizontal: spacing.md,
				paddingVertical: spacing.sm,
			}}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.surface,
					borderRadius: radius.pill,
					height: 28,
					justifyContent: "center",
					width: 28,
				}}
			>
				{leading}
			</View>
			<AppText numberOfLines={2} style={{ flex: 1 }} variant="callout">
				{label}
			</AppText>
			<Ionicons color={palette.inkTertiary} name="chevron-forward" size={16} />
		</PressableScale>
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
	const { palette } = useUITheme();

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(20)}
			style={{
				backgroundColor: palette.surface,
				borderRadius: radius.card,
				marginBottom: spacing.sm,
				overflow: "hidden",
				padding: spacing.sm,
			}}
		>
			<View className="px-3 pt-1 pb-2">
				<AppText tone="secondary" variant="eyebrow">
					Commands
				</AppText>
			</View>
			{visibleCommands.length === 0 ? (
				<View className="px-3 py-3">
					<AppText tone="secondary" variant="subhead">
						No commands found
					</AppText>
				</View>
			) : (
				<View className="gap-1">
					{visibleCommands.map((command) => {
						const isDisabled = Boolean(command.requiresTrip && !currentTripId);

						return (
							<PressableScale
								accessibilityLabel={`Use ${command.label} command`}
								disabled={isDisabled}
								haptic="selection"
								key={command.id}
								onPress={() => onSelect(command)}
								scaleTo={0.98}
								style={{
									alignItems: "center",
									borderRadius: radius.group,
									flexDirection: "row",
									gap: spacing.md,
									minHeight: 56,
									opacity: isDisabled ? 0.45 : 1,
									paddingHorizontal: spacing.md,
									paddingVertical: 10,
								}}
							>
								<IconBadge
									background={`${command.accent}1F`}
									color={command.accent}
									icon={command.icon}
								/>
								<View className="min-w-0 flex-1 gap-0.5">
									<View className="flex-row items-center gap-2">
										<AppText variant="headline">{command.label}</AppText>
										{command.mode ? (
											<AppText tone="secondary" variant="footnote">
												{getChatModeOption(command.mode).label}
											</AppText>
										) : null}
									</View>
									<AppText
										numberOfLines={2}
										tone="secondary"
										variant="footnote"
									>
										{isDisabled
											? "Create a trip first to use this command."
											: command.description}
									</AppText>
								</View>
								<Ionicons
									color={palette.inkTertiary}
									name="return-down-forward"
									size={16}
								/>
							</PressableScale>
						);
					})}
				</View>
			)}
		</Animated.View>
	);
}

function TripBlueprintActionDock({
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
	const { palette } = useUITheme();

	return (
		<View className="mt-3 gap-3">
			<PrimaryButton
				accessibilityLabel="Create trip from AI setup"
				icon="checkmark-circle-outline"
				isPending={isCreatingTripFromBlueprint}
				label="Create trip"
				onPress={() => onCreateTripFromBlueprint?.(blueprint)}
			/>

			<View className="flex-row flex-wrap gap-2">
				{blueprintActionItems.map((item) => (
					<PressableScale
						accessibilityLabel={item.label}
						haptic="selection"
						key={item.action}
						onPress={() =>
							onSubmitBlueprintAction?.(
								getTripBlueprintActionPrompt(item.action, blueprint)
							)
						}
						style={{
							alignItems: "center",
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							flexDirection: "row",
							gap: 6,
							height: 36,
							paddingHorizontal: spacing.md,
						}}
					>
						<Ionicons color={palette.accent} name={item.icon} size={15} />
						<AppText variant="subhead">{item.label}</AppText>
					</PressableScale>
				))}
			</View>
		</View>
	);
}

function MessageContent({
	isCreatingTripFromBlueprint,
	isStreaming,
	isUser,
	onCreateTripFromBlueprint,
	onSubmitBlueprintAction,
	shouldCollapseQuestionPrompt = false,
	text,
}: {
	isCreatingTripFromBlueprint?: boolean;
	isStreaming: boolean;
	isUser: boolean;
	onCreateTripFromBlueprint?: (blueprint: TripBlueprint) => void;
	onSubmitBlueprintAction?: (prompt: string) => void;
	shouldCollapseQuestionPrompt?: boolean;
	text: string;
}) {
	const [visibleText] = useSmoothText(text, {
		startStreaming: isStreaming,
	});
	const assistantDisplayText = shouldCollapseQuestionPrompt
		? getQuestionPromptOnlyDisplayText(
				getSingleQuestionDisplayText(visibleText)
			)
		: getSingleQuestionDisplayText(visibleText);
	const displayText = isUser ? visibleText : assistantDisplayText;
	const blueprint = isUser ? null : extractTripBlueprint(displayText);

	if (!isUser) {
		return (
			<View>
				<MarkdownContent text={displayText} />
				{blueprint ? (
					<TripBlueprintActionDock
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
		<AppText selectable={true} tone="onPrimary" variant="body">
			{displayText}
		</AppText>
	);
}

/** iMessage-style outgoing bubble: accent fill, tail corner bottom-right. */
function UserBubble({ children }: { children: ReactNode }) {
	const { palette } = useUITheme();

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(22)}
			style={{
				backgroundColor: palette.accent,
				borderBottomRightRadius: 6,
				borderRadius: 22,
				maxWidth: "88%",
				paddingHorizontal: spacing.lg,
				paddingVertical: 10,
			}}
		>
			{children}
		</Animated.View>
	);
}

function UserMessageBubble({ text }: { text: string }) {
	return (
		<View className="w-full flex-row items-start justify-end">
			<UserBubble>
				<MessageContent isStreaming={false} isUser={true} text={text} />
			</UserBubble>
		</View>
	);
}

export function ViyaChatEmptyContent({
	selectedModeOption,
}: {
	selectedModeOption: ChatModeOption;
}) {
	return (
		<Animated.View entering={FadeIn.duration(260)}>
			<EmptyState
				className="flex-none py-4"
				description={selectedModeOption.emptyDescription}
				title={selectedModeOption.emptyTitle}
				visual={
					<IconBadge
						background={selectedModeOption.soft}
						color={selectedModeOption.accent}
						icon={selectedModeOption.icon}
						size={64}
					/>
				}
			/>
		</Animated.View>
	);
}

export function ViyaPromptSuggestionsCard({
	onSubmitSuggestion,
	promptSuggestions,
}: {
	onSubmitSuggestion: (prompt: string) => void;
	promptSuggestions: readonly PromptSuggestion[];
}) {
	const { palette } = useUITheme();

	return (
		<Animated.View
			className="gap-2"
			entering={FadeInDown.springify().damping(22)}
		>
			<AppText
				style={{ paddingHorizontal: 4 }}
				tone="secondary"
				variant="eyebrow"
			>
				Try asking
			</AppText>
			<View
				style={{
					backgroundColor: palette.surface,
					borderRadius: radius.card,
					gap: 2,
					padding: spacing.xs,
				}}
			>
				{promptSuggestions.map((suggestion) => (
					<PressableScale
						accessibilityLabel={`Try asking: ${suggestion.title}`}
						key={suggestion.title}
						onPress={() => onSubmitSuggestion(suggestion.prompt)}
						scaleTo={0.98}
						style={{
							alignItems: "center",
							borderRadius: radius.group,
							flexDirection: "row",
							gap: spacing.md,
							minHeight: 56,
							paddingHorizontal: spacing.md,
							paddingVertical: spacing.sm,
						}}
					>
						<IconBadge
							background={suggestion.soft}
							color={suggestion.accent}
							icon={suggestion.icon}
						/>
						<View className="min-w-0 flex-1 gap-0.5">
							<AppText variant="headline">{suggestion.title}</AppText>
							<AppText numberOfLines={2} tone="secondary" variant="footnote">
								{suggestion.summary ?? suggestion.prompt}
							</AppText>
						</View>
						<Ionicons
							color={palette.inkTertiary}
							name="arrow-forward"
							size={15}
						/>
					</PressableScale>
				))}
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
		<View className="gap-5">
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

				if (!(isUser || messageText)) {
					return (
						<View className="gap-5" key={message.key}>
							{shouldInsertPendingPrompt && pendingPrompt ? (
								<UserMessageBubble text={pendingPrompt} />
							) : null}
							<TypingBubble />
						</View>
					);
				}

				return (
					<View className="gap-5" key={message.key}>
						{shouldInsertPendingPrompt && pendingPrompt ? (
							<UserMessageBubble text={pendingPrompt} />
						) : null}
						<View
							className={`w-full flex-row items-start ${isUser ? "justify-end" : "justify-start"}`}
						>
							{isUser ? (
								<UserBubble>
									<MessageContent
										isStreaming={message.status === "streaming"}
										isUser={true}
										text={messageText}
									/>
								</UserBubble>
							) : (
								<View className="w-full px-1 py-1">
									<MessageContent
										isCreatingTripFromBlueprint={isCreatingTripFromBlueprint}
										isStreaming={message.status === "streaming"}
										isUser={false}
										onCreateTripFromBlueprint={onCreateTripFromBlueprint}
										onSubmitBlueprintAction={onSubmitBlueprintAction}
										text={messageText}
									/>
								</View>
							)}
						</View>
					</View>
				);
			})}
			{pendingPromptInsertionIndex === messages.length && pendingPrompt ? (
				<UserMessageBubble text={pendingPrompt} />
			) : null}
			{shouldShowThinking ? <TypingBubble /> : null}
		</View>
	);
}
