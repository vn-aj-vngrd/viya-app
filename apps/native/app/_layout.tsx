import "@/polyfills";
import "@/global.css";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { env } from "@viya-app/env/native";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { FeedbackProvider, useUITheme } from "@/src/components/ui";

export const unstable_settings = {
	initialRouteName: "(app)",
};

const convex = new ConvexReactClient(env.EXPO_PUBLIC_CONVEX_URL, {
	unsavedChangesWarning: false,
});

function StackLayout() {
	const { isDark, palette } = useUITheme();
	const navigationTheme = {
		...(isDark ? DarkTheme : DefaultTheme),
		colors: {
			...(isDark ? DarkTheme : DefaultTheme).colors,
			background: palette.canvas,
			border: palette.separator,
			card: palette.canvas,
			notification: palette.danger,
			primary: palette.accent,
			text: palette.ink,
		},
	};

	return (
		<ThemeProvider value={navigationTheme}>
			<View className="flex-1" style={{ backgroundColor: palette.canvas }}>
				<StatusBar style={isDark ? "light" : "dark"} />
				<Stack
					screenOptions={{
						contentStyle: { backgroundColor: palette.canvas },
					}}
				>
					<Stack.Screen name="(app)" options={{ headerShown: false }} />
					<Stack.Screen
						name="(auth)"
						options={{
							animation: "fade",
							gestureEnabled: false,
							headerShown: false,
						}}
					/>
				</Stack>
			</View>
		</ThemeProvider>
	);
}

export default function Layout() {
	return (
		<ClerkProvider
			publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
			tokenCache={tokenCache}
		>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				<GestureHandlerRootView style={{ flex: 1 }}>
					<KeyboardProvider>
						<AppThemeProvider>
							<HeroUINativeProvider>
								<FeedbackProvider>
									<StackLayout />
								</FeedbackProvider>
							</HeroUINativeProvider>
						</AppThemeProvider>
					</KeyboardProvider>
				</GestureHandlerRootView>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
