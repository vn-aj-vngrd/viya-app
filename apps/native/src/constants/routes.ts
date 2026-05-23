import type { Href } from "expo-router";

const CURRENT_TRIP_ID = "current";

export const VIYA_ROUTES = {
	home: "/(app)/(tabs)",
	trips: "/(app)/(tabs)/trips",
	viya: "/(app)/(tabs)/viya",
	tripDashboard: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]",
	} as unknown as Href,
	tripItinerary: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/itinerary",
	} as unknown as Href,
	tripMoments: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/moments",
	} as unknown as Href,
	tripReadiness: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/readiness",
	} as unknown as Href,
	tripRisks: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/risks",
	} as unknown as Href,
	tripTravelMode: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/travel-mode",
	} as unknown as Href,
	tripVault: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/vault",
	} as unknown as Href,
	tripWrapped: {
		params: { tripId: CURRENT_TRIP_ID },
		pathname: "/(app)/trips/[tripId]/wrapped",
	} as unknown as Href,
} as const;
