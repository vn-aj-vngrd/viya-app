import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";

import { AppText } from "./app-text";
import { haptic } from "./haptics";
import { useLayoutSpring } from "./motion";
import { metrics, radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

const HIT_SLOP = (metrics.minTarget - metrics.segmentHeight) / 2;
const THUMB_HEIGHT = metrics.segmentHeight - 2 * spacing.xs;

export interface SegmentedProps<T extends string> {
	accessibilityLabel: string;
	onChange: (value: T) => void;
	options: readonly { label: string; value: T }[];
	value: T;
}

/** Opaque content control for 2 to 4 mutually exclusive scopes. */
export function Segmented<T extends string>({
	accessibilityLabel,
	onChange,
	options,
	value,
}: SegmentedProps<T>) {
	const { palette } = useUITheme();
	const spring = useLayoutSpring();
	const [trackWidth, setTrackWidth] = useState(0);
	const selectedIndex = Math.max(
		0,
		options.findIndex((option) => option.value === value)
	);
	const segmentWidth =
		trackWidth > 0 ? (trackWidth - 2 * spacing.xs) / options.length : 0;
	const offset = useSharedValue(0);

	useEffect(() => {
		offset.value = spring(selectedIndex * segmentWidth);
	}, [offset, segmentWidth, selectedIndex, spring]);

	const thumbStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: offset.value }],
	}));

	return (
		<View
			accessibilityLabel={accessibilityLabel}
			accessibilityRole="tablist"
			onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
			style={{
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				height: metrics.segmentHeight,
				padding: spacing.xs,
			}}
		>
			{segmentWidth > 0 ? (
				<Animated.View
					style={[
						{
							backgroundColor: palette.surface,
							borderRadius: radius.pill,
							height: THUMB_HEIGHT,
							left: spacing.xs,
							position: "absolute",
							top: spacing.xs,
							width: segmentWidth,
						},
						thumbStyle,
					]}
				/>
			) : null}
			{options.map((option) => {
				const selected = option.value === value;

				return (
					<Pressable
						accessibilityLabel={option.label}
						accessibilityRole="tab"
						accessibilityState={{ selected }}
						hitSlop={{ bottom: HIT_SLOP, top: HIT_SLOP }}
						key={option.value}
						onPress={() => {
							if (!selected) {
								haptic("selection");
								onChange(option.value);
							}
						}}
						style={{ alignItems: "center", flex: 1, justifyContent: "center" }}
					>
						<AppText bold={selected} variant="subhead">
							{option.label}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}
