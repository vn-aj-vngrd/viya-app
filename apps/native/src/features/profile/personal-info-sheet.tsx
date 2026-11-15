import { useUser } from "@clerk/expo";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import {
	type ImagePickerAsset,
	launchImageLibraryAsync,
} from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppSheet,
	AppText,
	inputThemeProps,
	ListGroup,
	metrics,
	SecondaryButton,
	SheetHeader,
	spacing,
	typeScale,
	useUITheme,
} from "@/src/components/ui";
import { ProfileAvatar } from "./profile-avatar";

const AVATAR_EDIT_SIZE = 88;

const photoPickerSheetDismissDelayMs = 320;

const waitForPhotoPickerSheetDismiss = async () => {
	await new Promise((resolve) => {
		setTimeout(resolve, photoPickerSheetDismissDelayMs);
	});
};

const pickAvatarAsset = async (): Promise<ImagePickerAsset | null> => {
	const result = await launchImageLibraryAsync({
		allowsEditing: true,
		aspect: [1, 1],
		mediaTypes: ["images"],
		quality: 0.9,
	});

	if (result.canceled || !result.assets[0]) {
		return null;
	}

	return result.assets[0];
};

const getAvatarUploadBlob = async (asset: ImagePickerAsset): Promise<Blob> =>
	await new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();

		request.onerror = () => {
			reject(new Error("Viya could not read that photo."));
		};
		request.onload = () => {
			resolve(request.response as Blob);
		};
		request.responseType = "blob";
		request.open("GET", asset.uri);
		request.send();
	});

const consumeBooleanRef = (flagRef: { current: boolean }) => {
	if (!flagRef.current) {
		return false;
	}

	flagRef.current = false;
	return true;
};

type CurrentUser = NonNullable<ReturnType<typeof useUser>["user"]>;

function useProfileAvatarUpdater({
	setIsPersonalInfoSheetOpen,
	setPersonalInfoError,
}: {
	setIsPersonalInfoSheetOpen: (isOpen: boolean) => void;
	setPersonalInfoError: (message: string | null) => void;
}) {
	const isReopeningPersonalInfoAfterPickerRef = useRef(false);
	const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
	const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
	const [selectedAvatarAsset, setSelectedAvatarAsset] =
		useState<ImagePickerAsset | null>(null);

	const clearAvatarDraft = () => {
		setLocalAvatarUri(null);
		setSelectedAvatarAsset(null);
	};

	const handleAvatarUpdatePress = async () => {
		if (isUpdatingAvatar) {
			return;
		}

		setPersonalInfoError(null);
		setIsUpdatingAvatar(true);
		isReopeningPersonalInfoAfterPickerRef.current = true;
		setIsPersonalInfoSheetOpen(false);
		await waitForPhotoPickerSheetDismiss();

		let selectedAsset: ImagePickerAsset | null;

		try {
			selectedAsset = await pickAvatarAsset();
		} catch (error) {
			setIsPersonalInfoSheetOpen(true);
			setIsUpdatingAvatar(false);
			setPersonalInfoError(
				error instanceof Error
					? error.message
					: "Viya could not open your photo library."
			);
			return;
		}

		setIsPersonalInfoSheetOpen(true);

		if (!selectedAsset) {
			setIsUpdatingAvatar(false);
			return;
		}

		setLocalAvatarUri(selectedAsset.uri);
		setSelectedAvatarAsset(selectedAsset);
		setIsUpdatingAvatar(false);
	};

	return {
		clearAvatarDraft,
		handleAvatarUpdatePress,
		isReopeningPersonalInfoAfterPickerRef,
		isUpdatingAvatar,
		localAvatarUri,
		selectedAvatarAsset,
	};
}

function usePersonalInfoDraftReset({
	isOpen,
	setFirstName,
	setLastName,
	setNameFieldError,
	setPersonalInfoError,
	skipResetRef,
	user,
}: {
	isOpen: boolean;
	setFirstName: (value: string) => void;
	setLastName: (value: string) => void;
	setNameFieldError: (message: string | null) => void;
	setPersonalInfoError: (message: string | null) => void;
	skipResetRef: { current: boolean };
	user: CurrentUser | null | undefined;
}) {
	useEffect(() => {
		if (!isOpen || consumeBooleanRef(skipResetRef)) {
			return;
		}

		setFirstName(user?.firstName ?? "");
		setLastName(user?.lastName ?? "");
		setNameFieldError(null);
		setPersonalInfoError(null);
	}, [
		isOpen,
		setFirstName,
		setLastName,
		setNameFieldError,
		setPersonalInfoError,
		skipResetRef,
		user?.firstName,
		user?.lastName,
	]);
}

function usePersonalInfoSheetOpenChange({
	clearAvatarDraft,
	setIsPersonalInfoSheetOpen,
	skipDraftResetRef,
}: {
	clearAvatarDraft: () => void;
	setIsPersonalInfoSheetOpen: (isOpen: boolean) => void;
	skipDraftResetRef: { current: boolean };
}) {
	return (isOpen: boolean) => {
		setIsPersonalInfoSheetOpen(isOpen);

		if (!(isOpen || skipDraftResetRef.current)) {
			clearAvatarDraft();
		}
	};
}

