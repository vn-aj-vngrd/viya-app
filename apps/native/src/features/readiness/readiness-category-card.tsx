import { Ionicons } from "@expo/vector-icons";
import { PRIORITY_LABELS, type Priority } from "@viya-app/domain";
import { type Href, Link } from "expo-router";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
	AppText,
	Card,
	type IconName,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { PillAction } from "@/src/features/bookings/pill-action";

interface ReadinessCategoryCardProps {
	categoryHref: Href | null;
	detail: string;
	highestPriority: Priority | null;
	icon: IconName;
	label: string;
	openCount: number;
	score: number;
}

export function ReadinessCategoryCard({
	categoryHref,
	detail,
	highestPriority,
	icon,
	label,
	openCount,
	score,
}: ReadinessCategoryCardProps) {
	const { palette } = useUITheme();
	let tone = palette.danger;
	if (score >= 70) {
		tone = palette.success;
	} else if (score >= 40) {
		tone = palette.warning;
	}

	return (
		<Animated.View
			entering={FadeInDown.springify().damping(20)}
			style={{ flexBasis: "47%", flexGrow: 1 }}
		>
			<Card padding="md" style={{ flex: 1, gap: spacing.md }}>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<Ionicons color={palette.accent} name={icon} size={22} />
					<View
						style={{
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							paddingHorizontal: 10,
							paddingVertical: 4,
						}}
					>
						<AppText bold={true} style={{ color: tone }} variant="footnote">
							{score}%
						</AppText>
					</View>
				</View>
				<View style={{ gap: 2 }}>
					<AppText bold={true} numberOfLines={1}>
						{label}
					</AppText>
					<AppText numberOfLines={2} tone="secondary" variant="footnote">
						{detail}
					</AppText>
				</View>
				<AppText numberOfLines={1} tone="tertiary" variant="footnote">
					{openCount} open ·{" "}
					{highestPriority ? PRIORITY_LABELS[highestPriority] : "Clear"}
				</AppText>
				{categoryHref ? (
					<View style={{ alignItems: "flex-start" }}>
						<Link asChild href={categoryHref}>
							<PillAction label="Open module" />
						</Link>
					</View>
				) : null}
			</Card>
		</Animated.View>
	);
}
