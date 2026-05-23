import { useAuth, useSignUp } from "@clerk/expo";
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

export default function SignUpScreen() {
	const { isSignedIn } = useAuth();
	const { errors, fetchStatus, signUp } = useSignUp();
	const router = useRouter();
	const [emailAddress, setEmailAddress] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [code, setCode] = React.useState("");
	const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

	const isFetching = fetchStatus === "fetching";
	const needsEmailVerification =
		signUp.status === "missing_requirements" &&
		signUp.unverifiedFields.includes("email_address") &&
		signUp.missingFields.length === 0;

	const finalizeSignUp = async () => {
		await signUp.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, "/(drawer)/(tabs)");
				}
			},
		});
	};

	const handleSubmit = async () => {
		setStatusMessage(null);

		const { error } = await signUp.password({
			emailAddress,
			password,
		});

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(
					error,
					"Unable to create an account. Please try again."
				)
			);
			return;
		}

		await signUp.verifications.sendEmailCode();
		setStatusMessage(`We sent a verification code to ${emailAddress}.`);
	};

	const handleVerify = async () => {
		setStatusMessage(null);

		await signUp.verifications.verifyEmailCode({ code });

		if (signUp.status === "complete") {
			await finalizeSignUp();
			return;
		}

		setStatusMessage("That code did not complete sign-up. Please try again.");
	};

	if (signUp.status === "complete" || isSignedIn) {
		return null;
	}

	if (needsEmailVerification) {
		return (
			<AuthScreenShell
				subtitle="Finish setup so Convex can scope your trips, chat threads, and Vault files."
				title="Verify your email"
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
					onPress={() => signUp.verifications.sendEmailCode()}
					variant="ghost"
				>
					<Button.Label>Send a new code</Button.Label>
				</Button>
				<View nativeID="clerk-captcha" />
			</AuthScreenShell>
		);
	}

	return (
		<AuthScreenShell
			subtitle="Start with Google, GitHub, or email."
			title="Create your account"
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
				{errors.fields.emailAddress ? (
					<Text className="text-danger text-xs">
						{errors.fields.emailAddress.message}
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
				<Button.Label>Create account</Button.Label>
			</Button>
			<View className="flex-row justify-center gap-1">
				<Text className="text-muted">Already have access?</Text>
				<Link href="/(auth)/sign-in">
					<Text className="font-semibold text-accent">Sign in</Text>
				</Link>
			</View>
			<View nativeID="clerk-captcha" />
		</AuthScreenShell>
	);
}
