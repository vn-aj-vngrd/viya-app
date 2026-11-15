import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { metrics, motion, radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export interface ListGroupProps {
	children: ReactNode;
	className?: string;
	/** Quiet footnote under the group. */
	footer?: string;
	/** Small uppercase label above the group. */
	header?: string;
	/** Divider left inset. Default `spacing.lg`. */
	separatorInset?: number;
}

/** One opaque rounded surface; dividers live between rows, not around them. */
export function ListGroup({
	children,
	className,
	footer,
	header,
	separatorInset = spacing.lg,
}: ListGroupProps) {
	const { palette } = useUITheme();
	const rows = Children.toArray(children);

	return (
		<View className={className} style={{ gap: spacing.sm }}>
			{header ? (
				<AppText
					style={{ paddingHorizontal: spacing.lg }}
					tone="secondary"
					variant="eyebrow"
				>
					{header}
				</AppText>
			) : null}
			<View
				style={{
					backgroundColor: palette.surface,
					borderRadius: radius.card,
					overflow: "hidden",
				}}
			>
				{rows.map((row, index) => (
					<View key={typeof row === "object" && "key" in row ? row.key : index}>
						{index > 0 ? (
							<View
								style={{
									backgroundColor: palette.separator,
									height: StyleSheet.hairlineWidth,
									marginLeft: separatorInset,
								}}
							/>
						) : null}
						{row}
					</View>
				))}
			</View>
			{footer ? (
				<AppText
					style={{ paddingHorizontal: spacing.lg }}
					tone="secondary"
					variant="footnote"
				>
					{footer}
				</AppText>
			) : null}
		</View>
	);
}

export interface ListRowProps {
	accessibilityHint?: string;
	accessibilityLabel?: string;
	destructive?: boolean;
	/** Leading icon/avatar/thumbnail. */
	leading?: ReactNode;
	onPress?: () => void;
	/** Chevron for navigation rows. Default: true when onPress is set. */
	showChevron?: boolean;
	subtitle?: string;
	/** Max lines for the subtitle. Default: wrap. */
	subtitleLines?: number;
	title: string;
	/** Max lines for the title. Default: wrap. */
	titleLines?: number;
	/** Custom trailing content (switch, chip). */
	trailing?: ReactNode;
	/** Quiet trailing value text. */
	value?: string;
}

/** 54pt minimum row for use inside ListGroup (or any Card). */
export function ListRow({
	accessibilityHint,
	accessibilityLabel,
	destructive,
	leading,
	onPress,
	showChevron,
	subtitle,
	subtitleLines,
	title,
	titleLines,
	trailing,
	value,
}: ListRowProps) {
	const chevron = showChevron ?? Boolean(onPress);
	const content = (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: metrics.rowHeight,
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing.md,
			}}
		>
			{leading}
			<View style={{ flex: 1, gap: 2 }}>
				<AppText
					numberOfLines={titleLines}
					tone={destructive ? "danger" : "ink"}
				>
					{title}
				</AppText>
				{subtitle ? (
					<AppText
						numberOfLines={subtitleLines}
						tone="secondary"
						variant="subhead"
					>
						{subtitle}
					</AppText>
				) : null}
			</View>
			{value ? (
				<AppText numberOfLines={1} tone="secondary" variant="subhead">
					{value}
				</AppText>
			) : null}
			{trailing}
			{chevron ? (
				<Icon
					name="chevron-forward"
					size={14}
					tone="tertiary"
					weight="semibold"
				/>
			) : null}
		</View>
	);

	if (!onPress) {
		return content;
	}

	return (
		<PressableScale
			accessibilityHint={accessibilityHint}
			accessibilityLabel={accessibilityLabel ?? title}
			haptic="selection"
			onPress={onPress}
			scaleTo={motion.rowPressScale}
		>
			{content}
		</PressableScale>
	);
}
