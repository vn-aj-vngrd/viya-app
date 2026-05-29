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

import { Container } from "@/components/container";

// iOS system-fill style neutral that reads on both white cards and the grey
// page background without needing per-theme variants.
const skeletonFillColor = "rgba(120, 120, 128, 0.16)";
const pulseDurationMs = 900;
const restingOpacity = 0.55;

function SkeletonBlock({
	className,
	style,
}: {
	className?: string;
	style?: StyleProp<ViewStyle>;
}) {
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
			className={className}
			style={[{ backgroundColor: skeletonFillColor }, style, animatedStyle]}
		/>
	);
}

function CarouselCardSkeleton() {
	return (
		<View className="w-56 overflow-hidden rounded-3xl border border-border bg-surface">
			<SkeletonBlock className="h-32 w-full" />
			<View className="gap-2 p-4">
				<SkeletonBlock className="h-4 w-24 rounded-full" />
				<SkeletonBlock className="h-3 w-40 rounded-full" />
				<SkeletonBlock className="h-3 w-28 rounded-full" />
				<SkeletonBlock className="mt-1 h-5 w-16 rounded-full" />
			</View>
		</View>
	);
}

export function HomeLoadingState() {
	const insets = useSafeAreaInsets();

	return (
		<Container includeBottomInset={false} isScrollable={false}>
			<View
				className="flex-row items-center gap-4 px-4 pb-3"
				style={{ paddingTop: Math.max(insets.top, 12) }}
			>
				<View className="flex-1 gap-2">
					<SkeletonBlock className="h-7 w-40 rounded-full" />
					<SkeletonBlock className="h-4 w-28 rounded-full" />
				</View>
				<SkeletonBlock className="h-11 w-11 rounded-full" />
			</View>

			<View className="gap-5 px-4 pt-1">
				<View className="overflow-hidden rounded-[30px] border border-border bg-surface">
					<SkeletonBlock className="h-40 w-full" />
					<View className="gap-5 p-5">
						<View className="flex-row gap-5">
							<View className="flex-1 gap-2">
								<SkeletonBlock className="h-3 w-20 rounded-full" />
								<SkeletonBlock className="h-4 w-24 rounded-full" />
								<SkeletonBlock className="mt-1 h-1.5 w-full rounded-full" />
							</View>
							<View className="flex-1 gap-2">
								<SkeletonBlock className="h-3 w-16 rounded-full" />
								<SkeletonBlock className="h-4 w-20 rounded-full" />
							</View>
						</View>
						<SkeletonBlock className="h-11 w-full rounded-full" />
					</View>
				</View>

				<View className="gap-3 pt-1">
					<SkeletonBlock className="h-5 w-44 rounded-full" />
					<SkeletonBlock className="h-4 w-64 rounded-full" />
					<View className="flex-row gap-3 pt-1">
						<CarouselCardSkeleton />
						<CarouselCardSkeleton />
					</View>
				</View>
			</View>
		</Container>
	);
}
