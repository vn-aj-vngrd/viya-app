import { isBookingSecured } from "./trip-metrics";

export type TripModuleId =
	| "itinerary"
	| "places"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "companions"
	| "notes"
	| "travel"
	| "memories"
	| "recap";

export type TripModuleHealth =
	| "empty"
	| "needsInput"
	| "inProgress"
	| "ready"
	| "issue";

export interface TripModuleRequirement {
	detail: string;
	isComplete: boolean;
	label: string;
}

export interface TripModuleSummary {
	health: TripModuleHealth;
	id: TripModuleId;
	label: string;
	primaryAction: string;
	requirements: TripModuleRequirement[];
	value: string;
}

export interface TripWorkspaceModuleInput {
	bookings: readonly { status: string; type: string }[];
	budgetAmount?: number;
	companions?: readonly unknown[];
	documents: readonly { status: string }[];
	expenses: readonly { amount: number }[];
	itineraryDays: readonly unknown[];
	itineraryItems: readonly {
		estimatedCost?: number;
		locationName?: string;
		status?: string;
	}[];
	moments?: readonly { isHighlight?: boolean }[];
	notes?: readonly unknown[];
	readinessScore: number;
	risks: readonly { status: string }[];
	savedPlaces?: readonly unknown[];
	vaultItems: readonly { kind: string; status: string }[];
}

const getBookingHealth = ({
	bookingCount,
	confirmedBookingCount,
}: {
	bookingCount: number;
	confirmedBookingCount: number;
}): TripModuleHealth => {
	if (bookingCount === 0) {
		return "empty";
	}

	if (confirmedBookingCount === bookingCount) {
		return "ready";
	}

	return "needsInput";
};

const getReadinessHealth = (readinessScore: number): TripModuleHealth => {
	if (readinessScore >= 90) {
		return "ready";
	}

	if (readinessScore > 0) {
		return "needsInput";
	}

	return "empty";
};

interface TripModuleSummaryMetrics {
	completedItineraryItemCount: number;
	confirmedBookingCount: number;
	documentCount: number;
	hasBudget: boolean;
	highlightCount: number;
	openRiskCount: number;
	placeCount: number;
}

type TripModuleSummaryContext = Omit<
	TripWorkspaceModuleInput,
	"companions" | "moments" | "notes" | "savedPlaces"
> & {
	companions: readonly unknown[];
	metrics: TripModuleSummaryMetrics;
	moments: readonly { isHighlight?: boolean }[];
	notes: readonly unknown[];
	savedPlaces: readonly unknown[];
};

const getTripModuleSummaryMetrics = ({
	bookings,
	budgetAmount,
	documents,
	itineraryItems,
	moments = [],
	risks,
	savedPlaces = [],
	vaultItems,
}: TripWorkspaceModuleInput): TripModuleSummaryMetrics => {
	const confirmedBookingCount = bookings.filter((booking) =>
		isBookingSecured(booking.status)
	).length;
	const documentCount =
		documents.length +
		vaultItems.filter((item) => item.kind === "document").length;
	const itineraryPlaceCount = itineraryItems.filter((item) =>
		Boolean(item.locationName)
	).length;

	return {
		completedItineraryItemCount: itineraryItems.filter(
			(item) => item.status === "completed"
		).length,
		confirmedBookingCount,
		documentCount,
		hasBudget: Boolean(budgetAmount && budgetAmount > 0),
		highlightCount: moments.filter((moment) => moment.isHighlight).length,
		openRiskCount: risks.filter((risk) => risk.status === "open").length,
		placeCount: savedPlaces.length + itineraryPlaceCount,
	};
};

const getTravelHealth = ({
	hasItineraryItems,
	openRiskCount,
}: {
	hasItineraryItems: boolean;
	openRiskCount: number;
}): TripModuleHealth => {
	if (!hasItineraryItems) {
		return "empty";
	}

	if (openRiskCount > 0) {
		return "issue";
	}

	return "ready";
};

