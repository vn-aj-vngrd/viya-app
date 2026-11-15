import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "react-native";

import {
	AppText,
	type IconName,
	metrics,
	PressableScale,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";

type PillTone = "danger" | "primary" | "quiet";

interface PillActionProps {
	disabled?: boolean;
	icon?: IconName;
	isPending?: boolean;
	label: string;
	onPress?: () => void;
	tone?: PillTone;
}

/** Compact 34pt action pill (44pt hit area) for card-level actions. */
export function PillAction({
	disabled,
	icon,
	isPending,
	label,
	onPress,
	tone = "quiet",
}: PillActionProps) {
	const { palette } = useUITheme();
	const isPrimary = tone === "primary";
	const background = isPrimary ? palette.ink : palette.fill;
	let foreground = palette.ink;
	if (isPrimary) {
		foreground = palette.onPrimary;
	} else if (tone === "danger") {
		foreground = palette.danger;
	}
	const inactive = Boolean(disabled) || Boolean(isPending);
	const vertical = (metrics.minTarget - metrics.chipHeight) / 2;

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ busy: Boolean(isPending), disabled: inactive }}
			disabled={inactive}
			haptic={isPrimary ? "medium" : "selection"}
			hitSlop={{ bottom: vertical, top: vertical }}
			onPress={onPress}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				backgroundColor: background,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 6,
				height: metrics.chipHeight,
				justifyContent: "center",
				opacity: disabled ? 0.4 : 1,
				paddingHorizontal: spacing.md,
			}}
		>
			{isPending ? <ActivityIndicator color={foreground} size="small" /> : null}
			{icon && !isPending ? (
				<Ionicons
					color={tone === "quiet" ? palette.accent : foreground}
					name={icon}
					size={15}
				/>
			) : null}
			<AppText
				numberOfLines={1}
				style={{ color: foreground, fontWeight: "600" }}
				variant="footnote"
			>
				{label}
			</AppText>
		</PressableScale>
	);
}
