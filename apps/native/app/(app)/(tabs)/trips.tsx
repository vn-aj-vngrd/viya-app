import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { TRIP_STATUSES } from "@viya-app/domain";
import { usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { BottomSheet, Surface, Text, useThemeColor } from "heroui-native";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
	FlatList,
	type ListRenderItem,
	Pressable,
	ScrollView,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Container } from "@/components/container";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	TripCardMetaRow,
	TripCardTitleRow,
	TripMetricBlock,
	TripRouteLine,
} from "@/src/features/trips/trip-card-primitives";
import {
	formatMoney,
	formatTripWindowWithDuration,
	getReadinessDisplay,
	getTravelerLabel,
} from "@/src/features/trips/trip-dashboard-utils";
import {
	getTripStatusPresentation,
	TripStatusPill,
} from "@/src/features/trips/trip-status-pill";

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
		return "Set budget";
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

function SkeletonPassportFact({
	align = "flex-start",
}: {
	align?: "center" | "flex-end" | "flex-start";
}) {
	return (
		<View className="min-w-0 flex-1 gap-1.5" style={{ alignItems: align }}>
			<View className="h-3 w-12 rounded-full bg-surface-secondary" />
			<View className="h-3.5 w-16 rounded-full bg-surface-secondary" />
		</View>
	);
}

function TripCardSkeleton() {
	return (
		<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-4">
			<View className="gap-1.5">
				<View className="flex-row items-start gap-3">
					<View className="h-5 min-w-0 flex-1 rounded-full bg-surface-secondary" />
					<View className="h-7 w-24 rounded-full bg-accent-soft" />
				</View>
			</View>

			<View className="flex-row items-center gap-2.5">
				<View className="h-3.5 w-10 rounded-full bg-surface-secondary" />
				<View className="h-1.5 w-1.5 rounded-full bg-surface-secondary" />
				<View className="min-w-0 flex-1 flex-row items-center">
					<View className="h-px flex-1 bg-border" />
					<View className="h-7 w-7 rounded-full bg-accent-soft" />
					<View className="h-px flex-1 bg-border" />
				</View>
				<View className="h-1.5 w-1.5 rounded-full bg-surface-secondary" />
				<View className="h-3.5 w-8 rounded-full bg-surface-secondary" />
			</View>

			<View>
				<View className="h-3.5 w-48 rounded-full bg-surface-secondary" />
			</View>

			<View className="border-border border-t pt-3">
				<View className="flex-row gap-4">
					<SkeletonPassportFact />
					<SkeletonPassportFact align="flex-end" />
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
	const budgetLabel = getBudgetLabel(trip);
	const budgetDetail = trip.budgetAmount ? "Trip budget" : "No budget yet";
	const travelerLabel = getTravelerLabel(trip.groupType);
	const tripWindow = formatTripWindowWithDuration({
		endDate: trip.endDate,
		startDate: trip.startDate,
	});

	return (
		<Pressable
			accessibilityLabel={`Open ${trip.title}`}
			accessibilityRole="button"
			onPress={() => onPress(trip)}
			style={({ pressed }) => ({
				transform: [{ scale: pressed ? 0.99 : 1 }],
			})}
		>
			<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-4">
				<View className="gap-1.5">
					<TripCardTitleRow
						statusSlot={<TripStatusPill status={trip.status} />}
						title={trip.title}
					/>
				</View>
				<View className="gap-0.5">
					<TripRouteLine destination={trip.destination} />
					<TripCardMetaRow left={tripWindow} right={travelerLabel} />
				</View>

				<View className="border-border border-t pt-3">
					<View className="flex-row gap-4">
						<TripMetricBlock
							detail={readinessDisplay.detail}
							label="READINESS"
							progress={readinessDisplay.progress}
							tone="success"
							value={readinessDisplay.value}
						/>
						<TripMetricBlock
							align="flex-end"
							detail={budgetDetail}
							label="BUDGET"
							progress={0}
							value={budgetLabel}
						/>
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
		<Container className="pb-28" isScrollable={false}>
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
