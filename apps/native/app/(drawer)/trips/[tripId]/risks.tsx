import { palawanDemoTrip } from "@viya-app/domain";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { RiskAlertCard } from "@/src/components/risk/risk-alert-card";

export default function TripRisksScreen() {
	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">Risks</Text>
					<Text className="mt-1 text-muted text-sm">
						AI-detected issues that can affect the trip.
					</Text>
				</View>
				{palawanDemoTrip.risks.map((risk) => (
					<RiskAlertCard key={risk.id} risk={risk} />
				))}
			</View>
		</Container>
	);
}
