// biome-ignore-all lint/style/useFilenamingConvention: Convex public module path is already established.

import { query } from "./_generated/server";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (identity === null) {
			return {
				message: "Not authenticated",
			};
		}
		return {
			message: "This is private",
		};
	},
});
