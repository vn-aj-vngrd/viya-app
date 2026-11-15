import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getVaultCounts } from "@viya-app/domain";
import { useAction, useMutation } from "convex/react";
import { Image } from "expo-image";
import { type Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCompatibleBottomSheetAwareHandlers } from "@/src/components/bottom-sheet/use-compatible-bottom-sheet-aware-handlers";
import {
	DateRangeCalendar,
	type DateRangeValue,
} from "@/src/components/date/date-picker-field";
import {
	AppSheet,
	AppText,
	Chip,
	haptic,
	Icon,
	ListGroup,
	ListRow,
	metrics,
	motion,
	PressableScale,
	PrimaryButton,
	radius,
	SheetHeader,
	type ShellAction,
	spacing,
	useFeedback,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
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
import { shouldShowDestinationLine } from "@/src/features/trips/trip-row";
import {
	formatCount,
	formatDay,
	formatMoney,
	formatShortDate,
	formatTimeRange,
	formatTripRange,
} from "@/src/lib/format";
import type { TripDashboardModel } from "./trip-dashboard-types";
import { TripStatusText } from "./trip-status-pill";
import { TripTextField } from "./trip-text-field";

const viyaButtonNavigationThrottleMs = 800;
const coverAspectRatio = 16 / 10;
const profilePaceDetails = {
	balanced: "3 to 5 activities a day",
	light: "2 or 3 main activities a day",
	packed: "Make the most of every day",
} as const satisfies Record<TripPace, string>;

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
			? `Dates: ${formatTripRange(form.startDate.trim(), form.endDate.trim(), { year: "always" })}.`
			: null,
		`Travelers: ${getTripCreateOptionLabel("travelerType", selectedTravelerType)}${Number(form.travelerCount) > 0 ? `, ${Number(form.travelerCount)}` : ""}.`,
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

interface TripProfileForm {
	budgetAmount: string;
	destination: string;
	endDate: string;
	groupType: string;
	pace: string;
	startDate: string;
	title: string;
	travelerCount: string;
	travelStyle: string;
}

const getProfileForm = (trip: Doc<"trips">): TripProfileForm => ({
	budgetAmount: trip.budgetAmount?.toString() ?? "",
	destination: trip.destination,
	endDate: trip.endDate,
	groupType: trip.groupType,
	pace: trip.pace,
	startDate: trip.startDate,
	title: trip.title,
	travelerCount: trip.travelerCount?.toString() ?? "",
	travelStyle: trip.travelStyle,
});

// ---------------------------------------------------------------------------
// Edit trip sheet
// ---------------------------------------------------------------------------

function SheetField({
	keyboardType,
	label,
	onChangeText,
	placeholder,
	value,
}: {
	keyboardType?: "default" | "numeric";
	label: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	value: string;
}) {
	const { onBlur, onFocus } = useCompatibleBottomSheetAwareHandlers();

	return (
		<TripTextField
			keyboardType={keyboardType}
			label={label}
			onBlur={onBlur}
			onChangeText={onChangeText}
			onFocus={onFocus}
			placeholder={placeholder}
			value={value}
		/>
	);
}

function FormBlock({
	children,
	footer,
	title,
}: {
	children: ReactNode;
	footer?: string;
	title: string;
}) {
	return (
		<View style={{ gap: spacing.sm }}>
			<AppText
				accessibilityRole="header"
				style={{ paddingHorizontal: spacing.xs }}
				tone="secondary"
				variant="footnote"
			>
				{title}
			</AppText>
			{children}
			{footer ? (
				<AppText
					style={{ paddingHorizontal: spacing.xs }}
					tone="secondary"
					variant="footnote"
				>
					{footer}
				</AppText>
			) : null}
		</View>
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
	const [isDatesOpen, setIsDatesOpen] = useState(false);
	const dateRange: DateRangeValue = {
		end: form.endDate,
		start: form.startDate,
	};
	const selectedTravelerType = getSelectedTravelerType(form.groupType);
	const selectedStyles = getSelectedTripStyles(form.travelStyle);
	const selectedPace = getSelectedTripPace(form.pace);
	const datesValue =
		form.startDate && form.endDate
			? formatTripRange(form.startDate, form.endDate, { year: "always" })
			: "Not set";
	const showTravelerCount =
		selectedTravelerType !== "solo" && selectedTravelerType !== "couple";

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
		<AppSheet isOpen={isOpen} onOpenChange={onOpenChange} snapPoints={["92%"]}>
			<SheetHeader
				confirm={{
					isPending: isSaving,
					label: "Save",
					onPress: onSubmit,
				}}
				onClose={() => onOpenChange(false)}
				title="Edit trip"
			/>
			<BottomSheetScrollView
				contentContainerStyle={{
					gap: spacing.xl,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.md,
				}}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{errorMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						tone="danger"
						variant="subhead"
					>
						{errorMessage}
					</AppText>
				) : null}
				<View style={{ gap: spacing.lg }}>
					<SheetField
						label="Title"
						onChangeText={(value) => onUpdateForm("title", value)}
						placeholder="Siargao with friends"
						value={form.title}
					/>
					<SheetField
						label="Destination"
						onChangeText={(value) => onUpdateForm("destination", value)}
						placeholder="El Nido, Palawan"
						value={form.destination}
					/>
				</View>

				<View style={{ gap: spacing.md }}>
					<ListGroup>
						<ListRow
							accessibilityLabel={`Dates, ${datesValue}`}
							onPress={() => setIsDatesOpen((open) => !open)}
							title="Dates"
							trailing={
								<Icon
									name={isDatesOpen ? "chevron-up" : "chevron-down"}
									size={14}
									tone="tertiary"
									weight="semibold"
								/>
							}
							value={datesValue}
						/>
					</ListGroup>
					{isDatesOpen ? (
						<DateRangeCalendar
							onValueChange={(value) => {
								onUpdateForm("startDate", value.start);
								onUpdateForm("endDate", value.end);
							}}
							value={dateRange}
						/>
					) : null}
				</View>

				<FormBlock title="Travelers">
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						{travelerTypeOptions.map((option) => (
							<Chip
								key={option}
								label={getTripCreateOptionLabel("travelerType", option)}
								onPress={() => onUpdateForm("groupType", option)}
								selected={selectedTravelerType === option}
							/>
						))}
					</View>
					{showTravelerCount ? (
						<SheetField
							keyboardType="numeric"
							label="Number of travelers"
							onChangeText={(value) => onUpdateForm("travelerCount", value)}
							placeholder="4"
							value={form.travelerCount}
						/>
					) : null}
				</FormBlock>

				<FormBlock title="Style">
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						{tripStyleOptions.map((option) => (
							<Chip
								key={option}
								label={getTripCreateOptionLabel("style", option)}
								onPress={() => toggleTripStyle(option)}
								selected={selectedStyles.includes(option)}
							/>
						))}
					</View>
				</FormBlock>

				<FormBlock footer={profilePaceDetails[selectedPace]} title="Pace">
					<View
						style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
					>
						{paceOptions.map((option) => (
							<Chip
								key={option}
								label={getTripCreateOptionLabel("pace", option)}
								onPress={() => onUpdateForm("pace", option)}
								selected={selectedPace === option}
							/>
						))}
					</View>
				</FormBlock>

				<SheetField
					keyboardType="numeric"
					label="Budget (₱)"
					onChangeText={(value) => onUpdateForm("budgetAmount", value)}
					placeholder="25,000"
					value={form.budgetAmount}
				/>
			</BottomSheetScrollView>
		</AppSheet>
	);
}

