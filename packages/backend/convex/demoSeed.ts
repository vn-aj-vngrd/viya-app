// biome-ignore-all lint/style/useFilenamingConvention: Convex module names are public API paths and cannot contain hyphens.

/**
 * Showcase seed data for portfolio screenshots. Dev deployment only.
 *
 * Run:   npx convex run demoSeed:seedShowcase '{"ownerId":"<clerk subject>"}'
 * Clear: npx convex run demoSeed:clearShowcase '{"ownerId":"<clerk subject>"}'
 *
 * Only trips whose exact title is in SHOWCASE_TRIP_TITLES are cleared, so a
 * user's own trips are never touched. All personal content is fictional.
 */

import {
	addDaysToKey,
	findItineraryConflicts,
	getTripTodayKey,
	type ItineraryItemCategory,
	type ItineraryItemPriority,
	type ItineraryItemStatus,
	type Priority,
	type ReadinessCategory,
	type RiskSeverity,
	type RiskStatus,
	type RiskType,
	validateItineraryTiming,
	type WorkStatus,
} from "@viya-app/domain";
import { v } from "convex/values";

import {
	type TripAgentDraftPayload,
	tripAgentDraftPayloadSchema,
} from "../src/ai/trip-agent-draft-apply";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { syncItineraryDaysToTripRange } from "./lib/tripdays";
import {
	seedBaselineReadinessItems,
	updateTripReadinessScore,
} from "./readiness";

const CEBU_TITLE = "Cebu and Bohol Escape";
const SIARGAO_TITLE = "Siargao Surf Week";
const PALAWAN_TITLE = "Palawan: El Nido to Coron";

/** The one list clearShowcase trusts: exact titles of seeded trips. */
const SHOWCASE_TRIP_TITLES: readonly string[] = [
	CEBU_TITLE,
	SIARGAO_TITLE,
	PALAWAN_TITLE,
];

const CEBU_START_OFFSET_DAYS = 12;
const CEBU_LENGTH_DAYS = 5;
const SIARGAO_START_OFFSET_DAYS = -27;
const SIARGAO_LENGTH_DAYS = 6;
const PALAWAN_START_OFFSET_DAYS = 90;
const PALAWAN_LENGTH_DAYS = 7;
const MS_PER_MINUTE = 60_000;
const MANILA_UTC_OFFSET = "+08:00";

type BookingStatus =
	| "target"
	| "bookedExternally"
	| "confirmed"
	| "missing"
	| "cancelled";
type BookingType =
	| "flight"
	| "hotel"
	| "activity"
	| "transport"
	| "restaurant"
	| "insurance"
	| "other";
type ExpenseCategory =
	| "activity"
	| "food"
	| "hotel"
	| "shopping"
	| "transport"
	| "documents"
	| "other";

interface BookingSpec {
	confirmationCode?: string;
	cost: number;
	end?: { day: number; time: string };
	key: string;
	locationName: string;
	notes?: string;
	provider: string;
	start: { day: number; time: string };
	status: BookingStatus;
	title: string;
	type: BookingType;
}

interface StopSpec {
	address: string;
	aiReason?: string;
	booking?: string;
	category: ItineraryItemCategory;
	cost: number;
	description: string;
	end: string;
	lat?: number;
	lng?: number;
	locationName: string;
	priority?: ItineraryItemPriority;
	start: string;
	status?: ItineraryItemStatus;
	title: string;
}

interface DaySpec {
	pace: "light" | "balanced" | "packed";
	stops: StopSpec[];
	summary: string;
	theme: string;
	title: string;
	weatherNote: string;
}

interface ExpenseSpec {
	amount: number;
	booking?: string;
	category: ExpenseCategory;
	notes?: string;
	/** Days relative to the trip start; negative is before the trip. */
	spentDay: number;
	title: string;
}

interface ReadinessSpec {
	category: ReadinessCategory;
	description: string;
	dueDay: number;
	priority: Priority;
	status: WorkStatus;
	title: string;
}

interface RiskSpec {
	booking?: string;
	message: string;
	severity: RiskSeverity;
	status: RiskStatus;
	suggestedAction: string;
	title: string;
	type: RiskType;
}

interface PlaceSpec {
	address?: string;
	category: string;
	day?: number;
	description: string;
	lat?: number;
	lng?: number;
	locationName: string;
	source: "user" | "ai";
	title: string;
}

interface MomentSpec {
	caption: string;
	day: number;
	isHighlight: boolean;
	locationName: string;
	note: string;
	time: string;
	title: string;
}

interface TripSpec {
	baselineStatus: Partial<Record<ReadinessCategory, WorkStatus>>;
	bookings: BookingSpec[];
	budgetAmount?: number;
	companions: { name: string; notes: string; role: string }[];
	days: DaySpec[];
	destination: string;
	documents: {
		notes: string;
		status: string;
		title: string;
		type: string;
	}[];
	expenses: ExpenseSpec[];
	groupType: string;
	/** Spend was logged as expenses, so stops carry no separate planned cost. */
	itemCostsLogged?: boolean;
	lengthDays: number;
	moments: MomentSpec[];
	notes: { body: string; category: string; title: string }[];
	pace: string;
	places: PlaceSpec[];
	readiness: ReadinessSpec[];
	risks: RiskSpec[];
	startOffsetDays: number;
	status: Doc<"trips">["status"];
	summary: string;
	title: string;
	travelerCount: number;
	travelStyle: string;
}

// ---------------------------------------------------------------------------
// Cebu and Bohol Escape (upcoming)
// ---------------------------------------------------------------------------

const cebuBookings: BookingSpec[] = [
	{
		confirmationCode: "DEMO42",
		cost: 5200,
		end: { day: 0, time: "07:40" },
		key: "flightIn",
		locationName: "Mactan-Cebu International Airport",
		notes: "Two seats, 20 kg checked bag shared.",
		provider: "Cebu Pacific",
		start: { day: 0, time: "06:10" },
		status: "confirmed",
		title: "Cebu Pacific Manila to Cebu",
		type: "flight",
	},
	{
		confirmationCode: "DEMO-SEDA7",
		cost: 9000,
		end: { day: 2, time: "07:00" },
		key: "hotelCebu",
		locationName: "Seda Ayala Center Cebu",
		notes: "Early check-in requested. Breakfast for two included.",
		provider: "Seda Hotels",
		start: { day: 0, time: "14:00" },
		status: "confirmed",
		title: "Seda Ayala Center Cebu, 2 nights",
		type: "hotel",
	},
	{
		cost: 3000,
		key: "canyoneering",
		locationName: "Kawasan Falls, Badian",
		notes: "Includes guide, helmet, life vest and lunch.",
		provider: "Local canyoneering operator",
		start: { day: 1, time: "08:15" },
		status: "target",
		title: "Kawasan canyoneering tour for two",
		type: "activity",
	},
	{
		confirmationCode: "DEMO-OJ18",
		cost: 1600,
		end: { day: 2, time: "10:20" },
		key: "ferry",
		locationName: "Cebu Pier 1",
		notes: "Tourist class. Check-in closes 30 minutes before departure.",
		provider: "OceanJet",
		start: { day: 2, time: "08:20" },
		status: "bookedExternally",
		title: "OceanJet Cebu to Tagbilaran",
		type: "transport",
	},
	{
		cost: 2800,
		key: "countrysideDriver",
		locationName: "Tagbilaran City Tourist Port",
		notes: "Driver meets us at the port; drop-off in Panglao.",
		provider: "Bohol countryside driver",
		start: { day: 2, time: "10:45" },
		status: "target",
		title: "Bohol countryside tour with driver",
		type: "transport",
	},
	{
		cost: 9000,
		end: { day: 4, time: "11:00" },
		key: "hotelPanglao",
		locationName: "Alona Kew White Beach Resort, Panglao",
		provider: "Alona Kew White Beach Resort",
		start: { day: 2, time: "19:00" },
		status: "target",
		title: "Alona Kew White Beach Resort, 2 nights",
		type: "hotel",
	},
	{
		confirmationCode: "DEMO77",
		cost: 6000,
		end: { day: 4, time: "13:20" },
		key: "flightOut",
		locationName: "Bohol-Panglao International Airport",
		provider: "Philippine Airlines",
		start: { day: 4, time: "12:00" },
		status: "confirmed",
		title: "Philippine Airlines Bohol to Manila",
		type: "flight",
	},
];

