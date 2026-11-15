import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { type Href, Link, useRouter } from "expo-router";
import { BottomSheet, Menu } from "heroui-native";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
	ImageBackground,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	DateRangePickerField,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";

import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import {
	AppText,
	Card,
	GlassSurface,
	haptic,
	PressableScale,
	PrimaryButton,
	radius,
	SecondaryButton,
	SheetHeader,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import { TripMetricBlock } from "@/src/features/trips/trip-card-primitives";
import { isDecorativeDestinationImageUrl } from "@/src/features/trips/trip-cover-image";
import {
	getTripCreateOptionLabel,
	paceOptions,
	type TravelerType,
	type TripPace,
	type TripStyle,
	travelerTypeOptions,
	tripStyleOptions,
} from "@/src/features/trips/trip-create-flow-utils";
import { getTripModulesSheetListMaxHeight } from "./trip-dashboard-layout";
import type {
	DashboardAction,
	DashboardTab,
	IoniconName,
	TripDashboardModel,
	TripTab,
} from "./trip-dashboard-types";
import { formatMoney, getReadinessDisplay } from "./trip-dashboard-utils";
import { TripTextField } from "./trip-text-field";

export const tripFloatingBarBottomInset = 24;
export const tripFloatingBarGap = 6;
const viyaButtonNavigationThrottleMs = 800;
const profilePaceDetails = {
	balanced: "3-5 activities per day",
	light: "2-3 main activities per day",
	packed: "Maximize the trip",
} as const satisfies Record<TripPace, string>;
const profilePaceIcons = {
	balanced: "scale-outline",
	light: "leaf-outline",
	packed: "flash-outline",
} as const satisfies Record<TripPace, IoniconName>;

const destinationParentheticalPattern = /\s*\([^)]*\)/g;

const normalizeProfileOption = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");

const getSelectedTravelerType = (value: string): TravelerType =>
	travelerTypeOptions.find(
		(option) => normalizeProfileOption(option) === normalizeProfileOption(value)
	) ?? "solo";

const getSelectedTripPace = (value: string): TripPace =>
	paceOptions.find(
		(option) => normalizeProfileOption(option) === normalizeProfileOption(value)
	) ?? "balanced";

const getSelectedTripStyles = (value: string): TripStyle[] => {
	const normalizedValue = normalizeProfileOption(value);
	const selectedStyles = tripStyleOptions.filter((option) => {
		const normalizedOption = normalizeProfileOption(option);
		const normalizedLabel = normalizeProfileOption(
			getTripCreateOptionLabel("style", option)
		);

		return (
			normalizedValue.includes(normalizedOption) ||
			normalizedValue.includes(normalizedLabel)
		);
	});

	return selectedStyles.length > 0 ? selectedStyles : ["relaxed"];
};

const formatProfileTripStyles = (styles: readonly TripStyle[]) =>
	styles
		.map((style) => getTripCreateOptionLabel("style", style).toLowerCase())
		.join(", ");

const getProfileTripSummary = (form: TripProfileForm) => {
	const selectedTravelerType = getSelectedTravelerType(form.groupType);
	const selectedStyles = getSelectedTripStyles(form.travelStyle);
	const selectedPace = getSelectedTripPace(form.pace);
	const budgetAmount = Number(form.budgetAmount.replaceAll(",", ""));
	const details = [
		"Mode: Guided trip setup.",
		form.destination.trim()
			? `Destination: ${form.destination.trim()}.`
			: "Destination: undecided.",
		form.startDate.trim() && form.endDate.trim()
			? `Dates: ${form.startDate.trim()} to ${form.endDate.trim()}.`
			: null,
		`Travelers: ${getTripCreateOptionLabel("travelerType", selectedTravelerType)}.`,
		selectedStyles.length > 0
			? `Style: ${selectedStyles
					.map((style) => getTripCreateOptionLabel("style", style))
					.join(", ")}.`
			: null,
		`Pace: ${getTripCreateOptionLabel("pace", selectedPace)}.`,
		Number.isFinite(budgetAmount) && budgetAmount > 0
			? `Budget: PHP ${budgetAmount.toLocaleString()}.`
			: null,
		"Use this context to enrich itinerary, places, budget, and readiness.",
	].filter(Boolean);

	return details.join(" ");
};

const tripScreenMeta: Record<TripTab, { icon: IoniconName; label: string }> = {
	bookings: { icon: "briefcase-outline", label: "Bookings" },
	budget: { icon: "wallet-outline", label: "Budget" },
	checklist: { icon: "shield-checkmark-outline", label: "Readiness" },
	companions: { icon: "people-outline", label: "Companions" },
	documents: { icon: "folder-open-outline", label: "Vault" },
	itinerary: { icon: "calendar-outline", label: "Itinerary" },
	memories: { icon: "images-outline", label: "Memories" },
	notes: { icon: "document-text-outline", label: "Notes" },
	overview: { icon: "speedometer-outline", label: "Overview" },
	places: { icon: "map-outline", label: "Places" },
	recap: { icon: "share-social-outline", label: "Recap" },
	risks: { icon: "warning-outline", label: "Risks" },
	travel: { icon: "navigate-outline", label: "Travel Mode" },
};

interface ModuleAccent {
	bg: string;
	color: string;
}

const moduleAccents: Record<string, ModuleAccent> = {
	Bookings: { bg: "rgba(255, 159, 10, 0.12)", color: "#FF9F0A" },
	Budget: { bg: "rgba(10, 165, 181, 0.12)", color: "#0AA5B5" },
	Checklist: { bg: "rgba(94, 92, 230, 0.12)", color: "#5E5CE6" },
	Companions: { bg: "rgba(255, 45, 85, 0.1)", color: "#FF2D55" },
	Documents: { bg: "rgba(175, 82, 222, 0.12)", color: "#AF52DE" },
	Itinerary: { bg: "rgba(191, 90, 242, 0.12)", color: "#BF5AF2" },
	Memories: { bg: "rgba(191, 90, 242, 0.12)", color: "#BF5AF2" },
	Notes: { bg: "rgba(255, 159, 10, 0.12)", color: "#FF9F0A" },
	Overview: { bg: "rgba(10, 132, 255, 0.1)", color: "#0A84FF" },
	Places: { bg: "rgba(52, 199, 89, 0.12)", color: "#34C759" },
	Readiness: { bg: "rgba(52, 199, 89, 0.12)", color: "#34C759" },
	Recap: { bg: "rgba(10, 132, 255, 0.1)", color: "#0A84FF" },
	Risks: { bg: "rgba(255, 59, 48, 0.1)", color: "#FF3B30" },
	"Travel Mode": { bg: "rgba(0, 122, 255, 0.1)", color: "#007AFF" },
	Vault: { bg: "rgba(255, 159, 10, 0.12)", color: "#FF9F0A" },
};

const defaultModuleAccent: ModuleAccent = {
	bg: "rgba(10, 132, 255, 0.1)",
	color: "#0A84FF",
};
const getModuleAccent = (label: string): ModuleAccent =>
	moduleAccents[label] ?? defaultModuleAccent;

interface TripProfileForm {
	budgetAmount: string;
	destination: string;
	endDate: string;
	groupType: string;
	pace: string;
	startDate: string;
	title: string;
	travelStyle: string;
}

function SheetField({
	label,
	onChangeText,
	placeholder,
	value,
}: {
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TripTextField
			label={label}
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder={placeholder}
			value={value}
		/>
	);
}

function ProfileFormSection({
	children,
	subtitle,
	title,
}: {
	children: ReactNode;
	subtitle?: string;
	title: string;
}) {
	return (
		<View style={{ gap: 12 }}>
			<View style={{ gap: 2 }}>
				<AppText accessibilityRole="header" bold variant="subhead">
					{title}
				</AppText>
				{subtitle ? (
					<AppText tone="secondary" variant="footnote">
						{subtitle}
					</AppText>
				) : null}
			</View>
			{children}
		</View>
	);
}

