import { Feather, Ionicons } from "@expo/vector-icons";
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
import { useState } from "react";
import {
	Alert,
	Pressable,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";

import { NavigationBackButton } from "@/src/components/navigation/navigation-back-button";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { TripMetricBlock } from "@/src/features/trips/trip-card-primitives";
import { TripStatusPill } from "@/src/features/trips/trip-status-pill";
import { getTripModulesSheetListMaxHeight } from "./trip-dashboard-layout";
import type {
	DashboardAction,
	DashboardMetric,
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

const tripScreenMeta: Record<TripTab, { icon: IoniconName; label: string }> = {
	bookings: { icon: "briefcase-outline", label: "Bookings" },
	budget: { icon: "wallet-outline", label: "Budget" },
	checklist: { icon: "checkbox-outline", label: "Checklist" },
	documents: { icon: "folder-open-outline", label: "Documents" },
	itinerary: { icon: "calendar-outline", label: "Itinerary" },
	memories: { icon: "images-outline", label: "Memories" },
	overview: { icon: "speedometer-outline", label: "Overview" },
	places: { icon: "map-outline", label: "Places" },
	recap: { icon: "share-social-outline", label: "Recap" },
	travel: { icon: "navigate-outline", label: "Travel Mode" },
	viya: { icon: "sparkles-outline", label: "Viya" },
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
	Itinerary: { bg: "rgba(10, 132, 255, 0.1)", color: "#0A84FF" },
	Memories: { bg: "rgba(191, 90, 242, 0.12)", color: "#BF5AF2" },
	Notes: { bg: "rgba(255, 159, 10, 0.12)", color: "#FF9F0A" },
	Places: { bg: "rgba(52, 199, 89, 0.12)", color: "#34C759" },
	Recap: { bg: "rgba(10, 132, 255, 0.1)", color: "#0A84FF" },
	"Travel Mode": { bg: "rgba(0, 122, 255, 0.1)", color: "#007AFF" },
	Watchouts: { bg: "rgba(255, 59, 48, 0.1)", color: "#FF3B30" },
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

interface ParsedDraftChange {
	detail: string;
	title: string;
	type: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const readDraftString = (value: unknown, fallback: string) =>
	typeof value === "string" && value.trim() ? value.trim() : fallback;

const getDraftChanges = (payloadJson: string): ParsedDraftChange[] => {
	try {
		const payload: unknown = JSON.parse(payloadJson);

		if (!(isRecord(payload) && Array.isArray(payload.changes))) {
			return [];
		}

		return payload.changes
			.filter(isRecord)
			.slice(0, 4)
			.map((change) => ({
				detail: readDraftString(change.detail, "Review before applying."),
				title: readDraftString(change.title, "Draft change"),
				type: readDraftString(change.type, "change"),
			}));
	} catch {
		return [];
	}
};

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
	form,
	isOpen,
	isSaving,
	onOpenChange,
	onSubmit,
	onUpdateForm,
}: {
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
								placeholder="What should Viya remember?"
								value={form.summary}
							/>
						</ScrollView>
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
	children,
	icon = "ellipse-outline",
}: {
	children: string;
	icon?: IoniconName;
}) {
	return (
		<View className="items-center gap-2 rounded-[20px] border border-border border-dashed p-5">
			<Ionicons color="#8E8E93" name={icon} size={20} />
			<Text align="center" color="muted" type="body-sm">
				{children}
			</Text>
		</View>
	);
}

const getMetricToneClassName = (tone: DashboardMetric["tone"]) => {
	if (tone === "attention") {
		return "border-warning/30 bg-warning/10";
	}

	if (tone === "good") {
		return "border-success/30 bg-success/10";
	}

	return "border-border bg-surface-secondary";
};

function MetricPill({ metric }: { metric: DashboardMetric }) {
	const toneClassName = getMetricToneClassName(metric.tone);

	return (
		<View className={`min-w-[30%] flex-1 gap-1 border-t p-3 ${toneClassName}`}>
			<Text color="muted" numberOfLines={1} type="body-xs" weight="semibold">
				{metric.label}
			</Text>
			<Text numberOfLines={1} type="body" weight="bold">
				{metric.value}
			</Text>
		</View>
	);
}

function TripHeaderActionGroup({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
	const toggleTripFavorite = useMutation(api.trips.toggleTripFavorite);
	const archiveTrip = useMutation(api.trips.archiveTrip);
	const deleteTrip = useMutation(api.trips.deleteTrip);
	const isFavorite = model.workspace.trip.isFavorite ?? false;
	const isArchived = model.workspace.trip.status === "archived";
	const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
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
		setProfileForm((currentForm) => ({ ...currentForm, [key]: value }));
	};

	const openProfileSheet = () => {
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
			return;
		}

		const budgetAmount = Number(profileForm.budgetAmount.replaceAll(",", ""));
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
			Alert.alert("Unable to update trip profile", "Please try again.");
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleFavoritePress = () => {
		toggleTripFavorite({
			isFavorite: !isFavorite,
			tripId: model.tripId,
		}).catch(() => {
			Alert.alert("Unable to update favorite", "Please try again.");
		});
	};

	const handleArchivePress = () => {
		archiveTrip({ tripId: model.tripId }).catch(() => {
			Alert.alert("Unable to archive trip", "Please try again.");
		});
	};

	const handleDeleteTrip = () => {
		deleteTrip({ tripId: model.tripId })
			.then(() => {
				router.replace(VIYA_ROUTES.trips as Href);
			})
			.catch(() => {
				Alert.alert("Unable to delete trip", "Please try again.");
			});
	};

	const handleDeletePress = () => {
		Alert.alert(
			"Delete trip?",
			"This removes the trip and its saved trip details.",
			[
				{ style: "cancel", text: "Cancel" },
				{
					onPress: handleDeleteTrip,
					style: "destructive",
					text: "Delete",
				},
			]
		);
	};

	return (
		<>
			<View className="h-12 flex-row items-center gap-1 rounded-full border border-border bg-surface px-1">
				<Pressable
					accessibilityLabel="Share trip"
					accessibilityRole="button"
					className="h-10 w-11 items-center justify-center rounded-full"
					onPress={() => router.push(VIYA_ROUTES.tripWrapped(model.tripId))}
				>
					<Ionicons color={foregroundColor} name="share-outline" size={22} />
				</Pressable>
				<Menu>
					<Menu.Trigger asChild={true}>
						<Pressable
							accessibilityLabel="Open trip options"
							accessibilityRole="button"
							className="h-10 w-11 items-center justify-center rounded-full"
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
			</View>
			<TripProfileEditSheet
				form={profileForm}
				isOpen={isProfileSheetOpen}
				isSaving={isSavingProfile}
				onOpenChange={setIsProfileSheetOpen}
				onSubmit={() => {
					handleSaveProfile().catch(() => undefined);
				}}
				onUpdateForm={updateProfileForm}
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
			<View className="min-h-11 flex-row items-center justify-between gap-3">
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
				<TripHeaderActionGroup model={model} />
			</View>
		</View>
	);
}

function TripMetaChip({ icon, label }: { icon: IoniconName; label: string }) {
	return (
		<View className="max-w-full flex-row items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1.5">
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

export function TripHero({ model }: { model: TripDashboardModel }) {
	const { readiness, travelerLabel, tripWindow, workspace } = model;
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
			<View className="gap-3">
				<View className="flex-row">
					<TripStatusPill status={workspace.trip.status} />
				</View>
				<Text.Heading numberOfLines={2} type="h2" weight="semibold">
					{workspace.trip.title}
				</Text.Heading>
				<View className="flex-row flex-wrap items-center gap-2">
					<TripMetaChip icon="location-outline" label={destinationLabel} />
					<TripMetaChip icon="calendar-clear-outline" label={tripWindow} />
					<TripMetaChip icon="people-outline" label={travelerLabel} />
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

interface TripModuleLauncherItem {
	count?: number;
	description: string;
	href: Href;
	icon: IoniconName;
	label: string;
}

const getTripModuleLauncherItems = (
	model: TripDashboardModel
): TripModuleLauncherItem[] => [
	{
		count: model.workspace.itineraryItems.length,
		description: "Daily plan, timing, and costs",
		href: VIYA_ROUTES.tripItinerary(model.tripId),
		icon: "calendar-outline",
		label: "Itinerary",
	},
	{
		count: model.tabCounts.places,
		description: "Saved places and trip map",
		href: VIYA_ROUTES.tripPlaces(model.tripId),
		icon: "map-outline",
		label: "Places",
	},
	{
		count: model.workspace.bookings.length,
		description: "Flights, stays, and activities",
		href: VIYA_ROUTES.tripBookings(model.tripId),
		icon: "briefcase-outline",
		label: "Bookings",
	},
	{
		count: model.workspace.vaultItems.length + model.workspace.documents.length,
		description: "Tickets, IDs, and receipts",
		href: VIYA_ROUTES.tripVault(model.tripId),
		icon: "folder-open-outline",
		label: "Documents",
	},
	{
		count: model.workspace.expenses.length,
		description: `${formatMoney(model.budget.remaining, model.currency)} remaining`,
		href: VIYA_ROUTES.tripBudget(model.tripId),
		icon: "wallet-outline",
		label: "Budget",
	},
	{
		count: model.readiness.openCount,
		description: `${model.readiness.score}% ready`,
		href: VIYA_ROUTES.tripReadiness(model.tripId),
		icon: "checkbox-outline",
		label: "Checklist",
	},
	{
		count: model.workspace.companions.length,
		description: "Travelers and contacts",
		href: VIYA_ROUTES.tripCompanions(model.tripId),
		icon: "people-outline",
		label: "Companions",
	},
	{
		count: model.workspace.notes.length,
		description: "Decisions and reminders",
		href: VIYA_ROUTES.tripNotes(model.tripId),
		icon: "document-text-outline",
		label: "Notes",
	},
	{
		count: model.watchOutItems.length,
		description: "Gaps, risks, and warnings",
		href: VIYA_ROUTES.tripRisks(model.tripId),
		icon: "warning-outline",
		label: "Watchouts",
	},
	{
		description: "Day-of guidance",
		href: VIYA_ROUTES.tripTravelMode(model.tripId),
		icon: "navigate-outline",
		label: "Travel Mode",
	},
	{
		count: model.workspace.moments.length,
		description: "Photos and highlights",
		href: VIYA_ROUTES.tripMoments(model.tripId),
		icon: "images-outline",
		label: "Memories",
	},
	{
		description: "Trip story and summary",
		href: VIYA_ROUTES.tripWrapped(model.tripId),
		icon: "share-social-outline",
		label: "Recap",
	},
];

function ModuleLauncherTile({
	item,
	onPress,
}: {
	item: TripModuleLauncherItem;
	onPress: () => void;
}) {
	const accent = getModuleAccent(item.label);

	return (
		<Pressable
			accessibilityLabel={`Open ${item.label}`}
			accessibilityRole="button"
			className="min-h-28 flex-1 basis-[47%] rounded-3xl border border-border bg-surface p-4"
			onPress={onPress}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.985 : 1 }],
			})}
		>
			<View className="gap-3">
				<View className="flex-row items-start justify-between gap-3">
					<View
						className="h-10 w-10 items-center justify-center rounded-2xl"
						style={{ backgroundColor: accent.bg }}
					>
						<Ionicons color={accent.color} name={item.icon} size={20} />
					</View>
					{item.count === undefined ? null : (
						<View className="min-w-6 items-center rounded-full bg-surface-secondary px-2 py-1">
							<Text color="muted" type="body-xs" weight="semibold">
								{item.count}
							</Text>
						</View>
					)}
				</View>
				<View className="gap-1">
					<Text numberOfLines={1} type="body-sm" weight="bold">
						{item.label}
					</Text>
					<Text color="muted" numberOfLines={2} type="body-xs">
						{item.description}
					</Text>
				</View>
			</View>
		</Pressable>
	);
}

