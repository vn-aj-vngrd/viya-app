import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { TRIP_STATUSES } from "@viya-app/domain";
import { usePaginatedQuery } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { BottomSheet, Surface, Text, useThemeColor } from "heroui-native";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
	FlatList,
	ImageBackground,
	type ListRenderItem,
	Pressable,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Container } from "@/components/container";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { VIYA_ROUTES } from "@/src/constants/routes";
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
type PrimaryTripFilter = "all" | "completed" | "upcoming";
type UserFacingTripStatus = (typeof TRIP_STATUSES)[number];
type StatusTripFilter = `status:${UserFacingTripStatus}`;
type ActiveTripFilter = Exclude<PrimaryTripFilter, "all"> | StatusTripFilter;

const tripsPageSize = 8;
const skeletonRows = ["first", "second", "third"] as const;
const primaryTripFilters: Array<{
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	value: PrimaryTripFilter;
}> = [
	{ icon: "albums-outline", label: "All", value: "all" },
	{ icon: "calendar-outline", label: "Upcoming", value: "upcoming" },
	{ icon: "archive-outline", label: "Completed", value: "completed" },
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

function TripsSearchField({
	onChangeText,
	value,
}: {
	onChangeText: (value: string) => void;
	value: string;
}) {
	const foregroundColor = useThemeColor("foreground");
	const mutedColor = useThemeColor("muted");

	return (
		<View className="h-12 flex-row items-center gap-2 rounded-full border border-border bg-surface px-4">
			<Ionicons color={mutedColor} name="search" size={18} />
			<TextInput
				accessibilityLabel="Search trips"
				className="flex-1"
				onChangeText={onChangeText}
				placeholder="Search trips"
				placeholderTextColor={mutedColor}
				returnKeyType="search"
				style={{
					color: foregroundColor,
					fontSize: 15,
					fontWeight: "500",
				}}
				value={value}
			/>
		</View>
	);
}

function TripCardSkeleton() {
	return (
		<Surface className="rounded-[28px] border border-border bg-surface p-3">
			<View className="flex-row gap-3">
				<View className="h-[104px] w-[104px] rounded-[22px] bg-surface-secondary" />
				<View className="min-w-0 flex-1 justify-center gap-2.5 py-0.5">
					<View className="h-4 w-3/4 rounded-full bg-surface-secondary" />
					<View className="h-3.5 w-1/2 rounded-full bg-surface-secondary" />
					<View className="h-3.5 w-2/3 rounded-full bg-surface-secondary" />
				</View>
			</View>
			<View className="mt-3 flex-row items-center justify-between border-border border-t pt-3">
				<View className="flex-row items-center gap-2.5">
					<View className="h-[38px] w-[38px] rounded-full bg-surface-secondary" />
					<View className="gap-1.5">
						<View className="h-3.5 w-24 rounded-full bg-surface-secondary" />
						<View className="h-3 w-16 rounded-full bg-surface-secondary" />
					</View>
				</View>
				<View className="items-end gap-1.5">
					<View className="h-3.5 w-16 rounded-full bg-surface-secondary" />
					<View className="h-3 w-12 rounded-full bg-surface-secondary" />
				</View>
			</View>
		</Surface>
	);
}

function TripListSkeleton() {
	return (
		<View className="gap-3">
			{skeletonRows.map((row) => (
				<TripCardSkeleton key={row} />
			))}
		</View>
	);
}

function TripsEmptyState({ hasSearch }: { hasSearch: boolean }) {
	return (
		<View className="flex-1 items-center justify-center gap-3 px-8 py-16">
			<View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<Ionicons
					color="#0A84FF"
					name={hasSearch ? "search" : "add"}
					size={21}
				/>
			</View>
			<View className="items-center gap-1">
				<Text type="body" weight="bold">
					{hasSearch ? "No matching trips" : "No trips yet"}
				</Text>
				<Text className="text-center" color="muted" type="body-sm">
					{hasSearch
						? "Try a destination, date, or status."
						: "Use the plus button to start a trip."}
				</Text>
			</View>
		</View>
	);
}

function getActivePrimaryFilter(
	filters: readonly ActiveTripFilter[]
): PrimaryTripFilter {
	const [activeFilter] = filters;

	if (activeFilter === "upcoming" || activeFilter === "completed") {
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
	isIconOnly = false,
	isSelected,
	label,
	onPress,
	rightIcon,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	isIconOnly?: boolean;
	isSelected: boolean;
	label: string;
	onPress: () => void;
	rightIcon?: keyof typeof Ionicons.glyphMap;
}) {
	const foregroundColor = useThemeColor("foreground");
	const selectedColor = "#0A84FF";
	const contentColor = isSelected ? selectedColor : foregroundColor;

	return (
		<Pressable
			accessibilityLabel={`Filter trips by ${label}`}
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			className={[
				"h-11 flex-row items-center rounded-full border",
				isIconOnly ? "w-11 justify-center" : "gap-1.5 px-3",
			].join(" ")}
			onPress={onPress}
			style={({ pressed }) => ({
				backgroundColor: isSelected ? "rgba(10, 132, 255, 0.13)" : "#FFFFFF",
				borderColor: isSelected
					? "rgba(10, 132, 255, 0.24)"
					: "rgba(24, 24, 27, 0.04)",
				boxShadow: "none",
				transform: [{ scale: pressed ? 0.98 : 1 }],
			})}
		>
			<Ionicons color={contentColor} name={icon} size={16} />
			{isIconOnly ? null : (
				<Text style={{ color: contentColor }} type="body-sm" weight="semibold">
					{label}
				</Text>
			)}
			{rightIcon && !isIconOnly ? (
				<Ionicons color={contentColor} name={rightIcon} size={15} />
			) : null}
		</Pressable>
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
			horizontal={true}
			keyboardShouldPersistTaps="handled"
			showsHorizontalScrollIndicator={false}
		>
			<View className="flex-row gap-1.5 pr-4">
				{primaryTripFilters.map((filter) => {
					const isSelected =
						activePrimaryFilter === filter.value && activeStatusFilter === null;

					return (
						<FilterPill
							icon={filter.icon}
							isSelected={isSelected}
							key={filter.value}
							label={filter.label}
							onPress={() => {
								onChange(filter.value === "all" ? [] : [filter.value]);
							}}
						/>
					);
				})}
				<FilterPill
					icon="options-outline"
					isSelected={activeStatusFilter !== null}
					label="Status"
					onPress={onStatusPress}
					rightIcon="chevron-down"
				/>
			</View>
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
	const mutedColor = useThemeColor("muted");

	return (
		<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
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
						<View className="gap-1">
							<BottomSheet.Title>Filter by status</BottomSheet.Title>
							<BottomSheet.Description>
								Show trips at one specific lifecycle stage.
							</BottomSheet.Description>
						</View>

						<View className="gap-2">
							<Pressable
								accessibilityLabel="Show trips from any status"
								accessibilityRole="button"
								accessibilityState={{ selected: selectedFilter === null }}
								className="min-h-14 flex-row items-center gap-3 rounded-[20px] border border-border bg-surface px-3 py-2.5"
								onPress={() => onSelect(null)}
								style={({ pressed }) => ({
									transform: [{ scale: pressed ? 0.99 : 1 }],
								})}
							>
								<View className="h-9 w-9 items-center justify-center rounded-full bg-surface-secondary">
									<Ionicons
										color={mutedColor}
										name="layers-outline"
										size={18}
									/>
								</View>
								<View className="min-w-0 flex-1">
									<Text type="body-sm" weight="bold">
										Any status
									</Text>
									<Text color="muted" numberOfLines={1} type="body-xs">
										Return to the full trip list.
									</Text>
								</View>
								{selectedFilter === null ? (
									<Ionicons color="#0A84FF" name="checkmark" size={18} />
								) : null}
							</Pressable>

							{statusFilterOptions.map((option) => {
								const presentation = getTripStatusPresentation(option.status);
								const isSelected = selectedFilter === option.value;

								return (
									<Pressable
										accessibilityLabel={`Show ${presentation.label} trips`}
										accessibilityRole="button"
										accessibilityState={{ selected: isSelected }}
										className="min-h-14 flex-row items-center gap-3 rounded-[20px] border border-border bg-surface px-3 py-2.5"
										key={option.value}
										onPress={() => onSelect(option.value)}
										style={({ pressed }) => ({
											borderColor: isSelected
												? "rgba(10, 132, 255, 0.2)"
												: "rgba(24, 24, 27, 0.08)",
											transform: [{ scale: pressed ? 0.99 : 1 }],
										})}
									>
										<View
											className="h-9 w-9 items-center justify-center rounded-full"
											style={{
												backgroundColor: presentation.backgroundColor,
											}}
										>
											<Ionicons
												color={presentation.color}
												name={presentation.icon}
												size={18}
											/>
										</View>
										<View className="min-w-0 flex-1">
											<Text type="body-sm" weight="bold">
												{presentation.label}
											</Text>
											<Text color="muted" numberOfLines={1} type="body-xs">
												{presentation.description}
											</Text>
										</View>
										{isSelected ? (
											<Ionicons color="#0A84FF" name="checkmark" size={18} />
										) : null}
									</Pressable>
								);
							})}
						</View>
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
			className="gap-4 bg-background px-4 pb-3"
			style={{ paddingTop: Math.max(insets.top, 12) }}
		>
			<View className="flex-row items-center justify-between gap-4">
				<Text.Heading type="h2" weight="semibold">
					Trips
				</Text.Heading>
				<NavigationIconButton
					accessibilityLabel="Create trip"
					icon="add"
					onPress={onCreatePress}
				/>
			</View>
			<TripsSearchField onChangeText={onSearchChange} value={search} />
			<TripsFilterChips
				onChange={onFilterChange}
				onStatusPress={onStatusPress}
				value={filter}
			/>
		</View>
	);
}

const tripGradientPalettes = [
	{ chip: "rgba(255, 255, 255, 0.22)", colors: ["#5AB0FF", "#0A6CFF"] },
	{ chip: "rgba(255, 255, 255, 0.22)", colors: ["#3FD27E", "#16A34A"] },
	{ chip: "rgba(255, 255, 255, 0.24)", colors: ["#FFB259", "#F97316"] },
	{ chip: "rgba(255, 255, 255, 0.22)", colors: ["#C68BF0", "#8E44AD"] },
	{ chip: "rgba(255, 255, 255, 0.24)", colors: ["#34D6D6", "#0A9CA8"] },
] as const;

const getTripGradientPalette = (destination: string) => {
	const charCodeTotal = destination
		.split("")
		.reduce((total, character) => total + character.charCodeAt(0), 0);

	return tripGradientPalettes[charCodeTotal % tripGradientPalettes.length];
};

const chevronColor = "#C7C7CC";
const metaIconColor = "#71717A";

function TripThumbnail({ trip }: { trip: Trip }) {
	const palette = getTripGradientPalette(trip.destination);
	const destinationInitial = (
		trip.destination.trim().charAt(0) || "V"
	).toUpperCase();

	if (trip.coverImageUrl) {
		return (
			<View className="h-[104px] w-[104px] overflow-hidden rounded-[22px] bg-surface-secondary">
				<ImageBackground
					accessibilityIgnoresInvertColors={true}
					className="h-full w-full"
					imageStyle={{ borderRadius: 22 }}
					source={{ uri: trip.coverImageUrl }}
				>
					<LinearGradient
						colors={["transparent", "rgba(9, 12, 24, 0.72)"]}
						style={{ flex: 1, justifyContent: "flex-end", padding: 9 }}
					>
						<Text
							className="text-white"
							numberOfLines={1}
							type="body-xs"
							weight="bold"
						>
							{trip.destination}
						</Text>
					</LinearGradient>
				</ImageBackground>
			</View>
		);
	}

	return (
		<LinearGradient
			colors={palette.colors}
			end={{ x: 1, y: 1 }}
			start={{ x: 0, y: 0 }}
			style={{
				alignItems: "center",
				borderRadius: 22,
				height: 104,
				justifyContent: "center",
				width: 104,
			}}
		>
			<Text
				style={{ color: "#FFFFFF", fontSize: 38, lineHeight: 44 }}
				weight="bold"
			>
				{destinationInitial}
			</Text>
			<View
				className="absolute right-2.5 bottom-2.5 h-7 w-7 items-center justify-center rounded-full"
				style={{ backgroundColor: palette.chip }}
			>
				<Ionicons color="#FFFFFF" name="map" size={14} />
			</View>
		</LinearGradient>
	);
}

const readinessRingSize = 38;
const readinessRingStroke = 3.5;
const readinessRingRadius = (readinessRingSize - readinessRingStroke) / 2;
const readinessRingCircumference = 2 * Math.PI * readinessRingRadius;
const readinessRingCenter = readinessRingSize / 2;

const getReadinessTone = (progress: number, hasCoverage: boolean) => {
	if (!hasCoverage) {
		return "#A1A1AA";
	}

	if (progress >= 70) {
		return "#1CCB68";
	}

	if (progress >= 40) {
		return "#FF9F0A";
	}

	return "#FF3B30";
};

function ReadinessRing({
	hasCoverage,
	progress,
}: {
	hasCoverage: boolean;
	progress: number;
}) {
	const tone = getReadinessTone(progress, hasCoverage);
	const boundedProgress = Math.min(100, Math.max(0, Math.round(progress)));
	const dashOffset = readinessRingCircumference * (1 - boundedProgress / 100);

	return (
		<View
			className="items-center justify-center"
			style={{ height: readinessRingSize, width: readinessRingSize }}
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
					stroke="rgba(24, 24, 27, 0.08)"
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
				<Text style={{ color: tone, fontSize: 11 }} weight="bold">
					{boundedProgress}
				</Text>
			) : null}
			{hasCoverage ? null : (
				<Ionicons color={tone} name="sparkles-outline" size={13} />
			)}
		</View>
	);
}

