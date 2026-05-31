import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { Surface } from "heroui-native";
import { Pressable, View } from "react-native";

const ACTIVE_TAB_COLOR = "#0A84FF";
const INACTIVE_TAB_COLOR = "#71717A";
const AI_TAB_NAME = "viya";
const TAB_SLOT_WIDTH = 52;
const TAB_BAR_HORIZONTAL_PADDING = 16;
const TAB_BAR_RADIUS = 28;
const TAB_BAR_SIZE = 56;
const ACTIVE_TAB_SIZE = 40;
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
	const focusedRoute = state.routes[state.index];
	const mainRoutes = state.routes.filter(
		(route) => route.name !== AI_TAB_NAME && !HIDDEN_TAB_NAMES.has(route.name)
	);
	const aiRoute = state.routes.find((route) => route.name === AI_TAB_NAME);
	const aiDescriptor = aiRoute ? descriptors[aiRoute.key] : null;
	const isAiFocused = focusedRoute.name === AI_TAB_NAME;
	const floatingTabWidth =
		mainRoutes.length * TAB_SLOT_WIDTH + TAB_BAR_HORIZONTAL_PADDING;

	if (isAiFocused) {
		return null;
	}

	return (
		<View
			pointerEvents="box-none"
			style={{
				alignItems: "center",
				bottom: Math.max(insets.bottom + 10, 24),
				flexDirection: "row",
				gap: 10,
				justifyContent: "center",
				left: 0,
				position: "absolute",
				right: 0,
			}}
		>
			<Surface
				className="flex-row items-center rounded-full border border-border bg-surface px-2 py-2"
				style={{
					borderRadius: TAB_BAR_RADIUS,
					width: floatingTabWidth,
				}}
			>
				{mainRoutes.map((route) => {
					const descriptor = descriptors[route.key];
					const options = descriptor.options;
					const isFocused = focusedRoute.key === route.key;
					const color = isFocused ? "#FFFFFF" : INACTIVE_TAB_COLOR;
					const tabBarIcon = options.tabBarIcon;

					const handlePress = () => {
						emitTabPress({ isFocused, navigation, route });
					};

					const handleLongPress = () => {
						emitTabLongPress({ navigation, route });
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
								className="items-center justify-center rounded-full"
								style={{
									backgroundColor: isFocused ? ACTIVE_TAB_COLOR : "transparent",
									borderRadius: ACTIVE_TAB_SIZE / 2,
									height: ACTIVE_TAB_SIZE,
									overflow: "hidden",
									width: ACTIVE_TAB_SIZE,
								}}
							>
								{tabBarIcon?.({ color, focused: isFocused, size: 20 })}
							</View>
						</Pressable>
					);
				})}
			</Surface>
			{aiRoute && aiDescriptor ? (
				<Surface
					className="items-center justify-center rounded-full border border-border bg-surface"
					style={{
						borderRadius: TAB_BAR_SIZE / 2,
						height: TAB_BAR_SIZE,
						width: TAB_BAR_SIZE,
					}}
				>
					<Pressable
						accessibilityLabel={aiDescriptor.options.tabBarAccessibilityLabel}
						accessibilityRole="button"
						accessibilityState={isAiFocused ? { selected: true } : undefined}
						className="h-12 w-12 items-center justify-center rounded-full"
						onLongPress={() => emitTabLongPress({ navigation, route: aiRoute })}
						onPress={() =>
							emitTabPress({
								isFocused: isAiFocused,
								navigation,
								params: { fromTab: focusedRoute.name },
								route: aiRoute,
							})
						}
						testID={aiDescriptor.options.tabBarButtonTestID}
					>
						<View
							className="items-center justify-center rounded-full"
							style={{
								backgroundColor: isAiFocused ? ACTIVE_TAB_COLOR : "transparent",
								borderRadius: (TAB_BAR_SIZE - 8) / 2,
								height: TAB_BAR_SIZE - 8,
								overflow: "hidden",
								width: TAB_BAR_SIZE - 8,
							}}
						>
							{aiDescriptor.options.tabBarIcon?.({
								color: isAiFocused ? "#FFFFFF" : INACTIVE_TAB_COLOR,
								focused: isAiFocused,
								size: 20,
							})}
						</View>
					</Pressable>
				</Surface>
			) : null}
		</View>
	);
}
