import { Ionicons } from "@expo/vector-icons";
import type { NextBestAction } from "@viya-app/domain";
import { Link } from "expo-router";
import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { VIYA_ROUTES } from "@/src/constants/routes";

interface NextBestActionCardProps {
	action: NextBestAction;
}

const targetRoute = {
	itinerary: VIYA_ROUTES.tripItinerary,
	moments: VIYA_ROUTES.tripMoments,
	readiness: VIYA_ROUTES.tripReadiness,
	risks: VIYA_ROUTES.tripRisks,
	travelMode: VIYA_ROUTES.tripTravelMode,
} as const;

export function NextBestActionCard({ action }: NextBestActionCardProps) {
	return (
		<Surface className="gap-4 rounded-lg p-4" variant="secondary">
			<View className="flex-row gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-lg bg-primary">
					<Ionicons color="white" name="flash" size={20} />
				</View>
				<View className="flex-1">
					<Text className="font-semibold text-muted text-xs uppercase">
						Next best action
					</Text>
					<Text className="mt-1 font-semibold text-foreground text-lg">
						{action.label}
					</Text>
					<Text className="mt-1 text-muted text-sm leading-5">
						{action.reason}
					</Text>
				</View>
			</View>
			<Link asChild href={targetRoute[action.target]}>
				<Button size="sm">
					<Button.Label>Open</Button.Label>
				</Button>
			</Link>
		</Surface>
	);
}