function TripModulesSheet({
	isOpen,
	model,
	onOpenChange,
}: {
	isOpen: boolean;
	model: TripDashboardModel;
	onOpenChange: (isOpen: boolean) => void;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const foreground = useThemeColor("foreground");
	const { height } = useWindowDimensions();
	const modules = getTripModuleLauncherItems(model);
	const moduleListMaxHeight = getTripModulesSheetListMaxHeight({
		bottomInset: insets.bottom,
		windowHeight: height,
	});

	const openModule = (href: Href) => {
		onOpenChange(false);
		router.push(href);
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
								<BottomSheet.Title>Trip modules</BottomSheet.Title>
								<BottomSheet.Description numberOfLines={2}>
									Jump between the tools for {model.workspace.trip.title}.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close trip modules"
								className="h-10 w-10 rounded-full bg-surface"
								iconProps={{ color: foreground, size: 22 }}
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: moduleListMaxHeight }}
						>
							<View className="flex-row flex-wrap gap-3">
								{modules.map((item) => (
									<ModuleLauncherTile
										item={item}
										key={item.label}
										onPress={() => openModule(item.href)}
									/>
								))}
							</View>
						</ScrollView>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

export function FloatingAskViyaBar({
	activeTab,
	model,
}: {
	activeTab: TripTab;
	model: TripDashboardModel;
}) {
	const insets = useSafeAreaInsets();
	const [isModulesOpen, setIsModulesOpen] = useState(false);
	const activeScreen = tripScreenMeta[activeTab];
	const activeAccent = getModuleAccent(activeScreen.label);
	const viyaHref = {
		params: {
			mode: "trip",
			prompt: `Help me plan ${model.workspace.trip.title}.`,
			tripId: model.tripId,
		},
		pathname: VIYA_ROUTES.viya,
	} as Href;

	return (
		<>
			<View
				className="absolute right-0 left-0 flex-row items-center justify-center gap-3 px-4"
				pointerEvents="box-none"
				style={{ bottom: Math.max(insets.bottom + 10, 18) }}
			>
				<View
					className="min-w-0 flex-1 flex-row items-center gap-3"
					style={{ maxWidth: 430 }}
				>
					<Surface
						className="min-w-0 flex-1 overflow-hidden rounded-full border border-border bg-surface px-2 py-2"
						style={{ borderColor }}
					>
						<Pressable
							accessibilityLabel={`Open trip modules from ${activeScreen.label}`}
							accessibilityRole="button"
							className="h-10 flex-row items-center gap-3 px-2"
							onPress={() => setIsModulesOpen(true)}
						>
							<View
								className="h-8 w-8 items-center justify-center rounded-full"
								style={{ backgroundColor: activeAccent.bg }}
							>
								<Ionicons
									color={activeAccent.color}
									name={activeScreen.icon}
									size={17}
								/>
							</View>
							<View className="min-w-0 flex-1">
								<Text
									numberOfLines={1}
									style={{ lineHeight: 18 }}
									type="body"
									weight="semibold"
								>
									{activeScreen.label}
								</Text>
								<Text
									color="muted"
									numberOfLines={1}
									style={{ lineHeight: 14 }}
									type="body-xs"
								>
									{model.workspace.trip.title}
								</Text>
							</View>
						</Pressable>
					</Surface>
					<Surface
						className="h-14 w-14 items-center justify-center rounded-full border border-border bg-surface"
						style={{ borderColor }}
					>
						<Link asChild href={viyaHref}>
							<Pressable
								accessibilityLabel="Ask Viya"
								accessibilityRole="button"
								className="h-12 w-12 items-center justify-center rounded-full"
							>
								<Feather color={accentColor} name="message-circle" size={23} />
							</Pressable>
						</Link>
					</Surface>
				</View>
			</View>
			<TripModulesSheet
				isOpen={isModulesOpen}
				model={model}
				onOpenChange={setIsModulesOpen}
			/>
		</>
	);
}

export function TripAgentDraftPanel({ model }: { model: TripDashboardModel }) {
	const applyDraft = useMutation(api.ai.tripAgent.applyTripAgentDraft);
	const dismissDraft = useMutation(api.ai.tripAgent.dismissTripAgentDraft);
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [agentError, setAgentError] = useState<string | null>(null);
	const activeDraft = (model.workspace.agentDrafts ?? [])
		.filter((draft) => draft.status === "draft")
		.sort(
			(firstDraft, secondDraft) => secondDraft.createdAt - firstDraft.createdAt
		)[0];
	const draftChanges = activeDraft
		? getDraftChanges(activeDraft.payloadJson)
		: [];

	const runDraftAction = async (
		key: string,
		action: () => Promise<unknown>
	) => {
		setPendingAction(key);
		setAgentError(null);
		try {
			await action();
		} catch (error) {
			setAgentError(
				error instanceof Error
					? error.message
					: "Viya could not update the draft."
			);
		} finally {
			setPendingAction(null);
		}
	};

	if (!activeDraft) {
		return null;
	}

	const applyKey = `apply:${activeDraft._id}`;
	const dismissKey = `dismiss:${activeDraft._id}`;

	return (
		<Surface
			className="gap-4 rounded-[28px] border border-border bg-surface p-4"
			style={{ borderColor }}
		>
			<View className="flex-row items-start gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(10, 132, 255, 0.12)" }}
				>
					<Ionicons color={accentColor} name="sparkles-outline" size={18} />
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<View className="flex-row flex-wrap gap-2">
						<View className="rounded-full bg-primary/10 px-2.5 py-1">
							<Text
								numberOfLines={1}
								style={{ color: accentColor }}
								type="body-xs"
								weight="semibold"
							>
								{activeDraft.module.toUpperCase()} DRAFT
							</Text>
						</View>
					</View>
					<Text type="body" weight="bold">
						{activeDraft.title}
					</Text>
					<Text.Paragraph color="muted" type="body-sm">
						{activeDraft.rationale}
					</Text.Paragraph>
				</View>
			</View>
			{draftChanges.length > 0 ? (
				<View className="gap-2">
					{draftChanges.map((change) => (
						<View
							className="flex-row items-start gap-3 rounded-[20px] bg-surface-secondary p-3"
							key={`${change.type}:${change.title}`}
						>
							<View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-surface">
								<Ionicons color={accentColor} name="add-outline" size={15} />
							</View>
							<View className="min-w-0 flex-1 gap-0.5">
								<Text type="body-sm" weight="semibold">
									{change.title}
								</Text>
								<Text color="muted" type="body-xs">
									{change.detail}
								</Text>
							</View>
						</View>
					))}
				</View>
			) : null}
			<View className="flex-row flex-wrap gap-2">
				<Button
					className="flex-1"
					isDisabled={pendingAction !== null}
					onPress={() => {
						runDraftAction(applyKey, () =>
							applyDraft({ draftId: activeDraft._id })
						).catch(() => undefined);
					}}
					size="sm"
					variant="primary"
				>
					{pendingAction === applyKey ? (
						<Ionicons color="#FFFFFF" name="sync-outline" size={15} />
					) : null}
					<Button.Label>Apply draft</Button.Label>
				</Button>
				<Button
					className="flex-1"
					isDisabled={pendingAction !== null}
					onPress={() => {
						runDraftAction(dismissKey, () =>
							dismissDraft({ draftId: activeDraft._id })
						).catch(() => undefined);
					}}
					size="sm"
					variant="tertiary"
				>
					<Button.Label>Dismiss</Button.Label>
				</Button>
			</View>
			{agentError ? (
				<Text className="text-danger" type="body-sm">
					{agentError}
				</Text>
			) : null}
		</Surface>
	);
}

