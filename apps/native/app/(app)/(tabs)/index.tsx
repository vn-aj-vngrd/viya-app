import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getPreferenceSuggestions,
	type PreferenceExploreSuggestion,
	type PreferencePlaceSuggestion,
	type PreferenceSuggestions,
} from "@viya-app/domain";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import {
	formatReadableTripDateRange,
	getDateRangeDurationDays,
} from "@/src/components/date/date-format-utils";
import { ViyaMark } from "@/src/components/viya-mark";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { CountrySuggestionCard } from "@/src/features/home/country-suggestion-card";
import { HomeLoadingState } from "@/src/features/home/home-skeleton";
import { philippineDestinations } from "@/src/features/home/philippine-destinations";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import { ManualTripCreateSheet } from "@/src/features/trips/manual-trip-create-sheet";

type IconName = ComponentProps<typeof Ionicons>["name"];

const primarySoftBackgroundStyle = { backgroundColor: "#EAF2FF" };
const successSoftBackgroundStyle = { backgroundColor: "#E4F8EF" };
const warmSoftBackgroundStyle = { backgroundColor: "#FFF7ED" };

const coverImageTransitionMs = 320;
const insightWashColors = [
	"rgba(10,132,255,0.12)",
	"rgba(10,132,255,0.02)",
] as const;
const destinationParentheticalPattern = /\s*\([^)]*\)/g;

const todayLabelFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "long",
	weekday: "long",
});

const getTodayLabel = () => todayLabelFormatter.format(new Date());

const makeCurrencyFormatter = (currency: string) =>
	new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	});

const formatBudget = (amount?: number, currency = "PHP") => {
	if (typeof amount !== "number") {
		return "Budget open";
	}

	return makeCurrencyFormatter(currency).format(amount);
};

const getTimeGreeting = () => {
	const hour = new Date().getHours();

	if (hour < 12) {
		return "Good morning";
	}

	if (hour < 18) {
		return "Good afternoon";
	}

	return "Good evening";
};

const getTripWindow = (startDate?: string, endDate?: string) => {
	const tripWindow = formatReadableTripDateRange({
		endDate,
		fallbackLabel: "Dates not set",
		startDate,
	});
	const durationDays =
		startDate && endDate ? getDateRangeDurationDays(startDate, endDate) : null;

	if (!durationDays) {
		return tripWindow;
	}

	const dayLabel = durationDays === 1 ? "day" : "days";

	return `${tripWindow} · ${durationDays} ${dayLabel}`;
};

const getDestinationImageFallbackNames = (destination?: string) => {
	if (!destination) {
		return [];
	}

	const names = [destination.trim()];
	const cleanedDestination = destination
		.replace(destinationParentheticalPattern, "")
		.split(",")[0]
		?.trim();

	if (cleanedDestination && cleanedDestination !== names[0]) {
		names.push(cleanedDestination);
	}

	return names.filter(Boolean);
};

function SectionTitle({
	action,
	subtitle,
	title,
}: {
	action?: ReactNode;
	subtitle?: string;
	title: string;
}) {
	return (
		<View className="flex-row items-start justify-between gap-4">
			<View className="min-w-0 flex-1 gap-1">
				<Text.Heading type="h5" weight="semibold">
					{title}
				</Text.Heading>
				{subtitle ? (
					<Text color="muted" type="body-sm">
						{subtitle}
					</Text>
				) : null}
			</View>
			{action}
		</View>
	);
}

const readinessAccent = "#0A84FF";
const readinessTrackStyle = { backgroundColor: "rgba(10, 132, 255, 0.14)" };

function ReadinessMeter({ score }: { score: number }) {
	const clampedScore = Math.max(0, Math.min(100, score));

	return (
		<View
			className="mt-1 h-1.5 overflow-hidden rounded-full"
			style={readinessTrackStyle}
		>
			<View
				className="h-full rounded-full"
				style={{ backgroundColor: readinessAccent, width: `${clampedScore}%` }}
			/>
		</View>
	);
}

