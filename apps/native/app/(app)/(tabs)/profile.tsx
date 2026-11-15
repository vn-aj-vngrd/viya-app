import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type {
	BudgetPreference,
	FoodPreference,
	PacePreference,
	PlanningStyle,
	SpecialNeed,
	TravelInterest,
	TravelStyle,
	UserGroupPreference,
	UserPreferences,
} from "@viya-app/domain";
import {
	budgetPreferenceOptions,
	defaultUserPreferences,
	foodPreferenceOptions,
	groupPreferenceOptions,
	pacePreferenceOptions,
	planningStyleOptions,
	specialNeedOptions,
	travelInterestOptions,
	travelStyleOptions,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import {
	type ImagePickerAsset,
	launchImageLibraryAsync,
} from "expo-image-picker";
import { useRouter } from "expo-router";
import { BottomSheet } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	type ThemePreference,
	useAppTheme,
} from "@/contexts/app-theme-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	AppText,
	CollapsingScreen,
	GlassIconButton,
	ListGroup,
	ListRow,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";

interface AccountRowProps {
	description?: string;
	icon: FeatherIconName;
	isDisabled?: boolean;
	isLoading?: boolean;
	onPress?: () => void;
	rightText?: string;
	showChevron?: boolean;
	title: string;
	tone?: "danger" | "default";
}

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface TravelPreferenceState {
	budgetPreference: BudgetPreference;
	foodPreference: FoodPreference;
	groupPreference: UserGroupPreference;
	interests: TravelInterest[];
	pacePreference: PacePreference;
	planningStyle: PlanningStyle;
	specialNeeds: SpecialNeed[];
	specialNeedsNote: string;
	travelStyle: TravelStyle;
}

type SingleTravelPreferenceKey = Exclude<
	keyof TravelPreferenceState,
	"interests" | "specialNeeds" | "specialNeedsNote"
>;
type MultiTravelPreferenceKey = "interests" | "specialNeeds";
type TravelPreferenceKey = SingleTravelPreferenceKey | MultiTravelPreferenceKey;

interface TravelPreferenceOption {
	description: string;
	label: string;
	value: string;
}

interface TravelPreferenceGroup {
	category: "Experience" | "Logistics" | "Planning";
	icon: FeatherIconName;
	key: TravelPreferenceKey;
	mode: "multi" | "single";
	options: readonly TravelPreferenceOption[];
	title: string;
}

const themeOptions = [
	{
		description: "Match this device",
		icon: "monitor",
		title: "System",
		value: "system",
	},
	{
		description: "Use the light interface",
		icon: "sun",
		title: "Light",
		value: "light",
	},
	{
		description: "Use the dark interface",
		icon: "moon",
		title: "Dark",
		value: "dark",
	},
] as const satisfies readonly {
	description: string;
	icon: FeatherIconName;
	title: string;
	value: ThemePreference;
}[];

const TAB_BAR_CLEARANCE = 112;
const FIELD_HEIGHT = 50;
const photoPickerSheetDismissDelayMs = 320;

const travelPreferenceGroups = [
	{
		category: "Experience",
		icon: "compass",
		key: "travelStyle",
		mode: "single",
		options: travelStyleOptions,
		title: "Trip vibe",
	},
	{
		category: "Experience",
		icon: "activity",
		key: "pacePreference",
		mode: "single",
		options: pacePreferenceOptions,
		title: "Daily pace",
	},
	{
		category: "Logistics",
		icon: "credit-card",
		key: "budgetPreference",
		mode: "single",
		options: budgetPreferenceOptions,
		title: "Budget",
	},
	{
		category: "Experience",
		icon: "heart",
		key: "interests",
		mode: "multi",
		options: travelInterestOptions,
		title: "Interests",
	},
	{
		category: "Experience",
		icon: "coffee",
		key: "foodPreference",
		mode: "single",
		options: foodPreferenceOptions,
		title: "Food",
	},
	{
		category: "Logistics",
		icon: "users",
		key: "groupPreference",
		mode: "single",
		options: groupPreferenceOptions,
		title: "Group",
	},
	{
		category: "Planning",
		icon: "sliders",
		key: "planningStyle",
		mode: "single",
		options: planningStyleOptions,
		title: "Planning style",
	},
	{
		category: "Planning",
		icon: "shield",
		key: "specialNeeds",
		mode: "multi",
		options: specialNeedOptions,
		title: "Special needs",
	},
] as const satisfies readonly TravelPreferenceGroup[];

