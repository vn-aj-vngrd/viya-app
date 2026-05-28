import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Surface, TagGroup, Text, useThemeColor } from "heroui-native";
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
import {
	formatReadableTripDateRange,
	getDateRangeDurationDays,
} from "@/src/components/date/date-format-utils";
import { NavigationIconButton } from "@/src/components/navigation/navigation-icon-button";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { ManualTripCreateSheet } from "@/src/features/trips/manual-trip-create-sheet";

type Trip = Doc<"trips">;
type ActiveTripFilter = Exclude<TripFilter, "all">;
type TripFilter =
	| "all"
	| "completed"
	| "needsReadiness"
	| "planning"
	| "ready"
	| "upcoming";

const tripsPageSize = 8;
const destinationCodePattern = /[^A-Z]/g;
const skeletonRows = ["first", "second", "third"] as const;
const tripFilters: Array<{
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	value: TripFilter;
}> = [
	{ icon: "albums-outline", label: "All", value: "all" },
	{ icon: "calendar-outline", label: "Upcoming", value: "upcoming" },
	{ icon: "pencil-outline", label: "Planning", value: "planning" },
	{ icon: "shield-outline", label: "Needs check", value: "needsReadiness" },
	{ icon: "checkmark-circle-outline", label: "Ready", value: "ready" },
	{ icon: "archive-outline", label: "Completed", value: "completed" },
];

const getTripDurationLabel = (startDate: string, endDate: string) => {
	const durationDays = getDateRangeDurationDays(startDate, endDate);

	if (!durationDays) {
		return "TBD";
	}

	return `${durationDays} ${durationDays === 1 ? "day" : "days"}`;
};

const getDestinationCode = (destination: string) => {
	const letters = destination.toUpperCase().replace(destinationCodePattern, "");

	if (letters.length >= 3) {
		return letters.slice(0, 3);
	}

	return (letters || "TBD").padEnd(3, "X").slice(0, 3);
};

const getBudgetLabel = (trip: Trip) => {
	if (!trip.budgetAmount) {
		return "Budget TBD";
	}

	return `${trip.budgetCurrency ?? "PHP"} ${trip.budgetAmount.toLocaleString()}`;
};

const toTitleCase = (value: string) =>
	value
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

const passportValueTextStyle = {
	fontFamily: "Menlo",
} as const;

function PassportFact({
	align = "flex-start",
	label,
	value,
}: {
	align?: "center" | "flex-end" | "flex-start";
	label: string;
	value: string;
}) {
	return (
		<View className="min-w-0 flex-1 gap-1" style={{ alignItems: align }}>
			<Text color="muted" type="body-xs" weight="semibold">
				{label}
			</Text>
			<Text
				numberOfLines={1}
				style={passportValueTextStyle}
				type="body-xs"
				weight="bold"
			>
				{value}
			</Text>
		</View>
	);
}

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
		<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
			<View className="gap-2.5 px-3.5 pt-3.5 pb-2.5">
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

				<View className="gap-1.5">
					<View className="flex-row items-start gap-3">
						<View className="h-4.5 min-w-0 flex-1 rounded-full bg-surface-secondary" />
						<View className="h-7 w-24 rounded-full bg-accent-soft" />
					</View>
					<View className="h-3.5 w-40 rounded-full bg-surface-secondary" />
				</View>
			</View>

			<View
				className="border-border border-t px-3.5 py-2.5"
				style={{ borderStyle: "dashed" }}
			>
				<View className="flex-row">
					<SkeletonPassportFact />
					<SkeletonPassportFact align="center" />
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

