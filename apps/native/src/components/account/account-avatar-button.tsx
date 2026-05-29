import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Text } from "heroui-native";
import { Image, Pressable, View } from "react-native";

import { VIYA_ROUTES } from "@/src/constants/routes";

interface AccountAvatarButtonProps {
	size?: number;
}

const avatarButtonShadowStyle = {
	boxShadow: "0 10px 22px rgba(15, 23, 42, 0.12)",
} as const;

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

export function AccountAvatarButton({ size = 48 }: AccountAvatarButtonProps) {
	const { user } = useUser();
	const router = useRouter();
	const displayName = user?.fullName ?? "Viya traveler";

	return (
		<Pressable
			accessibilityLabel="Open profile"
			accessibilityRole="button"
			className="items-center justify-center rounded-full"
			onPress={() => router.push(VIYA_ROUTES.profile)}
			style={({ pressed }) => ({
				...avatarButtonShadowStyle,
				height: size,
				transform: [{ scale: pressed ? 0.97 : 1 }],
				width: size,
			})}
		>
			<AccountAvatar imageUrl={user?.imageUrl} name={displayName} size={size} />
		</Pressable>
	);
}
