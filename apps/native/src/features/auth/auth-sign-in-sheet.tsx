import { useSignIn, useSignUp } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	Input,
	InputOTP,
	REGEXP_ONLY_DIGITS,
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

const OAUTH_SHEET_DISMISS_DELAY_MS = 320;
const EMAIL_CODE_LENGTH = 6;
const OTP_ROW_WIDTH = 304;
const OTP_SLOT_SIZE = 44;

type EmailAuthFlow = "sign-in" | "sign-up";

interface AuthSignInSheetProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getErrorCode = (error: unknown) => {
	if (isObjectRecord(error) && typeof error.code === "string") {
		return error.code;
	}

	if (isObjectRecord(error) && Array.isArray(error.errors)) {
		const [firstError] = error.errors;

		if (isObjectRecord(firstError) && typeof firstError.code === "string") {
			return firstError.code;
		}
	}

	return null;
};

const isMissingAccountError = (error: unknown) => {
	const errorCode = getErrorCode(error);

	if (errorCode === "form_identifier_not_found") {
		return true;
	}

	const message = getAuthErrorMessage(error, "").toLowerCase();

	return (
		message.includes("couldn't find your account") ||
		message.includes("could not find your account") ||
		message.includes("identifier is invalid")
	);
};

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

interface SheetOtpInputProps {
	onChange: (value: string) => void;
	value: string;
}

function SheetOtpInput({ onChange, value }: SheetOtpInputProps) {
	const { onBlur, onFocus } = useBottomSheetAwareHandlers();

	return (
		<View className="items-center">
			<InputOTP
				className="justify-center"
				inputMode="numeric"
				maxLength={EMAIL_CODE_LENGTH}
				onBlur={onBlur}
				onChange={onChange}
				onFocus={onFocus}
				pattern={REGEXP_ONLY_DIGITS}
				style={{ width: OTP_ROW_WIDTH }}
				value={value}
				variant="primary"
			>
				<InputOTP.Group className="w-full flex-row items-center justify-between gap-0">
					{({ slots }) =>
						slots.map((slot) => (
							<React.Fragment key={slot.index}>
								<View
									className="items-center justify-center rounded-2xl border bg-white shadow-sm"
									style={{
										borderColor: slot.isActive ? "#0A84FF" : "#E5E7EB",
										height: OTP_SLOT_SIZE,
										width: OTP_SLOT_SIZE,
									}}
								>
									{slot.char ? (
										<Text weight="semibold">{slot.char}</Text>
									) : null}
									{!slot.char && slot.isCaretVisible ? (
										<View className="h-5 w-0.5 rounded-full bg-muted-foreground" />
									) : null}
								</View>
								{slot.index === 2 ? (
									<View className="h-px w-2 rounded-full bg-border" />
								) : null}
							</React.Fragment>
						))
					}
				</InputOTP.Group>
			</InputOTP>
		</View>
	);
}

