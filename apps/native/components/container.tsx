import { cn } from "heroui-native";
import type { PropsWithChildren } from "react";
import {
	ScrollView,
	type ScrollViewProps,
	View,
	type ViewProps,
} from "react-native";
import Animated, { type AnimatedProps } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = AnimatedProps<ViewProps> & {
	className?: string;
	includeBottomInset?: boolean;
	isScrollable?: boolean;
	scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle">;
};

export function Container({
	children,
	className,
	includeBottomInset = true,
	isScrollable = true,
	scrollViewProps,
	style,
	...props
}: PropsWithChildren<Props>) {
	const insets = useSafeAreaInsets();

	return (
		<AnimatedView
			className={cn("flex-1 bg-background", className)}
			style={[{ paddingBottom: includeBottomInset ? insets.bottom : 0 }, style]}
			{...props}
		>
			{isScrollable ? (
				<ScrollView
					contentContainerStyle={{ flexGrow: 1 }}
					contentInsetAdjustmentBehavior="automatic"
					keyboardShouldPersistTaps="handled"
					{...scrollViewProps}
				>
					{children}
				</ScrollView>
			) : (
				<View className="flex-1">{children}</View>
			)}
		</AnimatedView>
	);
}
