import { Ionicons } from "@expo/vector-icons";
import { Spinner, Surface, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	FlatList,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	FadeInUp,
	useAnimatedStyle,
	useSharedValue,
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

type IconName = ComponentProps<typeof Ionicons>["name"];

type PreviewKind =
	| "welcome"
	| "dream"
	| "plan"
	| "book"
	| "sync"
	| "prepare"
	| "travel"
	| "track"
	| "capture"
	| "wrap";

interface OnboardingSlide {
	accent: string;
	id: PreviewKind;
	preview: PreviewKind;
	soft: string;
	subtitle: string;
	title: string;
}

const ONBOARDING_SLIDES = [
	{
		accent: "#111827",
		id: "welcome",
		preview: "welcome",
		soft: "#F6F1EA",
		subtitle: "Your AI travel companion from first idea to final memory.",
		title: "Meet Viya",
	},
	{
		accent: "#7C3AED",
		id: "dream",
		preview: "dream",
		soft: "#F5EEFF",
		subtitle:
			"Tell Viya your destination, mood, budget, dates, or even a rough idea.",
		title: "Dream your trip",
	},
	{
		accent: "#2563EB",
		id: "plan",
		preview: "plan",
		soft: "#EAF2FF",
		subtitle:
			"Turn an idea into route, budget, itinerary style, and next actions.",
		title: "Shape the perfect plan",
	},
	{
		accent: "#E97816",
		id: "book",
		preview: "book",
		soft: "#FFF1DA",
		subtitle:
			"Know what to book first while using your preferred apps and sites.",
		title: "Book with confidence",
	},
	{
		accent: "#059669",
		id: "sync",
		preview: "sync",
		soft: "#E4F8EF",
		subtitle:
			"Upload confirmations, receipts, screenshots, and documents into one vault.",
		title: "Sync everything",
	},
	{
		accent: "#0F766E",
		id: "prepare",
		preview: "prepare",
		soft: "#DEF7F2",
		subtitle:
			"Check bookings, documents, budget, packing, safety, and schedule gaps.",
		title: "Know if you're ready",
	},
	{
		accent: "#0284C7",
		id: "travel",
		preview: "travel",
		soft: "#E0F2FE",
		subtitle:
			"Get Now, Next, and Watch Out guidance with your trip context ready.",
		title: "Travel with live guidance",
	},
	{
		accent: "#CA8A04",
		id: "track",
		preview: "track",
		soft: "#FEF3C7",
		subtitle:
			"Track booked costs, pocket money, and expenses as your trip happens.",
		title: "Stay on budget",
	},
	{
		accent: "#DB2777",
		id: "capture",
		preview: "capture",
		soft: "#FCE7F3",
		subtitle: "Save photos, notes, ratings, receipts, discoveries, and tips.",
		title: "Capture every moment",
	},
	{
		accent: "#9333EA",
		id: "wrap",
		preview: "wrap",
		soft: "#F5E8FF",
		subtitle:
			"Create a shareable recap, travel insights, and a reusable guide.",
		title: "Turn your trip into a story",
	},
] as const satisfies readonly OnboardingSlide[];

const WELCOME_INDEX = 0;
const FINAL_INDEX = ONBOARDING_SLIDES.length - 1;
const AUTO_ADVANCE_MS = 4200;
const PROGRESS_DOT_SIZE = 6;
const ACTIVE_PROGRESS_DOT_WIDTH = 20;

const previewShadow = {
	elevation: 12,
	shadowColor: "#111827",
	shadowOffset: { height: 18, width: 0 },
	shadowOpacity: 0.1,
	shadowRadius: 28,
};

interface PillProps {
	accent?: string;
	children: string;
}

function Pill({ accent = "#111827", children }: PillProps) {
	return (
		<View
			className="rounded-full px-3 py-1.5"
			style={{ backgroundColor: `${accent}18` }}
		>
			<Text style={{ color: accent }} type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}

interface MiniActionProps {
	accent: string;
	icon: IconName;
	label: string;
}

function MiniAction({ accent, icon, label }: MiniActionProps) {
	return (
		<View className="items-center gap-1.5">
			<View
				className="h-9 w-9 items-center justify-center rounded-full"
				style={{ backgroundColor: `${accent}18` }}
			>
				<Ionicons color={accent} name={icon} size={16} />
			</View>
			<Text type="body-xs" weight="semibold">
				{label}
			</Text>
		</View>
	);
}

interface ProgressBarProps {
	accent: string;
	value: number;
}

function ProgressBar({ accent, value }: ProgressBarProps) {
	return (
		<View
			className="h-2.5 overflow-hidden rounded-full"
			style={{ backgroundColor: "#EEF0F4" }}
		>
			<View
				className="h-full rounded-full"
				style={{ backgroundColor: accent, width: `${value}%` as `${number}%` }}
			/>
		</View>
	);
}

interface OnboardingButtonProps {
	label: string;
	onPress: () => void;
	variant?: "primary" | "secondary" | "ghost";
}

function OnboardingButton({
	label,
	onPress,
	variant = "primary",
}: OnboardingButtonProps) {
	const isPrimary = variant === "primary";
	const isSecondary = variant === "secondary";

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className="items-center justify-center rounded-full"
			onPress={onPress}
			style={{
				backgroundColor: isPrimary ? "#0A84FF" : "#FFFFFF",
				borderColor: isSecondary ? "#E5E7EB" : "transparent",
				borderWidth: isSecondary ? 1 : 0,
				height: isPrimary || isSecondary ? 46 : 34,
			}}
		>
			<Text
				style={{ color: isPrimary ? "#FFFFFF" : "#18181B" }}
				weight="semibold"
			>
				{label}
			</Text>
		</Pressable>
	);
}

interface PreviewFrameProps {
	children: ReactNode;
	isCompact: boolean;
	slide: OnboardingSlide;
}

function PreviewFrame({ children, isCompact, slide }: PreviewFrameProps) {
	let cardHeight = 424;

	if (isCompact) {
		cardHeight = 304;
	}

	return (
		<Animated.View
			entering={FadeInUp.duration(380).springify().damping(20)}
			style={[previewShadow, { height: cardHeight }]}
		>
			<Surface className="h-full overflow-hidden rounded-[36px] border border-border bg-surface p-4">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-2">
						<View
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: "#FF5F57" }}
						/>
						<View
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: "#FEBC2E" }}
						/>
						<View
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: "#28C840" }}
						/>
					</View>
					<View
						className="rounded-full px-3 py-1.5"
						style={{ backgroundColor: "#F4F4F5" }}
					>
						<Text color="muted" type="body-xs" weight="semibold">
							{slide.id === "welcome" ? "VIYA" : slide.title}
						</Text>
					</View>
				</View>
				<View className="flex-1 pt-4">{children}</View>
			</Surface>
		</Animated.View>
	);
}