function ActiveTripCard({
	budgetAmount,
	budgetCurrency,
	coverImageUrl,
	destination,
	readinessScore,
	title,
	tripId,
	tripWindow,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
	coverImageUrl?: string;
	destination?: string;
	readinessScore: number;
	title: string;
	tripId: Id<"trips">;
	tripWindow: string;
}) {
	const fallbackImageNames = getDestinationImageFallbackNames(destination);
	const fallbackImageUrls = useDestinationImages(
		coverImageUrl ? [] : fallbackImageNames
	);
	const fallbackImageUrl = fallbackImageNames
		.map((name) => fallbackImageUrls[name])
		.find((url): url is string => Boolean(url));
	const tripImageUrl = coverImageUrl ?? fallbackImageUrl;
	const readinessLabel =
		readinessScore > 0 ? `${readinessScore}% ready` : "Readiness open";

	return (
		<Surface className="gap-5 rounded-[30px] border border-border bg-surface p-5">
			<View className="flex-row items-center gap-4">
				<View className="h-20 w-20 overflow-hidden rounded-[24px]">
					<View
						className="absolute inset-0"
						style={primarySoftBackgroundStyle}
					/>
					{tripImageUrl ? (
						<Image
							cachePolicy="memory-disk"
							contentFit="cover"
							source={{ uri: tripImageUrl }}
							style={{ height: "100%", width: "100%" }}
							transition={coverImageTransitionMs}
						/>
					) : (
						<View className="h-full w-full items-center justify-center">
							<Ionicons color="#0A84FF" name="navigate-outline" size={22} />
						</View>
					)}
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						ACTIVE TRIP
					</Text>
					<Text.Heading numberOfLines={2} type="h4" weight="semibold">
						{title}
					</Text.Heading>
					<Text color="muted" numberOfLines={1} type="body-sm">
						{tripWindow}
					</Text>
				</View>
			</View>

			<View className="gap-5">
				<View className="flex-row">
					<View className="flex-1 gap-1.5">
						<Text color="muted" type="body-xs" weight="medium">
							Readiness
						</Text>
						<Text type="body" weight="semibold">
							{readinessLabel}
						</Text>
						<ReadinessMeter score={readinessScore} />
					</View>
					<View className="mx-5 w-px self-stretch bg-border" />
					<View className="flex-1 gap-1.5">
						<Text color="muted" type="body-xs" weight="medium">
							Budget
						</Text>
						<Text numberOfLines={1} type="body" weight="semibold">
							{formatBudget(budgetAmount, budgetCurrency)}
						</Text>
					</View>
				</View>

				<Link asChild href={VIYA_ROUTES.tripDashboard(tripId)}>
					<Button size="sm">
						<Button.Label>View trip</Button.Label>
					</Button>
				</Link>
			</View>
		</Surface>
	);
}

function ExploreTripCard({
	idea,
	onPress,
}: {
	idea: PreferenceExploreSuggestion;
	onPress: (prompt: string) => void;
}) {
	return (
		<Pressable
			accessibilityLabel={`Explore ${idea.title}`}
			accessibilityRole="button"
			className="w-64"
			onPress={() => onPress(idea.prompt)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<Surface className="min-h-40 gap-4 rounded-3xl border border-border bg-surface p-4">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: `${idea.accent}18` }}
				>
					<Ionicons
						color={idea.accent}
						name={idea.icon as IconName}
						size={19}
					/>
				</View>
				<View className="gap-1">
					<Text type="body" weight="semibold">
						{idea.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{idea.subtitle}
					</Text.Paragraph>
				</View>
			</Surface>
		</Pressable>
	);
}

