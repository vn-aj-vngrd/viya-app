import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	AppText,
	Icon,
	type IconName,
	PrimaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { ViyaMark } from "@/src/components/viya-mark";
import { AuthSignInSheet } from "@/src/features/auth/auth-sign-in-sheet";

const HIGHLIGHTS = [
	{
		description:
			"Tell Viya a mood, a budget or a rough idea and get a day-by-day plan.",
		icon: "chatbubble-outline",
		title: "Plan by chatting",
	},
	{
		description:
			"Bookings, documents, budget and packing, checked in one place.",
		icon: "checkmark-done-outline",
		title: "Know you are ready",
	},
	{
		description: "Moments, places and spending become a recap you can share.",
		icon: "images-outline",
		title: "Keep the story",
	},
] as const satisfies readonly {
	description: string;
	icon: IconName;
	title: string;
}[];

function Highlight({
	description,
	icon,
	title,
}: {
	description: string;
	icon: IconName;
	title: string;
}) {
	return (
		<View accessible={true} style={{ flexDirection: "row", gap: spacing.lg }}>
			<View style={{ width: spacing["2xl"] }}>
				<Icon name={icon} size={26} tone="accent" />
			</View>
			<View style={{ flex: 1, gap: 2 }}>
				<AppText variant="headline">{title}</AppText>
				<AppText tone="secondary" variant="subhead">
					{description}
				</AppText>
			</View>
		</View>
	);
}

export default function AuthWelcomeScreen() {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const [isSignInOpen, setIsSignInOpen] = useState(false);

	return (
		<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					gap: spacing["2xl"],
					justifyContent: "center",
					paddingBottom: spacing.xl,
					paddingHorizontal: spacing.screen,
					paddingTop: insets.top + spacing["2xl"],
				}}
				showsVerticalScrollIndicator={false}
			>
				<View style={{ gap: spacing.lg }}>
					<ViyaMark size={56} />
					<View style={{ gap: spacing.sm }}>
						<AppText accessibilityRole="header" variant="largeTitle">
							Welcome to Viya
						</AppText>
						<AppText tone="secondary">
							Plan a trip in chat, check you are ready, and keep a recap.
						</AppText>
					</View>
				</View>
				<View style={{ gap: spacing.xl }}>
					{HIGHLIGHTS.map((item) => (
						<Highlight key={item.title} {...item} />
					))}
				</View>
			</ScrollView>
			<View
				style={{
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.md,
				}}
			>
				<PrimaryButton
					fullWidth={true}
					label="Continue"
					onPress={() => setIsSignInOpen(true)}
				/>
			</View>
			<AuthSignInSheet isOpen={isSignInOpen} onOpenChange={setIsSignInOpen} />
		</View>
	);
}
