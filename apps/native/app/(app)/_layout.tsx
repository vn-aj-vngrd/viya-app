import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { Spinner, useThemeColor } from "heroui-native";
import { View } from "react-native";

function AppLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");

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
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: themeColorBackground },
				headerBackTitle: "Back",
				headerShadowVisible: false,
				headerStyle: { backgroundColor: themeColorBackground },
				headerTintColor: themeColorForeground,
				headerTitleStyle: {
					color: themeColorForeground,
					fontWeight: "600",
				},
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="ai" options={{ title: "Viya" }} />
			<Stack.Screen name="trips/[tripId]/index" options={{ title: "Trip" }} />
			<Stack.Screen
				name="trips/[tripId]/itinerary"
				options={{ title: "Itinerary" }}
			/>
			<Stack.Screen
				name="trips/[tripId]/readiness"
				options={{ title: "Readiness" }}
			/>
			<Stack.Screen name="trips/[tripId]/risks" options={{ title: "Risks" }} />
			<Stack.Screen
				name="trips/[tripId]/travel-mode"
				options={{ title: "Travel Mode" }}
			/>
			<Stack.Screen
				name="trips/[tripId]/moments"
				options={{ title: "Moments" }}
			/>
			<Stack.Screen
				name="trips/[tripId]/wrapped"
				options={{ title: "Trip Story" }}
			/>
			<Stack.Screen name="trips/[tripId]/vault" options={{ title: "Vault" }} />
		</Stack>
	);
}

export default AppLayout;
