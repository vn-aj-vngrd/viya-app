import { useSignIn, useSignUp } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BottomSheet } from "heroui-native";
import React from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

import {
	AppText,
	haptic,
	metrics,
	PrimaryButton,
	radius,
	SecondaryButton,
	spacing,
	useUITheme,
} from "@/src/components/ui";
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
const shouldRenderCaptchaMount = Platform.OS === "web";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
	description?: string;
	errorMessage?: string;
	isInvalid?: boolean;
	isRequired?: boolean;
	keyboardType?: "email-address" | "numeric";
	label?: string;
	onBlur?: () => void;
	onChangeText: (value: string) => void;
	placeholder: string;
	secureTextEntry?: boolean;
	value: string;
}

function SheetInput({
	autoCapitalize,
	description,
	errorMessage,
	isInvalid,
	isRequired,
	keyboardType,
	label,
	onBlur,
	onChangeText,
	placeholder,
	secureTextEntry,
	value,
}: SheetInputProps) {
	const { palette } = useUITheme();
	const { onBlur: handleSheetBlur, onFocus } =
		useCompatibleBottomSheetAwareHandlers();
	const [isFocused, setIsFocused] = React.useState(false);

	let helperText: React.ReactNode = null;

	if (isInvalid && errorMessage) {
		helperText = (
			<AppText accessibilityRole="alert" tone="danger" variant="footnote">
				{errorMessage}
			</AppText>
		);
	} else if (description) {
		helperText = (
			<AppText tone="secondary" variant="footnote">
				{description}
			</AppText>
		);
	}

	let borderColor = "transparent";
	if (isInvalid) {
		borderColor = palette.danger;
	} else if (isFocused) {
		borderColor = palette.accent;
	}

	return (
		<View style={{ gap: spacing.xs }}>
			{label ? (
				<AppText bold={true} tone="secondary" variant="subhead">
					{label}
					{isRequired ? " *" : ""}
				</AppText>
			) : null}
			<TextInput
				accessibilityLabel={label ?? placeholder}
				autoCapitalize={autoCapitalize}
				keyboardType={keyboardType}
				onBlur={(event) => {
					setIsFocused(false);
					handleSheetBlur(event);
					onBlur?.();
				}}
				onChangeText={onChangeText}
				onFocus={(event) => {
					setIsFocused(true);
					onFocus(event);
				}}
				placeholder={placeholder}
				placeholderTextColor={palette.inkTertiary}
				secureTextEntry={secureTextEntry}
				style={{
					backgroundColor: palette.fill,
					borderColor,
					borderRadius: radius.field,
					borderWidth: 1.5,
					color: palette.ink,
					fontSize: 17,
					height: metrics.actionHeight,
					paddingHorizontal: spacing.lg,
				}}
				value={value}
			/>
			{helperText}
		</View>
	);
}

interface SheetOtpInputProps {
	onChange: (value: string) => void;
	value: string;
}

