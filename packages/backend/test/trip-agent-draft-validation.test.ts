import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TripAgentDraftPayload } from "../src/ai/trip-agent-draft-apply";
import {
	type ProposalContext,
	validateDraftProposal,
} from "../src/ai/trip-agent-draft-validation";

const outsideTripPattern = /outside the trip/;
const profileToolHintPattern = /proposeTripProfileChanges/;
const endBeforeStartPattern = /ends at or before it starts/;
const invalidStartPattern = /invalid start time/;
const overlapExistingPattern =
	/overlaps existing stop "Lunch" 12:00-13:00 \(stopId stop-lunch\)/;
const overlapDraftPattern = /drafted stop .* overlaps drafted stop/;
const unknownStopPattern = /stopId missing-stop, which is not in this trip/;
const unknownRemovalPattern = /removeStopIds has gone-stop/;
const changedAndRemovedPattern = /both changed and removed/;
const duplicateDayPattern = /appears twice/;
const tooManyStopsPattern = /limit is 8 per day/;
const pastPattern = /in the past/;
const bookingDatePattern = /is not valid\. Use YYYY-MM-DD/;
const bookingEndPattern = /ends before it starts/;
const everyDuplicatePattern = /Every booking target is already in the trip/;
const skippedPattern = /already in the trip and will be skipped/;
const sameBudgetPattern = /already 20,000 PHP/;
const belowCommittedPattern = /below the 25,000 PHP already spent or planned/;
const realDatePattern = /not a real YYYY-MM-DD date/;
const overduePattern = /already overdue/;
const nothingChangesPattern = /Nothing would change/;
const startAfterEndPattern = /after the end date/;
const travelerCountPattern = /travelerCount must be a whole number/;
const daysMovePattern = /Itinerary days move with the new dates/;

const createContext = (
	overrides: Partial<ProposalContext> = {}
): ProposalContext => ({
	bookings: [],
	days: [
		{ date: "2026-12-01", id: "day-1" },
		{ date: "2026-12-02", id: "day-2" },
	],
	places: [],
	readinessItems: [],
	risks: [],
	stops: [
		{
			dayId: "day-1",
			endTime: "11:00",
			id: "stop-tour",
			startTime: "09:00",
			status: "planned",
			title: "Island tour",
		},
		{
			dayId: "day-1",
			endTime: "13:00",
			id: "stop-lunch",
			startTime: "12:00",
			status: "planned",
			title: "Lunch",
		},
	],
	today: "2026-11-16",
	trip: {
		budgetAmount: 20_000,
		budgetCurrency: "PHP",
		destination: "El Nido",
		endDate: "2026-12-04",
		groupType: "friends",
		pace: "balanced",
		startDate: "2026-12-01",
		summary: "",
		title: "El Nido trip",
		travelerCount: 2,
	},
	...overrides,
});

const createPayload = (
	overrides: Partial<TripAgentDraftPayload> = {}
): TripAgentDraftPayload => ({
	bookingTargets: [],
	changes: [],
	days: [],
	moments: [],
	places: [],
	rationale: "Because.",
	readinessItems: [],
	risks: [],
	title: "Draft",
	...overrides,
});

const stop = (
	overrides: Partial<TripAgentDraftPayload["days"][number]["items"][number]>
) => ({
	aiReason: "",
	category: "activity" as const,
	description: "",
	durationMinutes: 60,
	endTime: "16:00",
	estimatedCost: 0,
	locationName: "",
	priority: "recommended" as const,
	startTime: "15:00",
	title: "Sunset",
	...overrides,
});

const day = (
	date: string,
	items: ReturnType<typeof stop>[]
): TripAgentDraftPayload["days"][number] => ({
	date,
	estimatedCost: 0,
	items,
	pace: "balanced",
	summary: "",
	theme: "",
	title: "",
	weatherNote: "",
});

const validateItinerary = (
	payload: TripAgentDraftPayload,
	context = createContext()
) => validateDraftProposal({ context, module: "itinerary", payload });

