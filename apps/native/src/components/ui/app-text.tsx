import { Text, type TextProps } from "react-native";

import { type TypeVariant, typeScale } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export type TextTone =
	| "ink"
	| "secondary"
	| "tertiary"
	| "accent"
	| "danger"
	| "success"
	| "warning"
	| "onPrimary";

export interface AppTextProps extends TextProps {
	/** Semi-bold override for any variant. */
	bold?: boolean;
	tone?: TextTone;
	variant?: TypeVariant;
}

const toneKey = {
	accent: "accent",
	danger: "danger",
	ink: "ink",
	onPrimary: "onPrimary",
	secondary: "inkSecondary",
	success: "success",
	tertiary: "inkTertiary",
	warning: "warning",
} as const;

/** Themed text bound to the type scale. */
export function AppText({
	bold,
	style,
	tone = "ink",
	variant = "body",
	...props
}: AppTextProps) {
	const { palette } = useUITheme();
	const scale = typeScale[variant];

	return (
		<Text
			style={[
				scale,
				{ color: palette[toneKey[tone]] },
				bold ? { fontWeight: "600" } : null,
				variant === "eyebrow" ? { textTransform: "uppercase" } : null,
				style,
			]}
			{...props}
		/>
	);
}
