import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	getBookingCounts,
	getBudgetDayCount,
	getBudgetWalletSummary,
	getItineraryNowNext,
	getPlaceCounts,
	getReadinessProgress,
	getTravelerCount,
	getTripCountdown,
	getTripDayCount,
	getTripTodayKey,
	getVaultCounts,
	READINESS_CATEGORY_LABELS,
	sortReadinessItemsForReview,
	sortTripRisksForReview,
	type TripCountdown,
	type TripPhase,
} from "@viya-app/domain";

import { VIYA_ROUTES } from "@/src/constants/routes";
import {
	formatCount,
	formatDay,
	formatEnumLabel,
	formatShortDate,
	formatTripCountdown,
	formatTripRange,
	toLocalTimeKey,
} from "@/src/lib/format";

import type {
	NextAction,
	ScheduledItem,
	TripDashboardModel,
	TripWorkspace,
} from "./trip-dashboard-types";

const getScheduledItems = ({
	itineraryDays,
	itineraryItems,
}: {
	itineraryDays: Doc<"itineraryDays">[];
	itineraryItems: Doc<"itineraryItems">[];
}) => {
	const dayById = new Map(itineraryDays.map((day) => [day._id, day]));

	return itineraryItems
		.map((item) => {
			const day = dayById.get(item.dayId);

			return {
				date: day?.date ?? "",
				day,
				item,
				sortKey: `${day?.date ?? ""}T${item.startTime || "00:00"}`,
			};
		})
		.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
};

const getNowAndNext = (
	scheduledItems: ScheduledItem[],
	todayKey: string,
	nowTime: string
) => {
	const entryByItemId = new Map(
		scheduledItems.map((entry) => [entry.item._id, entry])
	);
	const { next, now } = getItineraryNowNext({
		days: scheduledItems.flatMap((entry) =>
			entry.day ? [{ date: entry.date, id: entry.day._id }] : []
		),
		items: scheduledItems.map((entry) => entry.item),
		nowTime,
		todayKey,
	});

	return {
		nextScheduledItem: next ? (entryByItemId.get(next._id) ?? null) : null,
		nowScheduledItem: now ? (entryByItemId.get(now._id) ?? null) : null,
	};
};

const phaseLabels = {
	archived: "Archived",
	completed: "Completed",
	during: "Traveling",
	ended: "Ended",
	undated: "Planning",
	upcoming: "Planning",
} as const satisfies Record<TripPhase, string>;

const phaseStatus = {
	archived: "archived",
	completed: "completed",
	during: "traveling",
	ended: "ended",
	undated: "planning",
	upcoming: "planning",
} as const satisfies Record<TripPhase, string>;

const DEPARTURE_SOON_DAYS = 7;

