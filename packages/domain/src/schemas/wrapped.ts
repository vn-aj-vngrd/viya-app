import { z } from "zod";

export const wrappedSummarySchema = z.object({
	tripSummary: z.string().min(1),
	stats: z.object({
		days: z.number().int().nonnegative(),
		plannedActivities: z.number().int().nonnegative(),
		momentsCaptured: z.number().int().nonnegative(),
		readinessScore: z.number().int().min(0).max(100),
	}),
	bestMoments: z.array(
		z.object({
			title: z.string().min(1),
			caption: z.string().min(1),
			reason: z.string().min(1),
		})
	),
	travelPersonality: z.string().min(1),
	shareableCards: z.array(
		z.object({
			title: z.string().min(1),
			body: z.string().min(1),
		})
	),
	nextTripSuggestions: z.array(z.string().min(1)),
});

export type WrappedSummary = z.infer<typeof wrappedSummarySchema>;
