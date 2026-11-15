import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
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

import {
	AppText,
	Card,
	PrimaryButton,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
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
const CAROUSEL_DWELL_MS = 10_000;
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
const ON_ACCENT = "#FFFFFF";

interface ChatBubbleProps {
	children: ReactNode;
	delay: number;
	fromViya: boolean;
}

function ChatBubble({ children, delay, fromViya }: ChatBubbleProps) {
	const { palette } = useUITheme();
	const entering = fromViya
		? FadeInLeft.duration(CHAT_BUBBLE_IN_MS).delay(delay)
		: FadeInRight.duration(CHAT_BUBBLE_IN_MS).delay(delay);

	return (
		<Animated.View
			entering={entering}
			exiting={FadeOut.duration(BUBBLE_OUT_MS)}
			style={{
				alignSelf: fromViya ? "flex-start" : "flex-end",
				backgroundColor: fromViya ? palette.surface : palette.accent,
				borderBottomLeftRadius: fromViya ? 6 : radius.card,
				borderBottomRightRadius: fromViya ? radius.card : 6,
				borderRadius: radius.card,
				maxWidth: "84%",
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing.md,
			}}
		>
			<AppText
				style={fromViya ? undefined : { color: ON_ACCENT }}
				variant="subhead"
			>
				{children}
			</AppText>
		</Animated.View>
	);
}

function DreamPreview() {
	const { palette } = useUITheme();

	return (
		<View style={{ flex: 1, gap: spacing.lg, justifyContent: "space-between" }}>
			<View style={{ gap: spacing.sm }}>
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

			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.surface,
					borderRadius: radius.pill,
					flexDirection: "row",
					gap: spacing.sm,
					paddingHorizontal: spacing.lg,
					paddingVertical: spacing.md,
				}}
			>
				<AppText style={{ flex: 1 }} tone="tertiary" variant="subhead">
					Ask Viya anything…
				</AppText>
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.accent,
						borderRadius: radius.pill,
						height: 32,
						justifyContent: "center",
						width: 32,
					}}
				>
					<Ionicons color={ON_ACCENT} name="arrow-up" size={18} />
				</View>
			</View>
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
	const { palette } = useUITheme();
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
			entering={FadeInLeft.delay(revealDelay).duration(CHECK_REVEAL_MS)}
			style={{ alignItems: "center", flexDirection: "row", gap: spacing.md }}
		>
			<View
				style={{
					alignItems: "center",
					height: 22,
					justifyContent: "center",
					width: 22,
				}}
			>
				<Animated.View style={[{ position: "absolute" }, uncheckedStyle]}>
					<Ionicons
						color={palette.inkTertiary}
						name="ellipse-outline"
						size={22}
					/>
				</Animated.View>
				<Animated.View style={[{ position: "absolute" }, checkedStyle]}>
					<Ionicons color={palette.accent} name="checkmark-circle" size={22} />
				</Animated.View>
			</View>
			<Animated.View style={labelStyle}>
				<AppText bold={true} variant="subhead">
					{label}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}

function ReadinessRing({ value }: { value: number }) {
	const { palette } = useUITheme();
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
		<View
			accessibilityLabel={`Readiness ${displayValue} percent`}
			style={{
				alignItems: "center",
				height: READINESS_RING_SIZE,
				justifyContent: "center",
				width: READINESS_RING_SIZE,
			}}
		>
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
					stroke={palette.fill}
					strokeWidth={READINESS_RING_STROKE}
				/>
				<Circle
					cx={READINESS_RING_SIZE / 2}
					cy={READINESS_RING_SIZE / 2}
					fill="none"
					r={READINESS_RING_RADIUS}
					stroke={palette.accent}
					strokeDasharray={READINESS_RING_CIRCUMFERENCE}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					strokeWidth={READINESS_RING_STROKE}
					transform={`rotate(-90 ${READINESS_RING_SIZE / 2} ${READINESS_RING_SIZE / 2})`}
				/>
			</Svg>
			<AppText variant="heading">{displayValue}%</AppText>
		</View>
	);
}

