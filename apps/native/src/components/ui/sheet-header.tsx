import { ActivityIndicator, View } from "react-native";

import { AppText } from "./app-text";
import { GlassIconButton } from "./glass-icon-button";
import { PressableScale } from "./pressable-scale";
import { metrics, radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface SheetHeaderProps {
	/** Trailing confirm action (Save, Done, Apply). Spinner replaces the label while pending. */
	confirm?: {
		disabled?: boolean;
		isPending?: boolean;
		label: string;
		onPress: () => void;
	};
	/** @deprecated The AppSheet container owns the single grabber. Ignored. */
	grabber?: boolean;
	onClose?: () => void;
	subtitle?: string;
	title: string;
}

/** Header for sheets: close, centered title, confirm. */
export function SheetHeader({
	confirm,
	onClose,
	subtitle,
	title,
}: SheetHeaderProps) {
	const { palette } = useUITheme();

	return (
		<View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					justifyContent: "space-between",
					minHeight: metrics.iconButton + spacing.sm,
				}}
			>
				<View style={{ minWidth: 72 }}>
					{onClose ? (
						<GlassIconButton
							accessibilityLabel="Close"
							icon="close"
							onPress={onClose}
						/>
					) : null}
				</View>
				<View style={{ alignItems: "center", flex: 1 }}>
					<AppText
						accessibilityRole="header"
						numberOfLines={1}
						variant="headline"
					>
						{title}
					</AppText>
					{subtitle ? (
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{subtitle}
						</AppText>
					) : null}
				</View>
				<View style={{ alignItems: "flex-end", minWidth: 72 }}>
					{confirm ? (
						<PressableScale
							accessibilityLabel={confirm.label}
							accessibilityState={{ busy: Boolean(confirm.isPending) }}
							disabled={confirm.disabled || confirm.isPending}
							haptic="medium"
							onPress={confirm.onPress}
							style={{
								alignItems: "center",
								backgroundColor: palette.ink,
								borderRadius: radius.pill,
								height: 40,
								justifyContent: "center",
								minWidth: 72,
								opacity: confirm.disabled ? 0.4 : 1,
								paddingHorizontal: spacing.lg,
							}}
						>
							{confirm.isPending ? (
								<ActivityIndicator color={palette.onPrimary} />
							) : (
								<AppText
									style={{ color: palette.onPrimary, fontWeight: "600" }}
									variant="subhead"
								>
									{confirm.label}
								</AppText>
							)}
						</PressableScale>
					) : null}
				</View>
			</View>
		</View>
	);
}
