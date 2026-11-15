import { Image } from "expo-image";
import { View } from "react-native";

import { AppText, useUITheme } from "@/src/components/ui";

const LARGE_AVATAR_THRESHOLD = 60;

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

export function ProfileAvatar({
	imageUrl,
	name,
	size = 48,
}: {
	imageUrl?: string;
	name: string;
	size?: number;
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
				variant={size > LARGE_AVATAR_THRESHOLD ? "title" : "headline"}
			>
				{getInitials(name)}
			</AppText>
		</View>
	);
}
