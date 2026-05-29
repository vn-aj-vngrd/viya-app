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
import { launchImageLibraryAsync } from "expo-image-picker";
import { useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	ListGroup,
	Separator,
	Spinner,
	Text,
	TextField,
	useThemeColor,
} from "heroui-native";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import {
	type ThemePreference,
	useAppTheme,
} from "@/contexts/app-theme-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

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

const optionSeparatorClassName = "mx-4";

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

function AccountSection({
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
	const [dangerColor, foregroundColor, mutedColor] = useThemeColor([
		"danger",
		"foreground",
		"muted",
	]);
	const isDanger = tone === "danger";
	const iconColor = isDanger ? dangerColor : foregroundColor;

	return (
		<ListGroup.Item
			accessibilityRole={onPress ? "button" : undefined}
			className="px-4 py-4"
			disabled={isDisabled}
			onPress={onPress}
		>
			<ListGroup.ItemPrefix>
				<View className="h-8 w-8 items-center justify-center">
					{isLoading ? (
						<Spinner color={iconColor} size="sm" />
					) : (
						<Feather color={iconColor} name={icon} size={19} />
					)}
				</View>
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle className={isDanger ? "text-danger" : undefined}>
					{title}
				</ListGroup.ItemTitle>
				{description ? (
					<ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
				) : null}
			</ListGroup.ItemContent>
			{rightText ? (
				<ListGroup.ItemSuffix>
					<Text color="muted" numberOfLines={1} type="body-sm">
						{rightText}
					</Text>
				</ListGroup.ItemSuffix>
			) : null}
			{showChevron ? (
				<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
			) : null}
		</ListGroup.Item>
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
		<View className="items-center gap-2 pt-3 pb-2">
			<ProfileAvatar imageUrl={imageUrl} name={displayName} size={72} />
			<View className="items-center gap-0.5">
				<Text.Heading className="text-center" type="h4" weight="semibold">
					{displayName}
				</Text.Heading>
				<Text className="text-center" color="muted" type="body-sm">
					{primaryEmail}
				</Text>
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
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				autoCapitalize="words"
				className={
					isInvalid
						? "h-12 border border-danger bg-surface px-4"
						: "h-12 border border-border bg-surface px-4"
				}
				isDisabled={isDisabled}
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
			{isInvalid && errorText ? (
				<Text className="text-danger" type="body-xs">
					{errorText}
				</Text>
			) : null}
		</TextField>
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
	const [foregroundColor, mutedColor] = useThemeColor(["foreground", "muted"]);

	return (
		<ListGroup variant="transparent">
			<ListGroup.Item
				accessibilityRole="button"
				className="px-0 py-1"
				disabled={isLoading}
				onPress={onPress}
			>
				<ListGroup.ItemPrefix>
					<ProfileAvatar imageUrl={imageUrl} name={displayName} size={40} />
				</ListGroup.ItemPrefix>
				<ListGroup.ItemContent>
					<ListGroup.ItemTitle>Photo</ListGroup.ItemTitle>
				</ListGroup.ItemContent>
				<ListGroup.ItemSuffix>
					{isLoading ? (
						<Spinner color={foregroundColor} size="sm" />
					) : (
						<Text color="muted" type="body-sm">
							Change
						</Text>
					)}
				</ListGroup.ItemSuffix>
				{isLoading ? null : (
					<ListGroup.ItemSuffix iconProps={{ color: mutedColor, size: 18 }} />
				)}
			</ListGroup.Item>
		</ListGroup>
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
	const [foregroundColor, mutedColor] = useThemeColor(["foreground", "muted"]);

	return (
		<ListGroup.Item
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="px-4 py-3"
			onPress={onPress}
		>
			<ListGroup.ItemPrefix>
				<View className="h-8 w-8 items-center justify-center">
					<Feather color={foregroundColor} name={option.icon} size={19} />
				</View>
			</ListGroup.ItemPrefix>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{option.title}</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>
					{option.description}
				</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			<ListGroup.ItemSuffix>
				<Feather
					color={isSelected ? "#0A84FF" : mutedColor}
					name={isSelected ? "check-circle" : "circle"}
					size={19}
				/>
			</ListGroup.ItemSuffix>
		</ListGroup.Item>
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
	const mutedColor = useThemeColor("muted");

	return (
		<ListGroup.Item
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className="px-4 py-3"
			disabled={isSaving}
			onPress={onPress}
		>
			<ListGroup.ItemContent>
				<ListGroup.ItemTitle>{option.label}</ListGroup.ItemTitle>
				<ListGroup.ItemDescription>
					{option.description}
				</ListGroup.ItemDescription>
			</ListGroup.ItemContent>
			<ListGroup.ItemSuffix>
				{isSaving ? (
					<Spinner color="#0A84FF" size="sm" />
				) : (
					<Feather
						color={isSelected ? "#0A84FF" : mutedColor}
						name={isSelected ? "check-circle" : "circle"}
						size={19}
					/>
				)}
			</ListGroup.ItemSuffix>
		</ListGroup.Item>
	);
}

export default function ProfileScreen() {
	const { signOut } = useClerk();
	const { user } = useUser();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const currentPreferences = useQuery(api.preferences.getCurrentPreferences);
	const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
	const savePreferences = useMutation(api.preferences.upsertCurrentPreferences);
	const { currentTheme, setTheme, themePreference } = useAppTheme();
	const foregroundColor = useThemeColor("foreground");
	const [activeTravelPreferenceKey, setActiveTravelPreferenceKey] =
		useState<TravelPreferenceKey | null>(null);
	const [isAppearanceSheetOpen, setIsAppearanceSheetOpen] = useState(false);
	const [isPersonalInfoSheetOpen, setIsPersonalInfoSheetOpen] = useState(false);
	const [isTravelSheetOpen, setIsTravelSheetOpen] = useState(false);
	const [firstName, setFirstName] = useState(user?.firstName ?? "");
	const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
	const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
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
	const displayName = user?.fullName ?? "Viya traveler";
	const primaryEmail = user?.emailAddresses[0]?.emailAddress ?? "Signed in";
	const resolvedTravelPreferences =
		travelPreferences ?? getTravelPreferenceState(currentPreferences);
	const preferenceSummary = getPreferenceSummary(resolvedTravelPreferences);
	const appearanceDescription =
		themePreference === "system"
			? `System (${currentTheme})`
			: themeOptions.find((option) => option.value === themePreference)?.title;
	const activeTravelPreferenceGroup =
		travelPreferenceGroups.find(
			(group) => group.key === activeTravelPreferenceKey
		) ?? null;

	useEffect(() => {
		if (currentPreferences === undefined) {
			return;
		}

		setTravelPreferences(getTravelPreferenceState(currentPreferences));
	}, [currentPreferences]);

	useEffect(() => {
		if (!isPersonalInfoSheetOpen) {
			return;
		}

		setFirstName(user?.firstName ?? "");
		setLastName(user?.lastName ?? "");
		setNameFieldError(null);
		setPersonalInfoError(null);
	}, [isPersonalInfoSheetOpen, user?.firstName, user?.lastName]);

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

	const handleAvatarUpdatePress = async () => {
		if (!(user && !isUpdatingAvatar)) {
			return;
		}

		setPersonalInfoError(null);

		let result: Awaited<ReturnType<typeof launchImageLibraryAsync>>;

		try {
			result = await launchImageLibraryAsync({
				allowsEditing: true,
				aspect: [1, 1],
				mediaTypes: ["images"],
				quality: 0.9,
			});
		} catch (error) {
			setPersonalInfoError(
				error instanceof Error
					? error.message
					: "Viya could not open your photo library."
			);
			return;
		}

		if (result.canceled || !result.assets[0]) {
			return;
		}

		setIsUpdatingAvatar(true);

		try {
			const response = await fetch(result.assets[0].uri);
			const file = await response.blob();

			await user.setProfileImage({ file });
			await user.reload();
			await ensureCurrentUser();
		} catch (error) {
			setPersonalInfoError(
				error instanceof Error
					? error.message
					: "Viya could not update your photo."
			);
		} finally {
			setIsUpdatingAvatar(false);
		}
	};

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
			await user.update({
				firstName: nextFirstName,
				lastName: nextLastName,
			});
			await ensureCurrentUser();
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

	return (
		<Container includeBottomInset={false} isScrollable={false}>
			<View
				className="gap-4 bg-background px-4 pb-3"
				style={{ paddingTop: Math.max(insets.top, 12) }}
			>
				<View className="flex-row items-center justify-between gap-4">
					<Text.Heading type="h2" weight="semibold">
						Profile
					</Text.Heading>
					<View className="h-11 w-11" />
				</View>
			</View>

			<ScrollView
				contentContainerStyle={{
					flexGrow: 1,
					gap: 20,
					paddingBottom: 112,
					paddingHorizontal: 16,
					paddingTop: 4,
				}}
				contentInsetAdjustmentBehavior="automatic"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View className="gap-5" style={{ alignSelf: "stretch" }}>
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
							title="Personal information"
						/>
					</AccountSection>

					<AccountSection title="Preferences">
						<AccountRow
							icon="moon"
							onPress={() => setIsAppearanceSheetOpen(true)}
							rightText={appearanceDescription}
							title="Appearance"
						/>
						<Separator className={optionSeparatorClassName} />
						<AccountRow
							icon="map"
							onPress={() => setIsTravelSheetOpen(true)}
							rightText={preferenceSummary}
							title="Travel"
						/>
					</AccountSection>

					<ListGroup>
						<AccountRow
							icon="log-out"
							isDisabled={isSigningOut}
							isLoading={isSigningOut}
							onPress={handleSignOutPress}
							rightText={isSigningOut ? "Ending..." : "This device"}
							showChevron={false}
							title={isSigningOut ? "Signing out..." : "Sign out"}
							tone="danger"
						/>
					</ListGroup>
				</View>
			</ScrollView>
			<BottomSheet
				isOpen={isAppearanceSheetOpen}
				onOpenChange={setIsAppearanceSheetOpen}
			>
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
							<View className="flex-row items-start justify-between gap-4">
								<View className="flex-1 gap-1">
									<BottomSheet.Title>Appearance</BottomSheet.Title>
									<BottomSheet.Description>
										Choose how Viya should look on this device.
									</BottomSheet.Description>
								</View>
								<CloseButton
									accessibilityLabel="Close appearance"
									className="h-10 w-10 rounded-full bg-surface"
									iconProps={{ color: foregroundColor, size: 22 }}
									onPress={() => setIsAppearanceSheetOpen(false)}
								/>
							</View>

							<AccountSection title="Theme">
								{themeOptions.map((option, index) => (
									<View key={option.value}>
										<ThemeOptionRow
											isSelected={themePreference === option.value}
											onPress={() => {
												setTheme(option.value).catch(() => undefined);
											}}
											option={option}
										/>
										{index < themeOptions.length - 1 ? (
											<Separator className={optionSeparatorClassName} />
										) : null}
									</View>
								))}
							</AccountSection>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
			<BottomSheet
				isOpen={isTravelSheetOpen}
				onOpenChange={handleTravelSheetOpenChange}
			>
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
							<View className="flex-row items-start justify-between gap-4">
								<View className="min-w-0 flex-1 gap-1">
									<View className="flex-row items-center gap-2">
										{activeTravelPreferenceGroup ? (
											<Pressable
												accessibilityLabel="Back to travel preferences"
												accessibilityRole="button"
												className="h-8 w-8 items-center justify-center rounded-full bg-surface"
												onPress={() => setActiveTravelPreferenceKey(null)}
											>
												<Feather
													color={foregroundColor}
													name="chevron-left"
													size={20}
												/>
											</Pressable>
										) : null}
										<BottomSheet.Title>
											{activeTravelPreferenceGroup?.title ??
												"Travel preferences"}
										</BottomSheet.Title>
									</View>
									<BottomSheet.Description>
										{activeTravelPreferenceGroup
											? "Choose the option Viya should remember."
											: "Manage the defaults Viya uses for trip ideas."}
									</BottomSheet.Description>
								</View>
								<CloseButton
									accessibilityLabel="Close travel preferences"
									className="h-10 w-10 rounded-full bg-surface"
									iconProps={{ color: foregroundColor, size: 22 }}
									onPress={() => handleTravelSheetOpenChange(false)}
								/>
							</View>

							{travelPreferenceError ? (
								<Text className="text-danger" type="body-sm">
									{travelPreferenceError}
								</Text>
							) : null}

							{activeTravelPreferenceGroup ? (
								<AccountSection title={activeTravelPreferenceGroup.title}>
									{activeTravelPreferenceGroup.options.map((option, index) => {
										const selectedValue =
											resolvedTravelPreferences[
												activeTravelPreferenceGroup.key
											];
										const isSelected = Array.isArray(selectedValue)
											? (selectedValue as readonly string[]).includes(
													option.value
												)
											: selectedValue === option.value;
										const isSaving =
											savingPreferenceKey === activeTravelPreferenceGroup.key;

										return (
											<View key={option.value}>
												<TravelPreferenceOptionRow
													isSaving={isSaving}
													isSelected={isSelected}
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
												{index <
												activeTravelPreferenceGroup.options.length - 1 ? (
													<Separator className={optionSeparatorClassName} />
												) : null}
											</View>
										);
									})}
								</AccountSection>
							) : (
								<View className="gap-5">
									{travelPreferenceCategories.map((category) => {
										const groups = travelPreferenceGroups.filter(
											(group) => group.category === category
										);

										return (
											<AccountSection key={category} title={category}>
												{groups.map((group, index) => (
													<View key={group.key}>
														<AccountRow
															icon={group.icon}
															onPress={() =>
																setActiveTravelPreferenceKey(group.key)
															}
															rightText={getTravelPreferenceDisplayValue({
																group,
																preferences: resolvedTravelPreferences,
															})}
															title={group.title}
														/>
														{index < groups.length - 1 ? (
															<Separator className={optionSeparatorClassName} />
														) : null}
													</View>
												))}
											</AccountSection>
										);
									})}
								</View>
							)}
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
			<BottomSheet
				isOpen={isPersonalInfoSheetOpen}
				onOpenChange={setIsPersonalInfoSheetOpen}
			>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[36px] bg-background"
						enablePanDownToClose={true}
					>
						<View
							className="gap-4 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							<View className="flex-row items-center justify-between gap-4">
								<View className="flex-1 gap-1">
									<BottomSheet.Title>Personal information</BottomSheet.Title>
									<BottomSheet.Description>
										Update your photo and name in Viya.
									</BottomSheet.Description>
								</View>
								<CloseButton
									accessibilityLabel="Close personal information"
									className="h-10 w-10 rounded-full bg-surface"
									iconProps={{ color: foregroundColor, size: 22 }}
									onPress={() => setIsPersonalInfoSheetOpen(false)}
								/>
							</View>

							<View className="gap-4">
								<AvatarUpdateRow
									displayName={displayName}
									imageUrl={user?.imageUrl}
									isLoading={isUpdatingAvatar}
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
							</View>

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
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</Container>
	);
}