export function StatusStrip({ metrics }: { metrics: DashboardMetric[] }) {
	return (
		<View className="flex-row gap-2">
			{metrics.map((metric) => (
				<MetricPill key={metric.label} metric={metric} />
			))}
		</View>
	);
}

export function NextActionCard({
	model,
	onSelectTab,
}: {
	model: TripDashboardModel;
	onSelectTab: (tab: TripTab) => void;
}) {
	return (
		<Surface
			className="gap-4 rounded-[28px] border border-border bg-surface p-4"
			style={{ borderColor }}
		>
			<View className="flex-row items-start gap-3">
				<View
					className="h-10 w-10 items-center justify-center rounded-full"
					style={{ backgroundColor: "rgba(10, 132, 255, 0.12)" }}
				>
					<Ionicons
						color={accentColor}
						name={model.nextAction.icon}
						size={18}
					/>
				</View>
				<View className="min-w-0 flex-1 gap-1">
					<Text color="muted" type="body-xs" weight="semibold">
						NEXT BEST ACTION
					</Text>
					<Text type="body" weight="bold">
						{model.nextAction.title}
					</Text>
					<Text color="muted" type="body-sm">
						{model.nextAction.description}
					</Text>
				</View>
			</View>
			<View className="flex-row flex-wrap gap-2">
				<LinkButton href={model.nextAction.href} variant="primary">
					Open
				</LinkButton>
				<Button
					onPress={() => onSelectTab(model.nextAction.tab)}
					size="sm"
					variant="secondary"
				>
					<Button.Label>See context</Button.Label>
				</Button>
			</View>
		</Surface>
	);
}

