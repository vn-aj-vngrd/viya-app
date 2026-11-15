import { GlassSurface } from "./glass-surface";
import { Icon, type IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { metrics } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface GlassIconButtonProps {
	accessibilityLabel: string;
	className?: string;
	disabled?: boolean;
	icon: IconName;
	iconColor?: string;
	onPress: () => void;
	/** Visual and hit size. Default 44 (never below 44). */
	size?: number;
	/** Accent tint for the glass (primary floating action). */
	tint?: string;
}

/** Round glass icon button, 44pt minimum: header actions, back, close. */
export function GlassIconButton({
	accessibilityLabel,
	className,
	disabled,
	icon,
	iconColor,
	onPress,
	size = metrics.iconButton,
	tint,
}: GlassIconButtonProps) {
	const { palette } = useUITheme();
	const dimension = Math.max(size, metrics.minTarget);

	return (
		<PressableScale
			accessibilityLabel={accessibilityLabel}
			className={className}
			disabled={disabled}
			onPress={onPress}
			style={{
				height: dimension,
				opacity: disabled ? 0.4 : 1,
				width: dimension,
			}}
		>
			<GlassSurface
				interactive
				shape="circle"
				style={{
					alignItems: "center",
					height: dimension,
					justifyContent: "center",
					width: dimension,
				}}
				tint={tint}
			>
				<Icon
					color={iconColor ?? palette.ink}
					name={icon}
					size={Math.round(dimension * 0.45)}
					weight="medium"
				/>
			</GlassSurface>
		</PressableScale>
	);
}

export type { IconName } from "./icon";
