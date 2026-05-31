import { Ionicons } from "@expo/vector-icons";
import { Button, Spinner, Surface, Text, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	FlatList,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeInDown,
	FadeInLeft,
	FadeInRight,
	FadeOut,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Container } from "@/components/container";
import { ViyaMark } from "@/src/components/viya-mark";
import { AuthSignInSheet } from "@/src/features/auth/auth-sign-in-sheet";
import {
	getCompletedOnboarding,
	setCompletedOnboarding,
} from "@/src/features/auth/onboarding-storage";

type ActId = "dream" | "prepare" | "remember";

interface OnboardingAct {
	eyebrow: string;
	id: ActId;
	subtitle: string;
	title: string;
}

const ONBOARDING_ACTS = [
	{
		eyebrow: "DREAM IT",
		id: "dream",
		subtitle:
			"Tell Viya a mood, a budget, or a rough idea — and watch a plan take shape.",
		title: "Plan a trip\njust by chatting.",
	},
	{
		eyebrow: "GET READY",
		id: "prepare",
		subtitle:
			"Bookings, documents, budget, and packing — checked, so nothing slips.",
		title: "Know you're ready\nbefore you go.",
	},
	{
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
const COMPACT_PREVIEW_HEIGHT = 360;
const CAROUSEL_DWELL_MS = 5000;
const CHAT_BUBBLE_IN_MS = 420;
const CHAT_BUBBLE_STAGGER_MS = 760;
const CHECKLIST_ITEM_COUNT = 4;
const CHECK_REVEAL_MS = 420;
const CHECK_REVEAL_STAGGER_MS = 120;
const CHECK_AFTER_REVEAL_DELAY_MS = 420;
const CHECK_ANIMATION_MS = 420;
const CHECK_STAGGER_MS = 520;
const CHECK_SEQUENCE_START_MS =
	CHECK_REVEAL_STAGGER_MS * (CHECKLIST_ITEM_COUNT - 1) +
	CHECK_REVEAL_MS +
	CHECK_AFTER_REVEAL_DELAY_MS;
const READINESS_ANIMATION_MS =
	CHECK_STAGGER_MS * (CHECKLIST_ITEM_COUNT - 1) + CHECK_ANIMATION_MS;
const READINESS_RING_SIZE = 96;
const READINESS_RING_STROKE = 8;
const READINESS_RING_RADIUS = (READINESS_RING_SIZE - READINESS_RING_STROKE) / 2;
const READINESS_RING_CIRCUMFERENCE = 2 * Math.PI * READINESS_RING_RADIUS;
const READINESS_TARGET_PERCENT = 100;
const RECAP_CARD_IN_MS = 500;
const RECAP_CHIP_STAGGER_MS = 120;

const CHAT_BUBBLES = [
	{
		fromViya: true,
		id: "viya-open",
		text: "Tell me your dream trip — I'll plan it.",
	},
	{
		fromViya: false,
		id: "user-brief",
		text: "a relaxing beach trip around ₱30k",
	},
	{
		fromViya: true,
		id: "viya-focus",
		text: "Palawan's perfect for that. Quiet islands, food spots, or both?",
	},
	{
		fromViya: false,
		id: "user-refine",
		text: "5 lowkey days in Palawan, foodie",
	},
	{
		fromViya: true,
		id: "viya-plan",
		text: "Love it — I'll plan food-first days with slow, easy mornings.",
	},
] as const;

const BUBBLE_OUT_MS = 220;

interface ChatBubbleProps {
	children: ReactNode;
	delay: number;
	fromViya: boolean;
}

function ChatBubble({ children, delay, fromViya }: ChatBubbleProps) {
	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");
	const entering = fromViya
		? FadeInLeft.duration(CHAT_BUBBLE_IN_MS).delay(delay)
		: FadeInRight.duration(CHAT_BUBBLE_IN_MS).delay(delay);

	if (fromViya) {
		return (
			<Animated.View
				className="self-start"
				entering={entering}
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
			entering={entering}
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

function DreamPreview() {
	const accent = useThemeColor("accent");
	const accentForeground = useThemeColor("accent-foreground");

	return (
		<View className="flex-1 justify-between gap-4">
			<View className="gap-2.5">
				{CHAT_BUBBLES.map((bubble, index) => (
					<ChatBubble
						delay={120 + index * CHAT_BUBBLE_STAGGER_MS}
						fromViya={bubble.fromViya}
						key={bubble.id}
					>
						{bubble.text}
					</ChatBubble>
				))}
			</View>

			<Surface className="flex-row items-center gap-2 rounded-full border border-border px-4 py-3">
				<View className="min-h-[18px] flex-1 flex-row items-center">
					<Text color="muted" type="body-sm">
						Ask Viya anything…
					</Text>
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
	checkDelay,
	label,
	revealDelay,
}: {
	checkDelay: number;
	label: string;
	revealDelay: number;
}) {
	const accent = useThemeColor("accent");
	const muted = useThemeColor("muted");
	const checkedProgress = useSharedValue(0);

	useEffect(() => {
		checkedProgress.value = withDelay(
			checkDelay,
			withTiming(1, {
				duration: CHECK_ANIMATION_MS,
				easing: Easing.out(Easing.cubic),
			})
		);
	}, [checkDelay, checkedProgress]);

	const uncheckedStyle = useAnimatedStyle(() => ({
		opacity: 1 - checkedProgress.value,
	}));
	const checkedStyle = useAnimatedStyle(() => ({
		opacity: checkedProgress.value,
		transform: [{ scale: 0.82 + checkedProgress.value * 0.18 }],
	}));
	const labelStyle = useAnimatedStyle(() => ({
		opacity: 0.55 + checkedProgress.value * 0.45,
	}));

	return (
		<Animated.View
			className="flex-row items-center gap-2.5"
			entering={FadeInLeft.delay(revealDelay).duration(CHECK_REVEAL_MS)}
		>
			<View className="h-5 w-5 items-center justify-center">
				<Animated.View className="absolute" style={uncheckedStyle}>
					<Ionicons color={muted} name="ellipse-outline" size={20} />
				</Animated.View>
				<Animated.View className="absolute" style={checkedStyle}>
					<Ionicons color={accent} name="checkmark-circle" size={20} />
				</Animated.View>
			</View>
			<Animated.View style={labelStyle}>
				<Text type="body-sm" weight="medium">
					{label}
				</Text>
			</Animated.View>
		</Animated.View>
	);
}

function ReadinessRing({ value }: { value: number }) {
	const accent = useThemeColor("accent");
	const border = useThemeColor("border");
	const [displayValue, setDisplayValue] = useState(0);
	const [ringProgress, setRingProgress] = useState(0);

	useEffect(() => {
		let frameId: number | null = null;
		const startedAt = Date.now();

		const update = () => {
			const elapsed = Math.max(
				0,
				Date.now() - startedAt - CHECK_SEQUENCE_START_MS
			);
			const nextProgress = Math.min(1, elapsed / READINESS_ANIMATION_MS);
			setRingProgress(nextProgress);
			setDisplayValue(Math.round(value * nextProgress));

			if (nextProgress < 1) {
				frameId = requestAnimationFrame(update);
			}
		};

		frameId = requestAnimationFrame(update);

		return () => {
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
			}
		};
	}, [value]);

	const strokeDashoffset = READINESS_RING_CIRCUMFERENCE * (1 - ringProgress);

	return (
		<View className="h-24 w-24 items-center justify-center rounded-full">
			<Svg
				height={READINESS_RING_SIZE}
				style={{ position: "absolute" }}
				width={READINESS_RING_SIZE}
			>
				<Circle
					cx={READINESS_RING_SIZE / 2}
					cy={READINESS_RING_SIZE / 2}
					fill="none"
					r={READINESS_RING_RADIUS}
					stroke={border}
					strokeWidth={READINESS_RING_STROKE}
				/>
				<Circle
					cx={READINESS_RING_SIZE / 2}
					cy={READINESS_RING_SIZE / 2}
					fill="none"
					r={READINESS_RING_RADIUS}
					stroke={accent}
					strokeDasharray={READINESS_RING_CIRCUMFERENCE}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					strokeWidth={READINESS_RING_STROKE}
					transform={`rotate(-90 ${READINESS_RING_SIZE / 2} ${READINESS_RING_SIZE / 2})`}
				/>
			</Svg>
			<Text.Heading type="h3" weight="semibold">
				{displayValue}%
			</Text.Heading>
		</View>
	);
}

function PreparePreview() {
	return (
		<View className="flex-1 justify-center gap-4">
			<Animated.View entering={FadeIn.duration(420)}>
				<Surface className="flex-row items-center justify-between rounded-[30px] border border-border p-5">
					<View className="gap-1">
						<Text color="muted" type="body-xs" weight="semibold">
							TRIP READINESS
						</Text>
						<Text.Heading type="h4" weight="semibold">
							Ready to go
						</Text.Heading>
						<Text color="muted" type="body-xs">
							All essentials checked
						</Text>
					</View>
					<ReadinessRing value={READINESS_TARGET_PERCENT} />
				</Surface>
			</Animated.View>
			<Surface className="gap-3 rounded-[30px] border border-border p-5">
				<CheckRow
					checkDelay={CHECK_SEQUENCE_START_MS}
					label="Flight confirmed"
					revealDelay={0}
				/>
				<CheckRow
					checkDelay={CHECK_SEQUENCE_START_MS + CHECK_STAGGER_MS}
					label="Hotel booked & saved"
					revealDelay={CHECK_REVEAL_STAGGER_MS}
				/>
				<CheckRow
					checkDelay={CHECK_SEQUENCE_START_MS + CHECK_STAGGER_MS * 2}
					label="Add airport transfer"
					revealDelay={CHECK_REVEAL_STAGGER_MS * 2}
				/>
				<CheckRow
					checkDelay={CHECK_SEQUENCE_START_MS + CHECK_STAGGER_MS * 3}
					label="Pack for light rain"
					revealDelay={CHECK_REVEAL_STAGGER_MS * 3}
				/>
			</Surface>
		</View>
	);
}

function StatChip({ delay, label }: { delay: number; label: string }) {
	return (
		<Animated.View
			className="min-w-[96px] flex-1"
			entering={FadeInDown.delay(delay).duration(420)}
		>
			<Surface className="min-h-[48px] justify-center rounded-2xl border border-border px-2 py-3">
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
				entering={FadeIn.duration(RECAP_CARD_IN_MS).delay(120)}
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
				<StatChip delay={520} label="Share recap" />
				<StatChip delay={520 + RECAP_CHIP_STAGGER_MS} label="Reuse as guide" />
				<StatChip
					delay={520 + RECAP_CHIP_STAGGER_MS * 2}
					label="Trip insights"
				/>
			</View>
		</View>
	);
}

function ActPreview({ id }: { id: ActId }) {
	if (id === "dream") {
		return <DreamPreview />;
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
	width: number;
}

function ActPage({ act, isActive, isCompact, width }: ActPageProps) {
	const accent = useThemeColor("accent");
	const previewHeight = isCompact ? COMPACT_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

	return (
		<View className="flex-1 justify-center px-6" style={{ width }}>
			<View className="justify-center" style={{ height: previewHeight }}>
				{isActive ? <ActPreview id={act.id} /> : null}
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
	return (
		<View className="flex-row gap-2">
			{ONBOARDING_ACTS.map((act, index) => {
				let status: ProgressSegmentStatus = "pending";
				if (index < activeIndex) {
					status = "complete";
				} else if (index === activeIndex) {
					status = "active";
				}

				return <ProgressSegment key={act.id} status={status} />;
			})}
		</View>
	);
}

type ProgressSegmentStatus = "active" | "complete" | "pending";

function ProgressSegment({ status }: { status: ProgressSegmentStatus }) {
	const border = useThemeColor("border");
	const accent = useThemeColor("accent");
	const progress = useSharedValue(status === "complete" ? 1 : 0);

	useEffect(() => {
		if (status === "active") {
			progress.value = 0;
			progress.value = withTiming(1, { duration: CAROUSEL_DWELL_MS });
			return;
		}

		progress.value = status === "complete" ? 1 : 0;
	}, [progress, status]);

	const fillStyle = useAnimatedStyle(() => ({
		width: `${progress.value * 100}%`,
	}));

	return (
		<View
			className="h-1.5 flex-1 overflow-hidden rounded-full"
			style={{ backgroundColor: border }}
		>
			<Animated.View
				className="h-full rounded-full"
				style={[
					{
						backgroundColor: accent,
					},
					fillStyle,
				]}
			/>
		</View>
	);
}

export default function AuthOnboardingScreen() {
	const insets = useSafeAreaInsets();
	const { height, width } = useWindowDimensions();
	const accentForeground = useThemeColor("accent-foreground");
	const carouselRef = useRef<FlatList<OnboardingAct>>(null);
	const hasInteractedRef = useRef(false);
	const [activeIndex, setActiveIndex] = useState(FIRST_INDEX);
	const [isCheckingCompletion, setIsCheckingCompletion] = useState(true);
	const [isSignInSheetOpen, setIsSignInSheetOpen] = useState(false);
	const isCompactHeight = height < COMPACT_HEIGHT_THRESHOLD;

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

	const goToIndex = useCallback((nextIndex: number) => {
		carouselRef.current?.scrollToIndex({
			animated: true,
			index: nextIndex,
		});
		setActiveIndex(nextIndex);
	}, []);

	useEffect(() => {
		if (isCheckingCompletion || isSignInSheetOpen || width <= 0) {
			return;
		}

		if (hasInteractedRef.current) {
			return;
		}

		if (activeIndex === FINAL_INDEX) {
			return;
		}

		const timer = setTimeout(() => {
			if (hasInteractedRef.current) {
				return;
			}

			const nextIndex = activeIndex + 1;
			goToIndex(nextIndex);
		}, CAROUSEL_DWELL_MS);

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
			if (nextIndex !== activeIndex) {
				setActiveIndex(nextIndex);
			}
		},
		[activeIndex, width]
	);

	const handleScrollBeginDrag = useCallback(() => {
		hasInteractedRef.current = true;
	}, []);

	const renderPage = useCallback(
		({ item, index }: { item: OnboardingAct; index: number }) => (
			<ActPage
				act={item}
				isActive={index === activeIndex}
				isCompact={isCompactHeight}
				width={width}
			/>
		),
		[activeIndex, isCompactHeight, width]
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

				<FlatList
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
					onScrollToIndexFailed={(info) => {
						carouselRef.current?.scrollToOffset({
							animated: true,
							offset: info.index * width,
						});
					}}
					pagingEnabled={true}
					ref={carouselRef}
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
