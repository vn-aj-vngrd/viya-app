import type { TravelInterest } from "./types";

/** Typhoon risk for one month: 0 none, 1 low, 2 elevated, 3 peak. */
export type TyphoonRisk = 0 | 1 | 2 | 3;

export type TyphoonZone =
	| "bicol"
	| "luzon"
	| "mindanaoNorth"
	| "mindanaoSouth"
	| "palawan"
	| "visayasCentral"
	| "visayasEast"
	| "visayasWest";

/** Month-indexed (Jan to Dec) typhoon exposure by region. Peak is Aug to Oct. */
export const typhoonRiskByZone: Record<TyphoonZone, readonly TyphoonRisk[]> = {
	bicol: [1, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 2],
	luzon: [0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 2, 1],
	mindanaoNorth: [1, 1, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2],
	mindanaoSouth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
	palawan: [1, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 1],
	visayasCentral: [1, 0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 2],
	visayasEast: [2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 3],
	visayasWest: [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3, 1],
};

export type SuitabilityLevel = "great" | "ok" | "poor";

export interface PhDestinationEvent {
	label: string;
	month: number;
}

export interface PhDestination {
	/** How to get there. */
	access: { fromCebu: string; fromManila: string };
	/** Typical return airfare per person from Manila in PHP, 0 when reached by road. */
	airfarePhp: number;
	/** Months to avoid: heavy rain, rough seas or closures. */
	avoidMonths: readonly number[];
	/** Months (1 to 12) with the best weather and sea conditions. */
	bestMonths: readonly number[];
	/** Daily cost per person in PHP (lodging, food, local transport, activities), excluding flights. */
	dailyPhp: { budget: number; midRange: number; premium: number };
	detail: string;
	events?: readonly PhDestinationEvent[];
	icon: string;
	id: string;
	/** Recommended trip length in days. */
	idealDays: { max: number; min: number };
	/** Wikipedia lookup title for the photo when the name alone is ambiguous. */
	imageQuery?: string;
	/** Physical and logistics demand, 1 easy to 3 demanding. */
	intensity: 1 | 2 | 3;
	interests: readonly TravelInterest[];
	kids: SuitabilityLevel;
	name: string;
	/** Plain-language caveat that applies to the destination all year. */
	note?: string;
	region: string;
	seniors: SuitabilityLevel;
	/** Short vibe tags shown to the traveler. */
	vibe: readonly string[];
	zone: TyphoonZone;
}

const allYear = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const allMonths: readonly number[] = allYear;

