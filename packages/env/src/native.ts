import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "EXPO_PUBLIC_",
	client: {
		EXPO_PUBLIC_CONVEX_URL: z.url(),
		EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
	},
	// Expo only inlines EXPO_PUBLIC_* values referenced by name, so a release
	// bundle sees nothing when the whole process.env object is passed.
	runtimeEnv: {
		EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
			process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
		EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
	},
	emptyStringAsUndefined: true,
});
