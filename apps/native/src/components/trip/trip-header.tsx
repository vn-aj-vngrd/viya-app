import { Ionicons } from "@expo/vector-icons";
import type { Trip } from "@viya-app/domain";
import { Chip, Surface, Text, useThemeColor } from "heroui-native";
import { ImageBackground, View } from "react-native";

interface TripHeaderProps {
	trip: Trip;
}

export function TripHeader({ trip }: TripHeaderProps) {
	const linkColor = useThemeColor("link");

	return (
		<Surface className="overflow-hidden rounded-lg" variant="secondary">
			<ImageBackground
				className="min-h-56 justify-end bg-content2"
				imageStyle={{ opacity: 0.42 }}
				source={{ uri: trip.coverImageUrl }}
			>
				<View className="gap-3 p-5">
					<Chip size="sm" variant="secondary">
						<Chip.Label>{trip.status.toUpperCase()}</Chip.Label>
					</Chip>
					<View>
						<Text.Heading className="text-4xl" type="h1" weight="semibold">
							{trip.title}
						</Text.Heading>
						<View className="mt-2 flex-row items-center gap-2">
							<Ionicons color={linkColor} name="location" size={16} />
							<Text type="body">{trip.destination}</Text>
						</View>
					</View>
					<Text.Paragraph className="leading-6" color="muted" type="body-sm">
						{trip.summary}
					</Text.Paragraph>
				</View>
			</ImageBackground>
		</Surface>
	);
}
