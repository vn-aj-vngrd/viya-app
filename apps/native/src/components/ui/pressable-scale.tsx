import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { Pressable, type PressableProps, type StyleProp } from "react-native";
import Animated from "react-native-reanimated";
import { type HapticKind, haptic } from "./haptics";
import { usePressScale } from "./motion";
import { motion } from "./tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps
	extends Omit<PressableProps, "children" | "style"> {
	children?: ReactNode;
	className?: string;
	/** Haptic fired on press. Default "light"; use "none" to silence. */
	haptic?: HapticKind;
	/** Scale while pressed. Default 0.97. */
	scaleTo?: number;
	style?: StyleProp<ViewStyle>;
}

/**
 * The base interactive element: spring scale on press-in/out plus a haptic.
 * Always give it an accessibilityLabel when it has no text child.
 */
export function PressableScale({
	children,
	disabled,
	haptic: hapticKind = "light",
	onPress,
	onPressIn,
	onPressOut,
	scaleTo = motion.pressScale,
	style,
	...props
}: PressableScaleProps) {
	const press = usePressScale(scaleTo);

	return (
		<AnimatedPressable
			accessibilityRole="button"
			accessibilityState={{ disabled: Boolean(disabled) }}
			disabled={disabled}
			onPress={(event) => {
				haptic(hapticKind);
				onPress?.(event);
			}}
			onPressIn={(event) => {
				press.onPressIn();
				onPressIn?.(event);
			}}
			onPressOut={(event) => {
				press.onPressOut();
				onPressOut?.(event);
			}}
			style={[style, press.animatedStyle]}
			{...props}
		>
			{children}
		</AnimatedPressable>
	);
}
