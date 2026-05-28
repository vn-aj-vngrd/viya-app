import type { Doc, Id } from "@viya-app/backend/convex/_generated/dataModel";
import {
	calculateReadinessScore,
	getBudgetWalletSummary,
	type Priority,
	type ReadinessCategory,
	type ReadinessItem,
	type WorkStatus,
} from "@viya-app/domain";
import type { Href } from "expo-router";

import {
	formatReadableTripDateRange,
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
	TripDashboardModel,
	TripWorkspace,
} from "./trip-dashboard-types";

const priorityRank: Record<string, number> = {
	blocked: 5,
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
};

const tripTabs: DashboardTab[] = [
	{ icon: "speedometer-outline", id: "overview", label: "Today" },
	{ icon: "calendar-outline", id: "itinerary", label: "Plan" },
	{ icon: "briefcase-outline", id: "bookings", label: "Bookings" },
	{ icon: "folder-open-outline", id: "documents", label: "Docs" },
	{ icon: "checkbox-outline", id: "checklist", label: "Checklist" },
	{ icon: "wallet-outline", id: "budget", label: "Budget" },
	{ icon: "sparkles-outline", id: "viya", label: "Viya" },
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

const getReadinessLabel = (score: number) => {
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

const getTravelerLabel = (groupType: string) => {
	if (groupType === "solo") {
		return "1 traveler";
	}

	if (groupType === "couple") {
		return "2 travelers";
	}

	return `${formatStatus(groupType)} travelers`;
};

const getRemainingTripDays = (endDate: string) => {
	const today = new Date().toISOString().slice(0, 10);
	const remainingDays = getDateRangeDurationDays(today, endDate);

	return remainingDays ?? 1;
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
	items
		.filter((item) => item.status !== "done" && item.status !== "ignored")
		.sort((left, right) => {
			const rightRank =
				right.status === "blocked"
					? priorityRank.blocked
					: (priorityRank[right.priority] ?? 0);
			const leftRank =
				left.status === "blocked"
					? priorityRank.blocked
					: (priorityRank[left.priority] ?? 0);

			return rightRank - leftRank;
		});

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

const getRecentUpdates = (workspace: TripWorkspace): RecentUpdate[] =>
	[
		...workspace.bookings
			.filter((booking) => booking.status === "confirmed")
			.map((booking) => ({
				createdAt: booking.updatedAt,
				icon: "briefcase-outline" as const,
				message: `Confirmed ${booking.title}`,
			})),
		...workspace.vaultItems.map((item) => ({
			createdAt: item.createdAt,
			icon: "document-attach-outline" as const,
			message: `Uploaded ${item.title}`,
		})),
		...workspace.expenses.map((expense) => ({
			createdAt: expense.createdAt,
			icon: "receipt-outline" as const,
			message: `Logged ${expense.title}`,
		})),
		...workspace.moments.map((moment) => ({
			createdAt: moment.createdAt,
			icon: "images-outline" as const,
			message: `Saved ${moment.title}`,
		})),
	]
		.sort((left, right) => right.createdAt - left.createdAt)
		.slice(0, 4);

const getQuickActions = (tripId: Id<"trips">): DashboardAction[] => [
	{
		href: VIYA_ROUTES.viya as Href,
		icon: "sparkles-outline",
		label: "Ask Viya",
	},
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
	const readinessScore = calculateReadinessScore(
		workspace.readinessItems.map(toReadinessItem)
	);
	const openReadinessItems = getOpenReadinessItems(workspace.readinessItems);
	const scheduledItems = getScheduledItems(workspace);
	const { nextScheduledItem, nowScheduledItem } = getNowAndNext(scheduledItems);
	const budgetWallet = getBudgetWalletSummary({
		bookings: workspace.bookings,
		budgetAmount: workspace.trip.budgetAmount,
		budgetCurrency: workspace.trip.budgetCurrency,
		expenses: workspace.expenses,
		itineraryItems: workspace.itineraryItems,
		remainingTripDays: getRemainingTripDays(workspace.trip.endDate),
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
	const watchOutItems = [
		...workspace.risks
			.filter((risk) => risk.status === "open")
			.map((risk) => risk.title),
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
			workspace.readinessItems,
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
			memories: workspace.moments.length,
			travel: watchOutItems.length,
		},
		tabs: tripTabs,
		travelerLabel: getTravelerLabel(workspace.trip.groupType),
		tripId,
		tripWindow: formatReadableTripDateRange({
			endDate: workspace.trip.endDate,
			fallbackLabel: "Dates not set",
			startDate: workspace.trip.startDate,
		}),
		watchOutItems,
		workspace,
	};
};