const getNextAction = ({
	budgetAlert,
	countdown,
	hasVault,
	nextToBook,
	openReadinessItems,
	readinessProgress,
	topUrgentRisk,
	trip,
	tripId,
}: {
	budgetAlert: ReturnType<typeof getBudgetWalletSummary>["alert"];
	countdown: TripCountdown;
	hasVault: boolean;
	nextToBook: Doc<"bookings"> | null;
	openReadinessItems: Doc<"readinessItems">[];
	readinessProgress: ReturnType<typeof getReadinessProgress>;
	topUrgentRisk: Doc<"risks"> | undefined;
	trip: Doc<"trips">;
	tripId: Id<"trips">;
}): NextAction => {
	if (countdown.phase === "ended") {
		return {
			description: `Ended ${formatShortDate(trip.endDate)}. Completing it unlocks the recap.`,
			href: VIYA_ROUTES.tripWrapped(tripId),
			icon: "flag-outline",
			title: "Mark this trip complete",
		};
	}

	if (!trip.startDate) {
		return {
			description: "Days, countdown and daily budget need dates.",
			href: VIYA_ROUTES.tripItinerary(tripId),
			icon: "calendar-outline",
			title: "Set trip dates",
		};
	}

	if (topUrgentRisk) {
		return {
			description: `${formatEnumLabel(topUrgentRisk.severity)} risk · ${topUrgentRisk.suggestedAction}`,
			href: VIYA_ROUTES.tripRisks(tripId),
			icon: "warning-outline",
			title: topUrgentRisk.title,
		};
	}

	if (budgetAlert.level === "over") {
		return {
			description: `Spent and planned costs are ${Math.round(budgetAlert.ratio * 100)}% of your budget.`,
			href: VIYA_ROUTES.tripBudget(tripId),
			icon: "wallet-outline",
			title: "Review your budget",
		};
	}

	if (
		countdown.phase === "upcoming" &&
		countdown.daysUntil !== null &&
		countdown.daysUntil <= DEPARTURE_SOON_DAYS &&
		readinessProgress.open > 0
	) {
		const days = countdown.daysUntil;

		return {
			description: `${formatCount(days, "day")} to go · ${readinessProgress.open} checklist ${readinessProgress.open === 1 ? "item" : "items"} left${readinessProgress.overdue > 0 ? `, ${readinessProgress.overdue} overdue` : ""}`,
			href: VIYA_ROUTES.tripReadiness(tripId),
			icon: "alarm-outline",
			title: "Finish your prep",
		};
	}

	if (budgetAlert.level === "near") {
		return {
			description: `Spent and planned costs are ${Math.round(budgetAlert.ratio * 100)}% of your budget.`,
			href: VIYA_ROUTES.tripBudget(tripId),
			icon: "wallet-outline",
			title: "Budget is nearly used",
		};
	}

	if (nextToBook) {
		return {
			description: [
				formatEnumLabel(nextToBook.type),
				nextToBook.startDateTime
					? formatDay(nextToBook.startDateTime.slice(0, 10))
					: null,
				"not booked yet",
			]
				.filter(Boolean)
				.join(" · "),
			href: VIYA_ROUTES.tripBookings(tripId),
			icon: "ticket-outline",
			title: `Book ${nextToBook.title}`,
		};
	}

	const [firstOpen] = openReadinessItems;

	if (firstOpen) {
		return {
			description: [
				READINESS_CATEGORY_LABELS[
					firstOpen.category as keyof typeof READINESS_CATEGORY_LABELS
				] ?? formatEnumLabel(firstOpen.category),
				firstOpen.dueDate ? `due ${formatDay(firstOpen.dueDate)}` : null,
				`${readinessProgress.done} of ${readinessProgress.active} done`,
			]
				.filter(Boolean)
				.join(" · "),
			href: VIYA_ROUTES.tripReadiness(tripId),
			icon: "checkbox-outline",
			title: firstOpen.title,
		};
	}

	if (!trip.budgetAmount) {
		return {
			description: "Spending and the daily amount need a total.",
			href: VIYA_ROUTES.tripBudget(tripId),
			icon: "wallet-outline",
			title: "Set a budget",
		};
	}

	if (!hasVault) {
		return {
			description: "No files saved for this trip yet.",
			href: VIYA_ROUTES.tripVault(tripId),
			icon: "folder-open-outline",
			title: "Add tickets and IDs to Vault",
		};
	}

	return {
		description: `${formatTripCountdown(countdown)}. Open Travel Mode on the day.`,
		href: VIYA_ROUTES.tripTravelMode(tripId),
		icon: "checkmark-circle-outline",
		title: "Checklist done",
	};
};

const getTripFacts = ({
	travelerCount,
	trip,
}: {
	travelerCount: number | null;
	trip: Doc<"trips">;
}) => {
	const days = getTripDayCount(trip.startDate, trip.endDate);

	return [
		formatTripRange(trip.startDate, trip.endDate, { year: "auto" }),
		days ? formatCount(days, "day") : null,
		travelerCount ? formatCount(travelerCount, "traveler") : null,
	]
		.filter(Boolean)
		.join(" · ");
};