export function AuthSignInSheet({
	isOpen,
	onOpenChange,
}: AuthSignInSheetProps) {
	const { fetchStatus: signInFetchStatus, signIn } = useSignIn();
	const { fetchStatus: signUpFetchStatus, signUp } = useSignUp();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [emailAddress, setEmailAddress] = React.useState("");
	const [code, setCode] = React.useState("");
	const [emailAuthFlow, setEmailAuthFlow] =
		React.useState<EmailAuthFlow>("sign-in");
	const [isEmailCodeSent, setIsEmailCodeSent] = React.useState(false);
	const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

	const emailCodeFactor = signIn.supportedSecondFactors.find(
		(factor) => factor.strategy === "email_code"
	);
	const requiresMfaEmailCode =
		signIn.status === "needs_client_trust" ||
		(signIn.status === "needs_second_factor" && !!emailCodeFactor);
	const isCodeStep = isEmailCodeSent || requiresMfaEmailCode;
	const isFetching =
		signInFetchStatus === "fetching" || signUpFetchStatus === "fetching";
	const codeDeliveryAddress = emailCodeFactor?.safeIdentifier ?? emailAddress;

	const finalizeSignIn = async () => {
		await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, "/(app)/(tabs)");
				}
			},
		});
	};

	const finalizeSignUp = async () => {
		const { error } = await signUp.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, "/(app)/(tabs)");
				}
			},
		});

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "Unable to finish account setup.")
			);
		}
	};

	const handleSendEmailCode = async () => {
		setStatusMessage(null);
		setCode("");

		const { error } = await signIn.emailCode.sendCode({
			emailAddress,
		});

		if (error) {
			if (!isMissingAccountError(error)) {
				setStatusMessage(
					getAuthErrorMessage(error, "Unable to send a code. Please try again.")
				);
				return;
			}

			const { error: createError } = await signUp.create({ emailAddress });

			if (createError) {
				setStatusMessage(
					getAuthErrorMessage(
						createError,
						"Unable to create your account. Please try again."
					)
				);
				return;
			}

			const { error: sendCodeError } =
				await signUp.verifications.sendEmailCode();

			if (sendCodeError) {
				setStatusMessage(
					getAuthErrorMessage(
						sendCodeError,
						"Unable to send a code. Please try again."
					)
				);
				return;
			}

			setEmailAuthFlow("sign-up");
			setIsEmailCodeSent(true);
			return;
		}

		if (signIn.status === "complete") {
			await finalizeSignIn();
			return;
		}

		setEmailAuthFlow("sign-in");
		setIsEmailCodeSent(true);
	};

	const handleResendEmailCode = async () => {
		setStatusMessage(null);
		setCode("");

		if (emailAuthFlow === "sign-up") {
			const { error } = await signUp.verifications.sendEmailCode();

			if (error) {
				setStatusMessage(
					getAuthErrorMessage(error, "Unable to send a new code.")
				);
			}

			return;
		}

		if (requiresMfaEmailCode) {
			const { error } = await signIn.mfa.sendEmailCode();

			if (error) {
				setStatusMessage(
					getAuthErrorMessage(error, "Unable to send a new code.")
				);
			}

			return;
		}

		const { error } = await signIn.emailCode.sendCode({ emailAddress });

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "Unable to send a new code.")
			);
		}
	};

	const handleVerify = async () => {
		setStatusMessage(null);

		if (emailAuthFlow === "sign-up") {
			const { error } = await signUp.verifications.verifyEmailCode({ code });

			if (error) {
				setStatusMessage(
					getAuthErrorMessage(
						error,
						"That code did not work. Please try again."
					)
				);
				return;
			}

			await finalizeSignUp();
			return;
		}

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
			return;
		}

		setStatusMessage("That code did not complete sign-in. Please try again.");
	};

	const handleOpenChange = (nextIsOpen: boolean) => {
		onOpenChange(nextIsOpen);

		if (!nextIsOpen) {
			setCode("");
			setEmailAuthFlow("sign-in");
			setIsEmailCodeSent(false);
			setStatusMessage(null);
		}
	};

	const handleBeforeOAuthStart = React.useCallback(async () => {
		onOpenChange(false);
		await new Promise((resolve) => {
			setTimeout(resolve, OAUTH_SHEET_DISMISS_DELAY_MS);
		});
	}, [onOpenChange]);

	const handleOAuthFallback = React.useCallback(() => {
		onOpenChange(true);
	}, [onOpenChange]);

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
							<ViyaMark size={56} />
						</View>

						<View className="items-center gap-2">
							<BottomSheet.Title className="text-center">
								Sign in to Viya
							</BottomSheet.Title>
							<BottomSheet.Description className="max-w-72.5 text-center">
								Use Google, GitHub, or your email to continue.
							</BottomSheet.Description>
						</View>

						<AuthStatusMessage message={statusMessage} />

						{isCodeStep ? (
							<View className="gap-5">
								<Text.Paragraph align="center" color="muted" type="body-sm">
									Enter the {EMAIL_CODE_LENGTH}-digit code sent to{" "}
									<Text weight="semibold">{codeDeliveryAddress}</Text>.
								</Text.Paragraph>
								<SheetOtpInput onChange={setCode} value={code} />
								<Button
									isDisabled={isFetching || code.length < EMAIL_CODE_LENGTH}
									onPress={handleVerify}
								>
									<Button.Label>Verify</Button.Label>
								</Button>
								<Button
									isDisabled={isFetching}
									onPress={handleResendEmailCode}
									variant="ghost"
								>
									<Button.Label>Send a new code</Button.Label>
								</Button>
							</View>
						) : (
							<View className="gap-4">
								<AuthSocialButtons
									onBeforeOAuthStart={handleBeforeOAuthStart}
									onOAuthFallback={handleOAuthFallback}
									onStatusMessageChange={setStatusMessage}
								/>
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
								</View>
								<Button
									isDisabled={!emailAddress.trim() || isFetching}
									onPress={handleSendEmailCode}
								>
									<Ionicons color="#FFFFFF" name="mail-outline" size={18} />
									<Button.Label>Continue with email</Button.Label>
								</Button>
							</View>
						)}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
