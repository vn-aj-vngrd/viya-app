import { Text } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

interface RouteHeaderProps {
	eyebrow?: string;
	icon?: string;
	rightContent?: ReactNode;
	subtitle?: string;
	title: string;
}

export function RouteHeader({
	eyebrow,
	rightContent,
	subtitle,
	title,
}: RouteHeaderProps) {
	return (
		<View className="gap-1.5">
			<View className="flex-row items-start justify-between gap-3">
				<View className="min-w-0 flex-1 gap-0.5">
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
				{rightContent ? (
					<View className="flex-shrink pt-0.5">{rightContent}</View>
				) : null}
			</View>
		</View>
	);
}
