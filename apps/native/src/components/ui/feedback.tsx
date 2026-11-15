import { Ionicons } from "@expo/vector-icons";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	SlideInUp,
	SlideOutUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "./app-text";
import { PrimaryButton, SecondaryButton } from "./buttons";
import { GlassSurface } from "./glass-surface";
import { haptic } from "./haptics";
import { motion, radius, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export type ToastTone = "neutral" | "success" | "warning" | "error";

export interface ToastOptions {
	message: string;
	tone?: ToastTone;
}

export interface ConfirmOptions {
	cancelLabel?: string;
	confirmLabel?: string;
	/** Red confirm button for destructive actions. */
	destructive?: boolean;
	message?: string;
	title: string;
}

interface FeedbackApi {
	/** Resolves true when confirmed, false when cancelled. */
	confirm: (options: ConfirmOptions) => Promise<boolean>;
	showToast: (options: ToastOptions) => void;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const toastIcon = {
	error: "alert-circle",
	neutral: "information-circle",
	success: "checkmark-circle",
	warning: "warning",
} as const;

const toastHaptic = {
	error: "error",
	neutral: "none",
	success: "success",
	warning: "warning",
} as const;

function Toast({ message, tone = "neutral" }: ToastOptions) {
	const { palette } = useUITheme();
	const insets = useSafeAreaInsets();
	const colors = {
		error: palette.danger,
		neutral: palette.inkSecondary,
		success: palette.success,
		warning: palette.warning,
	};

	return (
		<Animated.View
			accessibilityLiveRegion="polite"
			entering={SlideInUp.springify()
				.damping(motion.spring.surface.damping)
				.stiffness(motion.spring.surface.stiffness)}
			exiting={SlideOutUp.duration(motion.duration.normal)}
			pointerEvents="none"
			style={{
				alignItems: "center",
				left: spacing.lg,
				position: "absolute",
				right: spacing.lg,
				top: insets.top + spacing.sm,
			}}
		>
			<GlassSurface
				shape="pill"
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: spacing.sm,
					maxWidth: 420,
					paddingHorizontal: spacing.lg,
					paddingVertical: spacing.md,
				}}
			>
				<Ionicons color={colors[tone]} name={toastIcon[tone]} size={20} />
				<AppText numberOfLines={2} style={{ flexShrink: 1 }} variant="subhead">
					{message}
				</AppText>
			</GlassSurface>
		</Animated.View>
	);
}

export interface ConfirmDialogProps extends ConfirmOptions {
	isPending?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
	visible: boolean;
}

/** Shared confirm card: no native Alert. Stacked full-width actions. */
export function ConfirmDialog({
	cancelLabel = "Cancel",
	confirmLabel = "Confirm",
	destructive,
	isPending,
	message,
	onCancel,
	onConfirm,
	title,
	visible,
}: ConfirmDialogProps) {
	const { palette } = useUITheme();

	return (
		<Modal
			animationType="none"
			onRequestClose={onCancel}
			statusBarTranslucent={true}
			transparent={true}
			visible={visible}
		>
			<Animated.View
				entering={FadeIn.duration(motion.duration.fast)}
				exiting={FadeOut.duration(motion.duration.fast)}
				style={{
					alignItems: "center",
					flex: 1,
					justifyContent: "center",
					padding: spacing.screen,
				}}
			>
				<Pressable
					accessibilityLabel={cancelLabel}
					onPress={onCancel}
					style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]}
				/>
				<View
					accessibilityViewIsModal={true}
					style={{
						backgroundColor: palette.surface,
						borderRadius: radius.card + 8,
						gap: spacing.lg,
						maxWidth: 360,
						padding: spacing.screen,
						width: "100%",
					}}
				>
					<View style={{ gap: spacing.xs }}>
						<AppText accessibilityRole="header" variant="headline">
							{title}
						</AppText>
						{message ? (
							<AppText tone="secondary" variant="subhead">
								{message}
							</AppText>
						) : null}
					</View>
					<View style={{ gap: spacing.sm }}>
						<PrimaryButton
							destructive={destructive}
							isPending={isPending}
							label={confirmLabel}
							onPress={onConfirm}
						/>
						<SecondaryButton
							disabled={isPending}
							label={cancelLabel}
							onPress={onCancel}
							variant="plain"
						/>
					</View>
				</View>
			</Animated.View>
		</Modal>
	);
}

interface ActiveConfirm extends ConfirmOptions {
	resolve: (value: boolean) => void;
}

/** Mount once near the root (inside HeroUINativeProvider). */
export function FeedbackProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(
		null
	);
	const [active, setActive] = useState<ActiveConfirm | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const counter = useRef(0);

	useEffect(
		() => () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
		},
		[]
	);

	const showToast = useCallback((options: ToastOptions) => {
		counter.current += 1;
		setToast({ ...options, id: counter.current });
		haptic(toastHaptic[options.tone ?? "neutral"]);
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(() => setToast(null), motion.duration.toast);
	}, []);

	const confirm = useCallback(
		(options: ConfirmOptions) =>
			new Promise<boolean>((resolve) => {
				haptic(options.destructive ? "warning" : "light");
				setActive({ ...options, resolve });
			}),
		[]
	);

	const settle = (value: boolean) => {
		active?.resolve(value);
		setActive(null);
	};

	const api = useMemo(() => ({ confirm, showToast }), [confirm, showToast]);

	return (
		<FeedbackContext.Provider value={api}>
			{children}
			{toast ? <Toast key={toast.id} {...toast} /> : null}
			<ConfirmDialog
				cancelLabel={active?.cancelLabel}
				confirmLabel={active?.confirmLabel}
				destructive={active?.destructive}
				message={active?.message}
				onCancel={() => settle(false)}
				onConfirm={() => settle(true)}
				title={active?.title ?? ""}
				visible={active !== null}
			/>
		</FeedbackContext.Provider>
	);
}

/** `const { showToast, confirm } = useFeedback()` */
export function useFeedback(): FeedbackApi {
	const context = useContext(FeedbackContext);
	if (!context) {
		throw new Error("useFeedback must be used within FeedbackProvider");
	}
	return context;
}
