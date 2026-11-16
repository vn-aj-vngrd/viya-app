import { api } from "@viya-app/backend/convex/_generated/api";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import { View } from "react-native";

import {
	EmptyState,
	haptic,
	ListGroup,
	metrics,
	ScreenShell,
	SecondaryButton,
	Segmented,
	spacing,
	useFeedback,
	useListEntrance,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useDestinationImages } from "@/src/features/home/use-destination-images";
import { isDecorativeDestinationImageUrl } from "@/src/features/trips/trip-cover-image";
import { TripListSkeleton } from "@/src/features/trips/trip-list-skeleton";
import { type Trip, TripRow } from "@/src/features/trips/trip-row";

const TRIPS_PAGE_SIZE = 12;

type Scope = "all" | "upcoming" | "past";

const scopeOptions = [
	{ label: "All", value: "all" },
	{ label: "Upcoming", value: "upcoming" },
	{ label: "Past", value: "past" },
] as const;

const scopeFilters = {
	all: undefined,
	past: ["completed"],
	upcoming: ["upcoming", "traveling"],
} as const;

const scopeEmpty = {
	past: {
		description:
			"Trips show here after their end date or when you mark them complete.",
		title: "No past trips",
	},
	upcoming: {
		description: "Trips that have not ended show here.",
		title: "No upcoming trips",
	},
} as const;

export default function TripsScreen() {
	const router = useRouter();
	const { confirm, showToast } = useFeedback();
	const entrance = useListEntrance();
	const toggleFavorite = useMutation(api.trips.toggleTripFavorite);
	const archiveTrip = useMutation(api.trips.archiveTrip);
	const restoreTrip = useMutation(api.trips.restoreTrip);
	const duplicateTrip = useMutation(api.trips.duplicateTrip);
	const deleteTrip = useMutation(api.trips.deleteTrip);
	const [search, setSearch] = useState("");
	const [scope, setScope] = useState<Scope>("all");
	const deferredSearch = useDeferredValue(search.trim());
	const queryArgs = useMemo(
		() => ({
			filters: scope === "all" ? undefined : [...scopeFilters[scope]],
			search: deferredSearch || undefined,
		}),
		[deferredSearch, scope]
	);
	const { loadMore, results, status } = usePaginatedQuery(
		api.trips.searchTrips,
		queryArgs,
		{ initialNumItems: TRIPS_PAGE_SIZE }
	);
	const isLoadingFirstPage = status === "LoadingFirstPage";
	const isEmpty = !isLoadingFirstPage && results.length === 0;
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

	const openNewTrip = () => router.push(VIYA_ROUTES.newTrip);
	const handleFavorite = async (trip: Trip) => {
		haptic("selection");
		try {
			await toggleFavorite({ tripId: trip._id });
		} catch {
			showToast({ message: "Could not update favorite.", tone: "error" });
		}
	};
	const handleArchive = async (trip: Trip) => {
		try {
			await archiveTrip({ tripId: trip._id });
			showToast({ message: "Trip archived.", tone: "success" });
		} catch {
			showToast({ message: "Could not archive trip.", tone: "error" });
		}
	};
	const handleRestore = async (trip: Trip) => {
		try {
			await restoreTrip({ tripId: trip._id });
			showToast({ message: "Trip restored.", tone: "success" });
		} catch {
			showToast({ message: "Could not restore trip.", tone: "error" });
		}
	};
	const handleDuplicate = async (trip: Trip) => {
		try {
			const { tripId } = await duplicateTrip({ tripId: trip._id });
			showToast({ message: "Trip duplicated.", tone: "success" });
			router.push(VIYA_ROUTES.tripDashboard(tripId));
		} catch {
			showToast({ message: "Could not duplicate trip.", tone: "error" });
		}
	};
	const handleDelete = async (trip: Trip) => {
		const isConfirmed = await confirm({
			confirmLabel: "Delete trip",
			destructive: true,
			message: `${trip.title} and everything saved in it will be removed.`,
			title: "Delete trip",
		});

		if (!isConfirmed) {
			return;
		}

		try {
			await deleteTrip({ tripId: trip._id });
			showToast({ message: "Trip deleted.", tone: "success" });
		} catch {
			showToast({ message: "Could not delete trip.", tone: "error" });
		}
	};

	const renderEmpty = () => {
		if (deferredSearch) {
			return (
				<EmptyState
					action={{ label: "Clear search", onPress: () => setSearch("") }}
					description="Try another trip name or destination."
					icon="search"
					title="No matching trips"
				/>
			);
		}
		if (scope !== "all") {
			return (
				<EmptyState
					action={{
						label: "Show all trips",
						onPress: () => setScope("all"),
					}}
					description={scopeEmpty[scope].description}
					icon="calendar-outline"
					title={scopeEmpty[scope].title}
				/>
			);
		}
		return (
			<EmptyState
				action={{ label: "New trip", onPress: openNewTrip }}
				description="Add where and when you are going, or ask Viya to draft a trip."
				icon="briefcase-outline"
				title="No trips yet"
			/>
		);
	};

	const hasResults = results.length > 0;

	return (
		<ScreenShell
			actions={[
				{
					icon: "add",
					key: "new",
					label: "New trip",
					onPress: openNewTrip,
					type: "button",
				},
			]}
			search={{ onChangeText: setSearch, placeholder: "Search trips" }}
			title="Trips"
			titleMode="large"
		>
			<Segmented
				accessibilityLabel="Show trips"
				onChange={setScope}
				options={scopeOptions}
				value={scope}
			/>
			{isLoadingFirstPage ? <TripListSkeleton /> : null}
			{isEmpty ? renderEmpty() : null}
			{hasResults ? (
				<View style={{ gap: spacing.md }}>
					<ListGroup
						separatorInset={spacing.lg + metrics.thumbnail + spacing.md}
					>
						{results.map((trip, index) => (
							<TripRow
								entering={entrance(index)}
								key={trip._id}
								onArchive={handleArchive}
								onDelete={handleDelete}
								onDuplicate={handleDuplicate}
								onFavorite={handleFavorite}
								onRestore={handleRestore}
								replacementCoverImageUrl={
									replacementCoverImageUrls[trip.destination]
								}
								trip={trip}
							/>
						))}
					</ListGroup>
					{status === "CanLoadMore" || status === "LoadingMore" ? (
						<SecondaryButton
							isPending={status === "LoadingMore"}
							label="Show more"
							onPress={() => loadMore(TRIPS_PAGE_SIZE)}
							variant="plain"
						/>
					) : null}
				</View>
			) : null}
		</ScreenShell>
	);
}
