import { z } from "zod";

export const readinessAiOutputSchema = z.object({
	overallScore: z.number().int().min(0).max(100),
	categoryScores: z.object({
		documents: z.number().int().min(0).max(100),
		bookings: z.number().int().min(0).max(100),
		packing: z.number().int().min(0).max(100),
		budget: z.number().int().min(0).max(100),
		schedule: z.number().int().min(0).max(100),
		transport: z.number().int().min(0).max(100),
		weather: z.number().int().min(0).max(100),
		safety: z.number().int().min(0).max(100),
		group: z.number().int().min(0).max(100),
		backupPlan: z.number().int().min(0).max(100),
	}),
	summary: z.string().min(1),
	missingItems: z.array(
		z.object({
			category: z.enum([
				"documents",
				"bookings",
				"packing",
				"budget",
				"schedule",
				"transport",
				"weather",
				"safety",
				"group",
				"backupPlan",
			]),
			title: z.string().min(1),
			priority: z.enum(["low", "medium", "high", "critical"]),
			reason: z.string().min(1),
		})
	),
	suggestedActions: z.array(
		z.object({
			label: z.string().min(1),
			actionType: z.string().min(1),
		})
	),
});

export type ReadinessAiOutput = z.infer<typeof readinessAiOutputSchema>;
