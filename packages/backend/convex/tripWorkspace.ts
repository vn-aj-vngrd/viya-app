// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import {
	getReadinessProgress,
	getTripModuleSummaries,
	getTripTodayKey,
	sortReadinessItemsForReview,
	sortTripCompanionsForCoordination,
	sortTripExpensesForReview,
	sortTripItineraryItemsForTimeline,
	sortTripPlacesForRouteReview,
	sortTripRisksForReview,
} from "@viya-app/domain";
import { v } from "convex/values";

import { query } from "./_generated/server";
import { getRequiredIdentity } from "./lib/auth";

export const getTripWorkspace = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ctx.db.get(args.tripId);

		if (!trip || trip.ownerId !== identity.subject) {
			return null;
		}

		const [
			bookings,
			documents,
			expenses,
			itineraryDays,
			itineraryItems,
			moments,
			notes,
			companions,
			readinessItems,
			risks,
			savedPlaces,
			agentDrafts,
			vaultItems,
		] = await Promise.all([
			ctx.db
				.query("bookings")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("travelDocuments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("expenses")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryDays")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("itineraryItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("moments")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("tripNotes")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("tripCompanions")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("readinessItems")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("risks")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("savedPlaces")
				.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
				.collect(),
			ctx.db
				.query("tripAgentDrafts")
				.withIndex("by_trip_status", (q) =>
					q.eq("tripId", args.tripId).eq("status", "draft")
				)
				.collect(),
			ctx.db
				.query("vaultItems")
				.withIndex("by_owner_trip", (q) =>
					q.eq("ownerId", identity.subject).eq("tripId", args.tripId)
				)
				.collect(),
		]);

		const sortedItineraryDays = [...itineraryDays].sort(
			(firstDay, secondDay) => firstDay.dayNumber - secondDay.dayNumber
		);
		const dayOrderById = new Map(
			sortedItineraryDays.map((day) => [day._id, day.dayNumber])
		);
		const sortedItineraryItems = sortTripItineraryItemsForTimeline(
			itineraryItems,
			dayOrderById
		);
		const sortedBookings = [...bookings].sort((firstBooking, secondBooking) =>
			`${firstBooking.startDateTime ?? ""}-${firstBooking.title}`.localeCompare(
				`${secondBooking.startDateTime ?? ""}-${secondBooking.title}`
			)
		);
		const sortedExpenses = sortTripExpensesForReview(expenses);
		const sortedMoments = [...moments].sort(
			(firstMoment, secondMoment) =>
				secondMoment.createdAt - firstMoment.createdAt
		);
		const sortedNotes = [...notes].sort(
			(firstNote, secondNote) => secondNote.updatedAt - firstNote.updatedAt
		);
		const sortedCompanions = sortTripCompanionsForCoordination(companions);
		const sortedReadinessItems = sortReadinessItemsForReview(readinessItems);
		const sortedSavedPlaces = sortTripPlacesForRouteReview(
			savedPlaces,
			dayOrderById
		);
		const sortedRisks = sortTripRisksForReview(risks);
		const sortedVaultItems = [...vaultItems].sort(
			(firstVaultItem, secondVaultItem) =>
				secondVaultItem.createdAt - firstVaultItem.createdAt
		);
		const hydratedVaultItems = await Promise.all(
			sortedVaultItems.map(async (item) => ({
				...item,
				url: await ctx.storage.getUrl(item.storageId),
			}))
		);
		// Live score from the one readiness formula, so every screen agrees.
		const readinessScore =
			getReadinessProgress(readinessItems, getTripTodayKey()).percent ?? 0;
		const moduleSummaries = getTripModuleSummaries({
			bookings: sortedBookings,
			budgetAmount: trip.budgetAmount,
			documents,
			expenses: sortedExpenses,
			itineraryDays: sortedItineraryDays,
			itineraryItems: sortedItineraryItems,
			moments: sortedMoments,
			notes: sortedNotes,
			companions: sortedCompanions,
			readinessScore,
			risks: sortedRisks,
			savedPlaces: sortedSavedPlaces,
			vaultItems: hydratedVaultItems,
		});

		return {
			agentDrafts,
			bookings: sortedBookings,
			documents,
			expenses: sortedExpenses,
			itineraryDays: sortedItineraryDays,
			itineraryItems: sortedItineraryItems,
			moduleSummaries,
			moments: sortedMoments,
			notes: sortedNotes,
			companions: sortedCompanions,
			readinessItems: sortedReadinessItems,
			risks: sortedRisks,
			savedPlaces: sortedSavedPlaces,
			trip: { ...trip, readinessScore },
			vaultItems: hydratedVaultItems,
		};
	},
});