function ProfileChoiceChip({
	isSelected,
	label,
	onPress,
}: {
	isSelected: boolean;
	label: string;
	onPress: () => void;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			haptic="selection"
			hitSlop={{ bottom: 5, top: 5 }}
			onPress={onPress}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				backgroundColor: isSelected ? palette.ink : palette.surface,
				borderRadius: radius.pill,
				flexDirection: "row",
				height: 34,
				paddingHorizontal: 16,
			}}
		>
			<AppText
				style={{
					color: isSelected ? palette.onPrimary : palette.ink,
					fontWeight: "500",
				}}
				variant="subhead"
			>
				{label}
			</AppText>
		</PressableScale>
	);
}

function ProfileOptionCard({
	description,
	icon,
	isSelected,
	onPress,
	title,
}: {
	description: string;
	icon: IoniconName;
	isSelected: boolean;
	onPress: () => void;
	title: string;
}) {
	const { palette } = useUITheme();

	return (
		<PressableScale
			accessibilityLabel={`${title}. ${description}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			haptic="selection"
			onPress={onPress}
			scaleTo={0.98}
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderColor: isSelected ? palette.ink : "transparent",
				borderCurve: "continuous",
				borderRadius: radius.card,
				borderWidth: 1.5,
				flexDirection: "row",
				gap: 12,
				minHeight: 64,
				padding: 16,
			}}
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height: 44,
					justifyContent: "center",
					width: 44,
				}}
			>
				<Ionicons
					color={isSelected ? palette.ink : palette.inkSecondary}
					name={icon}
					size={20}
				/>
			</View>
			<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
				<AppText variant="headline">{title}</AppText>
				<AppText tone="secondary" variant="subhead">
					{description}
				</AppText>
			</View>
			{isSelected ? (
				<Ionicons color={palette.ink} name="checkmark-circle" size={22} />
			) : null}
		</PressableScale>
	);
}

function TripProfileEditSheet({
	errorMessage,
	form,
	isOpen,
	isSaving,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
	errorMessage: string | null;
	form: TripProfileForm;
	isOpen: boolean;
	isSaving: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubmit: () => void;
	onUpdateForm: (key: keyof TripProfileForm, value: string) => void;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const dateRange: DateRangeValue = {
		end: form.endDate,
		start: form.startDate,
	};
	const selectedTravelerType = getSelectedTravelerType(form.groupType);
	const selectedStyles = getSelectedTripStyles(form.travelStyle);
	const selectedPace = getSelectedTripPace(form.pace);

	const toggleTripStyle = (style: TripStyle) => {
		const nextStyles = selectedStyles.includes(style)
			? selectedStyles.filter((item) => item !== style)
			: [...selectedStyles, style];

		onUpdateForm(
			"travelStyle",
			formatProfileTripStyles(nextStyles.length > 0 ? nextStyles : [style])
		);
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["88%"]}
				>
					<View
						style={{
							backgroundColor: palette.canvas,
							gap: 16,
							paddingBottom: Math.max(insets.bottom, 18),
							paddingHorizontal: 20,
						}}
					>
						<SheetHeader
							onClose={() => onOpenChange(false)}
							subtitle="Update the core trip details used across every module."
							title="Edit trip profile"
						/>
						<ScrollView
							contentContainerStyle={{ gap: 22, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 560 }}
						>
							<ProfileFormSection
								subtitle="These fields anchor the workspace and trip header."
								title="Trip identity"
							>
								<View className="gap-3">
									<SheetField
										label="Title"
										onChangeText={(value) => onUpdateForm("title", value)}
										placeholder="Summer getaway"
										value={form.title}
									/>
									<SheetField
										label="Destination"
										onChangeText={(value) => onUpdateForm("destination", value)}
										placeholder="Tokyo, Japan"
										value={form.destination}
									/>
								</View>
							</ProfileFormSection>

							<ProfileFormSection
								subtitle="Dates organize itinerary days, bookings, and recaps."
								title="Schedule"
							>
								<DateRangePickerField
									helperText="Dates set the number of days in this workspace."
									label="Trip dates"
									onValueChange={(value) => {
										onUpdateForm("startDate", value.start);
										onUpdateForm("endDate", value.end);
									}}
									value={dateRange}
								/>
							</ProfileFormSection>

							<ProfileFormSection
								subtitle="Match how this trip should be planned and displayed."
								title="Travelers"
							>
								<View className="flex-row flex-wrap gap-2">
									{travelerTypeOptions.map((option) => (
										<ProfileChoiceChip
											isSelected={selectedTravelerType === option}
											key={option}
											label={getTripCreateOptionLabel("travelerType", option)}
											onPress={() => onUpdateForm("groupType", option)}
										/>
									))}
								</View>
							</ProfileFormSection>

							<ProfileFormSection
								subtitle="Pick one or more styles so modules keep the right context."
								title="Trip style"
							>
								<View className="flex-row flex-wrap gap-2">
									{tripStyleOptions.map((option) => (
										<ProfileChoiceChip
											isSelected={selectedStyles.includes(option)}
											key={option}
											label={getTripCreateOptionLabel("style", option)}
											onPress={() => toggleTripStyle(option)}
										/>
									))}
								</View>
							</ProfileFormSection>

							<ProfileFormSection
								subtitle="Controls how dense itinerary suggestions should feel."
								title="Daily pace"
							>
								<View className="gap-2">
									{paceOptions.map((option) => (
										<ProfileOptionCard
											description={profilePaceDetails[option]}
											icon={profilePaceIcons[option]}
											isSelected={selectedPace === option}
											key={option}
											onPress={() => onUpdateForm("pace", option)}
											title={getTripCreateOptionLabel("pace", option)}
										/>
									))}
								</View>
							</ProfileFormSection>

							<ProfileFormSection
								subtitle="The amount tracked by the trip budget wallet."
								title="Budget"
							>
								<SheetField
									label="Budget amount"
									onChangeText={(value) => onUpdateForm("budgetAmount", value)}
									placeholder="25000"
									value={form.budgetAmount}
								/>
							</ProfileFormSection>
						</ScrollView>
						{errorMessage ? (
							<AppText tone="danger" variant="subhead">
								{errorMessage}
							</AppText>
						) : null}
						<PrimaryButton
							disabled={isSaving}
							isPending={isSaving}
							label="Save profile"
							onPress={onSubmit}
						/>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function TripDeleteConfirmSheet({
	errorMessage,
	isDeleting,
	isOpen,
	onConfirm,
	onOpenChange,
}: {
	errorMessage: string | null;
	isDeleting: boolean;
	isOpen: boolean;
	onConfirm: () => void;
	onOpenChange: (isOpen: boolean) => void;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[32px] bg-background"
					enablePanDownToClose={!isDeleting}
					snapPoints={["38%"]}
				>
					<View
						style={{
							backgroundColor: palette.canvas,
							gap: 16,
							paddingBottom: Math.max(insets.bottom, 18),
							paddingHorizontal: 20,
						}}
					>
						<SheetHeader
							onClose={() => {
								if (!isDeleting) {
									onOpenChange(false);
								}
							}}
							subtitle="This permanently removes the trip and its saved planning details."
							title="Delete trip?"
						/>
						{errorMessage ? (
							<AppText
								accessibilityLiveRegion="polite"
								tone="danger"
								variant="subhead"
							>
								{errorMessage}
							</AppText>
						) : null}
						<View style={{ gap: 8 }}>
							<PrimaryButton
								destructive
								disabled={isDeleting}
								isPending={isDeleting}
								label="Delete"
								onPress={onConfirm}
							/>
							<SecondaryButton
								disabled={isDeleting}
								label="Cancel"
								onPress={() => onOpenChange(false)}
							/>
						</View>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

interface LinkButtonProps {
	children: string;
	href: Href;
	icon?: IoniconName;
	variant?: "primary" | "secondary" | "ghost";
}

export function LinkButton({
	children,
	href,
	icon,
	variant = "secondary",
}: LinkButtonProps) {
	const router = useRouter();
	const { palette } = useUITheme();
	const isPrimary = variant === "primary";
	const foreground = isPrimary ? palette.onPrimary : palette.accent;

	return (
		<PressableScale
			accessibilityLabel={children}
			accessibilityRole="link"
			hitSlop={{ bottom: 5, top: 5 }}
			onPress={() => router.push(href)}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				alignSelf: "flex-start",
				backgroundColor: (() => {
					if (isPrimary) {
						return palette.ink;
					}
					return variant === "ghost" ? "transparent" : palette.fill;
				})(),
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 6,
				height: 34,
				paddingHorizontal: 14,
			}}
		>
			{icon ? <Ionicons color={foreground} name={icon} size={16} /> : null}
			<AppText
				style={{ color: foreground, fontWeight: "600" }}
				variant="subhead"
			>
				{children}
			</AppText>
		</PressableScale>
	);
}

export function Section({
	children,
	icon,
	title,
}: {
	children: ReactNode;
	icon?: IoniconName;
	title: string;
}) {
	const { palette } = useUITheme();

	return (
		<View style={{ gap: 12, paddingVertical: 8 }}>
			<View style={{ alignItems: "center", flexDirection: "row", gap: 8 }}>
				{icon ? (
					<Ionicons color={palette.inkSecondary} name={icon} size={18} />
				) : null}
				<AppText accessibilityRole="header" bold variant="headline">
					{title}
				</AppText>
			</View>
			{children}
		</View>
	);
}

export function EmptyCopy({
	actionHref,
	actionLabel,
	children,
	icon = "ellipse-outline",
}: {
	actionHref?: Href;
	actionLabel?: string;
	children: string;
	icon?: IoniconName;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderCurve: "continuous",
				borderRadius: radius.card,
				gap: 8,
				padding: 20,
			}}
		>
			<Ionicons color={palette.inkTertiary} name={icon} size={20} />
			<AppText
				style={{ textAlign: "center" }}
				tone="secondary"
				variant="subhead"
			>
				{children}
			</AppText>
			{actionHref && actionLabel ? (
				<LinkButton href={actionHref}>{actionLabel}</LinkButton>
			) : null}
		</View>
	);
}

export function TripHeaderActionGroup({
	model,
}: {
	model: TripDashboardModel;
}) {
	const router = useRouter();
	const { palette } = useUITheme();
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
	const toggleTripFavorite = useMutation(api.trips.toggleTripFavorite);
	const archiveTrip = useMutation(api.trips.archiveTrip);
	const deleteTrip = useMutation(api.trips.deleteTrip);
	const isFavorite = model.workspace.trip.isFavorite ?? false;
	const isArchived = model.workspace.trip.status === "archived";
	const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
	const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isDeletingTrip, setIsDeletingTrip] = useState(false);
	const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
		null
	);
	const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(
		null
	);
	const [profileForm, setProfileForm] = useState<TripProfileForm>({
		budgetAmount: model.workspace.trip.budgetAmount?.toString() ?? "",
		destination: model.workspace.trip.destination,
		endDate: model.workspace.trip.endDate,
		groupType: model.workspace.trip.groupType,
		pace: model.workspace.trip.pace,
		startDate: model.workspace.trip.startDate,
		title: model.workspace.trip.title,
		travelStyle: model.workspace.trip.travelStyle,
	});

	const updateProfileForm = (key: keyof TripProfileForm, value: string) => {
		setProfileErrorMessage(null);
		setProfileForm((currentForm) => ({ ...currentForm, [key]: value }));
	};

	const openProfileSheet = () => {
		setProfileErrorMessage(null);
		setProfileForm({
			budgetAmount: model.workspace.trip.budgetAmount?.toString() ?? "",
			destination: model.workspace.trip.destination,
			endDate: model.workspace.trip.endDate,
			groupType: model.workspace.trip.groupType,
			pace: model.workspace.trip.pace,
			startDate: model.workspace.trip.startDate,
			title: model.workspace.trip.title,
			travelStyle: model.workspace.trip.travelStyle,
		});
		setIsProfileSheetOpen(true);
	};

	const handleSaveProfile = async () => {
		const title = profileForm.title.trim();
		const destination = profileForm.destination.trim();

		if (!(title && destination)) {
			setProfileErrorMessage("Add a trip title and destination.");
			return;
		}

		const budgetAmount = Number(profileForm.budgetAmount.replaceAll(",", ""));
		setProfileErrorMessage(null);
		setIsSavingProfile(true);
		try {
			await updateTripProfile({
				budgetAmount:
					Number.isFinite(budgetAmount) && budgetAmount > 0
						? budgetAmount
						: undefined,
				budgetCurrency: model.workspace.trip.budgetCurrency ?? "PHP",
				destination,
				endDate: profileForm.endDate.trim(),
				groupType: profileForm.groupType.trim() || "solo",
				pace: profileForm.pace.trim() || "balanced",
				startDate: profileForm.startDate.trim(),
				summary: getProfileTripSummary(profileForm),
				title,
				travelStyle: profileForm.travelStyle.trim() || "balanced",
				tripId: model.tripId,
			});
			setIsProfileSheetOpen(false);
		} catch {
			setProfileErrorMessage("Could not update trip profile.");
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleFavoritePress = () => {
		setActionErrorMessage(null);
		haptic("selection");
		toggleTripFavorite({
			isFavorite: !isFavorite,
			tripId: model.tripId,
		}).catch(() => {
			setActionErrorMessage("Could not update favorite.");
		});
	};

	const handleArchivePress = () => {
		setActionErrorMessage(null);
		archiveTrip({ tripId: model.tripId }).catch(() => {
			setActionErrorMessage("Could not archive trip.");
		});
	};

	const handleDeleteTrip = async () => {
		setActionErrorMessage(null);
		setIsDeletingTrip(true);
		try {
			await deleteTrip({ tripId: model.tripId });
			haptic("success");
			setIsDeleteSheetOpen(false);
			router.replace(VIYA_ROUTES.trips as Href);
		} catch {
			haptic("error");
			setActionErrorMessage("Could not delete trip.");
		} finally {
			setIsDeletingTrip(false);
		}
	};

	const handleDeletePress = () => {
		setActionErrorMessage(null);
		setIsDeleteSheetOpen(true);
	};

	return (
		<>
			<View style={{ alignItems: "flex-end", gap: 4 }}>
				<Menu>
					<Menu.Trigger asChild={true}>
						<PressableScale
							accessibilityLabel="Open trip options"
							accessibilityRole="button"
							style={{
								alignItems: "center",
								backgroundColor: palette.surface,
								borderRadius: radius.pill,
								height: 44,
								justifyContent: "center",
								width: 44,
							}}
						>
							<Ionicons
								color={palette.ink}
								name="ellipsis-horizontal"
								size={22}
							/>
						</PressableScale>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Overlay />
						<Menu.Content
							align="end"
							className="rounded-[24px] bg-surface p-2"
							offset={10}
							placement="bottom"
							presentation="popover"
							width={300}
						>
							<Menu.Item
								accessibilityLabel="Edit trip profile"
								className="flex-row items-center gap-3 rounded-[22px] p-3"
								isAnimatedStyleActive={false}
								onPress={openProfileSheet}
							>
								<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
									<Ionicons
										color={palette.accent}
										name="create-outline"
										size={18}
									/>
								</View>
								<View className="flex-1">
									<Menu.ItemTitle className="font-semibold text-sm">
										Edit profile
									</Menu.ItemTitle>
									<Menu.ItemDescription className="text-xs">
										Update dates, destination, budget, and notes.
									</Menu.ItemDescription>
								</View>
							</Menu.Item>
							<Menu.Item
								accessibilityLabel={
									isFavorite ? "Remove from favorites" : "Add to favorites"
								}
								className="flex-row items-center gap-3 rounded-[22px] p-3"
								isAnimatedStyleActive={false}
								onPress={handleFavoritePress}
							>
								<View className="h-9 w-9 items-center justify-center rounded-full bg-warning/10">
									<Ionicons
										color={palette.warning}
										name={isFavorite ? "heart" : "heart-outline"}
										size={18}
									/>
								</View>
								<View className="flex-1">
									<Menu.ItemTitle className="font-semibold text-sm">
										{isFavorite ? "Favorited" : "Add to favorites"}
									</Menu.ItemTitle>
									<Menu.ItemDescription className="text-xs">
										{isFavorite
											? "Keep this trip in favorites."
											: "Pin this trip for quick access."}
									</Menu.ItemDescription>
								</View>
							</Menu.Item>
							<Menu.Item
								accessibilityLabel={
									isArchived ? "Trip archived" : "Archive trip"
								}
								className="flex-row items-center gap-3 rounded-[22px] p-3"
								isAnimatedStyleActive={false}
								isDisabled={isArchived}
								onPress={handleArchivePress}
								style={{ opacity: isArchived ? 0.5 : 1 }}
							>
								<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons
										color={palette.inkSecondary}
										name="archive-outline"
										size={18}
									/>
								</View>
								<View className="flex-1">
									<Menu.ItemTitle className="font-semibold text-sm">
										{isArchived ? "Archived" : "Archive"}
									</Menu.ItemTitle>
									<Menu.ItemDescription className="text-xs">
										Move this trip out of active planning.
									</Menu.ItemDescription>
								</View>
							</Menu.Item>
							<View className="mx-3 my-1 h-px bg-border" />
							<Menu.Item
								accessibilityLabel="Delete trip"
								className="flex-row items-center gap-3 rounded-[22px] p-3"
								isAnimatedStyleActive={false}
								onPress={handleDeletePress}
							>
								<View className="h-9 w-9 items-center justify-center rounded-full bg-danger/10">
									<Ionicons
										color={palette.danger}
										name="trash-outline"
										size={18}
									/>
								</View>
								<View className="flex-1">
									<Menu.ItemTitle className="font-semibold text-danger text-sm">
										Delete trip
									</Menu.ItemTitle>
									<Menu.ItemDescription className="text-xs">
										Remove this trip permanently.
									</Menu.ItemDescription>
								</View>
							</Menu.Item>
						</Menu.Content>
					</Menu.Portal>
				</Menu>
				{actionErrorMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						className="max-w-44"
						tone="danger"
						variant="footnote"
					>
						{actionErrorMessage}
					</AppText>
				) : null}
			</View>
			<TripProfileEditSheet
				errorMessage={profileErrorMessage}
				form={profileForm}
				isOpen={isProfileSheetOpen}
				isSaving={isSavingProfile}
				onOpenChange={(isOpen) => {
					setIsProfileSheetOpen(isOpen);
					if (!isOpen) {
						setProfileErrorMessage(null);
					}
				}}
				onSubmit={() => {
					handleSaveProfile().catch(() => undefined);
				}}
				onUpdateForm={updateProfileForm}
			/>
			<TripDeleteConfirmSheet
				errorMessage={actionErrorMessage}
				isDeleting={isDeletingTrip}
				isOpen={isDeleteSheetOpen}
				onConfirm={() => {
					handleDeleteTrip().catch(() => undefined);
				}}
				onOpenChange={(isOpen) => {
					setIsDeleteSheetOpen(isOpen);
					if (!isOpen) {
						setActionErrorMessage(null);
					}
				}}
			/>
		</>
	);
}

export function TripStickyHeader({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const { trip } = model.workspace;

	return (
		<View
			style={{
				backgroundColor: palette.canvas,
				paddingBottom: 12,
				paddingHorizontal: 16,
				paddingTop: insets.top + 10,
				zIndex: 30,
			}}
		>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: 12,
					minHeight: 44,
				}}
			>
				<View
					style={{
						alignItems: "center",
						flex: 1,
						flexDirection: "row",
						gap: 12,
						minWidth: 0,
					}}
				>
					<NavigationBackButton onPress={() => router.back()} />
					<View style={{ flex: 1, minWidth: 0 }}>
						<AppText bold numberOfLines={1} variant="subhead">
							{trip.title}
						</AppText>
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{trip.destination} · {model.tripWindow}
						</AppText>
					</View>
				</View>
				<View style={{ alignItems: "flex-end", minWidth: 48 }}>
					<TripHeaderActionGroup model={model} />
				</View>
			</View>
		</View>
	);
}

export function TripFloatingViyaButton({
	activeTab,
	tripId,
}: {
	activeTab: TripTab;
	tripId: Id<"trips">;
}) {
	const router = useRouter();
	const { palette } = useUITheme();
	const lastNavigationPressRef = useRef(0);

	const handlePress = () => {
		const now = Date.now();

		if (now - lastNavigationPressRef.current < viyaButtonNavigationThrottleMs) {
			return;
		}

		lastNavigationPressRef.current = now;
		router.push({
			params: {
				mode: "trip",
				returnTo:
					activeTab === "overview"
						? `/(app)/trips/${tripId}`
						: `/(app)/trips/${tripId}/${activeTab}`,
				tripId: String(tripId),
				workspaceTab: activeTab,
			},
			pathname: VIYA_ROUTES.ai,
		});
	};

	return (
		<GlassSurface interactive shape="circle" style={{ height: 56, width: 56 }}>
			<PressableScale
				accessibilityLabel="Open Viya for this trip"
				accessibilityRole="button"
				onPress={handlePress}
				style={{
					alignItems: "center",
					height: 56,
					justifyContent: "center",
					width: 56,
				}}
			>
				<Ionicons color={palette.accent} name="chatbubble-outline" size={22} />
			</PressableScale>
		</GlassSurface>
	);
}

function TripMetaChip({ icon, label }: { icon: IoniconName; label: string }) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: 6,
				maxWidth: "100%",
			}}
		>
			<Ionicons color={palette.inkSecondary} name={icon} size={13} />
			<AppText
				bold
				numberOfLines={1}
				style={{ flexShrink: 1 }}
				variant="footnote"
			>
				{label}
			</AppText>
		</View>
	);
}

function TripHeroCover({
	coverImageUrl,
	destination,
}: {
	coverImageUrl?: string | null;
	destination: string;
}) {
	const { palette } = useUITheme();
	const destinationInitial = (
		destination.trim().charAt(0) || "V"
	).toUpperCase();

	if (coverImageUrl) {
		return (
			<View
				style={{
					backgroundColor: palette.fill,
					borderCurve: "continuous",
					borderRadius: 22,
					height: 96,
					overflow: "hidden",
					width: 96,
				}}
			>
				<ImageBackground
					accessibilityIgnoresInvertColors={true}
					accessibilityLabel={`${destination} cover photo`}
					imageStyle={{ borderRadius: 22 }}
					source={{ uri: coverImageUrl }}
					style={{ height: "100%", width: "100%" }}
				/>
			</View>
		);
	}

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderCurve: "continuous",
				borderRadius: 22,
				height: 96,
				justifyContent: "center",
				width: 96,
			}}
		>
			<AppText bold variant="heading">
				{destinationInitial}
			</AppText>
		</View>
	);
}

const getDestinationImageFallbackNames = (destination: string) => {
	const cleanedDestination = destination.trim();
	const locationName = cleanedDestination
		.replace(destinationParentheticalPattern, "")
		.split(",")[0]
		?.trim();
	const names = [cleanedDestination, locationName].filter(
		(name, index, values): name is string =>
			Boolean(name) && values.indexOf(name) === index
	);

	return names;
};

export function TripHero({ model }: { model: TripDashboardModel }) {
	const { palette } = useUITheme();
	const { readiness, travelerLabel, tripWindow, workspace } = model;
	const destinationImageFallbackNames = getDestinationImageFallbackNames(
		workspace.trip.destination
	);
	const destinationsNeedingCoverImages =
		!workspace.trip.coverImageUrl ||
		isDecorativeDestinationImageUrl(workspace.trip.coverImageUrl)
			? destinationImageFallbackNames
			: [];
	const replacementCoverImageUrls = useDestinationImages(
		destinationsNeedingCoverImages
	);
	const replacementCoverImageUrl = destinationImageFallbackNames
		.map((name) => replacementCoverImageUrls[name])
		.find(Boolean);
	const coverImageUrl = isDecorativeDestinationImageUrl(
		workspace.trip.coverImageUrl
	)
		? replacementCoverImageUrl
		: (workspace.trip.coverImageUrl ?? replacementCoverImageUrl);
	const readinessDisplay = getReadinessDisplay({
		itemCount: workspace.readinessItems.length,
		score: readiness.score,
	});
	const destinationLabel =
		workspace.trip.destination.trim() || "Destination TBD";
	const hasBudget = Boolean(workspace.trip.budgetAmount);
	const budgetSummary = hasBudget
		? `${formatMoney(model.budget.remaining, model.currency)} left`
		: "Set budget";
	const budgetProgress =
		hasBudget && workspace.trip.budgetAmount
			? Math.min(
					100,
					Math.max(
						0,
						(model.budget.totalTrackedSpend / workspace.trip.budgetAmount) * 100
					)
				)
			: 0;
	return (
		<Animated.View
			entering={FadeInDown.duration(220)}
			style={{ gap: 20, paddingHorizontal: 4, paddingVertical: 8 }}
		>
			<View style={{ alignItems: "center", flexDirection: "row", gap: 16 }}>
				<TripHeroCover
					coverImageUrl={coverImageUrl}
					destination={workspace.trip.destination}
				/>
				<View style={{ flex: 1, gap: 10, minWidth: 0 }}>
					<AppText
						accessibilityRole="header"
						bold
						numberOfLines={2}
						variant="heading"
					>
						{workspace.trip.title}
					</AppText>
					<View style={{ gap: 6 }}>
						<View
							style={{
								alignItems: "center",
								columnGap: 12,
								flexDirection: "row",
								flexWrap: "wrap",
								rowGap: 6,
							}}
						>
							<TripMetaChip icon="location-outline" label={destinationLabel} />
							<TripMetaChip icon="people-outline" label={travelerLabel} />
						</View>
						<TripMetaChip icon="calendar-clear-outline" label={tripWindow} />
					</View>
				</View>
			</View>
			<View
				style={{
					alignItems: "stretch",
					flexDirection: "row",
					gap: 16,
					paddingTop: 16,
				}}
			>
				<Link asChild href={VIYA_ROUTES.tripReadiness(model.tripId)}>
					<PressableScale
						accessibilityLabel="View readiness details"
						accessibilityRole="button"
						scaleTo={0.98}
						style={{ flex: 1, minWidth: 0 }}
					>
						<TripMetricBlock
							detail={readinessDisplay.detail}
							label="READINESS"
							progress={readinessDisplay.progress}
							tone="success"
							value={readinessDisplay.value}
						/>
					</PressableScale>
				</Link>
				<View
					style={{
						alignSelf: "stretch",
						backgroundColor: palette.separator,
						width: 1,
					}}
				/>
				<Link asChild href={VIYA_ROUTES.tripBudget(model.tripId)}>
					<PressableScale
						accessibilityLabel="Open trip budget"
						accessibilityRole="button"
						scaleTo={0.98}
						style={{ flex: 1, minWidth: 0 }}
					>
						<TripMetricBlock
							align="flex-end"
							detail={model.budget.status}
							label="BUDGET"
							progress={budgetProgress}
							value={budgetSummary}
						/>
					</PressableScale>
				</Link>
			</View>
		</Animated.View>
	);
}

interface TripWorkspaceModule {
	detail: string;
	href: Href;
	icon: IoniconName;
	label: string;
	span?: "full";
	tab: TripTab;
	value: string;
}

type WorkspaceModuleGroupKey = "core";

interface TripWorkspaceModuleGroup {
	items: TripWorkspaceModule[];
	label: string;
	value: WorkspaceModuleGroupKey;
}

const formatCountLabel = (count: number, singular: string) =>
	`${count} ${count === 1 ? singular : `${singular}s`}`;

const formatWorkspaceStatusLabel = (status: string) =>
	status
		.split("-")
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(" ");

const getTripWorkspaceModuleGroups = (
	model: TripDashboardModel,
	options: { includeOverview?: boolean } = {}
): TripWorkspaceModuleGroup[] => {
	const documentCount =
		model.workspace.documents.length + model.workspace.vaultItems.length;
	const bookingCount = model.workspace.bookings.length;
	const itineraryDayCount = model.workspace.itineraryDays.length;
	const itineraryItemCount = model.workspace.itineraryItems.length;
	const vaultValue =
		bookingCount > 0
			? formatCountLabel(bookingCount, "booking")
			: formatCountLabel(documentCount, "file");
	const overviewItem: TripWorkspaceModule = {
		detail: "Trip snapshot, next actions, and workspace summary",
		href: VIYA_ROUTES.tripDashboard(model.tripId),
		icon: "speedometer-outline",
		label: "Overview",
		span: "full",
		tab: "overview",
		value: formatWorkspaceStatusLabel(model.workspace.trip.status),
	};
	const workspaceItems: TripWorkspaceModule[] = [
		{
			detail:
				itineraryDayCount > 0
					? `${formatCountLabel(itineraryDayCount, "day")} planned`
					: "Add days, places, meals, and transfers",
			href: VIYA_ROUTES.tripItinerary(model.tripId),
			icon: "calendar-outline",
			label: "Itinerary",
			tab: "itinerary",
			value: formatCountLabel(itineraryItemCount, "stop"),
		},
		{
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "wallet-outline",
			label: "Budget",
			tab: "budget",
			detail: "Central spend, bookings, receipts, and daily pace",
			value: `${formatMoney(model.budget.remaining, model.currency)} left`,
		},
		{
			detail: "Bookings, passports, tickets, and documents",
			href: VIYA_ROUTES.tripVault(model.tripId),
			icon: "folder-open-outline",
			label: "Vault",
			tab: "documents",
			value: vaultValue,
		},
		{
			detail: model.readiness.topBlocker,
			href: VIYA_ROUTES.tripReadiness(model.tripId),
			icon: "shield-checkmark-outline",
			label: "Readiness",
			tab: "checklist",
			value: model.readiness.label,
		},
	];

	return [
		{
			label: "Workspace",
			value: "core",
			items: options.includeOverview
				? [overviewItem, ...workspaceItems]
				: workspaceItems,
		},
	];
};

function ModuleLauncherBadge({
	accent,
	isActive,
	value,
}: {
	accent: ModuleAccent;
	isActive: boolean;
	value: string;
}) {
	const { palette } = useUITheme();

	if (isActive) {
		return (
			<View
				style={{
					alignItems: "center",
					backgroundColor: palette.surface,
					borderRadius: radius.pill,
					flexDirection: "row",
					gap: 4,
					paddingHorizontal: 8,
					paddingVertical: 4,
				}}
			>
				<Ionicons
					color={accent.color}
					name="checkmark-circle-outline"
					size={12}
				/>
				<AppText bold style={{ color: accent.color }} variant="footnote">
					Current
				</AppText>
			</View>
		);
	}

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flexShrink: 1,
				maxWidth: 128,
				minWidth: 0,
				paddingHorizontal: 8,
				paddingVertical: 4,
			}}
		>
			<AppText
				bold
				numberOfLines={1}
				style={{ color: accent.color }}
				variant="footnote"
			>
				{value}
			</AppText>
		</View>
	);
}

function ModuleLauncherTile({
	isActive,
	item,
	onPress,
}: {
	isActive: boolean;
	item: TripWorkspaceModule;
	onPress: () => void;
}) {
	const { palette } = useUITheme();
	const accent = getModuleAccent(item.label);

	return (
		<PressableScale
			accessibilityLabel={`${isActive ? "Current module" : "Open"} ${item.label}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isActive }}
			haptic="selection"
			onPress={onPress}
			scaleTo={0.98}
			style={{
				backgroundColor: isActive ? accent.bg : palette.surface,
				borderCurve: "continuous",
				borderRadius: radius.card,
				flexBasis: item.span === "full" ? "100%" : "47%",
				flexGrow: 1,
				gap: 10,
				justifyContent: "space-between",
				minHeight: 96,
				padding: 14,
			}}
		>
			<View
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: 8,
					justifyContent: "space-between",
				}}
			>
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.fill,
						borderRadius: radius.group,
						height: 36,
						justifyContent: "center",
						width: 36,
					}}
				>
					<Ionicons color={accent.color} name={item.icon} size={18} />
				</View>
				<ModuleLauncherBadge
					accent={accent}
					isActive={isActive}
					value={item.value}
				/>
			</View>
			<View style={{ gap: 2 }}>
				<AppText bold numberOfLines={1} variant="callout">
					{item.label}
				</AppText>
				<AppText numberOfLines={2} tone="secondary" variant="footnote">
					{item.detail}
				</AppText>
			</View>
		</PressableScale>
	);
}

