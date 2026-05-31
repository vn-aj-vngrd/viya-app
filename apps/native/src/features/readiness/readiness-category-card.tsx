import { Ionicons } from "@expo/vector-icons";
import { PRIORITY_LABELS, type Priority } from "@viya-app/domain";
import { type Href, Link } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import type { ComponentProps } from "react";
import { View } from "react-native";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface ReadinessCategoryCardProps {
	accentBackgroundColor: string;
	accentColor: string;
	categoryHref: Href | null;
	detail: string;
	highestPriority: Priority | null;
	icon: IoniconName;
	label: string;
	openCount: number;
	score: number;
}

export function ReadinessCategoryCard({
	accentBackgroundColor,
	accentColor,
	categoryHref,
	detail,
	highestPriority,
	icon,
	label,
	openCount,
	score,
}: ReadinessCategoryCardProps) {
	return (
		<Surface className="min-w-[47%] flex-1 gap-3 rounded-[24px] border border-border bg-surface p-3.5">
			<View className="flex-row items-start justify-between gap-2">
				<View
					className="h-9 w-9 items-center justify-center rounded-full"
					style={{ backgroundColor: accentBackgroundColor }}
				>
					<Ionicons color={accentColor} name={icon} size={17} />
				</View>
				<View className="rounded-full border border-border bg-white px-2.5 py-1">
					<Text style={{ color: accentColor }} type="body-xs" weight="semibold">
						{score}%
					</Text>
				</View>
			</View>
			<View className="gap-1">
				<Text numberOfLines={1} type="body" weight="semibold">
					{label}
				</Text>
				<Text color="muted" numberOfLines={2} type="body-xs">
					{detail}
				</Text>
			</View>
			<Text color="muted" numberOfLines={1} type="body-xs">
				{openCount} open -{" "}
				{highestPriority ? PRIORITY_LABELS[highestPriority] : "Clear"}
			</Text>
			{categoryHref ? (
				<Link asChild href={categoryHref}>
					<Button size="sm" variant="secondary">
						<Button.Label>Open module</Button.Label>
					</Button>
				</Link>
			) : null}
		</Surface>
	);
}