function WelcomeGraphic() {
	return (
		<View className="items-center gap-5">
			<View className="h-56 w-full items-center justify-center">
				<View
					className="absolute h-44 w-44 rounded-full"
					style={{ backgroundColor: "#EAF2FF" }}
				/>
				<Surface
					className="absolute h-28 w-64 rotate-[-10deg] rounded-[36px] border border-border bg-surface p-4"
					style={previewShadow}
				>
					<View className="flex-row items-center justify-between">
						<Text weight="semibold">Trip plan</Text>
						<Pill accent="#059669">Ready</Pill>
					</View>
					<View className="mt-5 gap-2">
						<ProgressBar accent="#0A84FF" value={78} />
						<ProgressBar accent="#059669" value={62} />
					</View>
				</Surface>
				<View
					className="absolute bottom-2 left-8 h-20 w-20 items-center justify-center rounded-[28px]"
					style={{ backgroundColor: "#F5E8FF" }}
				>
					<ViyaMark size={58} />
				</View>
				<View
					className="absolute top-2 right-7 h-24 w-24 items-center justify-center rounded-full"
					style={{ backgroundColor: "#FEF3C7" }}
				>
					<Ionicons color="#CA8A04" name="airplane" size={30} />
				</View>
				<View
					className="absolute right-12 bottom-8 h-14 w-14 items-center justify-center rounded-2xl"
					style={{ backgroundColor: "#E4F8EF" }}
				>
					<Ionicons color="#059669" name="shield-checkmark" size={24} />
				</View>
			</View>
			<View className="items-center gap-2">
				<Text.Heading
					align="center"
					className="text-6xl"
					type="h1"
					weight="semibold"
				>
					Viya
				</Text.Heading>
				<Text.Paragraph align="center" color="muted" weight="medium">
					Travel, one step ahead
				</Text.Paragraph>
			</View>
			<View className="flex-row gap-2">
				<Pill accent="#0A84FF">Plan</Pill>
				<Pill accent="#059669">Prepare</Pill>
				<Pill accent="#9333EA">Remember</Pill>
			</View>
		</View>
	);
}

function DreamPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 justify-between">
			<View className="gap-3">
				<Surface
					className="max-w-[84%] rounded-3xl rounded-bl-md px-4 py-3"
					style={{ backgroundColor: "#F4F4F5" }}
					variant="secondary"
				>
					<Text type="body-sm" weight="medium">
						I want a relaxing beach trip around ₱30k.
					</Text>
				</Surface>
				<Surface
					className="ml-auto max-w-[86%] rounded-3xl rounded-br-md px-4 py-3"
					style={{ backgroundColor: `${accent}18` }}
					variant="tertiary"
				>
					<Text type="body-sm" weight="semibold">
						Got it. Quiet islands, food spots, or activities?
					</Text>
				</Surface>
				<View className="flex-row flex-wrap gap-2">
					{["Quiet beach", "Food trip", "Adventure", "Family friendly"].map(
						(item) => (
							<Pill accent={accent} key={item}>
								{item}
							</Pill>
						)
					)}
				</View>
			</View>
			<Surface
				className="flex-row items-center gap-3 rounded-[26px] border px-4 py-3"
				style={{ backgroundColor: "#FAFAFA", borderColor: "#ECEEF2" }}
				variant="secondary"
			>
				<Text className="flex-1" color="muted" type="body-sm">
					Ask Viya anything...
				</Text>
				<View
					className="h-9 w-9 items-center justify-center rounded-full"
					style={{ backgroundColor: accent }}
				>
					<Ionicons color="#FFFFFF" name="arrow-up" size={18} />
				</View>
			</Surface>
		</View>
	);
}

function PlanPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<Surface
				className="rounded-[30px] p-4"
				style={{ backgroundColor: `${accent}10` }}
				variant="secondary"
			>
				<Text.Heading type="h4" weight="semibold">
					Island Escape
				</Text.Heading>
				<View className="mt-3 flex-row gap-2">
					<Pill accent={accent}>June 10-15</Pill>
					<Pill accent={accent}>Relaxed beach</Pill>
				</View>
			</Surface>
			<Surface
				className="rounded-[26px] border p-4"
				style={{ borderColor: "#ECEEF2" }}
				variant="secondary"
			>
				<Text type="body-sm" weight="semibold">
					Budget allocation
				</Text>
				<View className="mt-3 gap-3">
					<ProgressBar accent={accent} value={42} />
					<ProgressBar accent="#059669" value={24} />
					<ProgressBar accent="#E97816" value={18} />
					<ProgressBar accent="#DB2777" value={16} />
				</View>
			</Surface>
			<View className="gap-2">
				{["Pick hotel area", "Confirm island tour", "Add airport transfer"].map(
					(action) => (
						<View className="flex-row items-center gap-2" key={action}>
							<Ionicons color={accent} name="checkmark-circle" size={18} />
							<Text type="body-sm" weight="medium">
								{action}
							</Text>
						</View>
					)
				)}
			</View>
		</View>
	);
}

