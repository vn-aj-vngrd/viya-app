import {
	compareTimesOfDay,
	findItineraryConflicts,
	findPhDestinationByName,
	getSeasonRiskNote,
	type PhDestination,
	suggestForTrip,
} from "@viya-app/domain";

/**
 * Pure formatters for the trip chat read tools. Output is compact JSON-ready
 * data: capped lists, the ids the model needs to reference items in a draft,
 * and YYYY-MM-DD dates in Asia/Manila.
 */

export const readListLimit = 40;
const maxStopsPerDay = 20;
const maxAlternatives = 3;

const monthNames = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

interface DayRow {
	_id: string;
	date: string;
	dayNumber: number;
	pace?: string;
	title: string;
	weatherNote?: string;
}

interface StopRow {
	_id: string;
	category: string;
	dayId: string;
	endTime: string;
	estimatedCost: number;
	locationName: string;
	startTime: string;
	status: string;
	title: string;
}

/** Itinerary by day with stop ids and the overlaps already in each day. */
export const formatItineraryRead = ({
	date,
	days,
	stops,
}: {
	date?: string;
	days: readonly DayRow[];
	stops: readonly StopRow[];
}) => {
	const selected = [...days]
		.filter((day) => !date || day.date === date)
		.sort((first, second) => first.dayNumber - second.dayNumber);

	return {
		days: selected.map((day) => {
			const dayStops = stops
				.filter((stop) => stop.dayId === day._id)
				.sort((first, second) =>
					compareTimesOfDay(first.startTime, second.startTime)
				);
			const titleById = new Map(dayStops.map((stop) => [stop._id, stop.title]));
			const conflicts = findItineraryConflicts(
				dayStops
					.filter((stop) => stop.status !== "skipped")
					.map((stop) => ({ ...stop, id: stop._id }))
			).map(
				(conflict) =>
					`"${titleById.get(conflict.firstId)}" overlaps "${titleById.get(conflict.secondId)}"`
			);

			return {
				date: day.date,
				dayId: day._id,
				dayNumber: day.dayNumber,
				...(conflicts.length > 0 ? { conflicts } : {}),
				stops: dayStops.slice(0, maxStopsPerDay).map((stop) => ({
					category: stop.category,
					end: stop.endTime,
					estimatedCostPhp: stop.estimatedCost || undefined,
					location: stop.locationName || undefined,
					start: stop.startTime,
					status: stop.status,
					stopId: stop._id,
					title: stop.title,
				})),
				title: day.title,
				...(day.weatherNote ? { weatherNote: day.weatherNote } : {}),
			};
		}),
		...(date && selected.length === 0
			? { note: `No itinerary day on ${date}. Trip days are listed by date.` }
			: {}),
	};
};

const formatMonths = (months: readonly number[]) =>
	months.map((month) => monthNames[month - 1]).join(", ");

const formatDestination = (destination: PhDestination) => ({
	access: destination.access,
	avoidMonths: formatMonths(destination.avoidMonths),
	bestMonths: formatMonths(destination.bestMonths),
	dailyCostPerPersonPhp: destination.dailyPhp,
	idealDays: destination.idealDays,
	name: destination.name,
	note: destination.note,
	region: destination.region,
	returnAirfareFromManilaPhp: destination.airfarePhp || undefined,
	vibe: destination.vibe,
});

/**
 * Season, typhoon and destination facts from Viya's Philippine destination
 * data (typical patterns, not a live forecast).
 */
export const buildSeasonInfo = ({
	destination,
	endDate,
	includeAlternatives = false,
	startDate,
	today,
	travelerCount,
}: {
	destination: string;
	endDate: string;
	includeAlternatives?: boolean;
	startDate: string;
	today: string;
	travelerCount?: number;
}) => {
	const known = findPhDestinationByName(destination);
	const note = getSeasonRiskNote({
		destination: known ?? destination,
		endDate,
		startDate,
		today,
	});
	const events = known?.events
		?.filter((event) => {
			const startMonth = Number(startDate.slice(5, 7));
			const endMonth = Number(endDate.slice(5, 7));

			return startMonth <= endMonth
				? event.month >= startMonth && event.month <= endMonth
				: event.month >= startMonth || event.month <= endMonth;
		})
		.map((event) => `${event.label} (${monthNames[event.month - 1]})`);
	const alternatives = includeAlternatives
		? suggestForTrip({
				destination,
				endDate,
				limit: maxAlternatives,
				startDate,
				today,
				travelerCount,
			}).alternatives.map((suggestion) => ({
				estimateTotalPhp: suggestion.estimate.totalPhp,
				name: suggestion.destination.name,
				region: suggestion.destination.region,
				season: suggestion.badge.label,
				why: suggestion.headline,
			}))
		: undefined;

	return {
		advice: note.advice,
		dates: `${startDate} to ${endDate}`,
		destination: known ? formatDestination(known) : { name: destination },
		...(events?.length ? { eventsInWindow: events } : {}),
		headline: note.headline,
		isKnownDestination: note.isKnown,
		season: note.badge.label,
		source:
			"Viya's typical season and typhoon patterns for the Philippines. Not a live forecast: tell the user to check PAGASA closer to the date.",
		typhoonRisk: ["none", "low", "elevated", "peak"][note.maxTyphoonRisk],
		...(alternatives ? { alternatives } : {}),
	};
};