function TripsFilterChips({
	onChange,
	value,
}: {
	onChange: (value: ActiveTripFilter[]) => void;
	value: ActiveTripFilter[];
}) {
	const [accentSoftForegroundColor, fieldForegroundColor] = useThemeColor([
		"accent-soft-foreground",
		"field-foreground",
	]);
	const selectedKeys =
		value.length > 0 ? new Set<string>(value) : new Set<string>(["all"]);

	return (
		<TagGroup
			onSelectionChange={(keys) => {
				const nextFilters = Array.from(keys).filter(
					(key): key is ActiveTripFilter =>
						key !== "all" && tripFilters.some((item) => item.value === key)
				);

				if (keys.has("all") && value.length > 0) {
					onChange([]);
					return;
				}

				onChange(nextFilters);
			}}
			selectedKeys={selectedKeys}
			selectionMode="multiple"
			size="md"
			variant="surface"
		>
			<ScrollView
				horizontal={true}
				keyboardShouldPersistTaps="handled"
				showsHorizontalScrollIndicator={false}
			>
				<TagGroup.List className="flex-row gap-2 pr-4">
					{tripFilters.map((filter) => (
						<TagGroup.Item id={filter.value} key={filter.value}>
							{({ isSelected }) => (
								<>
									<Ionicons
										color={
											isSelected
												? accentSoftForegroundColor
												: fieldForegroundColor
										}
										name={filter.icon}
										size={14}
									/>
									<TagGroup.ItemLabel>{filter.label}</TagGroup.ItemLabel>
								</>
							)}
						</TagGroup.Item>
					))}
				</TagGroup.List>
			</ScrollView>
		</TagGroup>
	);
}

function TripsHeader({
	filter,
	onFilterChange,
	onCreatePress,
	onSearchChange,
	search,
}: {
	filter: ActiveTripFilter[];
	onFilterChange: (value: ActiveTripFilter[]) => void;
	onCreatePress: () => void;
	onSearchChange: (value: string) => void;
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
			<TripsFilterChips onChange={onFilterChange} value={filter} />
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
	const readinessLabel = toTitleCase(
		trip.readinessScore > 0 ? `${trip.readinessScore}% ready` : "Not checked"
	);
	const statusLabel = toTitleCase(
		trip.status === "draft" ? "Planning" : trip.status
	);
	const budgetLabel = getBudgetLabel(trip);
	const destinationCode = getDestinationCode(trip.destination);
	const durationLabel = getTripDurationLabel(trip.startDate, trip.endDate);
	const tripWindow = formatReadableTripDateRange({
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
			<Surface className="overflow-hidden rounded-[26px] border border-border bg-surface">
				<View className="gap-2.5 px-3.5 pt-3.5 pb-2.5">
					<View className="flex-row items-center gap-2.5">
						<Text type="body-xs" weight="bold">
							HOME
						</Text>
						<View className="h-1.5 w-1.5 rounded-full bg-accent" />
						<View className="min-w-0 flex-1 flex-row items-center gap-0">
							<View className="h-px flex-1 bg-border" />
							<View className="h-7 w-7 items-center justify-center rounded-full bg-accent-soft">
								<Ionicons color="#0A84FF" name="airplane" size={15} />
							</View>
							<View className="h-px flex-1 bg-border" />
						</View>
						<View className="h-1.5 w-1.5 rounded-full bg-border" />
						<View className="items-end">
							<Text numberOfLines={1} type="body-xs" weight="bold">
								{destinationCode}
							</Text>
						</View>
					</View>

					<View className="gap-1.5">
						<View className="flex-row items-start gap-3">
							<Text
								className="min-w-0 flex-1"
								numberOfLines={2}
								type="body"
								weight="bold"
							>
								{trip.title}
							</Text>
							<View className="rounded-full bg-accent-soft px-2.5 py-1">
								<Text type="body-xs" weight="semibold">
									{statusLabel}
								</Text>
							</View>
						</View>
						<Text color="muted" numberOfLines={1} type="body-sm">
							{tripWindow}
						</Text>
					</View>
				</View>

				<View
					className="border-border border-t px-3.5 py-2.5"
					style={{ borderStyle: "dashed" }}
				>
					<View className="flex-row">
						<PassportFact label="TRIP" value={durationLabel} />
						<PassportFact align="center" label="READY" value={readinessLabel} />
						<PassportFact align="flex-end" label="BUDGET" value={budgetLabel} />
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
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
	const deferredSearch = useDeferredValue(search.trim());
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

	const handleManualTripPress = () => setIsCreateSheetOpen(true);
	const handlePlanTripPress = () => {
		setIsCreateSheetOpen(false);
		router.push({
			params: { mode: "plan" },
			pathname: "/(app)/(tabs)/viya",
		});
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
			<ManualTripCreateSheet
				isOpen={isCreateSheetOpen}
				onCreated={(tripId) => {
					router.push(VIYA_ROUTES.tripDashboard(tripId));
				}}
				onOpenChange={setIsCreateSheetOpen}
				onPlanWithViya={handlePlanTripPress}
			/>
		</Container>
	);
}
