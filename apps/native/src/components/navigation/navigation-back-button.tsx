import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";

interface NavigationBackButtonProps {
	accessibilityLabel?: string;
	className?: string;
	onPress: () => void;
}

export function NavigationBackButton({
	accessibilityLabel = "Go back",
	className,
	onPress,
}: NavigationBackButtonProps) {
	return (
		<NavigationIconButton
			accessibilityLabel={accessibilityLabel}
			className={className}
			icon="chevron-back"
			onPress={onPress}
		/>
	);
}
