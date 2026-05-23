import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card, Surface } from "heroui-native";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";

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
			<Text className="flex-1 text-muted text-sm leading-5" selectable>
				{message}
			</Text>
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

				<Card className="gap-5 rounded-[28px] border border-border bg-surface p-5">
					<Card.Header className="gap-2">
						<Card.Title className="text-2xl">{title}</Card.Title>
						{subtitle ? (
							<Card.Description className="text-sm leading-5">
								{subtitle}
							</Card.Description>
						) : null}
					</Card.Header>
					{children}
				</Card>
				<Pressable
					accessibilityLabel="View getting started"
					accessibilityRole="button"
					className="self-center rounded-full px-4 py-2"
					onPress={handleGettingStartedPress}
				>
					<Text className="text-center font-semibold text-muted text-sm">
						View getting started
					</Text>
				</Pressable>
			</View>
		</Container>
	);
}
