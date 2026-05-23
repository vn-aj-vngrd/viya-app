import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";

export default function TabLayout() {
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				headerStyle: {
					backgroundColor: themeColorBackground,
				},
				headerTintColor: themeColorForeground,
				headerTitleStyle: {
					color: themeColorForeground,
					fontWeight: "600",
				},
				tabBarStyle: {
					backgroundColor: themeColorBackground,
				},
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => (
						<Ionicons color={color} name="home" size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="trips"
				options={{
					title: "Trips",
					tabBarIcon: ({ color, size }) => (
						<Ionicons color={color} name="map" size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="viya"
				options={{
					title: "Viya",
					tabBarIcon: ({ color, size }) => (
						<Ionicons color={color} name="sparkles" size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="moments"
				options={{
					title: "Moments",
					tabBarIcon: ({ color, size }) => (
						<Ionicons color={color} name="images" size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color, size }) => (
						<Ionicons color={color} name="person" size={size} />
					),
				}}
			/>
		</Tabs>
	);
}
