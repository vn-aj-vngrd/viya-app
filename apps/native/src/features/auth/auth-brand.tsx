import { Text } from "heroui-native";
import { View } from "react-native";

interface AuthBrandProps {
	align?: "center" | "left";
	subtitle?: string;
}

export function AuthBrand({ align = "left", subtitle }: AuthBrandProps) {
	const isCentered = align === "center";

	return (
		<View className={isCentered ? "items-center gap-2" : "items-start gap-2"}>
			<Text.Heading className="text-5xl" type="h1" weight="semibold">
				Viya
			</Text.Heading>
			{subtitle ? (
				<Text.Paragraph
					className={isCentered ? "max-w-xs text-center leading-6" : undefined}
					color="muted"
					type="body"
				>
					{subtitle}
				</Text.Paragraph>
			) : null}
		</View>
	);
}