const travelPreferenceCategories = [
	"Experience",
	"Logistics",
	"Planning",
] as const satisfies readonly TravelPreferenceGroup["category"][];

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

const getAvatarImageUrl = (
	localAvatarUri?: string | null,
	remoteAvatarUrl?: string
) => localAvatarUri || remoteAvatarUrl;

const getAppearanceDescription = ({
	currentTheme,
	themePreference,
}: {
	currentTheme: string;
	themePreference: ThemePreference;
}) => {
	if (themePreference === "system") {
		return `System (${currentTheme})`;
	}

	return themeOptions.find((option) => option.value === themePreference)?.title;
};

function getInitials(name?: string | null) {
	if (!name) {
		return "V";
	}

	return name
		.split(" ")
		.map((part) => part.charAt(0))
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function getOptionLabel(
	options: readonly { label: string; value: string }[],
	value: string
) {
	return options.find((option) => option.value === value)?.label ?? value;
}

function getPreferenceSummary(preferences?: Partial<UserPreferences> | null) {
	const resolvedPreferences = getTravelPreferenceState(preferences);
	const travelStyle = getOptionLabel(
		travelStyleOptions,
		resolvedPreferences.travelStyle
	);
	const pace = getOptionLabel(
		pacePreferenceOptions,
		resolvedPreferences.pacePreference
	);
	const budget = getOptionLabel(
		budgetPreferenceOptions,
		resolvedPreferences.budgetPreference
	);

	return `${travelStyle}, ${pace}, ${budget}`;
}

function getTravelPreferenceState(
	preferences?: Partial<UserPreferences> | null
): TravelPreferenceState {
	const interests =
		preferences?.interests && preferences.interests.length > 0
			? preferences.interests
			: defaultUserPreferences.interests;
	const specialNeeds =
		preferences?.specialNeeds && preferences.specialNeeds.length > 0
			? preferences.specialNeeds
			: defaultUserPreferences.specialNeeds;

	return {
		budgetPreference:
			preferences?.budgetPreference ?? defaultUserPreferences.budgetPreference,
		foodPreference:
			preferences?.foodPreference ?? defaultUserPreferences.foodPreference,
		groupPreference:
			preferences?.groupPreference ?? defaultUserPreferences.groupPreference,
		interests: [...interests],
		pacePreference:
			preferences?.pacePreference ?? defaultUserPreferences.pacePreference,
		planningStyle:
			preferences?.planningStyle ?? defaultUserPreferences.planningStyle,
		specialNeeds: [...specialNeeds],
		specialNeedsNote: preferences?.specialNeedsNote ?? "",
		travelStyle: preferences?.travelStyle ?? defaultUserPreferences.travelStyle,
	};
}

function getNextMultiPreferenceValues(
	key: MultiTravelPreferenceKey,
	currentValues: readonly string[],
	value: string
) {
	const nextValues = currentValues.includes(value)
		? currentValues.filter((item) => item !== value)
		: [...currentValues, value];

	if (key === "specialNeeds") {
		if (value === "none") {
			return ["none"];
		}

		return nextValues.filter((item) => item !== "none");
	}

	return nextValues;
}

function getTravelPreferenceDisplayValue({
	group,
	preferences,
}: {
	group: TravelPreferenceGroup;
	preferences: TravelPreferenceState;
}) {
	const selectedValue = preferences[group.key];

	if (Array.isArray(selectedValue)) {
		const labels = selectedValue.map((value) =>
			getOptionLabel(group.options, value)
		);

		if (labels.length === 0) {
			return "None";
		}

		if (labels.length > 2) {
			return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
		}

		return labels.join(", ");
	}

	return getOptionLabel(group.options, selectedValue);
}

function ProfileAvatar({
	imageUrl,
	name,
	size = 48,
}: {
	imageUrl?: string;
	name: string;
	size?: number;
}) {
	const { palette } = useUITheme();
	const borderRadius = size / 2;

	if (imageUrl) {
		return (
			<Image
				accessibilityIgnoresInvertColors={true}
				source={{ uri: imageUrl }}
				style={{ borderRadius, height: size, width: size }}
			/>
		);
	}

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.ink,
				borderRadius,
				height: size,
				justifyContent: "center",
				width: size,
			}}
		>
			<AppText
				bold={true}
				style={{ color: palette.onPrimary, fontSize: size * 0.36 }}
			>
				{getInitials(name)}
			</AppText>
		</View>
	);
}

