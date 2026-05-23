import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { AccountAvatarButton } from "@/src/components/account/account-avatar-button";
import { EmptyState } from "@/src/components/empty-state";
import { VIYA_ROUTES } from "@/src/constants/routes";

export default function TripsScreen() {
	const router = useRouter();

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

				<EmptyState
					action={{
						label: "Plan a trip",
						onPress: () => router.push(VIYA_ROUTES.viya),
						startContent: <Ionicons color="#FFFFFF" name="add" size={17} />,
						variant: "primary",
					}}
					description="Ask Viya to turn your next idea into a trip blueprint."
					icon="map-outline"
					title="No trips yet"
				/>
			</View>
		</Container>
	);
}
