import type { ImageStyle, StyleProp } from "react-native";
import { Image } from "react-native";

import viyaMarkBlackSource from "@/assets/images/viya-mark-black.png";
import viyaMarkBlueSource from "@/assets/images/viya-mark-blue.png";
import viyaMarkWhiteSource from "@/assets/images/viya-mark-white.png";

const viyaMarkSources = {
	black: viyaMarkBlackSource,
	blue: viyaMarkBlueSource,
	white: viyaMarkWhiteSource,
} as const;

type ViyaMarkVariant = keyof typeof viyaMarkSources;

interface ViyaMarkProps {
	size?: number;
	style?: StyleProp<ImageStyle>;
	variant?: ViyaMarkVariant;
}

export function ViyaMark({
	size = 40,
	style,
	variant = "blue",
}: ViyaMarkProps) {
	return (
		<Image
			accessibilityIgnoresInvertColors={true}
			source={viyaMarkSources[variant]}
			style={[
				{
					borderRadius: size * 0.23,
					height: size,
					width: size,
				},
				style,
			]}
		/>
	);
}
