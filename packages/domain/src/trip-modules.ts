export type TripModuleId =
	| "itinerary"
	| "places"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "expenses"
	| "companions"
	| "notes"
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
	itineraryItems: readonly { estimatedCost?: number; locationName?: string }[];
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

export const getTripModuleSummaries = ({
	bookings,
	budgetAmount,
	documents,
	expenses,
	itineraryDays,
	itineraryItems,
	notes = [],
	companions = [],
	readinessScore,
	risks,
	savedPlaces = [],
	vaultItems,
}: TripWorkspaceModuleInput): TripModuleSummary[] => {
	const confirmedBookings = bookings.filter(
		(booking) => booking.status === "confirmed"
	);
	const documentCount =
		documents.length +
		vaultItems.filter((item) => item.kind === "document").length;
	const openRiskCount = risks.filter((risk) => risk.status === "open").length;
	const hasBudget = Boolean(budgetAmount && budgetAmount > 0);
	const itineraryPlaceCount = itineraryItems.filter((item) =>
		Boolean(item.locationName)
	).length;
	const placeCount = savedPlaces.length + itineraryPlaceCount;

	return [
		{
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
		},
		{
			health: placeCount > 0 ? "inProgress" : "empty",
			id: "places",
			label: "Map",
			primaryAction: "Add places",
			requirements: [
				{
					detail:
						placeCount > 0
							? `${placeCount} places available`
							: "Add saved places or itinerary locations",
					isComplete: placeCount > 0,
					label: "Places",
				},
			],
			value: `${placeCount} places`,
		},
		{
			health: getBookingHealth({
				bookingCount: bookings.length,
				confirmedBookingCount: confirmedBookings.length,
			}),
			id: "bookings",
			label: "Bookings",
			primaryAction: "Manage bookings",
			requirements: [
				{
					detail: `${confirmedBookings.length}/${bookings.length} confirmed`,
					isComplete:
						bookings.length > 0 && confirmedBookings.length === bookings.length,
					label: "Confirmations",
				},
			],
			value: `${bookings.length} targets`,
		},
		{
			health: documentCount > 0 ? "inProgress" : "empty",
			id: "documents",
			label: "Documents",
			primaryAction: "Open vault",
			requirements: [
				{
					detail:
						documentCount > 0
							? `${documentCount} saved files`
							: "Upload IDs, tickets, permits, or confirmations",
					isComplete: documentCount > 0,
					label: "Travel files",
				},
			],
			value: `${documentCount} files`,
		},
		{
			health: hasBudget ? "ready" : "empty",
			id: "budget",
			label: "Budget",
			primaryAction: "Set budget",
			requirements: [
				{
					detail: hasBudget ? "Trip budget is set" : "Add a total trip budget",
					isComplete: hasBudget,
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
			value: hasBudget ? "Set" : "Not set",
		},
		{
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
		},
		{
			health: openRiskCount > 0 ? "issue" : "ready",
			id: "risks",
			label: "Risks",
			primaryAction: "Review risks",
			requirements: [
				{
					detail:
						openRiskCount > 0 ? `${openRiskCount} open risks` : "No open risks",
					isComplete: openRiskCount === 0,
					label: "Open risks",
				},
			],
			value: openRiskCount > 0 ? `${openRiskCount} open` : "Clear",
		},
		{
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
		},
		{
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
		},
	];
};