function PlaceSuggestionCard({
	onPress,
	place,
}: {
	onPress: (prompt: string) => void;
	place: PreferencePlaceSuggestion;
}) {
	return (
		<Pressable
			accessibilityLabel={`Plan ${place.location}`}
			accessibilityRole="button"
			className="flex-1 gap-3 rounded-3xl border border-border bg-surface p-4"
			onPress={() => onPress(place.prompt)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<View
				className="h-2 w-14 rounded-full"
				style={{ backgroundColor: place.accent }}
			/>
			<View className="gap-1">
				<Text type="body-sm" weight="semibold">
					{place.location}
				</Text>
				<Text color="muted" type="body-xs" weight="medium">
					{place.tag}
				</Text>
			</View>
		</Pressable>
	);
}

function PreferenceInsightCard({
	onCreatePress,
	onPromptPress,
	suggestions,
}: {
	onCreatePress?: () => void;
	onPromptPress: (prompt: string) => void;
	suggestions: PreferenceSuggestions;
}) {
	const primaryPrompt =
		suggestions.prompts[0]?.prompt ??
		"Help me shape a trip plan using my travel preferences.";

	return (
		<Surface className="overflow-hidden rounded-[30px] border border-border bg-surface">
			<LinearGradient
				colors={insightWashColors}
				end={{ x: 1, y: 1 }}
				start={{ x: 0, y: 0 }}
				style={{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }}
			/>
			<View className="gap-4 p-5">
				<View className="flex-row items-center gap-3">
					<ViyaMark size={40} variant="blue" />
					<View className="min-w-0 flex-1 gap-0.5">
						<Text
							style={{ color: readinessAccent }}
							type="body-xs"
							weight="semibold"
						>
							VIYA PICKED FOR YOU
						</Text>
						<Text.Heading numberOfLines={2} type="h5" weight="semibold">
							{suggestions.home.title}
						</Text.Heading>
					</View>
				</View>
				<Text.Paragraph color="muted" type="body-sm">
					{suggestions.home.subtitle}
				</Text.Paragraph>
				<View className="flex-row gap-3">
					<Button
						className="flex-1"
						onPress={() => onPromptPress(primaryPrompt)}
						size="sm"
					>
						<Button.Label>Ask Viya</Button.Label>
					</Button>
					{onCreatePress ? (
						<Button
							className="flex-1"
							onPress={onCreatePress}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Create trip</Button.Label>
						</Button>
					) : null}
				</View>
			</View>
		</Surface>
	);
}

function PersonalizedSuggestionSections({
	onSuggestionPress,
	suggestions,
}: {
	onSuggestionPress: (prompt: string) => void;
	suggestions: PreferenceSuggestions;
}) {
	const countryImageUrls = useDestinationImages(
		suggestions.countrySuggestions.map((country) => country.country)
	);
	const philippineImageUrls = useDestinationImages(
		philippineDestinations.map((destination) => destination.country)
	);

	return (
		<>
			<View className="gap-3">
				<SectionTitle
					subtitle="Prompt Viya from moods matched to your profile."
					title="Explore trip ideas"
				/>
				<ScrollView
					horizontal={true}
					keyboardShouldPersistTaps="handled"
					showsHorizontalScrollIndicator={false}
				>
					<View className="flex-row gap-3 pr-4">
						{suggestions.exploreIdeas.map((idea) => (
							<ExploreTripCard
								idea={idea}
								key={idea.title}
								onPress={onSuggestionPress}
							/>
						))}
					</View>
				</ScrollView>
			</View>

			<View className="gap-3">
				<SectionTitle
					subtitle="Local escapes worth the long weekend, close to home."
					title="Closer to home"
				/>
				<ScrollView
					horizontal={true}
					keyboardShouldPersistTaps="handled"
					showsHorizontalScrollIndicator={false}
				>
					<View className="flex-row gap-3 pr-4">
						{philippineDestinations.map((destination) => (
							<CountrySuggestionCard
								country={destination}
								imageUrl={philippineImageUrls[destination.country]}
								key={destination.country}
								onPress={onSuggestionPress}
							/>
						))}
					</View>
				</ScrollView>
			</View>

			<View className="gap-3">
				<SectionTitle
					subtitle="Countries weighted by your interests, pace, budget, and group style."
					title="Countries to consider"
				/>
				<ScrollView
					horizontal={true}
					keyboardShouldPersistTaps="handled"
					showsHorizontalScrollIndicator={false}
				>
					<View className="flex-row gap-3 pr-4">
						{suggestions.countrySuggestions.map((country) => (
							<CountrySuggestionCard
								country={country}
								imageUrl={countryImageUrls[country.country]}
								key={country.country}
								onPress={onSuggestionPress}
							/>
						))}
					</View>
				</ScrollView>
			</View>

			<View className="gap-3">
				<SectionTitle
					subtitle="Specific starting points for a fresh AI plan."
					title="Places worth exploring"
				/>
				<View className="flex-row gap-3">
					{suggestions.placeSuggestions.slice(0, 2).map((place) => (
						<PlaceSuggestionCard
							key={place.location}
							onPress={onSuggestionPress}
							place={place}
						/>
					))}
				</View>
				{suggestions.placeSuggestions[2] ? (
					<PlaceSuggestionCard
						onPress={onSuggestionPress}
						place={suggestions.placeSuggestions[2]}
					/>
				) : null}
			</View>
		</>
	);
}

function StartPlanningCard({ onCreatePress }: { onCreatePress: () => void }) {
	return (
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<View className="flex-row gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={successSoftBackgroundStyle}
				>
					<Ionicons color="#059669" name="add" size={20} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text.Heading type="h5" weight="semibold">
						Ready to turn one into a trip?
					</Text.Heading>
					<Text.Paragraph color="muted" type="body-sm">
						Start from a destination, a mood, or a loose travel window.
					</Text.Paragraph>
				</View>
			</View>
			<View className="flex-row gap-3">
				<Button className="flex-1" onPress={onCreatePress} size="sm">
					<Button.Label>Create trip</Button.Label>
				</Button>
				<Link
					asChild
					href={{
						params: {
							prompt:
								"Help me create a trip. Ask me one setup question at a time.",
						},
						pathname: "/(app)/(tabs)/viya",
					}}
				>
					<Button className="flex-1" size="sm" variant="secondary">
						<Button.Label>Ask Viya</Button.Label>
					</Button>
				</Link>
			</View>
		</Surface>
	);
}

function HomeHeader({ greeting }: { greeting: string }) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-row items-center gap-4 bg-background px-4 pb-3"
			style={{ alignSelf: "stretch" }}
		>
			<View
				className="flex-1 flex-row items-center gap-4"
				style={{ paddingTop: Math.max(insets.top, 12) }}
			>
				<View className="min-w-0 flex-1 gap-0.5">
					<Text.Heading numberOfLines={1} type="h2" weight="semibold">
						{greeting}
					</Text.Heading>
					<Text color="muted" numberOfLines={1} type="body-sm">
						{getTodayLabel()}
					</Text>
				</View>
				<AccountAvatarButton size={44} />
			</View>
		</View>
	);
}

