export interface TripRiskReviewSortInput {
	createdAt: number;
	severity: string;
	status: string;
	title: string;
}

const statusPriority: Record<string, number> = {
	dismissed: 2,
	mitigated: 1,
	open: 0,
};

const severityPriority: Record<string, number> = {
	critical: 4,
	high: 3,
	low: 1,
	medium: 2,
};

const getStatusPriority = (status: string) => statusPriority[status] ?? 3;

const getSeverityPriority = (severity: string) =>
	severityPriority[severity] ?? 0;

export const sortTripRisksForReview = <Risk extends TripRiskReviewSortInput>(
	risks: readonly Risk[]
): Risk[] =>
	[...risks].sort((leftRisk, rightRisk) => {
		const statusDelta =
			getStatusPriority(leftRisk.status) - getStatusPriority(rightRisk.status);

		if (statusDelta !== 0) {
			return statusDelta;
		}

		const severityDelta =
			getSeverityPriority(rightRisk.severity) -
			getSeverityPriority(leftRisk.severity);

		if (severityDelta !== 0) {
			return severityDelta;
		}

		const createdAtDelta = rightRisk.createdAt - leftRisk.createdAt;

		if (createdAtDelta !== 0) {
			return createdAtDelta;
		}

		return leftRisk.title.localeCompare(rightRisk.title);
	});
