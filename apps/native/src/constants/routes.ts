import { DEMO_TRIP_ID } from "@viya-app/domain";
import type { Href } from "expo-router";

export const VIYA_ROUTES = {
	home: "/(drawer)/(tabs)",
	trips: "/(drawer)/(tabs)/trips",
	viya: "/(drawer)/(tabs)/viya",
	moments: "/(drawer)/(tabs)/moments",
	profile: "/(drawer)/(tabs)/profile",
	tripDashboard: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]",
	} as unknown as Href,
	tripItinerary: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/itinerary",
	} as unknown as Href,
	tripReadiness: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/readiness",
	} as unknown as Href,
	tripRisks: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/risks",
	} as unknown as Href,
	tripTravelMode: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/travel-mode",
	} as unknown as Href,
	tripMoments: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/moments",
	} as unknown as Href,
	tripVault: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/vault",
	} as unknown as Href,
	tripWrapped: {
		params: { tripId: DEMO_TRIP_ID },
		pathname: "/(drawer)/trips/[tripId]/wrapped",
	} as unknown as Href,
} as const;