function TripModulesSheet({
	activeTab,
	isOpen,
	model,
	onOpenChange,
}: {
	activeTab: TripTab;
	isOpen: boolean;
	model: TripDashboardModel;
	onOpenChange: (isOpen: boolean) => void;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const { height } = useWindowDimensions();
	const moduleGroups = getTripWorkspaceModuleGroups(model, {
		includeOverview: true,
	});
	const moduleListMaxHeight = getTripModulesSheetListMaxHeight({
		bottomInset: insets.bottom,
		windowHeight: height,
	});

	const openModule = (item: TripWorkspaceModule) => {
		onOpenChange(false);

		if (item.tab !== activeTab) {
			router.push(item.href);
		}
	};

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-surface"
					enablePanDownToClose={true}
					snapPoints={["78%"]}
				>
					<View
						style={{
							backgroundColor: palette.surface,
							gap: 16,
							paddingBottom: Math.max(insets.bottom, 18),
							paddingHorizontal: 20,
						}}
					>
						<SheetHeader
							onClose={() => onOpenChange(false)}
							subtitle={`Jump between sections for ${model.workspace.trip.title}.`}
							title="Workspace"
						/>

						<ScrollView
							contentContainerStyle={{ gap: 18, paddingBottom: 6 }}
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: moduleListMaxHeight }}
						>
							{moduleGroups.map((group) => (
								<View key={group.value} style={{ gap: 12 }}>
									<AppText
										style={{ paddingHorizontal: 4 }}
										tone="secondary"
										variant="eyebrow"
									>
										{group.label}
									</AppText>
									<View
										style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
									>
										{group.items.map((item) => (
											<ModuleLauncherTile
												isActive={item.tab === activeTab}
												item={item}
												key={item.label}
												onPress={() => openModule(item)}
											/>
										))}
									</View>
								</View>
							))}
						</ScrollView>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function TripModuleMenuButton({
	activeTab,
	model,
}: {
	activeTab: TripTab;
	model: TripDashboardModel;
}) {
	const { palette } = useUITheme();
	const [isModulesOpen, setIsModulesOpen] = useState(false);
	const activeScreen = tripScreenMeta[activeTab];
	const activeAccent = getModuleAccent(activeScreen.label);

	return (
		<>
			<GlassSurface interactive shape="pill" style={{ height: 56, width: 176 }}>
				<PressableScale
					accessibilityLabel={`Open workspace from ${activeScreen.label}`}
					accessibilityRole="button"
					onPress={() => setIsModulesOpen(true)}
					scaleTo={0.97}
					style={{
						alignItems: "center",
						flexDirection: "row",
						gap: 12,
						height: 56,
						paddingHorizontal: 8,
					}}
				>
					<View
						style={{
							alignItems: "center",
							backgroundColor: activeAccent.bg,
							borderRadius: radius.pill,
							height: 40,
							justifyContent: "center",
							width: 40,
						}}
					>
						<Ionicons
							color={activeAccent.color}
							name={activeScreen.icon}
							size={18}
						/>
					</View>
					<View style={{ flex: 1, minWidth: 0 }}>
						<AppText
							adjustsFontSizeToFit={true}
							bold
							numberOfLines={1}
							variant="subhead"
						>
							{activeScreen.label}
						</AppText>
					</View>
					<Ionicons color={palette.inkSecondary} name="chevron-up" size={14} />
				</PressableScale>
			</GlassSurface>
			<TripModulesSheet
				activeTab={activeTab}
				isOpen={isModulesOpen}
				model={model}
				onOpenChange={setIsModulesOpen}
			/>
		</>
	);
}