// ---------------------------------------------------------------------------
// Header actions: Ask Viya + More
// ---------------------------------------------------------------------------

export function useTripHeaderActions(model: TripDashboardModel) {
	const router = useRouter();
	const { confirm, showToast } = useFeedback();
	const updateTripProfile = useMutation(api.trips.updateTripProfile);
	const toggleTripFavorite = useMutation(api.trips.toggleTripFavorite);
	const archiveTrip = useMutation(api.trips.archiveTrip);
	const deleteTrip = useMutation(api.trips.deleteTrip);
	const lastViyaPressRef = useRef(0);
	const { trip } = model.workspace;
	const isFavorite = trip.isFavorite ?? false;
	const isArchived = trip.status === "archived";
	const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(
		null
	);
	const [profileForm, setProfileForm] = useState<TripProfileForm>(() =>
		getProfileForm(trip)
	);

	const updateProfileForm = (key: keyof TripProfileForm, value: string) => {
		setProfileErrorMessage(null);
		setProfileForm((currentForm) => ({ ...currentForm, [key]: value }));
	};

	const openProfileSheet = () => {
		setProfileErrorMessage(null);
		setProfileForm(getProfileForm(trip));
		setIsProfileSheetOpen(true);
	};

	const handleSaveProfile = async () => {
		const title = profileForm.title.trim();
		const destination = profileForm.destination.trim();

		if (!title) {
			haptic("warning");
			setProfileErrorMessage("Add a trip title.");
			return;
		}

		const budgetAmount = Number(profileForm.budgetAmount.replaceAll(",", ""));
		const travelerCount = Math.floor(Number(profileForm.travelerCount));
		setProfileErrorMessage(null);
		setIsSavingProfile(true);
		try {
			await updateTripProfile({
				budgetAmount:
					Number.isFinite(budgetAmount) && budgetAmount > 0
						? budgetAmount
						: undefined,
				budgetCurrency: trip.budgetCurrency ?? "PHP",
				destination,
				endDate: profileForm.endDate.trim(),
				groupType: profileForm.groupType.trim() || "solo",
				pace: profileForm.pace.trim() || "balanced",
				startDate: profileForm.startDate.trim(),
				summary: getProfileTripSummary(profileForm),
				title,
				travelerCount:
					Number.isFinite(travelerCount) && travelerCount > 0
						? travelerCount
						: undefined,
				travelStyle: profileForm.travelStyle.trim() || "balanced",
				tripId: model.tripId,
			});
			haptic("success");
			setIsProfileSheetOpen(false);
		} catch {
			haptic("error");
			setProfileErrorMessage("Could not save the trip. Try again.");
		} finally {
			setIsSavingProfile(false);
		}
	};

	const handleFavoritePress = () => {
		haptic("selection");
		toggleTripFavorite({
			isFavorite: !isFavorite,
			tripId: model.tripId,
		}).catch(() => {
			showToast({ message: "Could not update favorite.", tone: "error" });
		});
	};

	const handleArchivePress = () => {
		archiveTrip({ tripId: model.tripId })
			.then(() => {
				haptic("success");
				showToast({ message: "Trip archived.", tone: "success" });
			})
			.catch(() => {
				showToast({ message: "Could not archive trip.", tone: "error" });
			});
	};

	const handleDeletePress = async () => {
		const isConfirmed = await confirm({
			confirmLabel: "Delete trip",
			destructive: true,
			message: "This removes the trip and everything saved in it.",
			title: "Delete this trip?",
		});

		if (!isConfirmed) {
			return;
		}

		try {
			await deleteTrip({ tripId: model.tripId });
			haptic("success");
			router.replace(VIYA_ROUTES.trips as Href);
		} catch {
			haptic("error");
			showToast({ message: "Could not delete trip.", tone: "error" });
		}
	};

	const handleViyaPress = () => {
		const now = Date.now();

		if (now - lastViyaPressRef.current < viyaButtonNavigationThrottleMs) {
			return;
		}

		lastViyaPressRef.current = now;
		router.push({
			params: {
				mode: "trip",
				returnTo: `/(app)/trips/${model.tripId}`,
				tripId: String(model.tripId),
				workspaceTab: "overview",
			},
			pathname: VIYA_ROUTES.ai,
		});
	};

	const actions: ShellAction[] = [
		{
			icon: "sparkles",
			key: "viya",
			label: "Ask Viya about this trip",
			onPress: handleViyaPress,
			type: "button",
		},
		{
			icon: "ellipsis-horizontal",
			items: [
				{
					icon: "create-outline",
					key: "edit",
					onPress: openProfileSheet,
					title: "Edit trip",
				},
				{
					icon: isFavorite ? "heart" : "heart-outline",
					key: "favorite",
					onPress: handleFavoritePress,
					title: isFavorite ? "Remove from favorites" : "Add to favorites",
				},
				{
					disabled: isArchived,
					icon: "archive-outline",
					key: "archive",
					onPress: handleArchivePress,
					title: isArchived ? "Archived" : "Archive",
				},
				{
					destructive: true,
					icon: "trash-outline",
					key: "delete",
					onPress: () => {
						handleDeletePress().catch(() => undefined);
					},
					title: "Delete trip",
				},
			],
			key: "more",
			label: "More trip options",
			type: "menu",
		},
	];

	const sheet = (
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
	);

	return { actions, openProfileSheet, sheet };
}