interface DashboardWorkspaceModule {
	detail: string;
	href: Href;
	icon: IoniconName;
	label: string;
	value: string;
}

const formatCountLabel = (count: number, singular: string) =>
	`${count} ${count === 1 ? singular : `${singular}s`}`;

const getScheduledItemDetail = (
	scheduledItem: TripDashboardModel["nowScheduledItem"]
) => {
	if (!scheduledItem) {
		return null;
	}

	const timeLabel = [scheduledItem.item.startTime, scheduledItem.item.endTime]
		.filter(Boolean)
		.join("-");
	const placeLabel =
		scheduledItem.item.locationName ?? scheduledItem.day?.title;

	return [timeLabel || scheduledItem.date, placeLabel]
		.filter(Boolean)
		.join(" - ");
};

function WorkspaceModuleTile({ item }: { item: DashboardWorkspaceModule }) {
	const accent = getModuleAccent(item.label);

	return (
		<Link asChild href={item.href}>
			<Pressable
				accessibilityLabel={`Open ${item.label}`}
				accessibilityRole="button"
				className="min-h-30 flex-1 basis-[47%] rounded-3xl border border-border bg-surface p-4"
				style={({ pressed }) => ({
					borderColor,
					transform: [{ scale: pressed ? 0.985 : 1 }],
				})}
			>
				<View className="flex-1 justify-between gap-3">
					<View className="flex-row items-center justify-between gap-2">
						<View
							className="h-10 w-10 items-center justify-center rounded-2xl"
							style={{ backgroundColor: accent.bg }}
						>
							<Ionicons color={accent.color} name={item.icon} size={20} />
						</View>
						<View className="rounded-full bg-surface-secondary px-2.5 py-1">
							<Text
								color="muted"
								numberOfLines={1}
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
				</View>
			</Pressable>
		</Link>
	);
}

