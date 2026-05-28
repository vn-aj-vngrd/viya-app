import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Surface, Text } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface RouteHeaderProps {
	eyebrow?: string;
	icon?: IconName;
	rightContent?: ReactNode;
	subtitle?: string;
	title: string;
}

export function RouteHeader({
	eyebrow,
	icon = "map-outline",
	rightContent,
	subtitle,
	title,
}: RouteHeaderProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const topPadding = Math.max(insets.top + 2, 18);

	return (
		<View className="gap-3" style={{ paddingTop: topPadding }}>
			<View className="min-h-11 flex-row items-center justify-between gap-3">
				<NavigationBackButton onPress={() => router.back()} />
				{rightContent ? (
					<View className="flex-shrink">{rightContent}</View>
				) : null}
			</View>
			<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-5">
				<View className="flex-row items-start gap-3">
					<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
						<Ionicons color="#0A84FF" name={icon} size={20} />
					</View>
					<View className="flex-1 gap-1">
						{eyebrow ? (
							<Text color="muted" type="body-xs" weight="semibold">
								{eyebrow.toUpperCase()}
							</Text>
						) : null}
						<Text.Heading type="h3" weight="semibold">
							{title}
						</Text.Heading>
						{subtitle ? (
							<Text.Paragraph color="muted" type="body-sm">
								{subtitle}
							</Text.Paragraph>
						) : null}
					</View>
				</View>
			</Surface>
		</View>
	);
}