export function TripModuleNavigationBar({
	activeTab,
	model,
}: {
	activeTab: TripTab;
	model: TripDashboardModel;
}) {
	const insets = useSafeAreaInsets();

	return (
		<View
			pointerEvents="box-none"
			style={{
				alignItems: "center",
				bottom: Math.max(insets.bottom + 10, tripFloatingBarBottomInset),
				flexDirection: "row",
				gap: tripFloatingBarGap,
				justifyContent: "center",
				left: 0,
				paddingHorizontal: 16,
				position: "absolute",
				right: 0,
				zIndex: 30,
			}}
		>
			<TripModuleMenuButton activeTab={activeTab} model={model} />
			<TripFloatingViyaButton activeTab={activeTab} tripId={model.tripId} />
		</View>
	);
}

function WorkspaceModuleTile({ item }: { item: TripWorkspaceModule }) {
	const { palette } = useUITheme();
	const accent = getModuleAccent(item.label);

	return (
		<Link asChild href={item.href}>
			<PressableScale
				accessibilityLabel={`Open ${item.label}`}
				accessibilityRole="button"
				scaleTo={0.98}
				style={{
					backgroundColor: palette.surface,
					borderCurve: "continuous",
					borderRadius: radius.card,
					flexBasis: "47%",
					flexGrow: 1,
					gap: 10,
					justifyContent: "space-between",
					minHeight: 96,
					padding: 14,
				}}
			>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						gap: 8,
						justifyContent: "space-between",
						minWidth: 0,
					}}
				>
					<View
						style={{
							alignItems: "center",
							backgroundColor: palette.fill,
							borderRadius: radius.group,
							height: 36,
							justifyContent: "center",
							width: 36,
						}}
					>
						<Ionicons color={accent.color} name={item.icon} size={18} />
					</View>
					<View
						style={{
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							flexShrink: 1,
							maxWidth: 128,
							minWidth: 0,
							paddingHorizontal: 10,
							paddingVertical: 4,
						}}
					>
						<AppText
							bold
							numberOfLines={1}
							style={{ color: accent.color }}
							variant="footnote"
						>
							{item.value}
						</AppText>
					</View>
				</View>
				<View style={{ gap: 2 }}>
					<AppText bold numberOfLines={1} variant="callout">
						{item.label}
					</AppText>
					<AppText numberOfLines={2} tone="secondary" variant="footnote">
						{item.detail}
					</AppText>
				</View>
			</PressableScale>
		</Link>
	);
}