function SheetOtpInput({ onChange, value }: SheetOtpInputProps) {
	const { palette } = useUITheme();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();
	const inputRef = React.useRef<TextInput>(null);
	const [isFocused, setIsFocused] = React.useState(false);

	const activeSlotIndex = Math.min(value.length, EMAIL_CODE_LENGTH - 1);

	const handleChangeText = (nextValue: string) => {
		const digits = nextValue
			.replace(DIGITS_ONLY_PATTERN, "")
			.slice(0, EMAIL_CODE_LENGTH);
		if (digits.length > value.length) {
			haptic("selection");
		}
		onChange(digits);
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
									style={{
										alignItems: "center",
										backgroundColor: palette.fill,
										borderColor: isActive ? palette.accent : "transparent",
										borderRadius: radius.field,
										borderWidth: 1.5,
										height: OTP_SLOT_SIZE,
										justifyContent: "center",
										width: OTP_SLOT_SIZE,
									}}
								>
									{char ? (
										<AppText bold={true} style={{ position: "absolute" }}>
											{char}
										</AppText>
									) : null}
									{isCaretVisible ? (
										<View
											style={{
												backgroundColor: palette.inkSecondary,
												borderRadius: radius.pill,
												height: 20,
												position: "absolute",
												width: 2,
											}}
										/>
									) : null}
								</View>
								{slotIndex === 2 ? (
									<View
										style={{
											backgroundColor: palette.separator,
											height: 2,
											width: OTP_SEPARATOR_WIDTH,
										}}
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
	const { palette } = useUITheme();
	const [emailAddress, setEmailAddress] = React.useState("");
	const [hasEmailBlurred, setHasEmailBlurred] = React.useState(false);
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
	const trimmedEmail = emailAddress.trim();
	const isEmailFormatInvalid =
		hasEmailBlurred &&
		trimmedEmail.length > 0 &&
		!EMAIL_PATTERN.test(trimmedEmail);
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
			setHasEmailBlurred(false);
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
					backgroundStyle={{
						backgroundColor: palette.canvas,
						borderTopLeftRadius: radius.sheet,
						borderTopRightRadius: radius.sheet,
					}}
					enablePanDownToClose={true}
					handleIndicatorStyle={{ backgroundColor: palette.inkTertiary }}
					keyboardBehavior="extend"
				>
					<View
						style={{
							gap: spacing.section,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
							paddingHorizontal: spacing.screen,
							paddingTop: spacing.sm,
						}}
					>
						<View style={{ alignItems: "center", gap: spacing.sm }}>
							<ViyaMark size={52} />
							<BottomSheet.Title className="text-center font-semibold text-[22px] text-foreground">
								Sign in to Viya
							</BottomSheet.Title>
							{isCodeStep ? null : (
								<BottomSheet.Description className="max-w-72.5 text-center">
									Use Google, GitHub, or your email to continue.
								</BottomSheet.Description>
							)}
						</View>

						{statusMessage ? (
							<Animated.View
								accessibilityLiveRegion="polite"
								entering={FadeIn.duration(200)}
								exiting={FadeOut.duration(150)}
								style={{
									alignItems: "center",
									backgroundColor: palette.surface,
									borderRadius: radius.field,
									flexDirection: "row",
									gap: spacing.md,
									padding: spacing.lg,
								}}
							>
								<Ionicons
									color={palette.danger}
									name="alert-circle"
									size={20}
								/>
								<AppText
									selectable={true}
									style={{ flex: 1 }}
									tone="danger"
									variant="subhead"
								>
									{statusMessage}
								</AppText>
							</Animated.View>
						) : null}

						{isCodeStep ? (
							<View style={{ gap: spacing.section }}>
								<AppText
									style={{ textAlign: "center" }}
									tone="secondary"
									variant="subhead"
								>
									{needsSignUpPassword ? (
										<>
											Finish the account for{" "}
											<AppText bold={true} variant="subhead">
												{codeDeliveryAddress}
											</AppText>
											.
										</>
									) : (
										<>
											Enter the {EMAIL_CODE_LENGTH}-digit code sent to{" "}
											<AppText bold={true} variant="subhead">
												{codeDeliveryAddress}
											</AppText>
											.
										</>
									)}
								</AppText>
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
								<PrimaryButton
									disabled={isAuthBusy || !canVerify}
									isPending={isVerifyingCode}
									label={verifyButtonLabel}
									onPress={handleVerify}
								/>
								{needsSignUpPassword ? null : (
									<SecondaryButton
										disabled={isResendDisabled}
										isPending={isResendingCode}
										label={resendCodeLabel}
										onPress={handleResendEmailCode}
										variant="plain"
									/>
								)}
							</View>
						) : (
							<View style={{ gap: spacing.lg }}>
								<AuthSocialButtons
									onBeforeOAuthStart={handleBeforeOAuthStart}
									onOAuthFallback={handleOAuthFallback}
									onStatusMessageChange={setStatusMessage}
								/>
								<View
									style={{
										alignItems: "center",
										flexDirection: "row",
										gap: spacing.md,
									}}
								>
									<View
										style={{
											backgroundColor: palette.separator,
											flex: 1,
											height: 1,
										}}
									/>
									<AppText tone="tertiary" variant="footnote">
										or use email
									</AppText>
									<View
										style={{
											backgroundColor: palette.separator,
											flex: 1,
											height: 1,
										}}
									/>
								</View>
								<View style={{ gap: spacing.md }}>
									<SheetInput
										autoCapitalize="none"
										description="Please enter a valid email address."
										errorMessage="Enter a valid email address."
										isInvalid={isEmailFormatInvalid}
										isRequired={true}
										keyboardType="email-address"
										label="Email"
										onBlur={() => setHasEmailBlurred(true)}
										onChangeText={setEmailAddress}
										placeholder="Enter your email"
										value={emailAddress}
									/>
									{shouldRenderCaptchaMount ? (
										<View
											className="items-center"
											collapsable={false}
											nativeID="clerk-captcha"
										/>
									) : null}
								</View>
								<PrimaryButton
									disabled={!emailAddress.trim() || isAuthBusy}
									icon="mail-outline"
									isPending={isSendingCode}
									label="Continue with email"
									onPress={handleSendEmailCode}
								/>
							</View>
						)}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}
