import { Ionicons } from "@expo/vector-icons";
import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { NextBestAction } from "@viya-app/domain";
import { useRouter } from "expo-router";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
	AppText,
	Card,
	PrimaryButton,
	radius,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

interface NextBestActionCardProps {
	action: NextBestAction;
	tripId: Id<"trips">;
}

export function NextBestActionCard({
	action,
	tripId,
}: NextBestActionCardProps) {
	const router = useRouter();
	const { palette } = useUITheme();
	const targetRoute = {
		itinerary: VIYA_ROUTES.tripItinerary(tripId),
		moments: VIYA_ROUTES.tripMoments(tripId),
		readiness: VIYA_ROUTES.tripReadiness(tripId),
		risks: VIYA_ROUTES.tripRisks(tripId),
		travelMode: VIYA_ROUTES.tripTravelMode(tripId),
	} as const;

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card style={{ gap: 16 }}>
				<View style={{ flexDirection: "row", gap: 12 }}>
					<View
						style={{
							alignItems: "center",
							backgroundColor: palette.accent,
							borderRadius: radius.tile,
							height: 40,
							justifyContent: "center",
							width: 40,
						}}
					>
						<Ionicons color="#FFFFFF" name="flash" size={20} />
					</View>
					<View style={{ flex: 1, gap: 4 }}>
						<AppText tone="secondary" variant="eyebrow">
							Next best action
						</AppText>
						<AppText variant="headline">{action.label}</AppText>
						<AppText tone="secondary" variant="subhead">
							{action.reason}
						</AppText>
					</View>
				</View>
				<PrimaryButton
					label="Open"
					onPress={() => router.push(targetRoute[action.target])}
				/>
			</Card>
		</Animated.View>
	);
}
