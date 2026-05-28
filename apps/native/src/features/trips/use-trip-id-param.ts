import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";

export const useTripIdParam = (): Id<"trips"> | null => {
	const { tripId } = useLocalSearchParams<{ tripId?: string | string[] }>();
	const value = Array.isArray(tripId) ? tripId[0] : tripId;

	return value ? (value as Id<"trips">) : null;
};