function BookPreview({ accent }: { accent: string }) {
	const targets = [
		{
			label: "Flight confirmed",
			status: "Done",
			tone: "#059669",
		},
		{
			label: "Hotel recommended",
			status: "Must book now",
			tone: accent,
		},
		{
			label: "Airport transfer needed",
			status: "Can book later",
			tone: "#CA8A04",
		},
		{
			label: "Island tour optional",
			status: "Optional upgrade",
			tone: "#71717A",
		},
	];

	return (
		<View className="flex-1 justify-between">
			<View>
				<Text.Heading type="h4" weight="semibold">
					Booking Targets
				</Text.Heading>
				<View className="mt-3 gap-2">
					{targets.map((target) => (
						<Surface
							className="flex-row items-center justify-between rounded-2xl border px-3 py-2.5"
							key={target.label}
							style={{ borderColor: "#ECEEF2" }}
							variant="secondary"
						>
							<View className="flex-row items-center gap-2">
								<Ionicons
									color={target.tone}
									name="checkmark-circle"
									size={18}
								/>
								<Text type="body-sm" weight="semibold">
									{target.label}
								</Text>
							</View>
							<Text
								style={{ color: target.tone }}
								type="body-xs"
								weight="semibold"
							>
								{target.status}
							</Text>
						</Surface>
					))}
				</View>
			</View>
			<View className="flex-row gap-2">
				<View
					className="flex-1 rounded-2xl px-3 py-3"
					style={{ backgroundColor: accent }}
				>
					<Text
						align="center"
						style={{ color: "#FFFFFF" }}
						type="body-xs"
						weight="semibold"
					>
						Open booking app
					</Text>
				</View>
				<View
					className="flex-1 rounded-2xl px-3 py-3"
					style={{ backgroundColor: "#F4F4F5" }}
				>
					<Text align="center" type="body-xs" weight="semibold">
						Save target
					</Text>
				</View>
			</View>
		</View>
	);
}

function SyncPreview({ accent }: { accent: string }) {
	const documents = [
		{ icon: "airplane" as IconName, label: "Flight confirmation" },
		{ icon: "receipt" as IconName, label: "Hotel receipt" },
		{ icon: "image" as IconName, label: "Tour screenshot" },
		{ icon: "id-card" as IconName, label: "Valid ID note" },
	];

	return (
		<View className="flex-1 gap-3">
			<Surface
				className="items-center rounded-[28px] border border-dashed px-4 py-5"
				style={{ borderColor: `${accent}66` }}
				variant="secondary"
			>
				<Ionicons color={accent} name="cloud-upload" size={28} />
				<Text className="mt-2" weight="semibold">
					Drop confirmations here
				</Text>
			</Surface>
			<View className="flex-row flex-wrap gap-2">
				{documents.map((document) => (
					<Surface
						className="w-[48%] rounded-2xl p-3"
						key={document.label}
						style={{ backgroundColor: "#F7F7F8" }}
						variant="secondary"
					>
						<Ionicons color={accent} name={document.icon} size={16} />
						<Text className="mt-2" type="body-xs" weight="semibold">
							{document.label}
						</Text>
					</Surface>
				))}
			</View>
			<Surface
				className="rounded-2xl px-4 py-3"
				style={{ backgroundColor: "#111827" }}
				variant="tertiary"
			>
				<Text style={{ color: "#FFFFFF" }} type="body-xs" weight="semibold">
					Review: check-in, booking code, amount
				</Text>
			</Surface>
		</View>
	);
}

function PreparePreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<Surface
				className="flex-row items-center justify-between rounded-[30px] p-4"
				style={{ backgroundColor: "#F7F7F8" }}
				variant="secondary"
			>
				<View>
					<Text.Heading className="text-5xl" type="h1" weight="semibold">
						82%
					</Text.Heading>
					<Text color="muted" type="body-xs" weight="semibold">
						Almost ready
					</Text>
				</View>
				<View
					className="h-24 w-24 items-center justify-center rounded-full"
					style={{ backgroundColor: `${accent}18` }}
				>
					<Ionicons color={accent} name="shield-checkmark" size={42} />
				</View>
			</Surface>
			<View className="gap-2">
				{[
					"Add hotel confirmation",
					"Set airport transfer",
					"Review weather buffer",
				].map((fix) => (
					<View className="flex-row items-center gap-2" key={fix}>
						<Ionicons color={accent} name="radio-button-on" size={15} />
						<Text type="body-sm" weight="medium">
							{fix}
						</Text>
					</View>
				))}
			</View>
			<View
				className="rounded-2xl px-4 py-3"
				style={{ backgroundColor: accent }}
			>
				<Text
					align="center"
					style={{ color: "#FFFFFF" }}
					type="body-sm"
					weight="semibold"
				>
					Fix my readiness
				</Text>
			</View>
			<View className="flex-row justify-between">
				{["Bookings", "Docs", "Budget", "Pack", "Safety"].map((item) => (
					<Text color="muted" key={item} type="body-xs" weight="semibold">
						{item}
					</Text>
				))}
			</View>
		</View>
	);
}

function TravelPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<Text.Heading type="h4" weight="semibold">
				Travel Mode
			</Text.Heading>
			<Surface
				className="rounded-[28px] p-4"
				style={{ backgroundColor: "#111827" }}
				variant="tertiary"
			>
				<Text style={{ color: "#FFFFFF" }} type="body-xs" weight="semibold">
					NOW
				</Text>
				<Text
					className="mt-2"
					style={{ color: "#FFFFFF" }}
					type="h5"
					weight="semibold"
				>
					Head to Puerto Princesa airport transfer
				</Text>
			</Surface>
			<View className="flex-row gap-2">
				<Surface
					className="flex-1 rounded-2xl p-3"
					style={{ backgroundColor: "#F7F7F8" }}
					variant="secondary"
				>
					<Text type="body-xs" weight="semibold">
						NEXT
					</Text>
					<Text className="mt-1" color="muted" type="body-xs">
						Hotel check-in at 3:00 PM
					</Text>
				</Surface>
				<Surface
					className="flex-1 rounded-2xl p-3"
					style={{ backgroundColor: `${accent}18` }}
					variant="tertiary"
				>
					<Text type="body-xs" weight="semibold">
						WATCH OUT
					</Text>
					<Text className="mt-1" color="muted" type="body-xs">
						Rain later. Keep tour flexible.
					</Text>
				</Surface>
			</View>
			<Surface
				className="flex-row justify-around rounded-[26px] border p-3"
				style={{ borderColor: "#ECEEF2" }}
				variant="secondary"
			>
				<MiniAction accent={accent} icon="documents" label="Docs" />
				<MiniAction accent={accent} icon="sparkles" label="Ask" />
				<MiniAction accent={accent} icon="map" label="Itinerary" />
			</Surface>
		</View>
	);
}

function TrackPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 justify-between">
			<Surface
				className="rounded-[30px] p-4"
				style={{ backgroundColor: "#F7F7F8" }}
				variant="secondary"
			>
				<View className="flex-row items-center justify-between">
					<View>
						<Text.Heading type="h4" weight="semibold">
							₱30,000
						</Text.Heading>
						<Text color="muted" type="body-xs">
							planned budget
						</Text>
					</View>
					<View
						className="h-20 w-20 items-center justify-center rounded-full"
						style={{ borderColor: `${accent}66`, borderWidth: 10 }}
					>
						<Text type="body-xs" weight="semibold">
							61%
						</Text>
					</View>
				</View>
				<View className="mt-4 gap-3">
					<ProgressBar accent={accent} value={61} />
					<View className="flex-row justify-between">
						<Text color="muted" type="body-xs" weight="medium">
							Spent ₱18,400
						</Text>
						<Text color="muted" type="body-xs" weight="medium">
							Left ₱11,600
						</Text>
					</View>
				</View>
			</Surface>
			<Surface
				className="rounded-3xl border px-4 py-3"
				style={{ borderColor: "#ECEEF2" }}
				variant="secondary"
			>
				<Text type="body-sm" weight="semibold">
					You're spending faster on food, but still safe.
				</Text>
			</Surface>
			<View
				className="rounded-2xl px-4 py-3"
				style={{ backgroundColor: accent }}
			>
				<Text
					align="center"
					style={{ color: "#FFFFFF" }}
					type="body-sm"
					weight="semibold"
				>
					Add expense
				</Text>
			</View>
		</View>
	);
}

function CapturePreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			{[
				{
					body: "Best lunch spot near the bay.",
					meta: "Day 3",
					title: "Honda Bay",
				},
				{
					body: "Island tour: 4.8",
					meta: "Receipt attached",
					title: "Memory saved",
				},
			].map((item) => (
				<View className="flex-row gap-3" key={item.title}>
					<View className="items-center">
						<View
							className="h-4 w-4 rounded-full"
							style={{ backgroundColor: accent }}
						/>
						<View
							className="mt-1 w-px flex-1"
							style={{ backgroundColor: "#ECEEF2" }}
						/>
					</View>
					<Surface
						className="flex-1 rounded-3xl p-4"
						style={{ backgroundColor: "#F7F7F8" }}
						variant="secondary"
					>
						<View className="flex-row items-center justify-between">
							<Text weight="semibold">{item.title}</Text>
							<Text color="muted" type="body-xs">
								{item.meta}
							</Text>
						</View>
						<Text.Paragraph className="mt-2" color="muted" type="body-sm">
							{item.body}
						</Text.Paragraph>
					</Surface>
				</View>
			))}
			<Surface
				className="rounded-3xl px-4 py-3"
				style={{ backgroundColor: `${accent}18` }}
				variant="tertiary"
			>
				<Text type="body-sm" weight="semibold">
					Want to save this as a travel tip?
				</Text>
			</Surface>
		</View>
	);
}

function WrapPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<Surface
				className="flex-1 justify-between rounded-4xl p-5"
				style={{ backgroundColor: accent }}
				variant="tertiary"
			>
				<Text style={{ color: "#FFFFFF" }} type="body-xs" weight="semibold">
					YOUR TRIP STORY
				</Text>
				<View>
					<Text.Heading
						className="text-4xl"
						style={{ color: "#FFFFFF" }}
						type="h1"
						weight="semibold"
					>
						5 days
					</Text.Heading>
					<Text.Paragraph
						className="mt-1"
						style={{ color: "#FFFFFF" }}
						type="body-sm"
					>
						Places, spend, favorites, and best discovery.
					</Text.Paragraph>
				</View>
			</Surface>
			<View className="flex-row gap-2">
				{["7 places", "₱28.4k", "Food lover"].map((item) => (
					<Surface
						className="flex-1 rounded-2xl px-2 py-3"
						key={item}
						style={{ backgroundColor: "#F7F7F8" }}
						variant="secondary"
					>
						<Text align="center" type="body-xs" weight="semibold">
							{item}
						</Text>
					</Surface>
				))}
			</View>
			<View className="flex-row gap-2">
				<Surface
					className="flex-1 rounded-2xl border px-3 py-3"
					style={{ borderColor: "#ECEEF2" }}
					variant="secondary"
				>
					<Text align="center" type="body-xs" weight="semibold">
						Share card
					</Text>
				</Surface>
				<Surface
					className="flex-1 rounded-2xl border px-3 py-3"
					style={{ borderColor: "#ECEEF2" }}
					variant="secondary"
				>
					<Text align="center" type="body-xs" weight="semibold">
						Copy guide
					</Text>
				</Surface>
			</View>
		</View>
	);
}

