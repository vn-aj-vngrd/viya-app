import { useAuth } from "@clerk/expo";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect, Stack, useSegments } from "expo-router";
import { View } from "react-native";

import { LoadingState, useUITheme } from "@/src/components/ui";

function AppLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const segments = useSegments();
	const routeSegments = segments as readonly string[];
	const { palette } = useUITheme();
	const preferences = useQuery(
		api.preferences.getCurrentPreferences,
		isLoaded && isSignedIn ? {} : "skip"
	);
	const isPreferenceOnboardingRoute =
		routeSegments.includes("onboarding") &&
		routeSegments.includes("preferences");

	if (!isLoaded) {
		return (
			<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
				<LoadingState delay={0} title="Loading" />
			</View>
		);
	}

	if (!isSignedIn) {
		return <Redirect href="/(auth)" />;
	}

	if (preferences === undefined) {
		return (
			<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
				<LoadingState delay={0} title="Loading" />
			</View>
		);
	}

	if (!(preferences || isPreferenceOnboardingRoute)) {
		return <Redirect href="/(app)/onboarding/preferences" />;
	}

	return (
		<Stack
			screenOptions={{
				contentStyle: { backgroundColor: palette.canvas },
				headerBackButtonDisplayMode: "minimal",
				headerShadowVisible: false,
				headerStyle: { backgroundColor: palette.canvas },
				headerTintColor: palette.ink,
				headerTitleStyle: {
					color: palette.ink,
					fontWeight: "600",
				},
			}}
		>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="ai" options={{ headerShown: false }} />
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
				name="trips/[tripId]/itinerary-day"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/bookings"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/places"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/readiness"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/budget"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/companions"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/notes"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/risks"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/travel-mode"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/moments"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/wrapped"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="trips/[tripId]/vault"
				options={{ headerShown: false }}
			/>
		</Stack>
	);
}

export default AppLayout;