function AccountSection({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return <ListGroup header={title}>{children}</ListGroup>;
}

function AccountRow({
	description,
	icon,
	isDisabled,
	isLoading,
	onPress,
	rightText,
	showChevron = true,
	title,
	tone = "default",
}: AccountRowProps) {
	const { palette } = useUITheme();
	const isDanger = tone === "danger";
	const iconColor = isDanger ? palette.danger : palette.inkSecondary;
	const detailText = rightText ?? description;

	return (
		<ListRow
			destructive={isDanger}
			leading={
				<View style={{ alignItems: "center", width: 28 }}>
					{isLoading ? (
						<ActivityIndicator color={iconColor} />
					) : (
						<Feather color={iconColor} name={icon} size={20} />
					)}
				</View>
			}
			onPress={isDisabled ? undefined : onPress}
			showChevron={showChevron && !isDisabled}
			title={title}
			value={detailText}
		/>
	);
}

function ProfileIdentityHeader({
	displayName,
	imageUrl,
	primaryEmail,
}: {
	displayName: string;
	imageUrl?: string;
	primaryEmail: string;
}) {
	return (
		<View
			style={{
				alignItems: "center",
				gap: spacing.md,
				paddingVertical: spacing.sm,
			}}
		>
			<ProfileAvatar imageUrl={imageUrl} name={displayName} size={80} />
			<View style={{ alignItems: "center", gap: 2 }}>
				<AppText style={{ textAlign: "center" }} variant="heading">
					{displayName}
				</AppText>
				<AppText
					style={{ textAlign: "center" }}
					tone="secondary"
					variant="subhead"
				>
					{primaryEmail}
				</AppText>
			</View>
		</View>
	);
}

function PersonalInfoField({
	errorText,
	isDisabled,
	isInvalid,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	errorText?: string;
	isDisabled: boolean;
	isInvalid?: boolean;
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { palette } = useUITheme();
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<View style={{ gap: spacing.sm }}>
			<AppText tone="secondary" variant="footnote">
				{label}
			</AppText>
			<TextInput
				accessibilityLabel={label}
				autoCapitalize="words"
				editable={!isDisabled}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				placeholderTextColor={palette.inkTertiary}
				style={{
					backgroundColor: palette.surface,
					borderColor: isInvalid ? palette.danger : "transparent",
					borderRadius: radius.field,
					borderWidth: isInvalid ? 1 : 0,
					color: palette.ink,
					fontSize: 17,
					height: FIELD_HEIGHT,
					opacity: isDisabled ? 0.6 : 1,
					paddingHorizontal: spacing.lg,
				}}
				value={value}
			/>
			{isInvalid && errorText ? (
				<AppText tone="danger" variant="footnote">
					{errorText}
				</AppText>
			) : null}
		</View>
	);
}

function AvatarUpdateRow({
	displayName,
	imageUrl,
	isLoading,
	onPress,
}: {
	displayName: string;
	imageUrl?: string;
	isLoading: boolean;
	onPress: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<View style={{ alignItems: "center", gap: spacing.sm }}>
			<PressableScale
				accessibilityLabel="Change profile photo"
				accessibilityRole="button"
				disabled={isLoading}
				onPress={onPress}
				style={{ opacity: isLoading ? 0.72 : 1 }}
			>
				<ProfileAvatar imageUrl={imageUrl} name={displayName} size={92} />
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.surface,
						borderColor: palette.canvas,
						borderRadius: radius.pill,
						borderWidth: 3,
						bottom: -4,
						height: 36,
						justifyContent: "center",
						position: "absolute",
						right: -4,
						width: 36,
					}}
				>
					{isLoading ? (
						<ActivityIndicator color={palette.accent} />
					) : (
						<Feather color={palette.accent} name="camera" size={16} />
					)}
				</View>
			</PressableScale>
			<AppText tone="accent" variant="subhead">
				{isLoading ? "Updating photo..." : "Change profile photo"}
			</AppText>
			<AppText tone="secondary" variant="footnote">
				Choose a square photo for best results.
			</AppText>
		</View>
	);
}

