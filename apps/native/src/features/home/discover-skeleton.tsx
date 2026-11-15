import { View } from "react-native";

import { radius, Skeleton, spacing } from "@/src/components/ui";
import {
	DESTINATION_CARD_WIDTH,
	DESTINATION_IMAGE_HEIGHT,
} from "./destination-card";

const TITLE_WIDTH = 140;
const TITLE_HEIGHT = 22;
const CAPTION_WIDTH = 120;
const CAPTION_HEIGHT = 16;
const SKELETON_CARDS = ["first", "second"] as const;

export function DiscoverSkeleton() {
	return (
		<View
			accessibilityLabel="Loading Discover"
			accessibilityRole="progressbar"
			style={{ gap: spacing["2xl"] }}
		>
			<View style={{ gap: spacing.md }}>
				<View style={{ paddingHorizontal: spacing.screen }}>
					<Skeleton height={TITLE_HEIGHT} width={TITLE_WIDTH} />
				</View>
				<View
					style={{
						flexDirection: "row",
						gap: spacing.md,
						overflow: "hidden",
						paddingHorizontal: spacing.screen,
					}}
				>
					{SKELETON_CARDS.map((card) => (
						<View key={card} style={{ gap: spacing.sm }}>
							<Skeleton
								height={DESTINATION_IMAGE_HEIGHT}
								radius={radius.card}
								width={DESTINATION_CARD_WIDTH}
							/>
							<Skeleton height={CAPTION_HEIGHT} width={CAPTION_WIDTH} />
						</View>
					))}
				</View>
			</View>
		</View>
	);
}
