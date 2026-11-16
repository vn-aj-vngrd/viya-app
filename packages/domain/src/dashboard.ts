import { RISK_SEVERITY_RANK } from "./constants";
import type {
	ItineraryItem,
	NextBestAction,
	Risk,
	ViyaDemoTrip,
} from "./types";

const HIGH_RISK_RANK = RISK_SEVERITY_RANK.high;

export const getCriticalOpenRisks = (risks: Risk[]): Risk[] =>
	risks
		.filter((risk) => risk.status === "open" && risk.severity === "critical")
		.sort(
			(a, b) => RISK_SEVERITY_RANK[b.severity] - RISK_SEVERITY_RANK[a.severity]
		);

export const getUpcomingItineraryItems = (
	demoTrip: ViyaDemoTrip,
	limit: number
): ItineraryItem[] => {
	const dayOrder = new Map(demoTrip.days.map((day) => [day.id, day.dayNumber]));

	return [...demoTrip.items]
		.sort((a, b) => {
			const dayDelta =
				(dayOrder.get(a.dayId) ?? 0) - (dayOrder.get(b.dayId) ?? 0);

			if (dayDelta !== 0) {
				return dayDelta;
			}

			return a.startTime.localeCompare(b.startTime);
		})
		.slice(0, limit);
};

export const getNextBestAction = (demoTrip: ViyaDemoTrip): NextBestAction => {
	const openRisk = [...demoTrip.risks]
		.filter((risk) => risk.status === "open")
		.sort(
			(a, b) => RISK_SEVERITY_RANK[b.severity] - RISK_SEVERITY_RANK[a.severity]
		)[0];

	if (openRisk && RISK_SEVERITY_RANK[openRisk.severity] >= HIGH_RISK_RANK) {
		return {
			label: openRisk.suggestedAction || `Review risk: ${openRisk.title}`,
			reason: openRisk.message,
			target: "risks",
		};
	}

	const incompleteReadinessItem = demoTrip.readinessItems.find(
		(item) => item.status !== "done"
	);

	if (incompleteReadinessItem) {
		return {
			label: incompleteReadinessItem.title,
			reason: incompleteReadinessItem.aiReason,
			target: "readiness",
		};
	}

	return {
		label: "Open Travel Mode",
		reason:
			"Your core planning items are ready. Use Travel Mode for the current day.",
		target: "travelMode",
	};
};
