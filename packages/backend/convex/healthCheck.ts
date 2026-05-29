// biome-ignore-all lint/style/useFilenamingConvention: Convex public module path is already established.

import { query } from "./_generated/server";

export const get = query({
	handler: () => "OK",
});
