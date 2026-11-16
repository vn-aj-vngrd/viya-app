import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildSimpleDraftRecords,
	buildTripProfilePatch,
	planItineraryMerge,
	summarizeApply,
	type TripAgentDraftPayload,
	tripAgentDraftPayloadSchema,
} from "../src/ai/trip-agent-draft-apply";
import {
	describeDraftPayload,
	formatDayLabel,
} from "../src/ai/trip-agent-draft-preview";
import {
	buildSeasonInfo,
	formatItineraryRead,
} from "../src/ai/trip-chat-reads";
import {
	buildMissingReplyText,
	getFinalStepSettings,
} from "../src/ai/trip-chat-reply";
import {
	bookingProposalInput,
	itineraryProposalInput,
	profileProposalInput,
	toBookingPayload,
	toItineraryPayload,
	toProfilePayload,
} from "../src/ai/trip-chat-tool-inputs";

const savedOneDraftPattern = /saved a draft for you to review/;
const savedTwoDraftsPattern = /saved 2 drafts/;
const invalidDraftPattern = /couldn't put together a valid draft/;
const noAnswerPattern = /couldn't finish an answer/;
const removedPattern = /removed 1/;
const missingPattern = /skipped 1 no longer in the trip/;
const profileSummaryPattern = /^Updated start date, travelers\./;
const dayLabelPattern = /^Tue, Dec 1$/;
const notForecastPattern = /Not a live forecast/;

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

const draftItem = (
	overrides: Partial<TripAgentDraftPayload["days"][number]["items"][number]>
) => ({
	aiReason: "",
	category: "activity" as const,
	description: "",
	durationMinutes: 60,
	endTime: "11:00",
	estimatedCost: 0,
	locationName: "",
	priority: "recommended" as const,
	startTime: "10:00",
	title: "Stop",
	...overrides,
});

