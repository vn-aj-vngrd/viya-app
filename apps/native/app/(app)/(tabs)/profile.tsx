import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Surface, Text } from "heroui-native";
import { Image, View } from "react-native";

import { Container } from "@/components/container";

function getInitials(name?: string | null) {
	if (!name) {
		return "V";
	}

	return name
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

export default function ProfileScreen() {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const displayName = user?.fullName ?? "Viya traveler";
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";

	const handleSignOutPress = async () => {
		await signOut();
		router.replace("/(auth)");
	};

	return (
		<Container className="px-4 pb-28">
			<View className="gap-5 py-4" style={{ alignSelf: "stretch" }}>
				<Text.Heading type="h2" weight="semibold">
					Profile
				</Text.Heading>

				<Surface className="gap-5 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row items-center gap-4">
						{user?.imageUrl ? (
							<Image
								accessibilityIgnoresInvertColors={true}
								className="h-16 w-16 rounded-full"
								source={{ uri: user.imageUrl }}
							/>
						) : (
							<View className="h-16 w-16 items-center justify-center rounded-full bg-foreground">
								<Text className="text-white" type="h5" weight="semibold">
									{getInitials(displayName)}
								</Text>
							</View>
						)}
						<View className="flex-1">
							<Text.Heading type="h4" weight="semibold">
								{displayName}
							</Text.Heading>
							<Text color="muted" type="body-sm">
								{primaryEmail}
							</Text>
						</View>
					</View>

					<View className="gap-3 rounded-3xl bg-surface-secondary p-4">
						<View className="flex-row items-center gap-3">
							<Ionicons color="#0A84FF" name="options-outline" size={18} />
							<Text type="body-sm" weight="semibold">
								Default preferences
							</Text>
						</View>
						<Text.Paragraph className="leading-5" color="muted" type="body-sm">
							Balanced pace, mid-range budget, important readiness alerts, and
							one slower block per trip day.
						</Text.Paragraph>
					</View>

					<Button onPress={handleSignOutPress} variant="secondary">
						<Ionicons color="#DC2626" name="log-out-outline" size={18} />
						<Button.Label>Sign out</Button.Label>
					</Button>
				</Surface>
			</View>
		</Container>
	);
}
