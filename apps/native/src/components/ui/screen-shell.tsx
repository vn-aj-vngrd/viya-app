import { Stack, useRouter } from "expo-router";
import type { NativeStackNavigationOptions } from "expo-router/build/react-navigation/native-stack";
import { Menu } from "heroui-native";
import { type ReactNode, useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "./app-text";
import { EmptyState } from "./empty-state";
import { Icon, type IconName, SF_SYMBOL_MAP } from "./icon";
import { LoadingState } from "./loading-state";
import { metrics, spacing } from "./tokens";
import { useUITheme } from "./use-ui-theme";

export type ShellTitleMode = "large" | "inline";

export interface ShellMenuItem {
	destructive?: boolean;
	disabled?: boolean;
	icon: IconName;
	key: string;
	onPress: () => void;
	title: string;
}

export type ShellAction =
	| {
			disabled?: boolean;
			icon: IconName;
			key: string;
			label: string;
			onPress: () => void;
			type: "button";
	  }
	| {
			disabled?: boolean;
			key: string;
			label: string;
			onPress: () => void;
			prominent?: boolean;
			type: "text";
	  }
	| {
			icon: IconName;
			items: ShellMenuItem[];
			key: string;
			label: string;
			type: "menu";
	  };

export type ShellLeading =
	| "back"
	| "close"
	| "none"
	| { icon: IconName; label: string; onPress: () => void };

export type ShellState =
	| { kind: "loading"; title: string }
	| {
			action?: { label: string; onPress: () => void };
			description: string;
			icon: IconName;
			kind: "empty" | "error";
			title: string;
	  };

export interface ShellHeaderProps {
	actions?: ShellAction[];
	leading?: ShellLeading;
	search?: { onChangeText: (text: string) => void; placeholder: string };
	title: string;
	titleMode?: ShellTitleMode;
}

/**
 * The one set of native stack header options. Applied by every Stack so no
 * screen sets header colours, fonts or heights itself.
 */
export function useShellScreenOptions(): NativeStackNavigationOptions {
	const { palette } = useUITheme();

	return {
		contentStyle: { backgroundColor: palette.canvas },
		headerBackButtonDisplayMode: "minimal",
		headerLargeTitleShadowVisible: false,
		headerLargeTitleStyle: { color: palette.ink },
		headerShadowVisible: false,
		headerShown: true,
		headerTintColor: palette.ink,
		headerTitleStyle: { color: palette.ink },
		...(Platform.OS === "ios"
			? {
					headerLargeStyle: { backgroundColor: "transparent" },
					headerTransparent: true,
				}
			: {
					headerStyle: { backgroundColor: palette.canvas },
					headerTransparent: false,
				}),
	};
}

const sfSymbolFor = (name: IconName) => SF_SYMBOL_MAP[name] ?? "circle";

function HeaderIconButton({
	icon,
	label,
	onPress,
	disabled,
}: {
	disabled?: boolean;
	icon: IconName;
	label: string;
	onPress?: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			android_ripple={{
				borderless: true,
				color: palette.selection,
				radius: 24,
			}}
			disabled={disabled}
			onPress={onPress}
			style={{
				alignItems: "center",
				height: 48,
				justifyContent: "center",
				width: 48,
			}}
		>
			<Icon name={icon} size={24} tone="primary" />
		</Pressable>
	);
}

function HeaderMenu({
	icon,
	items,
	label,
}: {
	icon: IconName;
	items: ShellMenuItem[];
	label: string;
}) {
	return (
		<Menu>
			<Menu.Trigger asChild={true}>
				<HeaderIconButton icon={icon} label={label} />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Overlay />
				<Menu.Content
					align="end"
					className="rounded-[20px] bg-surface p-2"
					offset={8}
					placement="bottom"
					presentation="popover"
					width={248}
				>
					{items.map((item) => (
						<Menu.Item
							accessibilityLabel={item.title}
							className="min-h-11 flex-row items-center gap-3 rounded-[14px] p-2.5"
							isAnimatedStyleActive={false}
							isDisabled={item.disabled}
							key={item.key}
							onPress={item.onPress}
						>
							<Icon
								name={item.icon}
								size={18}
								tone={item.destructive ? "danger" : "primary"}
							/>
							<Menu.ItemTitle className={item.destructive ? "text-danger" : ""}>
								{item.title}
							</Menu.ItemTitle>
						</Menu.Item>
					))}
				</Menu.Content>
			</Menu.Portal>
		</Menu>
	);
}

function HeaderActions({ actions }: { actions: ShellAction[] }) {
	return (
		<View style={{ alignItems: "center", flexDirection: "row" }}>
			{actions.map((action) => {
				if (action.type === "button") {
					return (
						<HeaderIconButton
							disabled={action.disabled}
							icon={action.icon}
							key={action.key}
							label={action.label}
							onPress={action.onPress}
						/>
					);
				}
				if (action.type === "menu") {
					return (
						<HeaderMenu
							icon={action.icon}
							items={action.items}
							key={action.key}
							label={action.label}
						/>
					);
				}
				return (
					<Pressable
						accessibilityLabel={action.label}
						accessibilityRole="button"
						disabled={action.disabled}
						key={action.key}
						onPress={action.onPress}
						style={{
							justifyContent: "center",
							minHeight: metrics.minTarget,
							paddingHorizontal: spacing.sm,
						}}
					>
						<AppText tone="accent" variant="headline">
							{action.label}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}

function IosToolbarRight({ actions }: { actions: ShellAction[] }) {
	const { palette } = useUITheme();

	return (
		<Stack.Toolbar placement="right">
			{actions.map((action) => {
				if (action.type === "button") {
					return (
						<Stack.Toolbar.Button
							accessibilityLabel={action.label}
							disabled={action.disabled}
							icon={sfSymbolFor(action.icon)}
							key={action.key}
							onPress={action.onPress}
							tintColor={palette.ink}
						/>
					);
				}
				if (action.type === "text") {
					return (
						<Stack.Toolbar.Button
							accessibilityLabel={action.label}
							disabled={action.disabled}
							key={action.key}
							onPress={action.onPress}
							variant={action.prominent ? "prominent" : "plain"}
						>
							{action.label}
						</Stack.Toolbar.Button>
					);
				}
				return (
					<Stack.Toolbar.Menu
						accessibilityLabel={action.label}
						icon={sfSymbolFor(action.icon)}
						key={action.key}
						tintColor={palette.ink}
					>
						{action.items.map((item) => (
							<Stack.Toolbar.MenuAction
								destructive={item.destructive}
								disabled={item.disabled}
								icon={sfSymbolFor(item.icon)}
								key={item.key}
								onPress={item.onPress}
							>
								{item.title}
							</Stack.Toolbar.MenuAction>
						))}
					</Stack.Toolbar.Menu>
				);
			})}
		</Stack.Toolbar>
	);
}

/** Header only: renders no view in the page. Chat uses this with its own body. */
export function ShellHeader({
	actions = [],
	leading = "back",
	search,
	title,
	titleMode = "inline",
}: ShellHeaderProps) {
	const router = useRouter();
	const { palette } = useUITheme();
	const isIos = Platform.OS === "ios";
	const customLeading = typeof leading === "object" ? leading : null;
	const closeLeading =
		leading === "close"
			? {
					icon: "close" as IconName,
					label: "Close",
					onPress: () => router.back(),
				}
			: null;
	const leadingButton = customLeading ?? closeLeading;

	const androidOptions: NativeStackNavigationOptions = isIos
		? {}
		: {
				headerLeft: leadingButton
					? () => (
							<HeaderIconButton
								icon={leadingButton.icon}
								label={leadingButton.label}
								onPress={leadingButton.onPress}
							/>
						)
					: undefined,
				headerRight:
					actions.length > 0
						? () => <HeaderActions actions={actions} />
						: undefined,
			};

	return (
		<>
			<Stack.Screen
				options={{
					headerBackVisible: leading === "back",
					headerLargeTitle: titleMode === "large",
					title,
					...androidOptions,
				}}
			/>
			{isIos && actions.length > 0 ? (
				<IosToolbarRight actions={actions} />
			) : null}
			{isIos && leadingButton ? (
				<Stack.Toolbar placement="left">
					<Stack.Toolbar.Button
						accessibilityLabel={leadingButton.label}
						icon={sfSymbolFor(leadingButton.icon)}
						onPress={leadingButton.onPress}
						tintColor={palette.ink}
					/>
				</Stack.Toolbar>
			) : null}
			{search ? (
				<Stack.SearchBar
					autoCapitalize="none"
					barTintColor={palette.fill}
					headerIconColor={palette.inkSecondary}
					hideWhenScrolling={false}
					hintTextColor={palette.inkTertiary}
					onChangeText={(event) => search.onChangeText(event.nativeEvent.text)}
					placeholder={search.placeholder}
					textColor={palette.ink}
					tintColor={palette.accent}
				/>
			) : null}
		</>
	);
}

function ShellStateView({ state }: { state: ShellState }) {
	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				paddingHorizontal: spacing.screen,
			}}
		>
			{state.kind === "loading" ? (
				<LoadingState title={state.title} />
			) : (
				<EmptyState
					action={state.action}
					description={state.description}
					icon={state.icon}
					title={state.title}
				/>
			)}
		</View>
	);
}

function ShellFooter({
	children,
	onLayout,
}: {
	children: ReactNode;
	onLayout: (height: number) => void;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();

	return (
		<View
			onLayout={(event) => onLayout(event.nativeEvent.layout.height)}
			style={{
				backgroundColor: palette.canvas,
				bottom: 0,
				gap: spacing.sm,
				left: 0,
				position: "absolute",
				right: 0,
				paddingBottom: Math.max(insets.bottom, spacing.lg),
				paddingHorizontal: spacing.screen,
				paddingTop: spacing.md,
			}}
		>
			{children}
		</View>
	);
}

export interface ScreenShellProps extends ShellHeaderProps {
	children?: ReactNode;
	footer?: ReactNode;
	/** Default true: children get the 20pt column. False for edge-to-edge. */
	inset?: boolean;
	sheets?: ReactNode;
	state?: ShellState;
	/** One quiet line, first content line. Never repeats the trip name. */
	summary?: string;
	/** Keep false: the shell already owns the scroll view. */
}

/**
 * One layout shell: native header, scroll, optional footer, states, sheets.
 * The ScrollView must stay the screen's first direct child (no wrapping View):
 * react-native-screens ties the large-title collapse and blur to it.
 */
export function ScreenShell({
	children,
	footer,
	inset = true,
	sheets,
	state,
	summary,
	...headerProps
}: ScreenShellProps) {
	const insets = useSafeAreaInsets();
	const isLarge = headerProps.titleMode === "large";
	const [footerHeight, setFooterHeight] = useState(0);
	const hasFooter = Boolean(footer) && !state;

	return (
		<>
			<ScrollView
				automaticallyAdjustsScrollIndicatorInsets={true}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: hasFooter
						? footerHeight + spacing.xl
						: spacing["2xl"] + (Platform.OS === "android" ? insets.bottom : 0),
					paddingTop: isLarge ? spacing.sm : spacing.lg,
				}}
				contentInsetAdjustmentBehavior="automatic"
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{summary && !state ? (
					<AppText
						style={{
							marginBottom: spacing.lg,
							paddingHorizontal: spacing.screen,
						}}
						tone="secondary"
						variant="subhead"
					>
						{summary}
					</AppText>
				) : null}
				{state ? (
					<ShellStateView state={state} />
				) : (
					<View
						style={{
							gap: spacing.section,
							paddingHorizontal: inset ? spacing.screen : 0,
						}}
					>
						{children}
					</View>
				)}
			</ScrollView>
			{hasFooter ? (
				<ShellFooter onLayout={setFooterHeight}>{footer}</ShellFooter>
			) : null}
			{sheets}
			<ShellHeader {...headerProps} />
		</>
	);
}