const cebuDays: DaySpec[] = [
	{
		pace: "balanced",
		summary:
			"Land early, walk the old city around Plaza Independencia, and end with grilled skewers at Larsian.",
		theme: "Cebu heritage",
		title: "Arrival and old Cebu",
		weatherNote:
			"Warm and humid, around 31°C. Short afternoon showers possible.",
		stops: [
			{
				address: "Lapu-Lapu City, Cebu",
				booking: "flightIn",
				category: "flight",
				cost: 5200,
				description: "Morning flight out of NAIA Terminal 3.",
				end: "07:40",
				lat: 10.3075,
				lng: 123.9794,
				locationName: "Mactan-Cebu International Airport",
				priority: "required",
				start: "06:10",
				status: "confirmed",
				title: "Fly Manila to Cebu",
			},
			{
				address: "Cebu Business Park, Cebu City",
				category: "transport",
				cost: 450,
				description: "Grab from the airport to drop bags at the hotel.",
				end: "09:00",
				locationName: "Seda Ayala Center Cebu",
				start: "08:15",
				title: "Grab to the hotel",
			},
			{
				address: "Osmeña Blvd, Cebu City",
				category: "activity",
				cost: 0,
				description:
					"The oldest Roman Catholic church in the country, home of the Santo Niño image.",
				end: "10:45",
				lat: 10.2945,
				lng: 123.902,
				locationName: "Basilica Minore del Santo Niño",
				priority: "required",
				start: "09:45",
				title: "Basilica del Santo Niño",
			},
			{
				address: "Magallanes St, Cebu City",
				category: "activity",
				cost: 0,
				description:
					"The cross planted in 1521, a short walk from the basilica.",
				end: "11:15",
				lat: 10.2934,
				lng: 123.9019,
				locationName: "Magellan's Cross",
				start: "10:50",
				title: "Magellan's Cross",
			},
			{
				address: "A. Pigafetta St, Cebu City",
				category: "activity",
				cost: 100,
				description: "Spanish-era triangular fort beside Plaza Independencia.",
				end: "12:15",
				lat: 10.2924,
				lng: 123.9055,
				locationName: "Fort San Pedro",
				start: "11:25",
				title: "Fort San Pedro",
			},
			{
				address: "Cebu City",
				category: "food",
				cost: 900,
				description: "Cebu lechon for lunch, crispy skin and lemongrass.",
				end: "13:45",
				locationName: "Zubuchon",
				priority: "recommended",
				start: "12:45",
				title: "Lechon lunch at Zubuchon",
			},
			{
				address: "Cebu Business Park, Cebu City",
				booking: "hotelCebu",
				category: "hotel",
				cost: 9000,
				description: "Check in and rest through the hottest part of the day.",
				end: "15:30",
				lat: 10.3181,
				lng: 123.9049,
				locationName: "Seda Ayala Center Cebu",
				start: "14:15",
				status: "confirmed",
				title: "Check in at Seda Ayala",
			},
			{
				address: "Busay, Cebu City",
				category: "activity",
				cost: 200,
				description: "Roman-style temple on the hills with a wide city view.",
				end: "17:45",
				lat: 10.3684,
				lng: 123.8722,
				locationName: "Temple of Leah",
				start: "16:30",
				title: "Sunset at Temple of Leah",
			},
			{
				address: "Osmeña Blvd, Cebu City",
				category: "food",
				cost: 700,
				description:
					"Pick skewers, they grill them, eat with puso and spiced vinegar.",
				end: "20:15",
				lat: 10.3046,
				lng: 123.8938,
				locationName: "Larsian BBQ",
				priority: "recommended",
				start: "19:00",
				title: "Dinner at Larsian BBQ",
			},
		],
	},
	{
		pace: "packed",
		summary:
			"Early van to Badian for canyoneering down to Kawasan Falls, then back to the city.",
		theme: "Waterfalls and adventure",
		title: "Kawasan canyoneering",
		weatherNote:
			"Expect river levels to rise after heavy rain; the tour may be cancelled.",
		stops: [
			{
				address: "Cebu City to Badian",
				category: "transport",
				cost: 3500,
				description: "Private van south along the coast, about three hours.",
				end: "07:45",
				locationName: "Badian, Cebu",
				priority: "required",
				start: "04:45",
				title: "Van to Badian",
			},
			{
				address: "Matutinao, Badian, Cebu",
				aiReason: "The most memorable day for a nature-loving couple.",
				booking: "canyoneering",
				category: "activity",
				cost: 3000,
				description:
					"Jump, swim and slide down the canyon, ending at the turquoise falls.",
				end: "12:15",
				lat: 9.8037,
				lng: 123.3737,
				locationName: "Kawasan Falls",
				priority: "required",
				start: "08:15",
				title: "Kawasan Falls canyoneering",
			},
			{
				address: "Badian, Cebu",
				category: "food",
				cost: 600,
				description: "Grilled fish and rice near the falls.",
				end: "13:30",
				locationName: "Badian",
				start: "12:30",
				title: "Lunch by the falls",
			},
			{
				address: "Panagsama Beach, Moalboal",
				category: "activity",
				cost: 500,
				description: "Snorkel with the sardine run off Panagsama Beach.",
				end: "15:15",
				lat: 9.9425,
				lng: 123.3756,
				locationName: "Moalboal Sardine Run",
				priority: "optional",
				start: "13:45",
				status: "skipped",
				title: "Moalboal sardine run",
			},
			{
				address: "Badian to Cebu City",
				category: "transport",
				cost: 0,
				description: "Same van back to the city.",
				end: "18:30",
				locationName: "Seda Ayala Center Cebu",
				start: "15:30",
				title: "Van back to Cebu City",
			},
			{
				address: "Ayala Center Cebu",
				category: "food",
				cost: 700,
				description: "Easy comfort food after a long day.",
				end: "20:30",
				locationName: "Casa Verde",
				start: "19:30",
				title: "Dinner at Casa Verde",
			},
		],
	},
	{
		pace: "balanced",
		summary:
			"Fast ferry to Tagbilaran, then a countryside loop through Corella, Loboc and Carmen before Panglao.",
		theme: "Bohol countryside",
		title: "Ferry to Bohol",
		weatherNote:
			"Seas are usually calm in the morning; check the ferry advisory.",
		stops: [
			{
				address: "Cebu City",
				category: "transport",
				cost: 250,
				description: "Leave early; check-in closes 30 minutes before sailing.",
				end: "07:30",
				locationName: "Cebu Pier 1",
				start: "07:00",
				title: "Grab to Pier 1",
			},
			{
				address: "Pier 1, Cebu City",
				booking: "ferry",
				category: "transport",
				cost: 1600,
				description: "OceanJet fast craft, about two hours.",
				end: "10:20",
				lat: 10.2966,
				lng: 123.9061,
				locationName: "OceanJet Cebu to Tagbilaran",
				priority: "required",
				start: "08:20",
				status: "confirmed",
				title: "OceanJet to Tagbilaran",
			},
			{
				address: "Canapnapan, Corella, Bohol",
				category: "activity",
				cost: 300,
				description: "See the tiny tarsiers in a quiet forest sanctuary.",
				end: "11:45",
				lat: 9.6865,
				lng: 123.9547,
				locationName: "Philippine Tarsier Sanctuary",
				priority: "required",
				start: "11:00",
				title: "Tarsier Sanctuary",
			},
			{
				address: "Loboc, Bohol",
				category: "food",
				cost: 1700,
				description:
					"Buffet lunch on a floating restaurant down the Loboc River.",
				end: "13:30",
				lat: 9.6366,
				lng: 124.0322,
				locationName: "Loboc River Cruise",
				priority: "recommended",
				start: "12:15",
				title: "Loboc River cruise lunch",
			},
			{
				address: "Bilar, Bohol",
				category: "activity",
				cost: 0,
				description: "Short stop under the mahogany canopy.",
				end: "14:30",
				lat: 9.7196,
				lng: 124.1093,
				locationName: "Bilar Man-Made Forest",
				start: "14:00",
				title: "Bilar Man-Made Forest",
			},
			{
				address: "Carmen, Bohol",
				category: "activity",
				cost: 200,
				description: "Climb the viewing deck over more than a thousand hills.",
				end: "16:30",
				lat: 9.9167,
				lng: 124.1667,
				locationName: "Chocolate Hills Complex",
				priority: "required",
				start: "15:15",
				title: "Chocolate Hills",
			},
			{
				address: "Carmen to Panglao",
				booking: "countrysideDriver",
				category: "transport",
				cost: 2800,
				description: "Driver for the whole loop, from the port to the resort.",
				end: "18:45",
				locationName: "Panglao Island",
				start: "17:00",
				title: "Drive to Panglao",
			},
			{
				address: "Alona Beach, Panglao, Bohol",
				booking: "hotelPanglao",
				category: "hotel",
				cost: 9000,
				description: "Beachfront rooms on the quieter end of Alona Beach.",
				end: "19:30",
				lat: 9.5492,
				lng: 123.7716,
				locationName: "Alona Kew White Beach Resort",
				start: "19:00",
				title: "Check in at Alona Kew",
			},
			{
				address: "Alona Beach, Panglao",
				category: "food",
				cost: 1000,
				description: "Grilled seafood along the beachfront.",
				end: "21:00",
				locationName: "Alona Beach",
				start: "20:00",
				title: "Dinner on Alona Beach",
			},
		],
	},
	{
		pace: "light",
		summary:
			"Dolphins and reef at sunrise, a long lunch at Bohol Bee Farm, and sunset on Alona Beach.",
		theme: "Islands and slow time",
		title: "Panglao islands",
		weatherNote: "Boat trips leave at dawn when the water is calmest.",
		stops: [
			{
				address: "Alona Beach, Panglao",
				category: "activity",
				cost: 3500,
				description:
					"Dolphin watching, then snorkelling at Balicasag and the sandbar at Virgin Island.",
				end: "10:00",
				lat: 9.5167,
				lng: 123.6833,
				locationName: "Balicasag Island",
				priority: "recommended",
				start: "06:00",
				title: "Balicasag and Virgin Island hopping",
			},
			{
				address: "Alona Beach, Panglao",
				category: "rest",
				cost: 0,
				description: "Pool and a nap before lunch.",
				end: "12:00",
				locationName: "Alona Kew White Beach Resort",
				start: "10:30",
				title: "Rest at the resort",
			},
			{
				address: "Dao, Dauis, Bohol",
				category: "food",
				cost: 1200,
				description:
					"Organic farm restaurant on a cliff; try the flower salad.",
				end: "14:00",
				lat: 9.5934,
				lng: 123.803,
				locationName: "Bohol Bee Farm",
				priority: "recommended",
				start: "12:30",
				title: "Lunch at Bohol Bee Farm",
			},
			{
				address: "Bingag, Dauis, Bohol",
				category: "activity",
				cost: 100,
				description: "Underground pool lit by a hole in the cave roof.",
				end: "15:15",
				lat: 9.6097,
				lng: 123.8098,
				locationName: "Hinagdanan Cave",
				priority: "optional",
				start: "14:30",
				status: "skipped",
				title: "Hinagdanan Cave",
			},
			{
				address: "Alona Beach, Panglao",
				category: "activity",
				cost: 0,
				description: "Swim and watch the sun go down.",
				end: "18:00",
				lat: 9.5476,
				lng: 123.7725,
				locationName: "Alona Beach",
				start: "16:00",
				title: "Sunset on Alona Beach",
			},
			{
				address: "Alona Beach, Panglao",
				category: "food",
				cost: 1200,
				description: "Last dinner in Bohol; pick fresh seafood by weight.",
				end: "20:30",
				locationName: "Alona Beach",
				start: "19:00",
				title: "Seafood dinner",
			},
		],
	},
	{
		pace: "light",
		summary:
			"Slow breakfast, check out, and a short ride to the new Panglao airport.",
		theme: "Homeward",
		title: "Fly home",
		weatherNote: "Allow extra time if it rains on the airport road.",
		stops: [
			{
				address: "Alona Beach, Panglao",
				category: "food",
				cost: 0,
				description: "Breakfast at the resort, then check out.",
				end: "09:00",
				locationName: "Alona Kew White Beach Resort",
				start: "08:00",
				title: "Breakfast and check-out",
			},
			{
				address: "Panglao, Bohol",
				category: "transport",
				cost: 500,
				description: "About 20 minutes by van.",
				end: "10:15",
				locationName: "Bohol-Panglao International Airport",
				start: "09:30",
				title: "Transfer to the airport",
			},
			{
				address: "Panglao, Bohol",
				booking: "flightOut",
				category: "flight",
				cost: 6000,
				description: "Midday flight back to Manila.",
				end: "13:20",
				lat: 9.5667,
				lng: 123.775,
				locationName: "Bohol-Panglao International Airport",
				priority: "required",
				start: "12:00",
				status: "confirmed",
				title: "Fly Bohol to Manila",
			},
		],
	},
];