function WorkspaceSectionLabel({ children }: { children: string }) {
	return (
		<Text className="px-1" color="muted" type="body-xs" weight="semibold">
			{children}
		</Text>
	);
}

function GroupedCard({ children }: { children: ReactNode }) {
	return (
		<Surface
			className="overflow-hidden rounded-3xl border border-border bg-surface"
			style={{ borderColor }}
		>
			{children}
		</Surface>
	);
}

function GroupedRow({
	accent = defaultModuleAccent,
	detail,
	href,
	icon,
	label,
	right,
	showDivider = false,
}: {
	accent?: ModuleAccent;
	detail: string;
	href: Href;
	icon: IoniconName;
	label: string;
	right?: string;
	showDivider?: boolean;
}) {
	return (
		<View>
			{showDivider ? <View className="ml-15.5 h-px bg-border" /> : null}
			<Link asChild href={href}>
				<Pressable
					accessibilityLabel={`${label}. ${detail}`}
					accessibilityRole="button"
					className="min-h-15 flex-row items-center gap-3 px-3.5 py-3"
					style={({ pressed }) => ({
						backgroundColor: pressed ? softBackgroundColor : "transparent",
					})}
				>
					<View
						className="h-9 w-9 items-center justify-center rounded-2xl"
						style={{ backgroundColor: accent.bg }}
					>
						<Ionicons color={accent.color} name={icon} size={18} />
					</View>
					<View className="min-w-0 flex-1 gap-0.5">
						<Text numberOfLines={1} type="body-sm" weight="semibold">
							{label}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{detail}
						</Text>
					</View>
					{right ? (
						<Text
							color="muted"
							numberOfLines={1}
							type="body-xs"
							weight="semibold"
						>
							{right}
						</Text>
					) : null}
					<Ionicons color={mutedColor} name="chevron-forward" size={17} />
				</Pressable>
			</Link>
		</View>
	);
}

