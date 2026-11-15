import { useSignIn, useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppSheet,
	AppText,
	fadeIn,
	fadeOut,
	haptic,
	Icon,
	metrics,
	PrimaryButton,
	radius,
	SecondaryButton,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import {
	getAuthErrorMessage,
	pushDecoratedUrl,
} from "@/src/features/auth/auth-routing";
import { AuthSocialButtons } from "@/src/features/auth/auth-social-buttons";

const OAUTH_SHEET_DISMISS_DELAY_MS = 320;
const EMAIL_CODE_LENGTH = 6;
const OTP_SLOT_HEIGHT = 56;
const DIGITS_ONLY_PATTERN = /\D/g;
const RESEND_CODE_COOLDOWN_SECONDS = 30;
const OTP_SLOT_INDEXES = [0, 1, 2, 3, 4, 5] as const;
const SIGNED_IN_HOME = "/(app)/(tabs)/(discover)";
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
	autoComplete?: "email" | "new-password";
	errorMessage?: string;
	isInvalid?: boolean;
	keyboardType?: "email-address";
	label: string;
	onBlur?: () => void;
	onChangeText: (value: string) => void;
	onSubmitEditing?: () => void;
	placeholder: string;
	returnKeyType?: "done" | "go";
	secureTextEntry?: boolean;
	textContentType?: "emailAddress" | "newPassword";
	value: string;
}

