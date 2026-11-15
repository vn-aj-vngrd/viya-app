import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

import { LoadingState, useUITheme } from "@/src/components/ui";

export default function AuthRoutesLayout() {
	const { isLoaded, isSignedIn } = useAuth();
	const { palette } = useUITheme();

	if (!isLoaded) {
		return (
			<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
				<LoadingState delay={0} title="Loading" />
			</View>
		);
	}

	if (isSignedIn) {
		return <Redirect href="/(app)/(tabs)/(discover)" />;
	}

	return (
		<Stack
			screenOptions={{
				animation: "fade",
				contentStyle: { backgroundColor: palette.canvas },
				headerShown: false,
			}}
		/>
	);
}