function StickyHomeShell({
	children,
	greeting,
	overlay,
}: {
	children: ReactNode;
	greeting: string;
	overlay?: ReactNode;
}) {
	return (
		<Container includeBottomInset={false} isScrollable={false}>
			<HomeHeader greeting={greeting} />
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					gap: 20,
					paddingBottom: 112,
					paddingHorizontal: 16,
					paddingTop: 8,
				}}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{children}
			</ScrollView>
			{overlay}
		</Container>
	);
}

function EmptyHomeState({
	suggestions,
}: {
	suggestions: PreferenceSuggestions;
}) {
	const greeting = getTimeGreeting();
	const router = useRouter();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	const handleSuggestionPress = (prompt: string) => {
		router.push({
			params: { prompt },
			pathname: "/(app)/(tabs)/viya",
		});
	};

	return (
		<StickyHomeShell
			greeting={greeting}
			overlay={
				<ManualTripCreateSheet
					isOpen={isCreateSheetOpen}
					onCreated={(tripId) => {
						router.push(VIYA_ROUTES.tripDashboard(tripId));
					}}
					onOpenChange={setIsCreateSheetOpen}
				/>
			}
		>
			<PreferenceInsightCard
				onCreatePress={() => setIsCreateSheetOpen(true)}
				onPromptPress={handleSuggestionPress}
				suggestions={suggestions}
			/>
			<PersonalizedSuggestionSections
				onSuggestionPress={handleSuggestionPress}
				suggestions={suggestions}
			/>
		</StickyHomeShell>
	);
}

export default function HomeScreen() {
	const trips = useQuery(api.trips.listTrips);
	const preferences = useQuery(api.preferences.getCurrentPreferences);
	const router = useRouter();
	const greeting = getTimeGreeting();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	if (trips === undefined || preferences === undefined) {
		return <HomeLoadingState />;
	}

	const suggestions = getPreferenceSuggestions(preferences ?? {});
	const realTrips = trips.filter((trip) => !trip.isDemo);
	const currentTrip = realTrips.find((trip) => trip.status !== "archived");

	if (!currentTrip) {
		return <EmptyHomeState suggestions={suggestions} />;
	}

	const handleSuggestionPress = (prompt: string) => {
		router.push({
			params: { prompt },
			pathname: "/(app)/(tabs)/viya",
		});
	};

	const createTripSheet = (
		<ManualTripCreateSheet
			isOpen={isCreateSheetOpen}
			onCreated={(tripId) => {
				router.push(VIYA_ROUTES.tripDashboard(tripId));
			}}
			onOpenChange={setIsCreateSheetOpen}
		/>
	);
	const similarTripPrompt = [
		`Suggest trips with a similar feel to ${currentTrip.destination}, but in a different country.`,
		"Keep the recommendations aligned to my saved travel preferences and explain why each option fits.",
	].join(" ");

	return (
		<StickyHomeShell greeting={greeting} overlay={createTripSheet}>
			<ActiveTripCard
				budgetAmount={currentTrip.budgetAmount}
				budgetCurrency={currentTrip.budgetCurrency}
				coverImageUrl={currentTrip.coverImageUrl}
				destination={currentTrip.destination}
				readinessScore={currentTrip.readinessScore}
				title={currentTrip.title}
				tripId={currentTrip._id}
				tripWindow={getTripWindow(currentTrip.startDate, currentTrip.endDate)}
			/>

			<PersonalizedSuggestionSections
				onSuggestionPress={handleSuggestionPress}
				suggestions={suggestions}
			/>

			<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
				<View className="flex-row gap-3">
					<View
						className="h-10 w-10 items-center justify-center rounded-full"
						style={warmSoftBackgroundStyle}
					>
						<Ionicons color="#E97816" name="compass-outline" size={19} />
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text.Heading type="h5" weight="semibold">
							Keep exploring beyond {currentTrip.destination}
						</Text.Heading>
						<Text.Paragraph color="muted" type="body-sm">
							Ask for nearby extensions, a different country, or a trip with the
							same vibe.
						</Text.Paragraph>
					</View>
				</View>
				<Button
					onPress={() => handleSuggestionPress(similarTripPrompt)}
					size="sm"
					variant="secondary"
				>
					<Button.Label>Suggest similar trips</Button.Label>
				</Button>
			</Surface>

			<StartPlanningCard onCreatePress={() => setIsCreateSheetOpen(true)} />
		</StickyHomeShell>
	);
}
