import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { AppText } from "./app-text";
import type { IconName } from "./icon";
import { PressableScale } from "./pressable-scale";
import { metrics, radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

interface ButtonBaseProps {
	accessibilityLabel?: string;
	className?: string;
	disabled?: boolean;
	/** Stretch to the parent width. Default true. */
	fullWidth?: boolean;
	icon?: IconName;
	/** Async work in flight: spinner replaces the label, size and disabled kept. */
	isPending?: boolean;
	label: string;
	onPress: () => void;
}

export interface PrimaryButtonProps extends ButtonBaseProps {
	/** Destructive confirm: red fill. */
	destructive?: boolean;
}

export interface SecondaryButtonProps extends ButtonBaseProps {
	/** "fill" = quiet gray pill (default); "plain" = text only. */
	variant?: "fill" | "plain";
}

interface ButtonShellProps extends ButtonBaseProps {
	background: string;
	foreground: string;
}

function ButtonShell({
	accessibilityLabel,
	background,
	className,
	disabled,
	foreground,
	fullWidth = true,
	icon,
	isPending,
	label,
	onPress,
}: ButtonShellProps) {
	const inactive = Boolean(disabled) || Boolean(isPending);

	return (
		<PressableScale
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ busy: Boolean(isPending), disabled: inactive }}
			className={className}
			disabled={inactive}
			onPress={onPress}
			style={{
				alignItems: "center",
				alignSelf: fullWidth ? "stretch" : "flex-start",
				backgroundColor: background,
				borderRadius: radius.pill,
				height: metrics.actionHeight,
				justifyContent: "center",
				opacity: disabled && !isPending ? 0.4 : 1,
				paddingHorizontal: spacing.section,
			}}
		>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.sm,
					opacity: isPending ? 0 : 1,
				}}
			>
				{icon ? <Ionicons color={foreground} name={icon} size={20} /> : null}
				<AppText
					numberOfLines={1}
					style={{ color: foreground, fontWeight: "600" }}
				>
					{label}
				</AppText>
			</View>
			{isPending ? (
				<View
					pointerEvents="none"
					style={{
						alignItems: "center",
						bottom: 0,
						justifyContent: "center",
						left: 0,
						position: "absolute",
						right: 0,
						top: 0,
					}}
				>
					<ActivityIndicator color={foreground} />
				</View>
			) : null}
		</PressableScale>
	);
}

/** Solid ink pill, 50pt. One per screen/footer. */
export function PrimaryButton({ destructive, ...props }: PrimaryButtonProps) {
	const { palette } = useUITheme();

	return (
		<ButtonShell
			{...props}
			background={destructive ? palette.danger : palette.ink}
			foreground={destructive ? "#FFFFFF" : palette.onPrimary}
		/>
	);
}

/** Quiet pill (or plain text) for secondary actions, 50pt. */
export function SecondaryButton({
	variant = "fill",
	...props
}: SecondaryButtonProps) {
	const { palette } = useUITheme();

	return (
		<ButtonShell
			{...props}
			background={variant === "fill" ? palette.fill : "transparent"}
			foreground={variant === "fill" ? palette.ink : palette.accent}
		/>
	);
}