// ---------------------------------------------------------------------------
// Cover and summary
// ---------------------------------------------------------------------------

const getDestinationImageFallbackNames = (destination: string) => {
	const cleanedDestination = destination.trim();
	const locationName = cleanedDestination
		.replace(destinationParentheticalPattern, "")
		.split(",")[0]
		?.trim();

	return [cleanedDestination, locationName].filter(
		(name, index, values): name is string =>
			Boolean(name) && values.indexOf(name) === index
	);
};

/** Opaque cover photo (16:10) with status and facts underneath. No overlay. */
export function TripHero({
	model,
	onAddDestination,
}: {
	model: TripDashboardModel;
	onAddDestination: () => void;
}) {
	const { palette } = useUITheme();
	const { countdownLabel, phaseLabel, phaseStatus, tripFacts, workspace } =
		model;
	const { trip } = workspace;
	const fallbackNames = getDestinationImageFallbackNames(trip.destination);
	const needsCover =
		!trip.coverImageUrl || isDecorativeDestinationImageUrl(trip.coverImageUrl);
	const replacementUrls = useDestinationImages(needsCover ? fallbackNames : []);
	const replacementUrl = fallbackNames
		.map((name) => replacementUrls[name])
		.find(Boolean);
	const coverImageUrl = needsCover
		? replacementUrl
		: (trip.coverImageUrl ?? replacementUrl);
	const destinationLabel = trip.destination.trim() || trip.title;
	const hasDestination = trip.destination.trim().length > 0;

	return (
		<View style={{ gap: spacing.md }}>
			{coverImageUrl ? (
				<Image
					accessibilityIgnoresInvertColors={true}
					accessibilityLabel={`${destinationLabel} cover photo`}
					contentFit="cover"
					source={{ uri: coverImageUrl }}
					style={{
						aspectRatio: coverAspectRatio,
						backgroundColor: palette.fill,
						borderRadius: radius.card,
						width: "100%",
					}}
					transition={motion.duration.normal}
				/>
			) : null}
			<View style={{ gap: spacing.xs, paddingHorizontal: spacing.xs }}>
				{hasDestination &&
				shouldShowDestinationLine(trip.title, trip.destination) ? (
					<AppText numberOfLines={2} variant="headline">
						{destinationLabel}
					</AppText>
				) : null}
				<AppText tone="secondary" variant="subhead">
					{tripFacts}
				</AppText>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: spacing.sm,
					}}
				>
					<TripStatusText label={phaseLabel} status={phaseStatus} />
					{countdownLabel.startsWith(phaseLabel) ? null : (
						<AppText tone="secondary" variant="subhead">
							{`· ${countdownLabel}`}
						</AppText>
					)}
				</View>
			</View>
			{hasDestination ? null : (
				<ListGroup>
					<ListRow
						accessibilityLabel="Add a destination"
						leading={<Icon name="location-outline" tone="secondary" />}
						onPress={onAddDestination}
						title="Add a destination"
					/>
				</ListGroup>
			)}
		</View>
	);
}

