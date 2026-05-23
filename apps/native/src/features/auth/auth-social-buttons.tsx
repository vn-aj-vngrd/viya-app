import { useSSO } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";
import { Button } from "heroui-native";
import React from "react";
import { View } from "react-native";

import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";

maybeCompleteAuthSession();

const SIGNED_IN_HOME = "/(app)/(tabs)";
const SOCIAL_ICON_COLOR = "#18181B";

const SOCIAL_PROVIDERS = [
	{
		icon: "logo-google",
		label: "Continue with Google",
		strategy: "oauth_google",
	},
	{
		icon: "logo-github",
		label: "Continue with GitHub",
		strategy: "oauth_github",
	},
] as const;

interface AuthSocialButtonsProps {
	onStatusMessageChange: (message: string | null) => void;
}

export function AuthSocialButtons({
	onStatusMessageChange,
}: AuthSocialButtonsProps) {
	const router = useRouter();
	const { startSSOFlow } = useSSO();
	const [activeStrategy, setActiveStrategy] = React.useState<
		(typeof SOCIAL_PROVIDERS)[number]["strategy"] | null
	>(null);

	const handleSocialSignIn = async (
		strategy: (typeof SOCIAL_PROVIDERS)[number]["strategy"]
	) => {
		onStatusMessageChange(null);
		setActiveStrategy(strategy);

		try {
			const { createdSessionId, setActive } = await startSSOFlow({
				redirectUrl: makeRedirectUri({
					path: "sso-callback",
					scheme: "viya-app",
				}),
				strategy,
			});

			if (!(createdSessionId && setActive)) {
				onStatusMessageChange("Social sign-in was cancelled.");
				return;
			}

			await setActive({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) {
						onStatusMessageChange(
							"Finish the remaining account step before Viya can open."
						);
						return;
					}

					pushDecoratedUrl(router, decorateUrl, SIGNED_IN_HOME);
				},
				session: createdSessionId,
			});
		} catch (error) {
			onStatusMessageChange(
				getAuthErrorMessage(
					error,
					"Unable to continue with this provider. Please try again."
				)
			);
		} finally {
			setActiveStrategy(null);
		}
	};

	return (
		<View className="gap-2">
			{SOCIAL_PROVIDERS.map((provider) => (
				<Button
					className="rounded-full"
					isDisabled={activeStrategy !== null}
					key={provider.strategy}
					onPress={() => handleSocialSignIn(provider.strategy)}
					style={{
						backgroundColor: "#FFFFFF",
						borderColor: "#E5E7EB",
						borderWidth: 1,
					}}
					variant="secondary"
				>
					<View className="flex-row items-center justify-center gap-2">
						<Ionicons
							color={SOCIAL_ICON_COLOR}
							name={provider.icon}
							size={18}
						/>
						<Button.Label className="text-foreground">
							{activeStrategy === provider.strategy
								? "Opening..."
								: provider.label}
						</Button.Label>
					</View>
				</Button>
			))}
		</View>
	);
}
