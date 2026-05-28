import { useAuth } from "@clerk/expo";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect, Stack, useSegments } from "expo-router";
import { Spinner, useThemeColor } from "heroui-native";
import { View } from "react-native";

function AppLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const segments = useSegments();
	const routeSegments = segments as readonly string[];
	const themeColorForeground = useThemeColor("foreground");
	const themeColorBackground = useThemeColor("background");
	const preferences = useQuery(
		api.preferences.getCurrentPreferences,
		isLoaded && isSignedIn ? {} : "skip"
	);
	const isPreferenceOnboardingRoute =
		routeSegments.includes("onboarding") &&
		routeSegments.includes("preferences");

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

	if (preferences === undefined) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		);
	}

	if (!(preferences || isPreferenceOnboardingRoute)) {
		return <Redirect href="/(app)/onboarding/preferences" />;
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
			<Stack.Screen
				name="onboarding/preferences"
				options={{ headerShown: false }}
			/>
			<Stack.Screen name="trips/new" options={{ headerShown: false }} />
			<Stack.Screen
				name="trips/[tripId]/index"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/itinerary"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/bookings"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/readiness"
				options={{ headerShown: false }}
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
			<Stack.Screen
				name="trips/[tripId]/vault"
				options={{ headerShown: false }}
			/>
		</Stack>
	);
}

export default AppLayout;
