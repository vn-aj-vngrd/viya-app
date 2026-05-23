import { useAuth } from "@clerk/expo";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Spinner, useThemeColor } from "heroui-native";
import { useCallback } from "react";
import { Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

function DrawerLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");

	const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

	if (!isLoaded) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		);
	}

	if (!isSignedIn) {
		return <Redirect href="/(auth)" />;
	}

	return (
		<Drawer
			screenOptions={{
				headerTintColor: themeColorForeground,
				headerStyle: { backgroundColor: themeColorBackground },
				headerTitleStyle: {
					fontWeight: "600",
					color: themeColorForeground,
				},
				headerRight: renderThemeToggle,
				drawerStyle: { backgroundColor: themeColorBackground },
			}}
		>
			<Drawer.Screen
				name="index"
				options={{
					headerTitle: "Viya",
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : themeColorForeground }}>
							Home
						</Text>
					),
					drawerIcon: ({ size, color, focused }) => (
						<Ionicons
							color={focused ? color : themeColorForeground}
							name="home-outline"
							size={size}
						/>
					),
				}}
			/>
			<Drawer.Screen
				name="(tabs)"
				options={{
					headerTitle: "Viya",
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : themeColorForeground }}>
							Workspace
						</Text>
					),
					drawerIcon: ({ size, color, focused }) => (
						<MaterialIcons
							color={focused ? color : themeColorForeground}
							name="dashboard"
							size={size}
						/>
					),
				}}
			/>
			<Drawer.Screen
				name="ai"
				options={{
					headerTitle: "Viya AI",
					drawerLabel: ({ color, focused }) => (
						<Text style={{ color: focused ? color : themeColorForeground }}>
							Viya AI
						</Text>
					),
					drawerIcon: ({ size, color, focused }) => (
						<Ionicons
							color={focused ? color : themeColorForeground}
							name="chatbubble-ellipses-outline"
							size={size}
						/>
					),
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/index"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Trip",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/itinerary"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Itinerary",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/readiness"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Readiness",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/risks"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Risks",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/travel-mode"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Travel Mode",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/moments"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Moments",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/wrapped"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Wrapped",
				}}
			/>
			<Drawer.Screen
				name="trips/[tripId]/vault"
				options={{
					drawerItemStyle: { display: "none" },
					headerTitle: "Viya Vault",
				}}
			/>
		</Drawer>
	);
}

export default DrawerLayout;
