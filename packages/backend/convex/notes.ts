import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTripAccess, getRequiredIdentity } from "./lib/auth";

const touchTrip = async (ctx: MutationCtx, tripId: Id<"trips">) => {
	await ctx.db.patch(tripId, { updatedAt: Date.now() });
};

const getRequiredTripNote = async (
	ctx: MutationCtx,
	noteId: Id<"tripNotes">,
	ownerId: string
) => {
	const note = await ctx.db.get(noteId);

	if (!note) {
		throw new ConvexError("TRIP_NOTE_NOT_FOUND");
	}

	await ensureTripAccess(ctx, note.tripId, ownerId);

	return note;
};

export const listTripNotes = query({
	args: { tripId: v.id("trips") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const notes = await ctx.db
			.query("tripNotes")
			.withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
			.collect();

		return [...notes].sort(
			(firstNote, secondNote) => secondNote.updatedAt - firstNote.updatedAt
		);
	},
});

export const createTripNote = mutation({
	args: {
		body: v.string(),
		category: v.string(),
		title: v.string(),
		tripId: v.id("trips"),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		await ensureTripAccess(ctx, args.tripId, identity.subject);
		const now = Date.now();
		const noteId = await ctx.db.insert("tripNotes", {
			...args,
			createdAt: now,
			updatedAt: now,
		});
		await touchTrip(ctx, args.tripId);

		return ctx.db.get(noteId);
	},
});

export const updateTripNote = mutation({
	args: {
		noteId: v.id("tripNotes"),
		body: v.optional(v.string()),
		category: v.optional(v.string()),
		title: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const note = await getRequiredTripNote(ctx, args.noteId, identity.subject);
		const { noteId, ...patch } = args;
		await ctx.db.patch(noteId, {
			...patch,
			updatedAt: Date.now(),
		});
		await touchTrip(ctx, note.tripId);

		return ctx.db.get(noteId);
	},
});

export const deleteTripNote = mutation({
	args: { noteId: v.id("tripNotes") },
	handler: async (ctx, args) => {
		const identity = await getRequiredIdentity(ctx);
		const note = await getRequiredTripNote(ctx, args.noteId, identity.subject);
		await ctx.db.delete(args.noteId);
		await touchTrip(ctx, note.tripId);

		return { deletedNoteId: args.noteId };
	},
});
