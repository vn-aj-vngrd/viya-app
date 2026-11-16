import type { PhDestination } from "@viya-app/domain";

/**
 * Philippine destination order, copy and season come from the ranker in
 * `@viya-app/domain` (`rankPhilippineDestinations`). This file only keeps the
 * imagery lookup: the Wikipedia title for a destination's photo, with an
 * override (`imageQuery`) for names that are ambiguous on their own.
 */
export const getDestinationImageKey = (
	destination: Pick<PhDestination, "imageQuery" | "name">
) => destination.imageQuery ?? destination.name;
