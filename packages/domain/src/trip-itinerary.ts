interface TripItineraryTimelineSortInput {
	dayId: string;
	startTime: string;
	title: string;
}

const unknownDayOrder = Number.MAX_SAFE_INTEGER;

const getTimelineDayOrder = (
	dayId: string,
	dayOrderById: ReadonlyMap<string, number>
) => dayOrderById.get(dayId) ?? unknownDayOrder;

export const sortTripItineraryItemsForTimeline = <
	Item extends TripItineraryTimelineSortInput,
>(
	items: readonly Item[],
	dayOrderById: ReadonlyMap<string, number> = new Map()
) =>
	[...items].sort((firstItem, secondItem) => {
		const dayOrderDelta =
			getTimelineDayOrder(firstItem.dayId, dayOrderById) -
			getTimelineDayOrder(secondItem.dayId, dayOrderById);

		if (dayOrderDelta !== 0) {
			return dayOrderDelta;
		}

		return (
			firstItem.startTime.localeCompare(secondItem.startTime) ||
			firstItem.title.localeCompare(secondItem.title)
		);
	});
