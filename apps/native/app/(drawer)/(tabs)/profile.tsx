import { useUser } from "@clerk/expo";
import { Surface } from "heroui-native";
import { Image, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignOutButton } from "@/components/sign-out-button";

export default function ProfileScreen() {
	const { user } = useUser();
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";

	return (
		<Container className="px-4 pb-4">
			<View className="gap-4 py-4">
				<View>
					<Text className="font-semibold text-3xl text-foreground">
						Profile
					</Text>
					<Text className="mt-1 text-muted text-sm">
						Account and Viya preferences.
					</Text>
				</View>
				<Surface className="gap-4 rounded-lg p-4" variant="secondary">
					<View className="flex-row items-center gap-3">
						{user?.imageUrl ? (
							<Image
								className="h-14 w-14 rounded-lg"
								source={{ uri: user.imageUrl }}
							/>
						) : (
							<View className="h-14 w-14 items-center justify-center rounded-lg bg-primary">
								<Text className="font-semibold text-primary-foreground text-xl">
									V
								</Text>
							</View>
						)}
						<View className="flex-1">
							<Text className="font-semibold text-foreground text-lg">
								{user?.fullName ?? "Viya traveler"}
							</Text>
							<Text className="text-muted text-sm">{primaryEmail}</Text>
						</View>
					</View>
					<View className="rounded-lg bg-content2 p-3">
						<Text className="font-semibold text-foreground text-sm">
							Default preferences
						</Text>
						<Text className="mt-1 text-muted text-sm leading-5">
							Balanced pace, mid-range budget, important readiness
							notifications, and one slower block per trip day.
						</Text>
					</View>
					<SignOutButton />
				</Surface>
			</View>
		</Container>
	);
}
