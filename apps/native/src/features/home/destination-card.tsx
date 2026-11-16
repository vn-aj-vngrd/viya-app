import type { SeasonBadge } from "@viya-app/domain";
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

export interface DestinationCardItem {
	accessibilityLabel: string;
	detail: string;
	/** Key for the photo lookup. */
	imageKey: string;
	key: string;
	/** Short secondary line, for example length or entry rules. */
	meta: string;
	season?: SeasonBadge;
	title: string;
}

const seasonVisual = {
	avoid: { icon: "alert-circle-outline", tone: "danger" },
	best: { icon: "checkmark-circle-outline", tone: "success" },
	caution: { icon: "warning-outline", tone: "warning" },
	good: { icon: "partly-sunny-outline", tone: "secondary" },
} as const;

function SeasonLine({ season }: { season: SeasonBadge }) {
	const visual = seasonVisual[season.tone];

	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.xs,
			}}
		>
			<Icon name={visual.icon} size={14} tone={visual.tone} />
			<AppText numberOfLines={1} tone={visual.tone} variant="footnote">
				{season.label}
			</AppText>
		</View>
	);
}

/** Photo with the name and detail on the canvas below. No card behind text. */
export function DestinationCard({
	imageUrl,
	item,
	onPress,
}: {
	imageUrl?: string;
	item: DestinationCardItem;
	onPress: (key: string) => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={item.accessibilityLabel}
			accessibilityRole="button"
			haptic="light"
			onPress={() => onPress(item.key)}
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
					{item.title}
				</AppText>
				<AppText numberOfLines={1} tone="secondary" variant="subhead">
					{item.detail}
				</AppText>
				{item.season ? <SeasonLine season={item.season} /> : null}
				<AppText numberOfLines={1} tone="secondary" variant="footnote">
					{item.meta}
				</AppText>
			</View>
		</PressableScale>
	);
}
