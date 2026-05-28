import { Ionicons } from "@expo/vector-icons";
import { Button, cn, useThemeColor } from "heroui-native";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

interface NavigationIconButtonProps {
	accessibilityLabel: string;
	className?: string;
	icon: IconName;
	iconColor?: string;
	onPress: () => void;
}

export function NavigationIconButton({
	accessibilityLabel,
	className,
	icon,
	iconColor,
	onPress,
}: NavigationIconButtonProps) {
	const foregroundColor = useThemeColor("foreground");

	return (
		<Button
			accessibilityLabel={accessibilityLabel}
			className={cn(
				"h-11 w-11 rounded-full border border-border bg-surface",
				className
			)}
			isIconOnly={true}
			onPress={onPress}
			size="md"
			variant="secondary"
		>
			<Ionicons color={iconColor ?? foregroundColor} name={icon} size={22} />
		</Button>
	);
}