const cebuSpec: TripSpec = {
	baselineStatus: {
		backupPlan: "todo",
		bookings: "inProgress",
		budget: "done",
		documents: "inProgress",
		group: "done",
		safety: "done",
		schedule: "done",
		weather: "todo",
	},
	bookings: cebuBookings,
	budgetAmount: 60_000,
	companions: [
		{
			name: "Mika",
			notes: "Prefers a window seat. No shellfish.",
			role: "traveler",
		},
		{
			name: "Paolo",
			notes: "Stays in Manila; has a copy of the itinerary.",
			role: "emergencyContact",
		},
	],
	days: cebuDays,
	destination: "Cebu and Bohol, Philippines",
	documents: [
		{
			notes: "Checked both IDs are valid past the trip.",
			status: "verified",
			title: "Government ID",
			type: "id",
		},
		{
			notes: "Needed for canyoneering; compare two providers.",
			status: "missing",
			title: "Travel insurance",
			type: "insurance",
		},
	],
	expenses: [
		{
			amount: 5200,
			booking: "flightIn",
			category: "transport",
			spentDay: -30,
			title: "Cebu Pacific fares",
		},
		{
			amount: 4500,
			booking: "hotelCebu",
			category: "hotel",
			notes: "50% deposit; balance due at check-in.",
			spentDay: -20,
			title: "Seda Ayala deposit",
		},
		{
			amount: 1600,
			booking: "ferry",
			category: "transport",
			spentDay: -9,
			title: "OceanJet tickets",
		},
		{
			amount: 380,
			category: "transport",
			spentDay: 0,
			title: "Grab to NAIA Terminal 3",
		},
		{
			amount: 850,
			category: "shopping",
			notes: "Aqua shoes for canyoneering.",
			spentDay: -6,
			title: "Aqua shoes and dry bag",
		},
	],
	groupType: "couple",
	lengthDays: CEBU_LENGTH_DAYS,
	moments: [],
	notes: [
		{
			body: "Larsian for skewers, Zubuchon for lechon, Casa Verde if we want something easy. Ask the driver about a good kakanin stop in Loboc.",
			category: "food",
			title: "Food shortlist",
		},
		{
			body: "OceanJet check-in closes 30 minutes before departure at Pier 1. Bring printed or saved e-tickets and a valid ID for both of us.",
			category: "booking",
			title: "Ferry check-in",
		},
		{
			body: "Aqua shoes, rash guard, waterproof phone pouch, change of clothes in the van. Leave valuables at the hotel.",
			category: "reminder",
			title: "Canyoneering packing",
		},
	],
	pace: "balanced",
	places: [
		{
			address: "Busay, Cebu City",
			category: "place",
			description: "Flower terraces in the mountains above the city.",
			lat: 10.4167,
			lng: 123.8833,
			locationName: "Sirao Flower Garden",
			source: "ai",
			title: "Sirao Flower Garden",
		},
		{
			address: "Busay, Cebu City",
			category: "place",
			description: "Night view of the city lights.",
			lat: 10.3711,
			lng: 123.8697,
			locationName: "Tops Lookout",
			source: "user",
			title: "Tops Lookout",
		},
		{
			address: "Baclayon, Bohol",
			category: "place",
			day: 2,
			description: "One of the oldest stone churches in the country.",
			lat: 9.6228,
			lng: 123.9119,
			locationName: "Baclayon Church",
			source: "ai",
			title: "Baclayon Church",
		},
		{
			address: "Panglao, Bohol",
			category: "backup",
			description: "Quieter white-sand beach on the east side of Panglao.",
			lat: 9.5523,
			lng: 123.8156,
			locationName: "Dumaluan Beach",
			source: "user",
			title: "Dumaluan Beach",
		},
	],
	readiness: [
		{
			category: "bookings",
			description: "Slots fill up on weekends; book at least a week ahead.",
			dueDay: -7,
			priority: "high",
			status: "todo",
			title: "Book the Kawasan canyoneering slot",
		},
		{
			category: "documents",
			description:
				"Save both e-tickets offline in case the pier has no signal.",
			dueDay: -2,
			priority: "medium",
			status: "done",
			title: "Download OceanJet e-tickets",
		},
		{
			category: "packing",
			description: "Reef-safe sunscreen, aqua shoes and a dry bag.",
			dueDay: -1,
			priority: "low",
			status: "todo",
			title: "Pack for water days",
		},
		{
			category: "budget",
			description: "Some Bohol entrance fees and boats are cash only.",
			dueDay: -1,
			priority: "medium",
			status: "inProgress",
			title: "Withdraw cash for Bohol fees",
		},
	],
	risks: [
		{
			message:
				"Late November is still inside the typhoon season. A storm signal would cancel ferries and canyoneering.",
			severity: "high",
			status: "open",
			suggestedAction:
				"Follow PAGASA advisories from five days out and keep Day 4 flexible as a swap day.",
			title: "Late-November typhoon watch",
			type: "weather",
		},
		{
			booking: "ferry",
			message:
				"Grab leaves at 07:00 for an 08:20 sailing, and check-in closes at 07:50. Morning traffic near the port can eat the buffer.",
			severity: "medium",
			status: "open",
			suggestedAction: "Leave by 06:40 or book the 09:20 sailing instead.",
			title: "Tight ferry transfer on Day 3",
			type: "schedule",
		},
		{
			booking: "hotelPanglao",
			message:
				"The Panglao resort is still unbooked and December weekends fill fast.",
			severity: "medium",
			status: "open",
			suggestedAction:
				"Book Alona Kew or pick a backup on Alona Beach this week.",
			title: "Panglao stay not booked",
			type: "booking",
		},
		{
			message: "The Kawasan day starts at 04:45 after a full arrival day.",
			severity: "low",
			status: "mitigated",
			suggestedAction: "Early dinner and lights out by 21:30 on Day 1.",
			title: "Early start after a long day",
			type: "fatigue",
		},
	],
	startOffsetDays: CEBU_START_OFFSET_DAYS,
	status: "planning",
	summary:
		"Five days for two: old Cebu and lechon, canyoneering at Kawasan, the Bohol countryside and slow beach days in Panglao.",
	title: CEBU_TITLE,
	travelerCount: 2,
	travelStyle: "balanced",
};

