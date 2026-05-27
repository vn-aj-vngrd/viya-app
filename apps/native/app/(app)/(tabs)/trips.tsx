import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { Pressable, View } from "react-native";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import { EmptyState } from "@/src/components/empty-state";
import { VIYA_ROUTES } from "@/src/constants/routes";

function TripLoadingCard() {
	return (
		<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-5">
			<Text type="body-sm" weight="semibold">
				Loading trips
			</Text>
			<Text color="muted" type="body-sm">
				Checking your saved Viya plans.
			</Text>
		</Surface>
	);
}

function TripCard({
	onPress,
	trip,
}: {
	onPress: (trip: Doc<"trips">) => void;
	trip: Doc<"trips">;
}) {
	return (
		<Pressable
			accessibilityLabel={`Open ${trip.title}`}
			accessibilityRole="button"
			onPress={() => onPress(trip)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
				<View className="flex-row items-start gap-3">
					<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
						<Ionicons color="#0A84FF" name="map-outline" size={20} />
					</View>
					<View className="flex-1 gap-1">
						<Text type="body" weight="bold">
							{trip.title}
						</Text>
						<Text color="muted" type="body-sm">
							{trip.destination}
						</Text>
						<Text.Paragraph className="leading-5" color="muted" type="body-xs">
							{trip.summary}
						</Text.Paragraph>
					</View>
				</View>
				<View className="flex-row flex-wrap gap-2">
					<Text
						className="rounded-full bg-default px-3 py-1.5"
						color="muted"
						type="body-xs"
						weight="semibold"
					>
						{trip.status}
					</Text>
					<Text
						className="rounded-full bg-default px-3 py-1.5"
						color="muted"
						type="body-xs"
						weight="semibold"
					>
						{trip.budgetCurrency ?? "PHP"}{" "}
						{trip.budgetAmount?.toLocaleString() ?? "Budget TBD"}
					</Text>
				</View>
			</Surface>
		</Pressable>
	);
}

export default function TripsScreen() {
	const router = useRouter();
	const trips = useQuery(api.trips.listTrips);
	const realTrips = trips?.filter((trip) => !trip.isDemo) ?? [];
	const handlePlanTripPress = () => router.push(VIYA_ROUTES.viya);
	const handleTripPress = (trip: Doc<"trips">) => {
		router.push({
			params: { tripId: trip._id },
			pathname: "/(app)/trips/[tripId]",
		});
	};
	const content = (() => {
		if (trips === undefined) {
			return <TripLoadingCard />;
		}

		if (realTrips.length > 0) {
			return (
				<View className="gap-3">
					{realTrips.map((trip) => (
						<TripCard key={trip._id} onPress={handleTripPress} trip={trip} />
					))}
					<Button
						className="self-start"
						onPress={handlePlanTripPress}
						size="sm"
						variant="secondary"
					>
						<Ionicons color="#18181B" name="add" size={16} />
						<Button.Label>Plan another trip</Button.Label>
					</Button>
				</View>
			);
		}

		return (
			<EmptyState
				action={{
					label: "Plan a trip",
					onPress: handlePlanTripPress,
					startContent: <Ionicons color="#FFFFFF" name="add" size={17} />,
					variant: "primary",
				}}
				description="Ask Viya to turn your next idea into a trip blueprint."
				icon="map-outline"
				title="No trips yet"
			/>
		);
	})();

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4" style={{ alignSelf: "stretch" }}>
				<View
					className="flex-row items-center gap-4"
					style={{ alignSelf: "stretch" }}
				>
					<Text.Heading type="h2" weight="semibold">
						Trips
					</Text.Heading>
					<View style={{ marginLeft: "auto" }}>
						<AccountAvatarButton size={44} />
					</View>
				</View>

				{content}
			</View>
		</Container>
	);
}
