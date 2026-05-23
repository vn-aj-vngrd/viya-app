import { palawanDemoTrip } from "@viya-app/domain";
import { Link } from "expo-router";
import { Button, Chip, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { VIYA_ROUTES } from "@/src/constants/routes";

export default function TripsScreen() {
	const { trip } = palawanDemoTrip;

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">Trips</Text>
					<Text className="mt-1 text-muted text-sm">
						Active planning spaces and demo data.
					</Text>
				</View>
				<Surface className="gap-4 rounded-lg p-4" variant="secondary">
					<View className="flex-row items-start justify-between gap-3">
						<View className="flex-1">
							<Text className="font-semibold text-foreground text-xl">
								{trip.title}
							</Text>
							<Text className="mt-1 text-muted text-sm">
								{trip.destination}
							</Text>
							<Text className="mt-3 text-muted text-sm leading-5">
								{trip.summary}
							</Text>
						</View>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{trip.readinessScore}%</Chip.Label>
						</Chip>
					</View>
					<View className="flex-row gap-3">
						<Link asChild href={VIYA_ROUTES.tripDashboard}>
							<Button className="flex-1" size="sm">
								<Button.Label>Dashboard</Button.Label>
							</Button>
						</Link>
						<Link asChild href={VIYA_ROUTES.tripVault}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Button.Label>Vault</Button.Label>
							</Button>
						</Link>
					</View>
				</Surface>
			</View>
		</Container>
	);
}
