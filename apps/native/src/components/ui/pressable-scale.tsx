import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { Pressable, type PressableProps, type StyleProp } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

import { type HapticKind, haptic } from "./haptics";
import { motion } from "./tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps
	extends Omit<PressableProps, "children" | "style"> {
	children?: ReactNode;
	className?: string;
	/** Haptic fired on press. Default "light"; use "none" to silence. */
	haptic?: HapticKind;
	/** Scale while pressed. Default 0.96. */
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
	const scale = useSharedValue(1);
	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

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
				scale.value = withSpring(scaleTo, motion.spring.press);
				onPressIn?.(event);
			}}
			onPressOut={(event) => {
				scale.value = withSpring(1, motion.spring.press);
				onPressOut?.(event);
			}}
			style={[style, animatedStyle]}
			{...props}
		>
			{children}
		</AnimatedPressable>
	);
}
