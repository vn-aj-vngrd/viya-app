import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";

const tripRoute = (tripId: Id<"trips">, leaf = "") =>
	({
		params: { tripId },
		pathname: `/(app)/trips/[tripId]${leaf}`,
	}) as Href;

export const VIYA_ROUTES = {
	home: "/(app)/(tabs)",
	newTrip: "/(app)/trips/new",
	trips: "/(app)/(tabs)/trips",
	viya: "/(app)/(tabs)/viya",
	tripBookings: (tripId: Id<"trips">) => tripRoute(tripId, "/bookings"),
	tripBudget: (tripId: Id<"trips">) => tripRoute(tripId, "/budget"),
	tripCompanions: (tripId: Id<"trips">) => tripRoute(tripId, "/companions"),
	tripDashboard: (tripId: Id<"trips">) => tripRoute(tripId),
	tripItinerary: (tripId: Id<"trips">) => tripRoute(tripId, "/itinerary"),
	tripMoments: (tripId: Id<"trips">) => tripRoute(tripId, "/moments"),
	tripNotes: (tripId: Id<"trips">) => tripRoute(tripId, "/notes"),
	tripPlaces: (tripId: Id<"trips">) => tripRoute(tripId, "/places"),
	tripReadiness: (tripId: Id<"trips">) => tripRoute(tripId, "/readiness"),
	tripRisks: (tripId: Id<"trips">) => tripRoute(tripId, "/risks"),
	tripTravelMode: (tripId: Id<"trips">) => tripRoute(tripId, "/travel-mode"),
	tripVault: (tripId: Id<"trips">) => tripRoute(tripId, "/vault"),
	tripWrapped: (tripId: Id<"trips">) => tripRoute(tripId, "/wrapped"),
} as const;
