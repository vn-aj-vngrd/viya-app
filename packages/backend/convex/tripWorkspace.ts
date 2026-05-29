// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths.

import { getTripModuleSummaries } from "@viya-app/domain";
import { v } from "convex/values";

import { query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

export const getTripWorkspace = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const trip = await ensureTripAccess(ctx, args.tripId, identity.subject);
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
		const sortedItineraryItems = [...itineraryItems].sort(
			(firstItem, secondItem) =>
				`${firstItem.startTime}-${firstItem.title}`.localeCompare(
					`${secondItem.startTime}-${secondItem.title}`
				)
		);
		const sortedBookings = [...bookings].sort((firstBooking, secondBooking) =>
			`${firstBooking.startDateTime ?? ""}-${firstBooking.title}`.localeCompare(
				`${secondBooking.startDateTime ?? ""}-${secondBooking.title}`
			)
		);
		const sortedMoments = [...moments].sort(
			(firstMoment, secondMoment) =>
				secondMoment.createdAt - firstMoment.createdAt
		);
		const hydratedVaultItems = await Promise.all(
			vaultItems.map(async (item) => ({
				...item,
				url: await ctx.storage.getUrl(item.storageId),
			}))
		);
		const moduleSummaries = getTripModuleSummaries({
			bookings: sortedBookings,
			budgetAmount: trip.budgetAmount,
			documents,
			expenses,
			itineraryDays: sortedItineraryDays,
			itineraryItems: sortedItineraryItems,
			notes,
			companions,
			readinessScore: trip.readinessScore,
			risks,
			savedPlaces,
			vaultItems: hydratedVaultItems,
		});

		return {
			agentDrafts,
			bookings: sortedBookings,
			documents,
			expenses,
			itineraryDays: sortedItineraryDays,
			itineraryItems: sortedItineraryItems,
			moduleSummaries,
			moments: sortedMoments,
			notes,
			companions,
			readinessItems,
			risks,
			savedPlaces,
			trip,
			vaultItems: hydratedVaultItems,
		};
	},
});
