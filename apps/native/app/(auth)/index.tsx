import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	FlatList,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";
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

const SIGN_IN_ROUTE = "/(auth)/sign-in" as const;
const SIGN_UP_ROUTE = "/(auth)/sign-up" as const;

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
const FIRST_LIFECYCLE_INDEX = 1;
const FINAL_INDEX = ONBOARDING_SLIDES.length - 1;

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
			<Text className="font-semibold text-xs" style={{ color: accent }}>
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
			<Text className="font-semibold text-foreground text-xs">{label}</Text>
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
				className={
					isPrimary || isSecondary
						? "font-semibold text-sm"
						: "font-semibold text-sm"
				}
				style={{ color: isPrimary ? "#FFFFFF" : "#18181B" }}
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
			className="overflow-hidden rounded-[36px] border border-border bg-surface p-4"
			entering={FadeInUp.duration(380).springify().damping(20)}
			style={[previewShadow, { height: cardHeight }]}
		>
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
					<Text className="font-semibold text-xs" style={{ color: "#71717A" }}>
						{slide.id === "welcome" ? "VIYA" : slide.title}
					</Text>
				</View>
			</View>
			<View className="flex-1 pt-4">{children}</View>
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
				<View
					className="absolute h-28 w-64 rotate-[-10deg] rounded-[36px] border border-border bg-surface p-4"
					style={previewShadow}
				>
					<View className="flex-row items-center justify-between">
						<Text className="font-semibold text-foreground">Palawan</Text>
						<Pill accent="#059669">Ready</Pill>
					</View>
					<View className="mt-5 gap-2">
						<ProgressBar accent="#0A84FF" value={78} />
						<ProgressBar accent="#059669" value={62} />
					</View>
				</View>
				<View
					className="absolute bottom-2 left-8 h-20 w-20 items-center justify-center rounded-[28px]"
					style={{ backgroundColor: "#F5E8FF" }}
				>
					<Ionicons color="#9333EA" name="sparkles" size={28} />
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
				<Text className="text-center font-semibold text-6xl text-foreground">
					Viya
				</Text>
				<Text className="text-center font-medium text-muted">
					Travel, one step ahead
				</Text>
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
				<View
					className="max-w-[84%] rounded-[24px] rounded-bl-md px-4 py-3"
					style={{ backgroundColor: "#F4F4F5" }}
				>
					<Text className="font-medium text-foreground text-sm">
						I want a relaxing beach trip around ₱30k.
					</Text>
				</View>
				<View
					className="ml-auto max-w-[86%] rounded-[24px] rounded-br-md px-4 py-3"
					style={{ backgroundColor: `${accent}18` }}
				>
					<Text className="font-semibold text-foreground text-sm">
						Got it. Quiet islands, food spots, or activities?
					</Text>
				</View>
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
			<View
				className="flex-row items-center gap-3 rounded-[26px] border px-4 py-3"
				style={{ backgroundColor: "#FAFAFA", borderColor: "#ECEEF2" }}
			>
				<Text className="flex-1 text-muted text-sm">Ask Viya anything...</Text>
				<View
					className="h-9 w-9 items-center justify-center rounded-full"
					style={{ backgroundColor: accent }}
				>
					<Ionicons color="#FFFFFF" name="arrow-up" size={18} />
				</View>
			</View>
		</View>
	);
}

function PlanPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<View
				className="rounded-[30px] p-4"
				style={{ backgroundColor: `${accent}10` }}
			>
				<Text className="font-semibold text-foreground text-xl">
					Palawan Escape
				</Text>
				<View className="mt-3 flex-row gap-2">
					<Pill accent={accent}>June 10-15</Pill>
					<Pill accent={accent}>Relaxed beach</Pill>
				</View>
			</View>
			<View
				className="rounded-[26px] border p-4"
				style={{ borderColor: "#ECEEF2" }}
			>
				<Text className="font-semibold text-foreground text-sm">
					Budget allocation
				</Text>
				<View className="mt-3 gap-3">
					<ProgressBar accent={accent} value={42} />
					<ProgressBar accent="#059669" value={24} />
					<ProgressBar accent="#E97816" value={18} />
					<ProgressBar accent="#DB2777" value={16} />
				</View>
			</View>
			<View className="gap-2">
				{["Pick hotel area", "Confirm island tour", "Add airport transfer"].map(
					(action) => (
						<View className="flex-row items-center gap-2" key={action}>
							<Ionicons color={accent} name="checkmark-circle" size={18} />
							<Text className="font-medium text-foreground text-sm">
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
				<Text className="font-semibold text-foreground text-xl">
					Booking Targets
				</Text>
				<View className="mt-3 gap-2">
					{targets.map((target) => (
						<View
							className="flex-row items-center justify-between rounded-2xl border px-3 py-2.5"
							key={target.label}
							style={{ borderColor: "#ECEEF2" }}
						>
							<View className="flex-row items-center gap-2">
								<Ionicons
									color={target.tone}
									name="checkmark-circle"
									size={18}
								/>
								<Text className="font-semibold text-foreground text-sm">
									{target.label}
								</Text>
							</View>
							<Text
								className="font-semibold text-xs"
								style={{ color: target.tone }}
							>
								{target.status}
							</Text>
						</View>
					))}
				</View>
			</View>
			<View className="flex-row gap-2">
				<View
					className="flex-1 rounded-2xl px-3 py-3"
					style={{ backgroundColor: accent }}
				>
					<Text
						className="text-center font-semibold text-xs"
						style={{ color: "#FFFFFF" }}
					>
						Open booking app
					</Text>
				</View>
				<View
					className="flex-1 rounded-2xl px-3 py-3"
					style={{ backgroundColor: "#F4F4F5" }}
				>
					<Text className="text-center font-semibold text-foreground text-xs">
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
			<View
				className="items-center rounded-[28px] border border-dashed px-4 py-5"
				style={{ borderColor: `${accent}66` }}
			>
				<Ionicons color={accent} name="cloud-upload" size={28} />
				<Text className="mt-2 font-semibold text-foreground">
					Drop confirmations here
				</Text>
			</View>
			<View className="flex-row flex-wrap gap-2">
				{documents.map((document) => (
					<View
						className="w-[48%] rounded-2xl p-3"
						key={document.label}
						style={{ backgroundColor: "#F7F7F8" }}
					>
						<Ionicons color={accent} name={document.icon} size={16} />
						<Text className="mt-2 font-semibold text-foreground text-xs">
							{document.label}
						</Text>
					</View>
				))}
			</View>
			<View
				className="rounded-2xl px-4 py-3"
				style={{ backgroundColor: "#111827" }}
			>
				<Text className="font-semibold text-xs" style={{ color: "#FFFFFF" }}>
					Review: check-in, booking code, amount
				</Text>
			</View>
		</View>
	);
}

function PreparePreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<View
				className="flex-row items-center justify-between rounded-[30px] p-4"
				style={{ backgroundColor: "#F7F7F8" }}
			>
				<View>
					<Text className="font-semibold text-5xl text-foreground">82%</Text>
					<Text className="font-semibold text-muted text-xs">Almost ready</Text>
				</View>
				<View
					className="h-24 w-24 items-center justify-center rounded-full"
					style={{ backgroundColor: `${accent}18` }}
				>
					<Ionicons color={accent} name="shield-checkmark" size={42} />
				</View>
			</View>
			<View className="gap-2">
				{[
					"Add hotel confirmation",
					"Set airport transfer",
					"Review weather buffer",
				].map((fix) => (
					<View className="flex-row items-center gap-2" key={fix}>
						<Ionicons color={accent} name="radio-button-on" size={15} />
						<Text className="font-medium text-foreground text-sm">{fix}</Text>
					</View>
				))}
			</View>
			<View
				className="rounded-2xl px-4 py-3"
				style={{ backgroundColor: accent }}
			>
				<Text
					className="text-center font-semibold text-sm"
					style={{ color: "#FFFFFF" }}
				>
					Fix my readiness
				</Text>
			</View>
			<View className="flex-row justify-between">
				{["Bookings", "Docs", "Budget", "Pack", "Safety"].map((item) => (
					<Text className="font-semibold text-muted text-xs" key={item}>
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
			<Text className="font-semibold text-foreground text-xl">Travel Mode</Text>
			<View
				className="rounded-[28px] p-4"
				style={{ backgroundColor: "#111827" }}
			>
				<Text className="font-semibold text-xs" style={{ color: "#FFFFFF" }}>
					NOW
				</Text>
				<Text
					className="mt-2 font-semibold text-lg"
					style={{ color: "#FFFFFF" }}
				>
					Head to Puerto Princesa airport transfer
				</Text>
			</View>
			<View className="flex-row gap-2">
				<View
					className="flex-1 rounded-2xl p-3"
					style={{ backgroundColor: "#F7F7F8" }}
				>
					<Text className="font-semibold text-foreground text-xs">NEXT</Text>
					<Text className="mt-1 text-muted text-xs">
						Hotel check-in at 3:00 PM
					</Text>
				</View>
				<View
					className="flex-1 rounded-2xl p-3"
					style={{ backgroundColor: `${accent}18` }}
				>
					<Text className="font-semibold text-foreground text-xs">
						WATCH OUT
					</Text>
					<Text className="mt-1 text-muted text-xs">
						Rain later. Keep tour flexible.
					</Text>
				</View>
			</View>
			<View
				className="flex-row justify-around rounded-[26px] border p-3"
				style={{ borderColor: "#ECEEF2" }}
			>
				<MiniAction accent={accent} icon="documents" label="Docs" />
				<MiniAction accent={accent} icon="sparkles" label="Ask" />
				<MiniAction accent={accent} icon="map" label="Itinerary" />
			</View>
		</View>
	);
}

function TrackPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 justify-between">
			<View
				className="rounded-[30px] p-4"
				style={{ backgroundColor: "#F7F7F8" }}
			>
				<View className="flex-row items-center justify-between">
					<View>
						<Text className="font-semibold text-foreground text-xl">
							₱30,000
						</Text>
						<Text className="text-muted text-xs">planned budget</Text>
					</View>
					<View
						className="h-20 w-20 items-center justify-center rounded-full"
						style={{ borderColor: `${accent}66`, borderWidth: 10 }}
					>
						<Text className="font-semibold text-foreground text-xs">61%</Text>
					</View>
				</View>
				<View className="mt-4 gap-3">
					<ProgressBar accent={accent} value={61} />
					<View className="flex-row justify-between">
						<Text className="font-medium text-muted text-xs">
							Spent ₱18,400
						</Text>
						<Text className="font-medium text-muted text-xs">Left ₱11,600</Text>
					</View>
				</View>
			</View>
			<View
				className="rounded-[24px] border px-4 py-3"
				style={{ borderColor: "#ECEEF2" }}
			>
				<Text className="font-semibold text-foreground text-sm">
					You're spending faster on food, but still safe.
				</Text>
			</View>
			<View
				className="rounded-2xl px-4 py-3"
				style={{ backgroundColor: accent }}
			>
				<Text
					className="text-center font-semibold text-sm"
					style={{ color: "#FFFFFF" }}
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
					<View
						className="flex-1 rounded-[24px] p-4"
						style={{ backgroundColor: "#F7F7F8" }}
					>
						<View className="flex-row items-center justify-between">
							<Text className="font-semibold text-foreground">
								{item.title}
							</Text>
							<Text className="text-muted text-xs">{item.meta}</Text>
						</View>
						<Text className="mt-2 text-muted text-sm">{item.body}</Text>
					</View>
				</View>
			))}
			<View
				className="rounded-[24px] px-4 py-3"
				style={{ backgroundColor: `${accent}18` }}
			>
				<Text className="font-semibold text-foreground text-sm">
					Want to save this as a travel tip?
				</Text>
			</View>
		</View>
	);
}

