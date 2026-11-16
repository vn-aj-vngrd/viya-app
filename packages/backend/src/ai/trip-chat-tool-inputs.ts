import { getDurationMinutes, normalizeTimeOfDay } from "@viya-app/domain";
import { z } from "zod";

import {
	maxItemsPerDay,
	type TripAgentDraftPayload,
	tripAgentDraftPayloadSchema,
	tripGroupTypeEnum,
	tripPaceEnum,
} from "./trip-agent-draft-apply";

/**
 * Tool argument schemas for the trip chat agent. They are deliberately
 * smaller than the stored draft payload (few required fields, plain names,
 * PHP amounts) so a mid-size model fills them reliably; the converters below
 * turn them into a full TripAgentDraftPayload.
 */

const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
	.describe("Date as YYYY-MM-DD (Asia/Manila).");
const clockTime = z
	.string()
	.regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM.")
	.describe("24-hour time HH:MM, e.g. 09:30 or 18:00.");
const maxListItems = 6;
const maxDraftDays = 7;
const maxRemovals = 10;

const draftMeta = {
	rationale: z
		.string()
		.describe("One or two sentences on why, written for the traveler."),
	title: z
		.string()
		.describe("Short draft title, 3 to 7 words, e.g. 'Rain-safe Day 2'."),
};

const stopCategory = z.enum([
	"activity",
	"food",
	"transport",
	"hotel",
	"rest",
	"shopping",
	"note",
	"flight",
	"emergency",
]);

const stopInput = z.object({
	category: stopCategory,
	description: z
		.string()
		.optional()
		.describe("One short line: what to do or how to get there."),
	endTime: clockTime,
	estimatedCostPhp: z
		.number()
		.min(0)
		.optional()
		.describe(
			"Rough total cost in PHP if you have a basis for it; omit when unknown. Always an estimate, never a quoted price."
		),
	locationName: z
		.string()
		.optional()
		.describe("Place or area name, e.g. 'Nacpan Beach, El Nido'."),
	priority: z.enum(["required", "recommended", "optional"]).optional(),
	startTime: clockTime,
	stopId: z
		.string()
		.optional()
		.describe(
			"Only to change or move an EXISTING stop: its stopId from getItinerary. Omit for a new stop."
		),
	title: z.string().min(1).describe("Stop name, e.g. 'Island hopping Tour A'."),
});

const dayInput = z.object({
	date: isoDate.describe("Day of the trip, YYYY-MM-DD, inside the trip dates."),
	pace: tripPaceEnum.optional(),
	stops: z
		.array(stopInput)
		.max(maxItemsPerDay)
		.describe(
			`Timed stops for this day, at most ${maxItemsPerDay}. Times must not overlap each other or existing stops.`
		),
	summary: z.string().optional().describe("One line describing the day."),
	title: z.string().optional().describe("Day title, e.g. 'Island hopping'."),
	weatherNote: z
		.string()
		.optional()
		.describe("Season or rain caution for the day, if relevant."),
});

export const itineraryProposalInput = z.object({
	...draftMeta,
	days: z
		.array(dayInput)
		.max(maxDraftDays)
		.describe(
			"Only the days that change. Stops you list are added, or update the existing stop with the same title or stopId."
		),
	removeStopIds: z
		.array(z.string())
		.max(maxRemovals)
		.optional()
		.describe("stopIds from getItinerary to remove from the trip."),
});

const bookingDateTime = z
	.string()
	.describe("YYYY-MM-DD or YYYY-MM-DDTHH:MM in Asia/Manila time.");

export const bookingProposalInput = z.object({
	...draftMeta,
	bookingTargets: z
		.array(
			z.object({
				endDateTime: bookingDateTime.optional(),
				estimatedCostPhp: z
					.number()
					.min(0)
					.optional()
					.describe("Typical cost in PHP as an estimate; omit when unknown."),
				locationName: z.string().optional(),
				notes: z
					.string()
					.optional()
					.describe("What to check before paying, e.g. cancellation terms."),
				provider: z
					.string()
					.optional()
					.describe(
						"Provider type or name to search, e.g. 'Cebu Pacific' or 'beachfront resort'."
					),
				startDateTime: bookingDateTime.optional(),
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
		)
		.min(1)
		.max(maxListItems)
		.describe(
			"Things still to book. They are saved as targets, never as confirmed."
		),
});

export const budgetProposalInput = z.object({
	...draftMeta,
	budgetAmount: z
		.number()
		.positive()
		.describe(
			"New total trip budget in the trip currency (PHP unless the trip says otherwise)."
		),
});

export const readinessProposalInput = z.object({
	...draftMeta,
	readinessItems: z
		.array(
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
				description: z.string().optional(),
				dueDate: isoDate.describe(
					"When it should be done, YYYY-MM-DD, on or before the trip start where possible."
				),
				priority: z.enum(["low", "medium", "high", "critical"]),
				title: z.string().min(1),
			})
		)
		.min(1)
		.max(maxListItems),
});

