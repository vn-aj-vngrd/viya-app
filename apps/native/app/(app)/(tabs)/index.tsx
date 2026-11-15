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
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import {
	formatReadableTripDateRange,
	getDateRangeDurationDays,
} from "@/src/components/date/date-format-utils";
import {
	AppText,
	Card,
	CollapsingScreen,
	type IconName,
	PrimaryButton,
	radius,
	SecondaryButton,
	SectionHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { ViyaMark } from "@/src/components/viya-mark";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { CountrySuggestionCard } from "@/src/features/home/country-suggestion-card";
import { HomeLoadingState } from "@/src/features/home/home-skeleton";
import { philippineDestinations } from "@/src/features/home/philippine-destinations";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import { ManualTripCreateSheet } from "@/src/features/trips/manual-trip-create-sheet";

const TAB_BAR_CLEARANCE = 112;
const TRIP_COVER_SIZE = 72;
const METER_HEIGHT = 6;
const CARD_WIDTH_EXPLORE = 256;

const coverImageTransitionMs = 320;
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

function Carousel({ children }: { children: ReactNode }) {
	return (
		<ScrollView
			contentContainerStyle={{
				gap: spacing.md,
				paddingHorizontal: spacing.screen,
			}}
			horizontal={true}
			keyboardShouldPersistTaps="handled"
			showsHorizontalScrollIndicator={false}
		>
			{children}
		</ScrollView>
	);
}

function HomeSection({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<View style={{ gap: spacing.md }}>
			<View style={{ paddingHorizontal: spacing.screen }}>
				<SectionHeader title={title} />
			</View>
			{children}
		</View>
	);
}

function ReadinessMeter({ score }: { score: number }) {
	const { palette } = useUITheme();
	const clampedScore = Math.max(0, Math.min(100, score));

	return (
		<View
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: METER_HEIGHT,
				marginTop: spacing.xs,
				overflow: "hidden",
			}}
		>
			<View
				style={{
					backgroundColor: palette.accent,
					borderRadius: radius.pill,
					height: "100%",
					width: `${clampedScore}%`,
				}}
			/>
		</View>
	);
}

function IconBadge({ icon }: { icon: IconName }) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: 40,
				justifyContent: "center",
				width: 40,
			}}
		>
			<Ionicons color={palette.inkSecondary} name={icon} size={19} />
		</View>
	);
}

