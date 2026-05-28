import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { getBookingProgress, groupBookingsByType } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Chip, Spinner, Surface, Text } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { useTripIdParam } from "@/src/features/trips/use-trip-id-param";

import { BookingTargetCard } from "./booking-target-card";

export function BookingHubScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const bookings = useQuery(
		api.bookings.listTripBookings,
		tripId ? { tripId } : "skip"
	);
	const updateBookingStatus = useMutation(api.bookings.updateBookingStatus);
	const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(
		null
	);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before reviewing booking targets."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	const progress = getBookingProgress(bookings ?? []);
	const groupedBookings = groupBookingsByType(bookings ?? []);

	const updateStatus = async (
		booking: Doc<"bookings">,
		status: "bookedExternally" | "confirmed"
	) => {
		setUpdatingBookingId(booking._id);
		try {
			await updateBookingStatus({ bookingId: booking._id, status });
		} finally {
			setUpdatingBookingId(null);
		}
	};
	const bookingsContent = (() => {
		if (bookings === undefined) {
			return (
				<View className="items-center py-8">
					<Spinner />
				</View>
			);
		}

		if (bookings.length === 0) {
			return (
				<EmptyState
					action={{
						label: "Open Viya",
						onPress: () => router.push(VIYA_ROUTES.viya),
					}}
					description="Create a Trip Blueprint to seed external booking targets."
					icon="ticket-outline"
					title="No booking targets"
				/>
			);
		}

		return (
			<View className="gap-5">
				{groupedBookings.map((group) => (
					<View className="gap-3" key={group.type}>
						<Text color="muted" type="body-xs" weight="semibold">
							{group.type.toUpperCase()}
						</Text>
						{group.items.map((booking) => (
							<BookingTargetCard
								booking={booking}
								isUpdating={updatingBookingId === booking._id}
								key={booking._id}
								onMarkBooked={(item) => {
									updateStatus(item, "bookedExternally").catch(() => undefined);
								}}
								onMarkConfirmed={(item) => {
									updateStatus(item, "confirmed").catch(() => undefined);
								}}
								onUploadConfirmation={() =>
									router.push(VIYA_ROUTES.tripVault(tripId))
								}
							/>
						))}
					</View>
				))}
			</View>
		);
	})();

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Book"
					icon="ticket-outline"
					subtitle="Book through your preferred provider. Viya does not process payments in the MVP."
					title="Booking Hub"
				/>

				<Surface className="gap-3 rounded-[30px] border border-border bg-surface p-5">
					<View className="flex-row flex-wrap gap-2">
						<Chip size="sm" variant="secondary">
							<Chip.Label>
								{progress.confirmed}/{progress.total} confirmed
							</Chip.Label>
						</Chip>
						<Chip size="sm" variant="secondary">
							<Chip.Label>{progress.remaining} remaining</Chip.Label>
						</Chip>
					</View>
					<Text.Paragraph color="muted" type="body-sm">
						Update booking status as you reserve externally, then upload
						confirmations through TripSync.
					</Text.Paragraph>
				</Surface>

				{bookingsContent}
			</View>
		</Container>
	);
}
