import { useEffect } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { metrics, radius, spacing, useUITheme } from "@/src/components/ui";

const pulseDurationMs = 900;
const restingOpacity = 0.55;

function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
	const { palette } = useUITheme();
	const opacity = useSharedValue(restingOpacity);

	useEffect(() => {
		opacity.value = withRepeat(
			withTiming(1, {
				duration: pulseDurationMs,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true
		);
	}, [opacity]);

	const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

	return (
		<Animated.View
			style={[
				{ backgroundColor: palette.fill, borderRadius: radius.pill },
				style,
				animatedStyle,
			]}
		/>
	);
}

function CarouselCardSkeleton() {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.surface,
				borderRadius: radius.card,
				overflow: "hidden",
				width: 224,
			}}
		>
			<SkeletonBlock style={{ borderRadius: 0, height: 128, width: "100%" }} />
			<View style={{ gap: spacing.sm, padding: spacing.lg }}>
				<SkeletonBlock style={{ height: 16, width: 96 }} />
				<SkeletonBlock style={{ height: 12, width: 160 }} />
				<SkeletonBlock style={{ height: 12, width: 112 }} />
			</View>
		</View>
	);
}

export function HomeLoadingState() {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();

	return (
		<View
			accessibilityLabel="Loading home"
			accessibilityRole="progressbar"
			style={{ backgroundColor: palette.canvas, flex: 1 }}
		>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.lg,
					minHeight: metrics.navBarHeight,
					paddingHorizontal: spacing.screen,
					paddingTop: insets.top,
				}}
			>
				<View style={{ flex: 1 }} />
				<SkeletonBlock style={{ height: 44, width: 44 }} />
			</View>

			<View style={{ gap: spacing.section, padding: spacing.screen }}>
				<View style={{ gap: spacing.sm }}>
					<SkeletonBlock style={{ height: 32, width: 200 }} />
					<SkeletonBlock style={{ height: 16, width: 128 }} />
				</View>

				<View
					style={{
						backgroundColor: palette.surface,
						borderRadius: radius.card,
						gap: spacing.lg,
						padding: spacing.screen,
					}}
				>
					<View style={{ flexDirection: "row", gap: spacing.lg }}>
						<SkeletonBlock
							style={{ borderRadius: radius.field, height: 72, width: 72 }}
						/>
						<View
							style={{ flex: 1, gap: spacing.sm, justifyContent: "center" }}
						>
							<SkeletonBlock style={{ height: 12, width: 80 }} />
							<SkeletonBlock style={{ height: 18, width: 150 }} />
						</View>
					</View>
					<SkeletonBlock style={{ height: 6, width: "100%" }} />
					<SkeletonBlock style={{ height: 50, width: "100%" }} />
				</View>

				<View style={{ gap: spacing.md }}>
					<SkeletonBlock style={{ height: 22, width: 176 }} />
					<View style={{ flexDirection: "row", gap: spacing.md }}>
						<CarouselCardSkeleton />
						<CarouselCardSkeleton />
					</View>
				</View>
			</View>
		</View>
	);
}
