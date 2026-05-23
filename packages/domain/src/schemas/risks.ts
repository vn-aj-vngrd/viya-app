import { z } from "zod";

export const detectedRisksSchema = z.object({
	risks: z.array(
		z.object({
			type: z.enum([
				"weather",
				"schedule",
				"booking",
				"budget",
				"transport",
				"safety",
				"group",
				"document",
				"fatigue",
				"unknown",
			]),
			severity: z.enum(["low", "medium", "high", "critical"]),
			title: z.string().min(1),
			message: z.string().min(1),
			suggestedAction: z.string().min(1),
			relatedEntityType: z.string().nullable(),
			relatedEntityId: z.string().nullable(),
			aiReason: z.string().min(1),
		})
	),
});

export type DetectedRisks = z.infer<typeof detectedRisksSchema>;