function ActiveTripCard({
	budgetAmount,
	budgetCurrency,
	coverImageUrl,
	destination,
	onViewPress,
	readinessScore,
	title,
	tripWindow,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
	coverImageUrl?: string;
	destination?: string;
	onViewPress: () => void;
	readinessScore: number;
	title: string;
	tripWindow: string;
}) {
	const { palette } = useUITheme();
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
		<Card style={{ gap: spacing.section }}>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.lg,
				}}
			>
				<View
					style={{
						backgroundColor: palette.fill,
						borderRadius: radius.field,
						height: TRIP_COVER_SIZE,
						overflow: "hidden",
						width: TRIP_COVER_SIZE,
					}}
				>
					{tripImageUrl ? (
						<Image
							accessibilityIgnoresInvertColors={true}
							cachePolicy="memory-disk"
							contentFit="cover"
							source={{ uri: tripImageUrl }}
							style={{ height: "100%", width: "100%" }}
							transition={coverImageTransitionMs}
						/>
					) : (
						<View
							style={{
								alignItems: "center",
								height: "100%",
								justifyContent: "center",
								width: "100%",
							}}
						>
							<Ionicons
								color={palette.inkSecondary}
								name="navigate-outline"
								size={22}
							/>
						</View>
					)}
				</View>
				<View style={{ flex: 1, gap: 2 }}>
					<AppText tone="secondary" variant="eyebrow">
						Active trip
					</AppText>
					<AppText numberOfLines={2} variant="headline">
						{title}
					</AppText>
					<AppText numberOfLines={1} tone="secondary" variant="subhead">
						{tripWindow}
					</AppText>
				</View>
			</View>

			<View style={{ flexDirection: "row", gap: spacing.section }}>
				<View style={{ flex: 1, gap: spacing.xs }}>
					<AppText tone="secondary" variant="footnote">
						Readiness
					</AppText>
					<AppText bold={true}>{readinessLabel}</AppText>
					<ReadinessMeter score={readinessScore} />
				</View>
				<View style={{ flex: 1, gap: spacing.xs }}>
					<AppText tone="secondary" variant="footnote">
						Budget
					</AppText>
					<AppText bold={true} numberOfLines={1}>
						{formatBudget(budgetAmount, budgetCurrency)}
					</AppText>
				</View>
			</View>

			<PrimaryButton label="View trip" onPress={onViewPress} />
		</Card>
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
		<Card
			accessibilityLabel={`Explore ${idea.title}`}
			onPress={() => onPress(idea.prompt)}
			padding="md"
			style={{ gap: spacing.lg, minHeight: 150, width: CARD_WIDTH_EXPLORE }}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: `${idea.accent}18`,
					borderRadius: radius.pill,
					height: 40,
					justifyContent: "center",
					width: 40,
				}}
			>
				<Ionicons color={idea.accent} name={idea.icon as IconName} size={19} />
			</View>
			<View style={{ gap: spacing.xs }}>
				<AppText bold={true}>{idea.title}</AppText>
				<AppText tone="secondary" variant="subhead">
					{idea.subtitle}
				</AppText>
			</View>
		</Card>
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
		<Card
			accessibilityLabel={`Plan ${place.location}`}
			onPress={() => onPress(place.prompt)}
			padding="md"
			style={{ flex: 1, gap: spacing.md }}
		>
			<View
				style={{
					backgroundColor: place.accent,
					borderRadius: radius.pill,
					height: 6,
					width: 40,
				}}
			/>
			<View style={{ gap: 2 }}>
				<AppText bold={true} variant="subhead">
					{place.location}
				</AppText>
				<AppText tone="secondary" variant="footnote">
					{place.tag}
				</AppText>
			</View>
		</Card>
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
		<Card style={{ gap: spacing.lg }}>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.md,
				}}
			>
				<ViyaMark size={40} variant="blue" />
				<View style={{ flex: 1, gap: 2 }}>
					<AppText tone="accent" variant="eyebrow">
						Viya picked for you
					</AppText>
					<AppText numberOfLines={2} variant="headline">
						{suggestions.home.title}
					</AppText>
				</View>
			</View>
			<AppText tone="secondary" variant="subhead">
				{suggestions.home.subtitle}
			</AppText>
			<View style={{ gap: spacing.sm }}>
				<PrimaryButton
					label="Ask Viya"
					onPress={() => onPromptPress(primaryPrompt)}
				/>
				{onCreatePress ? (
					<SecondaryButton label="Create trip" onPress={onCreatePress} />
				) : null}
			</View>
		</Card>
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
			<HomeSection title="Explore trip ideas">
				<Carousel>
					{suggestions.exploreIdeas.map((idea) => (
						<ExploreTripCard
							idea={idea}
							key={idea.title}
							onPress={onSuggestionPress}
						/>
					))}
				</Carousel>
			</HomeSection>

			<HomeSection title="Closer to home">
				<Carousel>
					{philippineDestinations.map((destination) => (
						<CountrySuggestionCard
							country={destination}
							imageUrl={philippineImageUrls[destination.country]}
							key={destination.country}
							onPress={onSuggestionPress}
						/>
					))}
				</Carousel>
			</HomeSection>

			<HomeSection title="Countries to consider">
				<Carousel>
					{suggestions.countrySuggestions.map((country) => (
						<CountrySuggestionCard
							country={country}
							imageUrl={countryImageUrls[country.country]}
							key={country.country}
							onPress={onSuggestionPress}
						/>
					))}
				</Carousel>
			</HomeSection>

			<HomeSection title="Places worth exploring">
				<View
					style={{
						gap: spacing.md,
						paddingHorizontal: spacing.screen,
					}}
				>
					<View style={{ flexDirection: "row", gap: spacing.md }}>
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
			</HomeSection>
		</>
	);
}

function PromptCard({
	children,
	description,
	icon,
	title,
}: {
	children: ReactNode;
	description: string;
	icon: IconName;
	title: string;
}) {
	return (
		<Card style={{ gap: spacing.lg }}>
			<View style={{ flexDirection: "row", gap: spacing.md }}>
				<IconBadge icon={icon} />
				<View style={{ flex: 1, gap: spacing.xs }}>
					<AppText variant="headline">{title}</AppText>
					<AppText tone="secondary" variant="subhead">
						{description}
					</AppText>
				</View>
			</View>
			<View style={{ gap: spacing.sm }}>{children}</View>
		</Card>
	);
}

