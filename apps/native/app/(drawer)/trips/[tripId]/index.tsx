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

export default function TripDashboardScreen() {
	const readiness = calculateReadinessScore(palawanDemoTrip.readinessItems);
	const nextAction = getNextBestAction(palawanDemoTrip);
	const upcomingItems = getUpcomingItineraryItems(palawanDemoTrip, 3);
	const criticalRisk =
		getCriticalOpenRisks(palawanDemoTrip.risks)[0] ?? palawanDemoTrip.risks[0];

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<TripHeader trip={palawanDemoTrip.trip} />
				<View className="flex-row flex-wrap gap-2">
					<Link asChild href={VIYA_ROUTES.tripItinerary}>
						<Button size="sm" variant="secondary">
							<Button.Label>Itinerary</Button.Label>
						</Button>
					</Link>
					<Link asChild href={VIYA_ROUTES.tripReadiness}>
						<Button size="sm" variant="secondary">
							<Button.Label>Readiness</Button.Label>
						</Button>
					</Link>
					<Link asChild href={VIYA_ROUTES.tripRisks}>
						<Button size="sm" variant="secondary">
							<Button.Label>Risks</Button.Label>
						</Button>
					</Link>
					<Link asChild href={VIYA_ROUTES.tripVault}>
						<Button size="sm" variant="secondary">
							<Button.Label>Vault</Button.Label>
						</Button>
					</Link>
				</View>
				<NextBestActionCard action={nextAction} />
				<ReadinessScoreCard readiness={readiness} />
				<RiskAlertCard risk={criticalRisk} />
				<ItineraryPreview items={upcomingItems} />
				<Text className="text-muted text-xs leading-5">
					This dashboard is wired to shared domain models now. The next
					implementation pass can swap the demo source for Convex trip queries
					without reshaping the UI contracts.
				</Text>
			</View>
		</Container>
	);
}
