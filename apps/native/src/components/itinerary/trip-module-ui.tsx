import { Ionicons } from "@expo/vector-icons";
import {
	BottomSheet,
	Input,
	Label,
	Menu,
	TextArea,
	TextField,
} from "heroui-native";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Container } from "@/components/container";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppText,
	Chip,
	EmptyState,
	GlassIconButton,
	type IconName,
	LoadingState,
	metrics,
	PressableScale,
	type PressableScaleProps,
	PrimaryButton,
	radius,
	spacing,
	type TextTone,
	useUITheme,
} from "@/src/components/ui";

export type Tone = "accent" | "danger" | "neutral" | "success" | "warning";

/** Soft 12% wash of a 6-digit palette hex, for icon badges. */
const wash = (color: string) => `${color}1F`;

function useToneColor(tone: Tone) {
	const { palette } = useUITheme();
	const map = {
		accent: palette.accent,
		danger: palette.danger,
		neutral: palette.inkSecondary,
		success: palette.success,
		warning: palette.warning,
	} as const;

	return map[tone];
}

/** Round tinted icon container used at the start of rows and cards. */
export function IconBadge({
	icon,
	size = 36,
	tone = "accent",
}: {
	icon: IconName;
	size?: number;
	tone?: Tone;
}) {
	const { palette } = useUITheme();
	const color = useToneColor(tone);

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: tone === "neutral" ? palette.fill : wash(color),
				borderRadius: radius.pill,
				height: size,
				justifyContent: "center",
				width: size,
			}}
		>
			<Ionicons color={color} name={icon} size={Math.round(size * 0.5)} />
		</View>
	);
}

/** Static, quiet meta tag (stop count, pace, cost). Not interactive. */
export function MetaTag({
	icon,
	label,
	tone = "neutral",
}: {
	icon?: IconName;
	label: string;
	tone?: Tone;
}) {
	const { palette } = useUITheme();
	const color = useToneColor(tone);

	return (
		<View
			style={{
				alignItems: "center",
				alignSelf: "flex-start",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 5,
				paddingHorizontal: 10,
				paddingVertical: 5,
			}}
		>
			{icon ? <Ionicons color={color} name={icon} size={13} /> : null}
			<AppText
				numberOfLines={1}
				style={{ color, fontWeight: "500" }}
				variant="footnote"
			>
				{label}
			</AppText>
		</View>
	);
}

type ActionPillProps = Omit<PressableScaleProps, "children" | "style"> & {
	icon?: IconName;
	isPending?: boolean;
	label: string;
	variant?: "primary" | "secondary";
};

/**
 * Compact pill action for inline use. Spreads rest props to the pressable so it
 * can sit inside `<Link asChild>`; the visible height is 40 with a 44pt hit area.
 */
export function ActionPill({
	disabled,
	icon,
	isPending,
	label,
	variant = "secondary",
	...rest
}: ActionPillProps) {
	const { palette } = useUITheme();
	const isPrimary = variant === "primary";
	const foreground = isPrimary ? palette.onPrimary : palette.ink;
	const inactive = Boolean(disabled) || Boolean(isPending);

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityState={{ busy: Boolean(isPending), disabled: inactive }}
			disabled={inactive}
			hitSlop={{ bottom: 2, top: 2 }}
			style={{
				alignItems: "center",
				backgroundColor: isPrimary ? palette.ink : palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 6,
				height: 40,
				justifyContent: "center",
				opacity: inactive ? 0.5 : 1,
				paddingHorizontal: spacing.lg,
			}}
			{...rest}
		>
			{icon ? <Ionicons color={foreground} name={icon} size={16} /> : null}
			<AppText
				numberOfLines={1}
				style={{ color: foreground, fontWeight: "600" }}
				variant="subhead"
			>
				{isPending ? "Working..." : label}
			</AppText>
		</PressableScale>
	);
}

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

/** Eyebrow label that heads a group of cards. */
export function GroupLabel({
	children,
	tone = "secondary",
}: {
	children: string;
	tone?: TextTone;
}) {
	return (
		<AppText
			accessibilityRole="header"
			style={{ paddingHorizontal: spacing.xs }}
			tone={tone}
			variant="eyebrow"
		>
			{children}
		</AppText>
	);
}

/** Staggered spring entrance for list items. */
export function Reveal({
	children,
	index = 0,
}: {
	children: ReactNode;
	index?: number;
}) {
	return (
		<Animated.View
			entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}
		>
			{children}
		</Animated.View>
	);
}

/** Scrolling module page on the canvas. */
export function ModuleScroll({ children }: { children: ReactNode }) {
	return (
		<Container includeBottomInset={false} isScrollable={false}>
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					gap: spacing.lg,
					paddingBottom: 112,
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.xs,
				}}
				contentInsetAdjustmentBehavior="never"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</Container>
	);
}

export function ModuleLoading({ title }: { title: string }) {
	return (
		<Container className="px-4 pb-28" isScrollable={false}>
			<LoadingState title={title} />
		</Container>
	);
}

export function ModuleMissing({
	description,
	icon,
}: {
	description: string;
	icon: IconName;
}) {
	return (
		<Container className="px-4 pb-28" isScrollable={false}>
			<EmptyState
				description={description}
				icon={icon}
				title="Trip not found"
			/>
		</Container>
	);
}