function WrapPreview({ accent }: { accent: string }) {
	return (
		<View className="flex-1 gap-3">
			<View
				className="flex-1 justify-between rounded-[32px] p-5"
				style={{ backgroundColor: accent }}
			>
				<Text className="font-semibold text-xs" style={{ color: "#FFFFFF" }}>
					YOUR PALAWAN WRAP
				</Text>
				<View>
					<Text className="font-semibold text-4xl" style={{ color: "#FFFFFF" }}>
						5 days
					</Text>
					<Text className="mt-1 text-sm" style={{ color: "#FFFFFF" }}>
						Places, spend, favorites, and best discovery.
					</Text>
				</View>
			</View>
			<View className="flex-row gap-2">
				{["7 places", "₱28.4k", "Food lover"].map((item) => (
					<View
						className="flex-1 rounded-2xl px-2 py-3"
						key={item}
						style={{ backgroundColor: "#F7F7F8" }}
					>
						<Text className="text-center font-semibold text-foreground text-xs">
							{item}
						</Text>
					</View>
				))}
			</View>
			<View className="flex-row gap-2">
				<View
					className="flex-1 rounded-2xl border px-3 py-3"
					style={{ borderColor: "#ECEEF2" }}
				>
					<Text className="text-center font-semibold text-foreground text-xs">
						Share card
					</Text>
				</View>
				<View
					className="flex-1 rounded-2xl border px-3 py-3"
					style={{ borderColor: "#ECEEF2" }}
				>
					<Text className="text-center font-semibold text-foreground text-xs">
						Copy guide
					</Text>
				</View>
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
						<Text className="max-w-[320px] text-center text-muted text-sm leading-5">
							{slide.subtitle}
						</Text>
					</View>
				) : (
					<>
						<PreviewFrame isCompact={isCompact} slide={slide}>
							<PreviewContent slide={slide} />
						</PreviewFrame>
						<View className="items-center gap-2 px-2">
							<Text
								className={
									isCompact
										? "text-center font-semibold text-foreground text-xl leading-6"
										: "text-center font-semibold text-3xl text-foreground leading-9"
								}
							>
								{slide.title}
							</Text>
							<Text className="max-w-[340px] text-center text-muted text-sm leading-5">
								{slide.subtitle}
							</Text>
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

function ProgressDots({ activeIndex }: ProgressDotsProps) {
	return (
		<View className="flex-row justify-center gap-1.5">
			{ONBOARDING_SLIDES.slice(FIRST_LIFECYCLE_INDEX).map((slide, index) => {
				const isActive = activeIndex - FIRST_LIFECYCLE_INDEX === index;

				return (
					<View
						className={
							isActive
								? "h-2 w-5 rounded-full"
								: "h-2 w-2 rounded-full bg-border"
						}
						key={slide.id}
						style={isActive ? { backgroundColor: "#0A84FF" } : undefined}
					/>
				);
			})}
		</View>
	);
}

export default function AuthOnboardingScreen() {
	const { isSignedIn } = useAuth();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { height, width } = useWindowDimensions();
	const listRef = useRef<FlatList<OnboardingSlide>>(null);
	const [activeIndex, setActiveIndex] = useState(WELCOME_INDEX);
	const [isCheckingCompletion, setIsCheckingCompletion] = useState(true);
	const isCompactHeight = height < 740;
	const isWelcome = activeIndex === WELCOME_INDEX;
	const isFinal = activeIndex === FINAL_INDEX;
	const canSkip =
		activeIndex >= FIRST_LIFECYCLE_INDEX && activeIndex < FINAL_INDEX;
	let primaryActionLabel = "Next";

	if (isWelcome) {
		primaryActionLabel = "Get started";
	} else if (isFinal) {
		primaryActionLabel = "Start planning";
	}

	useEffect(() => {
		let isMounted = true;

		const checkCompletion = async () => {
			const hasCompleted = await getCompletedOnboarding();

			if (!isMounted) {
				return;
			}

			if (hasCompleted) {
				router.replace(SIGN_IN_ROUTE);
				return;
			}

			setIsCheckingCompletion(false);
		};

		checkCompletion();

		return () => {
			isMounted = false;
		};
	}, [router]);

	const goToIndex = useCallback(
		(nextIndex: number) => {
			listRef.current?.scrollToOffset({
				animated: true,
				offset: nextIndex * width,
			});
			setActiveIndex(nextIndex);
		},
		[width]
	);

	const completeAndNavigate = useCallback(
		async (route: Href) => {
			await setCompletedOnboarding();
			router.push(route);
		},
		[router]
	);

	const handlePrimaryAction = useCallback(async () => {
		if (isWelcome) {
			goToIndex(FIRST_LIFECYCLE_INDEX);
			return;
		}

		if (isFinal) {
			await completeAndNavigate(isSignedIn ? VIYA_ROUTES.viya : SIGN_UP_ROUTE);
			return;
		}

		goToIndex(activeIndex + 1);
	}, [
		activeIndex,
		completeAndNavigate,
		goToIndex,
		isFinal,
		isSignedIn,
		isWelcome,
	]);

	const handleSignInPress = useCallback(() => {
		router.push(SIGN_IN_ROUTE);
	}, [router]);

	const handleSkipPress = useCallback(async () => {
		await completeAndNavigate(isSignedIn ? VIYA_ROUTES.home : SIGN_IN_ROUTE);
	}, [completeAndNavigate, isSignedIn]);

	const handleScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);

			if (nextIndex !== activeIndex) {
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
				{canSkip ? (
					<Pressable
						accessibilityLabel="Skip onboarding"
						accessibilityRole="button"
						className="absolute right-5 z-10 rounded-full px-3 py-2"
						onPress={handleSkipPress}
						style={{ top: insets.top + 8 }}
					>
						<Text className="font-semibold text-muted text-sm">Skip</Text>
					</Pressable>
				) : null}

				<FlatList
					bounces={false}
					data={ONBOARDING_SLIDES}
					horizontal={true}
					keyExtractor={(item) => item.id}
					onMomentumScrollEnd={handleScrollEnd}
					pagingEnabled={true}
					ref={listRef}
					renderItem={renderSlide}
					scrollEventThrottle={16}
					showsHorizontalScrollIndicator={false}
				/>

				<View className="gap-2 px-5" style={{ paddingBottom: 6 }}>
					{isWelcome ? null : <ProgressDots activeIndex={activeIndex} />}
					<OnboardingButton
						label={primaryActionLabel}
						onPress={handlePrimaryAction}
					/>
					{isWelcome ? (
						<OnboardingButton
							label="Sign in"
							onPress={handleSignInPress}
							variant="secondary"
						/>
					) : null}
				</View>
			</View>
		</Container>
	);
}
