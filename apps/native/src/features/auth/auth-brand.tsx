import { View } from "react-native";
import { AppText, spacing } from "@/src/components/ui";
import { ViyaMark } from "@/src/components/viya-mark";

interface AuthBrandProps {
	align?: "center" | "left";
	subtitle?: string;
}

export function AuthBrand({ align = "left", subtitle }: AuthBrandProps) {
	const isCentered = align === "center";

	return (
		<View
			style={{
				alignItems: isCentered ? "center" : "flex-start",
				gap: spacing.sm,
			}}
		>
			<ViyaMark size={isCentered ? 64 : 48} />
			<AppText accessibilityRole="header" variant="largeTitle">
				Viya
			</AppText>
			{subtitle ? (
				<AppText
					style={{ maxWidth: 280, textAlign: isCentered ? "center" : "left" }}
					tone="secondary"
				>
					{subtitle}
				</AppText>
			) : null}
		</View>
	);
}