interface PreviewContentProps {
	slide: OnboardingSlide;
}

function PreviewContent({ slide }: PreviewContentProps) {
	switch (slide.preview) {
		case "dream":
			return <DreamPreview accent={slide.accent} />;
		case "plan":
			return <PlanPreview accent={slide.accent} />;
		case "book":
			return <BookPreview accent={slide.accent} />;
		case "sync":
			return <SyncPreview accent={slide.accent} />;
		case "prepare":
			return <PreparePreview accent={slide.accent} />;
		case "travel":
			return <TravelPreview accent={slide.accent} />;
		case "track":
			return <TrackPreview accent={slide.accent} />;
		case "capture":
			return <CapturePreview accent={slide.accent} />;
		case "wrap":
			return <WrapPreview accent={slide.accent} />;
		default:
			return null;
	}
}

interface SlideViewProps {
	isCompact: boolean;
	slide: OnboardingSlide;
	width: number;
}

function SlideView({ isCompact, slide, width }: SlideViewProps) {
	return (
		<View className="px-5" style={{ width }}>
			<View
				className={
					isCompact
						? "flex-1 justify-center gap-3"
						: "flex-1 justify-center gap-5"
				}
			>
				{slide.id === "welcome" ? (
					<View className="items-center gap-4">
						<WelcomeGraphic />
						<Text.Paragraph
							align="center"
							className="max-w-[320px] leading-5"
							color="muted"
							type="body-sm"
						>
							{slide.subtitle}
						</Text.Paragraph>
					</View>
				) : (
					<>
						<PreviewFrame isCompact={isCompact} slide={slide}>
							<PreviewContent slide={slide} />
						</PreviewFrame>
						<View className="items-center gap-2 px-2">
							<Text.Heading
								className={
									isCompact
										? "text-center leading-6"
										: "text-center text-3xl leading-9"
								}
								type={isCompact ? "h4" : "h2"}
								weight="semibold"
							>
								{slide.title}
							</Text.Heading>
							<Text.Paragraph
								align="center"
								className="max-w-85 leading-5"
								color="muted"
								type="body-sm"
							>
								{slide.subtitle}
							</Text.Paragraph>
						</View>
					</>
				)}
			</View>
		</View>
	);
}

interface ProgressDotsProps {
	activeIndex: number;
}

interface ProgressDotProps {
	isActive: boolean;
}

function ProgressDot({ isActive }: ProgressDotProps) {
	const progress = useSharedValue(0);

	useEffect(() => {
		if (!isActive) {
			cancelAnimation(progress);
			progress.value = 0;
			return;
		}

		progress.value = 0;
		progress.value = withTiming(1, {
			duration: AUTO_ADVANCE_MS,
			easing: Easing.linear,
		});

		return () => cancelAnimation(progress);
	}, [isActive, progress]);

	const fillStyle = useAnimatedStyle(() => ({
		width:
			PROGRESS_DOT_SIZE +
			(ACTIVE_PROGRESS_DOT_WIDTH - PROGRESS_DOT_SIZE) * progress.value,
	}));

	return (
		<View
			className="overflow-hidden rounded-full"
			style={{
				backgroundColor: "rgba(24, 24, 27, 0.2)",
				height: PROGRESS_DOT_SIZE,
				width: isActive ? ACTIVE_PROGRESS_DOT_WIDTH : PROGRESS_DOT_SIZE,
			}}
		>
			{isActive ? (
				<Animated.View
					className="h-full rounded-full"
					style={[
						{
							backgroundColor: "rgba(24, 24, 27, 0.82)",
						},
						fillStyle,
					]}
				/>
			) : null}
		</View>
	);
}

