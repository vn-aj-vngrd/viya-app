import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Image, View } from "react-native";

import { AppText, PressableScale, useUITheme } from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";

interface AccountAvatarButtonProps {
	size?: number;
}

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
	const { palette } = useUITheme();
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
			style={{
				alignItems: "center",
				backgroundColor: palette.ink,
				borderRadius,
				height: size,
				justifyContent: "center",
				width: size,
			}}
		>
			<AppText
				bold={true}
				style={{ color: palette.onPrimary }}
				variant="subhead"
			>
				{getInitials(name)}
			</AppText>
		</View>
	);
}

export function AccountAvatarButton({ size = 44 }: AccountAvatarButtonProps) {
	const { user } = useUser();
	const router = useRouter();
	const displayName = user?.fullName ?? "Viya traveler";
	const dimension = Math.max(size, 44);

	return (
		<PressableScale
			accessibilityLabel="Open profile"
			accessibilityRole="button"
			onPress={() => router.push(VIYA_ROUTES.profile)}
			style={{
				alignItems: "center",
				height: dimension,
				justifyContent: "center",
				width: dimension,
			}}
		>
			<AccountAvatar imageUrl={user?.imageUrl} name={displayName} size={size} />
		</PressableScale>
	);
}