function TripRow({
	onPress,
	trip,
}: {
	onPress: (trip: Trip) => void;
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
	const statusPresentation = getTripStatusPresentation(trip.status);

	return (
		<Pressable
			accessibilityLabel={`Open ${trip.title}`}
			accessibilityRole="button"
			onPress={() => onPress(trip)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.985 : 1 }],
			})}
		>
			<Surface
				className="rounded-[28px] border border-border bg-surface p-3"
				style={{ boxShadow: "0 12px 28px rgba(15, 23, 42, 0.07)" }}
			>
				<View className="flex-row gap-3">
					<TripThumbnail trip={trip} />
					<View className="min-w-0 flex-1 justify-center gap-2 py-0.5">
						<View className="flex-row items-center gap-2">
							<View
								className="h-2 w-2 rounded-full"
								style={{ backgroundColor: statusPresentation.color }}
							/>
							<Text
								className="min-w-0 flex-1"
								numberOfLines={1}
								type="body"
								weight="bold"
							>
								{trip.title}
							</Text>
							<Ionicons color={chevronColor} name="chevron-forward" size={16} />
						</View>
						<View className="flex-row items-center gap-1.5">
							<Ionicons
								color={metaIconColor}
								name="location-outline"
								size={13}
							/>
							<Text
								className="min-w-0 flex-1"
								numberOfLines={1}
								type="body-sm"
								weight="semibold"
							>
								{trip.destination}
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<View className="min-w-0 flex-1 flex-row items-center gap-1.5">
								<Ionicons
									color={metaIconColor}
									name="calendar-outline"
									size={13}
								/>
								<Text
									className="min-w-0 flex-1"
									color="muted"
									numberOfLines={1}
									type="body-xs"
								>
									{tripWindow}
								</Text>
							</View>
							<View className="flex-row items-center gap-1.5">
								<Ionicons
									color={metaIconColor}
									name="people-outline"
									size={13}
								/>
								<Text color="muted" numberOfLines={1} type="body-xs">
									{travelerLabel}
								</Text>
							</View>
						</View>
					</View>
				</View>
				<View className="mt-3 flex-row items-center justify-between border-border border-t pt-3">
					<View className="flex-row items-center gap-2.5">
						<ReadinessRing
							hasCoverage={hasReadinessCoverage}
							progress={readinessDisplay.progress}
						/>
						<View>
							<Text numberOfLines={1} type="body-sm" weight="bold">
								{readinessDisplay.detail}
							</Text>
							<Text color="muted" type="body-xs">
								Readiness
							</Text>
						</View>
					</View>
					<View className="items-end">
						<Text
							color={hasBudget ? undefined : "muted"}
							numberOfLines={1}
							type="body-sm"
							weight="bold"
						>
							{budgetLabel}
						</Text>
						<Text color="muted" type="body-xs">
							Budget
						</Text>
					</View>
				</View>
			</Surface>
		</Pressable>
	);
}
export default function TripsScreen() {
	const router = useRouter();
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
	const renderTrip: ListRenderItem<Trip> = ({ item }) => (
		<TripRow onPress={handleTripPress} trip={item} />
	);

	return (
		<Container includeBottomInset={false} isScrollable={false}>
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
					paddingBottom: 112,
					paddingHorizontal: 16,
					paddingTop: 4,
				}}
				contentInsetAdjustmentBehavior="automatic"
				data={results}
				ItemSeparatorComponent={() => <View className="h-3" />}
				keyboardShouldPersistTaps="handled"
				keyExtractor={(item) => item._id}
				ListEmptyComponent={
					isLoadingFirstPage ? (
						<TripListSkeleton />
					) : (
						<TripsEmptyState hasSearch={hasSearch} />
					)
				}
				ListFooterComponent={
					isLoadingMore ? (
						<View className="pt-3">
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
		</Container>
	);
}
