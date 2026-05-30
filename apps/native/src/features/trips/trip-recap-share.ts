interface TripRecapShareInput {
	completedItems: number;
	confirmedBookings: number;
	currency: string;
	dateWindow: string;
	destination: string;
	highlightTitles: readonly string[];
	remainingAmount: number;
	savedDocumentCount: number;
	title: string;
	totalItems: number;
	totalTrackedSpend: number;
}

const formatShareMoney = (amount: number, currency: string) =>
	new Intl.NumberFormat("en-PH", {
		currency,
		maximumFractionDigits: 0,
		style: "currency",
	})
		.format(amount)
		.replace("₱", "PHP ");

export const buildTripRecapShareMessage = ({
	completedItems,
	confirmedBookings,
	currency,
	dateWindow,
	destination,
	highlightTitles,
	remainingAmount,
	savedDocumentCount,
	title,
	totalItems,
	totalTrackedSpend,
}: TripRecapShareInput) => {
	const highlights =
		highlightTitles.length > 0
			? highlightTitles.slice(0, 4).join(", ")
			: "Add moments to complete the trip story";

	return [
		title,
		`${destination} · ${dateWindow}`,
		"",
		`Highlights: ${highlights}`,
		`Itinerary: ${completedItems}/${totalItems} completed`,
		`Spend tracked: ${formatShareMoney(
			totalTrackedSpend,
			currency
		)} · ${formatShareMoney(remainingAmount, currency)} remaining`,
		`Bookings and files: ${confirmedBookings} confirmed · ${savedDocumentCount} saved`,
		"",
		"Planned with Viya.",
	].join("\n");
};
