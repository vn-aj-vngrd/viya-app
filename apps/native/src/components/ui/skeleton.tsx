import type { DimensionValue } from "react-native";
import Animated from "react-native-reanimated";

import { useSkeletonPulse } from "./motion";
import { radius as radiusTokens } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface SkeletonProps {
	height: number;
	radius?: number;
	width: DimensionValue;
}

/**
 * Loading placeholder with the shared pulse (the only looping animation).
 * Hidden from assistive tech; the parent carries the progressbar label.
 */
export function Skeleton({
	height,
	radius = radiusTokens.tile,
	width,
}: SkeletonProps) {
	const { palette } = useUITheme();
	const animatedStyle = useSkeletonPulse();

	return (
		<Animated.View
			accessibilityElementsHidden={true}
			importantForAccessibility="no-hide-descendants"
			style={[
				{ backgroundColor: palette.fill, borderRadius: radius, height, width },
				animatedStyle,
			]}
		/>
	);
}
