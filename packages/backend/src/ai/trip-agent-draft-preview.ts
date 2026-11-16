import {
	describeBudgetChange,
	type TripAgentDraftPayload,
	type TripProfileChange,
} from "./trip-agent-draft-apply";

const maxPreviewLines = 6;
const maxStopsListed = 3;
const isoDateLength = 10;

const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	weekday: "short",
});

/** "Tue, Dec 2" for a YYYY-MM-DD key; the key itself when it is not a date. */
export const formatDayLabel = (dateKey: string) => {
	const date = new Date(`${dateKey.slice(0, isoDateLength)}T12:00:00Z`);

	return Number.isNaN(date.getTime())
		? dateKey
		: dayLabelFormatter.format(date);
};

const pluralize = (count: number, singular: string) =>
	`${count} ${singular}${count === 1 ? "" : "s"}`;

const listWithMore = (labels: readonly string[], max = maxStopsListed) => {
	const shown = labels.slice(0, max).join(", ");
	const extra = labels.length - max;

	return extra > 0 ? `${shown} +${extra} more` : shown;
};

const describeItinerary = (payload: TripAgentDraftPayload) => {
	const lines = payload.days.map((day) => {
		const stops = [...day.items]
			.sort((first, second) => first.startTime.localeCompare(second.startTime))
			.map((item) => `${item.startTime} ${item.title}`);
		const moved = day.items.filter((item) => item.stopId).length;
		const movedNote = moved > 0 ? ` (${moved} changed)` : "";

		return stops.length > 0
			? `${formatDayLabel(day.date)}: ${listWithMore(stops)}${movedNote}`
			: `${formatDayLabel(day.date)}: day details only`;
	});
	const removals = payload.removeStopIds?.length ?? 0;

	if (removals > 0) {
		lines.push(`Removes ${pluralize(removals, "stop")}`);
	}

	return lines;
};

const describeProfile = (
	change: TripProfileChange | undefined,
	trip?: DraftPreviewTrip
) => {
	if (!change) {
		return [];
	}

	const lines: string[] = [];

	if (change.startDate || change.endDate) {
		lines.push(
			`Dates: ${change.startDate ?? trip?.startDate ?? "same start"} to ${change.endDate ?? trip?.endDate ?? "same end"}`
		);
	}

	if (change.travelerCount !== undefined) {
		lines.push(`Travelers: ${change.travelerCount}`);
	}

	if (change.arrivalTime || change.departureTime) {
		lines.push(
			`Arrive ${change.arrivalTime ?? "unchanged"}, leave ${change.departureTime ?? "unchanged"}`
		);
	}

	const others = (["destination", "title", "pace", "groupType"] as const)
		.filter((key) => change[key])
		.map((key) => `${key === "groupType" ? "group" : key}: ${change[key]}`);

	if (others.length > 0) {
		lines.push(others.join(", "));
	}

	if (change.summary) {
		lines.push("New trip summary");
	}

	return lines;
};

export interface DraftPreviewTrip {
	budgetAmount?: number;
	budgetCurrency?: string;
	endDate: string;
	startDate: string;
}

const describeBudget = (
	payload: TripAgentDraftPayload,
	trip?: DraftPreviewTrip
) => {
	const change = describeBudgetChange({
		currency: trip?.budgetCurrency,
		current: trip?.budgetAmount,
		next: payload.budgetAmount,
	});

	if (change) {
		return [`Budget: ${change}`];
	}

	return payload.budgetAmount
		? [
				`Budget: ${Math.round(payload.budgetAmount).toLocaleString("en-US")} ${trip?.budgetCurrency ?? "PHP"}`,
			]
		: [];
};

const describeLists = (payload: TripAgentDraftPayload) => [
	...payload.bookingTargets.map((target) => {
		const when = target.startDateTime ? ` on ${target.startDateTime}` : "";

		return `To book: ${target.title} (${target.type})${when}`;
	}),
	...payload.readinessItems.map(
		(item) => `To do: ${item.title} (due ${item.dueDate})`
	),
	...payload.places.map((place) => `Place: ${place.title}`),
	...payload.risks.map((risk) => `Risk: ${risk.title} (${risk.severity})`),
	...payload.moments.map((moment) => `Moment: ${moment.title}`),
];

/**
 * Short, plain lines saying what a draft would change, for the chat tool
 * result and the Drafts sheet. Only the draft's own module is described, so
 * the preview matches what applying it does.
 */
export const describeDraftPayload = ({
	module,
	payload,
	trip,
}: {
	module: string;
	payload: TripAgentDraftPayload;
	trip?: DraftPreviewTrip;
}): string[] => {
	let lines: string[];

	if (module === "itinerary") {
		lines = describeItinerary(payload);
	} else if (module === "profile") {
		lines = describeProfile(payload.profile, trip);
	} else {
		lines = [...describeBudget(payload, trip), ...describeLists(payload)];
	}

	if (lines.length <= maxPreviewLines) {
		return lines;
	}

	return [
		...lines.slice(0, maxPreviewLines - 1),
		`+${lines.length - (maxPreviewLines - 1)} more`,
	];
};
