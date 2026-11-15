import { Ionicons } from "@expo/vector-icons";
import type { Trip } from "@viya-app/domain";
import { ImageBackground, View } from "react-native";

import { AppText, Chip, radius, useUITheme } from "@/src/components/ui";

interface TripHeaderProps {
	trip: Trip;
}

export function TripHeader({ trip }: TripHeaderProps) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.surface,
				borderRadius: radius.card,
				overflow: "hidden",
			}}
		>
			<ImageBackground
				imageStyle={{ opacity: 0.42 }}
				source={{ uri: trip.coverImageUrl }}
				style={{
					backgroundColor: palette.fill,
					justifyContent: "flex-end",
					minHeight: 224,
				}}
			>
				<View style={{ gap: 12, padding: 20 }}>
					<Chip label={trip.status.toUpperCase()} />
					<View style={{ gap: 8 }}>
						<AppText variant="title">{trip.title}</AppText>
						<View
							style={{ alignItems: "center", flexDirection: "row", gap: 8 }}
						>
							<Ionicons color={palette.accent} name="location" size={16} />
							<AppText variant="callout">{trip.destination}</AppText>
						</View>
					</View>
					<AppText tone="secondary" variant="subhead">
						{trip.summary}
					</AppText>
				</View>
			</ImageBackground>
		</View>
	);
}
