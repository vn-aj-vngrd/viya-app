import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getPreferenceSuggestions,
	type PreferenceCountrySuggestion,
	type PreferenceExploreSuggestion,
	type PreferencePlaceSuggestion,
	type PreferenceSuggestions,
} from "@viya-app/domain";
import { useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { Button, Spinner, Surface, Text } from "heroui-native";
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
import { VIYA_ROUTES } from "@/src/constants/routes";
import { ManualTripCreateSheet } from "@/src/features/trips/manual-trip-create-sheet";

type IconName = ComponentProps<typeof Ionicons>["name"];

const activeTripCardStyle = {
	boxShadow: "0 18px 38px rgba(7, 26, 47, 0.18)",
} as const;
const primarySoftBackgroundStyle = { backgroundColor: "#EAF2FF" };
const successSoftBackgroundStyle = { backgroundColor: "#E4F8EF" };
const warmSoftBackgroundStyle = { backgroundColor: "#FFF7ED" };

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

function ActiveTripCard({
	budgetAmount,
	budgetCurrency,
	readinessScore,
	title,
	tripId,
	tripWindow,
}: {
	budgetAmount?: number;
	budgetCurrency?: string;
	readinessScore: number;
	title: string;
	tripId: Id<"trips">;
	tripWindow: string;
}) {
	const readinessLabel =
		readinessScore > 0 ? `${readinessScore}% ready` : "Readiness open";

	return (
		<Surface
			className="gap-4 rounded-[30px] border border-border bg-surface p-5"
			style={activeTripCardStyle}
		>
			<View className="flex-row items-start gap-4">
				<View
					className="h-11 w-11 items-center justify-center rounded-full"
					style={primarySoftBackgroundStyle}
				>
					<Ionicons color="#0A84FF" name="navigate-outline" size={20} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						ACTIVE TRIP
					</Text>
					<Text.Heading numberOfLines={1} type="h4" weight="semibold">
						{title}
					</Text.Heading>
					<Text color="muted" numberOfLines={1} type="body-sm">
						{tripWindow}
					</Text>
				</View>
			</View>

			<View className="flex-row gap-3">
				<View className="flex-1 rounded-2xl bg-surface-secondary p-3">
					<Text color="muted" type="body-xs" weight="medium">
						Readiness
					</Text>
					<Text type="body-sm" weight="semibold">
						{readinessLabel}
					</Text>
				</View>
				<View className="flex-1 rounded-2xl bg-surface-secondary p-3">
					<Text color="muted" type="body-xs" weight="medium">
						Budget
					</Text>
					<Text numberOfLines={1} type="body-sm" weight="semibold">
						{formatBudget(budgetAmount, budgetCurrency)}
					</Text>
				</View>
			</View>

			<Link asChild href={VIYA_ROUTES.tripDashboard(tripId)}>
				<Button size="sm" variant="secondary">
					<Button.Label>View trip</Button.Label>
				</Button>
			</Link>
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
			<Surface className="min-h-40 gap-4 rounded-[28px] border border-border bg-surface p-4">
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

function CountrySuggestionCard({
	country,
	onPress,
}: {
	country: PreferenceCountrySuggestion;
	onPress: (prompt: string) => void;
}) {
	return (
		<Pressable
			accessibilityLabel={`Explore ${country.country}`}
			accessibilityRole="button"
			className="min-h-24 flex-row items-center gap-3 rounded-[24px] border border-border bg-surface p-4"
			onPress={() => onPress(country.prompt)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<View
				className="h-11 w-11 items-center justify-center rounded-full"
				style={{ backgroundColor: `${country.accent}18` }}
			>
				<Ionicons
					color={country.accent}
					name={country.icon as IconName}
					size={20}
				/>
			</View>
			<View className="min-w-0 flex-1 gap-1">
				<Text type="body" weight="semibold">
					{country.country}
				</Text>
				<Text color="muted" numberOfLines={1} type="body-sm">
					{country.detail}
				</Text>
			</View>
			<Text color="muted" type="body-xs" weight="semibold">
				{country.duration}
			</Text>
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
			className="flex-1 gap-3 rounded-[24px] border border-border bg-surface p-4"
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
		<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
			<View className="flex-row gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={primarySoftBackgroundStyle}
				>
					<Ionicons color="#0A84FF" name="sparkles-outline" size={19} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						VIYA PICKED FOR YOU
					</Text>
					<Text.Heading type="h5" weight="semibold">
						{suggestions.home.title}
					</Text.Heading>
					<Text.Paragraph color="muted" type="body-sm">
						{suggestions.home.subtitle}
					</Text.Paragraph>
				</View>
			</View>
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

			<Surface className="gap-4 rounded-[30px] border border-border bg-surface-secondary p-5">
				<SectionTitle
					subtitle="Countries weighted by your interests, pace, budget, and group style."
					title="Countries to consider"
				/>
				<View className="gap-3">
					{suggestions.countrySuggestions.map((country) => (
						<CountrySuggestionCard
							country={country}
							key={country.country}
							onPress={onSuggestionPress}
						/>
					))}
				</View>
			</Surface>

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
						params: { mode: "plan" },
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
				<Text.Heading type="h2" weight="semibold">
					{greeting}
				</Text.Heading>
				<View style={{ marginLeft: "auto" }}>
					<AccountAvatarButton size={44} />
				</View>
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
					gap: 16,
					paddingBottom: 112,
					paddingHorizontal: 16,
					paddingTop: 4,
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

function HomeLoadingState() {
	return (
		<StickyHomeShell greeting={getTimeGreeting()}>
			<Surface className="items-center gap-3 rounded-[30px] border border-border bg-surface p-8">
				<Spinner color="#0A84FF" />
				<Text color="muted" type="body-sm" weight="medium">
					Personalizing home
				</Text>
			</Surface>
		</StickyHomeShell>
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
			params: { mode: "plan", prompt },
			pathname: "/(app)/(tabs)/viya",
		});
	};
	const handlePlanWithViya = () => {
		setIsCreateSheetOpen(false);
		router.push({
			params: { mode: "plan" },
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
					onPlanWithViya={handlePlanWithViya}
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
			params: { mode: "plan", prompt },
			pathname: "/(app)/(tabs)/viya",
		});
	};
	const handlePlanWithViya = () => {
		setIsCreateSheetOpen(false);
		router.push({
			params: { mode: "plan" },
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
			onPlanWithViya={handlePlanWithViya}
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
				readinessScore={currentTrip.readinessScore}
				title={currentTrip.title}
				tripId={currentTrip._id}
				tripWindow={getTripWindow(currentTrip.startDate, currentTrip.endDate)}
			/>

			<PreferenceInsightCard
				onCreatePress={() => setIsCreateSheetOpen(true)}
				onPromptPress={handleSuggestionPress}
				suggestions={suggestions}
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
