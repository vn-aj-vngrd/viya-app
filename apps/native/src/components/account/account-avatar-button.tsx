import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	BottomSheet,
	CloseButton,
	ListGroup,
	Separator,
	Spinner,
	Text,
	useThemeColor,
} from "heroui-native";
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
	const [accentColor, mutedColor] = useThemeColor(["accent", "muted"]);

	return (
		<ListGroup.Item accessibilityRole="button" className="px-5 py-4">
			<ListGroup.ItemPrefix>
				<View className="h-8 w-8 items-center justify-center rounded-full bg-accent-soft">
					<Ionicons color={accentColor} name={icon} size={17} />
				</View>
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{label}</ListGroup.ItemTitle>
			</ListGroup.ItemContent>
			{value ? (
				<Text color="muted" type="body-sm">
					{value}
				</Text>
			) : null}
			<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
		</ListGroup.Item>
	);
}

export function AccountAvatarButton({ size = 48 }: AccountAvatarButtonProps) {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [dangerColor, mutedColor] = useThemeColor(["danger", "muted"]);
	const [isOpen, setIsOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const displayName = user?.fullName ?? "Viya traveler";
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";

	const handleSignOutPress = async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			await signOut();
			setIsOpen(false);
			router.replace("/(auth)");
		} finally {
			setIsSigningOut(false);
		}
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
						backgroundClassName="rounded-t-[36px] bg-background"
						enablePanDownToClose={true}
					>
						<View
							className="gap-5 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							<View className="flex-row items-center justify-between">
								<BottomSheet.Title>Account</BottomSheet.Title>
								<CloseButton
									accessibilityLabel="Close account"
									className="bg-default"
									onPress={() => setIsOpen(false)}
								/>
							</View>

							<ListGroup className="rounded-[30px] border border-border bg-surface shadow-none">
								<ListGroup.Item
									accessibilityRole="button"
									className="px-5 py-4"
								>
									<ListGroup.ItemPrefix>
										<AccountAvatar
											imageUrl={user?.imageUrl}
											name={displayName}
											size={64}
										/>
									</ListGroup.ItemPrefix>
									<ListGroup.ItemContent>
										<ListGroup.ItemTitle className="font-semibold text-xl">
											{displayName}
										</ListGroup.ItemTitle>
										<ListGroup.ItemDescription>
											{primaryEmail}
										</ListGroup.ItemDescription>
									</ListGroup.ItemContent>
									<ListGroup.ItemSuffix
										iconProps={{ color: mutedColor, size: 22 }}
									/>
								</ListGroup.Item>
							</ListGroup>

							<ListGroup className="rounded-[30px] border border-border bg-surface shadow-none">
								{accountRows.map((row, index) => (
									<View key={row.label}>
										<AccountSheetRow {...row} />
										{index < accountRows.length - 1 ? (
											<Separator className="ml-16 bg-border" />
										) : null}
									</View>
								))}
							</ListGroup>

							<ListGroup className="rounded-[30px] border border-border bg-surface shadow-none">
								<ListGroup.Item
									accessibilityRole="button"
									className="px-5 py-4"
									disabled={isSigningOut}
									onPress={handleSignOutPress}
								>
									<ListGroup.ItemPrefix>
										<View className="h-8 w-8 items-center justify-center rounded-full bg-danger-soft">
											{isSigningOut ? (
												<Spinner color={dangerColor} size="sm" />
											) : (
												<Ionicons
													color={dangerColor}
													name="log-out-outline"
													size={17}
												/>
											)}
										</View>
									</ListGroup.ItemPrefix>
									<ListGroup.ItemContent>
										<ListGroup.ItemTitle className="text-danger">
											{isSigningOut ? "Signing out..." : "Sign out"}
										</ListGroup.ItemTitle>
									</ListGroup.ItemContent>
								</ListGroup.Item>
							</ListGroup>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</>
	);
}
