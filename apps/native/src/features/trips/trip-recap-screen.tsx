import { api } from "@viya-app/backend/convex/_generated/api";
import type { Doc } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getBookingCounts,
	getBudgetWalletSummary,
	getPlaceCounts,
	getTripDayCount,
	getTripPhase,
	getVaultCounts,
} from "@viya-app/domain";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Share, View } from "react-native";
import {
	AppText,
	Icon,
	ListGroup,
	ListRow,
	PrimaryButton,
	ScreenShell,
	spacing,
	useFeedback,
} from "@/src/components/ui";
import { VIYA_ROUTES } from "@/src/constants/routes";
import { FormError } from "@/src/features/bookings/module-kit";
import {
	formatCount,
	formatMoney,
	formatShortDate,
	formatTripRange,
	toLocalDateKey,
} from "@/src/lib/format";
import { buildTripRecapShareMessage } from "./trip-recap-share";
import { useTripIdParam } from "./use-trip-id-param";

const MAX_HIGHLIGHTS = 5;

const getDayLabel = (days: Doc<"itineraryDays">[], dayId?: string) => {
	const day = days.find((itineraryDay) => itineraryDay._id === dayId);

	return day ? `Day ${day.dayNumber}` : undefined;
};

function RecapStat({ label, value }: { label: string; value: string }) {
	return (
		<View style={{ flexBasis: "45%", flexGrow: 1, gap: 2 }}>
			<AppText variant="heading">{value}</AppText>
			<AppText tone="secondary" variant="footnote">
				{label}
			</AppText>
		</View>
	);
}

function WrapUpRow({
	detail,
	isDone,
	onPress,
	title,
}: {
	detail: string;
	isDone: boolean;
	onPress: () => void;
	title: string;
}) {
	return (
		<ListRow
			accessibilityLabel={`${title}, ${isDone ? "done" : "needs attention"}. ${detail}`}
			leading={
				<Icon
					name={isDone ? "checkmark-circle" : "ellipse-outline"}
					size={22}
					tone={isDone ? "success" : "tertiary"}
				/>
			}
			onPress={onPress}
			subtitle={detail}
			title={title}
		/>
	);
}

function LifecycleGroup({
	isCompleted,
	onArchive,
	onComplete,
	pendingAction,
}: {
	isCompleted: boolean;
	onArchive: () => void;
	onComplete: () => void;
	pendingAction: "archive" | "complete" | null;
}) {
	const isIdle = pendingAction === null;

	return (
		<ListGroup
			footer={
				isCompleted
					? undefined
					: "Archiving removes the trip from active planning. History is kept."
			}
		>
			<ListRow
				onPress={isCompleted || !isIdle ? undefined : onComplete}
				showChevron={false}
				title="Mark complete"
				trailing={
					pendingAction === "complete" ? (
						<ActivityIndicator />
					) : (
						<Icon
							name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
							size={22}
							tone={isCompleted ? "success" : "tertiary"}
						/>
					)
				}
			/>
			<ListRow
				destructive={true}
				onPress={isIdle ? onArchive : undefined}
				showChevron={false}
				title="Archive trip"
				trailing={
					pendingAction === "archive" ? <ActivityIndicator /> : undefined
				}
			/>
		</ListGroup>
	);
}

function getBudgetOutcomeText({
	budget,
	currency,
	overAmount,
	spent,
}: {
	budget: number;
	currency: string;
	overAmount: number;
	spent: number;
}) {
	const spentText = `Spent: ${formatMoney(spent, currency)}`;

	if (budget <= 0) {
		return spentText;
	}

	return overAmount > 0
		? `${spentText}, ${formatMoney(overAmount, currency)} over budget`
		: `${spentText} of ${formatMoney(budget, currency)}`;
}

