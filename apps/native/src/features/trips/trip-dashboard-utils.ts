import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	calculateReadinessScore,
	getBudgetWalletSummary,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	sortReadinessItemsForReview,
	sortTripRisksForReview,
	type WorkStatus,
} from "@viya-app/domain";

import {
	formatReadableTripDateRange,
	getCalendarDayOffset,
	getDateRangeDurationDays,
} from "@/src/components/date/date-format-utils";
import { VIYA_ROUTES } from "@/src/constants/routes";

import type {
	DashboardAction,
	DashboardMetric,
	DashboardTab,
	MissingItem,
	RecentUpdate,
	ScheduledItem,
	TripCountdown,
	TripDashboardModel,
	TripWorkspace,
} from "./trip-dashboard-types";

const tripTabs: DashboardTab[] = [
	{ icon: "speedometer-outline", id: "overview", label: "Today" },
	{ icon: "calendar-outline", id: "itinerary", label: "Plan" },
	{ icon: "map-outline", id: "places", label: "Map" },
	{ icon: "briefcase-outline", id: "bookings", label: "Bookings" },
	{ icon: "folder-open-outline", id: "documents", label: "Docs" },
	{ icon: "checkbox-outline", id: "checklist", label: "Checklist" },
	{ icon: "wallet-outline", id: "budget", label: "Budget" },
	{ icon: "warning-outline", id: "risks", label: "Risks" },
	{ icon: "people-outline", id: "companions", label: "People" },
	{ icon: "document-text-outline", id: "notes", label: "Notes" },
	{ icon: "navigate-outline", id: "travel", label: "Travel" },
	{ icon: "images-outline", id: "memories", label: "Memories" },
	{ icon: "share-social-outline", id: "recap", label: "Recap" },
];

export const formatMoney = (amount?: number, currency = "PHP") => {
	if (!(Number.isFinite(amount) && amount !== undefined)) {
		return `${currency} 0`;
	}

	return new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	}).format(amount);
};

export const formatStatus = (value: string) =>
	value
		.replaceAll("_", " ")
		.split(" ")
		.filter(Boolean)
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(" ");

export const formatDestinationLabel = (destination: string) => {
	const trimmedDestination = destination.trim();

	return trimmedDestination ? trimmedDestination.toUpperCase() : "TBD";
};

export const formatTripWindowWithDuration = ({
	endDate,
	fallbackLabel = "Dates not set",
	startDate,
}: {
	endDate?: string | null;
	fallbackLabel?: string;
	startDate?: string | null;
}) => {
	const tripWindow = formatReadableTripDateRange({
		endDate,
		fallbackLabel,
		startDate,
	});
	const durationDays =
		startDate && endDate ? getDateRangeDurationDays(startDate, endDate) : null;

	if (!durationDays) {
		return tripWindow;
	}

	const dayLabel = durationDays === 1 ? "day" : "days";

	return `${tripWindow} · ${durationDays} ${dayLabel}`;
};

export const getReadinessLabel = (score: number) => {
	if (score >= 90) {
		return "Ready";
	}

	if (score >= 70) {
		return "Almost ready";
	}

	if (score >= 40) {
		return "Needs work";
	}

	return "Not ready";
};

export const getReadinessDisplay = ({
	itemCount,
	score,
}: {
	itemCount?: number;
	score: number;
}) => {
	const hasReadinessCoverage =
		itemCount === undefined ? score > 0 : itemCount > 0;

	if (!hasReadinessCoverage) {
		return {
			detail: "Start review",
			progress: 0,
			value: "Not checked",
		};
	}

	return {
		detail: getReadinessLabel(score),
		progress: score,
		value: `${score}%`,
	};
};

export const getTravelerLabel = (groupType: string) => {
	if (groupType === "solo") {
		return "1 traveler";
	}

	if (groupType === "couple") {
		return "2 travelers";
	}

	return `${formatStatus(groupType)} travelers`;
};

const daysPerWeek = 7;
const daysPerMonth = 30;
const daysPerYear = 365;

const formatTripLeadTime = (days: number) => {
	if (days === 1) {
		return "Tomorrow";
	}

	if (days < daysPerWeek) {
		return `In ${days} days`;
	}

	if (days < daysPerWeek * 2) {
		return "In 1 week";
	}

	if (days < daysPerMonth) {
		return `In ${Math.round(days / daysPerWeek)} weeks`;
	}

	if (days < daysPerMonth * 2) {
		return "In 1 month";
	}

	if (days < daysPerYear) {
		return `In ${Math.round(days / daysPerMonth)} months`;
	}

	return "In 1+ year";
};

