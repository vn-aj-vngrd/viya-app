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
import { type ReactNode, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ViyaMark } from "@/src/components/viya-mark";

interface AccountAvatarButtonProps {
	size?: number;
}

interface AccountSheetRowProps {
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	isDisabled?: boolean;
	isLoading?: boolean;
	onPress?: () => void;
	showChevron?: boolean;
	title: string;
	tone?: "danger" | "default";
}

const preferenceRows = [
	{
		description: "Theme, font size, display",
		icon: "color-palette-outline",
		title: "Appearance",
	},
	{
		description: "Pace, budget, food, travel style",
		icon: "options-outline",
		title: "Travel preferences",
	},
	{
		description: "Alerts, reminders, trip updates",
		icon: "notifications-outline",
		title: "Notifications",
	},
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

function AccountSheetSection({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<View className="gap-2">
			<Text className="ml-2" color="muted" type="body-xs" weight="medium">
				{title}
			</Text>
			<ListGroup>{children}</ListGroup>
		</View>
	);
}

function AccountSheetRow({
	description,
	icon,
	isDisabled,
	isLoading,
	onPress,
	showChevron = true,
	title,
	tone = "default",
}: AccountSheetRowProps) {
	const [dangerColor, foregroundColor, mutedColor] = useThemeColor([
		"danger",
		"foreground",
		"muted",
	]);
	const isDanger = tone === "danger";
	const iconColor = isDanger ? dangerColor : foregroundColor;

	return (
		<ListGroup.Item
			accessibilityRole="button"
			className="px-4 py-4"
			disabled={isDisabled}
			onPress={onPress}
		>
			<ListGroup.ItemPrefix>
				<View className="h-8 w-8 items-center justify-center">
					{isLoading ? (
						<Spinner color={iconColor} size="sm" />
					) : (
						<Ionicons color={iconColor} name={icon} size={18} />
					)}
				</View>
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle className={isDanger ? "text-danger" : undefined}>
					{title}
				</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			{showChevron ? (
				<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
			) : null}
		</ListGroup.Item>
	);
}

function AccountProfileRow({
	displayName,
	imageUrl,
	primaryEmail,
}: {
	displayName: string;
	imageUrl?: string;
	primaryEmail: string;
}) {
	const mutedColor = useThemeColor("muted");

	return (
		<ListGroup.Item accessibilityRole="button" className="px-4 py-4">
			<ListGroup.ItemPrefix>
				<AccountAvatar imageUrl={imageUrl} name={displayName} size={40} />
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{displayName}</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>{primaryEmail}</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
		</ListGroup.Item>
	);
}

export function AccountAvatarButton({ size = 48 }: AccountAvatarButtonProps) {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const insets = useSafeAreaInsets();
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
								<View className="flex-row items-center gap-3">
									<ViyaMark size={28} />
									<BottomSheet.Title>Viya Account</BottomSheet.Title>
								</View>
								<CloseButton
									accessibilityLabel="Close account"
									className="bg-surface"
									onPress={() => setIsOpen(false)}
								/>
							</View>

							<AccountSheetSection title="Account">
								<AccountProfileRow
									displayName={displayName}
									imageUrl={user?.imageUrl}
									primaryEmail={primaryEmail}
								/>
								<Separator className="mx-4" />
								<AccountSheetRow
									description="FAQs, contact support, app feedback"
									icon="help-circle-outline"
									title="Help"
								/>
							</AccountSheetSection>

							<AccountSheetSection title="Preferences">
								{preferenceRows.map((row, index) => (
									<View key={row.title}>
										<AccountSheetRow {...row} />
										{index < preferenceRows.length - 1 ? (
											<Separator className="mx-4" />
										) : null}
									</View>
								))}
							</AccountSheetSection>

							<ListGroup>
								<AccountSheetRow
									description={
										isSigningOut
											? "Ending this session..."
											: "End this session on this device"
									}
									icon="log-out-outline"
									isDisabled={isSigningOut}
									isLoading={isSigningOut}
									onPress={handleSignOutPress}
									showChevron={false}
									title={isSigningOut ? "Signing out..." : "Sign out"}
									tone="danger"
								/>
							</ListGroup>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</>
	);
}