function getPendingSummary(endDate: string | undefined, hasEnded: boolean) {
	if (!endDate) {
		return "Mark the trip complete to share the recap.";
	}

	return `${hasEnded ? "Ended" : "Ends"} ${formatShortDate(endDate)}. Mark the trip complete to share the recap.`;
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
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const { confirm } = useFeedback();
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
			remainingTripDays:
				getTripDayCount(workspace.trip.startDate, workspace.trip.endDate) ?? 1,
		});
	}, [workspace]);

	if (!tripId || workspace === null) {
		return (
			<ScreenShell
				state={{
					description: "This trip was deleted or is no longer available.",
					icon: "sparkles-outline",
					kind: "empty",
					title: "Trip not found",
				}}
				title="Recap"
			/>
		);
	}

	if (workspace === undefined || !wallet) {
		return (
			<ScreenShell
				state={{ kind: "loading", title: "Loading recap" }}
				title="Recap"
			/>
		);
	}

	const currency = workspace.trip.budgetCurrency ?? "PHP";
	const completedItems = workspace.itineraryItems.filter(
		(item) => item.status === "completed"
	).length;
	const totalItems = workspace.itineraryItems.length;
	const bookingCounts = getBookingCounts(workspace.bookings, currency);
	const confirmedBookings = bookingCounts.booked;
	const vaultCounts = getVaultCounts(workspace.vaultItems, workspace.documents);
	const fileCount = vaultCounts.files;
	const placeCounts = getPlaceCounts(workspace.savedPlaces);
	const plannedDays = workspace.itineraryDays.filter((day) =>
		workspace.itineraryItems.some((item) => item.dayId === day._id)
	).length;
	const budget = workspace.trip.budgetAmount ?? 0;
	const spent = wallet.totalTrackedSpend;
	const overAmount = wallet.overAmount;
	const budgetOutcome = getBudgetOutcomeText({
		budget,
		currency,
		overAmount,
		spent,
	});
	const highlightMoments = workspace.moments.filter(
		(moment) => moment.isHighlight
	);
	const visibleMoments = (
		highlightMoments.length > 0 ? highlightMoments : workspace.moments
	).slice(0, MAX_HIGHLIGHTS);
	const isCompleted = workspace.trip.status === "completed";
	const { startDate, endDate } = workspace.trip;
	const dateWindow =
		startDate && endDate
			? formatTripRange(startDate, endDate, { year: "always" })
			: undefined;
	const tripMeta = [workspace.trip.destination, dateWindow]
		.filter(Boolean)
		.join(" · ");
	const phase = getTripPhase(workspace.trip, toLocalDateKey());
	const pendingSummary = getPendingSummary(endDate, phase === "ended");

	const completeTrip = async () => {
		setErrorMessage(null);
		setPendingAction("complete");
		try {
			await updateTripLifecycle({ status: "completed", tripId });
		} catch {
			setErrorMessage("Could not mark the trip complete. Try again.");
		} finally {
			setPendingAction(null);
		}
	};

	const archiveCurrentTrip = async () => {
		setErrorMessage(null);
		setPendingAction("archive");
		try {
			await archiveTrip({ tripId });
			router.replace(VIYA_ROUTES.trips);
		} catch {
			setErrorMessage("Could not archive the trip. Try again.");
		} finally {
			setPendingAction(null);
		}
	};
	const confirmArchive = async () => {
		const confirmed = await confirm({
			confirmLabel: "Archive trip",
			destructive: true,
			message: "The trip leaves active planning. Its history is kept.",
			title: "Archive trip?",
		});
		if (confirmed) {
			await archiveCurrentTrip();
		}
	};
	const shareRecap = async () => {
		setErrorMessage(null);
		setIsSharingRecap(true);
		try {
			await Share.share({
				message: buildTripRecapShareMessage({
					completedItems,
					budgetOutcome,
					confirmedBookings,
					dateWindow: dateWindow ?? "",
					destination: workspace.trip.destination,
					fileCount,
					highlightTitles: highlightMoments.map((moment) => moment.title),
					title: workspace.trip.title,
					totalBookings: bookingCounts.total,
					totalItems,
				}),
				title: workspace.trip.title,
			});
		} catch {
			setErrorMessage("Could not open the share sheet.");
		} finally {
			setIsSharingRecap(false);
		}
	};

	return (
		<ScreenShell
			footer={
				isCompleted ? (
					<PrimaryButton
						icon="share-outline"
						isPending={isSharingRecap}
						label="Share recap"
						onPress={() => {
							shareRecap().catch(() => undefined);
						}}
					/>
				) : undefined
			}
			summary={isCompleted ? tripMeta : pendingSummary}
			title="Recap"
		>
			<FormError message={errorMessage} />

			<View
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					gap: spacing.lg,
				}}
			>
				<RecapStat
					label="Days"
					value={`${getTripDayCount(startDate, endDate) ?? workspace.itineraryDays.length}`}
				/>
				<RecapStat label="Places" value={`${placeCounts.saved}`} />
				<RecapStat
					label="Stops done"
					value={`${completedItems} of ${totalItems}`}
				/>
				<RecapStat label="Spent" value={formatMoney(spent, currency)} />
				<RecapStat label="Moments" value={`${workspace.moments.length}`} />
			</View>

			<ListGroup header="Highlights">
				{visibleMoments.length === 0 ? (
					<ListRow
						leading={<Icon name="images-outline" size={22} tone="secondary" />}
						onPress={() => router.push(VIYA_ROUTES.tripMoments(tripId))}
						subtitle="Save a moment and it shows here."
						title="No moments yet"
					/>
				) : (
					visibleMoments.map((moment) => (
						<ListRow
							accessibilityLabel={`${moment.title}. Open moments`}
							key={moment._id}
							onPress={() => router.push(VIYA_ROUTES.tripMoments(tripId))}
							subtitle={
								[
									getDayLabel(workspace.itineraryDays, moment.dayId),
									moment.locationName,
								]
									.filter(Boolean)
									.join(" · ") || undefined
							}
							title={moment.title}
						/>
					))
				)}
			</ListGroup>

			<ListGroup header="Wrap-up">
				<WrapUpRow
					detail={`${placeCounts.saved} saved · ${plannedDays} days planned`}
					isDone={placeCounts.saved > 0 && plannedDays > 0}
					onPress={() => router.push(VIYA_ROUTES.tripPlaces(tripId))}
					title="Places"
				/>
				<WrapUpRow
					detail={`${completedItems} of ${totalItems} stops done`}
					isDone={totalItems > 0 && completedItems === totalItems}
					onPress={() => router.push(VIYA_ROUTES.tripItinerary(tripId))}
					title="Itinerary"
				/>
				<WrapUpRow
					detail={`${confirmedBookings} of ${bookingCounts.total} booked · ${formatCount(fileCount, "file")}`}
					isDone={
						bookingCounts.total > 0 &&
						bookingCounts.toBook === 0 &&
						vaultCounts.missingDocuments === 0
					}
					onPress={() =>
						router.push(
							bookingCounts.toBook > 0
								? VIYA_ROUTES.tripBookings(tripId)
								: VIYA_ROUTES.tripVault(tripId)
						)
					}
					title="Confirmations"
				/>
				<WrapUpRow
					detail={budgetOutcome}
					isDone={budget > 0 && spent > 0 && overAmount === 0}
					onPress={() => router.push(VIYA_ROUTES.tripBudget(tripId))}
					title="Budget outcome"
				/>
			</ListGroup>

			<LifecycleGroup
				isCompleted={isCompleted}
				onArchive={() => {
					confirmArchive().catch(() => undefined);
				}}
				onComplete={() => {
					completeTrip().catch(() => undefined);
				}}
				pendingAction={pendingAction}
			/>
		</ScreenShell>
	);
}
