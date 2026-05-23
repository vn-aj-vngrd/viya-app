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

function FloatingAiIcon({
	color,
	focused,
}: Omit<FloatingTabIconProps, "name">) {
	return (
		<Ionicons
			color={focused ? "#FFFFFF" : color}
			name="sparkles"
			size={focused ? 21 : 20}
		/>
	);
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
					title: "Ask Viya",
					tabBarIcon: ({ color, focused }) => (
						<FloatingAiIcon color={color} focused={focused} />
					),
				}}
			/>
			<Tabs.Screen
				name="moments"
				options={{
					href: null,
				}}
			/>
			<Tabs.Screen name="profile" options={{ href: null }} />
			<Tabs.Screen name="vault" options={{ href: null }} />
		</Tabs>
	);
}
