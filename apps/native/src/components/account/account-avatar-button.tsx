import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BottomSheet, Text } from "heroui-native";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AccountAvatarButtonProps {
	size?: number;
}

interface AccountSheetRowProps {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	value?: string;
}

const accountRows = [
	{ icon: "person-outline", label: "Account info" },
	{ icon: "options-outline", label: "Travel preferences" },
	{ icon: "notifications-outline", label: "Notifications" },
	{ icon: "help-circle-outline", label: "Help" },
] as const satisfies readonly AccountSheetRowProps[];

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

function AccountAvatar({
	imageUrl,
	name,
	size,
}: {
	imageUrl?: string;
	name?: string | null;
	size: number;
}) {
	const borderRadius = size / 2;

	if (imageUrl) {
		return (
			<Image
				accessibilityIgnoresInvertColors={true}
				source={{ uri: imageUrl }}
				style={{ borderRadius, height: size, width: size }}
			/>
		);
	}

	return (
		<View
			className="items-center justify-center bg-foreground"
			style={{ borderRadius, height: size, width: size }}
		>
			<Text className="text-white" type="body-sm" weight="semibold">
				{getInitials(name)}
			</Text>
		</View>
	);
}

function AccountSheetRow({ icon, label, value }: AccountSheetRowProps) {
	return (
		<Pressable
			accessibilityRole="button"
			className="flex-row items-center gap-3 px-1 py-4"
		>
			<View className="h-8 w-8 items-center justify-center rounded-full bg-surface-secondary">
				<Ionicons color="#0A84FF" name={icon} size={17} />
			</View>
			<Text className="flex-1" type="body" weight="medium">
				{label}
			</Text>
			{value ? (
				<Text color="muted" type="body-sm">
					{value}
				</Text>
			) : null}
			<Ionicons color="#C7C7CC" name="chevron-forward" size={18} />
		</Pressable>
	);
}

export function AccountAvatarButton({ size = 48 }: AccountAvatarButtonProps) {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [isOpen, setIsOpen] = useState(false);
	const displayName = user?.fullName ?? "Viya traveler";
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";

	const handleSignOutPress = async () => {
		setIsOpen(false);
		await signOut();
		router.replace("/(auth)");
	};

	return (
		<>
			<Pressable
				accessibilityLabel="Open account"
				accessibilityRole="button"
				className="items-center justify-center rounded-full"
				onPress={() => setIsOpen(true)}
				style={{
					boxShadow: "0 10px 22px rgba(15, 23, 42, 0.12)",
					height: size,
					width: size,
				}}
			>
				<AccountAvatar
					imageUrl={user?.imageUrl}
					name={displayName}
					size={size}
				/>
			</Pressable>

			<BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[40px] bg-[#F2F2F7]"
						enablePanDownToClose={true}
					>
						<View
							className="gap-6 px-5 pt-4"
							style={{ paddingBottom: Math.max(insets.bottom, 22) }}
						>
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center gap-3">
									<View className="h-8 w-8 items-center justify-center rounded-full bg-white">
										<Ionicons color="#0A84FF" name="sparkles" size={17} />
									</View>
									<Text.Heading type="h3" weight="semibold">
										Viya Account
									</Text.Heading>
								</View>
								<Pressable
									accessibilityLabel="Close account"
									accessibilityRole="button"
									className="h-14 w-14 items-center justify-center rounded-full bg-white"
									onPress={() => setIsOpen(false)}
									style={{ boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)" }}
								>
									<Ionicons color="#18181B" name="close" size={28} />
								</Pressable>
							</View>

							<View className="overflow-hidden rounded-[30px] bg-white px-5 py-4">
								<View className="flex-row items-center gap-4 py-1">
									<AccountAvatar
										imageUrl={user?.imageUrl}
										name={displayName}
										size={64}
									/>
									<View className="flex-1">
										<Text.Heading type="h4" weight="semibold">
											{displayName}
										</Text.Heading>
										<Text color="muted" type="body-sm">
											{primaryEmail}
										</Text>
									</View>
									<Ionicons color="#C7C7CC" name="chevron-forward" size={22} />
								</View>
							</View>

							<View className="overflow-hidden rounded-[30px] bg-white px-5">
								{accountRows.map((row, index) => (
									<View key={row.label}>
										<AccountSheetRow {...row} />
										{index < accountRows.length - 1 ? (
											<View className="ml-11 h-px bg-border" />
										) : null}
									</View>
								))}
							</View>

							<View className="overflow-hidden rounded-[30px] bg-white px-5">
								<Pressable
									accessibilityRole="button"
									className="flex-row items-center gap-3 py-4"
									onPress={handleSignOutPress}
								>
									<View className="h-8 w-8 items-center justify-center rounded-full bg-red-50">
										<Ionicons
											color="#DC2626"
											name="log-out-outline"
											size={17}
										/>
									</View>
									<Text className="text-red-600" type="body" weight="medium">
										Sign out
									</Text>
								</Pressable>
							</View>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</>
	);
}
