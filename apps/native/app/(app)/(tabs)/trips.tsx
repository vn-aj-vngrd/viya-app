import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { TRIP_STATUSES } from "@viya-app/domain";
import { usePaginatedQuery } from "convex/react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { BottomSheet } from "heroui-native";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	FlatList,
	type ListRenderItem,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import Animated, {
	Easing,
	FadeInDown,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import {
	AppText,
	Card,
	EmptyState,
	GlassIconButton,
	type IconName,
	ListGroup,
	ListRow,
	metrics,
	type Palette,
	PressableScale,
	radius,
	ScreenHeader,
	SheetHeader,
	spacing,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import { isDecorativeDestinationImageUrl } from "@/src/features/trips/trip-cover-image";
import {
	formatMoney,
	formatTripWindowWithDuration,
	getReadinessDisplay,
	getTravelerLabel,
} from "@/src/features/trips/trip-dashboard-utils";
import { getTripStatusPresentation } from "@/src/features/trips/trip-status-pill";

type Trip = Doc<"trips"> & {
	readinessItemCount?: number;
};
type PrimaryTripFilter = "all" | "completed" | "favorites" | "upcoming";
type UserFacingTripStatus = (typeof TRIP_STATUSES)[number];
type StatusTripFilter = `status:${UserFacingTripStatus}`;
type ActiveTripFilter = Exclude<PrimaryTripFilter, "all"> | StatusTripFilter;

const tripsPageSize = 8;
const skeletonRows = ["first", "second", "third"] as const;
const primaryTripFilters: Array<{
	icon: IconName;
	label: string;
	value: PrimaryTripFilter;
}> = [
	{ icon: "map-outline", label: "All", value: "all" },
	{ icon: "heart-outline", label: "Favorites", value: "favorites" },
	{ icon: "calendar-outline", label: "Upcoming", value: "upcoming" },
	{ icon: "checkmark-circle-outline", label: "Completed", value: "completed" },
];
const statusFilterOptions = TRIP_STATUSES.map((status) => ({
	status,
	value: `status:${status}` as StatusTripFilter,
}));

const isStatusTripFilter = (
	filter: ActiveTripFilter | undefined
): filter is StatusTripFilter =>
	!!filter && statusFilterOptions.some((option) => option.value === filter);

const getBudgetLabel = (trip: Trip) => {
	if (!trip.budgetAmount) {
		return "Not set";
	}

	return formatMoney(trip.budgetAmount, trip.budgetCurrency ?? "PHP");
};

// Titles default to "{destination} Trip", so the destination line usually just
// echoes the title. Only show it when it carries information the title doesn't.
const shouldShowDestinationLine = (title: string, destination: string) => {
	const normalizedDestination = destination.trim().toLowerCase();

	if (!normalizedDestination) {
		return false;
	}

	return !title.trim().toLowerCase().includes(normalizedDestination);
};

const TAB_BAR_CLEARANCE = 112;
const THUMB_SIZE = 84;
const SEARCH_HEIGHT = 44;
const SKELETON_PULSE_MS = 900;

function TripsSearchField({
	onChangeText,
	value,
}: {
	onChangeText: (value: string) => void;
	value: string;
}) {
	const { palette } = useUITheme();

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: spacing.sm,
				height: SEARCH_HEIGHT,
				paddingHorizontal: spacing.lg,
			}}
		>
			<Ionicons color={palette.inkSecondary} name="search" size={17} />
			<TextInput
				accessibilityLabel="Search trips"
				autoCapitalize="none"
				autoCorrect={false}
				clearButtonMode="while-editing"
				onChangeText={onChangeText}
				placeholder="Search trips"
				placeholderTextColor={palette.inkTertiary}
				returnKeyType="search"
				style={{ color: palette.ink, flex: 1, fontSize: 17 }}
				value={value}
			/>
		</View>
	);
}

function SkeletonBlock({
	height,
	width,
}: {
	height: number;
	width: number | `${number}%`;
}) {
	const { palette } = useUITheme();
	const opacity = useSharedValue(0.55);

	useEffect(() => {
		opacity.value = withRepeat(
			withTiming(1, {
				duration: SKELETON_PULSE_MS,
				easing: Easing.inOut(Easing.ease),
			}),
			-1,
			true
		);
	}, [opacity]);

	const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

	return (
		<Animated.View
			style={[
				{
					backgroundColor: palette.fill,
					borderRadius: radius.pill,
					height,
					width,
				},
				animatedStyle,
			]}
		/>
	);
}