// ---------------------------------------------------------------------------
// Next up
// ---------------------------------------------------------------------------

/** The single next useful thing. Hidden while traveling (Travel Mode leads). */
export function TripNextUp({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const { nextAction } = model;

	return (
		<ListGroup header="Next up">
			<ListRow
				accessibilityLabel={`${nextAction.title}. ${nextAction.description}`}
				leading={<Icon name={nextAction.icon} tone="secondary" />}
				onPress={() => router.push(nextAction.href)}
				subtitle={nextAction.description}
				title={nextAction.title}
			/>
		</ListGroup>
	);
}

/** While traveling: the stop happening now, or the next one. */
export function TripToday({ model }: { model: TripDashboardModel }) {
	const router = useRouter();
	const scheduled = model.nowScheduledItem ?? model.nextScheduledItem;

	if (!scheduled) {
		return null;
	}

	const { item } = scheduled;
	const isToday = scheduled.date === model.todayKey;

	return (
		<ListGroup header={model.nowScheduledItem ? "Now" : "Next"}>
			<ListRow
				accessibilityLabel={`${item.title}, ${formatTimeRange(item.startTime, item.endTime)}`}
				leading={<Icon name="time-outline" tone="secondary" />}
				onPress={() => router.push(VIYA_ROUTES.tripItinerary(model.tripId))}
				subtitle={
					[
						item.locationName || null,
						isToday || !scheduled.date ? null : formatDay(scheduled.date),
					]
						.filter(Boolean)
						.join(" · ") || undefined
				}
				title={item.title}
				value={formatTimeRange(item.startTime, item.endTime)}
			/>
		</ListGroup>
	);
}

// ---------------------------------------------------------------------------
// Module groups
// ---------------------------------------------------------------------------

function ModuleRow({
	href,
	icon,
	isMuted,
	subtitle,
	title,
	trailing,
	value,
}: {
	href: Href;
	icon: Parameters<typeof Icon>[0]["name"];
	isMuted?: boolean;
	subtitle?: string;
	title: string;
	trailing?: ReactNode;
	value?: string;
}) {
	const router = useRouter();

	return (
		<ListRow
			accessibilityLabel={value ? `${title}, ${value}` : title}
			leading={<Icon name={icon} tone={isMuted ? "tertiary" : "secondary"} />}
			onPress={() => router.push(href)}
			subtitle={subtitle}
			title={title}
			trailing={trailing}
			value={value}
		/>
	);
}

const getTravelersRow = (model: TripDashboardModel) => {
	const { travelerCount } = model;
	const added = model.workspace.companions.length;
	let value = "Not set";
	if (travelerCount === 1 && added === 0) {
		value = "Just you";
	} else if (travelerCount) {
		value = formatCount(travelerCount, "traveler");
	}
	let subtitle: string | undefined;
	if (added > 0) {
		subtitle = `${added} added`;
	} else if ((travelerCount ?? 0) > 1) {
		subtitle = "None added yet";
	}

	return { subtitle, value };
};

const getBudgetRow = ({ budget, currency }: TripDashboardModel) => {
	if (!budget.hasBudget) {
		return {
			subtitle:
				budget.spent > 0
					? `${formatMoney(budget.spent, currency)} spent`
					: undefined,
			value: "Not set",
		};
	}

	return {
		subtitle: `${formatMoney(budget.spent, currency)} of ${formatMoney(budget.amount, currency)} spent`,
		value:
			budget.over > 0
				? `Over by ${formatMoney(budget.over, currency)}`
				: `${formatMoney(budget.left, currency)} left`,
	};
};

const getItineraryValue = ({ itinerary }: TripDashboardModel) => {
	if (itinerary.stops === 0) {
		return "Nothing planned";
	}

	return itinerary.tripDays
		? `${itinerary.plannedDays} of ${itinerary.tripDays} days planned`
		: formatCount(itinerary.plannedDays, "day");
};

const getTravelModeValue = (model: TripDashboardModel) => {
	if (model.phase === "during") {
		return model.countdownLabel;
	}

	return model.phase === "upcoming" && model.workspace.trip.startDate
		? `Opens ${formatShortDate(model.workspace.trip.startDate)}`
		: undefined;
};

const getReadinessSubtitle = ({ readiness }: TripDashboardModel) => {
	if (readiness.active === 0) {
		return "Open to get your checklist";
	}

	const overdue =
		readiness.overdue > 0 ? ` · ${readiness.overdue} overdue` : "";

	return `${readiness.done} of ${readiness.active} done${overdue}`;
};

function PlanningGroup({
	model,
	onOpenDrafts,
}: {
	model: TripDashboardModel;
	onOpenDrafts: () => void;
}) {
	const { bookings, budget, itinerary, places, readiness, risks } = model;
	const { workspace, tripId } = model;
	const draftCount = workspace.agentDrafts.length;
	const gaps = getWorkspaceGaps(model);
	const budgetRow = getBudgetRow(model);
	const itineraryValue = getItineraryValue(model);
	const readinessSubtitle = getReadinessSubtitle(model);

	return (
		<ListGroup header="Planning">
			<ModuleRow
				href={VIYA_ROUTES.tripItinerary(tripId)}
				icon="calendar-outline"
				subtitle={
					itinerary.stops > 0 ? formatCount(itinerary.stops, "stop") : undefined
				}
				title="Itinerary"
				value={itineraryValue}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripPlaces(tripId)}
				icon="map-outline"
				subtitle={
					places.unassigned > 0
						? `${places.unassigned} not on a day`
						: undefined
				}
				title="Places"
				value={places.saved > 0 ? `${places.saved} saved` : "None saved"}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripBookings(tripId)}
				icon="ticket-outline"
				subtitle={
					bookings.nextToBookTitle
						? `Next: ${bookings.nextToBookTitle}`
						: undefined
				}
				title="Bookings"
				value={
					bookings.total > 0
						? `${bookings.booked} of ${bookings.total} booked`
						: "None added"
				}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripReadiness(tripId)}
				icon="shield-checkmark-outline"
				subtitle={readinessSubtitle}
				title="Readiness"
				value={
					readiness.percent === null ? "Not started" : `${readiness.percent}%`
				}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripBudget(tripId)}
				icon="wallet-outline"
				subtitle={budgetRow.subtitle}
				title="Budget"
				trailing={
					budget.over > 0 ? (
						<Icon name="alert-circle-outline" tone="danger" />
					) : undefined
				}
				value={budgetRow.value}
			/>
			{risks.open > 0 ? (
				<ModuleRow
					href={VIYA_ROUTES.tripRisks(tripId)}
					icon="warning-outline"
					subtitle={risks.topTitle ?? undefined}
					title="Risks"
					value={`${risks.open} open`}
				/>
			) : null}
			{gaps.length === 0 && draftCount === 0 ? null : (
				<ListRow
					accessibilityLabel={
						draftCount > 0 ? "Drafts from Viya" : "Fill gaps with Viya"
					}
					leading={<Icon name="sparkles-outline" tone="secondary" />}
					onPress={onOpenDrafts}
					subtitle={draftCount > 0 ? undefined : gaps.join(", ")}
					title={draftCount > 0 ? "Drafts from Viya" : "Fill gaps with Viya"}
					value={draftCount > 0 ? `${draftCount} to review` : undefined}
				/>
			)}
		</ListGroup>
	);
}

