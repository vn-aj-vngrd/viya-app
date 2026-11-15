import { Ionicons } from "@expo/vector-icons";
import { BottomSheet, Input, TextArea, TextField } from "heroui-native";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppText,
	Chip,
	PressableScale,
	PrimaryButton,
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
			variant="eyebrow"
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
				className="h-12 rounded-[16px] border-0 bg-surface px-4"
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
		<Animated.View entering={FadeIn.duration(180)}>
			<AppText accessibilityLiveRegion="polite" tone={tone} variant="subhead">
				{message}
			</AppText>
		</Animated.View>
	);
}

export function FormSheet({
	children,
	description,
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
	description: string;
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
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={true}
					snapPoints={[snapPoint]}
				>
					<SheetHeader
						onClose={() => onOpenChange(false)}
						subtitle={description}
						title={title}
					/>
					<View
						style={{
							gap: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
							paddingTop: spacing.sm,
						}}
					>
						<ScrollView
							contentContainerStyle={{
								gap: spacing.lg,
								paddingBottom: spacing.sm,
							}}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 480 }}
						>
							{children}
						</ScrollView>
						<InlineMessage message={errorMessage ?? null} />
						<PrimaryButton
							isPending={isSaving}
							label={saveLabel}
							onPress={onSubmit}
						/>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function MenuTrigger({ label }: { label: string }) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={label}
			haptic="selection"
			style={{
				alignItems: "center",
				height: 44,
				justifyContent: "center",
				marginRight: -spacing.sm,
				marginTop: -spacing.sm,
				width: 44,
			}}
		>
			<Ionicons
				color={palette.inkSecondary}
				name="ellipsis-horizontal"
				size={20}
			/>
		</PressableScale>
	);
}

export const menuContentClassName = "rounded-[20px] bg-surface p-2";
export const menuItemClassName =
	"min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5";

export function MenuDivider() {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.separator,
				height: 1,
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
	name: keyof typeof Ionicons.glyphMap;
}) {
	const { palette } = useUITheme();

	return (
		<Ionicons
			color={destructive ? palette.danger : palette.ink}
			name={name}
			size={18}
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
