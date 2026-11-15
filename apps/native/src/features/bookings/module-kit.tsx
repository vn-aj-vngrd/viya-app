import type { ReactNode } from "react";
import { useRef } from "react";
import { ScrollView, TextInput, View } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppSheet,
	AppText,
	Chip,
	fadeIn,
	haptic,
	Icon,
	type IconName,
	metrics,
	PressableScale,
	radius,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";

/**
 * Shared pieces for the trip module screens (budget, bookings, readiness).
 * Everything here is built from ui primitives and tokens.
 */

/** Status shown as an icon plus text, never colour alone. */
export function StatusLabel({
	icon,
	label,
	tone = "secondary",
}: {
	icon: IconName;
	label: string;
	tone?: "danger" | "secondary" | "success" | "warning";
}) {
	return (
		<View
			style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}
		>
			<Icon name={icon} size={15} tone={tone} />
			<AppText numberOfLines={1} tone={tone} variant="footnote">
				{label}
			</AppText>
		</View>
	);
}

export interface SwipeActionConfig {
	icon: IconName;
	label: string;
	onPress: () => void;
	tone: "accent" | "danger" | "success";
}

const SWIPE_ACTION_WIDTH = 88;

function SwipeAction({
	action,
	onDone,
}: {
	action: SwipeActionConfig;
	onDone: () => void;
}) {
	const { palette } = useUITheme();
	const background = {
		accent: palette.accent,
		danger: palette.danger,
		success: palette.success,
	}[action.tone];

	return (
		<PressableScale
			accessibilityLabel={action.label}
			accessibilityRole="button"
			onPress={() => {
				onDone();
				action.onPress();
			}}
			scaleTo={0.98}
			style={{
				alignItems: "center",
				backgroundColor: background,
				gap: spacing.xs,
				justifyContent: "center",
				width: SWIPE_ACTION_WIDTH,
			}}
		>
			<Icon color={palette.onPrimary} name={action.icon} size={20} />
			<AppText
				numberOfLines={1}
				style={{ color: palette.onPrimary }}
				variant="footnote"
			>
				{action.label}
			</AppText>
		</PressableScale>
	);
}

/** Row with direct-manipulation swipe actions (leading: status, trailing: delete). */
export function SwipeRow({
	children,
	leading,
	trailing,
}: {
	children: ReactNode;
	leading?: SwipeActionConfig;
	trailing?: SwipeActionConfig;
}) {
	const { palette } = useUITheme();
	const ref = useRef<SwipeableMethods>(null);
	const close = () => ref.current?.close();

	if (!(leading || trailing)) {
		return <>{children}</>;
	}

	return (
		<ReanimatedSwipeable
			friction={2}
			onSwipeableOpenStartDrag={() => haptic("selection")}
			overshootLeft={false}
			overshootRight={false}
			ref={ref}
			renderLeftActions={
				leading
					? () => <SwipeAction action={leading} onDone={close} />
					: undefined
			}
			renderRightActions={
				trailing
					? () => <SwipeAction action={trailing} onDone={close} />
					: undefined
			}
		>
			<View style={{ backgroundColor: palette.surface }}>{children}</View>
		</ReanimatedSwipeable>
	);
}

export function FormError({ message }: { message: string | null }) {
	if (!message) {
		return null;
	}

	return (
		<Animated.View entering={fadeIn}>
			<AppText
				accessibilityLiveRegion="polite"
				accessibilityRole="alert"
				tone="danger"
				variant="subhead"
			>
				{message}
			</AppText>
		</Animated.View>
	);
}