function PeopleGroup({ model }: { model: TripDashboardModel }) {
	const { vault } = model;
	const { notes } = model.workspace;
	const { tripId } = model;
	const travelers = getTravelersRow(model);

	return (
		<ListGroup header="People and files">
			<ModuleRow
				href={VIYA_ROUTES.tripCompanions(tripId)}
				icon="people-outline"
				subtitle={travelers.subtitle}
				title="Travelers"
				value={travelers.value}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripNotes(tripId)}
				icon="document-text-outline"
				subtitle={notes[0]?.title}
				title="Notes"
				value={notes.length > 0 ? formatCount(notes.length, "note") : "None"}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripVault(tripId)}
				icon="folder-open-outline"
				subtitle={
					vault.missingDocuments > 0
						? `${vault.missingDocuments} documents missing`
						: undefined
				}
				title="Vault"
				value={vault.files > 0 ? formatCount(vault.files, "file") : "Empty"}
			/>
		</ListGroup>
	);
}

function TripGroup({ model }: { model: TripDashboardModel }) {
	const { moments } = model.workspace;
	const { tripId } = model;
	const highlightCount = moments.filter((moment) => moment.isHighlight).length;
	const isCompleted = model.phase === "completed";
	const travelModeValue = getTravelModeValue(model);

	return (
		<ListGroup header="On the trip">
			<ModuleRow
				href={VIYA_ROUTES.tripTravelMode(tripId)}
				icon="navigate-outline"
				title="Travel Mode"
				value={travelModeValue}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripMoments(tripId)}
				icon="images-outline"
				subtitle={
					highlightCount > 0 ? `${highlightCount} highlighted` : undefined
				}
				title="Moments"
				value={
					moments.length > 0 ? formatCount(moments.length, "moment") : "None"
				}
			/>
			<ModuleRow
				href={VIYA_ROUTES.tripWrapped(tripId)}
				icon="share-outline"
				isMuted={!isCompleted}
				subtitle={
					isCompleted ? undefined : "Mark the trip complete to finish it"
				}
				title="Recap"
			/>
		</ListGroup>
	);
}

