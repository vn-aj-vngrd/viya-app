interface BookingStatusLike {
	status: string;
}

interface VaultStatusLike {
	status: string;
}

interface LifecycleStageInput {
	bookings: readonly BookingStatusLike[];
	readinessScore: number;
	vaultItems: readonly VaultStatusLike[];
}

export type LifecycleStage = "book" | "sync" | "check" | "travel";

export const getLifecycleStageSummary = ({
	bookings,
	readinessScore,
	vaultItems,
}: LifecycleStageInput) => {
	const hasBookingGaps = bookings.some(
		(booking) => booking.status === "target" || booking.status === "missing"
	);

	if (hasBookingGaps) {
		return {
			nextStage: "book" as const,
			primaryActionLabel: "Review booking targets",
			supportingText:
				"Book externally, then upload confirmations through TripSync.",
		};
	}

	if (vaultItems.length === 0) {
		return {
			nextStage: "sync" as const,
			primaryActionLabel: "Upload confirmations",
			supportingText:
				"Sync bookings, documents, and receipts before readiness checks.",
		};
	}

	if (readinessScore < 90) {
		return {
			nextStage: "check" as const,
			primaryActionLabel: "Fix readiness gaps",
			supportingText: "Close the remaining checklist items before travel.",
		};
	}

	return {
		nextStage: "travel" as const,
		primaryActionLabel: "Open travel mode",
		supportingText: "Core booking, sync, and readiness steps are in shape.",
	};
};
