import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
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
import { useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	ListGroup,
	Separator,
	Spinner,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import { type ReactNode, useEffect, useState } from "react";
import {
	Image,
	Pressable,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
	type ThemePreference,
	useAppTheme,
} from "@/contexts/app-theme-context";
import { ViyaMark } from "@/src/components/viya-mark";

interface AccountAvatarButtonProps {
	size?: number;
}

type AccountSheetScreen =
	| "account"
	| "appearance"
	| "personalInfo"
	| "travelPreferences";

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

interface AccountSheetRowProps {
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	isDisabled?: boolean;
	isLoading?: boolean;
	onPress?: () => void;
	showChevron?: boolean;
	title: string;
	tone?: "danger" | "default";
}

const preferenceRows = [
	{
		description: "Alerts, reminders, trip updates",
		icon: "notifications-outline",
		title: "Notifications",
	},
] as const satisfies readonly AccountSheetRowProps[];

const travelPreferenceGroups = [
	{
		key: "travelStyle",
		mode: "single",
		options: travelStyleOptions,
		title: "Trip vibe",
	},
	{
		key: "pacePreference",
		mode: "single",
		options: pacePreferenceOptions,
		title: "Daily pace",
	},
	{
		key: "budgetPreference",
		mode: "single",
		options: budgetPreferenceOptions,
		title: "Budget",
	},
	{
		key: "interests",
		mode: "multi",
		options: travelInterestOptions,
		title: "Interests",
	},
	{
		key: "foodPreference",
		mode: "single",
		options: foodPreferenceOptions,
		title: "Food",
	},
	{
		key: "groupPreference",
		mode: "single",
		options: groupPreferenceOptions,
		title: "Group",
	},
	{
		key: "planningStyle",
		mode: "single",
		options: planningStyleOptions,
		title: "Planning style",
	},
	{
		key: "specialNeeds",
		mode: "multi",
		options: specialNeedOptions,
		title: "Special needs",
	},
] as const satisfies readonly {
	key: TravelPreferenceKey;
	mode: "multi" | "single";
	options: readonly TravelPreferenceOption[];
	title: string;
}[];

const appearanceOptions = [
	{
		description: "Match this device",
		icon: "phone-portrait-outline",
		title: "System",
		value: "system",
	},
	{
		description: "Use the light interface",
		icon: "sunny-outline",
		title: "Light",
		value: "light",
	},
	{
		description: "Use the dark interface",
		icon: "moon-outline",
		title: "Dark",
		value: "dark",
	},
] as const satisfies readonly {
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
	value: ThemePreference;
}[];

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

function getOptionLabel(
	options: readonly TravelPreferenceOption[],
	value: string
) {
	return options.find((option) => option.value === value)?.label ?? value;
}

function getTravelPreferencesDescription(preferences: TravelPreferenceState) {
	const travelStyle = getOptionLabel(
		travelStyleOptions,
		preferences.travelStyle
	);
	const pace = getOptionLabel(
		pacePreferenceOptions,
		preferences.pacePreference
	);
	const budget = getOptionLabel(
		budgetPreferenceOptions,
		preferences.budgetPreference
	);

	return `${travelStyle}, ${pace}, ${budget}`;
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

function AccountAvatar({
	imageUrl,
	name,
	size,
}: {
	imageUrl?: string;
	name?: string | null;
	size: number;
}) {
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
			className="items-center justify-center bg-foreground"
			style={{ borderRadius, height: size, width: size }}
		>
			<Text className="text-white" type="body-sm" weight="semibold">
				{getInitials(name)}
			</Text>
		</View>
	);
}

function AccountSheetSection({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<View className="gap-2">
			<Text className="ml-2" color="muted" type="body-xs" weight="medium">
				{title}
			</Text>
			<ListGroup>{children}</ListGroup>
		</View>
	);
}

function AccountSheetHeader({
	onBackPress,
	onClosePress,
	title,
}: {
	onBackPress?: () => void;
	onClosePress: () => void;
	title: string;
}) {
	const foregroundColor = useThemeColor("foreground");

	if (!onBackPress) {
		return (
			<View className="flex-row items-center justify-between">
				<View className="flex-row items-center gap-3">
					<ViyaMark size={28} />
					<BottomSheet.Title>{title}</BottomSheet.Title>
				</View>
				<CloseButton
					accessibilityLabel="Close account"
					className="h-10 w-10 rounded-full bg-surface"
					iconProps={{ color: foregroundColor, size: 22 }}
					onPress={onClosePress}
				/>
			</View>
		);
	}

	return (
		<View className="flex-row items-center justify-between">
			<View className="h-10 w-10 items-start justify-center">
				<Pressable
					accessibilityLabel="Back"
					accessibilityRole="button"
					className="h-10 w-10 items-center justify-center rounded-full bg-surface"
					onPress={onBackPress}
				>
					<Ionicons color={foregroundColor} name="chevron-back" size={22} />
				</Pressable>
			</View>
			<View className="absolute right-14 left-14 items-center">
				<BottomSheet.Title>{title}</BottomSheet.Title>
			</View>
			<CloseButton
				accessibilityLabel="Close account"
				className="h-10 w-10 rounded-full bg-surface"
				iconProps={{ color: foregroundColor, size: 22 }}
				onPress={onClosePress}
			/>
		</View>
	);
}

function AccountSheetRow({
	description,
	icon,
	isDisabled,
	isLoading,
	onPress,
	showChevron = true,
	title,
	tone = "default",
}: AccountSheetRowProps) {
	const [dangerColor, foregroundColor, mutedColor] = useThemeColor([
		"danger",
		"foreground",
		"muted",
	]);
	const isDanger = tone === "danger";
	const iconColor = isDanger ? dangerColor : foregroundColor;

	return (
		<ListGroup.Item
			accessibilityRole="button"
			className="px-4 py-4"
			disabled={isDisabled}
			onPress={onPress}
		>
			<ListGroup.ItemPrefix>
				<View className="h-8 w-8 items-center justify-center">
					{isLoading ? (
						<Spinner color={iconColor} size="sm" />
					) : (
						<Ionicons color={iconColor} name={icon} size={18} />
					)}
				</View>
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle className={isDanger ? "text-danger" : undefined}>
					{title}
				</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			{showChevron ? (
				<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
			) : null}
		</ListGroup.Item>
	);
}

function AccountThemeOptionRow({
	description,
	icon,
	isSelected,
	onPress,
	title,
}: {
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	isSelected: boolean;
	onPress: () => Promise<void>;
	title: string;
}) {
	const [foregroundColor, mutedColor, primaryColor] = useThemeColor([
		"foreground",
		"muted",
		"accent",
	]);

	return (
		<ListGroup.Item
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="px-4 py-3"
			onPress={onPress}
		>
			<ListGroup.ItemPrefix>
				<View className="h-8 w-8 items-center justify-center">
					<Ionicons color={foregroundColor} name={icon} size={18} />
				</View>
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			<ListGroup.ItemSuffix>
				<Ionicons
					color={isSelected ? primaryColor : mutedColor}
					name={isSelected ? "checkmark-circle" : "ellipse-outline"}
					size={20}
				/>
			</ListGroup.ItemSuffix>
		</ListGroup.Item>
	);
}

function AccountTravelPreferenceOptionRow({
	description,
	isSaving,
	isSelected,
	label,
	onPress,
}: {
	description: string;
	isSaving: boolean;
	isSelected: boolean;
	label: string;
	onPress: () => Promise<void>;
}) {
	const [mutedColor, primaryColor] = useThemeColor(["muted", "accent"]);

	return (
		<ListGroup.Item
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="px-4 py-3"
			disabled={isSaving}
			onPress={onPress}
		>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{label}</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			<ListGroup.ItemSuffix>
				{isSaving ? (
					<Spinner color={primaryColor} size="sm" />
				) : (
					<Ionicons
						color={isSelected ? primaryColor : mutedColor}
						name={isSelected ? "checkmark-circle" : "ellipse-outline"}
						size={20}
					/>
				)}
			</ListGroup.ItemSuffix>
		</ListGroup.Item>
	);
}

function AccountProfileRow({
	displayName,
	imageUrl,
	onPress,
	primaryEmail,
}: {
	displayName: string;
	imageUrl?: string;
	onPress: () => void;
	primaryEmail: string;
}) {
	const mutedColor = useThemeColor("muted");

	return (
		<ListGroup.Item
			accessibilityRole="button"
			className="px-4 py-4"
			onPress={onPress}
		>
			<ListGroup.ItemPrefix>
				<AccountAvatar imageUrl={imageUrl} name={displayName} size={40} />
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{displayName}</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>{primaryEmail}</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
		</ListGroup.Item>
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This sheet coordinates account, profile, appearance, and preference sub-screens.
export function AccountAvatarButton({ size = 48 }: AccountAvatarButtonProps) {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	const { currentTheme, setTheme, themePreference } = useAppTheme();
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
	const savePreferences = useMutation(api.preferences.upsertCurrentPreferences);
	const [isOpen, setIsOpen] = useState(false);
	const [sheetScreen, setSheetScreen] = useState<AccountSheetScreen>("account");
	const [firstName, setFirstName] = useState(user?.firstName ?? "");
	const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const [lastName, setLastName] = useState(user?.lastName ?? "");
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
	const displayName = user?.fullName ?? "Viya traveler";
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";
	const resolvedTravelPreferences =
		travelPreferences ?? getTravelPreferenceState(currentPreferences);
	const appearanceDescription =
		themePreference === "system"
			? `System (${currentTheme})`
			: appearanceOptions.find((option) => option.value === themePreference)
					?.title;
	const travelPreferencesDescription = getTravelPreferencesDescription(
		resolvedTravelPreferences
	);
	const travelPreferencesMaxHeight = Math.max(
		Math.min(windowHeight * 0.62, 620),
		320
	);

	useEffect(() => {
		if (currentPreferences === undefined) {
			return;
		}

		setTravelPreferences(getTravelPreferenceState(currentPreferences));
	}, [currentPreferences]);

	useEffect(() => {
		if (sheetScreen !== "personalInfo") {
			return;
		}

		setFirstName(user?.firstName ?? "");
		setLastName(user?.lastName ?? "");
		setPersonalInfoError(null);
	}, [sheetScreen, user?.firstName, user?.lastName]);

	const handleClose = () => {
		setIsOpen(false);
		setSheetScreen("account");
	};

	const handleOpenChange = (nextIsOpen: boolean) => {
		setIsOpen(nextIsOpen);

		if (!nextIsOpen) {
			setSheetScreen("account");
		}
	};

	const handleSignOutPress = async () => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			await signOut();
			handleClose();
			router.replace("/(auth)");
		} finally {
			setIsSigningOut(false);
		}
	};

	const handleThemePreferencePress = async (
		nextThemePreference: ThemePreference
	) => {
		await setTheme(nextThemePreference);
	};

	const handlePersonalInfoSavePress = async () => {
		if (!(user && !isSavingPersonalInfo)) {
			return;
		}

		const nextFirstName = firstName.trim();
		const nextLastName = lastName.trim();

		if (!(nextFirstName || nextLastName)) {
			setPersonalInfoError("Add at least one name.");
			return;
		}

		setIsSavingPersonalInfo(true);
		setPersonalInfoError(null);

		try {
			await user.update({
				firstName: nextFirstName,
				lastName: nextLastName,
			});
			await ensureCurrentUser();
			setSheetScreen("account");
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

	return (
		<>
			<Pressable
				accessibilityLabel="Open account"
				accessibilityRole="button"
				className="items-center justify-center rounded-full"
				onPress={() => setIsOpen(true)}
				style={{
					boxShadow: "0 10px 22px rgba(15, 23, 42, 0.12)",
					height: size,
					width: size,
				}}
			>
				<AccountAvatar
					imageUrl={user?.imageUrl}
					name={displayName}
					size={size}
				/>
			</Pressable>

			<BottomSheet isOpen={isOpen} onOpenChange={handleOpenChange}>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[36px] bg-background"
						enablePanDownToClose={true}
					>
						<View
							className="gap-5 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							{sheetScreen === "account" ? (
								<>
									<AccountSheetHeader
										onClosePress={handleClose}
										title="Viya Account"
									/>

									<AccountSheetSection title="Account">
										<AccountProfileRow
											displayName={displayName}
											imageUrl={user?.imageUrl}
											onPress={() => {
												setSheetScreen("personalInfo");
											}}
											primaryEmail={primaryEmail}
										/>
										<Separator className="mx-4" />
										<AccountSheetRow
											description="FAQs, contact support, app feedback"
											icon="help-circle-outline"
											title="Help"
										/>
									</AccountSheetSection>

									<AccountSheetSection title="Preferences">
										<AccountSheetRow
											description={appearanceDescription ?? "Choose app theme"}
											icon="color-palette-outline"
											onPress={() => {
												setSheetScreen("appearance");
											}}
											title="Appearance"
										/>
										<Separator className="mx-4" />
										<AccountSheetRow
											description={travelPreferencesDescription}
											icon="options-outline"
											onPress={() => {
												setSheetScreen("travelPreferences");
											}}
											title="Travel preferences"
										/>
										<Separator className="mx-4" />
										{preferenceRows.map((row, index) => (
											<View key={row.title}>
												<AccountSheetRow {...row} />
												{index < preferenceRows.length - 1 ? (
													<Separator className="mx-4" />
												) : null}
											</View>
										))}
									</AccountSheetSection>

									<ListGroup>
										<AccountSheetRow
											description={
												isSigningOut
													? "Ending this session..."
													: "End this session on this device"
											}
											icon="log-out-outline"
											isDisabled={isSigningOut}
											isLoading={isSigningOut}
											onPress={handleSignOutPress}
											showChevron={false}
											title={isSigningOut ? "Signing out..." : "Sign out"}
											tone="danger"
										/>
									</ListGroup>
								</>
							) : null}

							{sheetScreen === "appearance" ? (
								<View className="gap-5">
									<AccountSheetHeader
										onBackPress={() => {
											setSheetScreen("account");
										}}
										onClosePress={handleClose}
										title="Appearance"
									/>

									<AccountSheetSection title="Theme">
										{appearanceOptions.map((option, index) => (
											<View key={option.value}>
												<AccountThemeOptionRow
													description={option.description}
													icon={option.icon}
													isSelected={themePreference === option.value}
													onPress={() =>
														handleThemePreferencePress(option.value)
													}
													title={option.title}
												/>
												{index < appearanceOptions.length - 1 ? (
													<Separator className="mx-4" />
												) : null}
											</View>
										))}
									</AccountSheetSection>
								</View>
							) : null}

							{sheetScreen === "personalInfo" ? (
								<View className="gap-5">
									<AccountSheetHeader
										onBackPress={() => {
											setSheetScreen("account");
										}}
										onClosePress={handleClose}
										title="Personal info"
									/>

									<View className="items-center gap-3">
										<AccountAvatar
											imageUrl={user?.imageUrl}
											name={displayName}
											size={72}
										/>
										<View className="items-center gap-1">
											<Text type="body" weight="semibold">
												{displayName}
											</Text>
											<Text color="muted" type="body-sm">
												{primaryEmail}
											</Text>
										</View>
									</View>

									<AccountSheetSection title="Name">
										<ListGroup.Item className="px-4 py-3">
											<ListGroup.ItemContent>
												<View className="gap-2">
													<Text color="muted" type="body-xs" weight="medium">
														First name
													</Text>
													<TextField>
														<Input
															autoCapitalize="words"
															className="bg-surface"
															isDisabled={isSavingPersonalInfo}
															onChangeText={setFirstName}
															placeholder="First name"
															value={firstName}
														/>
													</TextField>
												</View>
											</ListGroup.ItemContent>
										</ListGroup.Item>
										<Separator className="mx-4" />
										<ListGroup.Item className="px-4 py-3">
											<ListGroup.ItemContent>
												<View className="gap-2">
													<Text color="muted" type="body-xs" weight="medium">
														Last name
													</Text>
													<TextField>
														<Input
															autoCapitalize="words"
															className="bg-surface"
															isDisabled={isSavingPersonalInfo}
															onChangeText={setLastName}
															placeholder="Last name"
															value={lastName}
														/>
													</TextField>
												</View>
											</ListGroup.ItemContent>
										</ListGroup.Item>
									</AccountSheetSection>

									<AccountSheetSection title="Email">
										<AccountSheetRow
											description="Email changes require verification"
											icon="mail-outline"
											showChevron={false}
											title={primaryEmail}
										/>
									</AccountSheetSection>

									{personalInfoError ? (
										<Text className="text-danger" type="body-sm">
											{personalInfoError}
										</Text>
									) : null}

									<Button
										isDisabled={isSavingPersonalInfo || !user}
										onPress={handlePersonalInfoSavePress}
									>
										{isSavingPersonalInfo ? (
											<Spinner color="#FFFFFF" size="sm" />
										) : null}
										<Button.Label>
											{isSavingPersonalInfo ? "Saving..." : "Save changes"}
										</Button.Label>
									</Button>
								</View>
							) : null}

							{sheetScreen === "travelPreferences" ? (
								<View className="gap-5">
									<AccountSheetHeader
										onBackPress={() => {
											setSheetScreen("account");
										}}
										onClosePress={handleClose}
										title="Travel preferences"
									/>

									{currentPreferences === undefined ? (
										<View className="items-center justify-center py-8">
											<Spinner size="sm" />
										</View>
									) : (
										<ScrollView
											contentContainerStyle={{
												gap: 20,
												paddingBottom: 4,
											}}
											keyboardShouldPersistTaps="handled"
											showsVerticalScrollIndicator={false}
											style={{ maxHeight: travelPreferencesMaxHeight }}
										>
											{travelPreferenceError ? (
												<Text className="text-danger" type="body-sm">
													{travelPreferenceError}
												</Text>
											) : null}

											{travelPreferenceGroups.map((group) => {
												const selectedValue =
													resolvedTravelPreferences[group.key];

												return (
													<AccountSheetSection
														key={group.key}
														title={group.title}
													>
														{group.options.map((option, index) => {
															const isSelected = Array.isArray(selectedValue)
																? (selectedValue as readonly string[]).includes(
																		option.value
																	)
																: selectedValue === option.value;
															const isSaving =
																savingPreferenceKey === group.key && isSelected;

															return (
																<View key={option.value}>
																	<AccountTravelPreferenceOptionRow
																		description={option.description}
																		isSaving={isSaving}
																		isSelected={isSelected}
																		label={option.label}
																		onPress={() =>
																			group.mode === "multi"
																				? handleMultiTravelPreferencePress(
																						group.key as MultiTravelPreferenceKey,
																						option.value
																					)
																				: handleSingleTravelPreferencePress(
																						group.key as SingleTravelPreferenceKey,
																						option.value
																					)
																		}
																	/>
																	{index < group.options.length - 1 ? (
																		<Separator className="mx-4" />
																	) : null}
																</View>
															);
														})}
													</AccountSheetSection>
												);
											})}
										</ScrollView>
									)}
								</View>
							) : null}
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</>
	);
}
