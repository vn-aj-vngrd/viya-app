import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { enterRise } from "./motion";

export interface RevealProps {
	children: ReactNode;
	/** Position in a list. Only the first ~6 stagger (max 40ms apart). */
	index?: number;
	style?: StyleProp<ViewStyle>;
}

/**
 * The single entrance: fade plus 8pt rise, once on mount. Never wrap content
 * that re-mounts on refresh or scroll. Reduce Motion collapses to a fade.
 */
export function Reveal({ children, index = 0, style }: RevealProps) {
	const reduced = useReducedMotion();

	return (
		<Animated.View entering={enterRise(index, reduced)} style={style}>
			{children}
		</Animated.View>
	);
}
