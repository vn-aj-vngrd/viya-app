import { Ionicons } from "@expo/vector-icons";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { formatReadableDate } from "@/src/components/date/date-format-utils";

interface VaultPreviewCardProps {
	createdAt: number;
	fileName: string;
	kind: string;
	linkedEntityLabel?: string;
	onDelete?: () => void;
	onEdit?: () => void;
	title: string;
}

export function VaultPreviewCard({
	createdAt,
	fileName,
	kind,
	linkedEntityLabel,
	onDelete,
	onEdit,
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
					{linkedEntityLabel ? (
						<Text className="mt-1" color="muted" type="body-xs">
							Linked to {linkedEntityLabel}
						</Text>
					) : null}
				</View>
			</View>
			{onDelete || onEdit ? (
				<View className="mt-3 flex-row gap-2">
					{onEdit ? (
						<Button
							className="flex-1"
							onPress={onEdit}
							size="sm"
							variant="secondary"
						>
							<Button.Label>Edit</Button.Label>
						</Button>
					) : null}
					{onDelete ? (
						<Button
							className="flex-1"
							onPress={onDelete}
							size="sm"
							variant="tertiary"
						>
							<Button.Label>Delete</Button.Label>
						</Button>
					) : null}
				</View>
			) : null}
		</Surface>
	);
}
