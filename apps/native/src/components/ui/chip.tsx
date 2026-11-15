import { Ionicons } from "@expo/vector-icons";

import { AppText } from "./app-text";
import type { IconName } from "./glass-icon-button";
import { PressableScale } from "./pressable-scale";
import { metrics, radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface ChipProps {
	className?: string;
	icon?: IconName;
	label: string;
	/** Omit for a static (non-interactive) tag. */
	onPress?: () => void;
	/** Selected chips also show a filled background (not color alone). */
	selected?: boolean;
}

/** Pill for filters, categories and statuses. Hit area grows to 44pt. */
export function Chip({ className, icon, label, onPress, selected }: ChipProps) {
	const { palette } = useUITheme();
	const foreground = selected ? palette.onPrimary : palette.ink;
	const vertical = (metrics.minTarget - metrics.chipHeight) / 2;

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole={onPress ? "button" : "text"}
			accessibilityState={{ selected: Boolean(selected) }}
			className={className}
			disabled={!onPress}
			haptic="selection"
			hitSlop={{ bottom: vertical, top: vertical }}
			onPress={onPress}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				alignSelf: "flex-start",
				backgroundColor: selected ? palette.ink : palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 6,
				height: metrics.chipHeight,
				paddingHorizontal: spacing.md,
			}}
		>
			{icon ? <Ionicons color={foreground} name={icon} size={15} /> : null}
			<AppText
				style={{ color: foreground, fontWeight: "500" }}
				variant="subhead"
			>
				{label}
			</AppText>
		</PressableScale>
	);
}