const getItinerarySummary = ({
	itineraryDays,
	itineraryItems,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: itineraryItems.length > 0 ? "inProgress" : "empty",
	id: "itinerary",
	label: "Itinerary",
	primaryAction: "Build itinerary",
	requirements: [
		{
			detail:
				itineraryDays.length > 0
					? `${itineraryDays.length} days outlined`
					: "Add trip dates and day structure",
			isComplete: itineraryDays.length > 0,
			label: "Day outline",
		},
		{
			detail:
				itineraryItems.length > 0
					? `${itineraryItems.length} planned items`
					: "Add places, meals, transfers, and activities",
			isComplete: itineraryItems.length > 0,
			label: "Planned items",
		},
	],
	value: `${itineraryItems.length} items`,
});

const getPlacesSummary = ({
	metrics,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: metrics.placeCount > 0 ? "inProgress" : "empty",
	id: "places",
	label: "Map",
	primaryAction: "Add places",
	requirements: [
		{
			detail:
				metrics.placeCount > 0
					? `${metrics.placeCount} places available`
					: "Add saved places or itinerary locations",
			isComplete: metrics.placeCount > 0,
			label: "Places",
		},
	],
	value: `${metrics.placeCount} places`,
});

const getBookingsSummary = ({
	bookings,
	metrics,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: getBookingHealth({
		bookingCount: bookings.length,
		confirmedBookingCount: metrics.confirmedBookingCount,
	}),
	id: "bookings",
	label: "Bookings",
	primaryAction: "Manage bookings",
	requirements: [
		{
			detail: `${metrics.confirmedBookingCount}/${bookings.length} confirmed`,
			isComplete:
				bookings.length > 0 &&
				metrics.confirmedBookingCount === bookings.length,
			label: "Confirmations",
		},
	],
	value: `${bookings.length} targets`,
});

const getDocumentsSummary = ({
	metrics,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: metrics.documentCount > 0 ? "inProgress" : "empty",
	id: "documents",
	label: "Documents",
	primaryAction: "Open vault",
	requirements: [
		{
			detail:
				metrics.documentCount > 0
					? `${metrics.documentCount} saved files`
					: "Upload IDs, tickets, permits, or confirmations",
			isComplete: metrics.documentCount > 0,
			label: "Travel files",
		},
	],
	value: `${metrics.documentCount} files`,
});

const getBudgetSummary = ({
	expenses,
	metrics,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: metrics.hasBudget ? "ready" : "empty",
	id: "budget",
	label: "Budget",
	primaryAction: "Set budget",
	requirements: [
		{
			detail: metrics.hasBudget
				? "Trip budget is set"
				: "Add a total trip budget",
			isComplete: metrics.hasBudget,
			label: "Budget cap",
		},
		{
			detail:
				expenses.length > 0
					? "Expenses are being tracked"
					: "No expenses logged yet",
			isComplete: expenses.length > 0,
			label: "Expense tracking",
		},
	],
	value: metrics.hasBudget ? "Set" : "Not set",
});

const getReadinessSummary = ({
	readinessScore,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: getReadinessHealth(readinessScore),
	id: "readiness",
	label: "Checklist",
	primaryAction: "Review checklist",
	requirements: [
		{
			detail: `${readinessScore}% ready`,
			isComplete: readinessScore >= 90,
			label: "Readiness score",
		},
	],
	value: `${readinessScore}%`,
});

const getRisksSummary = ({
	metrics,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: metrics.openRiskCount > 0 ? "issue" : "ready",
	id: "risks",
	label: "Risks",
	primaryAction: "Review risks",
	requirements: [
		{
			detail:
				metrics.openRiskCount > 0
					? `${metrics.openRiskCount} open risks`
					: "No open risks",
			isComplete: metrics.openRiskCount === 0,
			label: "Open risks",
		},
	],
	value: metrics.openRiskCount > 0 ? `${metrics.openRiskCount} open` : "Clear",
});

const getCompanionsSummary = ({
	companions,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: companions.length > 0 ? "ready" : "empty",
	id: "companions",
	label: "Companions",
	primaryAction: "Add companions",
	requirements: [
		{
			detail:
				companions.length > 0
					? `${companions.length} companions saved`
					: "Add emergency or travel companion contacts",
			isComplete: companions.length > 0,
			label: "Travel party",
		},
	],
	value: `${companions.length} people`,
});

