import { useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
import { ScrollView } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	AppText,
	Card,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { AuthBrand } from "@/src/features/auth/auth-brand";
import { resetCompletedOnboarding } from "@/src/features/auth/onboarding-storage";

interface AuthScreenShellProps
	extends PropsWithChildren<{
		title: string;
		subtitle?: string;
		eyebrow?: string;
	}> {}

export function AuthScreenShell({
	children,
	eyebrow = "Travel, one step ahead",
	title,
	subtitle,
}: AuthScreenShellProps) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();

	const handleGettingStartedPress = async () => {
		await resetCompletedOnboarding();
		router.replace("/(auth)");
	};

	return (
		<ScrollView
			contentContainerStyle={{
				flexGrow: 1,
				gap: spacing["2xl"],
				justifyContent: "center",
				paddingBottom: insets.bottom + spacing.section,
				paddingHorizontal: spacing.screen,
				paddingTop: insets.top + spacing.section,
			}}
			contentInsetAdjustmentBehavior="automatic"
			keyboardShouldPersistTaps="handled"
			style={{ backgroundColor: palette.canvas }}
		>
			<AuthBrand align="center" subtitle={eyebrow} />

			<Animated.View entering={FadeInDown.duration(320)}>
				<Card style={{ gap: spacing.lg }}>
					<Animated.View style={{ gap: spacing.sm }}>
						<AppText accessibilityRole="header" variant="heading">
							{title}
						</AppText>
						{subtitle ? (
							<AppText tone="secondary" variant="subhead">
								{subtitle}
							</AppText>
						) : null}
					</Animated.View>
					{children}
				</Card>
			</Animated.View>
			<SecondaryButton
				accessibilityLabel="View getting started"
				label="View getting started"
				onPress={handleGettingStartedPress}
				variant="plain"
			/>
		</ScrollView>
	);
}
