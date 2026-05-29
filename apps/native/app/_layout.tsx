import "@/polyfills";
import "@/global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { env } from "@viya-app/env/native";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";

export const unstable_settings = {
	initialRouteName: "(app)",
};

const convex = new ConvexReactClient(env.EXPO_PUBLIC_CONVEX_URL, {
	unsavedChangesWarning: false,
});

function StackLayout() {
	const themeColorBackground = useThemeColor("background");

	return (
		<View className="flex-1" style={{ backgroundColor: themeColorBackground }}>
			<Stack
				screenOptions={{
					contentStyle: { backgroundColor: themeColorBackground },
				}}
			>
				<Stack.Screen name="(app)" options={{ headerShown: false }} />
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
				<Stack.Screen
					name="modal"
					options={{ title: "Modal", presentation: "modal" }}
				/>
			</Stack>
		</View>
	);
}

export default function Layout() {
	return (
		<ClerkProvider
			publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
			tokenCache={tokenCache}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<GestureHandlerRootView style={{ backgroundColor: "#F4F4F5", flex: 1 }}>
					<KeyboardProvider>
						<AppThemeProvider>
							<HeroUINativeProvider>
								<StackLayout />
							</HeroUINativeProvider>
						</AppThemeProvider>
					</KeyboardProvider>
				</GestureHandlerRootView>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