function SelectionIndicator({
	isSaving,
	isSelected,
}: {
	isSaving?: boolean;
	isSelected: boolean;
}) {
	const { palette } = useUITheme();

	if (isSaving) {
		return <ActivityIndicator color={palette.accent} />;
	}

	return (
		<Feather
			color={isSelected ? palette.accent : palette.inkTertiary}
			name={isSelected ? "check-circle" : "circle"}
			size={20}
		/>
	);
}

function ThemeOptionRow({
	isSelected,
	onPress,
	option,
}: {
	isSelected: boolean;
	onPress: () => void;
	option: (typeof themeOptions)[number];
}) {
	const { palette } = useUITheme();

	return (
		<ListRow
			accessibilityLabel={option.title}
			leading={
				<View style={{ alignItems: "center", width: 28 }}>
					<Feather color={palette.inkSecondary} name={option.icon} size={20} />
				</View>
			}
			onPress={onPress}
			showChevron={false}
			subtitle={option.description}
			title={option.title}
			trailing={<SelectionIndicator isSelected={isSelected} />}
		/>
	);
}

function TravelPreferenceOptionRow({
	isSaving,
	isSelected,
	onPress,
	option,
}: {
	isSaving: boolean;
	isSelected: boolean;
	onPress: () => void;
	option: TravelPreferenceOption;
}) {
	return (
		<ListRow
			accessibilityLabel={option.label}
			onPress={isSaving ? undefined : onPress}
			showChevron={false}
			subtitle={option.description}
			title={option.label}
			trailing={
				<SelectionIndicator isSaving={isSaving} isSelected={isSelected} />
			}
		/>
	);
}

