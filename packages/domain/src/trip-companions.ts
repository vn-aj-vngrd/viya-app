export interface TripCompanionCoordinationSortInput {
	name: string;
	role: string;
}

const companionRolePriority: Record<string, number> = {
	organizer: 0,
	emergencyContact: 1,
	driver: 2,
	payer: 3,
	localContact: 4,
	traveler: 5,
	child: 6,
	other: 7,
};

const getCompanionRolePriority = (role: string) =>
	companionRolePriority[role] ?? companionRolePriority.other;

export const sortTripCompanionsForCoordination = <
	Companion extends TripCompanionCoordinationSortInput,
>(
	companions: readonly Companion[]
): Companion[] =>
	[...companions].sort((firstCompanion, secondCompanion) => {
		const roleDelta =
			getCompanionRolePriority(firstCompanion.role) -
			getCompanionRolePriority(secondCompanion.role);

		if (roleDelta !== 0) {
			return roleDelta;
		}

		return firstCompanion.name.localeCompare(secondCompanion.name);
	});
