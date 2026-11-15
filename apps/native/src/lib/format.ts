import type { TripCountdown } from "@viya-app/domain";

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_PATTERN = /^(\d{1,2}):(\d{1,2})/;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const RELATIVE_WINDOW_DAYS = 6;
const MONTH_THRESHOLD_DAYS = 100;
const DAYS_PER_MONTH = 30;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const CAMEL_BOUNDARY_PATTERN = /([a-z0-9])([A-Z])/g;
const SEPARATOR_PATTERN = /[_\s-]+/g;
const MS_PER_DAY = 86_400_000;

type YearMode = "auto" | "always";
interface YearOptions {
	year?: YearMode;
}

const pad = (value: number) => String(value).padStart(2, "0");

// Money. PHP shows the peso sign, no decimals.
export const formatMoney = (
	amount: number | undefined | null,
	currency = "PHP"
): string => {
	const safeAmount =
		typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
	const code = (currency || "PHP").toUpperCase();

	return new Intl.NumberFormat("en-PH", {
		currency: code,
		maximumFractionDigits: 0,
		style: "currency",
	}).format(safeAmount);
};

export const formatCount = (
	count: number,
	singular: string,
	plural = `${singular}s`
): string => `${count} ${count === 1 ? singular : plural}`;

// Local calendar keys (device time zone).
export const toLocalDateKey = (date = new Date()): string =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toLocalTimeKey = (date = new Date()): string =>
	`${pad(date.getHours())}:${pad(date.getMinutes())}`;

const toDateKey = (value: string | number): string =>
	typeof value === "number" ? toLocalDateKey(new Date(value)) : value;

const parseDateKey = (value: string | number): Date | null => {
	const match = DATE_KEY_PATTERN.exec(toDateKey(value));

	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return date;
};

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	timeZone: "UTC",
	weekday: "short",
});
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
	month: "short",
	timeZone: "UTC",
});

const shortMonth = (date: Date) => monthFormatter.format(date).replace(".", "");
const shortDay = (date: Date) => `${date.getUTCDate()} ${shortMonth(date)}`;
const weekday = (date: Date) =>
	dayFormatter
		.formatToParts(date)
		.find((part) => part.type === "weekday")
		?.value.replace(".", "") ?? "";

const shouldShowYear = (date: Date, mode: YearMode = "auto") =>
	mode === "always" || date.getUTCFullYear() !== new Date().getFullYear();

const withYear = (label: string, date: Date, mode?: YearMode) =>
	shouldShowYear(date, mode) ? `${label} ${date.getUTCFullYear()}` : label;

export const formatShortDate = (
	value: string | number,
	options: YearOptions = {}
): string => {
	const date = parseDateKey(value);

	return date ? withYear(shortDay(date), date, options.year) : "";
};

export const formatDay = (
	value: string | number,
	options: YearOptions = {}
): string => {
	const date = parseDateKey(value);

	return date
		? withYear(`${weekday(date)} ${shortDay(date)}`, date, options.year)
		: "";
};

export const formatTripRange = (
	start?: string | null,
	end?: string | null,
	options: YearOptions = {}
): string => {
	const from = start ? parseDateKey(start) : null;
	const to = end ? parseDateKey(end) : null;

	if (!(from || to)) {
		return "No dates yet";
	}

	if (from && !to) {
		return `From ${formatShortDate(start as string, options)}`;
	}

	if (to && !from) {
		return `Until ${formatShortDate(end as string, options)}`;
	}

	if (!(from && to)) {
		return "No dates yet";
	}

	if (from.getTime() === to.getTime()) {
		return formatShortDate(start as string, options);
	}

	const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
	const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();

	if (!sameYear) {
		return `${shortDay(from)} ${from.getUTCFullYear()} – ${shortDay(to)} ${to.getUTCFullYear()}`;
	}

	const tail = shouldShowYear(to, options.year)
		? ` ${to.getUTCFullYear()}`
		: "";

	if (sameMonth) {
		return `${from.getUTCDate()}–${shortDay(to)}${tail}`;
	}

	return `${shortDay(from)} – ${shortDay(to)}${tail}`;
};

