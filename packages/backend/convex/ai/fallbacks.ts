import type {
	DetectedRisks,
	GeneratedItinerary,
	ReadinessAiOutput,
	VaultExtraction,
	WrappedSummary,
} from "@viya-app/domain";
import { palawanDemoTrip } from "@viya-app/domain/demo/palawan";

export const fallbackItinerary: GeneratedItinerary = {
	summary: palawanDemoTrip.trip.summary,
	assumptions: [
		"Using the seeded Palawan demo trip because live AI is unavailable.",
	],
	days: palawanDemoTrip.days.map((day) => ({
		date: day.date,
		estimatedCost: day.estimatedCost,
		items: palawanDemoTrip.items
			.filter((item) => item.dayId === day.id)
			.map((item) => ({
				aiReason: item.aiReason,
				category: item.category,
				description: item.description,
				endTime: item.endTime,
				estimatedCost: item.estimatedCost,
				locationName: item.locationName,
				priority: item.priority,
				startTime: item.startTime,
				title: item.title,
			})),
		pace: day.pace,
		summary: day.summary,
		theme: day.theme,
		title: day.title,
	})),
	nextActions: [
		"Confirm final night hotel",
		"Book airport transfer",
		"Add rain backup plan",
	],
	warnings: [
		"Final night accommodation is not confirmed.",
		"Day 3 needs a weather backup.",
	],
};

export const fallbackReadiness: ReadinessAiOutput = {
	overallScore: 68,
	categoryScores: {
		backupPlan: 100,
		bookings: 72,
		budget: 100,
		documents: 100,
		group: 100,
		packing: 100,
		safety: 100,
		schedule: 100,
		transport: 82,
		weather: 82,
	},
	missingItems: [
		{
			category: "bookings",
			priority: "critical",
			reason:
				"The saved hotel coverage does not appear to include the final night.",
			title: "Confirm final night hotel",
		},
		{
			category: "transport",
			priority: "high",
			reason: "Arrival is late and no airport transfer is saved.",
			title: "Book airport transfer",
		},
		{
			category: "weather",
			priority: "high",
			reason: "Day 3 island hopping is weather-sensitive.",
			title: "Add rain backup plan",
		},
	],
	suggestedActions: [
		{ actionType: "create_task", label: "Create hotel confirmation task" },
		{ actionType: "create_task", label: "Create airport transfer reminder" },
	],
	summary: "Almost ready, but 3 important items need attention.",
};

export const fallbackRisks: DetectedRisks = {
	risks: palawanDemoTrip.risks.map((risk) => ({
		aiReason: risk.aiReason,
		message: risk.message,
		relatedEntityId: risk.relatedEntityId,
		relatedEntityType: risk.relatedEntityType,
		severity: risk.severity,
		suggestedAction: risk.suggestedAction,
		title: risk.title,
		type: risk.type,
	})),
};

export const fallbackWrapped: WrappedSummary = {
	bestMoments: [
		{
			caption: "Soft skies, salt air, and the first quiet moment of the trip.",
			reason: "It marks the emotional start of the journey.",
			title: "First Palawan sunset",
		},
	],
	nextTripSuggestions: ["Plan a slower beach-focused return to Palawan"],
	shareableCards: [
		{
			body: "A scenic, balanced Palawan escape with island time and practical planning wins.",
			title: "Palawan Escape",
		},
	],
	stats: {
		days: palawanDemoTrip.days.length,
		momentsCaptured: palawanDemoTrip.moments.length,
		plannedActivities: palawanDemoTrip.items.length,
		readinessScore: 68,
	},
	travelPersonality: "Balanced scenic planner",
	tripSummary: palawanDemoTrip.trip.summary,
};

export const fallbackVaultExtraction: VaultExtraction = {
	booking: null,
	confidence: 0.4,
	documentType: "other",
	extractedTitle: "Uploaded travel file",
	readinessSuggestions: [
		{
			category: "documents",
			priority: "medium",
			reason:
				"A new Vault file was added and should be reviewed before departure.",
			title: "Review uploaded travel file",
		},
	],
	summary:
		"Viya saved this file to the trip Vault. Review it to confirm whether it is a booking, ID, voucher, or note.",
};
