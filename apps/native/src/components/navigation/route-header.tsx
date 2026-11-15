import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/src/components/ui/app-text";

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
		<View className="flex-row items-start justify-between gap-3">
			<View className="min-w-0 flex-1 gap-0.5">
				{eyebrow ? (
					<AppText tone="secondary" variant="eyebrow">
						{eyebrow}
					</AppText>
				) : null}
				<AppText accessibilityRole="header" variant="title">
					{title}
				</AppText>
				{subtitle ? (
					<AppText tone="secondary" variant="subhead">
						{subtitle}
					</AppText>
				) : null}
			</View>
			{rightContent ? (
				<View className="flex-shrink pt-0.5">{rightContent}</View>
			) : null}
		</View>
	);
}