export const getTripCountdown = ({
	endDate,
	startDate,
}: {
	endDate?: string | null;
	startDate?: string | null;
}): TripCountdown | null => {
	if (!startDate) {
		return null;
	}

	const startOffset = getCalendarDayOffset(startDate);

	if (startOffset === null) {
		return null;
	}

	if (startOffset > 0) {
		return { label: formatTripLeadTime(startOffset), tone: "upcoming" };
	}

	const endOffset = endDate ? getCalendarDayOffset(endDate) : null;

	if (endOffset !== null && endOffset < 0) {
		return { label: "Completed", tone: "complete" };
	}

	const totalDays =
		startDate && endDate ? getDateRangeDurationDays(startDate, endDate) : null;
	const dayNumber = Math.abs(startOffset) + 1;

	return {
		label: totalDays ? `Day ${dayNumber} of ${totalDays}` : `Day ${dayNumber}`,
		tone: "active",
	};
};

const getBudgetDayCount = (startDate: string, endDate: string) => {
	const today = new Date().toISOString().slice(0, 10);
	const tripDayCount = getDateRangeDurationDays(startDate, endDate) ?? 1;
	const startOffset = getCalendarDayOffset(startDate);

	if (startOffset === null || startOffset > 0) {
		return tripDayCount;
	}

	const remainingDays = getDateRangeDurationDays(today, endDate) ?? 1;

	return Math.max(1, Math.min(tripDayCount, remainingDays));
};

const getBudgetStatus = ({
	budgetAmount,
	remainingAmount,
	totalTrackedSpend,
}: {
	budgetAmount?: number;
	remainingAmount: number;
	totalTrackedSpend: number;
}) => {
	if (!budgetAmount) {
		return "Set budget";
	}

	if (remainingAmount <= 0) {
		return "Over budget";
	}

	if (totalTrackedSpend / budgetAmount >= 0.8) {
		return "Watch spend";
	}

	return "On track";
};

const toReadinessItem = (item: Doc<"readinessItems">): ReadinessItem => ({
	aiReason: item.aiReason,
	assignedToMemberId: item.assignedToMemberId ?? null,
	category: item.category as ReadinessCategory,
	description: item.description,
	dueDate: item.dueDate,
	id: item._id,
	priority: item.priority as Priority,
	source: item.source as ReadinessItem["source"],
	status: item.status as WorkStatus,
	title: item.title,
	tripId: item.tripId,
});

const getOpenReadinessItems = (items: Doc<"readinessItems">[]) =>
	sortReadinessItemsForReview(
		items.filter((item) => item.status !== "done" && item.status !== "ignored")
	);

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

const getNowAndNext = (scheduledItems: ScheduledItem[]) => {
	const nowKey = new Date().toISOString().slice(0, 16);
	const nextIndex = scheduledItems.findIndex(
		(scheduledItem) => scheduledItem.sortKey >= nowKey
	);

	if (nextIndex === -1) {
		return {
			nextScheduledItem: null,
			nowScheduledItem: scheduledItems.at(-1) ?? null,
		};
	}

	return {
		nextScheduledItem: scheduledItems[nextIndex + 1] ?? null,
		nowScheduledItem: scheduledItems[nextIndex],
	};
};

const groupBy = <Item>(
	items: Item[],
	getKey: (item: Item) => string
): Array<{ items: Item[]; type: string }> => {
	const groups = items.reduce<Record<string, Item[]>>((accumulator, item) => {
		const key = getKey(item);
		const groupItems = accumulator[key] ?? [];
		groupItems.push(item);
		accumulator[key] = groupItems;
		return accumulator;
	}, {});

	return Object.entries(groups).map(([type, groupItems]) => ({
		items: groupItems,
		type,
	}));
};

const getMissingItems = ({
	openReadinessItems,
	tripId,
	workspace,
}: {
	openReadinessItems: Doc<"readinessItems">[];
	tripId: Id<"trips">;
	workspace: TripWorkspace;
}): MissingItem[] => [
	...workspace.bookings
		.filter((booking) => booking.status !== "confirmed")
		.slice(0, 4)
		.map((booking) => ({
			category: "Bookings",
			href: VIYA_ROUTES.tripBookings(tripId),
			title: booking.title,
		})),
	...openReadinessItems.slice(0, 4).map((item) => ({
		category: formatStatus(item.category),
		href: VIYA_ROUTES.tripReadiness(tripId),
		title: item.title,
	})),
	...(workspace.vaultItems.length === 0
		? [
				{
					category: "Documents",
					href: VIYA_ROUTES.tripVault(tripId),
					title: "Upload confirmations or IDs",
				},
			]
		: []),
	...(workspace.trip.budgetAmount
		? []
		: [
				{
					category: "Budget",
					href: VIYA_ROUTES.tripBudget(tripId),
					title: "Set total trip budget",
				},
			]),
];

