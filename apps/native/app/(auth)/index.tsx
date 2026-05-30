import { Ionicons } from "@expo/vector-icons";
import { Button, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	Easing,
	FadeInLeft,
	FadeInRight,
	FadeInUp,
	FadeOut,
	scrollTo,
	useAnimatedRef,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { ViyaMark } from "@/src/components/viya-mark";
import { AuthSignInSheet } from "@/src/features/auth/auth-sign-in-sheet";
import {
	getCompletedOnboarding,
	setCompletedOnboarding,
} from "@/src/features/auth/onboarding-storage";

type ActId = "dream" | "prepare" | "remember";

interface OnboardingAct {
	dwellMs: number;
	eyebrow: string;
	id: ActId;
	subtitle: string;
	title: string;
}

const ONBOARDING_ACTS = [
	{
		dwellMs: 6800,
		eyebrow: "DREAM IT",
		id: "dream",
		subtitle:
			"Tell Viya a mood, a budget, or a rough idea — and watch a plan take shape.",
		title: "Plan a trip\njust by chatting.",
	},
	{
		dwellMs: 4200,
		eyebrow: "GET READY",
		id: "prepare",
		subtitle:
			"Bookings, documents, budget, and packing — checked, so nothing slips.",
		title: "Know you're ready\nbefore you go.",
	},
	{
		dwellMs: 4600,
		eyebrow: "REMEMBER IT",
		id: "remember",
		subtitle:
			"Every place, expense, and favorite becomes a recap you'll actually keep.",
		title: "Come home with\nthe whole story.",
	},
] as const satisfies readonly OnboardingAct[];

const FIRST_INDEX = 0;
const FINAL_INDEX = ONBOARDING_ACTS.length - 1;
const COMPACT_HEIGHT_THRESHOLD = 740;
const PREVIEW_HEIGHT = 440;
const COMPACT_PREVIEW_HEIGHT = 320;
const ADVANCE_TRANSITION_MS = 620;
const PROGRESS_DOT_SIZE = 6;
const ACTIVE_DOT_WIDTH = 22;

const CONVERSATION_TURNS = [
	{
		prompt: "a relaxing beach trip around ₱30k",
		reply: "Palawan's perfect for that. Quiet islands, food spots, or both?",
	},
	{
		prompt: "5 lowkey days in Palawan, foodie",
		reply: "Love it — I'll plan food-first days with slow, easy mornings.",
	},
] as const;

type ConversationPhase = "typing" | "thinking" | "answered";

const TYPE_CHAR_MS = 46;
const SEND_PAUSE_MS = 480;
const THINKING_MS = 1100;
const ANSWERED_HOLD_MS = 2600;
const FINAL_STATIC_HOLD_MS = 1500;
const BUBBLE_IN_MS = 360;
const BUBBLE_OUT_MS = 220;
const DOT_PULSE_MS = 460;
const CARET_BLINK_MS = 540;
const TYPING_DOT_DELAYS = [0, 140, 280] as const;

function useTypedText(text: string, isActive: boolean) {
	const [typed, setTyped] = useState("");

	useEffect(() => {
		if (!isActive) {
			return;
		}

		setTyped("");
		let charCount = 0;
		const intervalId = setInterval(() => {
			charCount += 1;
			setTyped(text.slice(0, charCount));

			if (charCount >= text.length) {
				clearInterval(intervalId);
			}
		}, TYPE_CHAR_MS);

		return () => clearInterval(intervalId);
	}, [text, isActive]);

	return typed;
}

function Caret({ color }: { color: string }) {
	const opacity = useSharedValue(1);

	useEffect(() => {
		opacity.value = withRepeat(
			withTiming(0, { duration: CARET_BLINK_MS }),
			-1,
			true
		);
	}, [opacity]);

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

	return (
		<Animated.View
			style={[
				{ backgroundColor: color, borderRadius: 1, height: 18, width: 2 },
				style,
			]}
		/>
	);
}

interface ChatBubbleProps {
	children: ReactNode;
	fromViya: boolean;
}

function ChatBubble({ children, fromViya }: ChatBubbleProps) {
	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");

	if (fromViya) {
		return (
			<Animated.View
				className="self-start"
				entering={FadeInLeft.duration(BUBBLE_IN_MS)}
				exiting={FadeOut.duration(BUBBLE_OUT_MS)}
			>
				<Surface className="max-w-[82%] rounded-3xl rounded-bl-md border border-border px-4 py-2.5">
					<Text type="body-sm" weight="medium">
						{children}
					</Text>
				</Surface>
			</Animated.View>
		);
	}

	return (
		<Animated.View
			className="self-end"
			entering={FadeInRight.duration(BUBBLE_IN_MS)}
			exiting={FadeOut.duration(BUBBLE_OUT_MS)}
		>
			<View
				className="max-w-[84%] rounded-3xl rounded-br-md px-4 py-2.5"
				style={{ backgroundColor: accent }}
			>
				<Text
					style={{ color: accentForeground }}
					type="body-sm"
					weight="medium"
				>
					{children}
				</Text>
			</View>
		</Animated.View>
	);
}

function TypingDot({ delay }: { delay: number }) {
	const muted = useThemeColor("muted");
	const opacity = useSharedValue(0.25);

	useEffect(() => {
		opacity.value = withDelay(
			delay,
			withRepeat(withTiming(1, { duration: DOT_PULSE_MS }), -1, true)
		);
	}, [delay, opacity]);

	const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

	return (
		<Animated.View
			style={[
				{ backgroundColor: muted, borderRadius: 3, height: 6, width: 6 },
				style,
			]}
		/>
	);
}

function TypingIndicator() {
	return (
		<Animated.View
			className="self-start"
			entering={FadeInLeft.duration(BUBBLE_IN_MS)}
			exiting={FadeOut.duration(BUBBLE_OUT_MS)}
		>
			<Surface className="flex-row items-center gap-1.5 rounded-3xl rounded-bl-md border border-border px-4 py-3.5">
				{TYPING_DOT_DELAYS.map((delay) => (
					<TypingDot delay={delay} key={delay} />
				))}
			</Surface>
		</Animated.View>
	);
}

function DreamPreview({
	onSequenceComplete,
}: {
	onSequenceComplete: () => void;
}) {
	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");
	const [turnIndex, setTurnIndex] = useState(0);
	const [phase, setPhase] = useState<ConversationPhase>("typing");
	const hasCompletedRef = useRef(false);

	const turn = CONVERSATION_TURNS[turnIndex];
	const isTyping = phase === "typing";
	const typed = useTypedText(turn.prompt, isTyping);
	const promptLength = turn.prompt.length;

	useEffect(() => {
		if (phase === "typing") {
			const toThinking = setTimeout(
				() => setPhase("thinking"),
				promptLength * TYPE_CHAR_MS + SEND_PAUSE_MS
			);

			return () => clearTimeout(toThinking);
		}

		if (phase === "thinking") {
			const toAnswered = setTimeout(() => setPhase("answered"), THINKING_MS);

			return () => clearTimeout(toAnswered);
		}

		const toNextTurn = setTimeout(
			() => {
				const isLastTurn = turnIndex === CONVERSATION_TURNS.length - 1;
				if (isLastTurn) {
					if (!hasCompletedRef.current) {
						hasCompletedRef.current = true;
						onSequenceComplete();
					}
					return;
				}

				setTurnIndex((index) => index + 1);
				setPhase("typing");
			},
			turnIndex === CONVERSATION_TURNS.length - 1
				? FINAL_STATIC_HOLD_MS
				: ANSWERED_HOLD_MS
		);

		return () => clearTimeout(toNextTurn);
	}, [onSequenceComplete, phase, promptLength, turnIndex]);

	return (
		<View className="flex-1 justify-between gap-4">
			<View className="gap-2.5">
				<Animated.View
					className="self-start"
					entering={FadeInLeft.duration(BUBBLE_IN_MS).delay(120)}
				>
					<Surface className="max-w-[82%] rounded-3xl rounded-bl-md border border-border px-4 py-2.5">
						<Text type="body-sm" weight="medium">
							Tell me your dream trip — I'll plan it.
						</Text>
					</Surface>
				</Animated.View>
				{turnIndex > 0 || !isTyping ? (
					<ChatBubble fromViya={false}>
						{CONVERSATION_TURNS[0].prompt}
					</ChatBubble>
				) : null}
				{turnIndex > 0 || (turnIndex === 0 && phase === "answered") ? (
					<ChatBubble fromViya={true}>{CONVERSATION_TURNS[0].reply}</ChatBubble>
				) : null}
				{turnIndex === 0 && phase === "thinking" ? <TypingIndicator /> : null}
				{turnIndex === 1 && !isTyping ? (
					<ChatBubble fromViya={false}>
						{CONVERSATION_TURNS[1].prompt}
					</ChatBubble>
				) : null}
				{turnIndex === 1 && phase === "thinking" ? <TypingIndicator /> : null}
				{turnIndex === 1 && phase === "answered" ? (
					<ChatBubble fromViya={true}>{CONVERSATION_TURNS[1].reply}</ChatBubble>
				) : null}
			</View>

			<Surface className="flex-row items-center gap-2 rounded-full border border-border px-4 py-3">
				<View className="min-h-[18px] flex-1 flex-row items-center">
					{isTyping && typed.length > 0 ? (
						<Text type="body-sm" weight="medium">
							{typed}
						</Text>
					) : (
						<Text color="muted" type="body-sm">
							Ask Viya anything…
						</Text>
					)}
					{isTyping ? (
						<View className="ml-0.5">
							<Caret color={accent} />
						</View>
					) : null}
				</View>
				<View
					className="h-9 w-9 items-center justify-center rounded-full"
					style={{ backgroundColor: accent }}
				>
					<Ionicons color={accentForeground} name="arrow-up" size={18} />
				</View>
			</Surface>
		</View>
	);
}

function CheckRow({
	delay,
	done,
	label,
}: {
	delay: number;
	done: boolean;
	label: string;
}) {
	const accent = useThemeColor("accent");
	const muted = useThemeColor("muted");

	return (
		<Animated.View
			className="flex-row items-center gap-2.5"
			entering={FadeInUp.delay(delay).duration(420)}
		>
			<Ionicons
				color={done ? accent : muted}
				name={done ? "checkmark-circle" : "ellipse-outline"}
				size={20}
			/>
			<Text color={done ? "default" : "muted"} type="body-sm" weight="medium">
				{label}
			</Text>
		</Animated.View>
	);
}

function ReadinessRing({ value }: { value: number }) {
	const accent = useThemeColor("accent");
	const border = useThemeColor("border");

	return (
		<View
			className="h-24 w-24 items-center justify-center rounded-full"
			style={{ borderColor: border, borderWidth: 8 }}
		>
			<View
				className="absolute h-24 w-24 rounded-full"
				style={{
					borderBottomColor: "transparent",
					borderColor: accent,
					borderLeftColor: "transparent",
					borderWidth: 8,
					transform: [{ rotate: "-45deg" }],
				}}
			/>
			<Text.Heading type="h3" weight="semibold">
				{value}%
			</Text.Heading>
		</View>
	);
}

function PreparePreview() {
	return (
		<View className="flex-1 justify-center gap-4">
			<Surface className="flex-row items-center justify-between rounded-[30px] border border-border p-5">
				<View className="gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						TRIP READINESS
					</Text>
					<Text.Heading type="h4" weight="semibold">
						Almost ready
					</Text.Heading>
					<Text color="muted" type="body-xs">
						2 things left to confirm
					</Text>
				</View>
				<ReadinessRing value={82} />
			</Surface>
			<Surface className="gap-3 rounded-[30px] border border-border p-5">
				<CheckRow delay={300} done={true} label="Flight confirmed" />
				<CheckRow delay={400} done={true} label="Hotel booked & saved" />
				<CheckRow delay={500} done={false} label="Add airport transfer" />
				<CheckRow delay={600} done={false} label="Pack for light rain" />
			</Surface>
		</View>
	);
}

function StatChip({ delay, label }: { delay: number; label: string }) {
	return (
		<Animated.View
			className="flex-1"
			entering={FadeInUp.delay(delay).duration(420)}
		>
			<Surface className="rounded-2xl border border-border px-2 py-3">
				<Text align="center" type="body-xs" weight="semibold">
					{label}
				</Text>
			</Surface>
		</Animated.View>
	);
}

function RememberPreview() {
	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");

	return (
		<View className="flex-1 justify-center gap-3">
			<Animated.View
				className="flex-1 justify-between rounded-[34px] p-6"
				entering={FadeInUp.delay(120).duration(440)}
				style={{ backgroundColor: accent, maxHeight: 280 }}
			>
				<View className="flex-row items-center justify-between">
					<Text
						style={{ color: accentForeground, opacity: 0.85 }}
						type="body-xs"
						weight="semibold"
					>
						YOUR TRIP STORY
					</Text>
					<Ionicons
						color={accentForeground}
						name="sparkles"
						size={18}
						style={{ opacity: 0.85 }}
					/>
				</View>
				<View className="gap-1">
					<Text.Heading
						style={{ color: accentForeground }}
						type="h1"
						weight="semibold"
					>
						Palawan, 5 days
					</Text.Heading>
					<Text
						style={{ color: accentForeground, opacity: 0.9 }}
						type="body-sm"
					>
						7 places · ₱28.4k spent · a new favorite food town
					</Text>
				</View>
			</Animated.View>
			<View className="flex-row gap-2">
				<StatChip delay={420} label="Share recap" />
				<StatChip delay={500} label="Reuse as guide" />
				<StatChip delay={580} label="Trip insights" />
			</View>
		</View>
	);
}

function ActPreview({
	id,
	onDreamPreviewComplete,
}: {
	id: ActId;
	onDreamPreviewComplete: () => void;
}) {
	if (id === "dream") {
		return <DreamPreview onSequenceComplete={onDreamPreviewComplete} />;
	}

	if (id === "prepare") {
		return <PreparePreview />;
	}

	return <RememberPreview />;
}

interface ActPageProps {
	act: OnboardingAct;
	isActive: boolean;
	isCompact: boolean;
	onDreamPreviewComplete: () => void;
	width: number;
}

function ActPage({
	act,
	isActive,
	isCompact,
	onDreamPreviewComplete,
	width,
}: ActPageProps) {
	const accent = useThemeColor("accent");
	const previewHeight = isCompact ? COMPACT_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

	return (
		<View className="flex-1 justify-center px-6" style={{ width }}>
			<View className="justify-center" style={{ height: previewHeight }}>
				{isActive ? (
					<ActPreview
						id={act.id}
						onDreamPreviewComplete={onDreamPreviewComplete}
					/>
				) : null}
			</View>
			<View className="gap-2 pt-4">
				<Text
					style={{ color: accent, letterSpacing: 1.4 }}
					type="body-xs"
					weight="semibold"
				>
					{act.eyebrow}
				</Text>
				<Text.Heading
					className={isCompact ? "leading-8" : "leading-10"}
					type={isCompact ? "h2" : "h1"}
					weight="semibold"
				>
					{act.title}
				</Text.Heading>
				<Text.Paragraph
					className="max-w-[340px] leading-5"
					color="muted"
					type="body-sm"
				>
					{act.subtitle}
				</Text.Paragraph>
			</View>
		</View>
	);
}

function PageDots({ activeIndex }: { activeIndex: number }) {
	const accent = useThemeColor("accent");
	const border = useThemeColor("border");

	return (
		<View className="flex-row justify-center gap-1.5">
			{ONBOARDING_ACTS.map((act, index) => {
				const isActive = index === activeIndex;

				return (
					<View
						className="h-1.5 rounded-full"
						key={act.id}
						style={{
							backgroundColor: isActive ? accent : border,
							width: isActive ? ACTIVE_DOT_WIDTH : PROGRESS_DOT_SIZE,
						}}
					/>
				);
			})}
		</View>
	);
}

export default function AuthOnboardingScreen() {
	const insets = useSafeAreaInsets();
	const { height, width } = useWindowDimensions();
	const accentForeground = useThemeColor("accent-foreground");
	const animatedRef = useAnimatedRef<Animated.FlatList<OnboardingAct>>();
	const activeIndexRef = useRef(FIRST_INDEX);
	const hasAutoAdvancedFromDreamRef = useRef(false);
	const hasInteractedRef = useRef(false);
	const [activeIndex, setActiveIndex] = useState(FIRST_INDEX);
	const [isCheckingCompletion, setIsCheckingCompletion] = useState(true);
	const [isSignInSheetOpen, setIsSignInSheetOpen] = useState(false);
	const isCompactHeight = height < COMPACT_HEIGHT_THRESHOLD;
	const scrollOffset = useSharedValue(0);

	useDerivedValue(() => {
		scrollTo(animatedRef, scrollOffset.value, 0, false);
	});

	useEffect(() => {
		let isMounted = true;

		getCompletedOnboarding().finally(() => {
			if (isMounted) {
				setIsCheckingCompletion(false);
			}
		});

		return () => {
			isMounted = false;
		};
	}, []);

	const goToIndex = useCallback(
		(nextIndex: number) => {
			activeIndexRef.current = nextIndex;
			scrollOffset.value = withTiming(nextIndex * width, {
				duration: ADVANCE_TRANSITION_MS,
				easing: Easing.inOut(Easing.cubic),
			});
			setActiveIndex(nextIndex);
		},
		[scrollOffset, width]
	);

	useEffect(() => {
		if (isCheckingCompletion || isSignInSheetOpen || width <= 0) {
			return;
		}

		if (activeIndex === FIRST_INDEX && !hasAutoAdvancedFromDreamRef.current) {
			return;
		}

		if (hasInteractedRef.current) {
			return;
		}

		if (activeIndex === FINAL_INDEX) {
			return;
		}

		const dwell = ONBOARDING_ACTS[activeIndex].dwellMs;
		const timer = setTimeout(() => {
			if (hasInteractedRef.current) {
				return;
			}

			const nextIndex = activeIndex + 1;
			goToIndex(nextIndex);
		}, dwell);

		return () => clearTimeout(timer);
	}, [activeIndex, goToIndex, isCheckingCompletion, isSignInSheetOpen, width]);

	const handleSignInPress = useCallback(() => {
		setIsSignInSheetOpen(true);
		setCompletedOnboarding().catch(() => undefined);
	}, []);

	const handleScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.min(
				FINAL_INDEX,
				Math.max(
					FIRST_INDEX,
					Math.round(event.nativeEvent.contentOffset.x / width)
				)
			);

			scrollOffset.value = nextIndex * width;

			if (nextIndex !== activeIndex) {
				activeIndexRef.current = nextIndex;
				setActiveIndex(nextIndex);
			}
		},
		[activeIndex, scrollOffset, width]
	);

	const handleScrollBeginDrag = useCallback(() => {
		hasInteractedRef.current = true;
	}, []);

	const handleDreamPreviewComplete = useCallback(() => {
		if (activeIndexRef.current !== FIRST_INDEX || isSignInSheetOpen) {
			return;
		}

		if (hasAutoAdvancedFromDreamRef.current) {
			return;
		}

		hasAutoAdvancedFromDreamRef.current = true;
		goToIndex(FIRST_INDEX + 1);
	}, [goToIndex, isSignInSheetOpen]);

	useEffect(() => {
		if (activeIndex === FIRST_INDEX) {
			hasAutoAdvancedFromDreamRef.current = false;
		}
	}, [activeIndex]);

	const renderPage = useCallback(
		({ item, index }: { item: OnboardingAct; index: number }) => (
			<ActPage
				act={item}
				isActive={index === activeIndex}
				isCompact={isCompactHeight}
				onDreamPreviewComplete={handleDreamPreviewComplete}
				width={width}
			/>
		),
		[activeIndex, handleDreamPreviewComplete, isCompactHeight, width]
	);

	if (isCheckingCompletion) {
		return (
			<Container isScrollable={false}>
				<View className="flex-1 items-center justify-center">
					<Spinner />
				</View>
			</Container>
		);
	}

	return (
		<Container isScrollable={false}>
			<View className="flex-1" style={{ paddingTop: insets.top + 4 }}>
				<View className="items-center px-6 pb-2">
					<ViyaMark size={46} />
				</View>

				<Animated.FlatList
					bounces={false}
					data={ONBOARDING_ACTS}
					getItemLayout={(_, index) => ({
						index,
						length: width,
						offset: width * index,
					})}
					horizontal={true}
					keyExtractor={(item) => item.id}
					onMomentumScrollEnd={handleScrollEnd}
					onScrollBeginDrag={handleScrollBeginDrag}
					pagingEnabled={true}
					ref={animatedRef}
					renderItem={renderPage}
					scrollEventThrottle={16}
					showsHorizontalScrollIndicator={false}
				/>

				<View className="gap-5 px-6" style={{ paddingBottom: 8 }}>
					<PageDots activeIndex={activeIndex} />
					<Button
						className="h-[54px] gap-2 rounded-full"
						onPress={handleSignInPress}
					>
						<Button.Label className="text-[17px]">Get started</Button.Label>
						<Ionicons color={accentForeground} name="arrow-forward" size={18} />
					</Button>
				</View>
			</View>
			<AuthSignInSheet
				isOpen={isSignInSheetOpen}
				onOpenChange={setIsSignInSheetOpen}
			/>
		</Container>
	);
}