// ---------------------------------------------------------------------------
// Siargao Surf Week (completed)
// ---------------------------------------------------------------------------

const siargaoBookings: BookingSpec[] = [
	{
		confirmationCode: "DEMO-PR21",
		cost: 10_800,
		end: { day: 0, time: "12:15" },
		key: "flightIn",
		locationName: "Sayak Airport, Del Carmen",
		provider: "Philippine Airlines",
		start: { day: 0, time: "10:30" },
		status: "confirmed",
		title: "Philippine Airlines Manila to Siargao",
		type: "flight",
	},
	{
		confirmationCode: "DEMO-KRM5",
		cost: 17_500,
		end: { day: 5, time: "10:00" },
		key: "resort",
		locationName: "Kermit Siargao, General Luna",
		provider: "Kermit Siargao",
		start: { day: 0, time: "14:00" },
		status: "confirmed",
		title: "Kermit Siargao, 5 nights",
		type: "hotel",
	},
	{
		cost: 3000,
		key: "surf",
		locationName: "Jacking Horse, General Luna",
		provider: "Local surf school",
		start: { day: 1, time: "06:00" },
		status: "bookedExternally",
		title: "Beginner surf lessons for three",
		type: "activity",
	},
	{
		cost: 4500,
		key: "islandHopping",
		locationName: "General Luna boat station",
		provider: "General Luna boat cooperative",
		start: { day: 2, time: "08:00" },
		status: "bookedExternally",
		title: "Three-island hopping boat",
		type: "activity",
	},
	{
		cost: 4800,
		key: "sugba",
		locationName: "Sugba Lagoon, Del Carmen",
		provider: "Del Carmen tour operator",
		start: { day: 4, time: "07:00" },
		status: "bookedExternally",
		title: "Sugba Lagoon day trip",
		type: "activity",
	},
	{
		confirmationCode: "DEMO-PR22",
		cost: 11_400,
		end: { day: 5, time: "14:30" },
		key: "flightOut",
		locationName: "Sayak Airport, Del Carmen",
		provider: "Philippine Airlines",
		start: { day: 5, time: "12:45" },
		status: "confirmed",
		title: "Philippine Airlines Siargao to Manila",
		type: "flight",
	},
];

const done = "completed" as const;

