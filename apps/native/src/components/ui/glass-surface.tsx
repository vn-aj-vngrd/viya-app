import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import {
	Platform,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";

import { radius as radii } from "./tokens";
import { useReduceTransparency, useUITheme } from "./use-ui-theme";

export type GlassShape = "circle" | "pill" | "rounded";

export interface GlassSurfaceProps {
	children?: ReactNode;
	className?: string;
	/** Native interactive glass (iOS 26+): the system reacts to touches. */
	interactive?: boolean;
	/** Corner radius for shape="rounded". Default radius.card. */
	radius?: number;
	/** "circle" and "pill" ignore `radius`. */
	shape?: GlassShape;
	style?: StyleProp<ViewStyle>;
	/** Optional tint (e.g. accent) applied to the glass. */
	tint?: string;
	/**
	 * "regular" (default) for controls; "clear" for floating controls over
	 * rich media where the content must show through.
	 */
	variant?: "clear" | "regular";
}

/**
 * Glass for COMPACT CONTROLS ONLY (icon buttons, tab bar, toasts, floating
 * actions). Never use on content, cards, rows or on top of other glass.
 *
 * iOS 26+: native Liquid Glass. Older iOS: system blur. Android, web and iOS
 * with Reduce Transparency: solid translucent surface with a hairline edge.
 * Size the surface with `style`; for shape="circle" give equal width/height.
 */
export function GlassSurface({
	children,
	className,
	interactive = false,
	radius = radii.card,
	shape = "rounded",
	style,
	tint,
	variant = "regular",
}: GlassSurfaceProps) {
	const { isDark, palette, scheme } = useUITheme();
	const reduceTransparency = useReduceTransparency();
	const borderRadius = shape === "rounded" ? radius : radii.pill;
	const base: ViewStyle = { borderRadius, overflow: "hidden" };
	const canGlass =
		Platform.OS === "ios" && !reduceTransparency && isLiquidGlassAvailable();

	if (canGlass) {
		return (
			<GlassView
				className={className}
				colorScheme={scheme}
				glassEffectStyle={variant}
				isInteractive={interactive}
				style={[base, style]}
				tintColor={tint}
			>
				{children}
			</GlassView>
		);
	}

	if (Platform.OS === "ios" && !reduceTransparency) {
		return (
			<BlurView
				className={className}
				intensity={70}
				style={[base, style]}
				tint={isDark ? "systemMaterialDark" : "systemMaterialLight"}
			>
				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{
							borderColor: palette.hairline,
							borderRadius,
							borderWidth: StyleSheet.hairlineWidth,
						},
					]}
				/>
				{children}
			</BlurView>
		);
	}

	return (
		<View
			className={className}
			style={[
				base,
				{
					backgroundColor: palette.glassFallback,
					borderColor: palette.hairline,
					borderWidth: StyleSheet.hairlineWidth,
				},
				style,
			]}
		>
			{children}
		</View>
	);
}
