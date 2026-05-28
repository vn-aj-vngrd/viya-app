import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { Chip, Surface, Text } from "heroui-native";
import { View } from "react-native";

interface ReadinessCategoryCardProps {
	category: ReadinessCategory;
	highestPriority: Priority | null;
	openCount: number;
	score: number;
}

export function ReadinessCategoryCard({
	category,
	highestPriority,
	openCount,
	score,
}: ReadinessCategoryCardProps) {
	return (
		<Surface className="w-[47%] gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="flex-row justify-between gap-2">
				<Text className="flex-1" type="body-sm" weight="bold">
					{READINESS_CATEGORY_LABELS[category]}
				</Text>
				<Chip size="sm" variant="secondary">
					<Chip.Label>{score}%</Chip.Label>
				</Chip>
			</View>
			<View className="gap-1">
				<Text color="muted" type="body-xs">
					{openCount} open
				</Text>
				<Text color="muted" type="body-xs">
					{highestPriority ? PRIORITY_LABELS[highestPriority] : "Clear"}
				</Text>
			</View>
		</Surface>
	);
}
