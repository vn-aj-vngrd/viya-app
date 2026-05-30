const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})/;
const dateMs = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});

const dateWithYearFormatter = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	year: "numeric",
});

const getUtcDate = (value: string) => {
	const match = isoDatePattern.exec(value);

	if (!match) {
		return null;
	}

	const [, yearValue, monthValue, dayValue] = match;
	const year = Number(yearValue);
	const month = Number(monthValue);
	const day = Number(dayValue);
	const date = new Date(Date.UTC(year, month - 1, day));

	if (
		Number.isNaN(date.getTime()) ||
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
};

const formatMonthDay = (date: Date) => dateFormatter.format(date);

const formatMonthDayWithYear = (date: Date) =>
	dateWithYearFormatter.format(date);

const getDisplayDate = (value: Date | number | string | null | undefined) => {
	if (typeof value === "string") {
		return getUtcDate(value);
	}

	if (value === undefined || value === null) {
		return null;
	}

	return new Date(value);
};

export const formatReadableDate = (
	value: Date | number | string | null | undefined,
	{
		fallbackLabel = "Date TBD",
		includeYear = true,
	}: {
		fallbackLabel?: string;
		includeYear?: boolean;
	} = {}
) => {
	const date = getDisplayDate(value);

	if (!date || Number.isNaN(date.getTime())) {
		return fallbackLabel;
	}

	return includeYear ? formatMonthDayWithYear(date) : formatMonthDay(date);
};

export const getDateRangeDurationDays = (
	startDate: string,
	endDate: string
) => {
	const start = getUtcDate(startDate);
	const end = getUtcDate(endDate);

	if (!(start && end)) {
		return null;
	}

	return Math.max(
		1,
		Math.round((end.getTime() - start.getTime()) / dateMs) + 1
	);
};

export const getCalendarDayOffset = (targetDate: string) => {
	const target = getUtcDate(targetDate);
	const today = getUtcDate(new Date().toISOString().slice(0, 10));

	if (!(target && today)) {
		return null;
	}

	return Math.round((target.getTime() - today.getTime()) / dateMs);
};

export const formatReadableTripDateRange = ({
	endDate,
	fallbackLabel = "Dates TBD",
	includeYear = false,
	startDate,
}: {
	endDate?: string | null;
	fallbackLabel?: string;
	includeYear?: boolean;
	startDate?: string | null;
}) => {
	const start = startDate ? getUtcDate(startDate) : null;
	const end = endDate ? getUtcDate(endDate) : null;

	if (!(start || end)) {
		return fallbackLabel;
	}

	const formatDate = includeYear ? formatMonthDayWithYear : formatMonthDay;

	if (!(start && end)) {
		if (start) {
			return `Starts ${formatDate(start)}`;
		}

		return end ? `Until ${formatDate(end)}` : fallbackLabel;
	}

	if (start.getTime() === end.getTime()) {
		return formatDate(start);
	}

	const startYear = start.getUTCFullYear();
	const endYear = end.getUTCFullYear();
	const isSameYear = startYear === endYear;
	const isSameMonth = isSameYear && start.getUTCMonth() === end.getUTCMonth();

	if (!isSameYear) {
		return `${formatMonthDayWithYear(start)} - ${formatMonthDayWithYear(end)}`;
	}

	if (isSameMonth) {
		const startLabel = formatMonthDay(start);
		const endDay = end.getUTCDate();

		return includeYear
			? `${startLabel} - ${endDay}, ${endYear}`
			: `${startLabel} - ${endDay}`;
	}

	const rangeLabel = `${formatMonthDay(start)} - ${formatMonthDay(end)}`;

	return includeYear ? `${rangeLabel}, ${endYear}` : rangeLabel;
};
