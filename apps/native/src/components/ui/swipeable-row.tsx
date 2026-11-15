import { type ReactNode, useRef } from "react";
import { Pressable, View } from "react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { AppText } from "./app-text";
import { haptic } from "./haptics";
import { Icon, type IconName } from "./icon";
import { metrics, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

const ACTION_ICON_SIZE = 20;

export interface SwipeAction {
	icon: IconName;
	key: string;
	label: string;
	onPress: () => void;
	tone: "danger" | "accent" | "neutral";
}

export interface SwipeableRowProps {
	children: ReactNode;
	leadingActions?: SwipeAction[];
	trailingActions?: SwipeAction[];
}

function ActionStrip({
	actions,
	onAction,
}: {
	actions: SwipeAction[];
	onAction: (action: SwipeAction) => void;
}) {
	const { palette } = useUITheme();
	const backgrounds = {
		accent: palette.accent,
		danger: palette.danger,
		neutral: palette.inkSecondary,
	} as const;

	return (
		<View style={{ flexDirection: "row" }}>
			{actions.map((action) => (
				<Pressable
					accessibilityLabel={action.label}
					accessibilityRole="button"
					key={action.key}
					onPress={() => onAction(action)}
					style={{
						alignItems: "center",
						backgroundColor: backgrounds[action.tone],
						gap: spacing.xs,
						justifyContent: "center",
						width: metrics.swipeAction,
					}}
				>
					<Icon
						color={palette.onPrimary}
						name={action.icon}
						size={ACTION_ICON_SIZE}
					/>
					<AppText style={{ color: palette.onPrimary }} variant="footnote">
						{action.label}
					</AppText>
				</Pressable>
			))}
		</View>
	);
}

/**
 * Swipe actions on a row. Mirrors every action as an accessibility action so
 * VoiceOver, TalkBack and Android (no context menu) reach them too.
 */
export function SwipeableRow({
	children,
	leadingActions,
	trailingActions,
}: SwipeableRowProps) {
	const ref = useRef<SwipeableMethods>(null);
	const all = [...(leadingActions ?? []), ...(trailingActions ?? [])];
	const run = (action: SwipeAction) => {
		ref.current?.close();
		action.onPress();
	};

	return (
		<View
			accessibilityActions={all.map((action) => ({
				label: action.label,
				name: action.key,
			}))}
			onAccessibilityAction={(event) => {
				const match = all.find(
					(action) => action.key === event.nativeEvent.actionName
				);
				if (match) {
					run(match);
				}
			}}
		>
			<ReanimatedSwipeable
				friction={2}
				leftThreshold={metrics.swipeAction / 2}
				onSwipeableWillOpen={() => haptic("selection")}
				overshootLeft={false}
				overshootRight={false}
				ref={ref}
				renderLeftActions={
					leadingActions?.length
						? () => <ActionStrip actions={leadingActions} onAction={run} />
						: undefined
				}
				renderRightActions={
					trailingActions?.length
						? () => <ActionStrip actions={trailingActions} onAction={run} />
						: undefined
				}
				rightThreshold={metrics.swipeAction / 2}
			>
				{children}
			</ReanimatedSwipeable>
		</View>
	);
}
