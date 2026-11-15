import type { PreferenceCountrySuggestion } from "@viya-app/domain";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import {
	AppText,
	Icon,
	motion,
	PressableScale,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";

export const DESTINATION_CARD_WIDTH = 240;
export const DESTINATION_IMAGE_HEIGHT = 160;
const PLACEHOLDER_ICON_SIZE = 24;

/** Photo with the name and detail on the canvas below. No card behind text. */
export function DestinationCard({
	imageUrl,
	item,
	onPress,
}: {
	imageUrl?: string;
	item: Omit<PreferenceCountrySuggestion, "accent">;
	onPress: (prompt: string) => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={`Plan a ${item.duration} trip to ${item.country}`}
			accessibilityRole="button"
			haptic="light"
			onPress={() => onPress(item.prompt)}
			style={{ gap: spacing.sm, width: DESTINATION_CARD_WIDTH }}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.card,
					height: DESTINATION_IMAGE_HEIGHT,
					justifyContent: "center",
					overflow: "hidden",
				}}
			>
				<Icon
					name="image-outline"
					size={PLACEHOLDER_ICON_SIZE}
					tone="tertiary"
					weight="light"
				/>
				{imageUrl ? (
					<Image
						accessibilityIgnoresInvertColors={true}
						cachePolicy="memory-disk"
						contentFit="cover"
						source={{ uri: imageUrl }}
						style={StyleSheet.absoluteFill}
						transition={motion.duration.normal}
					/>
				) : null}
			</View>
			<View>
				<AppText numberOfLines={1} variant="headline">
					{item.country}
				</AppText>
				<AppText numberOfLines={1} tone="secondary" variant="subhead">
					{item.detail}
				</AppText>
				<AppText numberOfLines={1} tone="secondary" variant="footnote">
					{item.duration.replace("-", "–")}
				</AppText>
			</View>
		</PressableScale>
	);
}
