import {
	INCOMPLETE_READINESS_STATUSES,
	READINESS_CATEGORIES,
	READINESS_PRIORITY_PENALTY,
} from "./constants";
import type { ReadinessCategory, ReadinessItem, ReadinessScore } from "./types";

const incompleteStatuses = new Set<string>(INCOMPLETE_READINESS_STATUSES);
const ACTIVE_GAP_SCORE_WEIGHT = 0.25;
const UNCOVERED_CATEGORY_SCORE_PENALTY = 8 / 3;
export const REQUIRED_READINESS_CATEGORIES = [
	"bookings",
	"documents",
	"budget",
	"packing",
	"schedule",
	"safety",
	"backupPlan",
] as const satisfies readonly ReadinessCategory[];

const getItemPenalty = (item: ReadinessItem): number => {
	if (!incompleteStatuses.has(item.status)) {
		return 0;
	}

	return READINESS_PRIORITY_PENALTY[item.priority];
};

const summarizeScore = (
	overallScore: number,
	highPriorityGapCount: number
): string => {
	if (overallScore >= 90) {
		return `${overallScore}% ready. Final checks are in good shape.`;
	}

	if (overallScore >= 80) {
		return `${overallScore}% ready. Core travel risks are reduced.`;
	}

	return `${overallScore}% ready. Fix ${highPriorityGapCount} high-priority gaps before departure.`;
};

export const calculateReadinessScore = (
	items: ReadinessItem[]
): ReadinessScore => {
	const categoryScores = Object.fromEntries(
		READINESS_CATEGORIES.map((category) => {
			const categoryItems = items.filter((item) => item.category === category);
			const penalty = categoryItems.reduce(
				(total, item) => total + getItemPenalty(item),
				0
			);
			const score =
				categoryItems.length === 0 ? 100 : Math.max(0, 100 - penalty);

			return [category, score];
		})
	) as Record<ReadinessCategory, number>;

	const activePenalties = items.reduce(
		(total, item) => total + getItemPenalty(item),
		0
	);
	const representedCategories = new Set(items.map((item) => item.category));
	const uncoveredCategoryCount =
		READINESS_CATEGORIES.length - representedCategories.size;
	const coveragePenalty =
		uncoveredCategoryCount * UNCOVERED_CATEGORY_SCORE_PENALTY;
	const overallScore = Math.round(
		Math.max(
			0,
			Math.min(
				100,
				100 - activePenalties * ACTIVE_GAP_SCORE_WEIGHT - coveragePenalty
			)
		)
	);
	const highPriorityGapCount = items.filter(
		(item) =>
			incompleteStatuses.has(item.status) &&
			(item.priority === "high" || item.priority === "critical")
	).length;

	return {
		tripId: items[0]?.tripId ?? "unknown",
		overallScore,
		categoryScores,
		summary: summarizeScore(overallScore, highPriorityGapCount),
		updatedAt: new Date().toISOString(),
	};
};

export const getMissingRequiredReadinessCategories = (
	items: readonly Pick<ReadinessItem, "category" | "status">[]
) => {
	const activeCategories = new Set(
		items
			.filter((item) => item.status !== "ignored")
			.map((item) => item.category)
	);

	return REQUIRED_READINESS_CATEGORIES.filter(
		(category) => !activeCategories.has(category)
	);
};
