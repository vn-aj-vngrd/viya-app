import { useSSO } from "@clerk/expo";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";
import React from "react";
import { View } from "react-native";

import { SecondaryButton, spacing } from "@/src/components/ui";
import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";

maybeCompleteAuthSession();

const SIGNED_IN_HOME = "/(app)/(tabs)/(discover)";
const OAUTH_REOPEN_DELAY_MS = 250;

const SOCIAL_PROVIDERS = [
	{
		label: "Continue with Google",
		strategy: "oauth_google",
	},
	{
		label: "Continue with GitHub",
		strategy: "oauth_github",
	},
] as const;

interface AuthSocialButtonsProps {
	onBeforeOAuthStart?: () => Promise<void> | void;
	onOAuthFallback?: () => void;
	onStatusMessageChange: (message: string | null) => void;
}

export function AuthSocialButtons({
	onBeforeOAuthStart,
	onOAuthFallback,
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
			await onBeforeOAuthStart?.();

			const { createdSessionId, setActive } = await startSSOFlow({
				redirectUrl: makeRedirectUri({
					path: "sso-callback",
					scheme: "viya-app",
				}),
				strategy,
			});

			if (!(createdSessionId && setActive)) {
				onStatusMessageChange("Social sign-in was cancelled.");
				setTimeout(() => {
					onOAuthFallback?.();
				}, OAUTH_REOPEN_DELAY_MS);
				return;
			}

			await setActive({
				navigate: ({ session, decorateUrl }) => {
					if (session?.currentTask) {
						onStatusMessageChange(
							"Finish the remaining account step before Viya can open."
						);
						setTimeout(() => {
							onOAuthFallback?.();
						}, OAUTH_REOPEN_DELAY_MS);
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
					"Could not continue with this provider. Try again."
				)
			);
			setTimeout(() => {
				onOAuthFallback?.();
			}, OAUTH_REOPEN_DELAY_MS);
		} finally {
			setActiveStrategy(null);
		}
	};

	return (
		<View style={{ gap: spacing.sm }}>
			{SOCIAL_PROVIDERS.map((provider) => (
				<SocialProviderButton
					activeStrategy={activeStrategy}
					key={provider.strategy}
					onPress={() => handleSocialSignIn(provider.strategy)}
					provider={provider}
				/>
			))}
		</View>
	);
}

function SocialProviderButton({
	activeStrategy,
	onPress,
	provider,
}: {
	activeStrategy: (typeof SOCIAL_PROVIDERS)[number]["strategy"] | null;
	onPress: () => void;
	provider: (typeof SOCIAL_PROVIDERS)[number];
}) {
	const isActive = activeStrategy === provider.strategy;

	return (
		<SecondaryButton
			accessibilityLabel={provider.label}
			disabled={activeStrategy !== null && !isActive}
			isPending={isActive}
			label={provider.label}
			onPress={onPress}
		/>
	);
}
