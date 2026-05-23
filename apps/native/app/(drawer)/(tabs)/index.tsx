import {
	calculateReadinessScore,
	getCriticalOpenRisks,
	getNextBestAction,
	getUpcomingItineraryItems,
	palawanDemoTrip,
} from "@viya-app/domain";
import { Link } from "expo-router";
import { Button } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { ItineraryPreview } from "@/src/components/itinerary/itinerary-preview";
import { ReadinessScoreCard } from "@/src/components/readiness/readiness-score-card";
import { RiskAlertCard } from "@/src/components/risk/risk-alert-card";
import { NextBestActionCard } from "@/src/components/trip/next-best-action-card";
import { TripHeader } from "@/src/components/trip/trip-header";
import { VIYA_ROUTES } from "@/src/constants/routes";

export default function HomeScreen() {
	const readiness = calculateReadinessScore(palawanDemoTrip.readinessItems);
	const nextAction = getNextBestAction(palawanDemoTrip);
	const upcomingItems = getUpcomingItineraryItems(palawanDemoTrip, 3);
	const criticalRisk =
		getCriticalOpenRisks(palawanDemoTrip.risks)[0] ?? palawanDemoTrip.risks[0];

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<TripHeader trip={palawanDemoTrip.trip} />
				<NextBestActionCard action={nextAction} />
				<ReadinessScoreCard readiness={readiness} />
				<RiskAlertCard risk={criticalRisk} />
				<ItineraryPreview items={upcomingItems} />
				<View className="gap-3 rounded-lg border border-border bg-content1 p-4">
					<Text className="font-semibold text-foreground text-lg">
						Core surfaces are ready
					</Text>
					<Text className="text-muted text-sm leading-5">
						Trips, readiness, risk, itinerary, AI chat, and Vault entry points
						are established for the MVP foundation.
					</Text>
					<Link asChild href={VIYA_ROUTES.tripDashboard}>
						<Button size="sm">
							<Button.Label>Open trip dashboard</Button.Label>
						</Button>
					</Link>
				</View>
			</View>
		</Container>
	);
}