const siargaoDays: DaySpec[] = [
	{
		pace: "light",
		summary: "Fly in, settle in General Luna and catch the sunset at Cloud 9.",
		theme: "Arrival",
		title: "Island time",
		weatherNote: "Sunny with a light offshore breeze.",
		stops: [
			{
				address: "Del Carmen, Siargao",
				booking: "flightIn",
				category: "flight",
				cost: 10_800,
				description: "Direct flight from Manila.",
				end: "12:15",
				lat: 9.8591,
				lng: 126.0139,
				locationName: "Sayak Airport",
				priority: "required",
				start: "10:30",
				status: done,
				title: "Fly Manila to Siargao",
			},
			{
				address: "Del Carmen to General Luna",
				category: "transport",
				cost: 1050,
				description: "Shared van across the island.",
				end: "13:45",
				locationName: "General Luna",
				start: "12:45",
				status: done,
				title: "Van to General Luna",
			},
			{
				address: "Tourism Road, General Luna",
				booking: "resort",
				category: "hotel",
				cost: 17_500,
				description: "Garden rooms a short ride from Cloud 9.",
				end: "15:00",
				locationName: "Kermit Siargao",
				start: "14:30",
				status: done,
				title: "Check in at Kermit",
			},
			{
				address: "Catangnan, General Luna",
				category: "activity",
				cost: 0,
				description: "Walk the boardwalk out to the famous reef break.",
				end: "18:00",
				lat: 9.8125,
				lng: 126.164,
				locationName: "Cloud 9 Boardwalk",
				priority: "required",
				start: "16:30",
				status: done,
				title: "Sunset at Cloud 9",
			},
			{
				address: "Tourism Road, General Luna",
				category: "food",
				cost: 2400,
				description: "Wood-fired pizza and pasta.",
				end: "20:30",
				locationName: "Kermit Siargao",
				start: "19:00",
				status: done,
				title: "Dinner at Kermit",
			},
		],
	},
	{
		pace: "balanced",
		summary: "First lessons at Jacking Horse and a slow afternoon.",
		theme: "Learn to surf",
		title: "First waves",
		weatherNote: "Small, clean waves in the morning; rain after 14:00.",
		stops: [
			{
				address: "Catangnan, General Luna",
				booking: "surf",
				category: "activity",
				cost: 3000,
				description: "Two-hour beginner lesson with board rental.",
				end: "08:00",
				locationName: "Jacking Horse",
				priority: "required",
				start: "06:00",
				status: done,
				title: "Surf lesson at Jacking Horse",
			},
			{
				address: "Tourism Road, General Luna",
				category: "food",
				cost: 1100,
				description: "Smoothie bowls after the session.",
				end: "09:30",
				locationName: "Shaka Siargao",
				start: "08:30",
				status: done,
				title: "Breakfast at Shaka",
			},
			{
				address: "General Luna",
				category: "rest",
				cost: 0,
				description: "Hammocks and a long nap.",
				end: "12:00",
				locationName: "Kermit Siargao",
				start: "10:00",
				status: done,
				title: "Rest",
			},
			{
				address: "Catangnan, General Luna",
				category: "activity",
				cost: 0,
				description: "Practice on our own at the inside break.",
				end: "16:00",
				locationName: "Cloud 9 Boardwalk",
				priority: "optional",
				start: "14:00",
				status: "skipped",
				title: "Afternoon surf practice",
			},
			{
				address: "General Luna",
				category: "food",
				cost: 900,
				description: "Grilled pork and seafood, island prices.",
				end: "20:30",
				locationName: "Mama's Grill",
				start: "19:00",
				status: done,
				title: "Dinner at Mama's Grill",
			},
		],
	},
	{
		pace: "balanced",
		summary: "Naked Island sandbar, lunch on Daku and a swim at Guyam.",
		theme: "Island hopping",
		title: "Three islands",
		weatherNote: "Calm seas, strong sun. Reapply sunscreen.",
		stops: [
			{
				address: "General Luna",
				booking: "islandHopping",
				category: "activity",
				cost: 4500,
				description: "Private boat to Naked, Daku and Guyam islands.",
				end: "15:30",
				lat: 9.7578,
				lng: 126.1381,
				locationName: "Daku Island",
				priority: "required",
				start: "08:00",
				status: done,
				title: "Naked, Daku and Guyam islands",
			},
			{
				address: "General Luna",
				category: "food",
				cost: 1500,
				description: "Fresh kinilaw and grilled tuna.",
				end: "20:00",
				locationName: "General Luna",
				start: "19:00",
				status: done,
				title: "Seafood dinner",
			},
		],
	},
	{
		pace: "packed",
		summary:
			"Motorbikes north to the coconut swing and the Magpupungko rock pools.",
		theme: "Road trip",
		title: "North loop",
		weatherNote: "Rock pools only show at low tide, around 11:00 to 13:00.",
		stops: [
			{
				address: "General Luna",
				category: "transport",
				cost: 1050,
				description: "Three scooters for the day.",
				end: "09:00",
				locationName: "General Luna",
				start: "08:00",
				status: done,
				title: "Pick up motorbikes",
			},
			{
				address: "Maasin, General Luna",
				category: "activity",
				cost: 150,
				description: "The leaning coconut tree over the river.",
				end: "10:30",
				lat: 9.8786,
				lng: 126.1125,
				locationName: "Maasin River",
				start: "09:30",
				status: done,
				title: "Maasin River swing",
			},
			{
				address: "Pilar, Siargao",
				category: "activity",
				cost: 450,
				description: "Natural tidal pools behind a flat rock shelf.",
				end: "13:30",
				lat: 9.8728,
				lng: 126.1311,
				locationName: "Magpupungko Rock Pools",
				priority: "required",
				start: "11:30",
				status: done,
				title: "Magpupungko Rock Pools",
			},
			{
				address: "Pilar, Siargao",
				category: "food",
				cost: 800,
				description: "Simple carinderia lunch in town.",
				end: "15:00",
				locationName: "Pilar",
				start: "14:00",
				status: done,
				title: "Lunch in Pilar",
			},
			{
				address: "Pilar, Siargao",
				category: "activity",
				cost: 150,
				description: "Cave pool reached by a short hike.",
				end: "16:45",
				locationName: "Tayangban Cave Pool",
				priority: "optional",
				start: "15:30",
				status: "skipped",
				title: "Tayangban Cave Pool",
			},
			{
				address: "General Luna",
				category: "food",
				cost: 1200,
				description: "Tacos and cold drinks.",
				end: "20:30",
				locationName: "General Luna",
				start: "19:00",
				status: done,
				title: "Tacos on Tourism Road",
			},
		],
	},
	{
		pace: "balanced",
		summary: "Mangroves to Sugba Lagoon, then a farewell dinner by the beach.",
		theme: "Lagoon day",
		title: "Sugba Lagoon",
		weatherNote: "Overcast, good for paddleboarding.",
		stops: [
			{
				address: "Del Carmen, Siargao",
				booking: "sugba",
				category: "activity",
				cost: 4800,
				description:
					"Boat through the mangroves, paddleboards and jumping deck.",
				end: "15:00",
				lat: 9.8803,
				lng: 125.9631,
				locationName: "Sugba Lagoon",
				priority: "required",
				start: "07:00",
				status: done,
				title: "Sugba Lagoon",
			},
			{
				address: "General Luna",
				category: "food",
				cost: 3000,
				description: "Last night together on the beach.",
				end: "21:00",
				locationName: "Bravo Beach Resort",
				start: "19:00",
				status: done,
				title: "Farewell dinner at Bravo",
			},
		],
	},
	{
		pace: "light",
		summary: "One last breakfast and the flight home.",
		theme: "Homeward",
		title: "Fly home",
		weatherNote: "Clear.",
		stops: [
			{
				address: "General Luna",
				category: "food",
				cost: 900,
				description: "Breakfast and pasalubong run.",
				end: "09:00",
				locationName: "Shaka Siargao",
				start: "08:00",
				status: done,
				title: "Breakfast at Shaka",
			},
			{
				address: "General Luna to Del Carmen",
				category: "transport",
				cost: 1050,
				description: "Van to the airport.",
				end: "11:00",
				locationName: "Sayak Airport",
				start: "10:00",
				status: done,
				title: "Van to the airport",
			},
			{
				address: "Del Carmen, Siargao",
				booking: "flightOut",
				category: "flight",
				cost: 11_400,
				description: "Afternoon flight to Manila.",
				end: "14:30",
				locationName: "Sayak Airport",
				priority: "required",
				start: "12:45",
				status: done,
				title: "Fly Siargao to Manila",
			},
		],
	},
];

const siargaoBookingExpenses: ExpenseSpec[] = siargaoBookings.map(
	(booking) => ({
		amount: booking.cost,
		booking: booking.key,
		category:
			booking.type === "flight"
				? "transport"
				: (booking.type as ExpenseCategory),
		spentDay: booking.type === "flight" ? -40 : booking.start.day,
		title: booking.title,
	})
);

