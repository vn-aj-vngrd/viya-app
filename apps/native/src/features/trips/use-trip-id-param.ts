import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";

import { getTripIdParamValue } from "./trip-id-param";

export const useTripIdParam = (): Id<"trips"> | null => {
	const { tripId } = useLocalSearchParams<{ tripId?: string | string[] }>();

	return getTripIdParamValue(tripId);
};
