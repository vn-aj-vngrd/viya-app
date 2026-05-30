import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { formatReadableDate } from "@/src/components/date/date-format-utils";

interface VaultPreviewCardProps {
	createdAt: number;
	fileName: string;
	kind: string;
	linkedEntityHref?: Href | null;
	linkedEntityLabel?: string;
	onDelete?: () => void;
	onEdit?: () => void;
	onOpenFile?: () => void;
	title: string;
	url?: string | null;
}

export function VaultPreviewCard({
	createdAt,
	fileName,
	kind,
	linkedEntityHref,
	linkedEntityLabel,
	onDelete,
	onEdit,
	onOpenFile,
	title,
	url,
}: VaultPreviewCardProps) {
	const createdDateLabel = formatReadableDate(createdAt);
	const canOpenFile = Boolean(url && onOpenFile);

	return (
		<Surface
			className="gap-3 rounded-[24px] border border-border bg-surface p-4"
			variant="secondary"
		>
			<View className="flex-row items-center gap-3">
				<View
					className="h-11 w-11 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(175, 82, 222, 0.12)" }}
				>
					<Ionicons color="#AF52DE" name="document-attach" size={22} />
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
			{canOpenFile || linkedEntityHref || onDelete || onEdit ? (
				<View className="mt-3 flex-row flex-wrap gap-2">
					{canOpenFile ? (
						<Button
							className="flex-1"
							onPress={onOpenFile}
							size="sm"
							variant="primary"
						>
							<Ionicons color="#FFFFFF" name="open-outline" size={16} />
							<Button.Label>Open file</Button.Label>
						</Button>
					) : null}
					{linkedEntityHref ? (
						<Link asChild href={linkedEntityHref}>
							<Button className="flex-1" size="sm" variant="secondary">
								<Ionicons color="#0A84FF" name="git-branch-outline" size={16} />
								<Button.Label>Open linked item</Button.Label>
							</Button>
						</Link>
					) : null}
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
