import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { type Href, Link, useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Menu,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
	useThemeColor,
} from "heroui-native";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
	ImageBackground,
	Pressable,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import { TripMetricBlock } from "@/src/features/trips/trip-card-primitives";
import { isDecorativeDestinationImageUrl } from "@/src/features/trips/trip-cover-image";
import { getTripModulesSheetListMaxHeight } from "./trip-dashboard-layout";
import type {
	DashboardAction,
	DashboardTab,
	IoniconName,
	TripDashboardModel,
	TripTab,
} from "./trip-dashboard-types";
import { formatMoney, getReadinessDisplay } from "./trip-dashboard-utils";

const accentColor = "#0A84FF";
const mutedColor = "#71717A";
const foregroundColor = "#18181B";
const borderColor = "rgba(24, 24, 27, 0.08)";
const softBackgroundColor = "rgba(24, 24, 27, 0.04)";
export const tripFloatingBarBottomInset = 24;
export const tripFloatingBarGap = 6;
const viyaButtonNavigationThrottleMs = 800;

const destinationParentheticalPattern = /\s*\([^)]*\)/g;

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
	color: accentColor,
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
	summary: string;
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
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<Input
				className="h-12 border border-border bg-surface px-4"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
	);
}

function SheetTextArea({
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
		<TextField className="gap-2">
			<Label>
				<Label.Text>{label}</Label.Text>
			</Label>
			<TextArea
				className="min-h-20 rounded-[18px] border border-border bg-surface px-4 py-3"
				onBlur={onBlur}
				onChangeText={onChangeText}
				onFocus={onFocus}
				placeholder={placeholder}
				value={value}
				variant="secondary"
			/>
		</TextField>
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
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Edit trip profile</BottomSheet.Title>
								<BottomSheet.Description>
									Update the core trip details used across every module.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close trip profile form"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<ScrollView
							contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: 560 }}
						>
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
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Start date"
										onChangeText={(value) => onUpdateForm("startDate", value)}
										placeholder="2026-07-10"
										value={form.startDate}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="End date"
										onChangeText={(value) => onUpdateForm("endDate", value)}
										placeholder="2026-07-14"
										value={form.endDate}
									/>
								</View>
							</View>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Budget"
										onChangeText={(value) =>
											onUpdateForm("budgetAmount", value)
										}
										placeholder="25000"
										value={form.budgetAmount}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Travelers"
										onChangeText={(value) => onUpdateForm("groupType", value)}
										placeholder="couple"
										value={form.groupType}
									/>
								</View>
							</View>
							<View className="flex-row gap-3">
								<View className="min-w-0 flex-1">
									<SheetField
										label="Style"
										onChangeText={(value) => onUpdateForm("travelStyle", value)}
										placeholder="balanced"
										value={form.travelStyle}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<SheetField
										label="Pace"
										onChangeText={(value) => onUpdateForm("pace", value)}
										placeholder="moderate"
										value={form.pace}
									/>
								</View>
							</View>
							<SheetTextArea
								label="Notes"
								onChangeText={(value) => onUpdateForm("summary", value)}
								placeholder="Constraints, preferences, booking notes, or reminders"
								value={form.summary}
							/>
						</ScrollView>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<Button isDisabled={isSaving} onPress={onSubmit} size="lg">
							{isSaving ? <Spinner size="sm" /> : null}
							<Button.Label>Save profile</Button.Label>
						</Button>
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

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={!isDeleting}
					snapPoints={["38%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Delete trip?</BottomSheet.Title>
								<BottomSheet.Description>
									This permanently removes the trip and its saved planning
									details.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close delete trip confirmation"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						{errorMessage ? (
							<Text className="text-danger" type="body-sm">
								{errorMessage}
							</Text>
						) : null}
						<View className="flex-row gap-2">
							<Button
								className="flex-1"
								isDisabled={isDeleting}
								onPress={() => onOpenChange(false)}
								size="lg"
								variant="secondary"
							>
								<Button.Label>Cancel</Button.Label>
							</Button>
							<Button
								className="flex-1"
								isDisabled={isDeleting}
								onPress={onConfirm}
								size="lg"
								variant="tertiary"
							>
								{isDeleting ? <Spinner size="sm" /> : null}
								<Button.Label>Delete</Button.Label>
							</Button>
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
	const iconColor = variant === "primary" ? "#FFFFFF" : accentColor;

	return (
		<Link asChild href={href}>
			<Button size="sm" variant={variant}>
				{icon ? <Ionicons color={iconColor} name={icon} size={16} /> : null}
				<Button.Label>{children}</Button.Label>
			</Button>
		</Link>
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
	return (
		<View className="gap-3 border-border border-t py-4">
			<View className="flex-row items-center gap-2">
				{icon ? <Ionicons color={accentColor} name={icon} size={18} /> : null}
				<Text.Heading type="h5" weight="semibold">
					{title}
				</Text.Heading>
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
	return (
		<View className="items-center gap-2 rounded-[20px] border border-border border-dashed p-5">
			<Ionicons color="#8E8E93" name={icon} size={20} />
			<Text align="center" color="muted" type="body-sm">
				{children}
			</Text>
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
		summary: model.workspace.trip.summary,
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
			summary: model.workspace.trip.summary,
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
				pace: profileForm.pace.trim() || "moderate",
				startDate: profileForm.startDate.trim(),
				summary: profileForm.summary.trim(),
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
			setIsDeleteSheetOpen(false);
			router.replace(VIYA_ROUTES.trips as Href);
		} catch {
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
			<View className="items-end gap-1">
				<Menu>
					<Menu.Trigger asChild={true}>
						<Pressable
							accessibilityLabel="Open trip options"
							accessibilityRole="button"
							className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
							style={({ pressed }) => ({
								transform: [{ scale: pressed ? 0.99 : 1 }],
							})}
						>
							<Ionicons
								color={foregroundColor}
								name="ellipsis-horizontal"
								size={22}
							/>
						</Pressable>
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Overlay />
						<Menu.Content
							align="end"
							className="rounded-[28px] border border-border bg-surface p-2"
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
										color={accentColor}
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
										color="#FF9F0A"
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
										color={mutedColor}
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
									<Ionicons color="#FF3B30" name="trash-outline" size={18} />
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
					<Text className="max-w-44 text-danger" type="body-xs">
						{actionErrorMessage}
					</Text>
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
	const { trip } = model.workspace;

	return (
		<View
			className="bg-background px-4 pb-3"
			style={{ paddingTop: insets.top + 10, zIndex: 30 }}
		>
			<View className="min-h-11 flex-row items-center gap-3">
				<View className="min-w-0 flex-1 flex-row items-center gap-3">
					<NavigationBackButton onPress={() => router.back()} />
					<View className="min-w-0 flex-1">
						<Text numberOfLines={1} type="body-sm" weight="bold">
							{trip.title}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{trip.destination} · {model.tripWindow}
						</Text>
					</View>
				</View>
				<View className="w-12 items-end">
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
		<Surface className="h-14 w-14 items-center justify-center rounded-full border border-border bg-surface">
			<Pressable
				accessibilityLabel="Open Viya for this trip"
				accessibilityRole="button"
				className="h-12 w-12 items-center justify-center rounded-full"
				onPress={handlePress}
				style={({ pressed }) => ({
					transform: [{ scale: pressed ? 0.99 : 1 }],
				})}
			>
				<View className="h-12 w-12 items-center justify-center rounded-full">
					<Ionicons color={accentColor} name="chatbubble-outline" size={22} />
				</View>
			</Pressable>
		</Surface>
	);
}

function TripMetaChip({ icon, label }: { icon: IoniconName; label: string }) {
	return (
		<View className="max-w-full flex-row items-center gap-1.5">
			<Ionicons color={mutedColor} name={icon} size={13} />
			<Text
				className="shrink"
				numberOfLines={1}
				type="body-xs"
				weight="semibold"
			>
				{label}
			</Text>
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
	const destinationInitial = (
		destination.trim().charAt(0) || "V"
	).toUpperCase();

	if (coverImageUrl) {
		return (
			<View className="h-24 w-24 overflow-hidden rounded-[22px] bg-surface-secondary">
				<ImageBackground
					accessibilityIgnoresInvertColors={true}
					className="h-full w-full"
					imageStyle={{ borderRadius: 22 }}
					source={{ uri: coverImageUrl }}
				/>
				<View
					className="absolute inset-0 rounded-[22px]"
					pointerEvents="none"
					style={{
						borderColor: "rgba(0, 0, 0, 0.06)",
						borderWidth: 1,
					}}
				/>
			</View>
		);
	}

	return (
		<View className="h-24 w-24 items-center justify-center rounded-[22px] bg-accent-soft">
			<Text type="body-lg" weight="bold">
				{destinationInitial}
			</Text>
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
		<View className="gap-5 px-1 py-2">
			<View className="flex-row items-center gap-4">
				<TripHeroCover
					coverImageUrl={coverImageUrl}
					destination={workspace.trip.destination}
				/>
				<View className="min-w-0 flex-1 gap-2.5">
					<View className="flex-row items-start gap-2">
						<View className="min-w-0 flex-1">
							<Text.Heading numberOfLines={2} type="h2" weight="semibold">
								{workspace.trip.title}
							</Text.Heading>
						</View>
					</View>
					<View className="gap-1.5">
						<View className="flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
							<TripMetaChip icon="location-outline" label={destinationLabel} />
							<TripMetaChip icon="people-outline" label={travelerLabel} />
						</View>
						<TripMetaChip icon="calendar-clear-outline" label={tripWindow} />
					</View>
				</View>
			</View>
			<View className="flex-row items-stretch gap-4 border-border border-t pt-4">
				<Link asChild href={VIYA_ROUTES.tripReadiness(model.tripId)}>
					<Pressable
						accessibilityLabel="View readiness details"
						accessibilityRole="button"
						className="min-w-0 flex-1"
					>
						<TripMetricBlock
							detail={readinessDisplay.detail}
							label="READINESS"
							progress={readinessDisplay.progress}
							tone="success"
							value={readinessDisplay.value}
						/>
					</Pressable>
				</Link>
				<View className="w-px self-stretch bg-border" />
				<Link asChild href={VIYA_ROUTES.tripBudget(model.tripId)}>
					<Pressable
						accessibilityLabel="Open trip budget"
						accessibilityRole="button"
						className="min-w-0 flex-1"
					>
						<TripMetricBlock
							align="flex-end"
							detail={model.budget.status}
							label="BUDGET"
							progress={budgetProgress}
							value={budgetSummary}
						/>
					</Pressable>
				</Link>
			</View>
		</View>
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
	const vaultDetail =
		bookingCount > 0 || documentCount > 0
			? `${formatCountLabel(bookingCount, "booking")} · ${formatCountLabel(
					documentCount,
					"file"
				)}`
			: "No files";
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
			value: vaultDetail,
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
	if (isActive) {
		return (
			<View
				className="min-w-6 flex-row items-center gap-1 rounded-full px-2 py-1"
				style={{
					backgroundColor: "#FFFFFF",
					borderColor: accent.color,
					borderWidth: 1,
				}}
			>
				<Ionicons
					color={accent.color}
					name="checkmark-circle-outline"
					size={12}
				/>
				<Text style={{ color: accent.color }} type="body-xs" weight="semibold">
					Current
				</Text>
			</View>
		);
	}

	return (
		<View
			className="min-w-0 max-w-28 shrink items-center rounded-full px-2 py-1"
			style={{ backgroundColor: accent.bg }}
		>
			<Text
				numberOfLines={1}
				style={{ color: accent.color }}
				type="body-xs"
				weight="semibold"
			>
				{value}
			</Text>
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
	const accent = getModuleAccent(item.label);

	return (
		<Pressable
			accessibilityLabel={`${isActive ? "Current module" : "Open"} ${item.label}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isActive }}
			className={
				item.span === "full"
					? "min-h-24 basis-full rounded-[24px]"
					: "min-h-24 flex-1 basis-[47%] rounded-[24px]"
			}
			onPress={onPress}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.985 : 1 }],
			})}
		>
			<Surface
				className="flex-1 justify-between gap-2.5 rounded-[24px] bg-surface p-3.5"
				style={{
					backgroundColor: isActive ? accent.bg : undefined,
					borderColor: isActive ? accent.color : borderColor,
					borderWidth: 1,
				}}
			>
				<View className="flex-row items-center justify-between gap-2">
					<View
						className="h-9 w-9 items-center justify-center rounded-2xl"
						style={{ backgroundColor: accent.bg }}
					>
						<Ionicons color={accent.color} name={item.icon} size={18} />
					</View>
					<ModuleLauncherBadge
						accent={accent}
						isActive={isActive}
						value={item.value}
					/>
				</View>
				<View className="gap-0.5">
					<Text numberOfLines={1} type="body" weight="bold">
						{item.label}
					</Text>
					<Text color="muted" numberOfLines={2} type="body-xs">
						{item.detail}
					</Text>
				</View>
			</Surface>
		</Pressable>
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
	const foreground = useThemeColor("foreground");
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
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["78%"]}
				>
					<View
						className="gap-5 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="min-w-0 flex-1 gap-1">
								<BottomSheet.Title>Workspace</BottomSheet.Title>
								<BottomSheet.Description numberOfLines={2}>
									Jump between sections for {model.workspace.trip.title}.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close workspace"
								className="h-10 w-10 rounded-full bg-surface"
								iconProps={{ color: foreground, size: 22 }}
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 18, paddingBottom: 6 }}
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: moduleListMaxHeight }}
						>
							{moduleGroups.map((group) => (
								<View className="gap-3" key={group.value}>
									<Text
										className="px-1"
										color="muted"
										type="body-xs"
										weight="semibold"
									>
										{group.label.toUpperCase()}
									</Text>
									<View className="flex-row flex-wrap gap-3">
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
	const [isModulesOpen, setIsModulesOpen] = useState(false);
	const activeScreen = tripScreenMeta[activeTab];
	const activeAccent = getModuleAccent(activeScreen.label);

	return (
		<>
			<Surface className="h-14 w-44 justify-center rounded-full border border-border bg-surface px-2 py-2">
				<Pressable
					accessibilityLabel={`Open workspace from ${activeScreen.label}`}
					accessibilityRole="button"
					className="h-10 flex-row items-center gap-3 rounded-full px-2"
					onPress={() => setIsModulesOpen(true)}
					style={({ pressed }) => ({
						transform: [{ scale: pressed ? 0.99 : 1 }],
					})}
				>
					<View
						className="h-10 w-10 items-center justify-center rounded-full"
						style={{ backgroundColor: activeAccent.bg }}
					>
						<Ionicons
							color={activeAccent.color}
							name={activeScreen.icon}
							size={18}
						/>
					</View>
					<View className="min-w-0 flex-1">
						<Text
							adjustsFontSizeToFit={true}
							numberOfLines={1}
							type="body-sm"
							weight="bold"
						>
							{activeScreen.label}
						</Text>
					</View>
					<Ionicons color={mutedColor} name="chevron-up" size={14} />
				</Pressable>
			</Surface>
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
			className="absolute right-0 left-0 flex-row items-center justify-center px-4"
			pointerEvents="box-none"
			style={{
				bottom: Math.max(insets.bottom + 10, tripFloatingBarBottomInset),
				gap: tripFloatingBarGap,
				zIndex: 30,
			}}
		>
			<TripModuleMenuButton activeTab={activeTab} model={model} />
			<TripFloatingViyaButton activeTab={activeTab} tripId={model.tripId} />
		</View>
	);
}

function WorkspaceModuleTile({ item }: { item: TripWorkspaceModule }) {
	const accent = getModuleAccent(item.label);

	return (
		<Link asChild href={item.href}>
			<Pressable
				accessibilityLabel={`Open ${item.label}`}
				accessibilityRole="button"
				className="min-h-24 flex-1 basis-[47%] rounded-[24px]"
				style={({ pressed }) => ({
					transform: [{ scale: pressed ? 0.985 : 1 }],
				})}
			>
				<Surface
					className="flex-1 justify-between gap-2.5 rounded-[24px] bg-surface p-3.5"
					style={{ borderColor, borderWidth: 1 }}
				>
					<View className="min-w-0 flex-row items-center justify-between gap-2">
						<View
							className="h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
							style={{ backgroundColor: accent.bg }}
						>
							<Ionicons color={accent.color} name={item.icon} size={18} />
						</View>
						<View
							className="min-w-0 max-w-28 shrink rounded-full px-2.5 py-1"
							style={{ backgroundColor: accent.bg }}
						>
							<Text
								numberOfLines={1}
								style={{ color: accent.color }}
								type="body-xs"
								weight="semibold"
							>
								{item.value}
							</Text>
						</View>
					</View>
					<View className="gap-0.5">
						<Text numberOfLines={1} type="body" weight="bold">
							{item.label}
						</Text>
						<Text color="muted" numberOfLines={2} type="body-xs">
							{item.detail}
						</Text>
					</View>
				</Surface>
			</Pressable>
		</Link>
	);
}

export function MainModules({ model }: { model: TripDashboardModel }) {
	const [activeWorkspaceGroup, setActiveWorkspaceGroup] =
		useState<WorkspaceModuleGroupKey>("core");
	const workspaceModuleGroups = getTripWorkspaceModuleGroups(model);
	const shouldShowWorkspacePicker = workspaceModuleGroups.length > 1;

	return (
		<View className="gap-7">
			<View className="gap-3">
				<View className="gap-1 px-1">
					<Text.Heading type="h5" weight="bold">
						Workspace
					</Text.Heading>
				</View>
				<View className="gap-3">
					{shouldShowWorkspacePicker ? (
						<View className="w-full flex-row items-center rounded-full bg-surface p-1">
							{workspaceModuleGroups.map((group) => {
								const isSelected = group.value === activeWorkspaceGroup;

								return (
									<Pressable
										accessibilityLabel={`Show ${group.label} modules`}
										accessibilityRole="tab"
										accessibilityState={{ selected: isSelected }}
										className={
											isSelected
												? "h-8 min-w-0 flex-1 items-center justify-center rounded-full"
												: "h-8 min-w-0 flex-1 items-center justify-center"
										}
										key={group.value}
										onPress={() => setActiveWorkspaceGroup(group.value)}
										style={{
											backgroundColor: isSelected ? accentColor : "transparent",
										}}
									>
										<Text
											style={{ color: isSelected ? "#FFFFFF" : mutedColor }}
											type="body-sm"
											weight={isSelected ? "semibold" : "medium"}
										>
											{group.label}
										</Text>
									</Pressable>
								);
							})}
						</View>
					) : null}
					{workspaceModuleGroups.map((group) =>
						group.value === activeWorkspaceGroup ? (
							<View className="flex-row flex-wrap gap-3" key={group.value}>
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
	const button = (
		<Button
			className="min-w-28"
			onPress={
				action.tab ? () => onSelectTab(action.tab as TripTab) : undefined
			}
			size="sm"
			variant="secondary"
		>
			<Ionicons color={accentColor} name={action.icon} size={16} />
			<Button.Label>{action.label}</Button.Label>
		</Button>
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
		<View className="gap-2">
			<Text className="px-1" color="muted" type="body-xs" weight="semibold">
				QUICK ACTIONS
			</Text>
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
	return (
		<Pressable
			accessibilityRole="tab"
			accessibilityState={{ selected: isActive }}
			className="h-11 flex-row items-center gap-2 rounded-full border px-4"
			onPress={onPress}
			style={{
				backgroundColor: isActive ? accentColor : softBackgroundColor,
				borderColor: isActive ? accentColor : borderColor,
			}}
		>
			<Ionicons
				color={isActive ? "#FFFFFF" : accentColor}
				name={tab.icon}
				size={16}
			/>
			<Text
				style={{ color: isActive ? "#FFFFFF" : foregroundColor }}
				type="body-sm"
				weight="semibold"
			>
				{tab.label}
			</Text>
			{count ? (
				<Text
					color={isActive ? undefined : "muted"}
					style={isActive ? { color: "#FFFFFF" } : undefined}
					type="body-xs"
				>
					{count}
				</Text>
			) : null}
		</Pressable>
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
		<View className="gap-2">
			<Text className="px-1" color="muted" type="body-xs" weight="semibold">
				FOCUS
			</Text>
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
	return (
		<View className="flex-row items-center gap-3 border-border border-t py-3">
			{icon ? <Ionicons color={accentColor} name={icon} size={18} /> : null}
			<View className="min-w-0 flex-1">
				<Text numberOfLines={1} type="body-sm" weight="semibold">
					{label}
				</Text>
				{detail ? (
					<Text color="muted" numberOfLines={1} type="body-xs">
						{detail}
					</Text>
				) : null}
			</View>
			{right ? (
				<Text color="muted" numberOfLines={1} type="body-xs">
					{right}
				</Text>
			) : null}
		</View>
	);
}
