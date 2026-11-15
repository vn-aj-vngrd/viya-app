import { Ionicons } from "@expo/vector-icons";
import type { PreferenceCountrySuggestion } from "@viya-app/domain";
import { Image } from "expo-image";
import { View } from "react-native";

import {
	AppText,
	Card,
	type IconName,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";

const imageTransitionMs = 320;
const COVER_HEIGHT = 128;
const CARD_WIDTH = 224;

export function CountrySuggestionCard({
	country,
	imageUrl,
	onPress,
}: {
	country: PreferenceCountrySuggestion;
	imageUrl?: string;
	onPress: (prompt: string) => void;
}) {
	const { palette } = useUITheme();

	return (
		<Card
			accessibilityLabel={`Explore ${country.country}`}
			onPress={() => onPress(country.prompt)}
			padding="none"
			style={{ width: CARD_WIDTH }}
		>
			<View style={{ height: COVER_HEIGHT, width: "100%" }}>
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.fill,
						bottom: 0,
						justifyContent: "center",
						left: 0,
						position: "absolute",
						right: 0,
						top: 0,
					}}
				>
					<Ionicons
						color={country.accent}
						name={country.icon as IconName}
						size={26}
					/>
				</View>
				{imageUrl ? (
					<Image
						accessibilityIgnoresInvertColors={true}
						cachePolicy="memory-disk"
						contentFit="cover"
						source={{ uri: imageUrl }}
						style={{ height: "100%", width: "100%" }}
						transition={imageTransitionMs}
					/>
				) : null}
			</View>
			<View style={{ gap: spacing.xs, padding: spacing.lg }}>
				<AppText bold={true} numberOfLines={1}>
					{country.country}
				</AppText>
				<AppText numberOfLines={2} tone="secondary" variant="subhead">
					{country.detail}
				</AppText>
				<View
					style={{
						alignSelf: "flex-start",
						backgroundColor: palette.fill,
						borderRadius: radius.pill,
						marginTop: spacing.xs,
						paddingHorizontal: spacing.md,
						paddingVertical: 4,
					}}
				>
					<AppText tone="secondary" variant="footnote">
						{country.duration}
					</AppText>
				</View>
			</View>
		</Card>
	);
}