const buildWorkspaceAutopilotPrompt = (model: TripDashboardModel) => {
	const { workspace } = model;
	const trip = workspace.trip;
	const tripLabel = trip.title.trim() || "this trip";
	const destination = trip.destination.trim() || "the destination";
	const budget = trip.budgetAmount
		? `${formatMoney(trip.budgetAmount, model.currency)} budget`
		: "no confirmed budget yet";
	const vaultCoverageCount = Math.max(
		workspace.vaultItems.length,
		workspace.documents.length
	);
	const coverage = [
		`${workspace.itineraryDays.length} itinerary days`,
		`${workspace.itineraryItems.length} itinerary stops`,
		`${vaultCoverageCount} Vault files`,
		`${workspace.bookings.length} bookings`,
		`${workspace.expenses.length} expenses`,
		`${workspace.risks.length} risks`,
		`${model.readiness.score}% readiness`,
	].join(", ");

	return [
		`Complete the workspace for ${tripLabel}.`,
		`Trip context: destination ${destination}; dates ${model.tripWindow}; traveler context ${model.travelerLabel}; ${budget}.`,
		`Current workspace coverage: ${coverage}.`,
		"Use the trip profile, Vault, bookings, budget, itinerary, risks, notes, companions, travel mode, and readiness together.",
		"Stage the work as reviewable changes: prepare Vault, identify booking or document gaps, generate or refine a realistic itinerary, track budget evidence, add risks and backups, then run a readiness audit.",
		"Ask only for missing decisions that block the next useful workspace action. Do not invent confirmed bookings, uploaded documents, live availability, weather, traffic, or paid reservations.",
	].join(" ");
};