function NameField({
	isDisabled,
	label,
	onChangeText,
	value,
}: {
	isDisabled: boolean;
	label: string;
	onChangeText: (value: string) => void;
	value: string;
}) {
	const { palette } = useUITheme();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextInput
			accessibilityLabel={label}
			autoCapitalize="words"
			editable={!isDisabled}
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder={label}
			{...inputThemeProps(palette)}
			style={{
				color: palette.ink,
				fontSize: typeScale.body.fontSize,
				minHeight: metrics.rowHeight,
				opacity: isDisabled ? 0.6 : 1,
				paddingHorizontal: spacing.lg,
			}}
			value={value}
		/>
	);
}

export function PersonalInfoSheet({
	isOpen,
	onOpenChange,
}: {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
}) {
	const { user } = useUser();
	const insets = useSafeAreaInsets();
	const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
	const [firstName, setFirstName] = useState(user?.firstName ?? "");
	const [lastName, setLastName] = useState(user?.lastName ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const [nameFieldError, setNameFieldError] = useState<string | null>(null);
	const [personalInfoError, setPersonalInfoError] = useState<string | null>(
		null
	);
	const {
		clearAvatarDraft,
		handleAvatarUpdatePress,
		isReopeningPersonalInfoAfterPickerRef,
		isUpdatingAvatar,
		localAvatarUri,
		selectedAvatarAsset,
	} = useProfileAvatarUpdater({
		setIsPersonalInfoSheetOpen: onOpenChange,
		setPersonalInfoError,
	});
	const handleOpenChange = usePersonalInfoSheetOpenChange({
		clearAvatarDraft,
		setIsPersonalInfoSheetOpen: onOpenChange,
		skipDraftResetRef: isReopeningPersonalInfoAfterPickerRef,
	});

	usePersonalInfoDraftReset({
		isOpen,
		setFirstName,
		setLastName,
		setNameFieldError,
		setPersonalInfoError,
		skipResetRef: isReopeningPersonalInfoAfterPickerRef,
		user,
	});

	const displayName = user?.fullName || user?.username || "";
	const avatarUrl = localAvatarUri || user?.imageUrl;

	const handleSavePress = async () => {
		if (!(user && !isSaving)) {
			return;
		}

		const nextFirstName = firstName.trim();
		const nextLastName = lastName.trim();

		if (!(nextFirstName || nextLastName)) {
			setNameFieldError("Enter a first or last name.");
			return;
		}

		setIsSaving(true);
		setNameFieldError(null);
		setPersonalInfoError(null);

		try {
			if (selectedAvatarAsset) {
				const file = await getAvatarUploadBlob(selectedAvatarAsset);

				await user.setProfileImage({ file });
				await user.reload();
			}

			await user.update({
				firstName: nextFirstName,
				lastName: nextLastName,
			});
			await ensureCurrentUser();
			clearAvatarDraft();
			onOpenChange(false);
		} catch (error) {
			setPersonalInfoError(
				error instanceof Error
					? error.message
					: "Viya could not update your profile."
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<AppSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
			<SheetHeader
				confirm={{
					disabled: !user,
					isPending: isSaving,
					label: "Save",
					onPress: handleSavePress,
				}}
				onClose={() => handleOpenChange(false)}
				title="Personal info"
			/>
			<View
				style={{
					gap: spacing.section,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.sm,
				}}
			>
				<View style={{ alignItems: "center", gap: spacing.sm }}>
					<ProfileAvatar
						imageUrl={avatarUrl}
						name={displayName}
						size={AVATAR_EDIT_SIZE}
					/>
					<SecondaryButton
						fullWidth={false}
						isPending={isUpdatingAvatar}
						label={isUpdatingAvatar ? "Updating photo" : "Change photo"}
						onPress={handleAvatarUpdatePress}
						variant="plain"
					/>
				</View>
				<View style={{ gap: spacing.sm }}>
					<ListGroup>
						<NameField
							isDisabled={isSaving}
							label="First name"
							onChangeText={(value) => {
								setFirstName(value);
								setNameFieldError(null);
							}}
							value={firstName}
						/>
						<NameField
							isDisabled={isSaving}
							label="Last name"
							onChangeText={(value) => {
								setLastName(value);
								setNameFieldError(null);
							}}
							value={lastName}
						/>
					</ListGroup>
					{nameFieldError ? (
						<AppText
							style={{ paddingHorizontal: spacing.lg }}
							tone="danger"
							variant="footnote"
						>
							{nameFieldError}
						</AppText>
					) : null}
					{personalInfoError ? (
						<AppText
							style={{ paddingHorizontal: spacing.lg }}
							tone="danger"
							variant="footnote"
						>
							{personalInfoError}
						</AppText>
					) : null}
				</View>
			</View>
		</AppSheet>
	);
}
