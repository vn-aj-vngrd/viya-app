import type { Ionicons } from "@expo/vector-icons";
import { Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";

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
					description="Add the first item manually to make this module part of the saved trip workspace."
					icon={icon}
					title="Ready for manual entry"
				/>
			</View>
		</Container>
	);
}
