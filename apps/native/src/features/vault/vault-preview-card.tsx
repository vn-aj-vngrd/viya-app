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

const vaultKindMeta: Record<
	string,
	{
		accent: string;
		backgroundColor: string;
		icon: keyof typeof Ionicons.glyphMap;
	}
> = {
	booking: {
		accent: "#FF9F0A",
		backgroundColor: "rgba(255, 159, 10, 0.12)",
		icon: "ticket-outline",
	},
	document: {
		accent: "#0A84FF",
		backgroundColor: "rgba(10, 132, 255, 0.1)",
		icon: "document-outline",
	},
	momentPhoto: {
		accent: "#AF52DE",
		backgroundColor: "rgba(175, 82, 222, 0.12)",
		icon: "images-outline",
	},
	receipt: {
		accent: "#34C759",
		backgroundColor: "rgba(52, 199, 89, 0.12)",
		icon: "receipt-outline",
	},
};

const formatVaultKindLabel = (value: string) =>
	value
		.replaceAll("_", " ")
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

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
	const kindMeta = vaultKindMeta[kind] ?? {
		accent: "#6B7280",
		backgroundColor: "rgba(107, 114, 128, 0.12)",
		icon: "document-attach-outline" as const,
	};

	return (
		<Surface
			className="gap-3 rounded-[26px] border border-border bg-surface p-4"
			variant="secondary"
		>
			<View className="flex-row items-start gap-3">
				<View
					className="h-11 w-11 items-center justify-center rounded-2xl"
					style={{ backgroundColor: kindMeta.backgroundColor }}
				>
					<Ionicons color={kindMeta.accent} name={kindMeta.icon} size={21} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<View className="flex-row items-start justify-between gap-3">
						<View className="min-w-0 flex-1">
							<Text numberOfLines={1} weight="semibold">
								{title}
							</Text>
							<Text color="muted" numberOfLines={1} type="body-xs">
								{fileName}
							</Text>
						</View>
						<Text color="muted" type="body-xs" weight="semibold">
							{formatVaultKindLabel(kind)}
						</Text>
					</View>
					<Text color="muted" type="body-xs">
						{createdDateLabel}
					</Text>
					{linkedEntityLabel ? (
						<Text color="muted" numberOfLines={1} type="body-xs">
							Linked to {linkedEntityLabel}
						</Text>
					) : null}
				</View>
			</View>
			{canOpenFile || linkedEntityHref || onDelete || onEdit ? (
				<View className="flex-row flex-wrap gap-2">
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
						<Button onPress={onEdit} size="sm" variant="secondary">
							<Ionicons color="#0A84FF" name="create-outline" size={16} />
							<Button.Label>Edit</Button.Label>
						</Button>
					) : null}
					{onDelete ? (
						<Button onPress={onDelete} size="sm" variant="tertiary">
							<Ionicons color="#6B7280" name="trash-outline" size={16} />
							<Button.Label>Delete</Button.Label>
						</Button>
					) : null}
				</View>
			) : null}
		</Surface>
	);
}
