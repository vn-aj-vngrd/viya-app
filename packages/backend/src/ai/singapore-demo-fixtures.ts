import type { VaultExtraction } from "@viya-app/domain";

const normalizedFixtureNames = new Set([
	"singapore-flight-confirmation.txt",
	"singapore-hotel-voucher.txt",
	"singapore-tech-week-pass.txt",
	"singapore-expense-receipt.txt",
	"singapore-readiness-note.txt",
]);

const normalizeFileName = (fileName: string) => fileName.trim().toLowerCase();

const fixtureExtractions: Record<string, VaultExtraction> = {
	"singapore-activity-receipt.txt": {
		booking: null,
		confidence: 0.94,
		documentType: "receipt",
		expense: {
			amount: 82,
			category: "transport",
			currency: "SGD",
			notes:
				"MRT, SIM, coffee, and airport transfer bundle for the Singapore demo.",
			spentAt: "2026-09-28",
			title: "Singapore arrival essentials",
		},
		extractedTitle: "Singapore arrival essentials receipt",
		readinessSuggestions: [
			{
				category: "budget",
				priority: "medium",
				reason:
					"Arrival transit and SIM spend should be tracked separately from conference bookings.",
				title: "Track Singapore arrival essentials",
			},
		],
		summary:
			"Receipt for SGD 82 covering MRT, SIM, coffee, and airport transfer setup for the solo Singapore conference trip.",
	},
	"singapore-expense-receipt.txt": {
		booking: null,
		confidence: 0.94,
		documentType: "receipt",
		expense: {
			amount: 82,
			category: "transport",
			currency: "SGD",
			notes:
				"MRT, SIM, coffee, and airport transfer bundle for the Singapore demo.",
			spentAt: "2026-09-28",
			title: "Singapore arrival essentials",
		},
		extractedTitle: "Singapore arrival essentials receipt",
		readinessSuggestions: [
			{
				category: "budget",
				priority: "medium",
				reason:
					"Arrival transit and SIM spend should be tracked separately from conference bookings.",
				title: "Track Singapore arrival essentials",
			},
		],
		summary:
			"Receipt for SGD 82 covering MRT, SIM, coffee, and airport transfer setup for the solo Singapore conference trip.",
	},
	"singapore-flight-confirmation.txt": {
		booking: {
			confirmationCode: "VIYA-SIN-2026",
			cost: 21_800,
			currency: "PHP",
			endDateTime: "2026-10-01T22:20:00+08:00",
			locationName: "Singapore Changi Airport",
			provider: "Singapore Airlines",
			startDateTime: "2026-09-28T09:10:00+08:00",
			title: "Manila to Singapore round-trip flight",
			type: "flight",
		},
		confidence: 0.98,
		documentType: "ticket",
		extractedTitle: "Manila to Singapore flight confirmation",
		readinessSuggestions: [
			{
				category: "bookings",
				priority: "high",
				reason:
					"Flight confirmation VIYA-SIN-2026 proves the Manila to Singapore booking is confirmed.",
				title: "Confirm flight booking coverage",
			},
			{
				category: "transport",
				priority: "high",
				reason:
					"Airport transfer timing should be buffered around the Manila to Singapore flight.",
				title: "Add airport transfer buffer",
			},
		],
		summary:
			"Confirmed Manila to Singapore round-trip flight for September 28 to October 1, 2026. Confirmation VIYA-SIN-2026. Total paid PHP 21,800.",
	},
	"singapore-hotel-voucher.txt": {
		booking: {
			confirmationCode: "HOTEL-SIN-WIN",
			cost: 32_400,
			currency: "PHP",
			endDateTime: "2026-10-01T11:00:00+08:00",
			locationName: "Marina Bay / City Hall, Singapore",
			provider: "City Hall Business Hotel",
			startDateTime: "2026-09-28T15:00:00+08:00",
			title: "Singapore conference hotel",
			type: "hotel",
		},
		confidence: 0.97,
		documentType: "voucher",
		extractedTitle: "Singapore conference hotel voucher",
		readinessSuggestions: [
			{
				category: "bookings",
				priority: "high",
				reason:
					"Hotel voucher HOTEL-SIN-WIN proves the Marina Bay / City Hall stay is confirmed.",
				title: "Confirm hotel booking coverage",
			},
			{
				category: "schedule",
				priority: "medium",
				reason:
					"Hotel check-in lands before the conference block and should anchor Day 1.",
				title: "Anchor hotel check-in on itinerary",
			},
		],
		summary:
			"Hotel voucher for a solo Singapore conference stay near Marina Bay / City Hall from September 28 to October 1, 2026. Confirmation HOTEL-SIN-WIN. Total paid PHP 32,400.",
	},
	"singapore-readiness-note.txt": {
		booking: null,
		confidence: 0.9,
		documentType: "other",
		extractedTitle: "Singapore readiness reminders",
		readinessSuggestions: [
			{
				category: "documents",
				priority: "critical",
				reason:
					"Passport validity and SG Arrival Card should be confirmed before departure.",
				title: "Confirm passport and SG Arrival Card",
			},
			{
				category: "packing",
				priority: "medium",
				reason:
					"Smart casual conference outfit keeps the trip polished without overpacking.",
				title: "Pack smart casual conference outfit",
			},
			{
				category: "backupPlan",
				priority: "low",
				reason:
					"Keep one light backup block so jet lag does not turn networking into a boss fight.",
				title: "Add jet lag backup block",
			},
			{
				category: "weather",
				priority: "medium",
				reason:
					"Check Singapore weather and keep an indoor backup so rain does not disrupt conference-adjacent plans.",
				title: "Confirm weather and indoor backup",
			},
			{
				category: "safety",
				priority: "medium",
				reason:
					"Save emergency contacts, passport safety details, and SG Arrival Card proof before departure.",
				title: "Save emergency contacts and passport safety note",
			},
			{
				category: "group",
				priority: "medium",
				reason:
					"Confirm team roles, contact handoff, and who owns badge pickup on conference days.",
				title: "Confirm team roles and contact handoff",
			},
		],
		summary:
			"Readiness note for passport validity, SG Arrival Card, event badge pickup, smart casual outfit, Singapore weather backup, emergency contacts, team roles, contact handoff, and not accidentally pitching while jet-lagged.",
	},
	"singapore-tech-week-pass.txt": {
		booking: {
			confirmationCode: null,
			cost: null,
			currency: null,
			endDateTime: "2026-09-30T18:00:00+08:00",
			locationName: "Marina Bay Sands, Singapore",
			provider: "Tech Week Singapore",
			startDateTime: "2026-09-29T09:00:00+08:00",
			title: "Tech Week Singapore conference pass",
			type: "activity",
		},
		confidence: 0.96,
		documentType: "permit",
		extractedTitle: "Tech Week Singapore event pass",
		readinessSuggestions: [
			{
				category: "documents",
				priority: "high",
				reason:
					"Badge pickup is required before entering the Marina Bay Sands event floor.",
				title: "Prepare Tech Week badge pickup",
			},
			{
				category: "schedule",
				priority: "medium",
				reason:
					"Conference days need protected blocks with recovery time after networking.",
				title: "Protect conference focus blocks",
			},
			{
				category: "group",
				priority: "medium",
				reason:
					"Team members need the Tech Week badge pickup plan and event-floor handoff before arrival.",
				title: "Share conference badge pickup plan",
			},
		],
		summary:
			"Tech Week Singapore pass for September 29-30, 2026 at Marina Bay Sands. Pass holder is a solo founder / builder with badge pickup reminder.",
	},
};

export const isSingaporeDemoFixtureFile = (fileName: string): boolean =>
	normalizedFixtureNames.has(normalizeFileName(fileName));

export const getSingaporeDemoVaultExtraction = (
	fileName: string
): VaultExtraction | null =>
	fixtureExtractions[normalizeFileName(fileName)] ?? null;
