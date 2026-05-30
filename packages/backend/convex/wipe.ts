// biome-ignore-all lint/style/useFilenamingConvention: Convex public module path is already established.

import { internalMutation } from "./_generated/server";

const tables = [
	"itineraryItems",
	"itineraryDays",
	"savedPlaces",
	"readinessItems",
	"risks",
	"moments",
	"tripNotes",
	"tripCompanions",
	"travelDocuments",
	"bookings",
	"expenses",
	"tripAgentDrafts",
	"chatQuestionPrompts",
	"chatThreads",
	"vaultItems",
	"userPreferences",
	"trips",
	"users",
] as const;

export const all = internalMutation({
	handler: async (ctx) => {
		for (const table of tables) {
			const docs = await ctx.db.query(table).collect();
			for (const doc of docs) {
				if (table === "vaultItems" && "storageId" in doc) {
					await ctx.storage.delete(doc.storageId);
				}
				await ctx.db.delete(doc._id);
			}
		}
	},
});
