import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { Surface } from "heroui-native";
import { Pressable, View } from "react-native";

const ACTIVE_TAB_COLOR = "#0A84FF";
const INACTIVE_TAB_COLOR = "#71717A";
const FLOATING_TAB_WIDTH = 260;

export function FloatingTabBar({
	descriptors,
	navigation,
	state,
	insets,
}: BottomTabBarProps) {
	return (
		<View
			pointerEvents="box-none"
			style={{
				alignItems: "center",
				bottom: Math.max(insets.bottom + 10, 24),
				left: 0,
				position: "absolute",
				right: 0,
			}}
		>
			<Surface
				className="flex-row items-center rounded-full border border-border bg-surface px-2 py-2"
				style={{
					boxShadow: "0 12px 30px rgba(17, 24, 39, 0.14)",
					width: FLOATING_TAB_WIDTH,
				}}
			>
				{state.routes.map((route, index) => {
					const descriptor = descriptors[route.key];
					const options = descriptor.options;
					const isFocused = state.index === index;
					const color = isFocused ? "#FFFFFF" : INACTIVE_TAB_COLOR;
					const tabBarIcon = options.tabBarIcon;

					const handlePress = () => {
						const event = navigation.emit({
							canPreventDefault: true,
							target: route.key,
							type: "tabPress",
						});

						if (!(isFocused || event.defaultPrevented)) {
							navigation.navigate(route.name, route.params);
						}
					};

					const handleLongPress = () => {
						navigation.emit({
							target: route.key,
							type: "tabLongPress",
						});
					};

					return (
						<Pressable
							accessibilityLabel={options.tabBarAccessibilityLabel}
							accessibilityRole="button"
							accessibilityState={isFocused ? { selected: true } : undefined}
							className="h-10 flex-1 items-center justify-center rounded-full"
							key={route.key}
							onLongPress={handleLongPress}
							onPress={handlePress}
							testID={options.tabBarButtonTestID}
						>
							<View
								className="h-10 w-10 items-center justify-center rounded-full"
								style={{
									backgroundColor: isFocused ? ACTIVE_TAB_COLOR : "transparent",
								}}
							>
								{tabBarIcon?.({ color, focused: isFocused, size: 20 })}
							</View>
						</Pressable>
					);
				})}
			</Surface>
		</View>
	);
}
