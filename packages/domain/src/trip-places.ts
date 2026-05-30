export interface TripPlaceRouteSortInput {
	assignedDayId?: string;
	title: string;
	updatedAt?: number;
}

const unassignedDayOrder = Number.MAX_SAFE_INTEGER;

const getAssignedDayOrder = (
	assignedDayId: string | undefined,
	dayOrderById: ReadonlyMap<string, number>
) => {
	if (!assignedDayId) {
		return unassignedDayOrder;
	}

	return dayOrderById.get(assignedDayId) ?? unassignedDayOrder - 1;
};

export const sortTripPlacesForRouteReview = <
	Place extends TripPlaceRouteSortInput,
>(
	places: readonly Place[],
	dayOrderById: ReadonlyMap<string, number> = new Map()
): Place[] =>
	[...places].sort((firstPlace, secondPlace) => {
		const firstDayOrder = getAssignedDayOrder(
			firstPlace.assignedDayId,
			dayOrderById
		);
		const secondDayOrder = getAssignedDayOrder(
			secondPlace.assignedDayId,
			dayOrderById
		);
		const dayOrderDelta = firstDayOrder - secondDayOrder;

		if (dayOrderDelta !== 0) {
			return dayOrderDelta;
		}

		const firstIsAssigned = Boolean(firstPlace.assignedDayId);
		const secondIsAssigned = Boolean(secondPlace.assignedDayId);

		if (firstIsAssigned && secondIsAssigned) {
			return firstPlace.title.localeCompare(secondPlace.title);
		}

		const updatedAtDelta =
			(secondPlace.updatedAt ?? 0) - (firstPlace.updatedAt ?? 0);

		if (updatedAtDelta !== 0) {
			return updatedAtDelta;
		}

		return firstPlace.title.localeCompare(secondPlace.title);
	});