/** Inset grouped form container: opaque surface, hairline dividers. */
export function FieldGroup({
	children,
	footer,
	header,
}: {
	children: ReactNode;
	footer?: string;
	header?: string;
}) {
	const { palette } = useUITheme();
	const rows = Array.isArray(children) ? children.filter(Boolean) : [children];

	return (
		<View style={{ gap: spacing.sm }}>
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
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: static form rows
						key={index}
						style={{
							borderTopColor: palette.separator,
							borderTopWidth: index === 0 ? 0 : 1,
						}}
					>
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

/** One 44pt-minimum text row: label left, value right. */
export function FieldRow({
	autoCapitalize,
	keyboardType,
	label,
	multiline,
	onChangeText,
	placeholder,
	value,
}: {
	autoCapitalize?: "none" | "sentences" | "words";
	keyboardType?: "decimal-pad" | "default" | "numbers-and-punctuation";
	label: string;
	multiline?: boolean;
	onChangeText: (value: string) => void;
	placeholder?: string;
	value: string;
}) {
	const { palette } = useUITheme();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<View
			style={{
				alignItems: multiline ? "flex-start" : "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: metrics.minTarget + spacing.sm,
				paddingHorizontal: spacing.lg,
				paddingVertical: spacing.sm,
			}}
		>
			<AppText style={{ width: 92 }} tone="secondary" variant="subhead">
				{label}
			</AppText>
			<TextInput
				accessibilityLabel={label}
				autoCapitalize={autoCapitalize}
				keyboardType={keyboardType}
				multiline={multiline}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				placeholderTextColor={palette.inkTertiary}
				style={{
					color: palette.ink,
					flex: 1,
					fontSize: 17,
					minHeight: metrics.minTarget - spacing.sm,
					paddingVertical: spacing.xs,
					textAlign: multiline ? "left" : "right",
					textAlignVertical: multiline ? "top" : "center",
				}}
				value={value}
			/>
		</View>
	);
}

/** Row holding a wrapped set of single-select chips. */
export function ChoiceRow<TValue extends string>({
	format,
	label,
	onChange,
	options,
	value,
}: {
	format: (value: TValue) => string;
	label: string;
	onChange: (value: TValue) => void;
	options: readonly TValue[];
	value: string;
}) {
	return (
		<View style={{ gap: spacing.sm, padding: spacing.lg }}>
			<AppText tone="secondary" variant="subhead">
				{label}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{options.map((option) => (
					<Chip
						key={option}
						label={format(option)}
						onPress={() => onChange(option)}
						selected={option === value}
					/>
				))}
			</View>
		</View>
	);
}

/** Record form sheet: AppSheet owns the grabber; header is close, title, save. */
export function RecordSheet({
	children,
	errorMessage,
	isOpen,
	isSaving,
	onOpenChange,
	onSave,
	saveLabel = "Save",
	snapPoints = ["88%"],
	title,
}: {
	children: ReactNode;
	errorMessage?: string | null;
	isOpen: boolean;
	isSaving?: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSave?: () => void;
	saveLabel?: string;
	snapPoints?: string[];
	title: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<AppSheet
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			snapPoints={snapPoints}
		>
			<SheetHeader
				confirm={
					onSave
						? { isPending: isSaving, label: saveLabel, onPress: onSave }
						: undefined
				}
				onClose={() => onOpenChange(false)}
				title={title}
			/>
			<ScrollView
				contentContainerStyle={{
					gap: spacing.section,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.lg,
				}}
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{children}
				<FormError message={errorMessage ?? null} />
			</ScrollView>
		</AppSheet>
	);
}

/** Opens another trip module from inside a sheet; use with expo-router Link asChild. */
export function LinkRow({
	icon,
	label,
	onPress,
}: {
	icon: IconName;
	label: string;
	onPress?: () => void;
}) {
	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole="link"
			haptic="selection"
			onPress={onPress}
			scaleTo={0.985}
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: metrics.rowHeight,
				paddingHorizontal: spacing.lg,
			}}
		>
			<Icon name={icon} size={20} tone="accent" />
			<AppText style={{ flex: 1 }} tone="accent">
				{label}
			</AppText>
			<Icon
				name="chevron-forward"
				size={14}
				tone="tertiary"
				weight="semibold"
			/>
		</PressableScale>
	);
}
