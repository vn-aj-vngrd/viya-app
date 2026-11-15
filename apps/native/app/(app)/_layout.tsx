import { useAuth } from "@clerk/expo";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect, Stack, useSegments } from "expo-router";
import { View } from "react-native";

import {
	LoadingState,
	useShellScreenOptions,
	useUITheme,
} from "@/src/components/ui";

function AppLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const segments = useSegments();
	const routeSegments = segments as readonly string[];
	const { palette } = useUITheme();
	const screenOptions = useShellScreenOptions();
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
		<Stack screenOptions={screenOptions}>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="ai" options={{ presentation: "fullScreenModal" }} />
			<Stack.Screen
				name="onboarding/preferences"
				options={{
					animation: "fade",
					gestureEnabled: false,
					presentation: "fullScreenModal",
				}}
			/>
			<Stack.Screen
				name="trips/new"
				options={{ presentation: "fullScreenModal" }}
			/>
			<Stack.Screen
				name="trips/[tripId]/travel-mode"
				options={{ presentation: "fullScreenModal" }}
			/>
		</Stack>
	);
}

export default AppLayout;
