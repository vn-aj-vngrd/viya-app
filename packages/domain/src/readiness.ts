import {
	INCOMPLETE_READINESS_STATUSES,
	READINESS_CATEGORIES,
} from "./constants";
import { getReadinessPercent, getTripTodayKey } from "./trip-metrics";
import type { ReadinessCategory, ReadinessItem, ReadinessScore } from "./types";

const incompleteStatuses = new Set<string>(INCOMPLETE_READINESS_STATUSES);
const readinessReviewStatusPriority: Record<string, number> = {
	blocked: 0,
	inProgress: 1,
	todo: 2,
	done: 3,
	ignored: 4,
};
const readinessReviewPriorityRank: Record<string, number> = {
	critical: 4,
	high: 3,
	medium: 2,
	low: 1,
};
interface ReadinessReviewSortInput {
	dueDate: string;
	priority: string;
	status: string;
	title: string;
}
export const REQUIRED_READINESS_CATEGORIES = [
	"bookings",
	"documents",
	"budget",
	"packing",
	"schedule",
	"safety",
	"backupPlan",
] as const satisfies readonly ReadinessCategory[];

const getReadinessReviewStatusPriority = (status: string) =>
	readinessReviewStatusPriority[status] ?? 5;

const getReadinessReviewPriorityRank = (priority: string) =>
	readinessReviewPriorityRank[priority] ?? 0;

export const sortReadinessItemsForReview = <
	Item extends ReadinessReviewSortInput,
>(
	items: readonly Item[]
): Item[] =>
	[...items].sort((leftItem, rightItem) => {
		const statusDelta =
			getReadinessReviewStatusPriority(leftItem.status) -
			getReadinessReviewStatusPriority(rightItem.status);

		if (statusDelta !== 0) {
			return statusDelta;
		}

		const priorityDelta =
			getReadinessReviewPriorityRank(rightItem.priority) -
			getReadinessReviewPriorityRank(leftItem.priority);

		if (priorityDelta !== 0) {
			return priorityDelta;
		}

		const leftDueDate = leftItem.dueDate || "9999-12-31";
		const rightDueDate = rightItem.dueDate || "9999-12-31";
		const dueDateDelta = leftDueDate.localeCompare(rightDueDate);

		if (dueDateDelta !== 0) {
			return dueDateDelta;
		}

		return leftItem.title.localeCompare(rightItem.title);
	});

const summarizeScore = (
	overallScore: number,
	highPriorityGapCount: number
): string => {
	if (overallScore >= 100) {
		return "100% ready. Everything is done.";
	}

	if (overallScore >= 90) {
		return `${overallScore}% ready. Final checks are in good shape.`;
	}

	if (overallScore >= 80) {
		return `${overallScore}% ready. Core travel risks are reduced.`;
	}

	return `${overallScore}% ready. Fix ${highPriorityGapCount} high-priority gaps before departure.`;
};

/**
 * Readiness score for a trip. Uses the same weighted formula as the dashboard
 * percent (see getReadinessPercent), so the stored trip score, the list filter
 * and the readiness screen always agree, and a trip can reach 100.
 */
export const calculateReadinessScore = (
	items: ReadinessItem[],
	todayKey: string = getTripTodayKey()
): ReadinessScore => {
	if (items.length === 0) {
		return {
			categoryScores: Object.fromEntries(
				READINESS_CATEGORIES.map((category) => [category, 0])
			) as Record<ReadinessCategory, number>,
			overallScore: 0,
			summary: "Readiness has not been checked yet.",
			tripId: "unknown",
			updatedAt: new Date().toISOString(),
		};
	}

	const categoryScores = Object.fromEntries(
		READINESS_CATEGORIES.map((category) => [
			category,
			getReadinessPercent(
				items.filter((item) => item.category === category),
				todayKey
			) ?? 100,
		])
	) as Record<ReadinessCategory, number>;
	// No items means nothing has been checked yet, not that the trip is ready.
	const overallScore = getReadinessPercent(items, todayKey) ?? 0;
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