const siargaoSpec: TripSpec = {
	baselineStatus: {
		backupPlan: "done",
		bookings: "done",
		budget: "done",
		documents: "done",
		group: "done",
		packing: "done",
		safety: "done",
		schedule: "done",
		transport: "done",
		weather: "done",
	},
	bookings: siargaoBookings,
	budgetAmount: 85_000,
	companions: [
		{
			name: "Bea",
			notes: "Paid for the boats; we settle up after.",
			role: "payer",
		},
		{
			name: "Kiko",
			notes: "Strongest swimmer, carried the first aid kit.",
			role: "traveler",
		},
	],
	days: siargaoDays,
	destination: "Siargao, Surigao del Norte",
	documents: [
		{
			notes: "Checked at the airport.",
			status: "verified",
			title: "Government ID",
			type: "id",
		},
		{
			notes: "Boarding passes saved offline.",
			status: "verified",
			title: "Flight tickets",
			type: "ticket",
		},
	],
	expenses: [
		...siargaoBookingExpenses,
		{
			amount: 1050,
			category: "transport",
			spentDay: 0,
			title: "Van to General Luna",
		},
		{ amount: 2400, category: "food", spentDay: 0, title: "Dinner at Kermit" },
		{
			amount: 1100,
			category: "food",
			spentDay: 1,
			title: "Breakfast at Shaka",
		},
		{
			amount: 900,
			category: "food",
			spentDay: 1,
			title: "Dinner at Mama's Grill",
		},
		{ amount: 1500, category: "food", spentDay: 2, title: "Seafood dinner" },
		{
			amount: 1050,
			category: "transport",
			spentDay: 3,
			title: "Motorbike rental",
		},
		{
			amount: 600,
			category: "activity",
			spentDay: 3,
			title: "Maasin and Magpupungko fees",
		},
		{ amount: 800, category: "food", spentDay: 3, title: "Lunch in Pilar" },
		{ amount: 1200, category: "food", spentDay: 3, title: "Tacos" },
		{
			amount: 3000,
			category: "food",
			spentDay: 4,
			title: "Farewell dinner at Bravo",
		},
		{ amount: 900, category: "food", spentDay: 5, title: "Breakfast at Shaka" },
		{
			amount: 1050,
			category: "transport",
			spentDay: 5,
			title: "Van to the airport",
		},
		{
			amount: 1650,
			category: "shopping",
			notes: "Dried fish and surf wax for friends.",
			spentDay: 5,
			title: "Pasalubong",
		},
	],
	groupType: "friends",
	itemCostsLogged: true,
	lengthDays: SIARGAO_LENGTH_DAYS,
	moments: [
		{
			caption: "First sunset on the Cloud 9 boardwalk.",
			day: 0,
			isHighlight: true,
			locationName: "Cloud 9 Boardwalk",
			note: "Surfers still out in the last light.",
			time: "17:40",
			title: "Cloud 9 at golden hour",
		},
		{
			caption: "Stood up on the third wave. Kiko got five.",
			day: 1,
			isHighlight: true,
			locationName: "Jacking Horse",
			note: "Instructor said to look at the horizon, not the board.",
			time: "07:30",
			title: "First wave",
		},
		{
			caption: "Naked Island is just a sandbar and the sea.",
			day: 2,
			isHighlight: true,
			locationName: "Naked Island",
			note: "Nothing to hide behind; bring a hat.",
			time: "09:15",
			title: "Sandbar morning",
		},
		{
			caption: "Grilled tuna on Daku for lunch.",
			day: 2,
			isHighlight: false,
			locationName: "Daku Island",
			note: "Boatman cooked it on the beach.",
			time: "12:20",
			title: "Lunch on Daku",
		},
		{
			caption: "Low tide timed just right at Magpupungko.",
			day: 3,
			isHighlight: true,
			locationName: "Magpupungko Rock Pools",
			note: "Pools were clear and warm by noon.",
			time: "12:00",
			title: "Rock pools",
		},
		{
			caption: "Paddleboards across Sugba Lagoon.",
			day: 4,
			isHighlight: true,
			locationName: "Sugba Lagoon",
			note: "Bea jumped off the top deck twice.",
			time: "10:45",
			title: "Lagoon paddle",
		},
		{
			caption: "Last dinner, already planning the next trip.",
			day: 4,
			isHighlight: false,
			locationName: "Bravo Beach Resort",
			note: "Split the bill three ways in the app.",
			time: "20:15",
			title: "Farewell dinner",
		},
	],
	notes: [
		{
			body: "Beginners: Jacking Horse and the inside of Cloud 9 at mid tide. Leave Cloud 9 main peak and Stimpy's to the locals.",
			category: "general",
			title: "Surf spots by level",
		},
		{
			body: "Bea covered the boats, Kiko the motorbikes. Everything else split three ways from the budget tab.",
			category: "budget",
			title: "Who paid what",
		},
	],
	pace: "balanced",
	places: [
		{
			address: "Pacifico, San Isidro",
			category: "place",
			description: "Quieter surf town in the north; next time.",
			locationName: "Pacifico Beach",
			source: "ai",
			title: "Pacifico Beach",
		},
	],
	readiness: [
		{
			category: "packing",
			description: "Rash guards, reef shoes and a dry bag for the boats.",
			dueDay: -2,
			priority: "low",
			status: "done",
			title: "Pack surf gear",
		},
		{
			category: "budget",
			description: "ATMs in General Luna run out on weekends.",
			dueDay: -1,
			priority: "medium",
			status: "done",
			title: "Bring enough cash",
		},
	],
	risks: [
		{
			message:
				"A swell pulse was forecast mid-week, too big for beginners at Cloud 9.",
			severity: "medium",
			status: "mitigated",
			suggestedAction:
				"Moved lessons to Jacking Horse and kept island hopping flexible.",
			title: "Big swell for beginners",
			type: "weather",
		},
		{
			message: "Night riding on unlit roads back from Pilar.",
			severity: "low",
			status: "dismissed",
			suggestedAction: "Head back before dark.",
			title: "Motorbikes after dark",
			type: "safety",
		},
	],
	startOffsetDays: SIARGAO_START_OFFSET_DAYS,
	status: "completed",
	summary:
		"A week of beginner surf, island hopping and rock pools in General Luna with two friends.",
	title: SIARGAO_TITLE,
	travelerCount: 3,
	travelStyle: "adventure",
};

// ---------------------------------------------------------------------------
// Palawan: El Nido to Coron (early planning)
// ---------------------------------------------------------------------------

const palawanSpec: TripSpec = {
	baselineStatus: {},
	bookings: [
		{
			cost: 4400,
			key: "ferry",
			locationName: "El Nido port",
			provider: "Ferry operator",
			start: { day: 3, time: "06:00" },
			status: "target",
			title: "Ferry El Nido to Coron",
			type: "transport",
		},
	],
	budgetAmount: 90_000,
	companions: [],
	days: [],
	destination: "El Nido and Coron, Palawan",
	documents: [],
	expenses: [],
	groupType: "couple",
	lengthDays: PALAWAN_LENGTH_DAYS,
	moments: [],
	notes: [
		{
			body: "Split the week between El Nido and Coron with the morning ferry in the middle. Tour A in El Nido, the Coron lakes tour after.",
			category: "general",
			title: "Rough idea",
		},
	],
	pace: "balanced",
	places: [
		{
			address: "Miniloc Island, El Nido",
			category: "activity",
			description: "Kayak into the lagoon on El Nido Tour A.",
			lat: 11.1667,
			lng: 119.3333,
			locationName: "Big Lagoon",
			source: "ai",
			title: "Big Lagoon",
		},
		{
			address: "El Nido, Palawan",
			category: "place",
			description: "Long, quiet beach north of town.",
			lat: 11.2847,
			lng: 119.4167,
			locationName: "Nacpan Beach",
			source: "user",
			title: "Nacpan Beach",
		},
		{
			address: "Coron Island, Palawan",
			category: "activity",
			description: "Clear lake behind limestone cliffs; short steep climb.",
			lat: 11.9572,
			lng: 120.2289,
			locationName: "Kayangan Lake",
			source: "ai",
			title: "Kayangan Lake",
		},
	],
	readiness: [],
	risks: [],
	startOffsetDays: PALAWAN_START_OFFSET_DAYS,
	status: "planning",
	summary: "A first idea for a week in northern Palawan; nothing booked yet.",
	title: PALAWAN_TITLE,
	travelerCount: 2,
	travelStyle: "relaxed",
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const placeSkippedCategories = new Set<ItineraryItemCategory>([
	"flight",
	"rest",
	"transport",
]);

const getPlannedStopCost = (stop: StopSpec, itemCostsLogged: boolean) =>
	itemCostsLogged && !stop.booking ? 0 : stop.cost;

const toTimestamp = (date: string, time: string) =>
	Date.parse(`${date}T${time}:00${MANILA_UTC_OFFSET}`);

const tripDate = (startDate: string, day: number) =>
	addDaysToKey(startDate, day);

const assertDayHasNoConflicts = (day: DaySpec) => {
	const active = day.stops
		.filter((stop) => stop.status !== "skipped")
		.map((stop, index) => ({
			endTime: stop.end,
			id: `${index}`,
			startTime: stop.start,
			title: stop.title,
		}));
	const conflicts = findItineraryConflicts(active);

	if (conflicts.length > 0) {
		throw new Error(`Showcase day "${day.title}" has overlapping stops.`);
	}
};

const insertBookings = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	startDate: string,
	bookings: BookingSpec[],
	now: number
) => {
	const ids = new Map<string, Id<"bookings">>();

	for (const booking of bookings) {
		const id = await ctx.db.insert("bookings", {
			confirmationCode: booking.confirmationCode,
			cost: booking.cost,
			createdAt: now,
			currency: "PHP",
			endDateTime: booking.end
				? `${tripDate(startDate, booking.end.day)} ${booking.end.time}`
				: undefined,
			locationName: booking.locationName,
			notes: booking.notes,
			provider: booking.provider,
			startDateTime: `${tripDate(startDate, booking.start.day)} ${booking.start.time}`,
			status: booking.status,
			title: booking.title,
			tripId,
			type: booking.type,
			updatedAt: now,
		});
		ids.set(booking.key, id);
	}

	return ids;
};

