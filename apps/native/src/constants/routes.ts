import type { Id } from "@viya-app/backend/convex/_generated/dataModel";
import type { Href } from "expo-router";

const tripRoute = (tripId: Id<"trips">, leaf = "") =>
	({
		params: { tripId },
		pathname: `/(app)/trips/[tripId]${leaf}`,
	}) as Href;

export const VIYA_ROUTES = {
	home: "/(app)/(tabs)/(discover)",
	ai: "/(app)/ai",
	newTrip: "/(app)/trips/new",
	preferences: "/(app)/onboarding/preferences",
	profile: "/(app)/(tabs)/(profile)/profile",
	profileAppearance: "/(app)/profile/appearance",
	profileTravel: "/(app)/profile/travel",
	trips: "/(app)/(tabs)/(trips)/trips",
	vault: "/(app)/(tabs)/(vault)/vault",
	viya: "/(app)/(tabs)/viya",
	tripBookings: (tripId: Id<"trips">) => tripRoute(tripId, "/bookings"),
	tripBudget: (tripId: Id<"trips">) => tripRoute(tripId, "/budget"),
	tripCompanions: (tripId: Id<"trips">) => tripRoute(tripId, "/companions"),
	tripDashboard: (tripId: Id<"trips">) => tripRoute(tripId),
	tripItinerary: (tripId: Id<"trips">) => tripRoute(tripId, "/itinerary"),
	tripItineraryDay: (tripId: Id<"trips">, dayNumber: number) =>
		({
			params: { dayNumber: String(dayNumber), tripId },
			pathname: "/(app)/trips/[tripId]/itinerary-day",
		}) as Href,
	tripMoments: (tripId: Id<"trips">) => tripRoute(tripId, "/moments"),
	tripNotes: (tripId: Id<"trips">) => tripRoute(tripId, "/notes"),
	tripPlaces: (tripId: Id<"trips">) => tripRoute(tripId, "/places"),
	tripReadiness: (tripId: Id<"trips">) => tripRoute(tripId, "/readiness"),
	tripRisks: (tripId: Id<"trips">) => tripRoute(tripId, "/risks"),
	tripTravelMode: (tripId: Id<"trips">) => tripRoute(tripId, "/travel-mode"),
	tripVault: (tripId: Id<"trips">) => tripRoute(tripId, "/vault"),
	tripWrapped: (tripId: Id<"trips">) => tripRoute(tripId, "/wrapped"),
} as const;
