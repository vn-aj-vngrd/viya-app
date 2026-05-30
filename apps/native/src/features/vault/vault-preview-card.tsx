import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Button, Menu, Text } from "heroui-native";
import { Pressable, View } from "react-native";

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
		icon: keyof typeof Ionicons.glyphMap;
	}
> = {
	booking: { accent: "#FF9F0A", icon: "ticket-outline" },
	document: { accent: "#0A84FF", icon: "document-outline" },
	momentPhoto: { accent: "#AF52DE", icon: "images-outline" },
	receipt: { accent: "#34C759", icon: "receipt-outline" },
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
		icon: "document-attach-outline" as const,
	};
	const hasMenu = Boolean(onEdit || onDelete);

	return (
		<View className="gap-3 rounded-[26px] border border-border bg-surface p-4">
			<View className="flex-row items-start gap-3">
				<View className="h-11 w-11 items-center justify-center rounded-2xl bg-surface-secondary">
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
				{hasMenu ? (
					<Menu>
						<Menu.Trigger asChild={true}>
							<Pressable
								accessibilityLabel="File options"
								accessibilityRole="button"
								className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary"
								style={({ pressed }) => ({
									transform: [{ scale: pressed ? 0.94 : 1 }],
								})}
							>
								<Ionicons
									color="#71717A"
									name="ellipsis-horizontal"
									size={17}
								/>
							</Pressable>
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Overlay />
							<Menu.Content
								align="end"
								className="rounded-[24px] border border-border bg-surface p-2"
								offset={8}
								placement="bottom"
								presentation="popover"
								width={200}
							>
								{onEdit ? (
									<Menu.Item
										accessibilityLabel="Edit file"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										onPress={onEdit}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
											<Ionicons
												color="#0A84FF"
												name="create-outline"
												size={16}
											/>
										</View>
										<Menu.ItemTitle className="font-semibold text-sm">
											Edit
										</Menu.ItemTitle>
									</Menu.Item>
								) : null}
								{onEdit && onDelete ? (
									<View className="mx-2 my-1 h-px bg-border" />
								) : null}
								{onDelete ? (
									<Menu.Item
										accessibilityLabel="Delete file"
										className="flex-row items-center gap-3 rounded-[18px] p-2.5"
										isAnimatedStyleActive={false}
										onPress={onDelete}
									>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-danger/10">
											<Ionicons
												color="#FF3B30"
												name="trash-outline"
												size={16}
											/>
										</View>
										<Menu.ItemTitle className="font-semibold text-danger text-sm">
											Delete
										</Menu.ItemTitle>
									</Menu.Item>
								) : null}
							</Menu.Content>
						</Menu.Portal>
					</Menu>
				) : null}
			</View>
			{canOpenFile || linkedEntityHref ? (
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
				</View>
			) : null}
		</View>
	);
}