const getNotesSummary = ({
	notes,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: notes.length > 0 ? "inProgress" : "empty",
	id: "notes",
	label: "Notes",
	primaryAction: "Add notes",
	requirements: [
		{
			detail:
				notes.length > 0
					? `${notes.length} notes saved`
					: "Save decisions, constraints, and shared reminders",
			isComplete: notes.length > 0,
			label: "Trip notes",
		},
	],
	value: `${notes.length} notes`,
});

const getTravelSummary = ({
	itineraryItems,
	metrics,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: getTravelHealth({
		hasItineraryItems: itineraryItems.length > 0,
		openRiskCount: metrics.openRiskCount,
	}),
	id: "travel",
	label: "Travel Mode",
	primaryAction: "Open travel mode",
	requirements: [
		{
			detail:
				itineraryItems.length > 0
					? `${itineraryItems.length} timed items available`
					: "Add itinerary items before day-of guidance",
			isComplete: itineraryItems.length > 0,
			label: "Current plan",
		},
		{
			detail:
				metrics.openRiskCount > 0
					? `${metrics.openRiskCount} open risks need attention`
					: "No open risks",
			isComplete: metrics.openRiskCount === 0,
			label: "Active watch-outs",
		},
	],
	value: itineraryItems.length > 0 ? "Ready" : "Not ready",
});

const getMemoriesSummary = ({
	metrics,
	moments,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: moments.length > 0 ? "inProgress" : "empty",
	id: "memories",
	label: "Memories",
	primaryAction: "Add moment",
	requirements: [
		{
			detail:
				moments.length > 0
					? `${moments.length} moments saved`
					: "Capture photos, highlights, or notes",
			isComplete: moments.length > 0,
			label: "Captured moments",
		},
		{
			detail:
				metrics.highlightCount > 0
					? `${metrics.highlightCount} highlights selected`
					: "Mark favorite moments as highlights",
			isComplete: metrics.highlightCount > 0,
			label: "Highlights",
		},
	],
	value: `${moments.length} moments`,
});

const getRecapHealth = ({
	completedItineraryItemCount,
	hasMoments,
}: {
	completedItineraryItemCount: number;
	hasMoments: boolean;
}): TripModuleHealth => {
	if (hasMoments || completedItineraryItemCount > 0) {
		return "inProgress";
	}

	return "empty";
};

const getRecapValue = ({
	completedItineraryItemCount,
	highlightCount,
}: {
	completedItineraryItemCount: number;
	highlightCount: number;
}) => {
	if (completedItineraryItemCount > 0) {
		return `${completedItineraryItemCount} done`;
	}

	return `${highlightCount} highlights`;
};

const getRecapSummary = ({
	metrics,
	moments,
}: TripModuleSummaryContext): TripModuleSummary => ({
	health: getRecapHealth({
		completedItineraryItemCount: metrics.completedItineraryItemCount,
		hasMoments: moments.length > 0,
	}),
	id: "recap",
	label: "Recap",
	primaryAction: "Review recap",
	requirements: [
		{
			detail:
				metrics.completedItineraryItemCount > 0
					? `${metrics.completedItineraryItemCount} itinerary items completed`
					: "Complete itinerary items during travel",
			isComplete: metrics.completedItineraryItemCount > 0,
			label: "Trip activity",
		},
		{
			detail:
				metrics.highlightCount > 0
					? `${metrics.highlightCount} highlights ready`
					: "Select highlights for the story",
			isComplete: metrics.highlightCount > 0,
			label: "Story source",
		},
	],
	value: getRecapValue({
		completedItineraryItemCount: metrics.completedItineraryItemCount,
		highlightCount: metrics.highlightCount,
	}),
});

export const getTripModuleSummaries = (
	input: TripWorkspaceModuleInput
): TripModuleSummary[] => {
	const context: TripModuleSummaryContext = {
		...input,
		companions: input.companions ?? [],
		metrics: getTripModuleSummaryMetrics(input),
		moments: input.moments ?? [],
		notes: input.notes ?? [],
		savedPlaces: input.savedPlaces ?? [],
	};

	return [
		getItinerarySummary(context),
		getPlacesSummary(context),
		getBookingsSummary(context),
		getDocumentsSummary(context),
		getBudgetSummary(context),
		getReadinessSummary(context),
		getRisksSummary(context),
		getCompanionsSummary(context),
		getNotesSummary(context),
		getTravelSummary(context),
		getMemoriesSummary(context),
		getRecapSummary(context),
	];
};
