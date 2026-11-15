import { useSSO } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import {
	AppText,
	metrics,
	PressableScale,
	radius,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";

maybeCompleteAuthSession();

const SIGNED_IN_HOME = "/(app)/(tabs)";
const OAUTH_REOPEN_DELAY_MS = 250;

const SOCIAL_PROVIDERS = [
	{
		icon: "google",
		label: "Continue with Google",
		strategy: "oauth_google",
	},
	{
		icon: "logo-github",
		label: "Continue with GitHub",
		strategy: "oauth_github",
	},
] as const;

function GoogleLogo() {
	return (
		<Svg height={18} viewBox="0 0 18 18" width={18}>
			<Path
				d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
				fill="#4285F4"
			/>
			<Path
				d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
				fill="#34A853"
			/>
			<Path
				d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
				fill="#FBBC05"
			/>
			<Path
				d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.67 8.67 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
				fill="#EA4335"
			/>
		</Svg>
	);
}

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
					"Unable to continue with this provider. Please try again."
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
	const { palette } = useUITheme();
	const isActive = activeStrategy === provider.strategy;
	const isDisabled = activeStrategy !== null;
	let startContent: React.ReactNode =
		provider.icon === "google" ? (
			<GoogleLogo />
		) : (
			<Ionicons color={palette.ink} name={provider.icon} size={18} />
		);

	if (isActive) {
		startContent = <ActivityIndicator color={palette.inkSecondary} />;
	}

	return (
		<PressableScale
			accessibilityLabel={provider.label}
			accessibilityState={{ busy: isActive, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={onPress}
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: spacing.sm,
				height: metrics.actionHeight,
				justifyContent: "center",
				opacity: isDisabled && !isActive ? 0.5 : 1,
				paddingHorizontal: spacing.section,
			}}
		>
			{startContent}
			<AppText bold={true} numberOfLines={1}>
				{isActive ? "Opening..." : provider.label}
			</AppText>
		</PressableScale>
	);
}
