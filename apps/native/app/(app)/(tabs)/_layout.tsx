import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { FloatingTabBar } from "@/src/components/navigation/floating-tab-bar";
import { useUITheme } from "@/src/components/ui";

type TabIconName = ComponentProps<typeof Feather>["name"];

interface FloatingTabIconProps {
	color: ColorValue;
	focused: boolean;
	name: TabIconName;
}

function FloatingTabIcon({ color, focused, name }: FloatingTabIconProps) {
	return <Feather color={color} name={name} size={focused ? 21 : 20} />;
}

function FloatingAiIcon({ color }: Pick<FloatingTabIconProps, "color">) {
	return <Feather color={color} name="message-circle" size={24} />;
}

export default function TabLayout() {
	const { palette } = useUITheme();

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				sceneStyle: { backgroundColor: palette.canvas },
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
					tabBarIcon: ({ color }) => <FloatingAiIcon color={color} />,
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
			<Tabs.Screen
				name="moments"
				options={{
					href: null,
				}}
			/>
			<Tabs.Screen name="vault" options={{ href: null }} />
		</Tabs>
	);
}