const draftDay = (
	date: string,
	items: ReturnType<typeof draftItem>[]
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

const trip = { endDate: "2026-12-04", startDate: "2026-12-01" };
const existingDays = [
	{ date: "2026-12-01", dayNumber: 1, id: "day-1" },
	{ date: "2026-12-02", dayNumber: 2, id: "day-2" },
];
const existingItems = [
	{ dayId: "day-1", id: "stop-a", startTime: "09:00", title: "Tour A" },
	{ dayId: "day-1", id: "stop-b", startTime: "12:00", title: "Lunch" },
];

describe("itinerary merge with stop ids and removals", () => {
	it("moves a stop to another day by stopId without duplicating it", () => {
		const plan = planItineraryMerge({
			action: "refine",
			existingDays,
			existingItems,
			payload: createPayload({
				days: [
					draftDay("2026-12-02", [
						draftItem({
							startTime: "09:00",
							stopId: "stop-a",
							title: "Tour A",
						}),
					]),
				],
			}),
			trip,
		});

		assert.equal(plan.itemInserts.length, 0);
		assert.equal(plan.itemUpdates.length, 1);
		assert.equal(plan.itemUpdates[0]?.id, "stop-a");
		assert.deepEqual(plan.itemUpdates[0]?.day, { existingId: "day-2" });
	});

	it("updates in place without a day change when the stop stays on its day", () => {
		const plan = planItineraryMerge({
			action: "refine",
			existingDays,
			existingItems,
			payload: createPayload({
				days: [
					draftDay("2026-12-01", [
						draftItem({
							startTime: "13:00",
							stopId: "stop-b",
							title: "Late lunch",
						}),
					]),
				],
			}),
			trip,
		});

		assert.equal(plan.itemUpdates[0]?.day, undefined);
		assert.equal(plan.itemUpdates[0]?.fields.title, "Late lunch");
	});

	it("creates the target day when a stop moves to a day that does not exist yet", () => {
		const plan = planItineraryMerge({
			action: "refine",
			existingDays,
			existingItems,
			payload: createPayload({
				days: [
					draftDay("2026-12-04", [
						draftItem({ stopId: "stop-b", title: "Lunch" }),
					]),
				],
			}),
			trip,
		});

		assert.equal(plan.newDays[0]?.date, "2026-12-04");
		assert.equal(plan.newDays[0]?.dayNumber, 4);
		assert.deepEqual(plan.itemUpdates[0]?.day, { createDate: "2026-12-04" });
	});

	it("removes listed stops and skips ids that are gone", () => {
		const plan = planItineraryMerge({
			action: "refine",
			existingDays,
			existingItems,
			payload: createPayload({
				days: [draftDay("2026-12-02", [draftItem({ stopId: "deleted" })])],
				removeStopIds: ["stop-b", "stop-b", "also-deleted"],
			}),
			trip,
		});

		assert.deepEqual(plan.itemRemovals, ["stop-b"]);
		assert.equal(plan.skippedMissing, 2);
	});

	it("keeps title matching for drafts without ids", () => {
		const plan = planItineraryMerge({
			action: "refine",
			existingDays,
			existingItems,
			payload: createPayload({
				days: [
					draftDay("2026-12-01", [
						draftItem({ startTime: "09:30", title: "tour a" }),
						draftItem({ startTime: "15:00", title: "Sunset" }),
					]),
				],
			}),
			trip,
		});

		assert.equal(plan.itemUpdates[0]?.id, "stop-a");
		assert.equal(plan.itemInserts.length, 1);
	});

	it("summarizes removals, missing stops and profile changes", () => {
		const summary = summarizeApply({
			added: 1,
			budgetChange: null,
			isStale: false,
			removed: 1,
			skippedDuplicates: 0,
			skippedMissing: 1,
			skippedOutOfRange: 0,
			updated: 0,
		});

		assert.match(summary, removedPattern);
		assert.match(summary, missingPattern);
		assert.match(
			summarizeApply({
				added: 0,
				budgetChange: null,
				isStale: false,
				profileChanges: ["start date", "travelers"],
				skippedDuplicates: 0,
				skippedOutOfRange: 0,
				updated: 0,
			}),
			profileSummaryPattern
		);
	});
});

describe("trip profile patch", () => {
	const current = {
		destination: "El Nido",
		endDate: "2026-12-04",
		groupType: "friends",
		pace: "balanced",
		startDate: "2026-12-01",
		summary: "",
		title: "El Nido trip",
		travelerCount: 2,
	};

	it("keeps only fields that differ and normalizes times", () => {
		const { labels, patch } = buildTripProfilePatch(
			{
				arrivalTime: "9:05",
				destination: " El Nido ",
				startDate: "2026-12-02",
				travelerCount: 2,
			},
			current
		);

		assert.deepEqual(patch, { arrivalTime: "09:05", startDate: "2026-12-02" });
		assert.deepEqual(labels, ["start date", "arrival time"]);
	});

	it("is empty when re-applied to a trip that already matches", () => {
		assert.deepEqual(
			buildTripProfilePatch({ startDate: "2026-12-01" }, current).labels,
			[]
		);
	});
});

describe("chat tool inputs", () => {
	it("turns an itinerary proposal into a valid draft payload", () => {
		const input = itineraryProposalInput.parse({
			days: [
				{
					date: "2026-12-02",
					stops: [
						{
							category: "food",
							endTime: "13:30",
							estimatedCostPhp: 800,
							startTime: "12:00",
							stopId: "stop-b",
							title: " Lunch ",
						},
						{
							category: "activity",
							endTime: "17:00",
							startTime: "9:00",
							title: "Hike",
						},
					],
				},
			],
			rationale: "Why",
			removeStopIds: ["stop-a", "stop-a"],
			title: "Day 2",
		});
		const payload = toItineraryPayload(input);
		const [lunch, hike] = payload.days[0]?.items ?? [];

		assert.doesNotThrow(() => tripAgentDraftPayloadSchema.parse(payload));
		assert.equal(lunch?.title, "Lunch");
		assert.equal(lunch?.durationMinutes, 90);
		assert.equal(lunch?.stopId, "stop-b");
		assert.equal(lunch?.aiReason, "Suggested by Viya. Cost is an estimate.");
		assert.equal(hike?.startTime, "09:00");
		assert.equal(hike?.aiReason, "Suggested by Viya. Cost unknown.");
		assert.equal(payload.days[0]?.estimatedCost, 800);
		assert.deepEqual(payload.removeStopIds, ["stop-a"]);
	});

	it("rejects malformed times and dates before the handler runs", () => {
		const result = itineraryProposalInput.safeParse({
			days: [
				{
					date: "Dec 2",
					stops: [
						{
							category: "food",
							endTime: "1pm",
							startTime: "12:00",
							title: "x",
						},
					],
				},
			],
			rationale: "",
			title: "",
		});

		assert.equal(result.success, false);
	});

	it("keeps booking targets as estimates in PHP", () => {
		const payload = toBookingPayload(
			bookingProposalInput.parse({
				bookingTargets: [
					{ estimatedCostPhp: 1500, title: "Ferry", type: "transport" },
					{ title: "Resort", type: "hotel" },
				],
				rationale: "",
				title: "Book",
			})
		);

		assert.equal(payload.bookingTargets[0]?.currency, "PHP");
		assert.equal(payload.bookingTargets[1]?.currency, undefined);

		const [record] = buildSimpleDraftRecords({
			now: 1,
			payload: createPayload({
				bookingTargets: [
					{
						endDateTime: "2026-12-02",
						startDateTime: "2026-12-01T08:00",
						title: "Ferry",
						type: "transport",
					},
				],
			}),
			tripId: "trip",
		}).bookings;

		assert.equal(record?.status, "target");
		assert.equal(record?.startDateTime, "2026-12-01T08:00");
	});

	it("maps the trip name separately from the draft title", () => {
		const payload = toProfilePayload(
			profileProposalInput.parse({
				rationale: "",
				title: "Rename",
				tripTitle: "Barkada El Nido",
			})
		);

		assert.equal(payload.title, "Rename");
		assert.equal(payload.profile?.title, "Barkada El Nido");
	});
});

describe("chat read formatters", () => {
	it("returns stop ids, sorted times and existing overlaps per day", () => {
		const result = formatItineraryRead({
			days: [
				{ _id: "day-2", date: "2026-12-02", dayNumber: 2, title: "Day 2" },
				{ _id: "day-1", date: "2026-12-01", dayNumber: 1, title: "Day 1" },
			],
			stops: [
				{
					_id: "b",
					category: "food",
					dayId: "day-1",
					endTime: "13:00",
					estimatedCost: 0,
					locationName: "",
					startTime: "10:30",
					status: "planned",
					title: "Brunch",
				},
				{
					_id: "a",
					category: "activity",
					dayId: "day-1",
					endTime: "11:00",
					estimatedCost: 1200,
					locationName: "Bay",
					startTime: "9:00",
					status: "planned",
					title: "Kayak",
				},
			],
		});

		assert.deepEqual(
			result.days.map((day) => day.date),
			["2026-12-01", "2026-12-02"]
		);
		assert.deepEqual(
			result.days[0]?.stops.map((stop) => stop.stopId),
			["a", "b"]
		);
		assert.deepEqual(result.days[0]?.conflicts, ['"Kayak" overlaps "Brunch"']);
		assert.equal(result.days[1]?.conflicts, undefined);
	});

	it("explains when a requested date has no day", () => {
		const result = formatItineraryRead({
			date: "2027-01-01",
			days: [],
			stops: [],
		});

		assert.ok(result.note);
	});

	it("gives season facts for a known destination with a forecast caveat", () => {
		const info = buildSeasonInfo({
			destination: "El Nido, Palawan",
			endDate: "2026-09-12",
			includeAlternatives: true,
			startDate: "2026-09-08",
			today: "2026-08-01",
		});

		assert.equal(info.isKnownDestination, true);
		assert.match(info.source, notForecastPattern);
		assert.ok(["elevated", "peak"].includes(info.typhoonRisk ?? ""));
		assert.ok((info.alternatives?.length ?? 0) <= 3);
	});
});

describe("draft previews", () => {
	it("describes only the draft's own module", () => {
		const payload = createPayload({
			budgetAmount: 30_000,
			days: [
				draftDay("2026-12-01", [
					draftItem({ startTime: "10:00", title: "Tour" }),
					draftItem({ startTime: "08:00", stopId: "x", title: "Breakfast" }),
				]),
			],
			removeStopIds: ["y"],
		});

		assert.deepEqual(describeDraftPayload({ module: "itinerary", payload }), [
			"Tue, Dec 1: 08:00 Breakfast, 10:00 Tour (1 changed)",
			"Removes 1 stop",
		]);
		assert.deepEqual(
			describeDraftPayload({
				module: "budget",
				payload,
				trip: { budgetAmount: 20_000, endDate: "", startDate: "" },
			}),
			["Budget: 20,000 PHP -> 30,000 PHP"]
		);
	});

	it("caps long previews", () => {
		const lines = describeDraftPayload({
			module: "readiness",
			payload: createPayload({
				readinessItems: Array.from({ length: 9 }, (_, index) => ({
					category: "packing" as const,
					description: "",
					dueDate: "2026-11-30",
					priority: "low" as const,
					title: `Task ${index}`,
				})),
			}),
		});

		assert.equal(lines.length, 6);
		assert.equal(lines.at(-1), "+4 more");
		assert.match(formatDayLabel("2026-12-01"), dayLabelPattern);
	});
});

describe("chat reply guards", () => {
	it("switches tools off on the last step only", () => {
		assert.equal(getFinalStepSettings(0, 8), undefined);
		assert.deepEqual(getFinalStepSettings(7, 8), { toolChoice: "none" });
	});

	it("writes a fallback only when no step produced text", () => {
		const saved = {
			output: { draftId: "d1", ok: true },
			toolName: "proposeBudget",
		};

		assert.equal(
			buildMissingReplyText([{ text: "Here you go", toolResults: [] }]),
			null
		);
		assert.match(
			buildMissingReplyText([{ text: "", toolResults: [saved, saved] }]) ?? "",
			savedOneDraftPattern
		);
		assert.match(
			buildMissingReplyText([
				{
					text: "",
					toolResults: [
						saved,
						{ output: { draftId: "d2", ok: true }, toolName: "proposeRisks" },
					],
				},
			]) ?? "",
			savedTwoDraftsPattern
		);
		assert.match(
			buildMissingReplyText([
				{
					text: "",
					toolResults: [{ output: { ok: false }, toolName: "proposeBudget" }],
				},
			]) ?? "",
			invalidDraftPattern
		);
		assert.match(buildMissingReplyText([]) ?? "", noAnswerPattern);
	});
});