export const formatRelativeDay = (
	value: string | number,
	today = toLocalDateKey()
): string => {
	const target = parseDateKey(value);
	const base = parseDateKey(today);

	if (!(target && base)) {
		return "";
	}

	const offset = Math.round((target.getTime() - base.getTime()) / MS_PER_DAY);

	if (offset === 0) {
		return "Today";
	}

	if (offset === 1) {
		return "Tomorrow";
	}

	if (offset === -1) {
		return "Yesterday";
	}

	if (offset >= 2 && offset <= RELATIVE_WINDOW_DAYS) {
		return `In ${offset} days`;
	}

	if (offset <= -2 && offset >= -RELATIVE_WINDOW_DAYS) {
		return `${-offset} days ago`;
	}

	return formatDay(value);
};

// Times and durations. Stored times are "HH:MM" 24-hour.
const toMinuteOfDay = (value: string | undefined): number | null => {
	const match = value ? TIME_PATTERN.exec(value) : null;

	if (!match) {
		return null;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);

	if (hours > 23 || minutes > 59) {
		return null;
	}

	return hours * MINUTES_PER_HOUR + minutes;
};

export const formatTime = (hhmm: string): string => {
	const minutes = toMinuteOfDay(hhmm);

	if (minutes === null) {
		return "";
	}

	return `${pad(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad(minutes % MINUTES_PER_HOUR)}`;
};

export const formatTimeRange = (start: string, end?: string): string => {
	const from = formatTime(start);
	const to = end ? formatTime(end) : "";

	if (!from) {
		return "";
	}

	return to ? `${from}–${to}` : from;
};

export const formatDuration = (minutes: number): string => {
	if (!Number.isFinite(minutes) || minutes <= 0) {
		return "";
	}

	const total = Math.round(minutes);
	const hours = Math.floor(total / MINUTES_PER_HOUR);
	const rest = total % MINUTES_PER_HOUR;

	if (hours === 0) {
		return `${rest} min`;
	}

	return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

export const getMinutesBetween = (start: string, end: string): number => {
	const from = toMinuteOfDay(start);
	const to = toMinuteOfDay(end);

	if (from === null || to === null || to <= from) {
		return 0;
	}

	return Math.min(to - from, MINUTES_PER_DAY);
};

export const formatTripCountdown = (countdown: TripCountdown): string => {
	switch (countdown.phase) {
		case "upcoming": {
			const days = countdown.daysUntil;

			if (days === null) {
				return "No dates yet";
			}

			if (days <= 1) {
				return days === 1 ? "Tomorrow" : "Today";
			}

			if (days >= MONTH_THRESHOLD_DAYS) {
				return `In ${Math.round(days / DAYS_PER_MONTH)} months`;
			}

			return `In ${days} days`;
		}
		case "during": {
			if (countdown.dayNumber === null) {
				return "Today";
			}

			return countdown.totalDays
				? `Day ${countdown.dayNumber} of ${countdown.totalDays}`
				: `Day ${countdown.dayNumber}`;
		}
		case "ended":
			return countdown.endDate
				? `Ended ${formatShortDate(countdown.endDate)}`
				: "Ended";
		case "completed":
			return "Completed";
		case "archived":
			return "Archived";
		default:
			return "No dates yet";
	}
};

export const formatFileSize = (bytes: number): string => {
	if (!Number.isFinite(bytes) || bytes < 0) {
		return "";
	}

	if (bytes < BYTES_PER_KB) {
		return `${Math.round(bytes)} B`;
	}

	if (bytes < BYTES_PER_MB) {
		return `${Math.round(bytes / BYTES_PER_KB)} KB`;
	}

	return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
};

export const formatEnumLabel = (value: string): string => {
	const words = value
		.replace(CAMEL_BOUNDARY_PATTERN, "$1 $2")
		.replace(SEPARATOR_PATTERN, " ")
		.trim()
		.toLowerCase();

	return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : "";
};