export function TripModuleGroups({
	model,
	onOpenDrafts,
}: {
	model: TripDashboardModel;
	onOpenDrafts: () => void;
}) {
	return (
		<>
			<PlanningGroup model={model} onOpenDrafts={onOpenDrafts} />
			<PeopleGroup model={model} />
			<TripGroup model={model} />
		</>
	);
}

// ---------------------------------------------------------------------------
// Viya drafts (autopilot)
// ---------------------------------------------------------------------------

const buildWorkspaceAutopilotPrompt = (model: TripDashboardModel) => {
	const { workspace } = model;
	const trip = workspace.trip;
	const tripLabel = trip.title.trim() || "this trip";
	const destination = trip.destination.trim() || "the destination";
	const budget = trip.budgetAmount
		? `${model.currency} ${trip.budgetAmount.toLocaleString("en-US")} budget`
		: "no confirmed budget yet";
	const vaultCoverageCount = getVaultCounts(
		workspace.vaultItems,
		workspace.documents
	).files;
	const coverage = [
		`${workspace.itineraryDays.length} itinerary days`,
		`${workspace.itineraryItems.length} itinerary stops`,
		`${vaultCoverageCount} Vault files`,
		`${workspace.bookings.length} bookings`,
		`${workspace.expenses.length} expenses`,
		`${workspace.risks.length} risks`,
		`${model.readiness.percent ?? 0}% readiness`,
	].join(", ");

	return [
		`Complete the workspace for ${tripLabel}.`,
		`Trip context: destination ${destination}; dates ${formatTripRange(trip.startDate, trip.endDate, { year: "always" })}; travelers ${model.travelerCount ?? "unknown"}; ${budget}.`,
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

/** Parts of the workspace that are still empty, in display order. */
const getWorkspaceGaps = (model: TripDashboardModel) => {
	const { workspace } = model;
	const gaps: string[] = [];

	if (workspace.itineraryItems.length === 0) {
		gaps.push("itinerary");
	}
	if (model.vault.files === 0) {
		gaps.push("Vault");
	}
	if (workspace.bookings.length === 0) {
		gaps.push("bookings");
	}
	if (!model.budget.hasBudget) {
		gaps.push("budget");
	}
	if ((model.readiness.percent ?? 0) < 80) {
		gaps.push("checklist");
	}

	return gaps;
};

function DraftActionButton({
	disabled,
	label,
	onPress,
	tone,
}: {
	disabled: boolean;
	label: string;
	onPress: () => void;
	tone: "accent" | "secondary";
}) {
	return (
		<PressableScale
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			haptic="selection"
			hitSlop={{ bottom: spacing.xs, top: spacing.xs }}
			onPress={onPress}
			style={{
				alignItems: "center",
				justifyContent: "center",
				minHeight: metrics.minTarget,
				opacity: disabled ? 0.4 : 1,
				paddingHorizontal: spacing.sm,
			}}
		>
			<AppText bold={tone === "accent"} tone={tone} variant="subhead">
				{label}
			</AppText>
		</PressableScale>
	);
}

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
	return (
		<View
			style={{
				gap: spacing.xs,
				paddingHorizontal: spacing.lg,
				paddingTop: spacing.md,
			}}
		>
			<AppText tone="secondary" variant="footnote">
				{tripAgentModuleLabels[draft.module]}
			</AppText>
			<AppText variant="callout">{draft.title}</AppText>
			<AppText numberOfLines={3} tone="secondary" variant="subhead">
				{draft.rationale}
			</AppText>
			<View
				style={{
					flexDirection: "row",
					gap: spacing.sm,
					justifyContent: "flex-end",
				}}
			>
				<DraftActionButton
					disabled={isPending}
					label="Dismiss"
					onPress={() => onDismiss(draft._id)}
					tone="secondary"
				/>
				<DraftActionButton
					disabled={isPending}
					label="Apply"
					onPress={() => onApply(draft._id)}
					tone="accent"
				/>
			</View>
		</View>
	);
}

export function TripDraftsSheet({
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
	const pendingDrafts = workspace.agentDrafts;
	const pendingDraftModules = new Set(
		pendingDrafts.map((draft) => draft.module)
	);
	const missingDraftModules = workspaceAutopilotDraftModules.filter(
		(config) => !pendingDraftModules.has(config.module)
	);
	const isWorkspaceReady = getWorkspaceGaps(model).length === 0;
	const visibleDrafts = isWorkspaceReady ? [] : pendingDrafts;
	const autopilotTitle = isWorkspaceReady
		? "Trip is ready"
		: "Complete this trip";
	const autopilotDescription = isWorkspaceReady
		? "Itinerary, Vault, bookings, budget and readiness are all in place."
		: `Still missing: ${getWorkspaceGaps(model).join(", ")}. Viya drafts them for you. Nothing changes until you apply a draft.`;
	const primaryActionLabel = isWorkspaceReady
		? "Ask Viya"
		: "Complete this trip";
	const openTripChat = () => {
		onOpenChange(false);
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
			setAgentMessage("Viya already drafted every section.");
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
			setAgentMessage("Drafts are ready to review.");
		} catch (error) {
			haptic("error");
			setAgentErrorMessage(
				error instanceof Error
					? error.message
					: "Viya could not draft this trip. Try again."
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
			setAgentMessage("Draft applied.");
		} catch (error) {
			setAgentErrorMessage(
				error instanceof Error ? error.message : "Could not apply the draft."
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
				error instanceof Error ? error.message : "Could not dismiss the draft."
			);
		} finally {
			setPendingDraftId(null);
		}
	};

	return (
		<AppSheet isOpen={isOpen} onOpenChange={onOpenChange} snapPoints={["75%"]}>
			<SheetHeader
				onClose={() => onOpenChange(false)}
				title="Drafts from Viya"
			/>
			<BottomSheetScrollView
				contentContainerStyle={{
					gap: spacing.lg,
					paddingBottom: Math.max(insets.bottom, spacing.lg),
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.md,
				}}
				showsVerticalScrollIndicator={false}
			>
				<View style={{ gap: spacing.xs }}>
					<AppText variant="heading">{autopilotTitle}</AppText>
					<AppText tone="secondary">{autopilotDescription}</AppText>
				</View>
				{agentMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						tone="secondary"
						variant="subhead"
					>
						{agentMessage}
					</AppText>
				) : null}
				{agentErrorMessage ? (
					<AppText
						accessibilityLiveRegion="polite"
						tone="danger"
						variant="subhead"
					>
						{agentErrorMessage}
					</AppText>
				) : null}
				{visibleDrafts.length > 0 ? (
					<ListGroup header="Review">
						{visibleDrafts.map((draft) => (
							<View key={draft._id} style={{ paddingBottom: spacing.xs }}>
								<TripAgentDraftRow
									draft={draft}
									isPending={pendingDraftId === draft._id}
									onApply={(draftId) => {
										handleApplyDraft(draftId).catch(() => undefined);
									}}
									onDismiss={(draftId) => {
										handleDismissDraft(draftId).catch(() => undefined);
									}}
								/>
							</View>
						))}
					</ListGroup>
				) : null}
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
					onPress={() => {
						handleGenerateDrafts().catch(() => undefined);
					}}
				/>
			</BottomSheetScrollView>
		</AppSheet>
	);
}
