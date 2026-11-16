import { api } from "@viya-app/backend/convex/_generated/api";
import {
	buildPhilippinePlanPrompt,
	type DestinationSuggestion,
	type GroupType,
	getNextTrip,
	getPreferenceSuggestions,
	getTripCountdown,
	type PreferenceSuggestions,
	suggestForTrip,
} from "@viya-app/domain";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import {
	AppText,
	Icon,
	ListGroup,
	ListRow,
	PrimaryButton,
	ScreenShell,
	spacing,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import type { DestinationCardItem } from "@/src/features/home/destination-card";
import { DestinationCarousel } from "@/src/features/home/destination-carousel";
import { DestinationPlanSheet } from "@/src/features/home/destination-plan-sheet";
import { DiscoverSection } from "@/src/features/home/discover-section";
import { DiscoverSkeleton } from "@/src/features/home/discover-skeleton";
import { getDestinationImageKey } from "@/src/features/home/philippine-destinations";
import { getTripIdeas } from "@/src/features/home/trip-ideas";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import {
	shouldShowDestinationLine,
	TripThumbnail,
} from "@/src/features/trips/trip-row";
import {
	formatCount,
	formatTripCountdown,
	formatTripRange,
	toLocalDateKey,
} from "@/src/lib/format";

const MAX_IDEA_ROWS = 4;
const FALLBACK_PROMPT = "Help me plan a trip that fits my travel preferences.";
const TITLE = "Discover";

function FirstRunBlock({
	onPlan,
	suggestions,
}: {
	onPlan: (prompt: string) => void;
	suggestions: PreferenceSuggestions;
}) {
	const primaryPrompt = suggestions.prompts[0]?.prompt ?? FALLBACK_PROMPT;

	return (
		<View style={{ gap: spacing.lg, paddingHorizontal: spacing.screen }}>
			<View style={{ gap: spacing.xs }}>
				<AppText accessibilityRole="header" variant="heading">
					{suggestions.home.title}
				</AppText>
				<AppText tone="secondary" variant="callout">
					{suggestions.home.subtitle}
				</AppText>
			</View>
			<PrimaryButton
				icon="sparkles"
				label="Plan a trip"
				onPress={() => onPlan(primaryPrompt)}
			/>
		</View>
	);
}

const toPhilippineCard = (
	suggestion: DestinationSuggestion
): DestinationCardItem => ({
	accessibilityLabel: `${suggestion.destination.name}, ${suggestion.badge.label}. ${suggestion.headline}. Plan a trip`,
	detail: suggestion.headline,
	imageKey: getDestinationImageKey(suggestion.destination),
	key: suggestion.destination.id,
	meta: `${formatCount(suggestion.suggestedWindow.days, "day")} · ${suggestion.destination.region}`,
	season: suggestion.badge,
	title: suggestion.destination.name,
});

export default function DiscoverScreen() {
	const router = useRouter();
	const trips = useQuery(api.trips.listTrips);
	const preferences = useQuery(api.preferences.getCurrentPreferences);
	const todayKey = toLocalDateKey();
	const [selected, setSelected] = useState<DestinationSuggestion | null>(null);
	const suggestions = useMemo(
		() => getPreferenceSuggestions(preferences ?? {}, { today: todayKey }),
		[preferences, todayKey]
	);
	const philippineCards = useMemo(
		() => suggestions.philippineSuggestions.map(toPhilippineCard),
		[suggestions.philippineSuggestions]
	);
	const nextTrip = useMemo(
		() =>
			trips && trips.filter((trip) => !trip.isDemo).length > 0
				? getNextTrip(trips, todayKey)
				: null,
		[trips, todayKey]
	);
	const tripAware = useMemo(
		() =>
			nextTrip
				? suggestForTrip({
						budgetAmount: nextTrip.budgetAmount,
						destination: nextTrip.destination,
						endDate: nextTrip.endDate,
						group: nextTrip.groupType as GroupType,
						preferences: preferences ?? undefined,
						startDate: nextTrip.startDate,
						today: todayKey,
						travelerCount: nextTrip.travelerCount,
					})
				: null,
		[nextTrip, preferences, todayKey]
	);
	const philippineQueryUrls = useDestinationImages(
		philippineCards.map((card) => card.imageKey)
	);
	const countryCards: DestinationCardItem[] =
		suggestions.countrySuggestions.map((country) => ({
			accessibilityLabel: `Plan a ${country.duration} trip to ${country.country}`,
			detail: country.detail,
			imageKey: country.country,
			key: country.country,
			meta: [country.duration.replace("-", "–"), country.visa?.label]
				.filter(Boolean)
				.join(" · "),
			title: country.country,
		}));
	const countryImageUrls = useDestinationImages(
		countryCards.map((card) => card.imageKey)
	);

	const askViya = (prompt: string) => {
		router.push({
			params: { fromTab: "index", prompt },
			pathname: VIYA_ROUTES.ai,
		});
	};

	if (trips === undefined || preferences === undefined) {
		return (
			<ScreenShell inset={false} title={TITLE} titleMode="large">
				<DiscoverSkeleton />
			</ScreenShell>
		);
	}

	const isFirstRun = trips.filter((trip) => !trip.isDemo).length === 0;
	const promptById = new Map(
		suggestions.philippineSuggestions.map((item) => [
			item.destination.id,
			item.prompt,
		])
	);
	const { alternatives, riskNote, shouldWarn } = getTripIdeas(tripAware);

	const planTrip = (suggestion: DestinationSuggestion) => {
		setSelected(null);
		router.push({
			params: {
				budgetAmount: String(suggestion.estimate.totalPhp),
				destination: `${suggestion.destination.name}, Philippines`,
				endDate: suggestion.suggestedWindow.endDate,
				startDate: suggestion.suggestedWindow.startDate,
			},
			pathname: VIYA_ROUTES.newTrip,
		});
	};
	const askAboutDestination = (suggestion: DestinationSuggestion) => {
		setSelected(null);
		askViya(
			promptById.get(suggestion.destination.id) ??
				buildPhilippinePlanPrompt(suggestion)
		);
	};
	const ideas = suggestions.exploreIdeas.slice(0, MAX_IDEA_ROWS);

	return (
		<ScreenShell
			actions={[
				{
					icon: "add",
					items: [
						{
							icon: "sparkles",
							key: "plan",
							onPress: () => askViya("Help me plan a trip"),
							title: "Plan with Viya",
						},
						{
							icon: "add",
							key: "new",
							onPress: () => router.push(VIYA_ROUTES.newTrip),
							title: "New trip",
						},
					],
					key: "add",
					label: "Add",
					type: "menu",
				},
			]}
			inset={false}
			title={TITLE}
			titleMode="large"
		>
			<View style={{ gap: spacing["2xl"] }}>
				{isFirstRun ? (
					<FirstRunBlock onPlan={askViya} suggestions={suggestions} />
				) : null}

				{nextTrip ? (
					<View style={{ paddingHorizontal: spacing.screen }}>
						<ListGroup header="Your next trip">
							<ListRow
								accessibilityLabel={`Open ${nextTrip.title}`}
								leading={<TripThumbnail trip={nextTrip} />}
								onPress={() =>
									router.push(VIYA_ROUTES.tripDashboard(nextTrip._id))
								}
								subtitle={[
									shouldShowDestinationLine(
										nextTrip.title,
										nextTrip.destination
									)
										? nextTrip.destination
										: null,
									formatTripRange(nextTrip.startDate, nextTrip.endDate),
								]
									.filter(Boolean)
									.join(" · ")}
								subtitleLines={1}
								title={nextTrip.title}
								titleLines={1}
								value={formatTripCountdown(
									getTripCountdown(nextTrip, todayKey)
								)}
							/>
						</ListGroup>
					</View>
				) : null}

				<DiscoverSection inset={false} title="In the Philippines">
					<DestinationCarousel
						imageUrls={philippineQueryUrls}
						items={philippineCards}
						onPress={(id) =>
							setSelected(
								suggestions.philippineSuggestions.find(
									(item) => item.destination.id === id
								) ?? null
							)
						}
					/>
				</DiscoverSection>

				{nextTrip && (shouldWarn || alternatives.length > 0) ? (
					<DiscoverSection title={`For your trip to ${nextTrip.destination}`}>
						<ListGroup>
							{shouldWarn && riskNote ? (
								<ListRow
									accessibilityLabel={`Ask Viya about the season for ${nextTrip.destination}`}
									leading={
										<Icon
											name="warning-outline"
											tone={
												riskNote.badge.tone === "avoid" ? "danger" : "warning"
											}
										/>
									}
									onPress={() =>
										askViya(
											`Check the weather and typhoon risk for my trip to ${nextTrip.destination} from ${nextTrip.startDate} to ${nextTrip.endDate} and suggest a backup plan.`
										)
									}
									subtitle={riskNote.advice[0] ?? riskNote.badge.label}
									subtitleLines={2}
									title={riskNote.headline}
									titleLines={2}
								/>
							) : null}
							{alternatives.map((item) => (
								<ListRow
									accessibilityLabel={`${item.destination.name}: ${item.headline}. Open`}
									key={item.destination.id}
									onPress={() => setSelected(item)}
									subtitle={`${item.badge.label}. ${item.headline}`}
									subtitleLines={2}
									title={`Consider ${item.destination.name} instead`}
								/>
							))}
						</ListGroup>
					</DiscoverSection>
				) : null}

				{ideas.length > 0 ? (
					<DiscoverSection title="Trip ideas">
						<ListGroup>
							{ideas.map((idea) => (
								<ListRow
									accessibilityLabel={`Ask Viya about ${idea.title}`}
									key={idea.title}
									onPress={() => askViya(idea.prompt)}
									subtitle={idea.subtitle}
									subtitleLines={2}
									title={idea.title}
								/>
							))}
						</ListGroup>
					</DiscoverSection>
				) : null}

				{suggestions.countrySuggestions.length > 0 ? (
					<DiscoverSection inset={false} title="Outside the Philippines">
						<DestinationCarousel
							imageUrls={countryImageUrls}
							items={countryCards}
							onPress={(key) => {
								const country = suggestions.countrySuggestions.find(
									(item) => item.country === key
								);
								if (country) {
									askViya(country.prompt);
								}
							}}
						/>
					</DiscoverSection>
				) : null}
			</View>
			<DestinationPlanSheet
				onAskViya={askAboutDestination}
				onClose={() => setSelected(null)}
				onPlan={planTrip}
				suggestion={selected}
			/>
		</ScreenShell>
	);
}
