import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { PressableScale } from "./pressable-scale";
import { radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface CardProps {
	accessibilityLabel?: string;
	children?: ReactNode;
	className?: string;
	onPress?: () => void;
	/** Inner padding. Default 20 ("lg"). */
	padding?: "none" | "md" | "lg";
	/** Corner radius. Default 20. */
	radius?: number;
	style?: StyleProp<ViewStyle>;
}

const paddingValue = { lg: 20, md: spacing.lg, none: 0 } as const;

/**
 * Opaque content surface (the "island"). Flat: no glass, no shadow.
 * Pass onPress to make the whole card tappable (spring + light haptic).
 */
export function Card({
	accessibilityLabel,
	children,
	className,
	onPress,
	padding = "lg",
	radius: cornerRadius = radius.card,
	style,
}: CardProps) {
	const { palette } = useUITheme();
	const surfaceStyle: ViewStyle = {
		backgroundColor: palette.surface,
		borderRadius: cornerRadius,
		overflow: "hidden",
		padding: paddingValue[padding],
	};

	if (onPress) {
		return (
			<PressableScale
				accessibilityLabel={accessibilityLabel}
				className={className}
				onPress={onPress}
				scaleTo={0.98}
				style={[surfaceStyle, style]}
			>
				{children}
			</PressableScale>
		);
	}

	return (
		<View className={className} style={[surfaceStyle, style]}>
			{children}
		</View>
	);
}

/** Alias kept for the "island" vocabulary in DESIGN.md. */
export const Island = Card;
