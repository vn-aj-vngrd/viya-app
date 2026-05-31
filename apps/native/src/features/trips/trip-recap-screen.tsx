import { Ionicons } from "@expo/vector-icons";
import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import { getBudgetWalletSummary } from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { type Href, Link, useRouter } from "expo-router";
import { Button, Spinner, Surface, Text } from "heroui-native";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Share, View } from "react-native";

import { Container } from "@/components/container";
import { EmptyState } from "@/src/components/empty-state";
import { ScreenLoadingState } from "@/src/components/screen-loading-state";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { formatMoney } from "./trip-dashboard-utils";
import { TripModuleScreenFrame } from "./trip-module-floating-bar";
import { TripModuleManualEntryCard } from "./trip-module-manual-entry-card";
import { buildTripRecapShareMessage } from "./trip-recap-share";
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
	actionHref,
	actionLabel,
	detail,
	icon,
	label,
}: {
	actionHref?: Href;
	actionLabel?: string;
	detail?: string;
	icon: ComponentProps<typeof Ionicons>["name"];
	label: string;
}) {
	const actionContent =
		actionHref && actionLabel ? (
			<Link asChild href={actionHref}>
				<Button className="self-start" size="sm" variant="secondary">
					<Ionicons color="#0A84FF" name="open-outline" size={16} />
					<Button.Label>{actionLabel}</Button.Label>
				</Button>
			</Link>
		) : null;

	return (
		<View className="gap-3 rounded-[22px] bg-surface-secondary p-4">
			<View className="flex-row items-start gap-3">
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
			{actionContent}
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

function StoryFocus({
	actionHref,
	actionLabel,
	detail,
	label,
}: {
	actionHref?: Href;
	actionLabel?: string;
	detail: string;
	label: string;
}) {
	const actionContent =
		actionHref && actionLabel ? (
			<Link asChild href={actionHref}>
				<Button className="self-start" size="sm" variant="secondary">
					<Ionicons color="#0A84FF" name="open-outline" size={16} />
					<Button.Label>{actionLabel}</Button.Label>
				</Button>
			</Link>
		) : null;

	return (
		<View className="gap-3 rounded-[22px] bg-surface p-4">
			<Text color="muted" type="body-xs" weight="semibold">
				WRAP-UP FOCUS
			</Text>
			<View className="gap-1">
				<Text type="body-sm" weight="bold">
					{label}
				</Text>
				<Text.Paragraph color="muted" type="body-sm">
					{detail}
				</Text.Paragraph>
			</View>
			{actionContent}
		</View>
	);
}

function getStoryFocus({
	dayLinkedMomentCount,
	completedItems,
	highlightCount,
	missingDocumentCount,
	tripId,
	totalItems,
	unconfirmedBookings,
}: {
	dayLinkedMomentCount: number;
	completedItems: number;
	highlightCount: number;
	missingDocumentCount: number;
	tripId: Id<"trips">;
	totalItems: number;
	unconfirmedBookings: number;
}) {
	if (highlightCount === 0) {
		return {
			actionHref: VIYA_ROUTES.tripMoments(tripId),
			actionLabel: "Open moments",
			detail:
				"Mark at least one moment as a highlight so the recap has a story anchor.",
			label: "Choose a highlight",
		};
	}

	if (dayLinkedMomentCount === 0) {
		return {
			actionHref: VIYA_ROUTES.tripMoments(tripId),
			actionLabel: "Open moments",
			detail:
				"Assign key moments to itinerary days so the recap reads like a trip timeline.",
			label: "Link moments to days",
		};
	}

	if (totalItems > completedItems) {
		return {
			actionHref: VIYA_ROUTES.tripItinerary(tripId),
			actionLabel: "Open itinerary",
			detail: `${totalItems - completedItems} itinerary items still need completion before the trip story is clean.`,
			label: "Complete itinerary items",
		};
	}

	if (unconfirmedBookings > 0) {
		return {
			actionHref: VIYA_ROUTES.tripBookings(tripId),
			actionLabel: "Open bookings",
			detail: `${unconfirmedBookings} booking targets still need confirmation or proof.`,
			label: "Close booking proof",
		};
	}

	if (missingDocumentCount > 0) {
		return {
			actionHref: VIYA_ROUTES.tripVault(tripId),
			actionLabel: "Open files",
			detail: `${missingDocumentCount} travel documents are still marked missing.`,
			label: "Resolve missing documents",
		};
	}

	return {
		detail:
			"Core story inputs are ready. Mark the trip complete when the recap reads right.",
		label: "Ready to wrap",
	};
}

const getDayLabel = (days: Doc<"itineraryDays">[], dayId?: string) => {
	const day = days.find((itineraryDay) => itineraryDay._id === dayId);

	if (!day) {
		return "Unassigned";
	}

	return `Day ${day.dayNumber}`;
};

function HighlightRows({
	days,
	moments,
	tripId,
}: {
	days: Doc<"itineraryDays">[];
	moments: Doc<"moments">[];
	tripId: Id<"trips">;
}) {
	const highlights = moments.filter((moment) => moment.isHighlight).slice(0, 4);
	const visibleMoments =
		highlights.length > 0 ? highlights : moments.slice(0, 4);

	if (visibleMoments.length === 0) {
		return (
			<RecapRow
				actionHref={VIYA_ROUTES.tripMoments(tripId)}
				actionLabel="Add memory"
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
					actionHref={VIYA_ROUTES.tripMoments(tripId)}
					actionLabel="Open memory"
					detail={[
						getDayLabel(days, moment.dayId),
						moment.locationName,
						moment.note || moment.caption,
					]
						.filter(Boolean)
						.join(" · ")}
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
	const [lifecycleErrorMessage, setLifecycleErrorMessage] = useState<
		string | null
	>(null);
	const [isSharingRecap, setIsSharingRecap] = useState(false);

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

	if (workspace === null) {
		return (
			<Container className="px-4 pb-28">
				<EmptyState
					description="This trip was deleted or is no longer available."
					icon="sparkles-outline"
					title="Trip not found"
				/>
			</Container>
		);
	}

	if (workspace === undefined || !wallet) {
		return <ScreenLoadingState />;
	}

	const currency = workspace.trip.budgetCurrency ?? "PHP";
	const completedItems = workspace.itineraryItems.filter(
		(item) => item.status === "completed"
	).length;
	const totalItems = workspace.itineraryItems.length;
	const confirmedBookings = workspace.bookings.filter(
		(booking) => booking.status === "confirmed"
	).length;
	const unconfirmedBookings = workspace.bookings.length - confirmedBookings;
	const savedDocumentCount =
		workspace.documents.filter((document) => document.status !== "missing")
			.length + workspace.vaultItems.length;
	const missingDocumentCount = workspace.documents.filter(
		(document) => document.status === "missing"
	).length;
	const highlightCount = workspace.moments.filter(
		(moment) => moment.isHighlight
	).length;
	const dayLinkedMomentCount = workspace.moments.filter(
		(moment) => moment.dayId
	).length;
	const coveredStoryDayCount = new Set(
		workspace.moments
			.map((moment) => moment.dayId)
			.filter((dayId): dayId is string => Boolean(dayId))
	).size;
	const openStoryGaps =
		Math.max(totalItems - completedItems, 0) +
		unconfirmedBookings +
		missingDocumentCount +
		(highlightCount > 0 ? 0 : 1) +
		(dayLinkedMomentCount > 0 ? 0 : 1);
	const storyFocus = getStoryFocus({
		dayLinkedMomentCount,
		completedItems,
		highlightCount,
		missingDocumentCount,
		tripId,
		totalItems,
		unconfirmedBookings,
	});
	const dateWindow = `${formatShortDate(workspace.trip.startDate)} - ${formatShortDate(
		workspace.trip.endDate
	)}`;

	const completeTrip = async () => {
		setLifecycleErrorMessage(null);
		setPendingAction("complete");
		try {
			await updateTripLifecycle({ status: "completed", tripId });
		} catch {
			setLifecycleErrorMessage("Could not mark trip complete.");
		} finally {
			setPendingAction(null);
		}
	};

	const archiveCurrentTrip = async () => {
		setLifecycleErrorMessage(null);
		setPendingAction("archive");
		try {
			await archiveTrip({ tripId });
			router.replace(VIYA_ROUTES.trips);
		} catch {
			setLifecycleErrorMessage("Could not archive trip.");
		} finally {
			setPendingAction(null);
		}
	};
	const shareRecap = async () => {
		const highlightTitles = workspace.moments
			.filter((moment) => moment.isHighlight)
			.map((moment) => moment.title);

		setLifecycleErrorMessage(null);
		setIsSharingRecap(true);
		try {
			await Share.share({
				message: buildTripRecapShareMessage({
					completedItems,
					confirmedBookings,
					currency,
					dateWindow,
					destination: workspace.trip.destination,
					highlightTitles,
					remainingAmount: wallet.remainingAmount,
					savedDocumentCount,
					title: workspace.trip.title,
					totalItems,
					totalTrackedSpend: wallet.totalTrackedSpend,
				}),
				title: workspace.trip.title,
			});
		} catch {
			setLifecycleErrorMessage("Could not open the share sheet.");
		} finally {
			setIsSharingRecap(false);
		}
	};

	return (
		<TripModuleScreenFrame activeTab="recap" tripId={tripId}>
			<Container
				className="px-4 pb-28"
				scrollViewProps={{ contentInsetAdjustmentBehavior: "never" }}
			>
				<View className="gap-4 pb-4">
					<TripModuleManualEntryCard
						description="Review the trip story from saved itinerary items, moments, files, bookings, and spend."
						moduleLabel="recap"
						onPrimaryPress={() => {
							router.push(VIYA_ROUTES.tripMoments(tripId));
						}}
						onSecondaryPress={() => {
							shareRecap().catch(() => undefined);
						}}
						primaryActionIcon="images-outline"
						primaryActionLabel="Edit moments"
						secondaryActionIcon="share-outline"
						secondaryActionLabel="Share recap"
					/>
					{lifecycleErrorMessage ? (
						<Text className="text-danger" type="body-sm">
							{lifecycleErrorMessage}
						</Text>
					) : null}

					<Surface className="gap-4 rounded-[30px] bg-surface-secondary p-4">
						<View className="flex-row items-start justify-between gap-3">
							<View className="min-w-0 flex-1 gap-2">
								<View className="flex-row flex-wrap gap-2">
									<RecapPill>{workspace.trip.destination}</RecapPill>
									<RecapPill>{dateWindow}</RecapPill>
									<RecapPill>
										{openStoryGaps === 0
											? "Story ready"
											: `${openStoryGaps} story gaps`}
									</RecapPill>
								</View>
								<Text.Heading type="h3" weight="semibold">
									{workspace.trip.title}
								</Text.Heading>
								<Text.Paragraph color="muted" type="body-sm">
									{workspace.trip.summary ||
										"Capture the trip outcome once itinerary, spend, and moments are ready."}
								</Text.Paragraph>
							</View>
							<View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
								<Ionicons color="#0A84FF" name="sparkles-outline" size={20} />
							</View>
						</View>
						<StoryFocus
							actionHref={storyFocus.actionHref}
							actionLabel={storyFocus.actionLabel}
							detail={storyFocus.detail}
							label={storyFocus.label}
						/>
						<Button
							isDisabled={isSharingRecap}
							onPress={() => {
								shareRecap().catch(() => undefined);
							}}
							size="sm"
							variant="secondary"
						>
							{isSharingRecap ? <Spinner size="sm" /> : null}
							<Ionicons color="#0A84FF" name="share-outline" size={16} />
							<Button.Label>Share recap</Button.Label>
						</Button>
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
								detail={`${dayLinkedMomentCount} day-linked`}
								icon="images-outline"
								label="Highlights"
								value={`${highlightCount}`}
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
									Highlights become the recap source by trip day.
								</Text>
							</View>
							<Link asChild href={VIYA_ROUTES.tripMoments(tripId)}>
								<Button size="sm" variant="secondary">
									<Button.Label>Open</Button.Label>
								</Button>
							</Link>
						</View>
						<RecapRow
							actionHref={VIYA_ROUTES.tripMoments(tripId)}
							actionLabel="Review story coverage"
							detail={`${coveredStoryDayCount}/${workspace.itineraryDays.length} days have linked memory context`}
							icon="calendar-number-outline"
							label="Story coverage"
						/>
						<HighlightRows
							days={workspace.itineraryDays}
							moments={workspace.moments}
							tripId={tripId}
						/>
					</Surface>

					<Surface className="gap-3 rounded-[28px] border border-border bg-surface p-5">
						<Text.Heading type="h5" weight="semibold">
							Wrap-up checklist
						</Text.Heading>
						<RecapRow
							actionHref={VIYA_ROUTES.tripPlaces(tripId)}
							actionLabel="Open route"
							detail={`${workspace.savedPlaces.length} saved places, ${workspace.itineraryDays.length} planned days`}
							icon="map-outline"
							label="Route and places"
						/>
						<RecapRow
							actionHref={VIYA_ROUTES.tripVault(tripId)}
							actionLabel="Open files"
							detail={`${confirmedBookings} confirmed bookings, ${savedDocumentCount} saved documents`}
							icon="file-tray-full-outline"
							label="Confirmations and documents"
						/>
						<RecapRow
							actionHref={VIYA_ROUTES.tripBudget(tripId)}
							actionLabel="Open budget"
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
									pendingAction !== null ||
									workspace.trip.status === "completed"
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
		</TripModuleScreenFrame>
	);
}