const getNextAction = ({
	missingItems,
	readinessScore,
	tripId,
}: {
	missingItems: MissingItem[];
	readinessScore: number;
	tripId: Id<"trips">;
}) => {
	const firstMissingItem = missingItems[0];

	if (firstMissingItem) {
		return {
			description: `Resolve this ${firstMissingItem.category.toLowerCase()} item first.`,
			href: firstMissingItem.href,
			icon: "flag-outline" as const,
			tab: "checklist" as const,
			title: firstMissingItem.title,
		};
	}

	if (readinessScore >= 90) {
		return {
			description: "Your core prep is done. Switch to day-of guidance.",
			href: VIYA_ROUTES.tripTravelMode(tripId),
			icon: "navigate-outline" as const,
			tab: "travel" as const,
			title: "Open Travel Mode",
		};
	}

	return {
		description: "Review the readiness checklist and close the remaining gaps.",
		href: VIYA_ROUTES.tripReadiness(tripId),
		icon: "shield-checkmark-outline" as const,
		tab: "checklist" as const,
		title: "Review readiness",
	};
};

const getRecentUpdates = (workspace: TripWorkspace): RecentUpdate[] => {
	const tripId = workspace.trip._id;

	return [
		...workspace.bookings
			.filter((booking) => booking.status === "confirmed")
			.map((booking) => ({
				actionLabel: "Open booking",
				createdAt: booking.updatedAt,
				href: VIYA_ROUTES.tripBookings(tripId),
				icon: "briefcase-outline" as const,
				message: `Confirmed ${booking.title}`,
				tab: "bookings" as const,
			})),
		...workspace.vaultItems.map((item) => ({
			actionLabel: "Open file",
			createdAt: item.createdAt,
			href: VIYA_ROUTES.tripVault(tripId),
			icon: "document-attach-outline" as const,
			message: `Uploaded ${item.title}`,
			tab: "documents" as const,
		})),
		...workspace.expenses.map((expense) => ({
			actionLabel: "Open expense",
			createdAt: expense.createdAt,
			href: VIYA_ROUTES.tripBudget(tripId),
			icon: "receipt-outline" as const,
			message: `Logged ${expense.title}`,
			tab: "budget" as const,
		})),
		...workspace.moments.map((moment) => ({
			actionLabel: "Open memory",
			createdAt: moment.createdAt,
			href: VIYA_ROUTES.tripMoments(tripId),
			icon: "images-outline" as const,
			message: `Saved ${moment.title}`,
			tab: "memories" as const,
		})),
		...workspace.notes.map((note) => ({
			actionLabel: "Open note",
			createdAt: note.updatedAt,
			href: VIYA_ROUTES.tripNotes(tripId),
			icon: "document-text-outline" as const,
			message: `Noted ${note.title}`,
			tab: "notes" as const,
		})),
	]
		.sort((left, right) => right.createdAt - left.createdAt)
		.slice(0, 4);
};

const getQuickActions = (tripId: Id<"trips">): DashboardAction[] => [
	{
		href: VIYA_ROUTES.tripVault(tripId),
		icon: "cloud-upload-outline",
		label: "Sync",
	},
	{
		href: VIYA_ROUTES.tripBudget(tripId),
		icon: "receipt-outline",
		label: "Log spend",
	},
	{
		href: VIYA_ROUTES.tripCompanions(tripId),
		icon: "people-outline",
		label: "People",
	},
	{
		href: VIYA_ROUTES.tripNotes(tripId),
		icon: "document-text-outline",
		label: "Notes",
	},
	{
		href: VIYA_ROUTES.tripReadiness(tripId),
		icon: "shield-checkmark-outline",
		label: "Readiness",
	},
	{
		href: VIYA_ROUTES.tripTravelMode(tripId),
		icon: "navigate-outline",
		label: "Travel mode",
	},
	{
		href: VIYA_ROUTES.tripMoments(tripId),
		icon: "images-outline",
		label: "Memory",
	},
];