describe("itinerary draft validation", () => {
	it("accepts a stop in a free slot inside the trip", () => {
		const result = validateItinerary(
			createPayload({ days: [day("2026-12-01", [stop({})])] })
		);

		assert.deepEqual(result.errors, []);
	});

	it("rejects days outside the trip and points at a date change", () => {
		const result = validateItinerary(
			createPayload({ days: [day("2026-12-09", [stop({})])] })
		);

		assert.match(result.errors[0] ?? "", outsideTripPattern);
		assert.match(result.errors[0] ?? "", profileToolHintPattern);
	});

	it("rejects invalid and reversed times", () => {
		const result = validateItinerary(
			createPayload({
				days: [
					day("2026-12-02", [
						stop({ endTime: "10:00", startTime: "11:00", title: "Backwards" }),
						stop({ startTime: "25:00", title: "Bad clock" }),
					]),
				],
			})
		);

		assert.ok(result.errors.some((error) => endBeforeStartPattern.test(error)));
		assert.ok(result.errors.some((error) => invalidStartPattern.test(error)));
	});

	it("reports overlaps with existing stops with their stopId", () => {
		const result = validateItinerary(
			createPayload({
				days: [
					day("2026-12-01", [
						stop({ endTime: "12:30", startTime: "11:30", title: "Kayak" }),
					]),
				],
			})
		);

		assert.equal(result.errors.length, 1);
		assert.match(result.errors[0] ?? "", overlapExistingPattern);
	});

	it("reports overlaps between drafted stops", () => {
		const result = validateItinerary(
			createPayload({
				days: [
					day("2026-12-02", [
						stop({ endTime: "10:00", startTime: "08:00", title: "Hike" }),
						stop({ endTime: "11:00", startTime: "09:30", title: "Swim" }),
					]),
				],
			})
		);

		assert.ok(result.errors.some((error) => overlapDraftPattern.test(error)));
	});

	it("ignores the old slot of a stop that is moved or retimed by stopId", () => {
		const result = validateItinerary(
			createPayload({
				days: [
					day("2026-12-01", [
						stop({
							endTime: "13:30",
							startTime: "12:30",
							stopId: "stop-lunch",
							title: "Lunch",
						}),
						stop({ endTime: "12:30", startTime: "11:00", title: "Beach" }),
					]),
				],
			})
		);

		assert.deepEqual(result.errors, []);
	});

	it("treats a same-title stop as an update, not a clash", () => {
		const result = validateItinerary(
			createPayload({
				days: [
					day("2026-12-01", [
						stop({
							endTime: "11:30",
							startTime: "09:30",
							title: "Island Tour",
						}),
					]),
				],
			})
		);

		assert.deepEqual(result.errors, []);
	});

	it("frees a slot when the clashing stop is removed", () => {
		const result = validateItinerary(
			createPayload({
				days: [
					day("2026-12-01", [
						stop({ endTime: "12:30", startTime: "11:30", title: "Kayak" }),
					]),
				],
				removeStopIds: ["stop-lunch"],
			})
		);

		assert.deepEqual(result.errors, []);
	});

	it("rejects unknown stop ids and conflicting change plus removal", () => {
		const unknown = validateItinerary(
			createPayload({
				days: [day("2026-12-02", [stop({ stopId: "missing-stop" })])],
				removeStopIds: ["gone-stop"],
			})
		);

		assert.ok(unknown.errors.some((error) => unknownStopPattern.test(error)));
		assert.ok(
			unknown.errors.some((error) => unknownRemovalPattern.test(error))
		);

		const both = validateItinerary(
			createPayload({
				days: [day("2026-12-02", [stop({ stopId: "stop-tour" })])],
				removeStopIds: ["stop-tour"],
			})
		);

		assert.ok(
			both.errors.some((error) => changedAndRemovedPattern.test(error))
		);
	});

	it("rejects duplicate days, too many stops and empty drafts", () => {
		const nine = Array.from({ length: 9 }, (_, index) =>
			stop({
				endTime: `${String(index + 10)}:30`,
				startTime: `${String(index + 10)}:00`,
				title: `Stop ${index}`,
			})
		);
		const result = validateItinerary(
			createPayload({
				days: [day("2026-12-03", nine), day("2026-12-03", [])],
			})
		);

		assert.ok(result.errors.some((error) => duplicateDayPattern.test(error)));
		assert.ok(result.errors.some((error) => tooManyStopsPattern.test(error)));
		assert.equal(validateItinerary(createPayload()).errors.length, 1);
	});

	it("warns, without blocking, when a day is in the past", () => {
		const result = validateItinerary(
			createPayload({ days: [day("2026-12-02", [stop({})])] }),
			createContext({ today: "2026-12-03" })
		);

		assert.deepEqual(result.errors, []);
		assert.ok(result.warnings.some((warning) => pastPattern.test(warning)));
	});
});

