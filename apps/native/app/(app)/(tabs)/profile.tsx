import { useUser } from "@clerk/expo";
import { Surface, Text } from "heroui-native";
import { Image, View } from "react-native";

import { Container } from "@/components/container";
import { SignOutButton } from "@/components/sign-out-button";

export default function ProfileScreen() {
	const { user } = useUser();
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";

	return (
		<Container className="px-4 pb-28">
			<View className="gap-4 py-4">
				<View>
					<Text.Heading type="h2" weight="semibold">
						Profile
					</Text.Heading>
					<Text.Paragraph className="mt-1" color="muted" type="body-sm">
						Account and Viya preferences.
					</Text.Paragraph>
				</View>
				<Surface className="gap-4 rounded-[28px] border border-border bg-surface p-5">
					<View className="flex-row items-center gap-3">
						{user?.imageUrl ? (
							<Image
								className="h-14 w-14 rounded-2xl"
								source={{ uri: user.imageUrl }}
							/>
						) : (
							<View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary">
								<Text
									className="text-primary-foreground"
									type="h4"
									weight="semibold"
								>
									V
								</Text>
							</View>
						)}
						<View className="flex-1">
							<Text type="h5" weight="semibold">
								{user?.fullName ?? "Viya traveler"}
							</Text>
							<Text color="muted" type="body-sm">
								{primaryEmail}
							</Text>
						</View>
					</View>
					<Surface
						className="rounded-2xl bg-surface-secondary p-4"
						variant="secondary"
					>
						<Text type="body-sm" weight="semibold">
							Default preferences
						</Text>
						<Text.Paragraph
							className="mt-1 leading-5"
							color="muted"
							type="body-sm"
						>
							Balanced pace, mid-range budget, important readiness
							notifications, and one slower block per trip day.
						</Text.Paragraph>
					</Surface>
					<SignOutButton />
				</Surface>
			</View>
		</Container>
	);
}
