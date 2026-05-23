import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";

export const SignOutButton = () => {
	const { signOut } = useClerk();
	const router = useRouter();

	const handleSignOut = async () => {
		await signOut();
		router.replace("/(auth)");
	};

	return (
		<Button onPress={handleSignOut} size="sm" variant="ghost">
			<Button.Label>Sign out</Button.Label>
		</Button>
	);
};
