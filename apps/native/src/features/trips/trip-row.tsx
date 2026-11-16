import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getTripCountdown,
	getTripDayCount,
	getTripTodayKey,
} from "@viya-app/domain";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import {
	ContextMenu,
	fadeOut,
	Icon,
	ListRow,
	layoutReflow,
	metrics,
	motion,
	radius,
	SwipeableRow,
	useUITheme,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { isDecorativeDestinationImageUrl } from "@/src/features/trips/trip-cover-image";
import {
	formatCount,
	formatTripCountdown,
	formatTripRange,
} from "@/src/lib/format";

/** A trip row, with the readiness snapshot `searchTrips` adds when present. */
export type Trip = Doc<"trips"> & {
	readinessActive?: number;
	readinessDone?: number;
	readinessPercent?: number | null;
};

const ACTIVE_PHASES = new Set(["during", "undated", "upcoming"]);

const THUMB_ICON_SIZE = 20;
const FAVORITE_ICON_SIZE = 13;

// Titles default to "{destination} Trip", so the destination line usually just
// echoes the title. Only show it when it carries information the title doesn't.
export const shouldShowDestinationLine = (
	title: string,
	destination: string
) => {
	const normalizedDestination = destination.trim().toLowerCase();

	if (!normalizedDestination) {
		return false;
	}

	return !title.trim().toLowerCase().includes(normalizedDestination);
};

export function TripThumbnail({
	replacementCoverImageUrl,
	trip,
}: {
	replacementCoverImageUrl?: string;
	trip: Trip;
}) {
	const { palette } = useUITheme();
	const coverImageUrl = isDecorativeDestinationImageUrl(trip.coverImageUrl)
		? replacementCoverImageUrl
		: (trip.coverImageUrl ?? replacementCoverImageUrl);

	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: palette.fill,
				borderRadius: radius.tile,
				height: metrics.thumbnail,
				justifyContent: "center",
				overflow: "hidden",
				width: metrics.thumbnail,
			}}
		>
			<Icon
				name="location-outline"
				size={THUMB_ICON_SIZE}
				tone="tertiary"
				weight="light"
			/>
			{coverImageUrl ? (
				<Image
					accessibilityIgnoresInvertColors={true}
					cachePolicy="memory-disk"
					contentFit="cover"
					source={{ uri: coverImageUrl }}
					style={StyleSheet.absoluteFill}
					transition={motion.duration.normal}
				/>
			) : null}
		</View>
	);
}

const getTripRowFacts = (trip: Trip) => {
	const days = getTripDayCount(trip.startDate, trip.endDate);
	const factsLine = [
		shouldShowDestinationLine(trip.title, trip.destination)
			? trip.destination
			: null,
		formatTripRange(trip.startDate, trip.endDate),
		days ? formatCount(days, "day") : null,
	]
		.filter(Boolean)
		.join(" · ");
	const countdown = getTripCountdown(trip, getTripTodayKey());
	const countdownLabel =
		countdown.phase === "undated" ? undefined : formatTripCountdown(countdown);
	const readinessActive = trip.readinessActive ?? 0;
	const readinessLine =
		ACTIVE_PHASES.has(countdown.phase) &&
		readinessActive > 0 &&
		trip.readinessPercent != null
			? `${trip.readinessPercent}% ready · ${trip.readinessDone ?? 0} of ${readinessActive} done`
			: null;

	return { countdownLabel, factsLine, readinessLine };
};

export function TripRow({
	entering,
	onArchive,
	onDelete,
	onDuplicate,
	onFavorite,
	onRestore,
	replacementCoverImageUrl,
	trip,
}: {
	entering?: ReturnType<typeof import("@/src/components/ui").enterRise>;
	onArchive: (trip: Trip) => void;
	onDelete: (trip: Trip) => void;
	onDuplicate?: (trip: Trip) => void;
	onFavorite: (trip: Trip) => void;
	onRestore?: (trip: Trip) => void;
	replacementCoverImageUrl?: string;
	trip: Trip;
}) {
	const isFavorite = trip.isFavorite ?? false;
	const isArchived = trip.status === "archived";
	const { countdownLabel, factsLine, readinessLine } = getTripRowFacts(trip);
	const subtitle = readinessLine ? `${factsLine}\n${readinessLine}` : factsLine;
	const accessibilityLabel = [
		trip.title,
		factsLine,
		countdownLabel,
		readinessLine,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<Animated.View entering={entering} exiting={fadeOut} layout={layoutReflow}>
			<SwipeableRow
				leadingActions={[
					{
						icon: "heart",
						key: "favorite",
						label: isFavorite ? "Unfavorite" : "Favorite",
						onPress: () => onFavorite(trip),
						tone: "accent",
					},
				]}
				trailingActions={[
					...(isArchived && onRestore
						? [
								{
									icon: "arrow-undo-outline" as const,
									key: "restore",
									label: "Restore",
									onPress: () => onRestore(trip),
									tone: "accent" as const,
								},
							]
						: []),
					...(isArchived
						? []
						: [
								{
									icon: "archive-outline" as const,
									key: "archive",
									label: "Archive",
									onPress: () => onArchive(trip),
									tone: "neutral" as const,
								},
							]),
					{
						icon: "trash-outline",
						key: "delete",
						label: "Delete",
						onPress: () => onDelete(trip),
						tone: "danger",
					},
				]}
			>
				<ContextMenu
					actions={[
						{
							key: "favorite",
							onPress: () => onFavorite(trip),
							sfSymbol: isFavorite ? "heart.slash" : "heart",
							title: isFavorite ? "Remove from favorites" : "Favorite",
						},
						...(isArchived && onRestore
							? [
									{
										key: "restore",
										onPress: () => onRestore(trip),
										sfSymbol: "arrow.uturn.backward" as const,
										title: "Restore",
									},
								]
							: []),
						...(onDuplicate
							? [
									{
										key: "duplicate",
										onPress: () => onDuplicate(trip),
										sfSymbol: "plus.square.on.square" as const,
										title: "Duplicate",
									},
								]
							: []),
						...(isArchived
							? []
							: [
									{
										key: "archive",
										onPress: () => onArchive(trip),
										sfSymbol: "archivebox" as const,
										title: "Archive",
									},
								]),
						{
							destructive: true,
							key: "delete",
							onPress: () => onDelete(trip),
							sfSymbol: "trash",
							title: "Delete",
						},
					]}
					href={VIYA_ROUTES.tripDashboard(trip._id)}
				>
					<ListRow
						accessibilityHint="Opens the trip. Actions are available."
						accessibilityLabel={accessibilityLabel}
						leading={
							<TripThumbnail
								replacementCoverImageUrl={replacementCoverImageUrl}
								trip={trip}
							/>
						}
						showChevron={true}
						subtitle={subtitle}
						subtitleLines={readinessLine ? 2 : 1}
						title={trip.title}
						titleLines={1}
						trailing={
							isFavorite ? (
								<Icon name="heart" size={FAVORITE_ICON_SIZE} tone="secondary" />
							) : undefined
						}
						value={countdownLabel}
					/>
				</ContextMenu>
			</SwipeableRow>
		</Animated.View>
	);
}
