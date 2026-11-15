import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import { Menu } from "heroui-native";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { formatReadableDate } from "@/src/components/date/date-format-utils";
import {
	AppText,
	Card,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";

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

const vaultKindIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
	booking: "ticket-outline",
	document: "document-outline",
	momentPhoto: "images-outline",
	receipt: "receipt-outline",
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
	const { palette } = useUITheme();
	const createdDateLabel = formatReadableDate(createdAt);
	const canOpenFile = Boolean(url && onOpenFile);
	const icon = vaultKindIcons[kind] ?? "document-attach-outline";
	const hasMenu = Boolean(onEdit || onDelete);

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card padding="md">
				<View style={{ gap: spacing.md }}>
					<View
						style={{
							alignItems: "flex-start",
							flexDirection: "row",
							gap: spacing.md,
						}}
					>
						<View
							style={{
								alignItems: "center",
								backgroundColor: palette.fill,
								borderRadius: radius.tile,
								height: 44,
								justifyContent: "center",
								width: 44,
							}}
						>
							<Ionicons color={palette.accent} name={icon} size={21} />
						</View>
						<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
							<AppText numberOfLines={1} variant="headline">
								{title}
							</AppText>
							<AppText numberOfLines={1} tone="secondary" variant="footnote">
								{fileName}
							</AppText>
							<AppText tone="secondary" variant="footnote">
								{formatVaultKindLabel(kind)} · {createdDateLabel}
							</AppText>
							{linkedEntityLabel ? (
								<AppText numberOfLines={1} tone="tertiary" variant="footnote">
									Linked to {linkedEntityLabel}
								</AppText>
							) : null}
						</View>
						{hasMenu ? (
							<Menu>
								<Menu.Trigger asChild={true}>
									<PressableScale
										accessibilityLabel="File options"
										haptic="selection"
										style={{
											alignItems: "center",
											height: 44,
											justifyContent: "center",
											marginRight: -spacing.sm,
											marginTop: -spacing.sm,
											width: 44,
										}}
									>
										<Ionicons
											color={palette.inkSecondary}
											name="ellipsis-horizontal"
											size={20}
										/>
									</PressableScale>
								</Menu.Trigger>
								<Menu.Portal>
									<Menu.Overlay />
									<Menu.Content
										align="end"
										className="rounded-[20px] bg-surface p-2"
										offset={8}
										placement="bottom"
										presentation="popover"
										width={200}
									>
										{onEdit ? (
											<Menu.Item
												accessibilityLabel="Edit file"
												className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
												isAnimatedStyleActive={false}
												onPress={onEdit}
											>
												<Ionicons
													color={palette.ink}
													name="create-outline"
													size={18}
												/>
												<Menu.ItemTitle className="text-base">
													Edit
												</Menu.ItemTitle>
											</Menu.Item>
										) : null}
										{onEdit && onDelete ? (
											<View
												style={{
													backgroundColor: palette.separator,
													height: 1,
													marginHorizontal: spacing.sm,
												}}
											/>
										) : null}
										{onDelete ? (
											<Menu.Item
												accessibilityLabel="Delete file"
												className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
												isAnimatedStyleActive={false}
												onPress={onDelete}
											>
												<Ionicons
													color={palette.danger}
													name="trash-outline"
													size={18}
												/>
												<Menu.ItemTitle className="text-base text-danger">
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
						<View style={{ flexDirection: "row", gap: spacing.sm }}>
							{canOpenFile ? (
								<View style={{ flex: 1 }}>
									<PrimaryButton
										icon="open-outline"
										label="Open file"
										onPress={() => onOpenFile?.()}
									/>
								</View>
							) : null}
							{linkedEntityHref ? (
								<View style={{ flex: 1 }}>
									<Link asChild href={linkedEntityHref}>
										<SecondaryButton
											icon="git-branch-outline"
											label="Open linked item"
											onPress={() => undefined}
										/>
									</Link>
								</View>
							) : null}
						</View>
					) : null}
				</View>
			</Card>
		</Animated.View>
	);
}
