import type { ReactElement, ReactNode } from "react";
import {
	type RefreshControlProps,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "./app-text";
import { metrics, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

const LARGE_TITLE_BLOCK = 56;

export interface ScreenHeaderProps {
	/** Left control, e.g. <GlassIconButton icon="chevron-back" />. */
	leading?: ReactNode;
	subtitle?: string;
	title: string;
	/** Right controls (max two). */
	trailing?: ReactNode;
}

/**
 * Static large-title header for screens that do not scroll
 * (use CollapsingScreen for scrolling screens).
 */
export function ScreenHeader({
	leading,
	subtitle,
	title,
	trailing,
}: ScreenHeaderProps) {
	return (
		<View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }}>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					justifyContent: "space-between",
					minHeight: metrics.navBarHeight,
				}}
			>
				<View>{leading}</View>
				<View style={{ flexDirection: "row", gap: spacing.sm }}>
					{trailing}
				</View>
			</View>
			<View style={{ gap: 2 }}>
				<AppText accessibilityRole="header" variant="largeTitle">
					{title}
				</AppText>
				{subtitle ? (
					<AppText tone="secondary" variant="callout">
						{subtitle}
					</AppText>
				) : null}
			</View>
		</View>
	);
}

export interface CollapsingScreenProps extends ScreenHeaderProps {
	children: ReactNode;
	/** Content container style (extra bottom padding for the tab bar, etc.). */
	contentContainerStyle?: StyleProp<ViewStyle>;
	/** Pinned below the scroll area (e.g. a bottom action bar). */
	footer?: ReactNode;
	/** Pass through to the ScrollView (refreshControl, keyboard props...). */
	refreshControl?: ReactElement<RefreshControlProps>;
}

/**
 * Scrolling screen with an iOS-style large title that collapses into a
 * compact centered title in a fixed bar. Controls (leading/trailing) stay
 * pinned; the bar's background fades in once content scrolls beneath it.
 */
export function CollapsingScreen({
	children,
	contentContainerStyle,
	footer,
	leading,
	refreshControl,
	subtitle,
	title,
	trailing,
}: CollapsingScreenProps) {
	const { palette } = useUITheme();
	const insets = useSafeAreaInsets();
	const scrollY = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((event) => {
		scrollY.value = event.contentOffset.y;
	});

	const barBackground = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [0, 24], [0, 1], Extrapolation.CLAMP),
	}));
	const compactTitle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [28, 52], [0, 1], Extrapolation.CLAMP),
	}));
	const largeTitle = useAnimatedStyle(() => ({
		opacity: interpolate(scrollY.value, [0, 36], [1, 0], Extrapolation.CLAMP),
	}));

	const barHeight = insets.top + metrics.navBarHeight;

	return (
		<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
			<Animated.ScrollView
				contentContainerStyle={[
					{ paddingTop: barHeight },
					contentContainerStyle,
				]}
				contentInsetAdjustmentBehavior="never"
				keyboardShouldPersistTaps="handled"
				onScroll={onScroll}
				refreshControl={refreshControl}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				<Animated.View
					style={[
						{
							gap: 2,
							height: LARGE_TITLE_BLOCK,
							justifyContent: "center",
							paddingHorizontal: spacing.screen,
						},
						largeTitle,
					]}
				>
					<AppText accessibilityRole="header" variant="largeTitle">
						{title}
					</AppText>
				</Animated.View>
				{subtitle ? (
					<AppText
						style={{
							paddingBottom: spacing.sm,
							paddingHorizontal: spacing.screen,
						}}
						tone="secondary"
						variant="callout"
					>
						{subtitle}
					</AppText>
				) : null}
				{children}
			</Animated.ScrollView>

			<View
				pointerEvents="box-none"
				style={{
					height: barHeight,
					left: 0,
					paddingTop: insets.top,
					position: "absolute",
					right: 0,
					top: 0,
				}}
			>
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{
							backgroundColor: palette.canvas,
							borderBottomColor: palette.separator,
							borderBottomWidth: StyleSheet.hairlineWidth,
						},
						barBackground,
					]}
				/>
				<View
					pointerEvents="box-none"
					style={{
						alignItems: "center",
						flexDirection: "row",
						height: metrics.navBarHeight,
						justifyContent: "space-between",
						paddingHorizontal: spacing.lg,
					}}
				>
					<View style={{ minWidth: metrics.minTarget }}>{leading}</View>
					<Animated.View
						pointerEvents="none"
						style={[
							{
								alignItems: "center",
								bottom: 0,
								justifyContent: "center",
								left: 72,
								position: "absolute",
								right: 72,
								top: 0,
							},
							compactTitle,
						]}
					>
						<AppText numberOfLines={1} variant="headline">
							{title}
						</AppText>
					</Animated.View>
					<View style={{ flexDirection: "row", gap: spacing.sm }}>
						{trailing}
					</View>
				</View>
			</View>
			{footer}
		</View>
	);
}