/**
 * Like ensureItineraryPlace (one place per location), but the first stop names
 * the place and transit stops do not become places.
 */
const insertItineraryPlace = async (
	ctx: MutationCtx,
	{
		day,
		now,
		seenLocations,
		stop,
	}: {
		day: Doc<"itineraryDays">;
		now: number;
		seenLocations: Set<string>;
		stop: StopSpec;
	}
) => {
	const locationKey = stop.locationName.toLowerCase();

	if (
		placeSkippedCategories.has(stop.category) ||
		seenLocations.has(locationKey)
	) {
		return;
	}

	seenLocations.add(locationKey);
	await ctx.db.insert("savedPlaces", {
		address: stop.address,
		assignedDayId: day._id,
		category: stop.category,
		createdAt: now,
		description: stop.description,
		latitude: stop.lat,
		locationName: stop.locationName,
		longitude: stop.lng,
		source: "itinerary",
		title: stop.title,
		tripId: day.tripId,
		updatedAt: now,
	});
};

const fillItinerary = async (
	ctx: MutationCtx,
	tripId: Id<"trips">,
	days: Doc<"itineraryDays">[],
	specs: DaySpec[],
	bookingIds: Map<string, Id<"bookings">>,
	now: number,
	itemCostsLogged = false
) => {
	const seenLocations = new Set<string>();

	for (const [index, spec] of specs.entries()) {
		const day = days[index];

		if (!day) {
			throw new Error(`Showcase trip is missing day ${index + 1}.`);
		}

		assertDayHasNoConflicts(spec);
		let dayCost = 0;

		for (const stop of spec.stops) {
			const timing = validateItineraryTiming({
				endTime: stop.end,
				startTime: stop.start,
			});

			if (!timing.ok) {
				throw new Error(`Showcase stop "${stop.title}" has bad timing.`);
			}

			const status = stop.status ?? "planned";
			dayCost += status === "skipped" ? 0 : stop.cost;

			await ctx.db.insert("itineraryItems", {
				address: stop.address,
				aiReason: stop.aiReason ?? "Fits the route and the pace of the day.",
				bookingId: stop.booking ? bookingIds.get(stop.booking) : undefined,
				category: stop.category,
				dayId: day._id,
				description: stop.description,
				durationMinutes: timing.durationMinutes,
				endTime: timing.endTime,
				estimatedCost: getPlannedStopCost(stop, itemCostsLogged),
				latitude: stop.lat,
				locationName: stop.locationName,
				longitude: stop.lng,
				priority: stop.priority ?? "recommended",
				startTime: timing.startTime,
				status,
				title: stop.title,
				tripId,
			});

			await insertItineraryPlace(ctx, { day, now, seenLocations, stop });
		}

		await ctx.db.patch(day._id, {
			estimatedCost: dayCost,
			pace: spec.pace,
			summary: spec.summary,
			theme: spec.theme,
			title: spec.title,
			weatherNote: spec.weatherNote,
		});
	}
};

const fillReadiness = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	spec: TripSpec
) => {
	await seedBaselineReadinessItems(ctx, trip);
	const baseline = await ctx.db
		.query("readinessItems")
		.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
		.collect();

	for (const item of baseline) {
		const status = spec.baselineStatus[item.category as ReadinessCategory];

		if (status) {
			await ctx.db.patch(item._id, { status });
		}
	}

	for (const item of spec.readiness) {
		await ctx.db.insert("readinessItems", {
			aiReason: "Suggested by Viya for this route.",
			category: item.category,
			description: item.description,
			dueDate: tripDate(trip.startDate, item.dueDay),
			priority: item.priority,
			source: "ai",
			status: item.status,
			title: item.title,
			tripId: trip._id,
		});
	}

	await updateTripReadinessScore(ctx, trip._id);
};

const insertSupportingRows = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	spec: TripSpec,
	days: Doc<"itineraryDays">[],
	bookingIds: Map<string, Id<"bookings">>,
	now: number
) => {
	const tripId = trip._id;

	for (const place of spec.places) {
		await ctx.db.insert("savedPlaces", {
			address: place.address,
			assignedDayId: place.day === undefined ? undefined : days[place.day]?._id,
			category: place.category,
			createdAt: now,
			description: place.description,
			latitude: place.lat,
			locationName: place.locationName,
			longitude: place.lng,
			source: place.source,
			title: place.title,
			tripId,
			updatedAt: now,
		});
	}

	for (const expense of spec.expenses) {
		await ctx.db.insert("expenses", {
			amount: expense.amount,
			bookingId: expense.booking ? bookingIds.get(expense.booking) : undefined,
			category: expense.category,
			createdAt: now,
			currency: "PHP",
			notes: expense.notes,
			source: "manual",
			spentAt: tripDate(trip.startDate, expense.spentDay),
			title: expense.title,
			tripId,
			updatedAt: now,
		});
	}

	for (const risk of spec.risks) {
		const relatedId = risk.booking ? bookingIds.get(risk.booking) : undefined;
		await ctx.db.insert("risks", {
			aiReason: "Flagged by Viya from the trip dates and plan.",
			createdAt: now,
			message: risk.message,
			relatedEntityId: relatedId,
			relatedEntityType: relatedId ? "booking" : undefined,
			severity: risk.severity,
			status: risk.status,
			suggestedAction: risk.suggestedAction,
			title: risk.title,
			tripId,
			type: risk.type,
		});
	}

	for (const note of spec.notes) {
		await ctx.db.insert("tripNotes", {
			body: note.body,
			category: note.category,
			createdAt: now,
			title: note.title,
			tripId,
			updatedAt: now,
		});
	}

	for (const companion of spec.companions) {
		await ctx.db.insert("tripCompanions", {
			createdAt: now,
			name: companion.name,
			notes: companion.notes,
			role: companion.role,
			tripId,
			updatedAt: now,
		});
	}

	for (const document of spec.documents) {
		await ctx.db.insert("travelDocuments", {
			createdAt: now,
			notes: document.notes,
			status: document.status,
			title: document.title,
			tripId,
			type: document.type,
			updatedAt: now,
		});
	}

	for (const moment of spec.moments) {
		await ctx.db.insert("moments", {
			caption: moment.caption,
			createdAt: toTimestamp(tripDate(trip.startDate, moment.day), moment.time),
			dayId: days[moment.day]?._id,
			isHighlight: moment.isHighlight,
			locationName: moment.locationName,
			note: moment.note,
			title: moment.title,
			tripId,
		});
	}
};