const workspaceAutopilotDraftModules = [
	{ action: "generate", module: "itinerary" },
	{ action: "audit", module: "bookings" },
	{ action: "audit", module: "documents" },
	{ action: "audit", module: "budget" },
	{ action: "audit", module: "readiness" },
	{ action: "audit", module: "risks" },
] as const;

const tripAgentModuleLabels = {
	bookings: "Bookings",
	budget: "Budget",
	documents: "Vault",
	itinerary: "Itinerary",
	places: "Places",
	readiness: "Readiness",
	recap: "Recap",
	risks: "Risks",
	travel: "Travel Mode",
} as const satisfies Record<Doc<"tripAgentDrafts">["module"], string>;

function TripAgentDraftRow({
	draft,
	isPending,
	onApply,
	onDismiss,
}: {
	draft: Doc<"tripAgentDrafts">;
	isPending: boolean;
	onApply: (draftId: Id<"tripAgentDrafts">) => void;
	onDismiss: (draftId: Id<"tripAgentDrafts">) => void;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				borderTopColor: palette.separator,
				borderTopWidth: 1,
				gap: 8,
				paddingTop: 12,
			}}
		>
			<View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}>
				<View
					style={{
						alignItems: "center",
						backgroundColor: palette.fill,
						borderRadius: radius.pill,
						height: 32,
						justifyContent: "center",
						width: 32,
					}}
				>
					<Ionicons color={palette.accent} name="sparkles-outline" size={15} />
				</View>
				<View style={{ flex: 1, gap: 2, minWidth: 0 }}>
					<AppText tone="secondary" variant="eyebrow">
						{tripAgentModuleLabels[draft.module]} draft
					</AppText>
					<AppText bold numberOfLines={1} variant="subhead">
						{draft.title}
					</AppText>
					<AppText numberOfLines={2} tone="secondary" variant="footnote">
						{draft.rationale}
					</AppText>
				</View>
			</View>
			<View style={{ flexDirection: "row", gap: 8 }}>
				<View style={{ flex: 1, minWidth: 0 }}>
					<PrimaryButton
						disabled={isPending}
						isPending={isPending}
						label="Apply"
						onPress={() => onApply(draft._id)}
					/>
				</View>
				<View style={{ flex: 1, minWidth: 0 }}>
					<SecondaryButton
						disabled={isPending}
						label="Dismiss"
						onPress={() => onDismiss(draft._id)}
					/>
				</View>
			</View>
		</View>
	);
}