function ProfileSheet({
	children,
	isOpen,
	onOpenChange,
	subtitle,
	title,
}: {
	children: ReactNode;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	subtitle?: string;
	title: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="bg-background"
					enablePanDownToClose={true}
				>
					<SheetHeader
						onClose={() => onOpenChange(false)}
						subtitle={subtitle}
						title={title}
					/>
					<View
						style={{
							gap: spacing.lg,
							padding: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
						}}
					>
						{children}
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

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

function useProfileSignOut({
	router,
	signOut,
}: {
	router: ReturnType<typeof useRouter>;
	signOut: ReturnType<typeof useClerk>["signOut"];
}) {
	const [isSigningOut, setIsSigningOut] = useState(false);

	const handleSignOutPress = async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			await signOut();
			router.replace("/(auth)");
		} finally {
			setIsSigningOut(false);
		}
	};

	return {
		handleSignOutPress,
		isSigningOut,
	};
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

function SignOutConfirmationSheet({
	isOpen,
	isSigningOut,
	onConfirmPress,
	onOpenChange,
}: {
	isOpen: boolean;
	isSigningOut: boolean;
	onConfirmPress: () => void;
	onOpenChange: (isOpen: boolean) => void;
}) {
	return (
		<ProfileSheet
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			subtitle="You will need to sign in again on this device."
			title="Sign out?"
		>
			<View style={{ gap: spacing.md }}>
				<PrimaryButton
					destructive={true}
					disabled={isSigningOut}
					isPending={isSigningOut}
					label="Sign out"
					onPress={onConfirmPress}
				/>
				<SecondaryButton
					disabled={isSigningOut}
					label="Cancel"
					onPress={() => onOpenChange(false)}
				/>
			</View>
		</ProfileSheet>
	);
}

export default function ProfileScreen() {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
	const savePreferences = useMutation(api.preferences.upsertCurrentPreferences);
	const { currentTheme, setTheme, themePreference } = useAppTheme();
	const [activeTravelPreferenceKey, setActiveTravelPreferenceKey] =
		useState<TravelPreferenceKey | null>(null);
	const [isAppearanceSheetOpen, setIsAppearanceSheetOpen] = useState(false);
	const [isPersonalInfoSheetOpen, setIsPersonalInfoSheetOpen] = useState(false);
	const [isSignOutSheetOpen, setIsSignOutSheetOpen] = useState(false);
	const [isTravelSheetOpen, setIsTravelSheetOpen] = useState(false);
	const [firstName, setFirstName] = useState(user?.firstName ?? "");
	const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);
	const [lastName, setLastName] = useState(user?.lastName ?? "");
	const [nameFieldError, setNameFieldError] = useState<string | null>(null);
	const [personalInfoError, setPersonalInfoError] = useState<string | null>(
		null
	);
	const [savingPreferenceKey, setSavingPreferenceKey] =
		useState<TravelPreferenceKey | null>(null);
	const [travelPreferenceError, setTravelPreferenceError] = useState<
		string | null
	>(null);
	const [travelPreferences, setTravelPreferences] =
		useState<TravelPreferenceState | null>(null);
	const {
		clearAvatarDraft,
		handleAvatarUpdatePress,
		isReopeningPersonalInfoAfterPickerRef,
		isUpdatingAvatar,
		localAvatarUri,
		selectedAvatarAsset,
	} = useProfileAvatarUpdater({
		setIsPersonalInfoSheetOpen,
		setPersonalInfoError,
	});
	const { handleSignOutPress, isSigningOut } = useProfileSignOut({
		router,
		signOut,
	});
	const displayName = user?.fullName ?? "Viya traveler";
	const draftAvatarImageUrl = getAvatarImageUrl(localAvatarUri, user?.imageUrl);
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";
	const resolvedTravelPreferences =
		travelPreferences ?? getTravelPreferenceState(currentPreferences);
	const preferenceSummary = getPreferenceSummary(resolvedTravelPreferences);
	const appearanceDescription = getAppearanceDescription({
		currentTheme,
		themePreference,
	});
	const activeTravelPreferenceGroup =
		travelPreferenceGroups.find(
			(group) => group.key === activeTravelPreferenceKey
		) ?? null;
	const handlePersonalInfoSheetOpenChange = usePersonalInfoSheetOpenChange({
		clearAvatarDraft,
		setIsPersonalInfoSheetOpen,
		skipDraftResetRef: isReopeningPersonalInfoAfterPickerRef,
	});

	useEffect(() => {
		if (currentPreferences === undefined) {
			return;
		}

		setTravelPreferences(getTravelPreferenceState(currentPreferences));
	}, [currentPreferences]);

	usePersonalInfoDraftReset({
		isOpen: isPersonalInfoSheetOpen,
		setFirstName,
		setLastName,
		setNameFieldError,
		setPersonalInfoError,
		skipResetRef: isReopeningPersonalInfoAfterPickerRef,
		user,
	});

	const handlePersonalInfoSavePress = async () => {
		if (!(user && !isSavingPersonalInfo)) {
			return;
		}

		const nextFirstName = firstName.trim();
		const nextLastName = lastName.trim();

		if (!(nextFirstName || nextLastName)) {
			setNameFieldError("Enter a first or last name.");
			return;
		}

		setIsSavingPersonalInfo(true);
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
			setIsPersonalInfoSheetOpen(false);
		} catch (error) {
			setPersonalInfoError(
				error instanceof Error
					? error.message
					: "Viya could not update your profile."
			);
		} finally {
			setIsSavingPersonalInfo(false);
		}
	};

	const handleTravelSheetOpenChange = (isOpen: boolean) => {
		setIsTravelSheetOpen(isOpen);

		if (!isOpen) {
			setActiveTravelPreferenceKey(null);
			setTravelPreferenceError(null);
		}
	};

	const persistTravelPreferences = async (
		nextPreferences: TravelPreferenceState,
		key: TravelPreferenceKey
	) => {
		setTravelPreferences(nextPreferences);
		setTravelPreferenceError(null);
		setSavingPreferenceKey(key);

		try {
			await savePreferences({
				budgetPreference: nextPreferences.budgetPreference,
				foodPreference: nextPreferences.foodPreference,
				groupPreference: nextPreferences.groupPreference,
				interests: nextPreferences.interests,
				pacePreference: nextPreferences.pacePreference,
				planningStyle: nextPreferences.planningStyle,
				specialNeeds: nextPreferences.specialNeeds,
				specialNeedsNote: nextPreferences.specialNeedsNote.trim() || undefined,
				travelStyle: nextPreferences.travelStyle,
			});
		} catch (error) {
			setTravelPreferences(getTravelPreferenceState(currentPreferences));
			setTravelPreferenceError(
				error instanceof Error
					? error.message
					: "Viya could not save your preferences."
			);
		} finally {
			setSavingPreferenceKey(null);
		}
	};

	const handleSingleTravelPreferencePress = async (
		key: SingleTravelPreferenceKey,
		value: string
	) => {
		if (savingPreferenceKey) {
			return;
		}

		await persistTravelPreferences(
			{
				...resolvedTravelPreferences,
				[key]: value,
			} as TravelPreferenceState,
			key
		);
	};

	const handleMultiTravelPreferencePress = async (
		key: MultiTravelPreferenceKey,
		value: string
	) => {
		if (savingPreferenceKey) {
			return;
		}

		const currentValues = resolvedTravelPreferences[key];
		const nextValues = getNextMultiPreferenceValues(key, currentValues, value);
		const nextPreferences =
			key === "interests"
				? {
						...resolvedTravelPreferences,
						interests: nextValues as TravelInterest[],
					}
				: {
						...resolvedTravelPreferences,
						specialNeeds: nextValues as SpecialNeed[],
						specialNeedsNote:
							nextValues.length === 0
								? ""
								: resolvedTravelPreferences.specialNeedsNote,
					};

		await persistTravelPreferences(nextPreferences, key);
	};

	const preferenceSelectionRows = activeTravelPreferenceGroup
		? activeTravelPreferenceGroup.options.map((option) => {
				const selectedValue =
					resolvedTravelPreferences[activeTravelPreferenceGroup.key];
				const isSelected = Array.isArray(selectedValue)
					? (selectedValue as readonly string[]).includes(option.value)
					: selectedValue === option.value;

				return (
					<TravelPreferenceOptionRow
						isSaving={savingPreferenceKey === activeTravelPreferenceGroup.key}
						isSelected={isSelected}
						key={option.value}
						onPress={() =>
							activeTravelPreferenceGroup.mode === "multi"
								? handleMultiTravelPreferencePress(
										activeTravelPreferenceGroup.key as MultiTravelPreferenceKey,
										option.value
									)
								: handleSingleTravelPreferencePress(
										activeTravelPreferenceGroup.key as SingleTravelPreferenceKey,
										option.value
									)
						}
						option={option}
					/>
				);
			})
		: [];

	return (
		<>
			<CollapsingScreen
				contentContainerStyle={{
					gap: spacing.section,
					paddingBottom: TAB_BAR_CLEARANCE,
					paddingHorizontal: spacing.screen,
				}}
				title="Profile"
			>
				<Animated.View
					entering={FadeInDown.duration(260)}
					style={{ gap: spacing.section }}
				>
					<ProfileIdentityHeader
						displayName={displayName}
						imageUrl={user?.imageUrl}
						primaryEmail={primaryEmail}
					/>

					<AccountSection title="Account">
						<AccountRow
							description="Name and account details"
							icon="user"
							onPress={() => setIsPersonalInfoSheetOpen(true)}
							title="Personal info"
						/>
					</AccountSection>

					<AccountSection title="Preferences">
						<AccountRow
							description={appearanceDescription}
							icon="moon"
							onPress={() => setIsAppearanceSheetOpen(true)}
							title="Appearance"
						/>
						<AccountRow
							description={preferenceSummary}
							icon="map"
							onPress={() => setIsTravelSheetOpen(true)}
							title="Travel"
						/>
					</AccountSection>

					<ListGroup>
						<AccountRow
							description={isSigningOut ? "Ending..." : "This device"}
							icon="log-out"
							isDisabled={isSigningOut}
							isLoading={isSigningOut}
							onPress={() => setIsSignOutSheetOpen(true)}
							title={isSigningOut ? "Signing out..." : "Sign out"}
							tone="danger"
						/>
					</ListGroup>
				</Animated.View>
			</CollapsingScreen>

			<ProfileSheet
				isOpen={isAppearanceSheetOpen}
				onOpenChange={setIsAppearanceSheetOpen}
				subtitle="Choose how Viya should look on this device."
				title="Appearance"
			>
				<AccountSection title="Theme">
					{themeOptions.map((option) => (
						<ThemeOptionRow
							isSelected={themePreference === option.value}
							key={option.value}
							onPress={() => {
								setTheme(option.value).catch(() => undefined);
							}}
							option={option}
						/>
					))}
				</AccountSection>
			</ProfileSheet>

			<ProfileSheet
				isOpen={isTravelSheetOpen}
				onOpenChange={handleTravelSheetOpenChange}
				subtitle={
					activeTravelPreferenceGroup
						? "Choose the option Viya should remember."
						: "Manage the defaults Viya uses for trip ideas."
				}
				title={activeTravelPreferenceGroup?.title ?? "Travel preferences"}
			>
				{activeTravelPreferenceGroup ? (
					<View style={{ alignItems: "flex-start" }}>
						<GlassIconButton
							accessibilityLabel="Back to travel preferences"
							icon="chevron-back"
							onPress={() => setActiveTravelPreferenceKey(null)}
						/>
					</View>
				) : null}

				{travelPreferenceError ? (
					<AppText tone="danger" variant="subhead">
						{travelPreferenceError}
					</AppText>
				) : null}

				{activeTravelPreferenceGroup ? (
					<AccountSection title={activeTravelPreferenceGroup.title}>
						{preferenceSelectionRows}
					</AccountSection>
				) : (
					<View style={{ gap: spacing.section }}>
						{travelPreferenceCategories.map((category) => (
							<AccountSection key={category} title={category}>
								{travelPreferenceGroups
									.filter((group) => group.category === category)
									.map((group) => (
										<AccountRow
											icon={group.icon}
											key={group.key}
											onPress={() => setActiveTravelPreferenceKey(group.key)}
											rightText={getTravelPreferenceDisplayValue({
												group,
												preferences: resolvedTravelPreferences,
											})}
											title={group.title}
										/>
									))}
							</AccountSection>
						))}
					</View>
				)}
			</ProfileSheet>

			<SignOutConfirmationSheet
				isOpen={isSignOutSheetOpen}
				isSigningOut={isSigningOut}
				onConfirmPress={handleSignOutPress}
				onOpenChange={setIsSignOutSheetOpen}
			/>

			<ProfileSheet
				isOpen={isPersonalInfoSheetOpen}
				onOpenChange={handlePersonalInfoSheetOpenChange}
				subtitle="Update your photo and name in Viya."
				title="Personal information"
			>
				<AvatarUpdateRow
					displayName={displayName}
					imageUrl={draftAvatarImageUrl}
					isLoading={isUpdatingAvatar || isSavingPersonalInfo}
					onPress={handleAvatarUpdatePress}
				/>
				<PersonalInfoField
					errorText={nameFieldError ?? undefined}
					isDisabled={isSavingPersonalInfo}
					isInvalid={Boolean(nameFieldError)}
					label="First name"
					onChangeText={(value) => {
						setFirstName(value);
						setNameFieldError(null);
					}}
					placeholder="First name"
					value={firstName}
				/>
				<PersonalInfoField
					errorText={nameFieldError ?? undefined}
					isDisabled={isSavingPersonalInfo}
					isInvalid={Boolean(nameFieldError)}
					label="Last name"
					onChangeText={(value) => {
						setLastName(value);
						setNameFieldError(null);
					}}
					placeholder="Last name"
					value={lastName}
				/>

				{personalInfoError ? (
					<AppText tone="danger" variant="subhead">
						{personalInfoError}
					</AppText>
				) : null}

				<PrimaryButton
					disabled={!user}
					isPending={isSavingPersonalInfo}
					label="Save changes"
					onPress={handlePersonalInfoSavePress}
				/>
			</ProfileSheet>
		</>
	);
}