export const createTripDashboardModel = ({
	tripId,
	workspace,
}: {
	tripId: Id<"trips">;
	workspace: TripWorkspace;
}): TripDashboardModel => {
	const sortedReadinessItems = sortReadinessItemsForReview(
		workspace.readinessItems
	);
	const readinessScore = calculateReadinessScore(
		sortedReadinessItems.map(toReadinessItem)
	);
	const openReadinessItems = getOpenReadinessItems(sortedReadinessItems);
	const scheduledItems = getScheduledItems(workspace);
	const { nextScheduledItem, nowScheduledItem } = getNowAndNext(scheduledItems);
	const budgetWallet = getBudgetWalletSummary({
		bookings: workspace.bookings,
		budgetAmount: workspace.trip.budgetAmount,
		budgetCurrency: workspace.trip.budgetCurrency,
		expenses: workspace.expenses,
		itineraryItems: workspace.itineraryItems,
		remainingTripDays: getBudgetDayCount(
			workspace.trip.startDate,
			workspace.trip.endDate
		),
	});
	const budgetStatus = getBudgetStatus({
		budgetAmount: workspace.trip.budgetAmount,
		remainingAmount: budgetWallet.remainingAmount,
		totalTrackedSpend: budgetWallet.totalTrackedSpend,
	});
	const missingItems = getMissingItems({
		openReadinessItems,
		tripId,
		workspace,
	});
	const nextAction = getNextAction({
		missingItems,
		readinessScore: readinessScore.overallScore,
		tripId,
	});
	const currency = workspace.trip.budgetCurrency ?? "PHP";
	const activeDocuments = [
		...workspace.documents
			.filter((document) => document.status !== "missing")
			.map((document) => document.title),
		...workspace.vaultItems
			.filter((item) => item.kind === "booking" || item.kind === "document")
			.map((item) => item.title),
	].slice(0, 4);
	const sortedRisks = sortTripRisksForReview(workspace.risks);
	const openRisks = sortedRisks.filter((risk) => risk.status === "open");
	const travelAlertCount = openRisks.length + missingItems.length;
	const watchOutItems = [
		...openRisks.map((risk) => risk.title),
		...missingItems.map((item) => item.title),
	].slice(0, 4);
	const statusMetrics: DashboardMetric[] = [
		{
			label: "Ready",
			tone: readinessScore.overallScore >= 70 ? "good" : "attention",
			value: `${readinessScore.overallScore}%`,
		},
		{
			label: "Next",
			tone: missingItems.length > 0 ? "attention" : "good",
			value: missingItems.length > 0 ? `${missingItems.length} gaps` : "Clear",
		},
		{
			label: "Budget",
			tone: budgetStatus === "On track" ? "good" : "attention",
			value: budgetStatus,
		},
	];

	return {
		activeDocuments,
		bookingsByType: groupBy(workspace.bookings, (booking) => booking.type),
		budget: {
			booked: budgetWallet.confirmedBookingCosts,
			categoryBreakdown: budgetWallet.categoryBreakdown,
			dailySafeSpend: budgetWallet.dailySafeSpend,
			remaining: budgetWallet.remainingAmount,
			spent: budgetWallet.manualExpenses,
			status: budgetStatus,
			totalTrackedSpend: budgetWallet.totalTrackedSpend,
		},
		currency,
		highlights: workspace.moments
			.filter((moment) => moment.isHighlight)
			.map((moment) => moment.title),
		missingItems,
		nextAction,
		nextScheduledItem,
		nowScheduledItem,
		openReadinessItems,
		quickActions: getQuickActions(tripId),
		readiness: {
			label: getReadinessLabel(readinessScore.overallScore),
			openCount: openReadinessItems.length,
			score: readinessScore.overallScore,
			topBlocker: openReadinessItems[0]?.title ?? "No blocker detected",
		},
		readinessByCategory: groupBy(
			sortedReadinessItems,
			(item) => item.category
		).map(({ items, type }) => ({ category: type, items })),
		recentUpdates: getRecentUpdates(workspace),
		statusMetrics,
		tabCounts: {
			bookings: workspace.bookings.length,
			budget: workspace.expenses.length,
			checklist: openReadinessItems.length,
			documents: workspace.vaultItems.length + workspace.documents.length,
			itinerary: workspace.itineraryItems.length,
			companions: workspace.companions.length,
			places:
				workspace.savedPlaces.length +
				workspace.itineraryItems.filter((item) => item.locationName).length,
			memories: workspace.moments.length,
			notes: workspace.notes.length,
			risks: openRisks.length,
			travel: travelAlertCount,
		},
		tabs: tripTabs,
		travelerLabel: getTravelerLabel(workspace.trip.groupType),
		travelAlertCount,
		tripCountdown: getTripCountdown({
			endDate: workspace.trip.endDate,
			startDate: workspace.trip.startDate,
		}),
		tripId,
		tripWindow: formatTripWindowWithDuration({
			endDate: workspace.trip.endDate,
			fallbackLabel: "Dates not set",
			startDate: workspace.trip.startDate,
		}),
		watchOutItems,
		workspace: {
			...workspace,
			readinessItems: sortedReadinessItems,
			risks: sortedRisks,
		},
	};
};