function FeaturedNextCard({ model }: { model: TripDashboardModel }) {
	const { nextAction } = model;

	return (
		<Link asChild href={nextAction.href}>
			<Pressable
				accessibilityLabel={`Next up. ${nextAction.title}. ${nextAction.description}`}
				accessibilityRole="button"
				style={({ pressed }) => ({
					transform: [{ scale: pressed ? 0.99 : 1 }],
				})}
			>
				<Surface
					className="flex-row items-center gap-3.5 rounded-3xl border border-border bg-surface p-4"
					style={{ borderColor }}
				>
					<View
						className="h-12 w-12 items-center justify-center rounded-2xl"
						style={{ backgroundColor: "rgba(10, 132, 255, 0.12)" }}
					>
						<Ionicons color={accentColor} name={nextAction.icon} size={22} />
					</View>
					<View className="min-w-0 flex-1 gap-0.5">
						<Text color="muted" type="body-xs" weight="semibold">
							NEXT UP
						</Text>
						<Text numberOfLines={1} type="body" weight="bold">
							{nextAction.title}
						</Text>
						<Text color="muted" numberOfLines={1} type="body-xs">
							{nextAction.description}
						</Text>
					</View>
					<Ionicons color={mutedColor} name="chevron-forward" size={18} />
				</Surface>
			</Pressable>
		</Link>
	);
}

