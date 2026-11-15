import { View } from "react-native";

import { AppText } from "./app-text";
import { PressableScale } from "./pressable-scale";
import { spacing } from "./tokens";

export interface SectionHeaderProps {
	action?: { label: string; onPress: () => void };
	className?: string;
	eyebrow?: string;
	title: string;
}

/** Section title with an optional eyebrow and one trailing text action. */
export function SectionHeader({
	action,
	className,
	eyebrow,
	title,
}: SectionHeaderProps) {
	return (
		<View
			className={className}
			style={{
				alignItems: "flex-end",
				flexDirection: "row",
				gap: spacing.md,
				justifyContent: "space-between",
			}}
		>
			<View style={{ flex: 1, gap: 2 }}>
				{eyebrow ? (
					<AppText tone="secondary" variant="eyebrow">
						{eyebrow}
					</AppText>
				) : null}
				<AppText accessibilityRole="header" variant="heading">
					{title}
				</AppText>
			</View>
			{action ? (
				<PressableScale
					accessibilityLabel={action.label}
					haptic="selection"
					hitSlop={12}
					onPress={action.onPress}
					scaleTo={0.97}
				>
					<AppText bold={true} tone="accent" variant="subhead">
						{action.label}
					</AppText>
				</PressableScale>
			) : null}
		</View>
	);
}