function WorkspaceAutopilotCard({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const { palette } = useUITheme();
	const { workspace } = model;
	const generateTripAgentDraft = useAction(
		api.ai.tripAgent.generateTripAgentDraft
	);
	const applyTripAgentDraft = useMutation(api.ai.tripAgent.applyTripAgentDraft);
	const dismissTripAgentDraft = useMutation(
		api.ai.tripAgent.dismissTripAgentDraft
	);
	const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
	const [pendingDraftId, setPendingDraftId] =
		useState<Id<"tripAgentDrafts"> | null>(null);
	const [agentMessage, setAgentMessage] = useState<string | null>(null);
	const [agentErrorMessage, setAgentErrorMessage] = useState<string | null>(
		null
	);
	const readinessDisplay = getReadinessDisplay({
		itemCount: workspace.readinessItems.length,
		score: model.readiness.score,
	});
	const pendingDrafts = workspace.agentDrafts;
	const pendingDraftModules = new Set(
		pendingDrafts.map((draft) => draft.module)
	);
	const missingDraftModules = workspaceAutopilotDraftModules.filter(
		(config) => !pendingDraftModules.has(config.module)
	);
	const completedStageCount = [
		workspace.itineraryItems.length > 0,
		workspace.vaultItems.length + workspace.documents.length > 0,
		workspace.bookings.length > 0,
		workspace.trip.budgetAmount !== undefined || workspace.expenses.length > 0,
		model.readiness.score >= 80,
	].filter(Boolean).length;
	const isWorkspaceReady =
		completedStageCount === 5 && model.readiness.score >= 100;
	const visibleDrafts = isWorkspaceReady ? [] : pendingDrafts;
	const autopilotTitle = isWorkspaceReady
		? "Trip is ready"
		: "Complete this trip";
	const autopilotDescription = isWorkspaceReady
		? "This workspace has itinerary, Vault, bookings, budget, risks, and readiness connected for travel."
		: "Turn this workspace into a complete trip plan: itinerary, Vault, bookings, budget, risks, and readiness.";
	const primaryActionLabel = isWorkspaceReady
		? "Ask Viya"
		: "Complete this trip";
	const openTripChat = () => {
		router.push({
			params: {
				mode: "trip",
				newThread: "1",
				prompt: buildWorkspaceAutopilotPrompt(model),
				returnTo: `/(app)/trips/${model.tripId}`,
				tripId: String(model.tripId),
				workspaceTab: "overview",
			},
			pathname: VIYA_ROUTES.ai,
		});
	};
	const handleGenerateDrafts = async () => {
		setAgentErrorMessage(null);
		setAgentMessage(null);

		if (isWorkspaceReady) {
			openTripChat();
			return;
		}

		if (missingDraftModules.length === 0) {
			setAgentMessage("Viya already staged drafts for the core modules.");
			return;
		}

		setIsGeneratingDrafts(true);

		try {
			const prompt = buildWorkspaceAutopilotPrompt(model);

			await Promise.all(
				missingDraftModules.map((config) =>
					generateTripAgentDraft({
						action: config.action,
						module: config.module,
						prompt,
						tripId: model.tripId,
						useFallback: true,
					})
				)
			);
			haptic("success");
			setAgentMessage("Viya staged reviewable drafts for this workspace.");
		} catch (error) {
			setAgentErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not stage workspace drafts."
			);
		} finally {
			setIsGeneratingDrafts(false);
		}
	};
	const handleApplyDraft = async (draftId: Id<"tripAgentDrafts">) => {
		setAgentErrorMessage(null);
		setPendingDraftId(draftId);

		try {
			await applyTripAgentDraft({ draftId });
			haptic("success");
			setAgentMessage("Draft applied to the trip workspace.");
		} catch (error) {
			setAgentErrorMessage(
				error instanceof Error ? error.message : "Viya could not apply draft."
			);
		} finally {
			setPendingDraftId(null);
		}
	};
	const handleDismissDraft = async (draftId: Id<"tripAgentDrafts">) => {
		setAgentErrorMessage(null);
		setPendingDraftId(draftId);

		try {
			await dismissTripAgentDraft({ draftId });
			setAgentMessage("Draft dismissed.");
		} catch (error) {
			setAgentErrorMessage(
				error instanceof Error ? error.message : "Viya could not dismiss draft."
			);
		} finally {
			setPendingDraftId(null);
		}
	};

	return (
		<Animated.View entering={FadeInDown.duration(220)}>
			<Card style={{ gap: 16 }}>
				<View
					style={{ alignItems: "flex-start", flexDirection: "row", gap: 12 }}
				>
					<View
						style={{
							alignItems: "center",
							backgroundColor: palette.fill,
							borderRadius: radius.group,
							height: 44,
							justifyContent: "center",
							width: 44,
						}}
					>
						<Ionicons
							color={palette.accent}
							name="sparkles-outline"
							size={20}
						/>
					</View>
					<View style={{ flex: 1, gap: 4, minWidth: 0 }}>
						<AppText tone="secondary" variant="eyebrow">
							Viya autopilot
						</AppText>
						<AppText bold variant="callout">
							{autopilotTitle}
						</AppText>
						<AppText tone="secondary" variant="subhead">
							{autopilotDescription}
						</AppText>
					</View>
				</View>
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					<View
						style={{
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							paddingHorizontal: 12,
							paddingVertical: 6,
						}}
					>
						<AppText bold tone="secondary" variant="footnote">
							{completedStageCount}/5 stages
						</AppText>
					</View>
					<View
						style={{
							backgroundColor: palette.fill,
							borderRadius: radius.pill,
							paddingHorizontal: 12,
							paddingVertical: 6,
						}}
					>
						<AppText bold tone="secondary" variant="footnote">
							{readinessDisplay.value} readiness
						</AppText>
					</View>
				</View>
				{agentMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						tone="secondary"
						variant="footnote"
					>
						{agentMessage}
					</AppText>
				) : null}
				{agentErrorMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						tone="danger"
						variant="footnote"
					>
						{agentErrorMessage}
					</AppText>
				) : null}
				{visibleDrafts.length > 0 ? (
					<View style={{ gap: 12 }}>
						<AppText tone="secondary" variant="eyebrow">
							Reviewable changes
						</AppText>
						{visibleDrafts.map((draft) => (
							<TripAgentDraftRow
								draft={draft}
								isPending={pendingDraftId === draft._id}
								key={draft._id}
								onApply={handleApplyDraft}
								onDismiss={handleDismissDraft}
							/>
						))}
					</View>
				) : null}
				<View style={{ gap: 8 }}>
					<PrimaryButton
						accessibilityLabel={
							isWorkspaceReady
								? "Ask Viya about this ready trip"
								: "Complete this trip with Viya"
						}
						disabled={isGeneratingDrafts}
						icon="sparkles-outline"
						isPending={isGeneratingDrafts}
						label={primaryActionLabel}
						onPress={handleGenerateDrafts}
					/>
					{isWorkspaceReady ? null : (
						<SecondaryButton
							accessibilityLabel="Ask Viya about this trip"
							disabled={isGeneratingDrafts}
							icon="chatbubble-outline"
							label="Ask Viya"
							onPress={openTripChat}
						/>
					)}
				</View>
			</Card>
		</Animated.View>
	);
}

