import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { Button, Chip, Spinner, Surface, Text } from "heroui-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";

import { useTripIdParam } from "./use-trip-id-param";

const formatCost = (amount: number, currency = "PHP") =>
	new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	}).format(amount);

export function TripItineraryScreen() {
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before viewing its itinerary."
					icon="calendar-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const { itineraryDays, itineraryItems } = workspace;

	if (itineraryDays.length === 0 && itineraryItems.length === 0) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					action={{
						label: "Review bookings",
					}}
					description="Create a Trip Blueprint or add booking confirmations to build the trip timeline."
					icon="calendar-outline"
					title="No itinerary yet"
				/>
				<Link asChild href={VIYA_ROUTES.tripBookings(tripId)}>
					<Button>
						<Button.Label>Review bookings</Button.Label>
					</Button>
				</Link>
			</Container>
		);
	}

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Plan"
					icon="calendar-outline"
					subtitle="Route, timing, buffers, and Viya reasoning from the saved trip."
					title="Itinerary"
				/>

				{itineraryDays.map((day) => {
					const dayItems = itineraryItems.filter(
						(item) => item.dayId === day._id
					);

					return (
						<Surface
							className="gap-4 rounded-[30px] border border-border bg-surface p-5"
							key={day._id}
						>
							<View className="flex-row items-start gap-3">
								<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
									<Ionicons color="#0A84FF" name="calendar" size={20} />
								</View>
								<View className="flex-1 gap-1">
									<Chip size="sm" variant="secondary">
										<Chip.Label>Day {day.dayNumber}</Chip.Label>
									</Chip>
									<Text type="body" weight="bold">
										{day.title}
									</Text>
									<Text color="muted" type="body-sm">
										{day.date} · {day.theme}
									</Text>
									<Text.Paragraph color="muted" type="body-sm">
										{day.summary}
									</Text.Paragraph>
								</View>
							</View>

							{dayItems.length === 0 ? (
								<Text color="muted" type="body-sm">
									No scheduled items yet.
								</Text>
							) : (
								<View className="gap-3">
									{dayItems.map((item) => (
										<Surface
											className="gap-2 rounded-[24px] bg-surface-secondary p-4"
											key={item._id}
										>
											<View className="flex-row flex-wrap gap-2">
												<Chip size="sm" variant="secondary">
													<Chip.Label>{item.category}</Chip.Label>
												</Chip>
												<Chip size="sm" variant="secondary">
													<Chip.Label>{item.status}</Chip.Label>
												</Chip>
											</View>
											<Text type="body-sm" weight="bold">
												{item.startTime} - {item.endTime} · {item.title}
											</Text>
											<Text color="muted" type="body-xs">
												{item.locationName}
											</Text>
											<Text.Paragraph color="muted" type="body-sm">
												{item.description}
											</Text.Paragraph>
											<Text color="muted" type="body-xs">
												{formatCost(item.estimatedCost)}
												{item.bookingId ? ` · Booking ${item.bookingId}` : ""}
											</Text>
											<Text.Paragraph color="muted" type="body-xs">
												{item.aiReason}
											</Text.Paragraph>
										</Surface>
									))}
								</View>
							)}
						</Surface>
					);
				})}
			</View>
		</Container>
	);
}
