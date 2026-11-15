import type { ItineraryItem } from "@viya-app/domain";
import { View } from "react-native";
import {
	AppText,
	Card,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";

interface ItineraryPreviewProps {
	items: ItineraryItem[];
}

export function ItineraryPreview({ items }: ItineraryPreviewProps) {
	const { palette } = useUITheme();

	return (
		<Card>
			<View style={{ gap: spacing.lg }}>
				<View style={{ gap: 2 }}>
					<AppText
						accessibilityRole="header"
						tone="secondary"
						variant="eyebrow"
					>
						Upcoming itinerary
					</AppText>
					<AppText tone="secondary" variant="subhead">
						The first trip blocks Viya is watching.
					</AppText>
				</View>
				<View style={{ gap: spacing.md }}>
					{items.map((item) => (
						<View
							key={item.id}
							style={{ flexDirection: "row", gap: spacing.md }}
						>
							<View style={{ width: 56 }}>
								<AppText bold={true} variant="footnote">
									{item.startTime}
								</AppText>
								<AppText tone="tertiary" variant="footnote">
									{item.endTime}
								</AppText>
							</View>
							<View
								style={{
									borderLeftColor: palette.separator,
									borderLeftWidth: 2,
									borderRadius: radius.pill,
									flex: 1,
									gap: 2,
									paddingLeft: spacing.md,
								}}
							>
								<AppText variant="headline">{item.title}</AppText>
								<AppText tone="secondary" variant="subhead">
									{item.aiReason}
								</AppText>
							</View>
						</View>
					))}
				</View>
			</View>
		</Card>
	);
}
