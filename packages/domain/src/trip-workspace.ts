interface BookingStatusLike {
	status: string;
}

interface RiskStatusLike {
	status: string;
}

interface VaultStatusLike {
	status: string;
}

export type TripWorkspaceNextActionTarget =
	| "itinerary"
	| "bookings"
	| "documents"
	| "budget"
	| "readiness"
	| "risks"
	| "travel";

export interface TripWorkspaceNextAction {
	description: string;
	label: string;
	target: TripWorkspaceNextActionTarget;
}

interface TripWorkspaceNextActionInput {
	bookings: readonly BookingStatusLike[];
	budgetAmount?: number;
	itineraryItemCount: number;
	readinessScore: number;
	risks: readonly RiskStatusLike[];
	vaultItems: readonly VaultStatusLike[];
}

const hasBookingGaps = (bookings: readonly BookingStatusLike[]) =>
	bookings.some(
		(booking) => booking.status === "target" || booking.status === "missing"
	);

const hasOpenRisks = (risks: readonly RiskStatusLike[]) =>
	risks.some((risk) => risk.status === "open");

export const getTripWorkspaceNextAction = ({
	bookings,
	budgetAmount,
	itineraryItemCount,
	readinessScore,
	risks,
	vaultItems,
}: TripWorkspaceNextActionInput): TripWorkspaceNextAction => {
	if (hasOpenRisks(risks)) {
		return {
			description: "Resolve safety, schedule, budget, or document risks first.",
			label: "Review open risks",
			target: "risks",
		};
	}

	if (hasBookingGaps(bookings)) {
		return {
			description: "Book externally, then attach confirmations to the trip.",
			label: "Review booking targets",
			target: "bookings",
		};
	}

	if (vaultItems.length === 0) {
		return {
			description: "Upload IDs, tickets, confirmations, receipts, or permits.",
			label: "Upload travel documents",
			target: "documents",
		};
	}

	if (!budgetAmount || budgetAmount <= 0) {
		return {
			description: "Set a budget so Viya can calculate remaining spend.",
			label: "Set trip budget",
			target: "budget",
		};
	}

	if (readinessScore < 90) {
		return {
			description: "Close the remaining checklist items before travel.",
			label: "Fix readiness gaps",
			target: "readiness",
		};
	}

	if (itineraryItemCount === 0) {
		return {
			description: "Add timed places, meals, transport, and activities.",
			label: "Build itinerary",
			target: "itinerary",
		};
	}

	return {
		description: "Your core trip modules are ready for day-of use.",
		label: "Open travel mode",
		target: "travel",
	};
};
