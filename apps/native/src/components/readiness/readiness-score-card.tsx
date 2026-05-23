import {
	READINESS_CATEGORY_LABELS,
	type ReadinessScore,
} from "@viya-app/domain";
import { Surface, Text } from "heroui-native";
import { View } from "react-native";

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
					<Text
						className="uppercase"
						color="muted"
						type="body-xs"
						weight="semibold"
					>
						Readiness
					</Text>
					<Text.Paragraph className="mt-1" color="muted" type="body-sm">
						{readiness.summary}
					</Text.Paragraph>
				</View>
				<Text.Heading className="text-5xl" type="h1" weight="semibold">
					{readiness.overallScore}
				</Text.Heading>
			</View>
			<View className="gap-3">
				{visibleCategories.map((category) => (
					<View className="gap-1" key={category}>
						<View className="flex-row justify-between">
							<Text type="body-sm">{READINESS_CATEGORY_LABELS[category]}</Text>
							<Text type="body-sm" weight="semibold">
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
