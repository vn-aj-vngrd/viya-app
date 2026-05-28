interface BookingLike {
	_id?: string;
	id?: string;
	status: string;
	type: string;
}

export const getBookingProgress = (bookings: readonly BookingLike[]) => {
	const confirmed = bookings.filter(
		(booking) => booking.status === "confirmed"
	).length;

	return {
		confirmed,
		remaining: Math.max(0, bookings.length - confirmed),
		total: bookings.length,
	};
};

export const groupBookingsByType = <Booking extends BookingLike>(
	bookings: readonly Booking[]
) =>
	Object.entries(
		bookings.reduce<Record<string, Booking[]>>((groups, booking) => {
			const currentGroup = groups[booking.type] ?? [];
			currentGroup.push(booking);
			groups[booking.type] = currentGroup;
			return groups;
		}, {})
	).map(([type, items]) => ({ items, type }));