export const phDestinations: readonly PhDestination[] = [
	{
		access: {
			fromCebu:
				"Fly Cebu to Puerto Princesa, then a 5 to 6 hour van; or Cebu to El Nido direct on some days.",
			fromManila:
				"Fly to El Nido (Lio) or Puerto Princesa and take a 5 to 6 hour van.",
		},
		airfarePhp: 7500,
		avoidMonths: [8, 9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 2500, midRange: 4800, premium: 12_000 },
		detail: "Lagoons, limestone cliffs, island hopping",
		icon: "boat-outline",
		id: "el-nido",
		idealDays: { max: 5, min: 4 },
		imageQuery: "El Nido, Palawan",
		intensity: 2,
		interests: ["beaches", "nature", "hiddenGems"],
		kids: "ok",
		name: "El Nido",
		note: "Island-hopping tours are cancelled in rough seas; keep a spare day.",
		region: "Palawan",
		seniors: "ok",
		vibe: ["Island hopping", "Lagoons", "Sunsets"],
		zone: "palawan",
	},
	{
		access: {
			fromCebu:
				"Fly Cebu to Busuanga (Coron) a few times a week, or connect via Manila.",
			fromManila:
				"Direct flight to Busuanga (Coron), then a 40 minute transfer.",
		},
		airfarePhp: 6500,
		avoidMonths: [8, 9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 2300, midRange: 4500, premium: 11_000 },
		detail: "Shipwreck dives, Kayangan Lake, hot springs",
		icon: "water-outline",
		id: "coron",
		idealDays: { max: 4, min: 3 },
		imageQuery: "Coron, Palawan",
		intensity: 2,
		interests: ["beaches", "nature", "hiddenGems"],
		kids: "ok",
		name: "Coron",
		note: "Boat trips depend on sea state; the town itself is small and simple.",
		region: "Palawan",
		seniors: "ok",
		vibe: ["Wreck diving", "Lakes", "Island hopping"],
		zone: "palawan",
	},
	{
		access: {
			fromCebu: "Direct flights Cebu to Puerto Princesa most days.",
			fromManila: "Direct flights to Puerto Princesa, about 1 hour 20 minutes.",
		},
		airfarePhp: 5500,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5, 12],
		dailyPhp: { budget: 2000, midRange: 3800, premium: 9000 },
		detail: "Underground river, firefly tours, easy city base",
		icon: "leaf-outline",
		id: "puerto-princesa",
		idealDays: { max: 4, min: 2 },
		imageQuery: "Puerto Princesa Subterranean River National Park",
		intensity: 1,
		interests: ["nature", "food", "culture"],
		kids: "great",
		name: "Puerto Princesa",
		region: "Palawan",
		seniors: "great",
		vibe: ["Underground river", "Easy base", "Seafood"],
		zone: "palawan",
	},
	{
		access: {
			fromCebu: "Direct flights Cebu to Siargao (Sayak) several times a week.",
			fromManila: "Direct flights to Siargao, about 1 hour 50 minutes.",
		},
		airfarePhp: 8500,
		avoidMonths: [11, 12, 1, 2],
		bestMonths: [3, 4, 5, 6],
		dailyPhp: { budget: 2200, midRange: 4500, premium: 11_000 },
		detail: "Surf breaks, palm roads, quiet lagoons",
		events: [{ label: "Cloud 9 surf season peaks", month: 9 }],
		icon: "sunny-outline",
		id: "siargao",
		idealDays: { max: 5, min: 4 },
		imageQuery: "General Luna, Surigao del Norte",
		intensity: 2,
		interests: ["beaches", "nature", "nightlife", "hiddenGems"],
		kids: "ok",
		name: "Siargao",
		note: "Exposed to Pacific storms from October; Typhoon Odette hit in December 2021.",
		region: "Caraga",
		seniors: "ok",
		vibe: ["Surf", "Island life", "Cafes"],
		zone: "visayasEast",
	},
	{
		access: {
			fromCebu: "Fast ferry Cebu to Tagbilaran in about 2 hours.",
			fromManila: "Direct flights to Tagbilaran or the new Panglao airport.",
		},
		airfarePhp: 5000,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 2200, midRange: 4200, premium: 10_000 },
		detail: "Chocolate Hills, tarsiers, white sand",
		icon: "leaf-outline",
		id: "bohol",
		idealDays: { max: 4, min: 3 },
		intensity: 1,
		interests: ["nature", "beaches", "culture"],
		kids: "great",
		name: "Bohol",
		region: "Central Visayas",
		seniors: "great",
		vibe: ["Countryside tours", "Beaches", "Family friendly"],
		zone: "visayasCentral",
	},
	{
		access: {
			fromCebu: "You are already here; hire a car or take the bus south.",
			fromManila: "Frequent flights to Mactan-Cebu, about 1 hour 25 minutes.",
		},
		airfarePhp: 4500,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 2200, midRange: 4200, premium: 10_000 },
		detail: "City energy, waterfalls, canyoneering",
		events: [{ label: "Sinulog festival", month: 1 }],
		icon: "business-outline",
		id: "cebu",
		idealDays: { max: 5, min: 3 },
		imageQuery: "Cebu City",
		intensity: 2,
		interests: ["food", "culture", "nature", "shopping", "nightlife"],
		kids: "great",
		name: "Cebu",
		note: "Sinulog week in January fills hotels; book early.",
		region: "Central Visayas",
		seniors: "great",
		vibe: ["City base", "Food", "Day trips"],
		zone: "visayasCentral",
	},
	{
		access: {
			fromCebu: "About 3 hours by car or bus from Cebu City via the south.",
			fromManila: "Fly to Cebu, then a 3 hour ride south.",
		},
		airfarePhp: 4500,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 1800, midRange: 3500, premium: 8000 },
		detail: "Sardine run, turtles, Kawasan Falls",
		icon: "fish-outline",
		id: "moalboal",
		idealDays: { max: 3, min: 2 },
		imageQuery: "Moalboal",
		intensity: 2,
		interests: ["nature", "beaches", "hiddenGems"],
		kids: "ok",
		name: "Moalboal",
		region: "Central Visayas",
		seniors: "ok",
		vibe: ["Snorkeling", "Canyoneering", "Laid back"],
		zone: "visayasCentral",
	},
	{
		access: {
			fromCebu: "About 3 to 4 hours by car or bus from Cebu City.",
			fromManila: "Fly to Cebu, then a 3 to 4 hour ride south.",
		},
		airfarePhp: 4500,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 1800, midRange: 3300, premium: 7500 },
		detail: "Whale shark encounters, Tumalog Falls, Sumilon sandbar",
		icon: "fish-outline",
		id: "oslob",
		idealDays: { max: 2, min: 2 },
		imageQuery: "Oslob",
		intensity: 1,
		interests: ["nature", "beaches"],
		kids: "ok",
		name: "Oslob",
		note: "Whale shark feeding is contested on animal-welfare grounds; consider other experiences.",
		region: "Central Visayas",
		seniors: "ok",
		vibe: ["Wildlife", "Waterfalls", "Short stay"],
		zone: "visayasCentral",
	},
	{
		access: {
			fromCebu: "Fly Cebu to Caticlan, then a 15 minute boat to the island.",
			fromManila:
				"Fly to Caticlan (Godofredo P. Ramos), then a short boat and van.",
		},
		airfarePhp: 5500,
		avoidMonths: [7, 8, 9],
		bestMonths: [1, 2, 3, 4, 5, 12],
		dailyPhp: { budget: 2800, midRange: 5500, premium: 14_000 },
		detail: "Powder sand, sunsets, easy nightlife",
		icon: "umbrella-outline",
		id: "boracay",
		idealDays: { max: 4, min: 3 },
		intensity: 1,
		interests: ["beaches", "nightlife", "food", "wellness"],
		kids: "great",
		name: "Boracay",
		note: "Habagat winds from June to October move activity to the quieter Bulabog side.",
		region: "Western Visayas",
		seniors: "great",
		vibe: ["Powder sand", "Sunsets", "Nightlife"],
		zone: "visayasWest",
	},
	{
		access: {
			fromCebu: "Connect via Manila; there is no direct flight.",
			fromManila:
				"Fly to Basco (about 1 hour 45 minutes). Flights are small and weather-dependent.",
		},
		airfarePhp: 9500,
		avoidMonths: [7, 8, 9, 10, 11, 12, 1],
		bestMonths: [3, 4, 5],
		dailyPhp: { budget: 2800, midRange: 4800, premium: 9500 },
		detail: "Rolling hills, stone houses, sea cliffs",
		icon: "navigate-outline",
		id: "batanes",
		idealDays: { max: 5, min: 4 },
		intensity: 2,
		interests: ["nature", "culture", "hiddenGems"],
		kids: "ok",
		name: "Batanes",
		note: "Flights and boats cancel often; plan at least one buffer day on each end.",
		region: "Cagayan Valley",
		seniors: "ok",
		vibe: ["Quiet", "Scenic", "Photography"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Connect via Manila, then a bus or a flight to Clark.",
			fromManila: "5 to 6 hour bus from Manila via Kennon or NLEX, or drive.",
		},
		airfarePhp: 0,
		avoidMonths: [7, 8, 9],
		bestMonths: [12, 1, 2, 3],
		dailyPhp: { budget: 1500, midRange: 3000, premium: 7000 },
		detail: "Cool air, pine ridges, market finds",
		events: [{ label: "Panagbenga flower festival", month: 2 }],
		icon: "pint-outline",
		id: "baguio",
		idealDays: { max: 3, min: 2 },
		intensity: 1,
		interests: ["food", "culture", "shopping", "nature"],
		kids: "great",
		name: "Baguio",
		note: "Weekends and Panagbenga are crowded; travel on weekdays if you can.",
		region: "Cordillera",
		seniors: "ok",
		vibe: ["Cool weather", "Markets", "Cafes"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Connect via Manila; Laoag flights are the closest airport.",
			fromManila: "8 to 9 hour bus, or fly to Laoag and drive 2 hours.",
		},
		airfarePhp: 5500,
		avoidMonths: [7, 8, 9],
		bestMonths: [11, 12, 1, 2, 3],
		dailyPhp: { budget: 1500, midRange: 3000, premium: 6500 },
		detail: "Heritage streets, empanada, slow mornings",
		icon: "map-outline",
		id: "vigan",
		idealDays: { max: 3, min: 2 },
		intensity: 1,
		interests: ["culture", "food", "hiddenGems"],
		kids: "ok",
		name: "Vigan",
		region: "Ilocos",
		seniors: "great",
		vibe: ["Heritage", "Walkable", "Slow"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Connect via Manila, then bus to Baguio and Sagada.",
			fromManila:
				"Overnight bus to Sagada (about 12 hours), or bus to Baguio then a 5 hour ride.",
		},
		airfarePhp: 0,
		avoidMonths: [7, 8, 9],
		bestMonths: [11, 12, 1, 2, 3, 4],
		dailyPhp: { budget: 1500, midRange: 2800, premium: 5500 },
		detail: "Hanging coffins, caves, sea of clouds",
		icon: "trail-sign-outline",
		id: "sagada",
		idealDays: { max: 4, min: 3 },
		intensity: 3,
		interests: ["nature", "culture", "hiddenGems"],
		kids: "poor",
		name: "Sagada",
		note: "Long mountain roads and steep cave routes; landslides can close roads in the rainy season.",
		region: "Cordillera",
		seniors: "poor",
		vibe: ["Caving", "Cool hills", "Coffee"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Connect via Manila, then an overnight bus to Banaue.",
			fromManila: "Overnight bus to Banaue (about 8 to 9 hours).",
		},
		airfarePhp: 0,
		avoidMonths: [7, 8, 9, 10],
		bestMonths: [3, 4, 5, 11, 12],
		dailyPhp: { budget: 1400, midRange: 2600, premium: 5000 },
		detail: "Ancient rice terraces, Batad trek",
		icon: "trail-sign-outline",
		id: "banaue",
		idealDays: { max: 3, min: 2 },
		intensity: 3,
		interests: ["nature", "culture", "hiddenGems"],
		kids: "poor",
		name: "Banaue",
		note: "Terraces are greenest from April to June and golden before harvest in May to June.",
		region: "Cordillera",
		seniors: "poor",
		vibe: ["Terraces", "Trekking", "Remote"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu:
				"Direct flights Cebu to Dumaguete, or a fast ferry via Tagbilaran or Dapitan.",
			fromManila: "Direct flights to Dumaguete, about 1 hour 20 minutes.",
		},
		airfarePhp: 5000,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 2000, midRange: 3800, premium: 8500 },
		detail: "Seaside promenade, Apo Island, easy charm",
		icon: "cafe-outline",
		id: "dumaguete",
		idealDays: { max: 4, min: 3 },
		intensity: 1,
		interests: ["food", "culture", "nature", "beaches"],
		kids: "great",
		name: "Dumaguete",
		region: "Negros Oriental",
		seniors: "great",
		vibe: ["Walkable city", "Diving", "Cafes"],
		zone: "visayasCentral",
	},
	{
		access: {
			fromCebu:
				"Ferry via Dumaguete or Tagbilaran; about 1 hour from Dumaguete.",
			fromManila: "Fly to Dumaguete, then a 1 hour ferry to Siquijor.",
		},
		airfarePhp: 5000,
		avoidMonths: [9, 10, 11],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 1800, midRange: 3500, premium: 8000 },
		detail: "Waterfalls, old churches, island loop by scooter",
		icon: "bicycle-outline",
		id: "siquijor",
		idealDays: { max: 3, min: 2 },
		intensity: 1,
		interests: ["nature", "hiddenGems", "wellness"],
		kids: "ok",
		name: "Siquijor",
		region: "Central Visayas",
		seniors: "ok",
		vibe: ["Island loop", "Quiet", "Waterfalls"],
		zone: "visayasCentral",
	},
	{
		access: {
			fromCebu:
				"Direct flights Cebu to Camiguin when scheduled, or ferry via Bohol.",
			fromManila: "Fly to Cagayan de Oro, then a 2 hour road and ferry trip.",
		},
		airfarePhp: 6500,
		avoidMonths: [11, 12, 1],
		bestMonths: [3, 4, 5, 6],
		dailyPhp: { budget: 1800, midRange: 3300, premium: 7000 },
		detail: "Hot springs, White Island sandbar, waterfalls",
		events: [{ label: "Lanzones festival", month: 10 }],
		icon: "flame-outline",
		id: "camiguin",
		idealDays: { max: 4, min: 3 },
		intensity: 1,
		interests: ["nature", "beaches", "wellness", "hiddenGems"],
		kids: "great",
		name: "Camiguin",
		region: "Northern Mindanao",
		seniors: "great",
		vibe: ["Hot springs", "Sandbar", "Slow"],
		zone: "mindanaoNorth",
	},
	{
		access: {
			fromCebu: "Connect via Manila; Clark flights are an alternative.",
			fromManila: "5 to 6 hour bus or drive via NLEX, about 270 km.",
		},
		airfarePhp: 0,
		avoidMonths: [7, 8, 9],
		bestMonths: [11, 12, 1, 2, 3, 4],
		dailyPhp: { budget: 1700, midRange: 3500, premium: 7500 },
		detail: "Surf breaks, beach cafes, weekend nightlife",
		icon: "water-outline",
		id: "la-union",
		idealDays: { max: 3, min: 2 },
		imageQuery: "La Union",
		intensity: 1,
		interests: ["beaches", "nightlife", "food"],
		kids: "ok",
		name: "La Union",
		region: "Ilocos",
		seniors: "ok",
		vibe: ["Surf town", "Cafes", "Weekend trip"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Direct flights Cebu to Davao most days.",
			fromManila: "Direct flights to Davao, about 2 hours.",
		},
		airfarePhp: 5500,
		avoidMonths: [],
		bestMonths: [3, 4, 5, 6, 7, 8],
		dailyPhp: { budget: 2000, midRange: 3800, premium: 8500 },
		detail: "Durian, Eden nature park, Mount Apo day trips",
		events: [{ label: "Kadayawan festival", month: 8 }],
		icon: "nutrition-outline",
		id: "davao",
		idealDays: { max: 5, min: 3 },
		imageQuery: "Davao City",
		intensity: 2,
		interests: ["nature", "food", "culture"],
		kids: "great",
		name: "Davao",
		note: "Outside the typhoon belt, so it is a good fallback when northern routes are stormy.",
		region: "Davao Region",
		seniors: "great",
		vibe: ["Fruit and food", "Nature day trips", "Calm city"],
		zone: "mindanaoSouth",
	},
	{
		access: {
			fromCebu: "Direct flights Cebu to Iloilo, or a fast ferry from Bacolod.",
			fromManila: "Frequent direct flights to Iloilo, about 1 hour 15 minutes.",
		},
		airfarePhp: 4500,
		avoidMonths: [8, 9, 10],
		bestMonths: [1, 2, 3, 4, 5],
		dailyPhp: { budget: 1800, midRange: 3500, premium: 7500 },
		detail: "Heritage churches, La Paz batchoy, Guimaras mangoes",
		events: [{ label: "Dinagyang festival", month: 1 }],
		icon: "restaurant-outline",
		id: "iloilo",
		idealDays: { max: 4, min: 2 },
		imageQuery: "Iloilo City",
		intensity: 1,
		interests: ["food", "culture", "hiddenGems"],
		kids: "great",
		name: "Iloilo",
		region: "Western Visayas",
		seniors: "great",
		vibe: ["Food city", "Heritage", "Easy walking"],
		zone: "visayasWest",
	},
	{
		access: {
			fromCebu: "Direct flights Cebu to Bacolod or a fast ferry.",
			fromManila:
				"Frequent direct flights to Bacolod, about 1 hour 20 minutes.",
		},
		airfarePhp: 4500,
		avoidMonths: [8, 9, 10],
		bestMonths: [1, 2, 3, 4, 5, 12],
		dailyPhp: { budget: 1800, midRange: 3500, premium: 7500 },
		detail: "Chicken inasal, ancestral houses, MassKara",
		events: [{ label: "MassKara festival", month: 10 }],
		icon: "happy-outline",
		id: "bacolod",
		idealDays: { max: 3, min: 2 },
		imageQuery: "Bacolod",
		intensity: 1,
		interests: ["food", "culture", "hiddenGems"],
		kids: "great",
		name: "Bacolod",
		region: "Negros Occidental",
		seniors: "great",
		vibe: ["Food", "Heritage", "Festivals"],
		zone: "visayasWest",
	},
	{
		access: {
			fromCebu: "Connect via Manila, then 2 to 3 hours by road.",
			fromManila: "1.5 to 3 hours by car or bus from Manila.",
		},
		airfarePhp: 0,
		avoidMonths: [7, 8, 9],
		bestMonths: [11, 12, 1, 2, 3],
		dailyPhp: { budget: 1800, midRange: 3500, premium: 8000 },
		detail: "Taal Volcano views, cool air, easy weekend",
		icon: "cloud-outline",
		id: "tagaytay",
		idealDays: { max: 2, min: 1 },
		intensity: 1,
		interests: ["nature", "food", "wellness"],
		kids: "great",
		name: "Tagaytay",
		note: "Taal Volcano alert levels can close the lake area; check PHIVOLCS before you go.",
		region: "Calabarzon",
		seniors: "great",
		vibe: ["Weekend", "Views", "Cafes"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Connect via Manila, then a road transfer of 2 to 3 hours.",
			fromManila: "2.5 to 3 hours by car, then a boat to dive sites.",
		},
		airfarePhp: 0,
		avoidMonths: [7, 8, 9, 10],
		bestMonths: [11, 12, 1, 2, 3, 4, 5],
		dailyPhp: { budget: 2800, midRange: 5000, premium: 10_000 },
		detail: "Macro diving, reef snorkeling, short escape",
		icon: "water-outline",
		id: "anilao",
		idealDays: { max: 3, min: 2 },
		imageQuery: "Mabini, Batangas",
		intensity: 2,
		interests: ["nature", "beaches", "hiddenGems"],
		kids: "poor",
		name: "Anilao",
		region: "Calabarzon",
		seniors: "ok",
		vibe: ["Diving", "Short trip", "Marine life"],
		zone: "luzon",
	},
	{
		access: {
			fromCebu: "Connect via Manila to Legazpi, then a 1.5 hour road.",
			fromManila: "Fly to Legazpi, then a 1.5 to 2 hour van to Donsol.",
		},
		airfarePhp: 4500,
		avoidMonths: [8, 9, 10, 11, 12],
		bestMonths: [2, 3, 4, 5],
		dailyPhp: { budget: 2000, midRange: 3500, premium: 6500 },
		detail: "Whale shark interaction, firefly river, Mayon views",
		icon: "fish-outline",
		id: "donsol",
		idealDays: { max: 3, min: 2 },
		imageQuery: "Donsol, Sorsogon",
		intensity: 1,
		interests: ["nature", "hiddenGems"],
		kids: "ok",
		name: "Donsol",
		note: "Whale shark season runs about November to June; sightings are never guaranteed.",
		region: "Bicol",
		seniors: "ok",
		vibe: ["Wildlife", "Quiet", "Mayon views"],
		zone: "bicol",
	},
	{
		access: {
			fromCebu: "Connect via Manila to Naga, then a road and boat transfer.",
			fromManila: "Fly to Naga or bus 10 hours, then a road and boat transfer.",
		},
		airfarePhp: 4500,
		avoidMonths: [8, 9, 10, 11, 12],
		bestMonths: [3, 4, 5],
		dailyPhp: { budget: 2500, midRange: 4000, premium: 7500 },
		detail: "Limestone islets, white coves, quiet beaches",
		icon: "boat-outline",
		id: "caramoan",
		idealDays: { max: 4, min: 3 },
		intensity: 2,
		interests: ["beaches", "nature", "hiddenGems"],
		kids: "ok",
		name: "Caramoan",
		note: "Sea crossings stop in storms; the area faces the Pacific.",
		region: "Bicol",
		seniors: "poor",
		vibe: ["Hidden coves", "Island hopping", "Remote"],
		zone: "bicol",
	},
];

export const getPhDestination = (id: string) =>
	phDestinations.find((destination) => destination.id === id);

const normalizeName = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9 ]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

/** Match free text such as "El Nido, Palawan, Philippines" to a known destination. */
export const findPhDestinationByName = (text: string) => {
	const normalized = normalizeName(text);

	if (!normalized) {
		return;
	}

	return phDestinations.find((destination) => {
		const name = normalizeName(destination.name);

		return (
			normalized === name ||
			normalized.startsWith(`${name} `) ||
			normalized.includes(` ${name} `) ||
			normalized.endsWith(` ${name}`)
		);
	});
};