export const createTripDashboardModel = ({
	tripId,
	workspace,
}: {
	tripId: Id<"trips">;
	workspace: TripWorkspace;
}): TripDashboardModel => {
	const { trip } = workspace;
	const sortedReadinessItems = sortReadinessItemsForReview(
		workspace.readinessItems
	);
	const todayKey = getTripTodayKey();
	const readinessProgress = getReadinessProgress(
		sortedReadinessItems,
		todayKey
	);
	const openReadinessItems = sortedReadinessItems.filter(
		(item) => item.status !== "done" && item.status !== "ignored"
	);
	const scheduledItems = getScheduledItems(workspace);
	const { nextScheduledItem, nowScheduledItem } = getNowAndNext(
		scheduledItems,
		todayKey,
		toLocalTimeKey()
	);
	const currency = trip.budgetCurrency ?? "PHP";
	const budgetWallet = getBudgetWalletSummary({
		bookings: workspace.bookings,
		budgetAmount: trip.budgetAmount,
		budgetCurrency: currency,
		expenses: workspace.expenses,
		itineraryDays: workspace.itineraryDays,
		itineraryItems: workspace.itineraryItems,
		remainingTripDays: getBudgetDayCount(trip, todayKey),
	});
	const bookingCounts = getBookingCounts(workspace.bookings, currency);
	const sortedRisks = sortTripRisksForReview(workspace.risks);
	const openRisks = sortedRisks.filter((risk) => risk.status === "open");
	const topUrgentRisk = openRisks.find(
		(risk) => risk.severity === "critical" || risk.severity === "high"
	);
	const countdown = getTripCountdown(trip, todayKey);
	const travelerCount = getTravelerCount(trip, workspace.companions);
	const vaultCounts = getVaultCounts(workspace.vaultItems, workspace.documents);
	const placeCounts = getPlaceCounts(workspace.savedPlaces);
	const plannedDayIds = new Set(
		workspace.itineraryItems.map((item) => item.dayId)
	);

	return {
		bookings: {
			booked: bookingCounts.booked,
			nextToBookTitle: bookingCounts.nextToBook?.title ?? null,
			total: bookingCounts.total,
		},
		budget: {
			amount: trip.budgetAmount ?? 0,
			dailySafeSpend: budgetWallet.dailySafeSpend,
			hasBudget: Boolean(trip.budgetAmount),
			left: budgetWallet.leftAmount,
			over: budgetWallet.overAmount,
			spent: budgetWallet.totalTrackedSpend,
		},
		countdown,
		countdownLabel: formatTripCountdown(countdown),
		currency,
		itinerary: {
			plannedDays: workspace.itineraryDays.filter((day) =>
				plannedDayIds.has(day._id)
			).length,
			stops: workspace.itineraryItems.length,
			tripDays: getTripDayCount(trip.startDate, trip.endDate),
		},
		nextAction: getNextAction({
			budgetAlert: budgetWallet.alert,
			countdown,
			hasVault: vaultCounts.files > 0,
			nextToBook: bookingCounts.nextToBook,
			openReadinessItems,
			readinessProgress,
			topUrgentRisk,
			trip,
			tripId,
		}),
		nextScheduledItem,
		nowScheduledItem,
		openReadinessItems,
		phase: countdown.phase,
		phaseLabel: phaseLabels[countdown.phase],
		phaseStatus: phaseStatus[countdown.phase],
		places: placeCounts,
		readiness: {
			active: readinessProgress.active,
			done: readinessProgress.done,
			openCount: readinessProgress.open,
			overdue: readinessProgress.overdue,
			percent: readinessProgress.percent,
		},
		risks: {
			open: openRisks.length,
			topTitle: openRisks[0]?.title ?? null,
		},
		todayKey,
		travelerCount,
		tripFacts: getTripFacts({ travelerCount, trip }),
		tripId,
		vault: {
			files: vaultCounts.files,
			missingDocuments: vaultCounts.missingDocuments,
		},
		workspace: {
			...workspace,
			readinessItems: sortedReadinessItems,
			risks: sortedRisks,
		},
	};
};
