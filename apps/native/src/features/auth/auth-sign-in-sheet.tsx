import { useSignIn } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	Input,
	Text,
	TextField,
	useBottomSheetAwareHandlers,
} from "heroui-native";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ViyaMark } from "@/src/components/viya-mark";
import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";
import { AuthStatusMessage } from "@/src/features/auth/auth-screen-shell";
import { AuthSocialButtons } from "@/src/features/auth/auth-social-buttons";

interface AuthSignInSheetProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
}

interface SheetInputProps {
	autoCapitalize?: "none";
	keyboardType?: "email-address" | "numeric";
	onChangeText: (value: string) => void;
	placeholder: string;
	secureTextEntry?: boolean;
	value: string;
}

function SheetInput({
	autoCapitalize,
	keyboardType,
	onChangeText,
	placeholder,
	secureTextEntry,
	value,
}: SheetInputProps) {
	const { onBlur, onFocus } = useBottomSheetAwareHandlers();

	return (
		<TextField>
			<Input
				autoCapitalize={autoCapitalize}
				keyboardType={keyboardType}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				secureTextEntry={secureTextEntry}
				style={{
					backgroundColor: "#FFFFFF",
					borderColor: "#E5E7EB",
					borderWidth: 1,
				}}
				value={value}
			/>
		</TextField>
	);
}

export function AuthSignInSheet({
	isOpen,
	onOpenChange,
}: AuthSignInSheetProps) {
	const { errors, fetchStatus, signIn } = useSignIn();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [emailAddress, setEmailAddress] = React.useState("");
	const [code, setCode] = React.useState("");
	const [isEmailCodeSent, setIsEmailCodeSent] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

	const emailCodeFactor = signIn.supportedSecondFactors.find(
		(factor) => factor.strategy === "email_code"
	);
	const requiresMfaEmailCode =
		signIn.status === "needs_client_trust" ||
		(signIn.status === "needs_second_factor" && !!emailCodeFactor);
	const isCodeStep = isEmailCodeSent || requiresMfaEmailCode;
	const isFetching = fetchStatus === "fetching";

	const finalizeSignIn = async () => {
		await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, "/(app)/(tabs)");
				}
			},
		});
	};

	const handleSendEmailCode = async () => {
		setStatusMessage(null);

		const { error } = await signIn.emailCode.sendCode({
			emailAddress,
		});

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "Unable to send a code. Please try again.")
			);
			return;
		}

		if (signIn.status === "complete") {
			await finalizeSignIn();
			return;
		}

		setIsEmailCodeSent(true);
		setStatusMessage(`We sent a code to ${emailAddress}.`);
	};

	const handleVerify = async () => {
		setStatusMessage(null);

		const { error } = requiresMfaEmailCode
			? await signIn.mfa.verifyEmailCode({ code })
			: await signIn.emailCode.verifyCode({ code });

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "That code did not work. Please try again.")
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
			setCode("");
			setStatusMessage(
				`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`
			);
			return;
		}

		setStatusMessage("That code did not complete sign-in. Please try again.");
	};

	const handleOpenChange = (nextIsOpen: boolean) => {
		onOpenChange(nextIsOpen);

		if (!nextIsOpen) {
			setCode("");
			setIsEmailCodeSent(false);
			setStatusMessage(null);
		}
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px]"
					enablePanDownToClose={true}
					keyboardBehavior="extend"
				>
					<View
						className="gap-5 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="items-center">
							<View className="mb-4 h-1.5 w-10 rounded-full bg-border" />
							<ViyaMark size={56} />
						</View>

						<View className="items-center gap-2">
							<BottomSheet.Title className="text-center">
								Sign in to Viya
							</BottomSheet.Title>
							<BottomSheet.Description className="max-w-[290px] text-center">
								Use Google, GitHub, or your email to continue.
							</BottomSheet.Description>
						</View>

						<AuthStatusMessage message={statusMessage} />

						{isCodeStep ? (
							<View className="gap-4">
								<Text.Paragraph align="center" color="muted" type="body-sm">
									Enter the code sent to{" "}
									<Text weight="semibold">{emailAddress}</Text>.
								</Text.Paragraph>
								<SheetInput
									keyboardType="numeric"
									onChangeText={setCode}
									placeholder="Verification code"
									value={code}
								/>
								{errors.fields.code ? (
									<Text className="text-danger" type="body-xs">
										{errors.fields.code.message}
									</Text>
								) : null}
								<Button
									isDisabled={isFetching || !code.trim()}
									onPress={handleVerify}
								>
									<Button.Label>Verify</Button.Label>
								</Button>
								<Button
									isDisabled={isFetching}
									onPress={handleSendEmailCode}
									variant="ghost"
								>
									<Button.Label>Send a new code</Button.Label>
								</Button>
							</View>
						) : (
							<View className="gap-4">
								<AuthSocialButtons onStatusMessageChange={setStatusMessage} />
								<View className="flex-row items-center gap-3">
									<View className="h-px flex-1 bg-border" />
									<Text color="muted" type="body-xs">
										or use email
									</Text>
									<View className="h-px flex-1 bg-border" />
								</View>
								<View className="gap-3">
									<SheetInput
										autoCapitalize="none"
										keyboardType="email-address"
										onChangeText={setEmailAddress}
										placeholder="Email address"
										value={emailAddress}
									/>
									{errors.fields.identifier ? (
										<Text className="text-danger" type="body-xs">
											{errors.fields.identifier.message}
										</Text>
									) : null}
								</View>
								<Button
									isDisabled={!emailAddress.trim() || isFetching}
									onPress={handleSendEmailCode}
								>
									<Ionicons color="#FFFFFF" name="mail-outline" size={18} />
									<Button.Label>Send email code</Button.Label>
								</Button>
							</View>
						)}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