export function MainModules({ model }: { model: TripDashboardModel }) {
	const documentCount =
		model.workspace.documents.length + model.workspace.vaultItems.length;
	const placesCount =
		model.workspace.savedPlaces.length +
		model.workspace.itineraryItems.filter((item) => item.locationName).length;
	const recentUpdates = model.recentUpdates.slice(0, 3);
	const nowDetail = getScheduledItemDetail(model.nowScheduledItem);
	const nextDetail = getScheduledItemDetail(model.nextScheduledItem);
	const workspaceModules: DashboardWorkspaceModule[] = [
		{
			detail: formatCountLabel(model.workspace.itineraryDays.length, "day"),
			href: VIYA_ROUTES.tripItinerary(model.tripId),
			icon: "calendar-outline",
			label: "Itinerary",
			value: formatCountLabel(model.workspace.itineraryItems.length, "item"),
		},
		{
			detail: "Saved map pins and ideas",
			href: VIYA_ROUTES.tripPlaces(model.tripId),
			icon: "map-outline",
			label: "Places",
			value: formatCountLabel(placesCount, "place"),
		},
		{
			detail: "Flights, stays, and activities",
			href: VIYA_ROUTES.tripBookings(model.tripId),
			icon: "briefcase-outline",
			label: "Bookings",
			value: formatCountLabel(model.workspace.bookings.length, "booking"),
		},
		{
			detail: "Tickets, IDs, and receipts",
			href: VIYA_ROUTES.tripVault(model.tripId),
			icon: "folder-open-outline",
			label: "Documents",
			value: formatCountLabel(documentCount, "file"),
		},
		{
			detail: model.budget.status,
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "wallet-outline",
			label: "Budget",
			value: `${formatMoney(model.budget.remaining, model.currency)} left`,
		},
		{
			detail: model.readiness.topBlocker,
			href: VIYA_ROUTES.tripReadiness(model.tripId),
			icon: "checkbox-outline",
			label: "Checklist",
			value: `${model.readiness.openCount} open`,
		},
	];

	const itineraryHref = VIYA_ROUTES.tripItinerary(model.tripId);
	const itineraryAccent = getModuleAccent("Itinerary");

	return (
		<View className="gap-7">
			<View className="gap-3">
				<View className="gap-1 px-1">
					<Text.Heading type="h5" weight="bold">
						Trip workspace
					</Text.Heading>
					<Text color="muted" type="body-sm">
						Everything for this trip, organized in one place.
					</Text>
				</View>
				<View className="flex-row flex-wrap gap-3">
					{workspaceModules.map((item) => (
						<WorkspaceModuleTile item={item} key={item.label} />
					))}
				</View>
			</View>

			<View className="gap-2.5">
				<WorkspaceSectionLabel>UP NEXT</WorkspaceSectionLabel>
				<FeaturedNextCard model={model} />
			</View>

			<View className="gap-2.5">
				<WorkspaceSectionLabel>YOUR PLAN</WorkspaceSectionLabel>
				<GroupedCard>
					{nowDetail ? (
						<GroupedRow
							accent={itineraryAccent}
							detail={nowDetail}
							href={itineraryHref}
							icon="today-outline"
							label={model.nowScheduledItem?.item.title ?? "Current item"}
						/>
					) : (
						<GroupedRow
							accent={itineraryAccent}
							detail="Add timed items to build a day-by-day view."
							href={itineraryHref}
							icon="calendar-outline"
							label="Start the itinerary"
						/>
					)}
					{nextDetail ? (
						<GroupedRow
							accent={itineraryAccent}
							detail={nextDetail}
							href={itineraryHref}
							icon="time-outline"
							label={model.nextScheduledItem?.item.title ?? "Next item"}
							showDivider={true}
						/>
					) : null}
				</GroupedCard>
			</View>

			<View className="gap-2.5">
				<WorkspaceSectionLabel>RECENT ACTIVITY</WorkspaceSectionLabel>
				<GroupedCard>
					{recentUpdates.length > 0 ? (
						recentUpdates.map((update, index) => (
							<View key={`${update.createdAt}:${update.message}`}>
								{index > 0 ? <View className="ml-15.5 h-px bg-border" /> : null}
								<View className="min-h-13 flex-row items-center gap-3 px-3.5 py-3">
									<View
										className="h-9 w-9 items-center justify-center rounded-2xl"
										style={{ backgroundColor: softBackgroundColor }}
									>
										<Ionicons
											color={accentColor}
											name={update.icon}
											size={18}
										/>
									</View>
									<Text
										className="min-w-0 flex-1"
										numberOfLines={2}
										type="body-sm"
									>
										{update.message}
									</Text>
								</View>
							</View>
						))
					) : (
						<View className="flex-row items-center gap-3 px-3.5 py-4">
							<View
								className="h-9 w-9 items-center justify-center rounded-2xl"
								style={{ backgroundColor: softBackgroundColor }}
							>
								<Ionicons color={mutedColor} name="time-outline" size={18} />
							</View>
							<Text color="muted" type="body-sm">
								No recent changes yet.
							</Text>
						</View>
					)}
				</GroupedCard>
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