function SheetInput({
	errorMessage,
	isInvalid,
	label,
	onBlur,
	onChangeText,
	placeholder,
	value,
	...inputProps
}: SheetInputProps) {
	const { palette } = useUITheme();
	const { onBlur: handleSheetBlur, onFocus } =
		useCompatibleBottomSheetAwareHandlers();
	const [isFocused, setIsFocused] = React.useState(false);

	let borderColor = "transparent";
	if (isInvalid) {
		borderColor = palette.danger;
	} else if (isFocused) {
		borderColor = palette.accent;
	}

	return (
		<View style={{ gap: spacing.sm }}>
			<TextInput
				{...inputProps}
				accessibilityLabel={label}
				autoCorrect={false}
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
				style={{
					backgroundColor: palette.fill,
					borderColor,
					borderRadius: radius.field,
					borderWidth: 1.5,
					color: palette.ink,
					fontSize: 17,
					minHeight: metrics.actionHeight,
					paddingHorizontal: spacing.lg,
				}}
				value={value}
			/>
			{isInvalid && errorMessage ? (
				<AppText accessibilityRole="alert" tone="danger" variant="footnote">
					{errorMessage}
				</AppText>
			) : null}
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
		<Pressable
			accessibilityHint={`Enter the ${EMAIL_CODE_LENGTH} digit code`}
			accessibilityLabel="Verification code"
			accessibilityRole="button"
			onPress={() => inputRef.current?.focus()}
		>
			<View style={{ flexDirection: "row", gap: spacing.sm }}>
				{OTP_SLOT_INDEXES.map((slotIndex) => {
					const char = value[slotIndex];
					const isActive = isFocused && slotIndex === activeSlotIndex;
					const isCaretVisible =
						isFocused && !char && slotIndex === value.length;

					return (
						<View
							key={`otp-slot-${slotIndex}`}
							style={{
								alignItems: "center",
								backgroundColor: palette.fill,
								borderColor: isActive ? palette.accent : "transparent",
								borderRadius: radius.field,
								borderWidth: 1.5,
								flex: 1,
								height: OTP_SLOT_HEIGHT,
								justifyContent: "center",
							}}
						>
							{char ? <AppText variant="heading">{char}</AppText> : null}
							{isCaretVisible ? (
								<View
									style={{
										backgroundColor: palette.accent,
										borderRadius: radius.pill,
										height: 24,
										width: 2,
									}}
								/>
							) : null}
						</View>
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
				style={{ height: 1, opacity: 0, position: "absolute", width: 1 }}
				textContentType="oneTimeCode"
				value={value}
			/>
		</Pressable>
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
	const [status, setStatus] = React.useState<{
		text: string;
		tone: "danger" | "secondary";
	} | null>(null);
	const setStatusMessage = (text: string | null) =>
		setStatus(text ? { text, tone: "danger" } : null);
	const setInstruction = (text: string) =>
		setStatus({ text, tone: "secondary" });

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
			? `Resend code in ${resendCooldownSeconds}s`
			: "Resend code";
	let verifyButtonLabel = "Verify";

	if (needsSignUpPassword) {
		verifyButtonLabel = "Create account";
	}

	if (isVerifyingCode) {
		verifyButtonLabel = "Verifying";
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
				getAuthErrorMessage(error, "Could not finish account setup.")
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
						"Could not start email sign-in. Try again."
					)
				);
				return;
			}

			const { error: sendCodeError } = await signIn.emailCode.sendCode();

			if (sendCodeError) {
				setStatusMessage(
					getAuthErrorMessage(
						sendCodeError,
						"Could not send a code. Try again."
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
						getAuthErrorMessage(error, "Could not send a new code.")
					);
					return;
				}

				startResendCooldown();
				return;
			}

			const { error } = await signIn.emailCode.sendCode();

			if (error) {
				setStatusMessage(
					getAuthErrorMessage(error, "Could not send a new code.")
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
			setStatusMessage("Could not finish account setup. Try again.");
			return true;
		}

		if (signUp.missingFields.includes("password")) {
			setNeedsSignUpPassword(true);
			setInstruction("Create a password to finish setting up this account.");
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
					getAuthErrorMessage(updateError, "Could not finish account setup.")
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
			setInstruction("Create a password to finish setting up this account.");
			return;
		}

		const { error } = await signUp.create({
			legalAccepted: true,
			password: trimmedPassword,
			transfer: true,
		});

		if (error) {
			setStatusMessage(
				getAuthErrorMessage(error, "Could not create your account.")
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

	const handleChangeEmail = () => {
		setIsEmailCodeSent(false);
		setCode("");
		setStatusMessage(null);
		setResendCooldownSeconds(0);
	};

	let sheetTitle = "Sign in or sign up";
	if (needsSignUpPassword) {
		sheetTitle = "Create a password";
	} else if (isCodeStep) {
		sheetTitle = "Check your email";
	}

	return (
		<AppSheet
			isOpen={isOpen}
			keyboardBehavior="extend"
			onOpenChange={handleOpenChange}
		>
			<SheetHeader onClose={() => handleOpenChange(false)} title={sheetTitle} />
			<View
				style={{
					gap: spacing.xl,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.lg,
				}}
			>
				{status ? (
					<Animated.View
						accessibilityLiveRegion="polite"
						entering={fadeIn}
						exiting={fadeOut}
						style={{
							alignItems: "flex-start",
							flexDirection: "row",
							gap: spacing.sm,
						}}
					>
						<Icon
							name={
								status.tone === "danger"
									? "alert-circle-outline"
									: "information-circle-outline"
							}
							size={18}
							tone={status.tone}
						/>
						<AppText
							selectable={true}
							style={{ flex: 1 }}
							tone={status.tone}
							variant="subhead"
						>
							{status.text}
						</AppText>
					</Animated.View>
				) : null}

				{isCodeStep ? (
					<View style={{ gap: spacing.xl }}>
						<AppText tone="secondary" variant="subhead">
							{needsSignUpPassword ? (
								<>
									Choose a password for{" "}
									<AppText bold={true} variant="subhead">
										{codeDeliveryAddress}
									</AppText>
									. Use at least 8 characters.
								</>
							) : (
								<>
									We sent a {EMAIL_CODE_LENGTH}-digit code to{" "}
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
								autoComplete="new-password"
								label="Password"
								onChangeText={setSignUpPassword}
								onSubmitEditing={handleVerify}
								placeholder="Password"
								returnKeyType="done"
								secureTextEntry={true}
								textContentType="newPassword"
								value={signUpPassword}
							/>
						) : (
							<SheetOtpInput onChange={setCode} value={code} />
						)}
						<View style={{ gap: spacing.sm }}>
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
							{requiresMfaEmailCode || needsSignUpPassword ? null : (
								<SecondaryButton
									disabled={isAuthBusy}
									label="Use a different email"
									onPress={handleChangeEmail}
									variant="plain"
								/>
							)}
						</View>
					</View>
				) : (
					<View style={{ gap: spacing.xl }}>
						<View style={{ gap: spacing.md }}>
							<SheetInput
								autoCapitalize="none"
								autoComplete="email"
								errorMessage="Enter a valid email address."
								isInvalid={isEmailFormatInvalid}
								keyboardType="email-address"
								label="Email"
								onBlur={() => setHasEmailBlurred(true)}
								onChangeText={setEmailAddress}
								onSubmitEditing={handleSendEmailCode}
								placeholder="Email"
								returnKeyType="go"
								textContentType="emailAddress"
								value={emailAddress}
							/>
							{shouldRenderCaptchaMount ? (
								<View
									className="items-center"
									collapsable={false}
									nativeID="clerk-captcha"
								/>
							) : null}
							<PrimaryButton
								disabled={!emailAddress.trim() || isAuthBusy}
								isPending={isSendingCode}
								label="Continue with email"
								onPress={handleSendEmailCode}
							/>
						</View>
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
								or
							</AppText>
							<View
								style={{
									backgroundColor: palette.separator,
									flex: 1,
									height: 1,
								}}
							/>
						</View>
						<AuthSocialButtons
							onBeforeOAuthStart={handleBeforeOAuthStart}
							onOAuthFallback={handleOAuthFallback}
							onStatusMessageChange={setStatusMessage}
						/>
					</View>
				)}
			</View>
		</AppSheet>
	);
}