function TripCardSkeleton() {
	return (
		<Card padding="md" style={{ gap: spacing.md }}>
			<View style={{ flexDirection: "row", gap: spacing.lg }}>
				<SkeletonBlock height={THUMB_SIZE} width={THUMB_SIZE} />
				<View style={{ flex: 1, gap: spacing.md, justifyContent: "center" }}>
					<SkeletonBlock height={16} width="75%" />
					<SkeletonBlock height={14} width="50%" />
					<SkeletonBlock height={14} width="65%" />
				</View>
			</View>
		</Card>
	);
}

function TripListSkeleton() {
	return (
		<View
			accessibilityLabel="Loading trips"
			accessibilityRole="progressbar"
			style={{ gap: spacing.md }}
		>
			{skeletonRows.map((row) => (
				<TripCardSkeleton key={row} />
			))}
		</View>
	);
}

function TripsEmptyState({
	hasSearch,
	onCreatePress,
}: {
	hasSearch: boolean;
	onCreatePress: () => void;
}) {
	return (
		<EmptyState
			action={
				hasSearch ? undefined : { label: "Create trip", onPress: onCreatePress }
			}
			description={
				hasSearch
					? "Try a destination, date, or status."
					: "Start a trip plan and keep every detail in one place."
			}
			icon={hasSearch ? "search" : "map-outline"}
			title={hasSearch ? "No matching trips" : "No trips yet"}
		/>
	);
}

function getActivePrimaryFilter(
	filters: readonly ActiveTripFilter[]
): PrimaryTripFilter {
	const [activeFilter] = filters;

	if (
		activeFilter === "favorites" ||
		activeFilter === "upcoming" ||
		activeFilter === "completed"
	) {
		return activeFilter;
	}

	return "all";
}

function getActiveStatusFilter(filters: readonly ActiveTripFilter[]) {
	const [activeFilter] = filters;

	return isStatusTripFilter(activeFilter) ? activeFilter : null;
}