export function MainModules({ model }: { model: TripDashboardModel }) {
	const { palette } = useUITheme();
	const [activeWorkspaceGroup, setActiveWorkspaceGroup] =
		useState<WorkspaceModuleGroupKey>("core");
	const workspaceModuleGroups = getTripWorkspaceModuleGroups(model);
	const shouldShowWorkspacePicker = workspaceModuleGroups.length > 1;

	return (
		<View style={{ gap: 28 }}>
			<WorkspaceAutopilotCard model={model} />
			<View style={{ gap: 12 }}>
				<View style={{ paddingHorizontal: 4 }}>
					<AppText accessibilityRole="header" bold variant="headline">
						Workspace
					</AppText>
				</View>
				<View style={{ gap: 12 }}>
					{shouldShowWorkspacePicker ? (
						<View
							style={{
								alignItems: "center",
								backgroundColor: palette.fill,
								borderRadius: radius.pill,
								flexDirection: "row",
								padding: 4,
								width: "100%",
							}}
						>
							{workspaceModuleGroups.map((group) => {
								const isSelected = group.value === activeWorkspaceGroup;

								return (
									<PressableScale
										accessibilityLabel={`Show ${group.label} modules`}
										accessibilityRole="tab"
										accessibilityState={{ selected: isSelected }}
										haptic="selection"
										key={group.value}
										onPress={() => setActiveWorkspaceGroup(group.value)}
										style={{
											alignItems: "center",
											backgroundColor: isSelected
												? palette.selection
												: "transparent",
											borderRadius: radius.pill,
											flex: 1,
											height: 36,
											justifyContent: "center",
											minWidth: 0,
										}}
									>
										<AppText
											bold={isSelected}
											tone={isSelected ? "ink" : "secondary"}
											variant="subhead"
										>
											{group.label}
										</AppText>
									</PressableScale>
								);
							})}
						</View>
					) : null}
					{workspaceModuleGroups.map((group) =>
						group.value === activeWorkspaceGroup ? (
							<View
								key={group.value}
								style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
							>
								{group.items.map((item) => (
									<WorkspaceModuleTile item={item} key={item.label} />
								))}
							</View>
						) : null
					)}
				</View>
			</View>
		</View>
	);
}

function QuickActionButton({
	action,
	onSelectTab,
}: {
	action: DashboardAction;
	onSelectTab: (tab: TripTab) => void;
}) {
	const { palette } = useUITheme();
	const button = (
		<PressableScale
			accessibilityLabel={action.label}
			accessibilityRole="button"
			hitSlop={{ bottom: 5, top: 5 }}
			onPress={
				action.tab ? () => onSelectTab(action.tab as TripTab) : undefined
			}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				backgroundColor: palette.surface,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 6,
				height: 34,
				minWidth: 112,
				paddingHorizontal: 14,
			}}
		>
			<Ionicons color={palette.accent} name={action.icon} size={16} />
			<AppText bold variant="subhead">
				{action.label}
			</AppText>
		</PressableScale>
	);

	if (!action.href) {
		return button;
	}

	return (
		<Link asChild href={action.href}>
			{button}
		</Link>
	);
}

export function QuickActions({
	actions,
	onSelectTab,
}: {
	actions: DashboardAction[];
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<View style={{ gap: 8 }}>
			<AppText
				style={{ paddingHorizontal: 4 }}
				tone="secondary"
				variant="eyebrow"
			>
				Quick actions
			</AppText>
			<ScrollView
				contentContainerStyle={{ gap: 8, paddingRight: 8 }}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{actions.map((action) => (
					<QuickActionButton
						action={action}
						key={action.label}
						onSelectTab={onSelectTab}
					/>
				))}
			</ScrollView>
		</View>
	);
}

function TabButton({
	count,
	isActive,
	onPress,
	tab,
}: {
	count?: number;
	isActive: boolean;
	onPress: () => void;
	tab: DashboardTab;
}) {
	const { palette } = useUITheme();
	const foreground = isActive ? palette.onPrimary : palette.ink;

	return (
		<PressableScale
			accessibilityLabel={tab.label}
			accessibilityRole="tab"
			accessibilityState={{ selected: isActive }}
			haptic="selection"
			onPress={onPress}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				backgroundColor: isActive ? palette.ink : palette.surface,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 8,
				height: 44,
				paddingHorizontal: 16,
			}}
		>
			<Ionicons
				color={isActive ? palette.onPrimary : palette.accent}
				name={tab.icon}
				size={16}
			/>
			<AppText bold style={{ color: foreground }} variant="subhead">
				{tab.label}
			</AppText>
			{count ? (
				<AppText
					style={{ color: isActive ? palette.onPrimary : palette.inkSecondary }}
					variant="footnote"
				>
					{count}
				</AppText>
			) : null}
		</PressableScale>
	);
}

export function TripTabPicker({
	activeTab,
	model,
	onSelectTab,
}: {
	activeTab: TripTab;
	model: TripDashboardModel;
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<View style={{ gap: 8 }}>
			<AppText
				style={{ paddingHorizontal: 4 }}
				tone="secondary"
				variant="eyebrow"
			>
				Focus
			</AppText>
			<ScrollView
				contentContainerStyle={{ gap: 8, paddingRight: 8 }}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{model.tabs.map((tab) => (
					<TabButton
						count={model.tabCounts[tab.id]}
						isActive={tab.id === activeTab}
						key={tab.id}
						onPress={() => onSelectTab(tab.id)}
						tab={tab}
					/>
				))}
			</ScrollView>
		</View>
	);
}

export function InfoRow({
	detail,
	icon,
	label,
	right,
}: {
	detail?: string;
	icon?: IoniconName;
	label: string;
	right?: string;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				flexDirection: "row",
				gap: 12,
				paddingVertical: 8,
			}}
		>
			{icon ? <Ionicons color={palette.accent} name={icon} size={18} /> : null}
			<View style={{ flex: 1, minWidth: 0 }}>
				<AppText bold numberOfLines={1} variant="subhead">
					{label}
				</AppText>
				{detail ? (
					<AppText numberOfLines={1} tone="secondary" variant="footnote">
						{detail}
					</AppText>
				) : null}
			</View>
			{right ? (
				<AppText numberOfLines={1} tone="secondary" variant="footnote">
					{right}
				</AppText>
			) : null}
		</View>
	);
}
