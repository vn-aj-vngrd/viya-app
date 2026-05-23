import { Ionicons } from "@expo/vector-icons";
import type { Trip } from "@viya-app/domain";
import { Chip, Surface, useThemeColor } from "heroui-native";
import { ImageBackground, Text, View } from "react-native";

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
						<Text className="font-semibold text-4xl text-foreground">
							{trip.title}
						</Text>
						<View className="mt-2 flex-row items-center gap-2">
							<Ionicons color={linkColor} name="location" size={16} />
							<Text className="text-base text-foreground">
								{trip.destination}
							</Text>
						</View>
					</View>
					<Text className="text-muted text-sm leading-6">{trip.summary}</Text>
				</View>
			</ImageBackground>
		</Surface>
	);
}
