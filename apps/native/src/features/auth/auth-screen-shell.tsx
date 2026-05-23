import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Surface, Text } from "heroui-native";
import type { PropsWithChildren } from "react";
import { Pressable, View } from "react-native";

import { Container } from "@/components/container";
import { AuthBrand } from "@/src/features/auth/auth-brand";
import { resetCompletedOnboarding } from "@/src/features/auth/onboarding-storage";

interface AuthScreenShellProps
	extends PropsWithChildren<{
		title: string;
		subtitle?: string;
		eyebrow?: string;
	}> {}

interface AuthStatusMessageProps {
	message: string | null;
}

export function AuthStatusMessage({ message }: AuthStatusMessageProps) {
	if (!message) {
		return null;
	}

	return (
		<Surface
			className="flex-row items-start gap-2 rounded-2xl bg-surface-secondary p-3"
			variant="secondary"
		>
			<Ionicons color="#71717A" name="information-circle" size={18} />
			<Text.Paragraph
				className="flex-1 leading-5"
				color="muted"
				selectable={true}
				type="body-sm"
			>
				{message}
			</Text.Paragraph>
		</Surface>
	);
}

export function AuthScreenShell({
	children,
	eyebrow = "Travel, one step ahead",
	title,
	subtitle,
}: AuthScreenShellProps) {
	const router = useRouter();

	const handleGettingStartedPress = async () => {
		await resetCompletedOnboarding();
		router.replace("/(auth)");
	};

	return (
		<Container className="px-5">
			<View className="min-h-full justify-center gap-8 py-10">
				<AuthBrand align="center" subtitle={eyebrow} />

				<Surface className="gap-5 rounded-[28px] border border-border bg-surface p-5">
					<View className="gap-2">
						<Text.Heading type="h3" weight="semibold">
							{title}
						</Text.Heading>
						{subtitle ? (
							<Text.Paragraph
								className="leading-5"
								color="muted"
								type="body-sm"
							>
								{subtitle}
							</Text.Paragraph>
						) : null}
					</View>
					{children}
				</Surface>
				<Pressable
					accessibilityLabel="View getting started"
					accessibilityRole="button"
					className="self-center rounded-full px-4 py-2"
					onPress={handleGettingStartedPress}
				>
					<Text align="center" color="muted" type="body-sm" weight="semibold">
						View getting started
					</Text>
				</Pressable>
			</View>
		</Container>
	);
}
