import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { VIYA_ROUTES } from "@/src/constants/routes";

interface TripEmptyScreenProps {
	icon: React.ComponentProps<typeof Ionicons>["name"];
	subtitle: string;
	title: string;
}

export function TripEmptyScreen({
	icon,
	subtitle,
	title,
}: TripEmptyScreenProps) {
	const router = useRouter();

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4">
				<View>
					<Text.Heading type="h2" weight="semibold">
						{title}
					</Text.Heading>
					<Text.Paragraph className="mt-1" color="muted" type="body-sm">
						{subtitle}
					</Text.Paragraph>
				</View>
				<EmptyState
					action={{
						label: "Plan with Viya",
						onPress: () => router.push(VIYA_ROUTES.viya),
						startContent: (
							<Ionicons color="#FFFFFF" name="sparkles" size={16} />
						),
						variant: "primary",
					}}
					description="This space fills in after Viya creates your first blueprint."
					icon={icon}
					title="Start a trip first"
				/>
			</View>
		</Container>
	);
}
