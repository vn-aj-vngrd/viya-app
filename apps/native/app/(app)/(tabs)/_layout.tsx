import { Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { FloatingTabBar } from "@/src/components/navigation/floating-tab-bar";

type TabIconName = ComponentProps<typeof Feather>["name"];

interface FloatingTabIconProps {
	color: ColorValue;
	focused: boolean;
	name: TabIconName;
}

function FloatingTabIcon({ color, focused, name }: FloatingTabIconProps) {
	return <Feather color={focused ? "#FFFFFF" : color} name={name} size={19} />;
}

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarShowLabel: false,
			}}
			tabBar={(props) => <FloatingTabBar {...props} />}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, focused }) => (
						<FloatingTabIcon color={color} focused={focused} name="home" />
					),
				}}
			/>
			<Tabs.Screen
				name="trips"
				options={{
					title: "Trips",
					tabBarIcon: ({ color, focused }) => (
						<FloatingTabIcon color={color} focused={focused} name="map" />
					),
				}}
			/>
			<Tabs.Screen
				name="viya"
				options={{
					title: "Viya",
					tabBarIcon: ({ color, focused }) => (
						<Ionicons
							color={focused ? "#FFFFFF" : color}
							name="sparkles-outline"
							size={20}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="moments"
				options={{
					title: "Moments",
					tabBarIcon: ({ color, focused }) => (
						<FloatingTabIcon color={color} focused={focused} name="image" />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: "Profile",
					tabBarIcon: ({ color, focused }) => (
						<FloatingTabIcon color={color} focused={focused} name="user" />
					),
				}}
			/>
		</Tabs>
	);
}
