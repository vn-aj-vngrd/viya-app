import { Ionicons } from "@expo/vector-icons";
import { Surface, Text } from "heroui-native";
import { View } from "react-native";

import { formatReadableDate } from "@/src/components/date/date-format-utils";

interface VaultPreviewCardProps {
	createdAt: number;
	fileName: string;
	kind: string;
	title: string;
}

export function VaultPreviewCard({
	createdAt,
	fileName,
	kind,
	title,
}: VaultPreviewCardProps) {
	const createdDateLabel = formatReadableDate(createdAt);

	return (
		<Surface className="rounded-lg p-4" variant="secondary">
			<View className="flex-row items-center gap-3">
				<View className="h-11 w-11 items-center justify-center rounded-lg bg-primary/15">
					<Ionicons color="#2563eb" name="document-attach" size={22} />
				</View>
				<View className="flex-1">
					<Text weight="semibold">{title}</Text>
					<Text className="mt-1" color="muted" type="body-xs">
						{fileName}
					</Text>
					<Text className="mt-1" color="muted" type="body-xs">
						{kind} · {createdDateLabel}
					</Text>
				</View>
			</View>
		</Surface>
	);
}
