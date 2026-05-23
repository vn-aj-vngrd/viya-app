import { z } from "zod";

export const vaultExtractionSchema = z.object({
	booking: z
		.object({
			confirmationCode: z.string().nullable(),
			endDateTime: z.string().nullable(),
			locationName: z.string().nullable(),
			provider: z.string().nullable(),
			startDateTime: z.string().nullable(),
			title: z.string().min(1),
			type: z.enum([
				"flight",
				"hotel",
				"activity",
				"transport",
				"restaurant",
				"insurance",
				"other",
			]),
		})
		.nullable(),
	confidence: z.number().min(0).max(1),
	documentType: z.enum([
		"passport",
		"id",
		"visa",
		"insurance",
		"ticket",
		"voucher",
		"qr",
		"permit",
		"other",
	]),
	extractedTitle: z.string().min(1),
	readinessSuggestions: z.array(
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
			priority: z.enum(["low", "medium", "high", "critical"]),
			reason: z.string().min(1),
			title: z.string().min(1),
		})
	),
	summary: z.string().min(1),
});

export type VaultExtraction = z.infer<typeof vaultExtractionSchema>;
