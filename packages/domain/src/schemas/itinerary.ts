import { z } from "zod";

export const generatedItinerarySchema = z.object({
	summary: z.string().min(1),
	assumptions: z.array(z.string().min(1)),
	days: z.array(
		z.object({
			date: z.string().min(1),
			title: z.string().min(1),
			summary: z.string().min(1),
			theme: z.string().min(1),
			estimatedCost: z.number().nonnegative(),
			pace: z.enum(["light", "balanced", "packed"]),
			items: z.array(
				z.object({
					title: z.string().min(1),
					description: z.string().min(1),
					category: z.enum([
						"activity",
						"food",
						"transport",
						"hotel",
						"rest",
						"shopping",
						"note",
						"flight",
						"emergency",
					]),
					startTime: z.string().min(1),
					endTime: z.string().min(1),
					locationName: z.string().min(1),
					estimatedCost: z.number().nonnegative(),
					priority: z.enum(["required", "recommended", "optional"]),
					aiReason: z.string().min(1),
				})
			),
		})
	),
	warnings: z.array(z.string().min(1)),
	nextActions: z.array(z.string().min(1)),
});

export type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>;