function ProgressDots({ activeIndex }: ProgressDotsProps) {
	return (
		<View className="flex-row justify-center gap-1.5">
			{ONBOARDING_SLIDES.map((slide, index) => {
				const isActive = activeIndex === index;

				return <ProgressDot isActive={isActive} key={slide.id} />;
			})}
		</View>
	);
}

export default function AuthOnboardingScreen() {
	const insets = useSafeAreaInsets();
	const { height, width } = useWindowDimensions();
	const listRef = useRef<FlatList<OnboardingSlide>>(null);
	const activeIndexRef = useRef(WELCOME_INDEX);
	const [activeIndex, setActiveIndex] = useState(WELCOME_INDEX);
	const [isCheckingCompletion, setIsCheckingCompletion] = useState(true);
	const [isSignInSheetOpen, setIsSignInSheetOpen] = useState(false);
	const isCompactHeight = height < 740;

	useEffect(() => {
		let isMounted = true;

		const checkCompletion = async () => {
			const hasCompleted = await getCompletedOnboarding();

			if (!isMounted) {
				return;
			}

			if (hasCompleted) {
				setIsCheckingCompletion(false);
				return;
			}

			setIsCheckingCompletion(false);
		};

		checkCompletion();

		return () => {
			isMounted = false;
		};
	}, []);

	const goToIndex = useCallback(
		(nextIndex: number) => {
			activeIndexRef.current = nextIndex;
			listRef.current?.scrollToOffset({
				animated: true,
				offset: nextIndex * width,
			});
			setActiveIndex(nextIndex);
		},
		[width]
	);

	useEffect(() => {
		if (isCheckingCompletion || isSignInSheetOpen || width <= 0) {
			return;
		}

		const timer = setInterval(() => {
			const nextIndex =
				activeIndexRef.current === FINAL_INDEX
					? WELCOME_INDEX
					: activeIndexRef.current + 1;
			goToIndex(nextIndex);
		}, AUTO_ADVANCE_MS);

		return () => clearInterval(timer);
	}, [goToIndex, isCheckingCompletion, isSignInSheetOpen, width]);

	const handleSignInPress = useCallback(() => {
		setIsSignInSheetOpen(true);
		setCompletedOnboarding().catch(() => undefined);
	}, []);

	const handleScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.min(
				FINAL_INDEX,
				Math.max(
					WELCOME_INDEX,
					Math.round(event.nativeEvent.contentOffset.x / width)
				)
			);

			if (nextIndex !== activeIndex) {
				activeIndexRef.current = nextIndex;
				setActiveIndex(nextIndex);
			}
		},
		[activeIndex, width]
	);

	const renderSlide = useCallback(
		({ item }: { item: OnboardingSlide }) => (
			<SlideView isCompact={isCompactHeight} slide={item} width={width} />
		),
		[isCompactHeight, width]
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
			<View
				className="flex-1"
				style={{
					paddingBottom: 0,
					paddingTop: insets.top + 4,
				}}
			>
				<FlatList
					bounces={false}
					data={ONBOARDING_SLIDES}
					getItemLayout={(_, index) => ({
						index,
						length: width,
						offset: width * index,
					})}
					horizontal={true}
					keyExtractor={(item) => item.id}
					onMomentumScrollEnd={handleScrollEnd}
					pagingEnabled={true}
					ref={listRef}
					renderItem={renderSlide}
					scrollEventThrottle={16}
					showsHorizontalScrollIndicator={false}
				/>

				<View className="gap-4 px-5" style={{ paddingBottom: 6 }}>
					<ProgressDots activeIndex={activeIndex} />
					<OnboardingButton label="Get started" onPress={handleSignInPress} />
				</View>
			</View>
			<AuthSignInSheet
				isOpen={isSignInSheetOpen}
				onOpenChange={setIsSignInSheetOpen}
			/>
		</Container>
	);
}
