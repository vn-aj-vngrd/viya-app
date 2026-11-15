interface TripRecapShareInput {
	budgetOutcome: string;
	completedItems: number;
	confirmedBookings: number;
	dateWindow: string;
	destination: string;
	fileCount: number;
	highlightTitles: readonly string[];
	title: string;
	totalBookings: number;
	totalItems: number;
}

export const buildTripRecapShareMessage = ({
	budgetOutcome,
	completedItems,
	confirmedBookings,
	dateWindow,
	destination,
	fileCount,
	highlightTitles,
	title,
	totalBookings,
	totalItems,
}: TripRecapShareInput) => {
	const highlightLine =
		highlightTitles.length > 0
			? `Highlights: ${highlightTitles.slice(0, 4).join(", ")}`
			: null;

	return [
		title,
		[destination, dateWindow].filter(Boolean).join(" · "),
		"",
		highlightLine,
		`Stops: ${completedItems} of ${totalItems} done`,
		budgetOutcome,
		`Bookings: ${confirmedBookings} of ${totalBookings} booked · ${fileCount} ${fileCount === 1 ? "file" : "files"}`,
	]
		.filter((line) => line !== null)
		.join("\n");
};