function FilterPill({
	icon,
	isSelected,
	label,
	onPress,
	rightIcon,
}: {
	icon: IconName;
	isSelected: boolean;
	label: string;
	onPress: () => void;
	rightIcon?: IconName;
}) {
	const { palette } = useUITheme();
	const contentColor = isSelected ? palette.onPrimary : palette.ink;
	const hitSlop = (metrics.minTarget - metrics.chipHeight) / 2;

	return (
		<PressableScale
			accessibilityLabel={`Filter trips by ${label}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			haptic="selection"
			hitSlop={{ bottom: hitSlop, top: hitSlop }}
			onPress={onPress}
			scaleTo={0.97}
			style={{
				alignItems: "center",
				backgroundColor: isSelected ? palette.ink : palette.surface,
				borderRadius: radius.pill,
				flexDirection: "row",
				gap: 6,
				height: metrics.chipHeight,
				paddingHorizontal: spacing.md,
			}}
		>
			<Ionicons color={contentColor} name={icon} size={15} />
			<AppText
				style={{ color: contentColor, fontWeight: "500" }}
				variant="subhead"
			>
				{label}
			</AppText>
			{rightIcon ? (
				<Ionicons color={contentColor} name={rightIcon} size={13} />
			) : null}
		</PressableScale>
	);
}

function TripsFilterChips({
	onChange,
	onStatusPress,
	value,
}: {
	onChange: (value: ActiveTripFilter[]) => void;
	onStatusPress: () => void;
	value: ActiveTripFilter[];
}) {
	const activePrimaryFilter = getActivePrimaryFilter(value);
	const activeStatusFilter = getActiveStatusFilter(value);

	return (
		<ScrollView
			contentContainerStyle={{
				gap: spacing.sm,
				paddingHorizontal: spacing.screen,
			}}
			horizontal={true}
			keyboardShouldPersistTaps="handled"
			showsHorizontalScrollIndicator={false}
		>
			{primaryTripFilters.map((filter) => (
				<FilterPill
					icon={filter.icon}
					isSelected={
						activePrimaryFilter === filter.value && activeStatusFilter === null
					}
					key={filter.value}
					label={filter.label}
					onPress={() => {
						onChange(filter.value === "all" ? [] : [filter.value]);
					}}
				/>
			))}
			<FilterPill
				icon="options-outline"
				isSelected={activeStatusFilter !== null}
				label="Status"
				onPress={onStatusPress}
				rightIcon="chevron-down"
			/>
		</ScrollView>
	);
}

function StatusFilterSheet({
	isOpen,
	onOpenChange,
	onSelect,
	selectedFilter,
}: {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSelect: (value: StatusTripFilter | null) => void;
	selectedFilter: StatusTripFilter | null;
}) {
	const insets = useSafeAreaInsets();
	const { palette } = useUITheme();
	const checkmark = (
		<Ionicons color={palette.accent} name="checkmark" size={20} />
	);

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
						subtitle="Show trips at one specific lifecycle stage."
						title="Filter by status"
					/>
					<View
						style={{
							padding: spacing.lg,
							paddingBottom: Math.max(insets.bottom, spacing.lg),
						}}
					>
						<ListGroup>
							<ListRow
								accessibilityLabel="Show trips from any status"
								leading={
									<Ionicons
										color={palette.inkSecondary}
										name="layers-outline"
										size={22}
									/>
								}
								onPress={() => onSelect(null)}
								showChevron={false}
								subtitle="Return to the full trip list."
								title="Any status"
								trailing={selectedFilter === null ? checkmark : undefined}
							/>
							{statusFilterOptions.map((option) => {
								const presentation = getTripStatusPresentation(option.status);

								return (
									<ListRow
										accessibilityLabel={`Show ${presentation.label} trips`}
										key={option.value}
										leading={
											<Ionicons
												color={presentation.color}
												name={presentation.icon}
												size={22}
											/>
										}
										onPress={() => onSelect(option.value)}
										showChevron={false}
										subtitle={presentation.description}
										title={presentation.label}
										trailing={
											selectedFilter === option.value ? checkmark : undefined
										}
									/>
								);
							})}
						</ListGroup>
					</View>
				</BottomSheet.Content>
			</BottomSheet.Portal>
		</BottomSheet>
	);
}

function TripsHeader({
	filter,
	onFilterChange,
	onCreatePress,
	onSearchChange,
	onStatusPress,
	search,
}: {
	filter: ActiveTripFilter[];
	onFilterChange: (value: ActiveTripFilter[]) => void;
	onCreatePress: () => void;
	onSearchChange: (value: string) => void;
	onStatusPress: () => void;
	search: string;
}) {
	const insets = useSafeAreaInsets();

	return (
		<View
			style={{
				gap: spacing.md,
				paddingBottom: spacing.md,
				paddingTop: insets.top,
			}}
		>
			<ScreenHeader
				title="Trips"
				trailing={
					<GlassIconButton
						accessibilityLabel="Create trip"
						icon="add"
						onPress={onCreatePress}
					/>
				}
			/>
			<View style={{ paddingHorizontal: spacing.screen }}>
				<TripsSearchField onChangeText={onSearchChange} value={search} />
			</View>
			<TripsFilterChips
				onChange={onFilterChange}
				onStatusPress={onStatusPress}
				value={filter}
			/>
		</View>
	);
}

function TripThumbnail({
	replacementCoverImageUrl,
	trip,
}: {
	replacementCoverImageUrl?: string;
	trip: Trip;
}) {
	const { palette } = useUITheme();
	const destinationInitial = (
		trip.destination.trim().charAt(0) || "V"
	).toUpperCase();
	const coverImageUrl = isDecorativeDestinationImageUrl(trip.coverImageUrl)
		? replacementCoverImageUrl
		: (trip.coverImageUrl ?? replacementCoverImageUrl);

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.field,
				height: THUMB_SIZE,
				justifyContent: "center",
				overflow: "hidden",
				width: THUMB_SIZE,
			}}
		>
			{coverImageUrl ? (
				<Image
					accessibilityIgnoresInvertColors={true}
					cachePolicy="memory-disk"
					contentFit="cover"
					source={{ uri: coverImageUrl }}
					style={{ height: "100%", width: "100%" }}
					transition={240}
				/>
			) : (
				<AppText tone="secondary" variant="title">
					{destinationInitial}
				</AppText>
			)}
		</View>
	);
}

const readinessRingSize = 34;
const readinessRingStroke = 3.5;
const readinessRingRadius = (readinessRingSize - readinessRingStroke) / 2;
const readinessRingCircumference = 2 * Math.PI * readinessRingRadius;
const readinessRingCenter = readinessRingSize / 2;

const getReadinessTone = (
	progress: number,
	hasCoverage: boolean,
	palette: Palette
) => {
	if (!hasCoverage) {
		return palette.inkTertiary;
	}

	if (progress >= 70) {
		return palette.success;
	}

	if (progress >= 40) {
		return palette.warning;
	}

	return palette.danger;
};

function ReadinessRing({
	hasCoverage,
	progress,
}: {
	hasCoverage: boolean;
	progress: number;
}) {
	const { palette } = useUITheme();
	const tone = getReadinessTone(progress, hasCoverage, palette);
	const boundedProgress = Math.min(100, Math.max(0, Math.round(progress)));
	const dashOffset = readinessRingCircumference * (1 - boundedProgress / 100);

	return (
		<View
			style={{
				alignItems: "center",
				height: readinessRingSize,
				justifyContent: "center",
				width: readinessRingSize,
			}}
		>
			<Svg
				height={readinessRingSize}
				style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
				width={readinessRingSize}
			>
				<Circle
					cx={readinessRingCenter}
					cy={readinessRingCenter}
					fill="none"
					r={readinessRingRadius}
					stroke={palette.fill}
					strokeWidth={readinessRingStroke}
				/>
				{hasCoverage ? (
					<Circle
						cx={readinessRingCenter}
						cy={readinessRingCenter}
						fill="none"
						r={readinessRingRadius}
						stroke={tone}
						strokeDasharray={readinessRingCircumference}
						strokeDashoffset={dashOffset}
						strokeLinecap="round"
						strokeWidth={readinessRingStroke}
					/>
				) : null}
			</Svg>
			{hasCoverage && boundedProgress >= 100 ? (
				<Ionicons color={tone} name="checkmark" size={16} />
			) : null}
			{hasCoverage && boundedProgress < 100 ? (
				<AppText
					bold={true}
					style={{ color: tone, fontSize: 11, lineHeight: 14 }}
				>
					{boundedProgress}
				</AppText>
			) : null}
			{hasCoverage ? null : (
				<Ionicons color={tone} name="sparkles-outline" size={13} />
			)}
		</View>
	);
}

const cardEntranceDelayStep = 55;
const cardEntranceMaxStaggered = 6;

function TripRow({
	index,
	onPress,
	replacementCoverImageUrl,
	trip,
}: {
	index: number;
	onPress: (trip: Trip) => void;
	replacementCoverImageUrl?: string;
	trip: Trip;
}) {
	const readinessDisplay = getReadinessDisplay({
		itemCount: trip.readinessItemCount,
		score: trip.readinessScore,
	});
	const hasReadinessCoverage = readinessDisplay.value !== "Not checked";
	const hasBudget = Boolean(trip.budgetAmount);
	const budgetLabel = getBudgetLabel(trip);
	const travelerLabel = getTravelerLabel(trip.groupType);
	const tripWindow = formatTripWindowWithDuration({
		endDate: trip.endDate,
		startDate: trip.startDate,
	});
	const showDestinationLine = shouldShowDestinationLine(
		trip.title,
		trip.destination
	);
	const isFavorite = trip.isFavorite ?? false;
	const { palette } = useUITheme();

	return (
		<Animated.View
			entering={FadeInDown.duration(360).delay(
				Math.min(index, cardEntranceMaxStaggered) * cardEntranceDelayStep
			)}
		>
			<Card
				accessibilityLabel={`Open ${trip.title}`}
				onPress={() => onPress(trip)}
				padding="md"
				style={{ gap: spacing.md }}
			>
				<View style={{ flexDirection: "row", gap: spacing.lg }}>
					<TripThumbnail
						replacementCoverImageUrl={replacementCoverImageUrl}
						trip={trip}
					/>
					<View style={{ flex: 1, gap: 2, justifyContent: "center" }}>
						<View
							style={{
								alignItems: "center",
								flexDirection: "row",
								gap: spacing.sm,
							}}
						>
							<AppText numberOfLines={1} style={{ flex: 1 }} variant="headline">
								{trip.title}
							</AppText>
							{isFavorite ? (
								<Ionicons color={palette.accent} name="heart" size={16} />
							) : null}
						</View>
						{showDestinationLine ? (
							<AppText numberOfLines={1} tone="secondary" variant="subhead">
								{trip.destination}
							</AppText>
						) : null}
						<AppText numberOfLines={1} tone="secondary" variant="footnote">
							{tripWindow} · {travelerLabel}
						</AppText>
					</View>
				</View>
				<View
					style={{
						alignItems: "center",
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<View
						style={{
							alignItems: "center",
							flexDirection: "row",
							gap: spacing.md,
						}}
					>
						<ReadinessRing
							hasCoverage={hasReadinessCoverage}
							progress={readinessDisplay.progress}
						/>
						<View>
							<AppText bold={true} numberOfLines={1} variant="subhead">
								{readinessDisplay.detail}
							</AppText>
							<AppText tone="secondary" variant="footnote">
								Readiness
							</AppText>
						</View>
					</View>
					<View style={{ alignItems: "flex-end" }}>
						<AppText
							bold={true}
							numberOfLines={1}
							tone={hasBudget ? "ink" : "secondary"}
							variant="subhead"
						>
							{budgetLabel}
						</AppText>
						<AppText tone="secondary" variant="footnote">
							Budget
						</AppText>
					</View>
				</View>
			</Card>
		</Animated.View>
	);
}

function TripSeparator() {
	return <View style={{ height: spacing.md }} />;
}

export default function TripsScreen() {
	const router = useRouter();
	const { palette } = useUITheme();
	const [search, setSearch] = useState("");
	const [filters, setFilters] = useState<ActiveTripFilter[]>([]);
	const [isStatusSheetOpen, setIsStatusSheetOpen] = useState(false);
	const deferredSearch = useDeferredValue(search.trim());
	const activeStatusFilter = getActiveStatusFilter(filters);
	const queryArgs = useMemo(
		() => ({
			filters: filters.length > 0 ? filters : undefined,
			search: deferredSearch || undefined,
		}),
		[deferredSearch, filters]
	);
	const { loadMore, results, status } = usePaginatedQuery(
		api.trips.searchTrips,
		queryArgs,
		{ initialNumItems: tripsPageSize }
	);
	const isLoadingFirstPage = status === "LoadingFirstPage";
	const isLoadingMore = status === "LoadingMore";
	const canLoadMore = status === "CanLoadMore";
	const hasSearch = deferredSearch.length > 0;
	const destinationsNeedingCoverImages = useMemo(
		() =>
			Array.from(
				new Set(
					results
						.filter(
							(trip) =>
								!trip.coverImageUrl ||
								isDecorativeDestinationImageUrl(trip.coverImageUrl)
						)
						.map((trip) => trip.destination)
				)
			),
		[results]
	);
	const replacementCoverImageUrls = useDestinationImages(
		destinationsNeedingCoverImages
	);

	const handleManualTripPress = () => router.push(VIYA_ROUTES.newTrip);
	const handleStatusFilterSelect = (filter: StatusTripFilter | null) => {
		setFilters(filter ? [filter] : []);
		setIsStatusSheetOpen(false);
	};
	const handleTripPress = useCallback(
		(trip: Trip) => {
			router.push(VIYA_ROUTES.tripDashboard(trip._id));
		},
		[router]
	);
	const handleEndReached = () => {
		if (canLoadMore) {
			loadMore(tripsPageSize);
		}
	};
	const renderTrip: ListRenderItem<Trip> = ({ index, item }) => (
		<TripRow
			index={index}
			onPress={handleTripPress}
			replacementCoverImageUrl={replacementCoverImageUrls[item.destination]}
			trip={item}
		/>
	);

	return (
		<View style={{ backgroundColor: palette.canvas, flex: 1 }}>
			<TripsHeader
				filter={filters}
				onCreatePress={handleManualTripPress}
				onFilterChange={setFilters}
				onSearchChange={setSearch}
				onStatusPress={() => setIsStatusSheetOpen(true)}
				search={search}
			/>
			<FlatList
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: TAB_BAR_CLEARANCE,
					paddingHorizontal: spacing.screen,
					paddingTop: spacing.xs,
				}}
				contentInsetAdjustmentBehavior="automatic"
				data={results}
				ItemSeparatorComponent={TripSeparator}
				keyboardShouldPersistTaps="handled"
				keyExtractor={(item) => item._id}
				ListEmptyComponent={
					isLoadingFirstPage ? (
						<TripListSkeleton />
					) : (
						<TripsEmptyState
							hasSearch={hasSearch}
							onCreatePress={handleManualTripPress}
						/>
					)
				}
				ListFooterComponent={
					isLoadingMore ? (
						<View style={{ paddingTop: spacing.md }}>
							<TripCardSkeleton />
						</View>
					) : null
				}
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.45}
				renderItem={renderTrip}
			/>
			<StatusFilterSheet
				isOpen={isStatusSheetOpen}
				onOpenChange={setIsStatusSheetOpen}
				onSelect={handleStatusFilterSelect}
				selectedFilter={activeStatusFilter}
			/>
		</View>
	);
}