describe("booking, budget, readiness and list draft validation", () => {
	it("checks booking date formats and end after start", () => {
		const result = validateDraftProposal({
			context: createContext(),
			module: "bookings",
			payload: createPayload({
				bookingTargets: [
					{ startDateTime: "Dec 1", title: "Ferry", type: "transport" },
					{
						endDateTime: "2026-12-01",
						startDateTime: "2026-12-03",
						title: "Resort",
						type: "hotel",
					},
				],
			}),
		});

		assert.ok(result.errors.some((error) => bookingDatePattern.test(error)));
		assert.ok(result.errors.some((error) => bookingEndPattern.test(error)));
	});

	it("rejects a draft that only repeats existing bookings and warns on partial repeats", () => {
		const context = createContext({
			bookings: [{ title: "Resort stay", type: "hotel" }],
		});
		const allDuplicates = validateDraftProposal({
			context,
			module: "bookings",
			payload: createPayload({
				bookingTargets: [{ title: "Resort Stay", type: "hotel" }],
			}),
		});
		const someDuplicates = validateDraftProposal({
			context,
			module: "bookings",
			payload: createPayload({
				bookingTargets: [
					{ title: "Resort Stay", type: "hotel" },
					{ title: "Van to El Nido", type: "transport" },
				],
			}),
		});

		assert.match(allDuplicates.errors[0] ?? "", everyDuplicatePattern);
		assert.deepEqual(someDuplicates.errors, []);
		assert.ok(
			someDuplicates.warnings.some((warning) => skippedPattern.test(warning))
		);
	});

	it("rejects an unchanged budget and warns when below committed spend", () => {
		const same = validateDraftProposal({
			context: createContext(),
			module: "budget",
			payload: createPayload({ budgetAmount: 20_000 }),
		});
		const low = validateDraftProposal({
			context: createContext({ committedSpend: 25_000 }),
			module: "budget",
			payload: createPayload({ budgetAmount: 18_000 }),
		});

		assert.match(same.errors[0] ?? "", sameBudgetPattern);
		assert.deepEqual(low.errors, []);
		assert.match(low.warnings[0] ?? "", belowCommittedPattern);
	});

	it("checks readiness due dates", () => {
		const result = validateDraftProposal({
			context: createContext(),
			module: "readiness",
			payload: createPayload({
				readinessItems: [
					{
						category: "documents",
						description: "",
						dueDate: "2026-02-30",
						priority: "high",
						title: "Passport",
					},
					{
						category: "packing",
						description: "",
						dueDate: "2026-11-01",
						priority: "low",
						title: "Dry bag",
					},
				],
			}),
		});

		assert.match(result.errors[0] ?? "", realDatePattern);
		assert.ok(result.warnings.some((warning) => overduePattern.test(warning)));
	});
});

describe("trip profile draft validation", () => {
	it("rejects a draft that changes nothing", () => {
		const result = validateDraftProposal({
			context: createContext(),
			module: "profile",
			payload: createPayload({ profile: { travelerCount: 2 } }),
		});

		assert.match(result.errors[0] ?? "", nothingChangesPattern);
	});

	it("rejects reversed dates and bad traveler counts", () => {
		const result = validateDraftProposal({
			context: createContext(),
			module: "profile",
			payload: createPayload({
				profile: { startDate: "2026-12-10", travelerCount: 0 },
			}),
		});

		assert.ok(result.errors.some((error) => startAfterEndPattern.test(error)));
		assert.ok(result.errors.some((error) => travelerCountPattern.test(error)));
	});

	it("accepts a date shift and warns that itinerary days move", () => {
		const result = validateDraftProposal({
			context: createContext(),
			module: "profile",
			payload: createPayload({
				profile: { endDate: "2026-12-05", startDate: "2026-12-02" },
			}),
		});

		assert.deepEqual(result.errors, []);
		assert.ok(result.warnings.some((warning) => daysMovePattern.test(warning)));
	});
});
