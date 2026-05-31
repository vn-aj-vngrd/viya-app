import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

export default function SsoCallbackScreen() {
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Spinner />
			</View>
		);
	}

	if (isSignedIn) {
		return <Redirect href="/(app)/(tabs)" />;
	}

	return <Redirect href="/(auth)" />;
}