export const placesProposalInput = z.object({
	...draftMeta,
	places: z
		.array(
			z.object({
				address: z.string().optional(),
				category: z
					.string()
					.describe("e.g. beach, food, viewpoint, museum, market, hotel."),
				description: z.string().optional(),
				locationName: z
					.string()
					.min(1)
					.describe("Area or town, e.g. 'Moalboal, Cebu'."),
				title: z.string().min(1),
			})
		)
		.min(1)
		.max(maxListItems),
});

export const risksProposalInput = z.object({
	...draftMeta,
	risks: z
		.array(
			z.object({
				message: z.string().describe("Why it matters for this trip."),
				severity: z.enum(["low", "medium", "high", "critical"]),
				suggestedAction: z.string().describe("The smallest useful fix."),
				title: z.string().min(1),
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
			})
		)
		.min(1)
		.max(maxListItems),
});

export const profileProposalInput = z.object({
	...draftMeta,
	arrivalTime: clockTime.optional().describe("Arrival time on day 1, HH:MM."),
	departureTime: clockTime
		.optional()
		.describe("Departure time on the last day, HH:MM."),
	destination: z.string().optional(),
	endDate: isoDate.optional().describe("New last day, YYYY-MM-DD."),
	groupType: tripGroupTypeEnum.optional(),
	pace: tripPaceEnum.optional(),
	startDate: isoDate.optional().describe("New first day, YYYY-MM-DD."),
	summary: z.string().optional(),
	travelerCount: z.number().int().min(1).optional(),
	tripTitle: z.string().optional().describe("New trip name, only if asked."),
});

interface DraftMeta {
	rationale: string;
	title: string;
}

const basePayload = ({ rationale, title }: DraftMeta) =>
	tripAgentDraftPayloadSchema.parse({ rationale, title });

const reasonFor = (cost: number | undefined) =>
	cost === undefined
		? "Suggested by Viya. Cost unknown."
		: "Suggested by Viya. Cost is an estimate.";

export const toItineraryPayload = (
	input: z.infer<typeof itineraryProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	days: input.days.map((day) => ({
		date: day.date,
		estimatedCost: day.stops.reduce(
			(total, stop) => total + (stop.estimatedCostPhp ?? 0),
			0
		),
		items: day.stops.map((stop) => {
			const startTime = normalizeTimeOfDay(stop.startTime) ?? stop.startTime;
			const endTime = normalizeTimeOfDay(stop.endTime) ?? stop.endTime;

			return {
				aiReason: reasonFor(stop.estimatedCostPhp),
				category: stop.category,
				description: stop.description ?? "",
				durationMinutes: getDurationMinutes(startTime, endTime),
				endTime,
				estimatedCost: stop.estimatedCostPhp ?? 0,
				locationName: stop.locationName ?? "",
				priority: stop.priority ?? "recommended",
				startTime,
				...(stop.stopId ? { stopId: stop.stopId } : {}),
				title: stop.title.trim(),
			};
		}),
		pace: day.pace ?? "balanced",
		summary: day.summary ?? "",
		theme: day.title ?? "",
		title: day.title ?? "",
		weatherNote: day.weatherNote ?? "",
	})),
	...(input.removeStopIds?.length
		? { removeStopIds: [...new Set(input.removeStopIds)] }
		: {}),
});

export const toBookingPayload = (
	input: z.infer<typeof bookingProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	bookingTargets: input.bookingTargets.map((target) => ({
		cost: target.estimatedCostPhp,
		currency: target.estimatedCostPhp === undefined ? undefined : "PHP",
		endDateTime: target.endDateTime,
		locationName: target.locationName,
		notes: target.notes,
		provider: target.provider,
		startDateTime: target.startDateTime,
		title: target.title.trim(),
		type: target.type,
	})),
});

export const toBudgetPayload = (
	input: z.infer<typeof budgetProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	budgetAmount: Math.round(input.budgetAmount),
});

export const toReadinessPayload = (
	input: z.infer<typeof readinessProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	readinessItems: input.readinessItems.map((item) => ({
		...item,
		description: item.description ?? "",
		title: item.title.trim(),
	})),
});

export const toPlacesPayload = (
	input: z.infer<typeof placesProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	places: input.places.map((place) => ({
		...place,
		description: place.description ?? "",
		title: place.title.trim(),
	})),
});

export const toRisksPayload = (
	input: z.infer<typeof risksProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	risks: input.risks.map((risk) => ({ ...risk, title: risk.title.trim() })),
});

export const toProfilePayload = (
	input: z.infer<typeof profileProposalInput>
): TripAgentDraftPayload => ({
	...basePayload(input),
	profile: {
		arrivalTime: input.arrivalTime,
		departureTime: input.departureTime,
		destination: input.destination,
		endDate: input.endDate,
		groupType: input.groupType,
		pace: input.pace,
		startDate: input.startDate,
		summary: input.summary,
		title: input.tripTitle,
		travelerCount: input.travelerCount,
	},
});
