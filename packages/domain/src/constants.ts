import type {
	Priority,
	ReadinessCategory,
	RiskSeverity,
	TripStatus,
} from "./types";

export const DEMO_TRIP_ID = "demo-palawan";

export const READINESS_CATEGORIES = [
	"documents",
	"bookings",
	"packing",
	"budget",
	"schedule",
	"transport",
	"weather",
	"safety",
	"group",
	"backupPlan",
] as const satisfies ReadinessCategory[];

export const READINESS_CATEGORY_LABELS: Record<ReadinessCategory, string> = {
	documents: "Documents",
	bookings: "Bookings",
	packing: "Packing",
	budget: "Budget",
	schedule: "Schedule",
	transport: "Transport",
	weather: "Weather",
	safety: "Safety",
	group: "Group",
	backupPlan: "Backup plan",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	critical: "Critical",
};

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	critical: "Critical",
};

export const RISK_SEVERITY_RANK: Record<RiskSeverity, number> = {
	low: 1,
	medium: 2,
	high: 3,
	critical: 4,
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
	draft: "Draft",
	planning: "Planning",
	ready: "Ready",
	active: "Active",
	completed: "Completed",
	archived: "Archived",
};

export const READINESS_PRIORITY_PENALTY: Record<Priority, number> = {
	low: 6,
	medium: 10,
	high: 18,
	critical: 28,
};

export const INCOMPLETE_READINESS_STATUSES = [
	"todo",
	"inProgress",
	"blocked",
] as const;

export const VAULT_ITEM_KIND_LABELS = {
	booking: "Booking",
	document: "Document",
	momentPhoto: "Moment photo",
	noteAttachment: "Note attachment",
	other: "Other",
	receipt: "Receipt",
} as const;
