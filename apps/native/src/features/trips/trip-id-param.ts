import type { Id } from "@viya-app/backend/convex/_generated/dataModel";

const convexIdParamPattern = /^[a-z0-9]{16,}$/i;

export const getTripIdParamValue = (
	tripId: string | string[] | undefined
): Id<"trips"> | null => {
	const value = Array.isArray(tripId) ? tripId[0] : tripId;

	if (!(value && convexIdParamPattern.test(value))) {
		return null;
	}

	return value as Id<"trips">;
};
