import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { Link, useRouter } from "expo-router";
import { Button, Spinner, Surface, Text } from "heroui-native";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { RouteHeader } from "@/src/components/navigation/route-header";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { formatMoney } from "./trip-dashboard-utils";
import { TripStatusPill } from "./trip-status-pill";
import { useTripIdParam } from "./use-trip-id-param";

const dayMs = 86_400_000;

const getTripDayCount = (startDate: string, endDate: string) => {
	const start = new Date(`${startDate}T00:00:00.000Z`);
	const end = new Date(`${endDate}T00:00:00.000Z`);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		return 1;
	}

	return Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMs) + 1);
};

const formatShortDate = (date: string) => {
	const parsedDate = new Date(`${date}T00:00:00.000Z`);

	if (Number.isNaN(parsedDate.getTime())) {
		return date;
	}

	return new Intl.DateTimeFormat(undefined, {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(parsedDate);
};

function RecapStat({
	detail,
	icon,
	label,
	value,
}: {
	detail?: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
	value: string;
}) {
	return (
		<Surface className="min-w-[47%] flex-1 gap-3 rounded-[24px] border border-border bg-surface p-4">
			<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
				<Ionicons color="#0A84FF" name={icon} size={18} />
			</View>
			<View className="gap-1">
				<Text color="muted" type="body-xs" weight="semibold">
					{label.toUpperCase()}
				</Text>
				<Text.Heading type="h4" weight="semibold">
					{value}
				</Text.Heading>
				{detail ? (
					<Text color="muted" type="body-sm">
						{detail}
					</Text>
				) : null}
			</View>
		</Surface>
	);
}

function RecapRow({
	detail,
	icon,
	label,
}: {
	detail?: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
}) {
	return (
		<View className="flex-row items-start gap-3 rounded-[22px] bg-surface-secondary p-4">
			<View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
				<Ionicons color="#0A84FF" name={icon} size={17} />
			</View>
			<View className="min-w-0 flex-1 gap-1">
				<Text type="body-sm" weight="bold">
					{label}
				</Text>
				{detail ? (
					<Text.Paragraph color="muted" type="body-sm">
						{detail}
					</Text.Paragraph>
				) : null}
			</View>
		</View>
	);
}

function RecapPill({ children }: { children: string }) {
	return (
		<View className="rounded-full bg-surface-secondary px-3 py-1.5">
			<Text color="muted" type="body-xs" weight="semibold">
				{children}
			</Text>
		</View>
	);
}

function HighlightRows({ moments }: { moments: Doc<"moments">[] }) {
	const highlights = moments.filter((moment) => moment.isHighlight).slice(0, 4);
	const visibleMoments =
		highlights.length > 0 ? highlights : moments.slice(0, 4);

	if (visibleMoments.length === 0) {
		return (
			<RecapRow
				detail="Save moments during or after the trip to build a richer recap."
				icon="images-outline"
				label="No moments captured yet"
			/>
		);
	}

	return (
		<>
			{visibleMoments.map((moment) => (
				<RecapRow
					detail={moment.note || moment.caption || moment.locationName}
					icon={moment.isHighlight ? "star-outline" : "image-outline"}
					key={moment._id}
					label={moment.title}
				/>
			))}
		</>
	);
}

export function TripRecapScreen() {
	const router = useRouter();
	const tripId = useTripIdParam();
	const workspace = useQuery(
		api.tripWorkspace.getTripWorkspace,
		tripId ? { tripId } : "skip"
	);
	const archiveTrip = useMutation(api.trips.archiveTrip);
	const updateTripLifecycle = useMutation(api.trips.updateTripLifecycle);
	const [pendingAction, setPendingAction] = useState<
		"archive" | "complete" | null
	>(null);

	const wallet = useMemo(() => {
		if (!workspace) {
			return null;
		}

		return getBudgetWalletSummary({
			bookings: workspace.bookings,
			budgetAmount: workspace.trip.budgetAmount,
			budgetCurrency: workspace.trip.budgetCurrency,
			expenses: workspace.expenses,
			itineraryItems: workspace.itineraryItems,
			remainingTripDays: getTripDayCount(
				workspace.trip.startDate,
				workspace.trip.endDate
			),
		});
	}, [workspace]);

	if (!tripId) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="Open a saved trip before reviewing its story."
					icon="sparkles-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined || !wallet) {
		return (
			<Container className="px-4 pb-28">
				<View className="items-center py-12">
					<Spinner />
				</View>
			</Container>
		);
	}

	const currency = workspace.trip.budgetCurrency ?? "PHP";
	const completedItems = workspace.itineraryItems.filter(
		(item) => item.status === "completed"
	).length;
	const totalItems = workspace.itineraryItems.length;
	const confirmedBookings = workspace.bookings.filter(
		(booking) => booking.status === "confirmed"
	).length;
	const savedDocumentCount =
		workspace.documents.filter((document) => document.status !== "missing")
			.length + workspace.vaultItems.length;
	const dateWindow = `${formatShortDate(workspace.trip.startDate)} - ${formatShortDate(
		workspace.trip.endDate
	)}`;

	const completeTrip = async () => {
		setPendingAction("complete");
		try {
			await updateTripLifecycle({ status: "completed", tripId });
		} finally {
			setPendingAction(null);
		}
	};

	const archiveCurrentTrip = async () => {
		setPendingAction("archive");
		try {
			await archiveTrip({ tripId });
			router.replace(VIYA_ROUTES.trips);
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<Container
			className="px-4 pb-28"
			scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
		>
			<View className="gap-4 pb-4">
				<RouteHeader
					eyebrow="Recap"
					icon="sparkles-outline"
					rightContent={<TripStatusPill status={workspace.trip.status} />}
					subtitle="Review highlights, spend, confirmations, and wrap the trip."
					title="Trip Story"
				/>

				<Surface className="gap-4 rounded-[30px] border border-border bg-surface p-5">
					<View className="gap-2">
						<View className="flex-row flex-wrap gap-2">
							<RecapPill>{workspace.trip.destination}</RecapPill>
							<RecapPill>{dateWindow}</RecapPill>
						</View>
						<Text.Heading type="h3" weight="semibold">
							{workspace.trip.title}
						</Text.Heading>
						<Text.Paragraph color="muted" type="body-sm">
							{workspace.trip.summary ||
								"Capture the trip outcome once itinerary, spend, and moments are ready."}
						</Text.Paragraph>
					</View>
					<View className="flex-row flex-wrap gap-3">
						<RecapStat
							detail={`${completedItems} completed`}
							icon="calendar-outline"
							label="Itinerary"
							value={totalItems ? `${completedItems}/${totalItems}` : "0"}
						/>
						<RecapStat
							detail={`${workspace.expenses.length} expenses logged`}
							icon="wallet-outline"
							label="Tracked spend"
							value={formatMoney(wallet.totalTrackedSpend, currency)}
						/>
						<RecapStat
							detail={`${workspace.moments.length} total moments`}
							icon="images-outline"
							label="Highlights"
							value={`${workspace.moments.filter((moment) => moment.isHighlight).length}`}
						/>
						<RecapStat
							detail={`${savedDocumentCount} docs or files`}
							icon="ticket-outline"
							label="Bookings"
							value={`${confirmedBookings}`}
						/>
					</View>
				</Surface>

				<Surface className="gap-3 rounded-[28px] border border-border bg-surface p-5">
					<View className="flex-row items-center justify-between gap-3">
						<View className="gap-1">
							<Text.Heading type="h5" weight="semibold">
								Moments
							</Text.Heading>
							<Text color="muted" type="body-sm">
								Highlights become the recap source.
							</Text>
						</View>
						<Link asChild href={VIYA_ROUTES.tripMoments(tripId)}>
							<Button size="sm" variant="secondary">
								<Button.Label>Open</Button.Label>
							</Button>
						</Link>
					</View>
					<HighlightRows moments={workspace.moments} />
				</Surface>

				<Surface className="gap-3 rounded-[28px] border border-border bg-surface p-5">
					<Text.Heading type="h5" weight="semibold">
						Wrap-up checklist
					</Text.Heading>
					<RecapRow
						detail={`${workspace.savedPlaces.length} saved places, ${workspace.itineraryDays.length} planned days`}
						icon="map-outline"
						label="Route and places"
					/>
					<RecapRow
						detail={`${confirmedBookings} confirmed bookings, ${savedDocumentCount} saved documents`}
						icon="file-tray-full-outline"
						label="Confirmations and documents"
					/>
					<RecapRow
						detail={`${formatMoney(wallet.remainingAmount, currency)} remaining from planned budget`}
						icon="cash-outline"
						label="Budget outcome"
					/>
				</Surface>

				<Surface className="gap-3 rounded-[28px] border border-border bg-surface p-5">
					<Text.Heading type="h5" weight="semibold">
						Trip lifecycle
					</Text.Heading>
					<Text.Paragraph color="muted" type="body-sm">
						Mark complete when the recap is ready. Archive hides the trip from
						active planning without deleting the history.
					</Text.Paragraph>
					<View className="flex-row flex-wrap gap-2">
						<Button
							className="flex-1"
							isDisabled={
								pendingAction !== null || workspace.trip.status === "completed"
							}
							onPress={() => {
								completeTrip().catch(() => undefined);
							}}
							variant="secondary"
						>
							{pendingAction === "complete" ? <Spinner size="sm" /> : null}
							<Button.Label>Mark complete</Button.Label>
						</Button>
						<Button
							className="flex-1"
							isDisabled={pendingAction !== null}
							onPress={() => {
								archiveCurrentTrip().catch(() => undefined);
							}}
							variant="tertiary"
						>
							{pendingAction === "archive" ? <Spinner size="sm" /> : null}
							<Button.Label>Archive</Button.Label>
						</Button>
					</View>
				</Surface>
			</View>
		</Container>
	);
}
