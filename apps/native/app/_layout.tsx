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
import { OTAUpdateBanner } from "@/shared/components/common/ota-update-banner";

export const unstable_settings = {
	initialRouteName: "(app)",
};

const convex = new ConvexReactClient(env.EXPO_PUBLIC_CONVEX_URL, {
	unsavedChangesWarning: false,
});

const APP_SCREEN_BACKGROUND = "#F5F5F5";

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
				<Stack.Screen name="sso-callback" options={{ headerShown: false }} />
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
				<GestureHandlerRootView
					style={{ backgroundColor: APP_SCREEN_BACKGROUND, flex: 1 }}
				>
					<KeyboardProvider>
						<AppThemeProvider>
							<HeroUINativeProvider>
								<StackLayout />
								<OTAUpdateBanner />
							</HeroUINativeProvider>
						</AppThemeProvider>
					</KeyboardProvider>
				</GestureHandlerRootView>
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}
