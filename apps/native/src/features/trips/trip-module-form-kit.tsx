import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Input, TextArea, TextField } from "heroui-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppSheet,
	AppText,
	Chip,
	fadeIn,
	Icon,
	type IconName,
	metrics,
	PressableScale,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";

/** Shared form + menu pieces for the trip module sheets (vault, moments, notes, companions). */

export function FieldLabel({ children }: { children: string }) {
	return (
		<AppText
			style={{ paddingHorizontal: spacing.xs }}
			tone="secondary"
			variant="footnote"
		>
			{children}
		</AppText>
	);
}

export function SheetField({
	label,
	onChangeText,
	placeholder,
	value,
	...inputProps
}: {
	autoCapitalize?: "none" | "sentences" | "words";
	autoComplete?: "email" | "tel" | "off";
	keyboardType?: "default" | "email-address" | "phone-pad";
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<FieldLabel>{label}</FieldLabel>
			<Input
				accessibilityLabel={label}
				className="h-[50px] rounded-[16px] border-0 bg-surface px-4"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
				{...inputProps}
			/>
		</TextField>
	);
}

export function SheetTextArea({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<FieldLabel>{label}</FieldLabel>
			<TextArea
				accessibilityLabel={label}
				className="min-h-24 rounded-[16px] border-0 bg-surface px-4 py-3"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

export function ChoiceChips({
	children,
	label,
}: {
	children: ReactNode;
	label: string;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			<FieldLabel>{label}</FieldLabel>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{children}
			</View>
		</View>
	);
}

export function InlineMessage({
	message,
	tone = "danger",
}: {
	message: string | null;
	tone?: "danger" | "secondary";
}) {
	if (!message) {
		return null;
	}

	return (
		<Animated.View entering={fadeIn}>
			<AppText accessibilityLiveRegion="polite" tone={tone} variant="subhead">
				{message}
			</AppText>
		</Animated.View>
	);
}

/**
 * Record form in a large-detent AppSheet: close left, confirm right, fields
 * scroll underneath. The sheet owns the single grabber.
 */
export function FormSheet({
	children,
	errorMessage,
	isOpen,
	isSaving,
	onOpenChange,
	onSubmit,
	saveLabel,
	snapPoint = "82%",
	title,
}: {
	children: ReactNode;
	/** Accepted for call-site compatibility; the header stays quiet. */
	description?: string;
	errorMessage?: string | null;
	isOpen: boolean;
	isSaving: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	saveLabel: string;
	snapPoint?: string;
	title: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<AppSheet
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			snapPoints={[snapPoint]}
		>
			<SheetHeader
				confirm={{
					isPending: isSaving,
					label: saveLabel,
					onPress: onSubmit,
				}}
				onClose={() => onOpenChange(false)}
				title={title}
			/>
			<BottomSheetScrollView
				contentContainerStyle={{
					gap: spacing.lg,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.md,
				}}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<InlineMessage message={errorMessage ?? null} />
				{children}
			</BottomSheetScrollView>
		</AppSheet>
	);
}

export function MenuTrigger({ label }: { label: string }) {
	return (
		<PressableScale
			accessibilityLabel={label}
			haptic="selection"
			style={{
				alignItems: "center",
				height: metrics.minTarget,
				justifyContent: "center",
				marginRight: -spacing.sm,
				marginTop: -spacing.sm,
				width: metrics.minTarget,
			}}
		>
			<Icon name="ellipsis-horizontal" tone="secondary" />
		</PressableScale>
	);
}

export const menuContentClassName = "rounded-[20px] bg-surface p-2";
const menuIconSize = 18;
export const menuItemClassName =
	"min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5";

export function MenuDivider() {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.separator,
				height: StyleSheet.hairlineWidth,
				marginHorizontal: spacing.sm,
			}}
		/>
	);
}

export function MenuIcon({
	destructive,
	name,
}: {
	destructive?: boolean;
	name: IconName;
}) {
	return (
		<Icon
			name={name}
			size={menuIconSize}
			tone={destructive ? "danger" : "primary"}
		/>
	);
}

/** Static tag row (never interactive). */
export function TagRow({ labels }: { labels: string[] }) {
	if (labels.length === 0) {
		return null;
	}

	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
			{labels.map((label) => (
				<Chip key={label} label={label} />
			))}
		</View>
	);
}
