import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { TRIP_STATUSES, type TripStatus } from "@viya-app/domain";
import { useAction, useMutation } from "convex/react";
import { type Href, Link, useRouter } from "expo-router";
import {
	BottomSheet,
	Button,
	CloseButton,
	Input,
	Label,
	Separator,
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
import {
	TripCardMetaRow,
	TripMetricBlock,
	TripRouteLine,
} from "@/src/features/trips/trip-card-primitives";
import { getTripStatusPresentation } from "@/src/features/trips/trip-status-pill";

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
const composerShadow = "0 10px 28px rgba(15, 23, 42, 0.12)";
const checklistIconBackgroundColor = "rgba(10, 132, 255, 0.1)";
const checklistSuccessBackgroundColor = "rgba(48, 209, 88, 0.13)";
const shouldUseFallbackDraft = process.env.NODE_ENV !== "production";

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

type TripAgentModule =
	| "itinerary"
	| "places"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "travel"
	| "recap";

type TripAgentAction = "generate" | "refine" | "audit" | "explain";

interface ParsedDraftChange {
	detail: string;
	title: string;
	type: string;
}

const tripAgentActions = [
	{
		action: "generate",
		icon: "calendar-outline",
		label: "Itinerary",
		module: "itinerary",
	},
	{
		action: "generate",
		icon: "briefcase-outline",
		label: "Bookings",
		module: "bookings",
	},
	{
		action: "generate",
		icon: "map-outline",
		label: "Places",
		module: "places",
	},
	{
		action: "generate",
		icon: "wallet-outline",
		label: "Budget",
		module: "budget",
	},
	{
		action: "generate",
		icon: "folder-open-outline",
		label: "Docs",
		module: "documents",
	},
	{
		action: "audit",
		icon: "checkbox-outline",
		label: "Checklist",
		module: "readiness",
	},
	{
		action: "audit",
		icon: "warning-outline",
		label: "Risks",
		module: "risks",
	},
	{
		action: "generate",
		icon: "navigate-outline",
		label: "Backup",
		module: "travel",
	},
	{
		action: "generate",
		icon: "share-social-outline",
		label: "Recap",
		module: "recap",
	},
] as const satisfies Array<{
	action: TripAgentAction;
	icon: IoniconName;
	label: string;
	module: TripAgentModule;
}>;

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

const tripStatusProgressSteps = TRIP_STATUSES.map((status) => {
	const presentation = getTripStatusPresentation(status);

	return {
		description: presentation.description,
		icon: presentation.icon as IoniconName,
		id: status,
		label: presentation.label,
	};
}) satisfies Array<{
	description: string;
	icon: IoniconName;
	id: TripStatus;
	label: string;
}>;

type TripStatusProgressStepData = (typeof tripStatusProgressSteps)[number];

function TripStatusProgressStep({
	currentStepIndex,
	index,
	step,
}: {
	currentStepIndex: number;
	index: number;
	step: TripStatusProgressStepData;
}) {
	const isCurrent = index === currentStepIndex;
	const isDone = index < currentStepIndex;
	const stepPresentation = getTripStatusPresentation(step.id);
	const markerColor =
		isCurrent || isDone ? stepPresentation.color : "rgba(0,0,0,0.18)";
	const lineColor = isDone || isCurrent ? stepPresentation.color : borderColor;
	const isFirstStep = index === 0;
	const isLastStep = index === tripStatusProgressSteps.length - 1;

	return (
		<View className="flex-row gap-3">
			<View className="w-6 items-center">
				<View
					className="h-0 w-px"
					style={{
						backgroundColor: isFirstStep ? "transparent" : lineColor,
					}}
				/>
				<View
					className="h-5 w-5 items-center justify-center rounded-full"
					style={{
						backgroundColor: isCurrent
							? stepPresentation.backgroundColor
							: "transparent",
					}}
				>
					{isCurrent ? (
						<View
							className="h-2.5 w-2.5 rounded-full"
							style={{ backgroundColor: stepPresentation.color }}
						/>
					) : (
						<View
							className="h-3 w-3 rounded-full"
							style={{ backgroundColor: markerColor }}
						/>
					)}
				</View>
				<View
					className="w-px flex-1"
					style={{
						backgroundColor: isLastStep ? "transparent" : lineColor,
					}}
				/>
			</View>
			<View className="min-w-0 flex-1 pb-4">
				<View className="flex-row items-center gap-2">
					<Ionicons
						color={isCurrent || isDone ? stepPresentation.color : mutedColor}
						name={step.icon}
						size={16}
					/>
					<Text
						numberOfLines={1}
						style={isCurrent ? { color: stepPresentation.color } : undefined}
						type="body-sm"
						weight={isCurrent ? "bold" : "semibold"}
					>
						{step.label}
					</Text>
				</View>
				<Text color="muted" numberOfLines={2} type="body-xs">
					{step.description}
				</Text>
			</View>
		</View>
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
	const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
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
		setIsOptionsSheetOpen(false);
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
				<Pressable
					accessibilityLabel="Open trip options"
					accessibilityRole="button"
					className="h-10 w-11 items-center justify-center rounded-full"
					onPress={() => setIsOptionsSheetOpen(true)}
				>
					<Ionicons
						color={foregroundColor}
						name="ellipsis-horizontal"
						size={22}
					/>
				</Pressable>
			</View>
			<TripOptionsSheet
				isArchived={isArchived}
				isFavorite={isFavorite}
				isOpen={isOptionsSheetOpen}
				onArchive={handleArchivePress}
				onDelete={handleDeletePress}
				onEditProfile={openProfileSheet}
				onFavorite={handleFavoritePress}
				onOpenChange={setIsOptionsSheetOpen}
			/>
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

function TripOptionsSheet({
	isArchived,
	isFavorite,
	isOpen,
	onArchive,
	onDelete,
	onEditProfile,
	onFavorite,
	onOpenChange,
}: {
	isArchived: boolean;
	isFavorite: boolean;
	isOpen: boolean;
	onArchive: () => void;
	onDelete: () => void;
	onEditProfile: () => void;
	onFavorite: () => void;
	onOpenChange: (isOpen: boolean) => void;
}) {
	const insets = useSafeAreaInsets();

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enablePanDownToClose={true}
					snapPoints={["48%"]}
				>
					<View
						className="gap-4 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="flex-1 gap-1">
								<BottomSheet.Title>Trip actions</BottomSheet.Title>
								<BottomSheet.Description>
									Update the profile, favorite, archive, or delete this trip.
								</BottomSheet.Description>
							</View>
							<CloseButton
								accessibilityLabel="Close trip options"
								className="h-10 w-10 rounded-full bg-surface"
								onPress={() => onOpenChange(false)}
							/>
						</View>
						<View className="gap-2">
							<TripOptionsRow
								detail="Update dates, destination, budget, and notes."
								icon="create-outline"
								iconColor={accentColor}
								label="Edit profile"
								onPress={onEditProfile}
							/>
							<TripOptionsRow
								detail={
									isFavorite
										? "Keep this trip in favorites."
										: "Pin this trip for quick access."
								}
								icon={isFavorite ? "heart" : "heart-outline"}
								iconColor="#FF9F0A"
								label={isFavorite ? "Favorited" : "Add to favorites"}
								onPress={() => {
									onFavorite();
									onOpenChange(false);
								}}
							/>
							<TripOptionsRow
								detail="Move this trip out of active planning."
								icon="archive-outline"
								iconColor={mutedColor}
								isDisabled={isArchived}
								label={isArchived ? "Archived" : "Archive"}
								onPress={() => {
									onArchive();
									onOpenChange(false);
								}}
							/>
						</View>
						<Separator />
						<TripOptionsRow
							detail="Remove this trip permanently."
							icon="trash-outline"
							iconColor="#FF3B30"
							label="Delete trip"
							onPress={() => {
								onDelete();
								onOpenChange(false);
							}}
						/>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function TripOptionsRow({
	detail,
	icon,
	iconColor,
	isDisabled = false,
	label,
	onPress,
}: {
	detail: string;
	icon: IoniconName;
	iconColor: string;
	isDisabled?: boolean;
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className="min-h-14 flex-row items-center gap-3 rounded-[22px] bg-surface px-3 py-2.5"
			disabled={isDisabled}
			onPress={onPress}
			style={{ opacity: isDisabled ? 0.5 : 1 }}
		>
			<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
				<Ionicons color={iconColor} name={icon} size={18} />
			</View>
			<View className="min-w-0 flex-1">
				<Text type="body-sm" weight="semibold">
					{label}
				</Text>
				<Text color="muted" numberOfLines={2} type="body-xs">
					{detail}
				</Text>
			</View>
		</Pressable>
	);
}

function TripHeaderStatusPill({ status }: { status: string }) {
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const insets = useSafeAreaInsets();
	const presentation = getTripStatusPresentation(status);
	const currentStepIndex = Math.max(
		0,
		tripStatusProgressSteps.findIndex((step) => step.id === status)
	);

	return (
		<>
			<Pressable
				accessibilityLabel="View trip status progress"
				accessibilityRole="button"
				className="h-12 flex-row items-center gap-2 rounded-full border border-border bg-surface px-4"
				onPress={() => setIsSheetOpen(true)}
			>
				<Ionicons color={presentation.color} name="map-outline" size={17} />
				<Text
					numberOfLines={1}
					style={{ color: presentation.color }}
					type="body-sm"
					weight="bold"
				>
					{presentation.label}
				</Text>
				<Ionicons color={presentation.color} name="chevron-down" size={14} />
			</Pressable>
			<BottomSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<BottomSheet.Portal>
					<BottomSheet.Overlay />
					<BottomSheet.Content
						backgroundClassName="rounded-t-[36px] bg-background"
						enablePanDownToClose={true}
						snapPoints={["42%"]}
					>
						<View
							className="gap-4 px-5 pt-2"
							style={{ paddingBottom: Math.max(insets.bottom, 18) }}
						>
							<View className="flex-row items-start justify-between gap-4">
								<View className="flex-1 gap-1">
									<BottomSheet.Title>Trip status</BottomSheet.Title>
									<BottomSheet.Description>
										Trip status tracks the broad lifecycle. Work modules can
										move in any order.
									</BottomSheet.Description>
								</View>
								<CloseButton
									accessibilityLabel="Close trip status"
									className="h-10 w-10 rounded-full bg-surface"
									onPress={() => setIsSheetOpen(false)}
								/>
							</View>
							<View className="gap-0 rounded-[28px] bg-surface px-4 py-3">
								{tripStatusProgressSteps.map((step, index) => (
									<TripStatusProgressStep
										currentStepIndex={currentStepIndex}
										index={index}
										key={step.id}
										step={step}
									/>
								))}
							</View>
						</View>
					</BottomSheet.Content>
				</BottomSheet.Portal>
			</BottomSheet>
		</>
	);
}

export function TripStickyHeader({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	return (
		<View
			className="bg-background px-4 pb-3"
			style={{ paddingTop: insets.top + 10, zIndex: 30 }}
		>
			<View className="min-h-11 flex-row items-center justify-between gap-3">
				<View className="min-w-0 flex-1 flex-row items-center gap-3">
					<NavigationBackButton onPress={() => router.back()} />
					<TripHeaderStatusPill status={model.workspace.trip.status} />
				</View>
				<TripHeaderActionGroup model={model} />
			</View>
		</View>
	);
}

export function TripHero({ model }: { model: TripDashboardModel }) {
	const { readiness, travelerLabel, tripWindow, workspace } = model;
	const readinessDisplay = getReadinessDisplay({
		itemCount: workspace.readinessItems.length,
		score: readiness.score,
	});
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
		<View>
			<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-4">
				<Text.Heading numberOfLines={2} type="h2" weight="semibold">
					{workspace.trip.title}
				</Text.Heading>
				<View className="gap-0.5">
					<TripRouteLine destination={workspace.trip.destination} />
					<TripCardMetaRow left={tripWindow} right={travelerLabel} />
				</View>
				<View className="gap-3 border-border border-t pt-3">
					<View className="flex-row items-start gap-4">
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
			</Surface>
		</View>
	);
}

export function FloatingAskViyaBar({ model }: { model: TripDashboardModel }) {
	const insets = useSafeAreaInsets();
	const profileDetail = `${model.tripWindow} - ${model.workspace.itineraryItems.length} planned items`;

	return (
		<View
			className="absolute right-0 left-0 flex-row items-center gap-2 px-4"
			pointerEvents="box-none"
			style={{ bottom: Math.max(insets.bottom + 10, 18) }}
		>
			<Link asChild href={VIYA_ROUTES.tripDashboard(model.tripId)}>
				<Pressable
					accessibilityLabel="Open trip profile"
					accessibilityRole="button"
					className="min-w-0 flex-1 overflow-hidden rounded-full"
					style={{ boxShadow: composerShadow }}
				>
					<Surface
						className="overflow-hidden rounded-full border border-border bg-surface px-2 py-2"
						style={{ borderColor }}
					>
						<View className="h-10 flex-row items-center gap-3 px-2">
							<View
								className="h-8 w-8 items-center justify-center rounded-full"
								style={{ backgroundColor: "rgba(10, 132, 255, 0.12)" }}
							>
								<Ionicons color={accentColor} name="map-outline" size={17} />
							</View>
							<View className="min-w-0 flex-1 flex-row items-center justify-between gap-3">
								<View className="min-w-0 flex-1">
									<Text numberOfLines={1} type="body" weight="semibold">
										Trip profile
									</Text>
									<Text color="muted" numberOfLines={1} type="body-xs">
										{profileDetail}
									</Text>
								</View>
								<Ionicons
									color={accentColor}
									name="chevron-forward"
									size={18}
								/>
							</View>
						</View>
					</Surface>
				</Pressable>
			</Link>
			<Link asChild href={VIYA_ROUTES.viya as Href}>
				<Pressable
					accessibilityLabel="Ask Viya"
					accessibilityRole="button"
					className="h-14 w-14 items-center justify-center rounded-full border border-border bg-surface"
					style={{ borderColor, boxShadow: composerShadow }}
				>
					<Ionicons color={accentColor} name="chatbubble-outline" size={23} />
				</Pressable>
			</Link>
		</View>
	);
}

export function TripAgentDraftPanel({ model }: { model: TripDashboardModel }) {
	const generateDraft = useAction(api.ai.tripAgent.generateTripAgentDraft);
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
		return (
			<Surface
				className="gap-4 rounded-[28px] border border-border bg-surface p-4"
				style={{ borderColor, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
			>
				<View className="flex-row items-start gap-3">
					<View
						className="h-10 w-10 items-center justify-center rounded-full"
						style={{ backgroundColor: "rgba(10, 132, 255, 0.12)" }}
					>
						<Ionicons color={accentColor} name="sparkles-outline" size={18} />
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text color="muted" type="body-xs" weight="semibold">
							VIYA AGENT
						</Text>
						<Text type="body" weight="bold">
							Generate a reviewable draft
						</Text>
						<Text color="muted" type="body-sm">
							Viya can draft module changes, but you review them before they
							touch the trip.
						</Text>
					</View>
				</View>
				<View className="flex-row flex-wrap gap-2">
					{tripAgentActions.map((item) => {
						const actionKey = `${item.module}:${item.action}`;
						const isPending = pendingAction === actionKey;

						return (
							<Button
								isDisabled={pendingAction !== null}
								key={actionKey}
								onPress={() => {
									runDraftAction(actionKey, () =>
										generateDraft({
											action: item.action,
											module: item.module,
											tripId: model.tripId,
											useFallback: shouldUseFallbackDraft ? true : undefined,
										})
									).catch(() => undefined);
								}}
								size="sm"
								variant="secondary"
							>
								{isPending ? (
									<Ionicons color={accentColor} name="sync-outline" size={15} />
								) : (
									<Ionicons color={accentColor} name={item.icon} size={15} />
								)}
								<Button.Label>{item.label}</Button.Label>
							</Button>
						);
					})}
				</View>
				{agentError ? (
					<Text className="text-danger" type="body-sm">
						{agentError}
					</Text>
				) : null}
			</Surface>
		);
	}

	const applyKey = `apply:${activeDraft._id}`;
	const dismissKey = `dismiss:${activeDraft._id}`;

	return (
		<Surface
			className="gap-4 rounded-[28px] border border-border bg-surface p-4"
			style={{ borderColor, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)" }}
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
			style={{ borderColor, boxShadow: composerShadow }}
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

function ChecklistStatusBadge({ isComplete }: { isComplete: boolean }) {
	return (
		<View
			className={[
				"h-5 w-5 items-center justify-center rounded-full border",
				isComplete
					? "border-success bg-success"
					: "border-border bg-surface-secondary",
			].join(" ")}
		>
			{isComplete ? (
				<Ionicons color="#FFFFFF" name="checkmark" size={12} />
			) : (
				<View className="h-1.5 w-1.5 rounded-full bg-border" />
			)}
		</View>
	);
}

function ChecklistIcon({
	icon,
	isComplete,
}: {
	icon: IoniconName;
	isComplete: boolean;
}) {
	return (
		<View
			className="h-12 w-12 items-center justify-center rounded-[18px]"
			style={{
				backgroundColor: isComplete
					? checklistSuccessBackgroundColor
					: checklistIconBackgroundColor,
			}}
		>
			<Ionicons
				color={isComplete ? "#1F8F45" : accentColor}
				name={icon}
				size={22}
			/>
			<View className="absolute -right-1 -bottom-1">
				<ChecklistStatusBadge isComplete={isComplete} />
			</View>
		</View>
	);
}

function StatusChecklistRow({
	detail,
	icon,
	isComplete,
	label,
	onPress,
}: {
	detail: string;
	icon: IoniconName;
	isComplete: boolean;
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={`${label}. ${detail}. ${
				isComplete ? "Complete" : "Incomplete"
			}`}
			accessibilityRole="button"
			accessibilityState={{ checked: isComplete }}
			className={[
				"min-h-[76px] flex-row items-center gap-3 rounded-[26px] border px-4 py-3",
				"border-border bg-surface",
			].join(" ")}
			onPress={onPress}
			style={{ boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)" }}
		>
			<ChecklistIcon icon={icon} isComplete={isComplete} />
			<View className="min-w-0 flex-1 gap-1">
				<Text numberOfLines={1} type="body" weight="semibold">
					{label}
				</Text>
				<Text color="muted" numberOfLines={1} type="body-sm">
					{detail}
				</Text>
			</View>
			<View className="h-8 w-8 items-center justify-center rounded-full bg-surface">
				<Ionicons color={mutedColor} name="chevron-forward" size={17} />
			</View>
		</Pressable>
	);
}

interface StatusChecklistRequirement {
	detail: string;
	isComplete: boolean;
	label: string;
}

interface StatusChecklistItem {
	description?: string;
	detail: string;
	href: Href;
	icon: IoniconName;
	isComplete: boolean;
	label: string;
	primaryActionLabel?: string;
	requirements?: StatusChecklistRequirement[];
}

function StatusChecklistRequirementRow({
	requirement,
}: {
	requirement: StatusChecklistRequirement;
}) {
	return (
		<View className="flex-row items-start gap-3 rounded-[20px] bg-surface-secondary p-3">
			<View
				className={[
					"mt-0.5 h-6 w-6 items-center justify-center rounded-full",
					requirement.isComplete ? "bg-success" : "bg-surface",
				].join(" ")}
			>
				<Ionicons
					color={requirement.isComplete ? "#FFFFFF" : mutedColor}
					name={requirement.isComplete ? "checkmark" : "ellipse-outline"}
					size={13}
				/>
			</View>
			<View className="min-w-0 flex-1 gap-0.5">
				<Text type="body-sm" weight="semibold">
					{requirement.label}
				</Text>
				<Text color="muted" type="body-xs">
					{requirement.detail}
				</Text>
			</View>
		</View>
	);
}

function PhaseTaskSheet({
	item,
	onOpenChange,
}: {
	item: StatusChecklistItem | null;
	onOpenChange: (isOpen: boolean) => void;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const foregroundColor = useThemeColor("foreground");
	const maxBodyHeight = Math.max(320, height * 0.58);

	if (!item) {
		return null;
	}

	const requirements = item.requirements ?? [
		{
			detail: item.detail,
			isComplete: item.isComplete,
			label: item.isComplete ? "Requirement complete" : "Requirement pending",
		},
	];
	const description =
		item.description ??
		"Review the requirements for this phase, then open the related trip tool to update the plan.";
	const primaryActionLabel = item.primaryActionLabel ?? "Open trip tool";

	const handlePrimaryAction = () => {
		onOpenChange(false);
		router.push(item.href);
	};

	return (
		<BottomSheet isOpen={true} onOpenChange={onOpenChange}>
			<BottomSheet.Portal>
				<BottomSheet.Overlay />
				<BottomSheet.Content
					backgroundClassName="rounded-t-[36px] bg-background"
					enableDynamicSizing={true}
					enablePanDownToClose={true}
				>
					<View
						className="gap-5 px-5 pt-2"
						style={{ paddingBottom: Math.max(insets.bottom, 18) }}
					>
						<View className="flex-row items-start justify-between gap-4">
							<View className="min-w-0 flex-1 gap-2">
								<View
									className="h-12 w-12 items-center justify-center rounded-[18px]"
									style={{
										backgroundColor: item.isComplete
											? checklistSuccessBackgroundColor
											: checklistIconBackgroundColor,
									}}
								>
									<Ionicons
										color={item.isComplete ? "#1F8F45" : accentColor}
										name={item.icon}
										size={23}
									/>
								</View>
								<View className="gap-1">
									<BottomSheet.Title>{item.label}</BottomSheet.Title>
									<BottomSheet.Description
										ellipsizeMode="tail"
										numberOfLines={2}
									>
										{description}
									</BottomSheet.Description>
								</View>
							</View>
							<CloseButton
								accessibilityLabel="Close task requirements"
								className="h-10 w-10 rounded-full bg-surface"
								iconProps={{ color: foregroundColor, size: 22 }}
								onPress={() => onOpenChange(false)}
							/>
						</View>

						<ScrollView
							contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
							showsVerticalScrollIndicator={false}
							style={{ maxHeight: maxBodyHeight }}
						>
							{requirements.map((requirement) => (
								<StatusChecklistRequirementRow
									key={requirement.label}
									requirement={requirement}
								/>
							))}
						</ScrollView>

						<Button onPress={handlePrimaryAction} size="lg">
							<Button.Label>{primaryActionLabel}</Button.Label>
						</Button>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The lifecycle checklist matrix is intentionally kept together so stage rules stay easy to compare.
export function MainModules({ model }: { model: TripDashboardModel }) {
	const [activeChecklistItem, setActiveChecklistItem] =
		useState<StatusChecklistItem | null>(null);
	const documentCount =
		model.workspace.documents.length + model.workspace.vaultItems.length;
	const budgetDetail = `${formatMoney(model.budget.remaining, model.currency)} remaining - ${model.budget.status}`;
	const bookingCount = model.workspace.bookings.length;
	const hasBudget = Boolean(model.workspace.trip.budgetAmount);
	const status = model.workspace.trip.status;
	const hasTripBasics = Boolean(
		model.workspace.trip.title &&
			model.workspace.trip.destination &&
			model.workspace.trip.startDate &&
			model.workspace.trip.endDate
	);
	const hasItinerary = model.workspace.itineraryItems.length > 0;
	const hasItineraryDays = model.workspace.itineraryDays.length > 0;
	const hasCostedItineraryItems = model.workspace.itineraryItems.some(
		(item) => item.locationName && item.estimatedCost > 0
	);
	const hasBookingType = (types: readonly string[]) =>
		model.workspace.bookings.some((booking) => types.includes(booking.type));
	const confirmedBookings = model.workspace.bookings.filter(
		(booking) => booking.status === "confirmed"
	);
	const hasConfirmedBookingType = (types: readonly string[]) =>
		confirmedBookings.some((booking) => types.includes(booking.type));
	const hasConfirmedAccommodation = hasConfirmedBookingType([
		"hotel",
		"accommodation",
	]);
	const hasConfirmedActivity = hasConfirmedBookingType(["activity"]);
	const hasConfirmedTransport = hasConfirmedBookingType([
		"flight",
		"transport",
	]);
	const hasBookingProofs =
		model.workspace.vaultItems.some((item) => item.kind === "booking") ||
		(bookingCount > 0 && confirmedBookings.length === bookingCount);
	const hasDocumentUpload =
		model.workspace.documents.length > 0 ||
		model.workspace.vaultItems.some((item) => item.kind === "document");
	const hasReceiptUpload = model.workspace.vaultItems.some(
		(item) => item.kind === "receipt"
	);
	const isReadinessItemComplete = (category: string) => {
		const categoryItems = model.workspace.readinessItems.filter(
			(item) => item.category === category
		);

		return (
			categoryItems.length > 0 &&
			categoryItems.every(
				(item) => item.status === "done" || item.status === "ignored"
			)
		);
	};
	const hasActiveDocuments = documentCount > 0;
	const hasTodayPlan = Boolean(
		model.nowScheduledItem || model.nextScheduledItem || hasItinerary
	);
	const hasCompanions = model.workspace.companions.length > 0;
	const hasNotes = model.workspace.notes.length > 0;
	const hasTrackedSpend =
		model.workspace.expenses.length > 0 || model.budget.totalTrackedSpend > 0;
	const hasOpenWatchOutItems = model.watchOutItems.length > 0;
	const checklistItemsByKey = {
		activityBookings: {
			detail: hasConfirmedActivity
				? "Activity confirmations saved"
				: "Tours, tickets, or reservations pending",
			href: VIYA_ROUTES.tripBookings(model.tripId),
			icon: "ticket-outline" as const,
			isComplete: hasConfirmedActivity,
			label: "Book activities",
		},
		activeDocuments: {
			detail:
				documentCount === 1
					? "1 travel file ready"
					: `${documentCount} travel files ready`,
			href: VIYA_ROUTES.tripVault(model.tripId),
			icon: "documents-outline" as const,
			isComplete: hasActiveDocuments,
			label: "Keep tickets & docs handy",
		},
		alerts: {
			detail: hasOpenWatchOutItems
				? `${model.watchOutItems.length} items need attention`
				: "No active warnings",
			href: VIYA_ROUTES.tripReadiness(model.tripId),
			icon: "warning-outline" as const,
			isComplete: !hasOpenWatchOutItems,
			label: "Watch alerts",
		},
		archive: {
			detail: status === "archived" ? "Trip archived" : "Ready when done",
			href: VIYA_ROUTES.tripDashboard(model.tripId),
			icon: "archive-outline" as const,
			isComplete: status === "archived",
			label: "Archive trip",
		},
		accommodation: {
			detail: hasConfirmedAccommodation
				? "Stay confirmation saved"
				: "Hotel or stay pending",
			href: VIYA_ROUTES.tripBookings(model.tripId),
			icon: "bed-outline" as const,
			isComplete: hasConfirmedAccommodation,
			label: "Book accommodation",
		},
		bookings: {
			description:
				"Add the booking targets this trip needs before anyone leaves the planning phase.",
			detail:
				bookingCount === 1
					? "1 booking or transport item"
					: `${bookingCount} booking or transport items`,
			href: VIYA_ROUTES.tripBookings(model.tripId),
			icon: "briefcase-outline" as const,
			isComplete: bookingCount > 0,
			label: "Add booking targets",
			primaryActionLabel: "Manage booking targets",
			requirements: [
				{
					detail: hasBookingType(["hotel", "accommodation"])
						? "Stay target is in the trip."
						: "Add a hotel, stay, or accommodation target.",
					isComplete: hasBookingType(["hotel", "accommodation"]),
					label: "Stay coverage",
				},
				{
					detail: hasBookingType(["flight", "transport"])
						? "Transport target is in the trip."
						: "Add a flight, ferry, transfer, or local transport target.",
					isComplete: hasBookingType(["flight", "transport"]),
					label: "Transport coverage",
				},
				{
					detail: hasBookingType(["activity"])
						? "Activity target is in the trip."
						: "Add tours, tickets, reservations, or paid activities.",
					isComplete: hasBookingType(["activity"]),
					label: "Activity coverage",
				},
			],
		},
		bookingProofs: {
			detail: hasBookingProofs
				? "Confirmations linked"
				: "Upload booking confirmations",
			href: VIYA_ROUTES.tripVault(model.tripId),
			icon: "cloud-upload-outline" as const,
			isComplete: hasBookingProofs,
			label: "Attach confirmations",
		},
		budget: {
			detail: budgetDetail,
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "wallet-outline" as const,
			isComplete: hasBudget,
			label: "Set trip budget",
		},
		budgetReview: {
			detail: budgetDetail,
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "wallet-outline" as const,
			isComplete: hasBudget && model.budget.remaining >= 0,
			label: "Review budget",
		},
		companions: {
			description:
				"Keep the travel party, coordinators, and emergency contacts tied to this trip.",
			detail:
				model.workspace.companions.length === 1
					? "1 companion saved"
					: `${model.workspace.companions.length} companions saved`,
			href: VIYA_ROUTES.tripCompanions(model.tripId),
			icon: "people-outline" as const,
			isComplete: hasCompanions,
			label: "Add companions",
			primaryActionLabel: "Manage companions",
			requirements: [
				{
					detail: hasCompanions
						? "Travel party is saved."
						: "Add travelers, organizers, or emergency contacts.",
					isComplete: hasCompanions,
					label: "Travel party",
				},
			],
		},
		detailsBudget: {
			detail: hasBudget
				? `${model.tripWindow} - ${model.budget.status}`
				: `${model.tripWindow} - Set budget`,
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "map-outline" as const,
			isComplete: hasTripBasics && hasBudget,
			label: "Trip details & budget",
		},
		expenses: {
			detail: hasTrackedSpend ? "Spend is being tracked" : "No expenses logged",
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "receipt-outline" as const,
			isComplete: hasTrackedSpend,
			label: "Track expenses",
		},
		itinerary: {
			description:
				"Turn the trip profile into a day-by-day plan with timing, locations, and expected costs.",
			detail: `${model.workspace.itineraryItems.length} planned items`,
			href: VIYA_ROUTES.tripItinerary(model.tripId),
			icon: "calendar-outline" as const,
			isComplete: hasItinerary,
			label: "Build itinerary",
			primaryActionLabel: "Open itinerary",
			requirements: [
				{
					detail: hasItineraryDays
						? `${model.workspace.itineraryDays.length} days are outlined.`
						: "Create the daily structure for this trip.",
					isComplete: hasItineraryDays,
					label: "Day outline",
				},
				{
					detail: hasItinerary
						? `${model.workspace.itineraryItems.length} items are planned.`
						: "Add the key places, meals, transfers, and activities.",
					isComplete: hasItinerary,
					label: "Planned items",
				},
				{
					detail: hasCostedItineraryItems
						? "At least one item has location and cost context."
						: "Add locations and estimates so budget checks stay useful.",
					isComplete: hasCostedItineraryItems,
					label: "Locations and costs",
				},
			],
		},
		moments: {
			detail: `${model.workspace.moments.length} saved moments`,
			href: VIYA_ROUTES.tripMoments(model.tripId),
			icon: "images-outline" as const,
			isComplete: model.workspace.moments.length > 0,
			label: "Save moments",
		},
		notes: {
			description:
				"Save group decisions, constraints, reminders, and context that do not belong in the itinerary.",
			detail:
				model.workspace.notes.length === 1
					? "1 note saved"
					: `${model.workspace.notes.length} notes saved`,
			href: VIYA_ROUTES.tripNotes(model.tripId),
			icon: "document-text-outline" as const,
			isComplete: hasNotes,
			label: "Add trip notes",
			primaryActionLabel: "Manage notes",
			requirements: [
				{
					detail: hasNotes
						? "Trip context is saved."
						: "Add shared decisions, dietary notes, constraints, or reminders.",
					isComplete: hasNotes,
					label: "Shared context",
				},
			],
		},
		offline: {
			detail: hasActiveDocuments
				? "Important files are saved"
				: "Save files, maps, tickets, and screenshots",
			href: VIYA_ROUTES.tripVault(model.tripId),
			icon: "download-outline" as const,
			isComplete: hasActiveDocuments,
			label: "Prepare offline files",
		},
		packing: {
			detail: isReadinessItemComplete("packing")
				? "Packing list checked"
				: "Packing list still open",
			href: VIYA_ROUTES.tripReadiness(model.tripId),
			icon: "bag-check-outline" as const,
			isComplete: isReadinessItemComplete("packing"),
			label: "Pack essentials",
		},
		readiness: {
			detail: `${model.readiness.openCount} open items`,
			href: VIYA_ROUTES.tripReadiness(model.tripId),
			icon: "shield-checkmark-outline" as const,
			isComplete:
				model.readiness.openCount === 0 && model.readiness.score >= 90,
			label: "Clear readiness gaps",
		},
		recap: {
			detail: "Trip story and spend summary",
			href: VIYA_ROUTES.tripWrapped(model.tripId),
			icon: "share-social-outline" as const,
			isComplete: status === "completed" || status === "archived",
			label: "Generate recap",
		},
		safety: {
			detail: isReadinessItemComplete("safety")
				? "Emergency info checked"
				: "Emergency info still open",
			href: VIYA_ROUTES.tripReadiness(model.tripId),
			icon: "medical-outline" as const,
			isComplete: isReadinessItemComplete("safety"),
			label: "Add emergency info",
		},
		settleExpenses: {
			detail: hasTrackedSpend
				? `${formatMoney(model.budget.totalTrackedSpend, model.currency)} tracked`
				: "No spend recorded",
			href: VIYA_ROUTES.tripBudget(model.tripId),
			icon: "cash-outline" as const,
			isComplete: hasTrackedSpend,
			label: "Settle expenses",
		},
		story: {
			detail: "Review the trip story",
			href: VIYA_ROUTES.tripWrapped(model.tripId),
			icon: "share-social-outline" as const,
			isComplete: status === "completed" || status === "archived",
			label: "Review trip story",
		},
		travel: {
			detail: "Day-of guidance",
			href: VIYA_ROUTES.tripTravelMode(model.tripId),
			icon: "navigate-outline" as const,
			isComplete: status === "traveling",
			label: "Use Travel Mode",
		},
		todayPlan: {
			detail: hasTodayPlan
				? "Now and next are available"
				: "Add timed itinerary items",
			href: VIYA_ROUTES.tripItinerary(model.tripId),
			icon: "today-outline" as const,
			isComplete: hasTodayPlan,
			label: "Review today's plan",
		},
		transportBooking: {
			detail: hasConfirmedTransport
				? "Transport confirmation saved"
				: "Flight, ferry, or transfer pending",
			href: VIYA_ROUTES.tripBookings(model.tripId),
			icon: "airplane-outline" as const,
			isComplete: hasConfirmedTransport,
			label: "Book transport",
		},
		vault: {
			description:
				"Collect documents and uploads that support the planning phase requirements.",
			detail:
				documentCount === 1 ? "1 saved file" : `${documentCount} saved files`,
			href: VIYA_ROUTES.tripVault(model.tripId),
			icon: "folder-open-outline" as const,
			isComplete: documentCount > 0,
			label: "Add documents",
			primaryActionLabel: "Open documents",
			requirements: [
				{
					detail: hasDocumentUpload
						? "A travel document is saved."
						: "Upload IDs, visas, permits, or other travel documents.",
					isComplete: hasDocumentUpload,
					label: "Travel documents",
				},
				{
					detail: hasBookingProofs
						? "Booking confirmations are linked or complete."
						: "Upload confirmations once bookings are made externally.",
					isComplete: hasBookingProofs,
					label: "Booking confirmations",
				},
				{
					detail: hasReceiptUpload
						? "Receipt storage has started."
						: "Keep receipt uploads ready for budget reconciliation.",
					isComplete: hasReceiptUpload,
					label: "Receipts",
				},
			],
		},
	} satisfies Record<string, StatusChecklistItem>;
	const checklistItems = (() => {
		if (status === "traveling") {
			return [
				checklistItemsByKey.travel,
				checklistItemsByKey.todayPlan,
				checklistItemsByKey.activeDocuments,
				checklistItemsByKey.expenses,
				checklistItemsByKey.alerts,
			];
		}

		if (status === "completed" || status === "archived") {
			return [
				checklistItemsByKey.settleExpenses,
				checklistItemsByKey.moments,
				checklistItemsByKey.recap,
				checklistItemsByKey.archive,
			];
		}

		return [
			checklistItemsByKey.itinerary,
			checklistItemsByKey.bookings,
			checklistItemsByKey.vault,
			checklistItemsByKey.accommodation,
			checklistItemsByKey.transportBooking,
			checklistItemsByKey.activityBookings,
			checklistItemsByKey.bookingProofs,
			checklistItemsByKey.readiness,
			checklistItemsByKey.packing,
			checklistItemsByKey.safety,
			checklistItemsByKey.companions,
			checklistItemsByKey.notes,
			checklistItemsByKey.offline,
			checklistItemsByKey.budgetReview,
		];
	})();
	const completedItemCount = checklistItems.filter(
		(item) => item.isComplete
	).length;
	const completionPercentage = Math.round(
		(completedItemCount / checklistItems.length) * 100
	);
	const nextChecklistItem = checklistItems.find((item) => !item.isComplete);

	return (
		<View className="gap-3">
			<View className="gap-2 px-1 pb-1">
				<View className="flex-row items-center justify-between gap-3">
					<View className="min-w-0 flex-1 gap-1">
						<Text.Heading numberOfLines={1} type="h5" weight="bold">
							{nextChecklistItem?.label ?? "All core steps are complete"}
						</Text.Heading>
					</View>
					<View className="items-end">
						<View className="rounded-full bg-surface-secondary px-3 py-1">
							<Text color="muted" type="body-xs" weight="semibold">
								{completedItemCount}/{checklistItems.length}
							</Text>
						</View>
					</View>
				</View>
				<View className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
					<View
						className="h-full rounded-full"
						style={{
							backgroundColor:
								completedItemCount === checklistItems.length
									? "#30D158"
									: accentColor,
							width: `${completionPercentage}%`,
						}}
					/>
				</View>
			</View>
			<View className="gap-2">
				{checklistItems.map((item) => (
					<StatusChecklistRow
						detail={item.detail}
						icon={item.icon}
						isComplete={item.isComplete}
						key={item.label}
						label={item.label}
						onPress={() => setActiveChecklistItem(item)}
					/>
				))}
			</View>
			<PhaseTaskSheet
				item={activeChecklistItem}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setActiveChecklistItem(null);
					}
				}}
			/>
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
			className="min-w-[112px]"
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