function StartPlanningCard({
	onAskPress,
	onCreatePress,
}: {
	onAskPress: () => void;
	onCreatePress: () => void;
}) {
	return (
		<PromptCard
			description="Start from a destination, a mood, or a loose travel window."
			icon="add"
			title="Ready to turn one into a trip?"
		>
			<PrimaryButton label="Create trip" onPress={onCreatePress} />
			<SecondaryButton label="Ask Viya" onPress={onAskPress} />
		</PromptCard>
	);
}

const CREATE_TRIP_PROMPT =
	"Help me create a trip. Ask me one setup question at a time.";

function HomeShell({
	children,
	overlay,
}: {
	children: ReactNode;
	overlay?: ReactNode;
}) {
	return (
		<CollapsingScreen
			contentContainerStyle={{
				gap: spacing.section,
				paddingBottom: TAB_BAR_CLEARANCE,
				paddingTop: spacing.sm,
			}}
			footer={overlay}
			subtitle={getTodayLabel()}
			title={getTimeGreeting()}
			trailing={<AccountAvatarButton size={44} />}
		>
			{children}
		</CollapsingScreen>
	);
}

function Gutter({
	children,
	index = 0,
}: {
	children: ReactNode;
	index?: number;
}) {
	return (
		<Animated.View
			entering={FadeInDown.duration(260).delay(Math.min(index, 4) * 50)}
			style={{ paddingHorizontal: spacing.screen }}
		>
			{children}
		</Animated.View>
	);
}

function useHomeActions() {
	const router = useRouter();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	const askViya = (prompt: string) => {
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

	return {
		askViya,
		createTripSheet,
		openCreateSheet: () => setIsCreateSheetOpen(true),
		openTrip: (tripId: Id<"trips">) =>
			router.push(VIYA_ROUTES.tripDashboard(tripId)),
	};
}

function EmptyHomeState({
	suggestions,
}: {
	suggestions: PreferenceSuggestions;
}) {
	const { askViya, createTripSheet, openCreateSheet } = useHomeActions();

	return (
		<HomeShell overlay={createTripSheet}>
			<Gutter>
				<PreferenceInsightCard
					onCreatePress={openCreateSheet}
					onPromptPress={askViya}
					suggestions={suggestions}
				/>
			</Gutter>
			<PersonalizedSuggestionSections
				onSuggestionPress={askViya}
				suggestions={suggestions}
			/>
		</HomeShell>
	);
}

export default function HomeScreen() {
	const trips = useQuery(api.trips.listTrips);
	const preferences = useQuery(api.preferences.getCurrentPreferences);
	const { askViya, createTripSheet, openCreateSheet, openTrip } =
		useHomeActions();

	if (trips === undefined || preferences === undefined) {
		return <HomeLoadingState />;
	}

	const suggestions = getPreferenceSuggestions(preferences ?? {});
	const realTrips = trips.filter((trip) => !trip.isDemo);
	const currentTrip = realTrips.find((trip) => trip.status !== "archived");

	if (!currentTrip) {
		return <EmptyHomeState suggestions={suggestions} />;
	}

	const similarTripPrompt = [
		`Suggest trips with a similar feel to ${currentTrip.destination}, but in a different country.`,
		"Keep the recommendations aligned to my saved travel preferences and explain why each option fits.",
	].join(" ");

	return (
		<HomeShell overlay={createTripSheet}>
			<Gutter>
				<ActiveTripCard
					budgetAmount={currentTrip.budgetAmount}
					budgetCurrency={currentTrip.budgetCurrency}
					coverImageUrl={currentTrip.coverImageUrl}
					destination={currentTrip.destination}
					onViewPress={() => openTrip(currentTrip._id)}
					readinessScore={currentTrip.readinessScore}
					title={currentTrip.title}
					tripWindow={getTripWindow(currentTrip.startDate, currentTrip.endDate)}
				/>
			</Gutter>

			<PersonalizedSuggestionSections
				onSuggestionPress={askViya}
				suggestions={suggestions}
			/>

			<Gutter index={1}>
				<PromptCard
					description="Ask for nearby extensions, a different country, or a trip with the same vibe."
					icon="compass-outline"
					title={`Keep exploring beyond ${currentTrip.destination}`}
				>
					<SecondaryButton
						label="Suggest similar trips"
						onPress={() => askViya(similarTripPrompt)}
					/>
				</PromptCard>
			</Gutter>

			<Gutter index={2}>
				<StartPlanningCard
					onAskPress={() => askViya(CREATE_TRIP_PROMPT)}
					onCreatePress={openCreateSheet}
				/>
			</Gutter>
		</HomeShell>
	);
}
