import {
	READINESS_CATEGORY_LABELS,
	type ReadinessScore,
} from "@viya-app/domain";
import { Surface } from "heroui-native";
import { Text, View } from "react-native";

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
	return (
		<Surface className="gap-4 rounded-lg p-4" variant="secondary">
			<View className="flex-row items-end justify-between">
				<View>
					<Text className="font-semibold text-muted text-xs uppercase">
						Readiness
					</Text>
					<Text className="mt-1 text-muted text-sm">{readiness.summary}</Text>
				</View>
				<Text className="font-semibold text-5xl text-foreground">
					{readiness.overallScore}
				</Text>
			</View>
			<View className="gap-3">
				{visibleCategories.map((category) => (
					<View className="gap-1" key={category}>
						<View className="flex-row justify-between">
							<Text className="text-foreground text-sm">
								{READINESS_CATEGORY_LABELS[category]}
							</Text>
							<Text className="font-semibold text-foreground text-sm">
								{readiness.categoryScores[category]}%
							</Text>
						</View>
						<View className="h-2 overflow-hidden rounded-full bg-content3">
							<View
								className="h-full rounded-full bg-primary"
								style={{ width: `${readiness.categoryScores[category]}%` }}
							/>
						</View>
					</View>
				))}
			</View>
		</Surface>
	);
}