const createShowcaseTrip = async (
	ctx: MutationCtx,
	ownerId: string,
	spec: TripSpec,
	todayKey: string,
	now: number
) => {
	const startDate = addDaysToKey(todayKey, spec.startOffsetDays);
	const endDate = addDaysToKey(startDate, spec.lengthDays - 1);
	const tripId = await ctx.db.insert("trips", {
		budgetAmount: spec.budgetAmount,
		budgetCurrency: "PHP",
		createdAt: now,
		destination: spec.destination,
		endDate,
		groupType: spec.groupType,
		isDemo: false,
		ownerId,
		pace: spec.pace,
		readinessScore: 0,
		startDate,
		status: spec.status,
		summary: spec.summary,
		title: spec.title,
		travelerCount: spec.travelerCount,
		travelStyle: spec.travelStyle,
		updatedAt: now,
	});

	await syncItineraryDaysToTripRange(ctx, tripId, { endDate, startDate });
	const trip = await ctx.db.get(tripId);

	if (!trip) {
		throw new Error("Showcase trip was not created.");
	}

	const days = (
		await ctx.db
			.query("itineraryDays")
			.withIndex("by_trip", (q) => q.eq("tripId", tripId))
			.collect()
	).sort((first, second) => first.dayNumber - second.dayNumber);
	const bookingIds = await insertBookings(
		ctx,
		tripId,
		startDate,
		spec.bookings,
		now
	);

	await fillItinerary(
		ctx,
		tripId,
		days,
		spec.days,
		bookingIds,
		now,
		spec.itemCostsLogged
	);
	await insertSupportingRows(ctx, trip, spec, days, bookingIds, now);
	await fillReadiness(ctx, trip, spec);

	return { bookingIds, days, trip };
};

const DRAFT_STAGGER_MS = 5 * MS_PER_MINUTE;

const insertDraft = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	module: "itinerary" | "readiness",
	payload: TripAgentDraftPayload,
	createdAt: number
) => {
	// Parse through the real schema so the stored JSON matches what the app reads.
	const parsed = tripAgentDraftPayloadSchema.parse(payload);
	await ctx.db.insert("tripAgentDrafts", {
		action: module === "itinerary" ? "refine" : "generate",
		createdAt,
		module,
		ownerId: trip.ownerId,
		payloadJson: JSON.stringify(parsed),
		rationale: parsed.rationale,
		source: "ai",
		status: "draft",
		title: parsed.title,
		tripId: trip._id,
		updatedAt: createdAt,
	});
};

const insertCebuDrafts = async (
	ctx: MutationCtx,
	trip: Doc<"trips">,
	now: number
) => {
	const islandDay = tripDate(trip.startDate, 3);
	const emptyLists = {
		bookingTargets: [],
		changes: [],
		days: [],
		moments: [],
		places: [],
		readinessItems: [],
		risks: [],
	};

	await insertDraft(
		ctx,
		trip,
		"itinerary",
		{
			...emptyLists,
			changes: [
				{
					detail:
						"Fills the gap left by the skipped cave visit with a quiet beach.",
					title: "Add Dumaluan Beach",
					type: "add",
				},
			],
			days: [
				{
					date: islandDay,
					estimatedCost: 150,
					items: [
						{
							aiReason: "You saved Dumaluan Beach and the afternoon is open.",
							category: "activity",
							description:
								"Swim and shade on the quieter east side of Panglao.",
							durationMinutes: 75,
							endTime: "15:45",
							estimatedCost: 150,
							locationName: "Dumaluan Beach",
							priority: "optional",
							startTime: "14:30",
							title: "Swim at Dumaluan Beach",
						},
					],
					pace: "light",
					summary: "Keeps Day 4 slow with a short beach stop before sunset.",
					theme: "Islands and slow time",
					title: "Panglao islands",
					weatherNote: "Afternoon showers possible; the beach has shade.",
				},
			],
			rationale:
				"Hinagdanan Cave is skipped, so Day 4 has a free afternoon near a beach you saved.",
			title: "Add a beach stop to Day 4",
		},
		now - DRAFT_STAGGER_MS
	);

	await insertDraft(
		ctx,
		trip,
		"readiness",
		{
			...emptyLists,
			rationale:
				"Late-November weather and the unbooked resort are the biggest gaps before you fly.",
			readinessItems: [
				{
					category: "weather",
					description:
						"Turn on PAGASA alerts and check the ferry advisory each morning.",
					dueDate: tripDate(trip.startDate, -3),
					priority: "high",
					title: "Set typhoon and ferry alerts",
				},
				{
					category: "backupPlan",
					description:
						"Swap island hopping and the countryside tour if seas are rough.",
					dueDate: tripDate(trip.startDate, -2),
					priority: "medium",
					title: "Pick a rainy-day swap for Bohol",
				},
				{
					category: "documents",
					description:
						"Keep the policy number with your IDs for the canyoneering waiver.",
					dueDate: tripDate(trip.startDate, -5),
					priority: "medium",
					title: "Save travel insurance details",
				},
			],
			title: "Weather and backup checks",
		},
		now
	);
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

const deleteShowcaseTrips = async (
	ctx: MutationCtx,
	ownerId: string,
	titles: readonly string[] = SHOWCASE_TRIP_TITLES
) => {
	const trips = await ctx.db
		.query("trips")
		.withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
		.collect();
	const showcase = trips.filter((trip) => titles.includes(trip.title));
	const showcaseIds = new Set<Id<"trips">>(showcase.map((trip) => trip._id));
	const byTripTables = [
		"bookings",
		"expenses",
		"itineraryItems",
		"itineraryDays",
		"moments",
		"readinessItems",
		"risks",
		"savedPlaces",
		"travelDocuments",
		"tripCompanions",
		"tripNotes",
	] as const;

	for (const trip of showcase) {
		for (const table of byTripTables) {
			const rows = await ctx.db
				.query(table)
				.withIndex("by_trip", (q) => q.eq("tripId", trip._id))
				.collect();

			for (const row of rows) {
				await ctx.db.delete(row._id);
			}
		}

		const drafts = await ctx.db
			.query("tripAgentDrafts")
			.withIndex("by_trip_status", (q) => q.eq("tripId", trip._id))
			.collect();

		for (const draft of drafts) {
			await ctx.db.delete(draft._id);
		}

		const vaultItems = await ctx.db
			.query("vaultItems")
			.withIndex("by_owner_trip", (q) =>
				q.eq("ownerId", ownerId).eq("tripId", trip._id)
			)
			.collect();

		for (const item of vaultItems) {
			await ctx.storage.delete(item.storageId);
			await ctx.db.delete(item._id);
		}

		await ctx.db.delete(trip._id);
	}

	// Chats started from a seeded trip fall back to plain chat, as in deleteTrip.
	const threads = await ctx.db
		.query("chatThreads")
		.withIndex("by_owner_updatedAt", (q) => q.eq("ownerId", ownerId))
		.collect();

	for (const thread of threads) {
		if (thread.tripId && showcaseIds.has(thread.tripId)) {
			await ctx.db.patch(thread._id, {
				mode: "chat",
				tripId: undefined,
				updatedAt: Date.now(),
			});
		}
	}

	return showcase.map((trip) => trip.title);
};

export const clearShowcase = internalMutation({
	args: { ownerId: v.string() },
	handler: async (ctx, args) => ({
		deleted: await deleteShowcaseTrips(ctx, args.ownerId),
	}),
});

/** Removes leftover test trips by exact title, with all their workspace rows. */
export const removeTripsByTitle = internalMutation({
	args: { ownerId: v.string(), titles: v.array(v.string()) },
	handler: async (ctx, args) => ({
		deleted: await deleteShowcaseTrips(ctx, args.ownerId, args.titles),
	}),
});

export const seedShowcase = internalMutation({
	args: { ownerId: v.string() },
	handler: async (ctx, args) => {
		await deleteShowcaseTrips(ctx, args.ownerId);
		const todayKey = getTripTodayKey();
		const now = Date.now();
		const created: { id: Id<"trips">; title: string }[] = [];

		for (const spec of [palawanSpec, siargaoSpec, cebuSpec]) {
			const { trip } = await createShowcaseTrip(
				ctx,
				args.ownerId,
				spec,
				todayKey,
				now
			);

			if (spec === cebuSpec) {
				await insertCebuDrafts(ctx, trip, now);
			}

			created.push({ id: trip._id, title: trip.title });
		}

		return { created, todayKey };
	},
});
