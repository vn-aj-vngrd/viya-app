import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "./app-text";
import { SecondaryButton } from "./buttons";
import type { IconName } from "./glass-icon-button";
import { spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface EmptyStateProps {
	/** Prefer none: the message should name the control that fills the page. */
	action?: {
		label: string;
		onPress?: () => void;
		startContent?: ReactNode;
		variant?: "primary" | "secondary";
	};
	className?: string;
	description: string;
	icon?: IconName;
	title: string;
	/** Replaces the icon (illustration, avatar). */
	visual?: ReactNode;
}

/** Centered symbol, title and one line. Same position as LoadingState. */
export function EmptyState({
	action,
	className,
	description,
	icon = "search",
	title,
	visual,
}: EmptyStateProps) {
	const { palette } = useUITheme();

	return (
		<View
			className={className}
			style={{
				alignItems: "center",
				flex: 1,
				gap: spacing.sm,
				justifyContent: "center",
				paddingHorizontal: spacing["2xl"],
				paddingVertical: spacing["3xl"],
			}}
		>
			{visual ?? <Ionicons color={palette.inkTertiary} name={icon} size={34} />}
			<AppText
				accessibilityRole="header"
				style={{ marginTop: spacing.xs, textAlign: "center" }}
				variant="headline"
			>
				{title}
			</AppText>
			<AppText
				style={{ maxWidth: 300, textAlign: "center" }}
				tone="secondary"
				variant="subhead"
			>
				{description}
			</AppText>
			{action ? (
				<View style={{ marginTop: spacing.lg }}>
					<SecondaryButton
						fullWidth={false}
						label={action.label}
						onPress={action.onPress ?? (() => undefined)}
					/>
				</View>
			) : null}
		</View>
	);
}
