import type { ImageStyle, StyleProp } from "react-native";
import { Image } from "react-native";

import viyaMarkSource from "@/assets/images/viya-mark.png";

interface ViyaMarkProps {
	size?: number;
	style?: StyleProp<ImageStyle>;
}

export function ViyaMark({ size = 40, style }: ViyaMarkProps) {
	return (
		<Image
			accessibilityIgnoresInvertColors={true}
			source={viyaMarkSource}
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
