import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

import { EmptyState, useUITheme } from "@/src/components/ui";

export default function NotFoundScreen() {
	const router = useRouter();
	const { palette } = useUITheme();

	return (
		<>
			<Stack.Screen options={{ headerShown: false, title: "Not Found" }} />
			<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
				<EmptyState
					action={{
						label: "Go Home",
						onPress: () => router.replace("/"),
					}}
					description="The page you're looking for doesn't exist."
					icon="compass-outline"
					title="Page Not Found"
				/>
			</View>
		</>
	);
}