/** 44pt round overflow button that opens a `Menu`. */
export function OverflowTrigger({
	disabled,
	label,
}: {
	disabled?: boolean;
	label: string;
}) {
	const { palette } = useUITheme();

	return (
		<Menu.Trigger asChild={true}>
			<PressableScale
				accessibilityLabel={label}
				disabled={disabled}
				haptic="selection"
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: metrics.minTarget,
					justifyContent: "center",
					opacity: disabled ? 0.5 : 1,
					width: metrics.minTarget,
				}}
			>
				<Ionicons
					color={palette.inkSecondary}
					name="ellipsis-horizontal"
					size={18}
				/>
			</PressableScale>
		</Menu.Trigger>
	);
}

export function MenuPanel({
	children,
	width = 232,
}: {
	children: ReactNode;
	width?: number;
}) {
	return (
		<Menu.Portal>
			<Menu.Overlay />
			<Menu.Content
				align="end"
				className="rounded-[20px] bg-surface p-1.5"
				offset={8}
				placement="bottom"
				presentation="popover"
				width={width}
			>
				{children}
			</Menu.Content>
		</Menu.Portal>
	);
}

export function MenuDivider() {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				backgroundColor: palette.separator,
				height: 1,
				marginHorizontal: spacing.sm,
				marginVertical: spacing.xs,
			}}
		/>
	);
}

/** Menu row content (icon + title). Wrap in `Menu.Item`. */
export function MenuItemContent({
	danger,
	icon,
	label,
}: {
	danger?: boolean;
	icon: IconName;
	label: string;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: spacing.md,
				minHeight: metrics.minTarget - 8,
			}}
		>
			<Ionicons
				color={danger ? palette.danger : palette.accent}
				name={icon}
				size={19}
			/>
			<Menu.ItemTitle
				className={
					danger
						? "font-semibold text-base text-danger"
						: "font-medium text-base"
				}
			>
				{label}
			</Menu.ItemTitle>
		</View>
	);
}

export function MenuAction({
	danger,
	disabled,
	icon,
	label,
	onPress,
}: {
	danger?: boolean;
	disabled?: boolean;
	icon: IconName;
	label: string;
	onPress: () => void;
}) {
	return (
		<Menu.Item
			accessibilityLabel={label}
			className="rounded-[14px] px-2.5"
			isAnimatedStyleActive={false}
			isDisabled={disabled}
			onPress={onPress}
		>
			<MenuItemContent danger={danger} icon={icon} label={label} />
		</Menu.Item>
	);
}

/** Single-line form field for bottom sheets. */
export function FormField({
	keyboardType,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	keyboardType?: "default" | "numeric";
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { palette } = useUITheme();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-1.5">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				className="px-4"
				keyboardType={keyboardType}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				style={{
					backgroundColor: palette.surface,
					borderRadius: radius.field,
					borderWidth: 0,
					height: metrics.actionHeight,
				}}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

export function FormTextArea({
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
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-1.5">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<TextArea
				className="px-4 py-3"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				style={{
					backgroundColor: palette.surface,
					borderRadius: radius.field,
					borderWidth: 0,
					minHeight: 96,
				}}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

/** Wrapping group of selectable chips. */
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
			<AppText tone="secondary" variant="eyebrow">
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

/** Bottom sheet shell: centered title, glass close, scrolling form, one primary action. */
export function FormSheet({
	children,
	closeLabel,
	errorMessage,
	isDisabled,
	isOpen,
	isPending,
	maxHeight = 520,
	onOpenChange,
	onSubmit,
	snapPoint = "84%",
	submitLabel,
	subtitle,
	title,
}: {
	children: ReactNode;
	closeLabel: string;
	errorMessage?: string | null;
	isDisabled?: boolean;
	isOpen: boolean;
	isPending?: boolean;
	maxHeight?: number;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit?: () => void;
	snapPoint?: string;
	submitLabel?: string;
	subtitle?: string;
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
					<View
						style={{
							gap: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
							paddingTop: spacing.xs,
						}}
					>
						<View
							style={{
								alignItems: "center",
								flexDirection: "row",
								gap: spacing.md,
							}}
						>
							<GlassIconButton
								accessibilityLabel={closeLabel}
								icon="close"
								onPress={() => onOpenChange(false)}
							/>
							<View style={{ alignItems: "center", flex: 1 }}>
								<BottomSheet.Title>{title}</BottomSheet.Title>
								{subtitle ? (
									<BottomSheet.Description numberOfLines={2}>
										{subtitle}
									</BottomSheet.Description>
								) : null}
							</View>
							<View style={{ width: metrics.iconButton }} />
						</View>

						<ScrollView
							contentContainerStyle={{
								gap: spacing.lg,
								paddingBottom: spacing.sm,
							}}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight }}
						>
							{children}
						</ScrollView>

						<InlineError message={errorMessage ?? null} />
						{submitLabel && onSubmit ? (
							<PrimaryButton
								disabled={isDisabled}
								isPending={isPending}
								label={submitLabel}
								onPress={onSubmit}
							/>
						) : null}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

/** Quiet 44pt round icon action for use inside cards (flat fill, no glass). */
export function IconAction({
	icon,
	label,
	onPress,
}: {
	icon: IconName;
	label: string;
	onPress: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={label}
			onPress={onPress}
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				height: metrics.minTarget,
				justifyContent: "center",
				width: metrics.minTarget,
			}}
		>
			<Ionicons color={palette.accent} name={icon} size={18} />
		</PressableScale>
	);
}
