import {
	BottomSheetScrollView,
	BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { type ReactNode, useRef } from "react";
import {
	ActionSheetIOS,
	type KeyboardTypeOptions,
	Platform,
	Pressable,
	View,
} from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	AppSheet,
	AppText,
	Chip,
	haptic,
	Icon,
	type IconName,
	inputThemeProps,
	metrics,
	radius,
	SecondaryButton,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";

/** Inline error line: danger tone, announced to screen readers. */
export function InlineError({ message }: { message: string | null }) {
	if (!message) {
		return null;
	}

	return (
		<AppText
			accessibilityLiveRegion="polite"
			accessibilityRole="alert"
			tone="danger"
			variant="subhead"
		>
			{message}
		</AppText>
	);
}

export interface SwipeAction {
	icon: IconName;
	label: string;
	onPress: () => void;
	tone: "accent" | "danger" | "success";
}

function SwipePanel({
	action,
	onDone,
}: {
	action: SwipeAction;
	onDone: () => void;
}) {
	const { palette } = useUITheme();
	const backgrounds = {
		accent: palette.accent,
		danger: palette.danger,
		success: palette.success,
	} as const;

	return (
		<Pressable
			accessibilityLabel={action.label}
			accessibilityRole="button"
			onPress={() => {
				onDone();
				action.onPress();
			}}
			style={{
				alignItems: "center",
				backgroundColor: backgrounds[action.tone],
				gap: spacing.xs,
				justifyContent: "center",
				width: 88,
			}}
		>
			<Icon name={action.icon} size={20} tone="onPrimary" />
			<AppText tone="onPrimary" variant="footnote">
				{action.label}
			</AppText>
		</Pressable>
	);
}

/** Row with swipe actions (leading and trailing) on an opaque surface. */
export function SwipeRow({
	children,
	leading,
	trailing,
}: {
	children: ReactNode;
	leading?: SwipeAction;
	trailing?: SwipeAction;
}) {
	const { palette } = useUITheme();
	const ref = useRef<SwipeableMethods | null>(null);
	const close = () => ref.current?.close();

	return (
		<ReanimatedSwipeable
			friction={2}
			onSwipeableOpen={() => haptic("selection")}
			overshootLeft={false}
			overshootRight={false}
			ref={ref}
			renderLeftActions={
				leading
					? () => <SwipePanel action={leading} onDone={close} />
					: undefined
			}
			renderRightActions={
				trailing
					? () => <SwipePanel action={trailing} onDone={close} />
					: undefined
			}
		>
			<View style={{ backgroundColor: palette.surface }}>{children}</View>
		</ReanimatedSwipeable>
	);
}

export interface RowMenuAction {
	destructive?: boolean;
	label: string;
	onPress: () => void;
}

/** Long-press context menu. Native action sheet on iOS; Android uses swipe and the detail sheet. */
export function showRowMenu(title: string, actions: RowMenuAction[]) {
	if (Platform.OS !== "ios" || actions.length === 0) {
		return;
	}

	haptic("medium");
	const destructiveButtonIndex = actions.findIndex(
		(action) => action.destructive
	);
	ActionSheetIOS.showActionSheetWithOptions(
		{
			cancelButtonIndex: actions.length,
			destructiveButtonIndex:
				destructiveButtonIndex === -1 ? undefined : destructiveButtonIndex,
			options: [...actions.map((action) => action.label), "Cancel"],
			title,
		},
		(index) => actions[index]?.onPress()
	);
}

/** Inset group for sheet forms. Opaque rows, hairline dividers. */
export function FormGroup({
	children,
	footer,
	header,
}: {
	children: ReactNode;
	footer?: string;
	header?: string;
}) {
	const { palette } = useUITheme();
	const rows = Array.isArray(children) ? children.flat() : [children];
	const visible = rows.filter(Boolean);

	return (
		<View style={{ gap: spacing.sm }}>
			{header ? (
				<AppText
					accessibilityRole="header"
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
				{visible.map((row, index) => (
					<View
						key={
							typeof row === "object" && row !== null && "key" in row
								? (row.key ?? index)
								: index
						}
					>
						{index > 0 ? (
							<View
								style={{
									backgroundColor: palette.separator,
									height: 1,
									marginLeft: spacing.lg,
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

/** Label left, value right, 54pt: the single-line field used in every form. */
export function FieldRow({
	keyboardType,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	keyboardType?: KeyboardTypeOptions;
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: metrics.rowHeight,
				paddingHorizontal: spacing.lg,
			}}
		>
			<AppText style={{ flexShrink: 0, minWidth: 84 }}>{label}</AppText>
			<BottomSheetTextInput
				accessibilityLabel={label}
				keyboardType={keyboardType}
				onChangeText={onChangeText}
				placeholder={placeholder}
				{...inputThemeProps(palette)}
				style={{
					color: palette.ink,
					flex: 1,
					fontSize: 17,
					minHeight: metrics.minTarget,
					textAlign: "right",
				}}
				value={value}
			/>
		</View>
	);
}

/** Multi-line notes row inside a FormGroup. */
export function NotesRow({
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
	const { palette } = useUITheme();

	return (
		<BottomSheetTextInput
			accessibilityLabel={label}
			multiline={true}
			onChangeText={onChangeText}
			placeholder={placeholder}
			{...inputThemeProps(palette)}
			style={{
				color: palette.ink,
				fontSize: 17,
				minHeight: 96,
				padding: spacing.lg,
				textAlignVertical: "top",
			}}
			value={value}
		/>
	);
}

/** Wrapping group of selectable chips under a quiet label. */
export function ChoiceChips({
	extraOption,
	formatLabel,
	label,
	onChange,
	options,
	value,
}: {
	/** Optional leading "none" style choice, selected when `value` is empty. */
	extraOption?: { label: string; value: string };
	formatLabel?: (value: string) => string;
	label: string;
	onChange: (value: string) => void;
	options: readonly { label?: string; value: string }[] | readonly string[];
	value: string;
}) {
	const normalized = options.map((option) =>
		typeof option === "string"
			? { label: formatLabel ? formatLabel(option) : option, value: option }
			: { label: option.label ?? option.value, value: option.value }
	);

	return (
		<View style={{ gap: spacing.sm }}>
			<AppText
				style={{ paddingHorizontal: spacing.lg }}
				tone="secondary"
				variant="eyebrow"
			>
				{label}
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
				{extraOption ? (
					<Chip
						label={extraOption.label}
						onPress={() => onChange(extraOption.value)}
						selected={value === extraOption.value}
					/>
				) : null}
				{normalized.map((option) => (
					<Chip
						key={option.value}
						label={option.label}
						onPress={() => onChange(option.value)}
						selected={value === option.value}
					/>
				))}
			</View>
		</View>
	);
}

/**
 * Sheet shell on AppSheet (the only grabber): SheetHeader with close and
 * confirm, scrolling content in a 20pt-inset column. "medium" and "large"
 * detents; always draggable down.
 */
export function FormSheet({
	children,
	errorMessage,
	isDisabled,
	isOpen,
	isPending,
	onOpenChange,
	onSubmit,
	size = "large",
	submitLabel,
	subtitle,
	title,
}: {
	children: ReactNode;
	errorMessage?: string | null;
	isDisabled?: boolean;
	isOpen: boolean;
	isPending?: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit?: () => void;
	size?: "large" | "medium";
	submitLabel?: string;
	subtitle?: string;
	title: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<AppSheet
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			snapPoints={[size === "medium" ? "56%" : "92%"]}
		>
			<SheetHeader
				confirm={
					submitLabel && onSubmit
						? {
								disabled: isDisabled,
								isPending,
								label: submitLabel,
								onPress: onSubmit,
							}
						: undefined
				}
				onClose={() => onOpenChange(false)}
				subtitle={subtitle}
				title={title}
			/>
			<BottomSheetScrollView
				contentContainerStyle={{
					gap: spacing.section,
					paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl,
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.lg,
				}}
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<InlineError message={errorMessage ?? null} />
				{children}
			</BottomSheetScrollView>
		</AppSheet>
	);
}

/** Primary action for an empty module: sentence plus one labelled button. */
export function EmptyPrimary({
	actionLabel,
	description,
	onPress,
	title,
}: {
	actionLabel?: string;
	description: string;
	onPress?: () => void;
	title: string;
}) {
	return (
		<View
			style={{ alignItems: "center", gap: spacing.lg, paddingTop: spacing.xl }}
		>
			<View style={{ alignItems: "center", gap: spacing.xs }}>
				<AppText accessibilityRole="header" variant="headline">
					{title}
				</AppText>
				<AppText
					style={{ textAlign: "center" }}
					tone="secondary"
					variant="subhead"
				>
					{description}
				</AppText>
			</View>
			{actionLabel && onPress ? (
				<View>
					<SecondaryButton
						fullWidth={false}
						label={actionLabel}
						onPress={onPress}
					/>
				</View>
			) : null}
		</View>
	);
}
