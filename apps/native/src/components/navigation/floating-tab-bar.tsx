import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";

import { GlassSurface } from "@/src/components/ui/glass-surface";
import { PressableScale } from "@/src/components/ui/pressable-scale";
import { metrics, motion, spacing } from "@/src/components/ui/tokens";
import { useUITheme } from "@/src/components/ui/use-ui-theme";

const AI_TAB_NAME = "viya";
const BAR_PADDING = 6;
const INDICATOR_SIZE = metrics.tabSlot - 8;
const HIDDEN_TAB_NAMES = new Set(["moments", "vault"]);

function emitTabPress({
	isFocused,
	navigation,
	params,
	route,
}: {
	isFocused: boolean;
	navigation: BottomTabBarProps["navigation"];
	params?: Record<string, string>;
	route: BottomTabBarProps["state"]["routes"][number];
}) {
	const event = navigation.emit({
		canPreventDefault: true,
		target: route.key,
		type: "tabPress",
	});

	if (!(isFocused || event.defaultPrevented)) {
		navigation.navigate(route.name, params ?? route.params);
	}
}

function emitTabLongPress({
	navigation,
	route,
}: {
	navigation: BottomTabBarProps["navigation"];
	route: BottomTabBarProps["state"]["routes"][number];
}) {
	navigation.emit({
		target: route.key,
		type: "tabLongPress",
	});
}

export function FloatingTabBar({
	descriptors,
	navigation,
	state,
	insets,
}: BottomTabBarProps) {
	const { palette } = useUITheme();
	const focusedRoute = state.routes[state.index];
	const mainRoutes = state.routes.filter(
		(route) => route.name !== AI_TAB_NAME && !HIDDEN_TAB_NAMES.has(route.name)
	);
	const aiRoute = state.routes.find((route) => route.name === AI_TAB_NAME);
	const aiDescriptor = aiRoute ? descriptors[aiRoute.key] : null;
	const isAiFocused = focusedRoute.name === AI_TAB_NAME;
	const focusedIndex = mainRoutes.findIndex(
		(route) => route.key === focusedRoute.key
	);
	const barWidth = mainRoutes.length * metrics.tabSlot + BAR_PADDING * 2;

	const position = useSharedValue(Math.max(focusedIndex, 0));
	const indicatorOpacity = useSharedValue(focusedIndex >= 0 ? 1 : 0);

	useEffect(() => {
		if (focusedIndex >= 0) {
			position.value = withSpring(focusedIndex, motion.spring.selection);
		}
		indicatorOpacity.value = withSpring(
			focusedIndex >= 0 ? 1 : 0,
			motion.spring.selection
		);
	}, [focusedIndex, indicatorOpacity, position]);

	const indicatorStyle = useAnimatedStyle(() => ({
		opacity: indicatorOpacity.value,
		transform: [{ translateX: position.value * metrics.tabSlot }],
	}));

	if (isAiFocused) {
		return null;
	}

	return (
		<View
			pointerEvents="box-none"
			style={{
				alignItems: "center",
				bottom: Math.max(insets.bottom, spacing.sm) + spacing.xs,
				flexDirection: "row",
				gap: spacing.sm,
				justifyContent: "center",
				left: 0,
				position: "absolute",
				right: 0,
			}}
		>
			<GlassSurface
				shape="pill"
				style={{
					flexDirection: "row",
					height: metrics.tabBarHeight,
					padding: BAR_PADDING,
					width: barWidth,
				}}
			>
				<Animated.View
					pointerEvents="none"
					style={[
						{
							backgroundColor: palette.selection,
							borderRadius: INDICATOR_SIZE,
							height: metrics.tabBarHeight - BAR_PADDING * 2,
							left: BAR_PADDING + 2,
							position: "absolute",
							top: BAR_PADDING,
							width: INDICATOR_SIZE,
						},
						indicatorStyle,
					]}
				/>
				{mainRoutes.map((route) => {
					const options = descriptors[route.key].options;
					const isFocused = focusedRoute.key === route.key;
					const color = isFocused ? palette.ink : palette.inkSecondary;

					return (
						<PressableScale
							accessibilityLabel={
								options.tabBarAccessibilityLabel ?? options.title
							}
							accessibilityState={{ selected: isFocused }}
							haptic="selection"
							key={route.key}
							onLongPress={() => emitTabLongPress({ navigation, route })}
							onPress={() => emitTabPress({ isFocused, navigation, route })}
							scaleTo={0.9}
							style={{
								alignItems: "center",
								height: "100%",
								justifyContent: "center",
								width: metrics.tabSlot,
							}}
							testID={options.tabBarButtonTestID}
						>
							{options.tabBarIcon?.({ color, focused: isFocused, size: 22 })}
						</PressableScale>
					);
				})}
			</GlassSurface>
			{aiRoute && aiDescriptor ? (
				<PressableScale
					accessibilityLabel={
						aiDescriptor.options.tabBarAccessibilityLabel ??
						aiDescriptor.options.title
					}
					onLongPress={() => emitTabLongPress({ navigation, route: aiRoute })}
					onPress={() =>
						emitTabPress({
							isFocused: isAiFocused,
							navigation,
							params: { fromTab: focusedRoute.name },
							route: aiRoute,
						})
					}
					scaleTo={0.92}
					style={{ height: metrics.tabBarHeight, width: metrics.tabBarHeight }}
					testID={aiDescriptor.options.tabBarButtonTestID}
				>
					<GlassSurface
						interactive={true}
						shape="circle"
						style={{
							alignItems: "center",
							height: metrics.tabBarHeight,
							justifyContent: "center",
							width: metrics.tabBarHeight,
						}}
					>
						{aiDescriptor.options.tabBarIcon?.({
							color: palette.accent,
							focused: false,
							size: 24,
						})}
					</GlassSurface>
				</PressableScale>
			) : null}
		</View>
	);
}
