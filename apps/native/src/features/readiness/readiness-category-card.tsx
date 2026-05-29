import {
	PRIORITY_LABELS,
	type Priority,
	READINESS_CATEGORY_LABELS,
	type ReadinessCategory,
} from "@viya-app/domain";
import { Surface, Text } from "heroui-native";
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
				<View className="rounded-full bg-surface-secondary px-2.5 py-1">
					<Text color="muted" type="body-xs" weight="semibold">
						{score}%
					</Text>
				</View>
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
