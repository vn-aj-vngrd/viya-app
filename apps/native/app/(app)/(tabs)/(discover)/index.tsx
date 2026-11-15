import { api } from "@viya-app/backend/convex/_generated/api";
import {
	getNextTrip,
	getPreferenceSuggestions,
	getTripCountdown,
	type PreferenceSuggestions,
} from "@viya-app/domain";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { View } from "react-native";

import {
	AppText,
	ListGroup,
	ListRow,
	PrimaryButton,
	ScreenShell,
	spacing,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { DestinationCarousel } from "@/src/features/home/destination-carousel";
import { DiscoverSection } from "@/src/features/home/discover-section";
import { DiscoverSkeleton } from "@/src/features/home/discover-skeleton";
import { philippineDestinations } from "@/src/features/home/philippine-destinations";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import {
	shouldShowDestinationLine,
	TripThumbnail,
} from "@/src/features/trips/trip-row";
import {
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

export default function DiscoverScreen() {
	const router = useRouter();
	const trips = useQuery(api.trips.listTrips);
	const preferences = useQuery(api.preferences.getCurrentPreferences);
	const suggestions = getPreferenceSuggestions(preferences ?? {});
	const philippineQueryUrls = useDestinationImages(
		philippineDestinations.map(
			(destination) => destination.imageQuery ?? destination.country
		)
	);
	const philippineImageUrls = Object.fromEntries(
		philippineDestinations.map((destination) => [
			destination.country,
			philippineQueryUrls[destination.imageQuery ?? destination.country],
		])
	);
	const countryImageUrls = useDestinationImages(
		suggestions.countrySuggestions.map((country) => country.country)
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
	const todayKey = toLocalDateKey();
	const nextTrip = isFirstRun ? null : getNextTrip(trips, todayKey);
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
						imageUrls={philippineImageUrls}
						items={philippineDestinations}
						onPress={askViya}
					/>
				</DiscoverSection>

				{suggestions.countrySuggestions.length > 0 ? (
					<DiscoverSection inset={false} title="Outside the Philippines">
						<DestinationCarousel
							imageUrls={countryImageUrls}
							items={suggestions.countrySuggestions}
							onPress={askViya}
						/>
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
			</View>
		</ScreenShell>
	);
}
