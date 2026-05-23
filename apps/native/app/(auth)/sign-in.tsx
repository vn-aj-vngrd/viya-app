import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { Button, Input, TextField } from "heroui-native";
import React from "react";
import { Text, View } from "react-native";
import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";
import {
	AuthScreenShell,
	AuthStatusMessage,
} from "@/src/features/auth/auth-screen-shell";
import { AuthSocialButtons } from "@/src/features/auth/auth-social-buttons";

export default function SignInScreen() {
	const { errors, fetchStatus, signIn } = useSignIn();
	const router = useRouter();
	const [emailAddress, setEmailAddress] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [code, setCode] = React.useState("");
	const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

	const emailCodeFactor = signIn.supportedSecondFactors.find(
		(factor) => factor.strategy === "email_code"
	);
	const requiresEmailCode =
		signIn.status === "needs_client_trust" ||
		(signIn.status === "needs_second_factor" && !!emailCodeFactor);
	const isFetching = fetchStatus === "fetching";

	const finalizeSignIn = async () => {
		await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, "/(drawer)/(tabs)");
				}
			},
		});
	};

	const handleSubmit = async () => {
		setStatusMessage(null);

		const { error } = await signIn.password({
			emailAddress,
			password,
		});

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "Unable to sign in. Please try again.")
			);
			return;
		}

		if (signIn.status === "complete") {
			await finalizeSignIn();
			return;
		}

		if (
			(signIn.status === "needs_second_factor" ||
				signIn.status === "needs_client_trust") &&
			emailCodeFactor
		) {
			await signIn.mfa.sendEmailCode();
			setStatusMessage(
				`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`
			);
			return;
		}

		setStatusMessage("Sign-in could not be completed. Try again in a moment.");
	};

	const handleVerify = async () => {
		setStatusMessage(null);

		await signIn.mfa.verifyEmailCode({ code });

		if (signIn.status === "complete") {
			await finalizeSignIn();
			return;
		}

		setStatusMessage("That code did not complete sign-in. Please try again.");
	};

	if (requiresEmailCode) {
		return (
			<AuthScreenShell
				subtitle="Confirm it is really you before Viya opens your trips and saved travel files."
				title="Verify your account"
			>
				<AuthStatusMessage message={statusMessage} />
				<TextField>
					<Input
						keyboardType="numeric"
						onChangeText={setCode}
						placeholder="Verification code"
						style={{
							backgroundColor: "#FFFFFF",
							borderColor: "#E5E7EB",
							borderWidth: 1,
						}}
						value={code}
					/>
				</TextField>
				{errors.fields.code ? (
					<Text className="text-danger text-xs">
						{errors.fields.code.message}
					</Text>
				) : null}
				<Button isDisabled={isFetching || !code.trim()} onPress={handleVerify}>
					<Button.Label>Verify</Button.Label>
				</Button>
				<Button
					isDisabled={isFetching}
					onPress={() => signIn.mfa.sendEmailCode()}
					variant="ghost"
				>
					<Button.Label>Send a new code</Button.Label>
				</Button>
			</AuthScreenShell>
		);
	}

	return (
		<AuthScreenShell
			subtitle="Continue with Google, GitHub, or email."
			title="Welcome back"
		>
			<AuthStatusMessage message={statusMessage} />
			<AuthSocialButtons onStatusMessageChange={setStatusMessage} />
			<View className="flex-row items-center gap-3">
				<View className="h-px flex-1 bg-border" />
				<Text className="text-muted text-xs">or use email</Text>
				<View className="h-px flex-1 bg-border" />
			</View>
			<View className="gap-3">
				<TextField>
					<Input
						autoCapitalize="none"
						keyboardType="email-address"
						onChangeText={setEmailAddress}
						placeholder="Email address"
						style={{
							backgroundColor: "#FFFFFF",
							borderColor: "#E5E7EB",
							borderWidth: 1,
						}}
						value={emailAddress}
					/>
				</TextField>
				{errors.fields.identifier ? (
					<Text className="text-danger text-xs">
						{errors.fields.identifier.message}
					</Text>
				) : null}
				<TextField>
					<Input
						onChangeText={setPassword}
						placeholder="Password"
						secureTextEntry={true}
						style={{
							backgroundColor: "#FFFFFF",
							borderColor: "#E5E7EB",
							borderWidth: 1,
						}}
						value={password}
					/>
				</TextField>
				{errors.fields.password ? (
					<Text className="text-danger text-xs">
						{errors.fields.password.message}
					</Text>
				) : null}
			</View>
			<Button
				isDisabled={!(emailAddress.trim() && password) || isFetching}
				onPress={handleSubmit}
			>
				<Button.Label>Sign in</Button.Label>
			</Button>
			<View className="flex-row justify-center gap-1">
				<Text className="text-muted">New to Viya?</Text>
				<Link href="/(auth)/sign-up">
					<Text className="font-semibold text-accent">Create an account</Text>
				</Link>
			</View>
		</AuthScreenShell>
	);
}