function PreparePreview() {
	return (
		<View style={{ flex: 1, gap: spacing.lg, justifyContent: "center" }}>
			<Animated.View entering={FadeIn.duration(420)}>
				<Card
					style={{
						alignItems: "center",
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<View style={{ gap: spacing.xs }}>
						<AppText tone="secondary" variant="eyebrow">
							Trip readiness
						</AppText>
						<AppText variant="heading">Ready to go</AppText>
						<AppText tone="secondary" variant="footnote">
							All essentials checked
						</AppText>
					</View>
					<ReadinessRing value={READINESS_TARGET_PERCENT} />
				</Card>
			</Animated.View>
			<Card style={{ gap: spacing.md }}>
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
			</Card>
		</View>
	);
}

function StatChip({ delay, label }: { delay: number; label: string }) {
	const { palette } = useUITheme();

	return (
		<Animated.View
			entering={FadeInDown.delay(delay).duration(420)}
			style={{
				backgroundColor: palette.surface,
				borderRadius: radius.field,
				flex: 1,
				justifyContent: "center",
				minHeight: 48,
				minWidth: 96,
				paddingHorizontal: spacing.sm,
				paddingVertical: spacing.md,
			}}
		>
			<AppText bold={true} style={{ textAlign: "center" }} variant="footnote">
				{label}
			</AppText>
		</Animated.View>
	);
}

function RememberPreview() {
	const { palette } = useUITheme();

	return (
		<View style={{ flex: 1, gap: spacing.md, justifyContent: "center" }}>
			<Animated.View
				entering={FadeIn.duration(RECAP_CARD_IN_MS).delay(120)}
				style={{
					backgroundColor: palette.accent,
					borderRadius: radius.sheet,
					flex: 1,
					justifyContent: "space-between",
					maxHeight: 280,
					padding: spacing.section,
				}}
			>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<AppText
						style={{ color: ON_ACCENT, opacity: 0.85 }}
						variant="eyebrow"
					>
						Your trip story
					</AppText>
					<Ionicons
						color={ON_ACCENT}
						name="sparkles"
						size={18}
						style={{ opacity: 0.85 }}
					/>
				</View>
				<View style={{ gap: spacing.xs }}>
					<AppText style={{ color: ON_ACCENT }} variant="title">
						Palawan, 5 days
					</AppText>
					<AppText style={{ color: ON_ACCENT, opacity: 0.9 }} variant="subhead">
						7 places · ₱28.4k spent · a new favorite food town
					</AppText>
				</View>
			</Animated.View>
			<View style={{ flexDirection: "row", gap: spacing.sm }}>
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
	const previewHeight = isCompact ? COMPACT_PREVIEW_HEIGHT : PREVIEW_HEIGHT;

	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				paddingHorizontal: spacing.screen,
				width,
			}}
		>
			<View style={{ height: previewHeight, justifyContent: "center" }}>
				{isActive ? <ActPreview id={act.id} /> : null}
			</View>
			<View style={{ gap: spacing.sm, paddingTop: spacing.lg }}>
				<AppText tone="accent" variant="eyebrow">
					{act.eyebrow}
				</AppText>
				<AppText
					accessibilityRole="header"
					variant={isCompact ? "title" : "largeTitle"}
				>
					{act.title}
				</AppText>
				<AppText style={{ maxWidth: 340 }} tone="secondary" variant="subhead">
					{act.subtitle}
				</AppText>
			</View>
		</View>
	);
}

function PageDots({ activeIndex }: { activeIndex: number }) {
	return (
		<View style={{ flexDirection: "row", gap: spacing.sm }}>
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
	const { palette } = useUITheme();
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
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flex: 1,
				height: 4,
				overflow: "hidden",
			}}
		>
			<Animated.View
				style={[
					{
						backgroundColor: palette.ink,
						borderRadius: radius.pill,
						height: "100%",
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
	const { palette } = useUITheme();
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
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.canvas,
					flex: 1,
					justifyContent: "center",
				}}
			>
				<ActivityIndicator color={palette.inkSecondary} size="large" />
			</View>
		);
	}

	return (
		<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
			<View
				style={{
					flex: 1,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingTop: insets.top + spacing.xs,
				}}
			>
				<View
					style={{
						alignItems: "center",
						paddingBottom: spacing.sm,
						paddingHorizontal: spacing.screen,
					}}
				>
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

				<View
					style={{ gap: spacing.section, paddingHorizontal: spacing.screen }}
				>
					<PageDots activeIndex={activeIndex} />
					<PrimaryButton
						icon="arrow-forward"
						label="Get started"
						onPress={handleSignInPress}
					/>
				</View>
			</View>
			<AuthSignInSheet
				isOpen={isSignInSheetOpen}
				onOpenChange={setIsSignInSheetOpen}
			/>
		</View>
	);
}
