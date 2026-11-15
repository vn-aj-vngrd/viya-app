import {
	READINESS_CATEGORY_LABELS,
	type ReadinessScore,
} from "@viya-app/domain";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AppText, Card, radius, useUITheme } from "@/src/components/ui";

interface ReadinessScoreCardProps {
	readiness: ReadinessScore;
}

const visibleCategories = [
	"documents",
	"bookings",
	"transport",
	"weather",
] as const;

export function ReadinessScoreCard({ readiness }: ReadinessScoreCardProps) {
	const { palette } = useUITheme();

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card style={{ gap: 16 }}>
				<View
					style={{
						alignItems: "flex-end",
						flexDirection: "row",
						gap: 12,
						justifyContent: "space-between",
					}}
				>
					<View style={{ flex: 1, gap: 4 }}>
						<AppText tone="secondary" variant="eyebrow">
							Readiness
						</AppText>
						<AppText tone="secondary" variant="subhead">
							{readiness.summary}
						</AppText>
					</View>
					<AppText variant="largeTitle">{readiness.overallScore}</AppText>
				</View>
				<View style={{ gap: 12 }}>
					{visibleCategories.map((category) => {
						const score = readiness.categoryScores[category];

						return (
							<View key={category} style={{ gap: 4 }}>
								<View
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
									}}
								>
									<AppText variant="subhead">
										{READINESS_CATEGORY_LABELS[category]}
									</AppText>
									<AppText bold variant="subhead">
										{score}%
									</AppText>
								</View>
								<View
									accessibilityRole="progressbar"
									accessibilityValue={{ max: 100, min: 0, now: score }}
									style={{
										backgroundColor: palette.fill,
										borderRadius: radius.pill,
										height: 6,
										overflow: "hidden",
									}}
								>
									<View
										style={{
											backgroundColor: palette.accent,
											borderRadius: radius.pill,
											height: "100%",
											width: `${score}%`,
										}}
									/>
								</View>
							</View>
						);
					})}
				</View>
			</Card>
		</Animated.View>
	);
}
