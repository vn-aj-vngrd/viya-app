import { Text, View } from "react-native";

interface AuthBrandProps {
	align?: "center" | "left";
	subtitle?: string;
}

export function AuthBrand({ align = "left", subtitle }: AuthBrandProps) {
	const isCentered = align === "center";

	return (
		<View className={isCentered ? "items-center gap-2" : "items-start gap-2"}>
			<Text className="font-semibold text-5xl text-foreground">Viya</Text>
			{subtitle ? (
				<Text
					className={
						isCentered
							? "max-w-xs text-center text-base text-muted leading-6"
							: "text-base text-muted"
					}
				>
					{subtitle}
				</Text>
			) : null}
		</View>
	);
}
