import {
	GlassIconButton,
	type IconName,
} from "@/src/components/ui/glass-icon-button";

interface NavigationIconButtonProps {
	accessibilityLabel: string;
	className?: string;
	icon: IconName;
	iconColor?: string;
	onPress: () => void;
}

/** Glass round icon button for route headers (44pt). */
export function NavigationIconButton({
	accessibilityLabel,
	className,
	icon,
	iconColor,
	onPress,
}: NavigationIconButtonProps) {
	return (
		<GlassIconButton
			accessibilityLabel={accessibilityLabel}
			className={className}
			icon={icon}
			iconColor={iconColor}
			onPress={onPress}
		/>
	);
}
