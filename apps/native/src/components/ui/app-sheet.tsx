import type { BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import { BottomSheet, type BottomSheetContentProps } from "heroui-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { GlassSurface } from "./glass-surface";
import { radius } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export type AppSheetProps = Omit<
	BottomSheetContentProps,
	| "backgroundClassName"
	| "backgroundComponent"
	| "backgroundStyle"
	| "children"
	| "handleComponent"
	| "handleIndicatorClassName"
	| "handleIndicatorStyle"
> & {
	children: ReactNode;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
};

const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 5;

/** The one and only grabber. HeroUI's default indicator is replaced by this. */
function SheetGrabber() {
	const { palette } = useUITheme();

	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={{ alignItems: "center", height: 20, justifyContent: "center" }}
		>
			<View
				style={{
					backgroundColor: palette.inkTertiary,
					borderRadius: radius.pill,
					height: GRABBER_HEIGHT,
					opacity: 0.55,
					width: GRABBER_WIDTH,
				}}
			/>
		</View>
	);
}

/** Sheet chrome: Liquid Glass (solid translucent on Android / Reduce Transparency). */
function SheetBackground({ style }: BottomSheetBackgroundProps) {
	return (
		<View
			pointerEvents="none"
			style={[
				style,
				{
					borderTopLeftRadius: radius.sheet,
					borderTopRightRadius: radius.sheet,
					overflow: "hidden",
				},
			]}
		>
			<GlassSurface
				radius={radius.sheet}
				style={[StyleSheet.absoluteFill, { bottom: -radius.sheet }]}
			/>
		</View>
	);
}

/**
 * The only bottom sheet in the app. Owns: glass background, one grabber,
 * dimmed backdrop, detents (`snapPoints`, default dynamic height), pan-down to
 * close, and keyboard handling. Never render another grabber inside; use
 * SheetHeader (close/title/confirm) and add bottom safe-area padding to the
 * content. Children may use BottomSheet.Title / BottomSheet.Description.
 */
export function AppSheet({
	children,
	isOpen,
	onOpenChange,
	...contentProps
}: AppSheetProps) {
	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundComponent={SheetBackground}
					enablePanDownToClose
					handleComponent={SheetGrabber}
					keyboardBehavior="interactive"
					keyboardBlurBehavior="restore"
					{...contentProps}
				>
					{children}
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
