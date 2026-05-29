import { useSignIn, useSignUp } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
	Alert,
	BottomSheet,
	Button,
	Input,
	Spinner,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

import { ViyaMark } from "@/src/components/viya-mark";
import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";
import { AuthSocialButtons } from "@/src/features/auth/auth-social-buttons";

const OAUTH_SHEET_DISMISS_DELAY_MS = 320;
const EMAIL_CODE_LENGTH = 6;
const OTP_ROW_WIDTH = 320;
const OTP_SLOT_SIZE = 44;
const OTP_SLOT_GAP = 8;
const OTP_SEPARATOR_WIDTH = 8;
const DIGITS_ONLY_PATTERN = /\D/g;
const RESEND_CODE_COOLDOWN_SECONDS = 30;
const OTP_SLOT_INDEXES = [0, 1, 2, 3, 4, 5] as const;
const SIGNED_IN_HOME = "/(app)/(tabs)";
const SIGN_UP_TRANSFER_ERROR_CODE = "sign_up_if_missing_transfer";

type PendingAuthAction = "resend" | "send" | "verify";

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

const isSignUpTransferError = (error: unknown) => {
	if (getErrorCode(error) === SIGN_UP_TRANSFER_ERROR_CODE) {
		return true;
	}

	const message = getAuthErrorMessage(error, "").toLowerCase();

	return message.includes("perform a transfer to sign up");
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
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField>
			<Input
				autoCapitalize={autoCapitalize}
				className="border border-border bg-surface"
				keyboardType={keyboardType}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				secureTextEntry={secureTextEntry}
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
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();
	const inputRef = React.useRef<TextInput>(null);
	const [isFocused, setIsFocused] = React.useState(false);

	const activeSlotIndex = Math.min(value.length, EMAIL_CODE_LENGTH - 1);

	const handleChangeText = (nextValue: string) => {
		onChange(
			nextValue.replace(DIGITS_ONLY_PATTERN, "").slice(0, EMAIL_CODE_LENGTH)
		);
	};

	return (
		<View className="items-center">
			<Pressable
				accessibilityHint={`Enter ${EMAIL_CODE_LENGTH} digit verification code`}
				accessibilityLabel="One-time passcode input"
				accessibilityRole="button"
				onPress={() => inputRef.current?.focus()}
				style={{ height: OTP_SLOT_SIZE, width: OTP_ROW_WIDTH }}
			>
				<View
					className="flex-row items-center"
					style={{ gap: OTP_SLOT_GAP, width: OTP_ROW_WIDTH }}
				>
					{OTP_SLOT_INDEXES.map((slotIndex) => {
						const char = value[slotIndex];
						const isActive = isFocused && slotIndex === activeSlotIndex;
						const isCaretVisible =
							isFocused && !char && slotIndex === value.length;

						return (
							<React.Fragment key={`otp-slot-${slotIndex}`}>
								<View
									className="items-center justify-center rounded-2xl border bg-surface shadow-sm"
									style={{
										borderColor: isActive ? "#0A84FF" : "#E5E7EB",
										height: OTP_SLOT_SIZE,
										width: OTP_SLOT_SIZE,
									}}
								>
									{char ? (
										<Text className="absolute" weight="semibold">
											{char}
										</Text>
									) : null}
									{isCaretVisible ? (
										<View className="absolute h-5 w-0.5 rounded-full bg-muted-foreground" />
									) : null}
								</View>
								{slotIndex === 2 ? (
									<View
										className="h-px rounded-full bg-border"
										style={{ width: OTP_SEPARATOR_WIDTH }}
									/>
								) : null}
							</React.Fragment>
						);
					})}
				</View>
				<TextInput
					autoCapitalize="none"
					autoComplete="one-time-code"
					autoCorrect={false}
					caretHidden={true}
					inputMode="numeric"
					keyboardType="number-pad"
					onBlur={(event) => {
						setIsFocused(false);
						onBlur(event);
					}}
					onChangeText={handleChangeText}
					onFocus={(event) => {
						setIsFocused(true);
						onFocus(event);
					}}
					ref={inputRef}
					style={{
						height: 1,
						opacity: 0,
						position: "absolute",
						width: 1,
					}}
					textContentType="oneTimeCode"
					value={value}
				/>
			</Pressable>
		</View>
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Clerk sign-in, sign-up, MFA, resend, and loading states share one sheet state machine.
export function AuthSignInSheet({
	isOpen,
	onOpenChange,
}: AuthSignInSheetProps) {
	const { fetchStatus: signInFetchStatus, signIn } = useSignIn();
	const { fetchStatus: signUpFetchStatus, signUp } = useSignUp();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const accentForegroundColor = useThemeColor("accent-foreground");
	const [emailAddress, setEmailAddress] = React.useState("");
	const [code, setCode] = React.useState("");
	const [signUpPassword, setSignUpPassword] = React.useState("");
	const [isEmailCodeSent, setIsEmailCodeSent] = React.useState(false);
	const [needsSignUpPassword, setNeedsSignUpPassword] = React.useState(false);
	const [pendingAuthAction, setPendingAuthAction] =
		React.useState<PendingAuthAction | null>(null);
	const [resendCooldownSeconds, setResendCooldownSeconds] = React.useState(0);
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
	const isAuthBusy = isFetching || pendingAuthAction !== null;
	const isSendingCode = pendingAuthAction === "send";
	const isResendingCode = pendingAuthAction === "resend";
	const isVerifyingCode = pendingAuthAction === "verify";
	const isResendDisabled =
		isAuthBusy || needsSignUpPassword || resendCooldownSeconds > 0;
	const canVerify =
		(needsSignUpPassword && signUpPassword.trim().length >= 8) ||
		(!needsSignUpPassword && code.length >= EMAIL_CODE_LENGTH);
	const resendCodeLabel =
		resendCooldownSeconds > 0
			? `Send a new code in ${resendCooldownSeconds}s`
			: "Send a new code";
	let verifyButtonLabel = "Verify";

	if (needsSignUpPassword) {
		verifyButtonLabel = "Finish account";
	}

	if (isVerifyingCode) {
		verifyButtonLabel = "Finishing...";
	}

	React.useEffect(() => {
		if (resendCooldownSeconds <= 0) {
			return;
		}

		const timerId = setTimeout(() => {
			setResendCooldownSeconds((currentSeconds) =>
				Math.max(currentSeconds - 1, 0)
			);
		}, 1000);

		return () => {
			clearTimeout(timerId);
		};
	}, [resendCooldownSeconds]);

	const startResendCooldown = () => {
		setResendCooldownSeconds(RESEND_CODE_COOLDOWN_SECONDS);
	};

	const finalizeSignIn = async () => {
		await signIn.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, SIGNED_IN_HOME);
				}
			},
		});
	};

	const finalizeSignUp = async () => {
		const { error } = await signUp.finalize({
			navigate: ({ session, decorateUrl }) => {
				if (!session?.currentTask) {
					pushDecoratedUrl(router, decorateUrl, SIGNED_IN_HOME);
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
		if (isAuthBusy) {
			return;
		}

		setPendingAuthAction("send");
		setStatusMessage(null);
		setCode("");
		setNeedsSignUpPassword(false);
		setSignUpPassword("");
		const trimmedEmailAddress = emailAddress.trim();

		try {
			const { error: createError } = await signIn.create({
				identifier: trimmedEmailAddress,
				signUpIfMissing: true,
			});

			if (createError) {
				setStatusMessage(
					getAuthErrorMessage(
						createError,
						"Unable to start email sign-in. Please try again."
					)
				);
				return;
			}

			const { error: sendCodeError } = await signIn.emailCode.sendCode();

			if (sendCodeError) {
				setStatusMessage(
					getAuthErrorMessage(
						sendCodeError,
						"Unable to send a code. Please try again."
					)
				);
				return;
			}

			setIsEmailCodeSent(true);
			startResendCooldown();
		} finally {
			setPendingAuthAction(null);
		}
	};

	const handleResendEmailCode = async () => {
		if (isResendDisabled) {
			return;
		}

		setPendingAuthAction("resend");
		setStatusMessage(null);
		setCode("");

		try {
			if (requiresMfaEmailCode) {
				const { error } = await signIn.mfa.sendEmailCode();

				if (error) {
					setStatusMessage(
						getAuthErrorMessage(error, "Unable to send a new code.")
					);
					return;
				}

				startResendCooldown();
				return;
			}

			const { error } = await signIn.emailCode.sendCode();

			if (error) {
				setStatusMessage(
					getAuthErrorMessage(error, "Unable to send a new code.")
				);
				return;
			}

			startResendCooldown();
		} finally {
			setPendingAuthAction(null);
		}
	};

	const completeSignUpIfReady = async () => {
		if (signUp.status === "complete") {
			await finalizeSignUp();
			return true;
		}

		if (signUp.status !== "missing_requirements") {
			setStatusMessage("Viya could not finish account setup yet.");
			return true;
		}

		if (signUp.missingFields.includes("password")) {
			setNeedsSignUpPassword(true);
			setStatusMessage("Create a password to finish setting up this account.");
			return true;
		}

		if (
			signUp.missingFields.length === 1 &&
			signUp.missingFields[0] === "legal_accepted"
		) {
			const { error: updateError } = await signUp.update({
				legalAccepted: true,
			});

			if (updateError) {
				setStatusMessage(
					getAuthErrorMessage(updateError, "Unable to finish account setup.")
				);
				return true;
			}

			await finalizeSignUp();
			return true;
		}

		setStatusMessage(
			`Viya needs these account details before sign-up can finish: ${signUp.missingFields.join(", ")}.`
		);
		return true;
	};

	const handleSignUpTransfer = async () => {
		const trimmedPassword = signUpPassword.trim();

		if (!trimmedPassword) {
			setNeedsSignUpPassword(true);
			setStatusMessage("Create a password to finish setting up this account.");
			return;
		}

		const { error } = await signUp.create({
			legalAccepted: true,
			password: trimmedPassword,
			transfer: true,
		});

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "Unable to create your account.")
			);
			return;
		}

		await completeSignUpIfReady();
	};

	const handleVerify = async () => {
		if (isAuthBusy || !canVerify) {
			return;
		}

		setPendingAuthAction("verify");
		setStatusMessage(null);

		try {
			if (needsSignUpPassword) {
				await handleSignUpTransfer();
				return;
			}

			const { error } = requiresMfaEmailCode
				? await signIn.mfa.verifyEmailCode({ code })
				: await signIn.emailCode.verifyCode({ code });

			if (error) {
				if (isSignUpTransferError(error)) {
					await handleSignUpTransfer();
					return;
				}

				setStatusMessage(
					getAuthErrorMessage(
						error,
						"That code did not work. Please try again."
					)
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
				startResendCooldown();
				return;
			}

			setStatusMessage("That code did not complete sign-in. Please try again.");
		} finally {
			setPendingAuthAction(null);
		}
	};

	const handleOpenChange = (nextIsOpen: boolean) => {
		onOpenChange(nextIsOpen);

		if (!nextIsOpen) {
			setCode("");
			setNeedsSignUpPassword(false);
			setSignUpPassword("");
			setIsEmailCodeSent(false);
			setResendCooldownSeconds(0);
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
					backgroundClassName="rounded-t-[36px] bg-background"
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
							{isCodeStep ? null : (
								<BottomSheet.Description className="max-w-72.5 text-center">
									Use Google, GitHub, or your email to continue.
								</BottomSheet.Description>
							)}
						</View>

						{statusMessage ? (
							<Alert className="items-center rounded-2xl" status="danger">
								<Alert.Indicator className="pt-0" iconProps={{ size: 18 }} />
								<Alert.Content>
									<Alert.Description className="leading-5" selectable={true}>
										{statusMessage}
									</Alert.Description>
								</Alert.Content>
							</Alert>
						) : null}

						{isCodeStep ? (
							<View className="gap-5">
								<Text.Paragraph align="center" color="muted" type="body-sm">
									{needsSignUpPassword ? (
										<>
											Finish the account for{" "}
											<Text weight="semibold">{codeDeliveryAddress}</Text>.
										</>
									) : (
										<>
											Enter the {EMAIL_CODE_LENGTH}-digit code sent to{" "}
											<Text weight="semibold">{codeDeliveryAddress}</Text>.
										</>
									)}
								</Text.Paragraph>
								{needsSignUpPassword ? (
									<SheetInput
										autoCapitalize="none"
										onChangeText={setSignUpPassword}
										placeholder="Create password"
										secureTextEntry={true}
										value={signUpPassword}
									/>
								) : (
									<SheetOtpInput onChange={setCode} value={code} />
								)}
								<Button
									isDisabled={isAuthBusy || !canVerify}
									onPress={handleVerify}
								>
									{isVerifyingCode ? (
										<Spinner color={accentForegroundColor} size="sm" />
									) : null}
									<Button.Label>{verifyButtonLabel}</Button.Label>
								</Button>
								{needsSignUpPassword ? null : (
									<Button
										isDisabled={isResendDisabled}
										onPress={handleResendEmailCode}
										variant="tertiary"
									>
										{isResendingCode ? <Spinner size="sm" /> : null}
										<Button.Label>{resendCodeLabel}</Button.Label>
									</Button>
								)}
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
									isDisabled={!emailAddress.trim() || isAuthBusy}
									onPress={handleSendEmailCode}
								>
									{isSendingCode ? (
										<Spinner color={accentForegroundColor} size="sm" />
									) : (
										<Ionicons color="#FFFFFF" name="mail-outline" size={18} />
									)}
									<Button.Label>
										{isSendingCode ? "Sending..." : "Continue with email"}
									</Button.Label>
								</Button>
							</View>
						)}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
